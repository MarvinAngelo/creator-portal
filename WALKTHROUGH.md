# Creator Portal — Development Walkthrough

## Project Overview

**What:** A Creator Portal application built for the Kalpa Vision technical assessment. It's a full-stack app (React + Node.js + SQLite) that allows creators to manage their connected social accounts, view recent posts, manage their wallet, and request payouts.

**Why:** Demonstrates proficiency in full-stack development, database design, API architecture, state management, and deployment — all within a 3-hour constraint.

---

## Architecture Decisions

### Single-Service Architecture

**Decision:** Express serves both the API and built React static files from a single service.

**Why:**
- One deployment, one URL, fastest path to a public URL
- No CORS issues between frontend and backend
- Simpler deployment to Render.com free tier
- Easier to explain during an interview

**Trade-off:** In production, you'd separate these for independent scaling, but for a 3-hour assessment, simplicity wins.

### Database: SQLite via better-sqlite3

**Decision:** SQLite with better-sqlite3 instead of PostgreSQL or MySQL.

**Why:**
- Zero configuration — no database server to set up
- Synchronous API — simpler code, no async/await complexity
- Single file database — easy to backup, migrate, and inspect
- Perfect for a demo/assessment where you need real persistence without infrastructure

**Trade-off:** SQLite is single-writer (one transaction at a time). For production with high concurrency, you'd use PostgreSQL. But with `BEGIN IMMEDIATE`, we handle the concurrency we need.

### Monetary Values: Integer Cents

**Decision:** All monetary values stored as integers (cents), not floating-point.

**Why:**
- Floating-point arithmetic is imprecise: `0.1 + 0.2 = 0.30000000000000004`
- Integer cents avoid rounding errors entirely
- $1250.00 = 125000 cents — always exact
- Standard practice in payment systems (Stripe, PayPal, Square all use integer cents)

---

## Database Schema

```sql
-- 5 tables, no ORM, direct SQL
CREATE TABLE creators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0)
);

CREATE TABLE connected_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id INTEGER NOT NULL REFERENCES creators(id),
  platform TEXT NOT NULL CHECK (platform IN ('twitter','youtube','instagram','tiktok')),
  handle TEXT NOT NULL,
  follower_count INTEGER DEFAULT 0,
  last_synced_at TEXT,
  UNIQUE(creator_id, platform)
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id INTEGER NOT NULL REFERENCES creators(id),
  platform TEXT NOT NULL,
  content TEXT,
  thumbnail_url TEXT,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  published_at TEXT
);

CREATE TABLE payout_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id INTEGER NOT NULL REFERENCES creators(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  idempotency_key TEXT UNIQUE,
  rejection_reason TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  reviewed_at TEXT
);

CREATE TABLE wallet_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id INTEGER NOT NULL REFERENCES creators(id),
  type TEXT NOT NULL CHECK (type IN ('credit','payout_debit','payout_refund')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  payout_request_id INTEGER REFERENCES payout_requests(id),
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Key Schema Decisions

| Decision | Why |
|----------|-----|
| `UNIQUE(creator_id, platform)` on connected_accounts | Prevents duplicate platform connections |
| `UNIQUE` on idempotency_key | Database-level guard against duplicate payouts |
| `CHECK (balance >= 0)` | Prevents negative balance at database level |
| `CHECK (amount > 0)` | Prevents zero/negative payout amounts |
| `balance_after` on transactions | Audit trail — you can reconstruct balance history |
| `TEXT` for timestamps | SQLite doesn't have a native datetime type, TEXT is fine |

---

## API Endpoints

### Creator Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/creators/:id` | Get creator profile with connected accounts |
| GET | `/api/creators/:id/posts` | Get posts with optional platform filter |

### Wallet Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/creators/:id/balance` | Get current balance |
| GET | `/api/creators/:id/pending` | Get pending earnings from approved payouts |
| GET | `/api/creators/:id/transactions` | Get transaction history |

### Payout Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/creators/:id/payouts` | Get all payout requests |
| POST | `/api/payouts` | Create new payout request (with idempotency) |
| PATCH | `/api/creators/:id/payouts/:payoutId/approve` | Approve a pending payout |
| PATCH | `/api/creators/:id/payouts/:payoutId/reject` | Reject a pending payout |

---

## Payout Lifecycle — The Core Feature

### State Machine

```
                  ┌─────────────┐
                  │   PENDING   │
                  └──────┬──────┘
                         │
            ┌────────────┴────────────┐
            │                         │
            ▼                         ▼
    ┌───────────────┐        ┌───────────────┐
    │   APPROVED    │        │   REJECTED    │
    │  (terminal)   │        │  (terminal)   │
    └───────────────┘        └───────────────┘
```

**Rules:**
- `pending → approved` — Balance deducted, transaction created
- `pending → rejected` — Balance refunded, transaction created
- `approved → *` — **Impossible** (terminal state)
- `rejected → *` — **Impossible** (terminal state)

### POST /api/payouts — Request Flow

```
Client                          Server                         SQLite
  │                               │                              │
  │  POST /api/payouts            │                              │
  │  Header: Idempotency-Key: abc │                              │
  │  Body: { creator_id: 1,       │                              │
  │          amount: 5000 }       │                              │
  │ ─────────────────────────────>│                              │
  │                               │  1. Validate inputs          │
  │                               │  2. BEGIN IMMEDIATE ────────>│
  │                               │                              │  Write lock acquired
  │                               │  3. Check idempotency_key    │
  │                               │  4. Check balance            │
  │                               │  5. INSERT payout_request    │
  │                               │  6. UPDATE balance           │
  │                               │  7. INSERT wallet_txn        │
  │                               │  8. COMMIT ─────────────────>│
  │                               │                              │  Lock released
  │  201 { id: 1, status:         │                              │
  │        "pending", ... }       │                              │
  │ <─────────────────────────────│                              │
```

### Code Walkthrough

```javascript
// POST /api/payouts
const { 'idempotency-key': idempotencyKey } = req.headers;
const { creator_id, amount } = req.body;

// Step 1: Validate inputs
if (!idempotencyKey) return res.status(400).json({ error: 'Missing Idempotency-Key header' });
if (!creator_id) return res.status(400).json({ error: 'creator_id is required' });
if (!Number.isInteger(amount) || amount <= 0) {
  return res.status(400).json({ error: 'amount must be a positive integer (cents)' });
}

// Step 2: Begin transaction with IMMEDIATE (acquires write lock)
const insert = db.transaction(() => {
  // Step 3: Check for duplicate idempotency key
  const existing = db.prepare(
    'SELECT * FROM payout_requests WHERE idempotency_key = ?'
  ).get(idempotencyKey);
  if (existing) return existing; // Return existing payout (200)

  // Step 4: Verify creator exists and get balance
  const creator = db.prepare('SELECT * FROM creators WHERE id = ?').get(creator_id);
  if (!creator) throw Object.assign(new Error('Creator not found'), { statusCode: 404 });

  // Step 5: Check sufficient balance
  if (creator.balance < amount) {
    throw Object.assign(new Error('Insufficient balance'), { statusCode: 422 });
  }

  // Step 6: Create payout request
  const result = db.prepare(
    'INSERT INTO payout_requests (creator_id, amount, idempotency_key) VALUES (?, ?, ?)'
  ).run(creator_id, amount, idempotencyKey);

  // Step 7: Deduct balance
  const newBalance = creator.balance - amount;
  db.prepare('UPDATE creators SET balance = ? WHERE id = ?').run(newBalance, creator_id);

  // Step 8: Create transaction record
  db.prepare(
    'INSERT INTO wallet_transactions (creator_id, type, amount, balance_after, description, payout_request_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(creator_id, 'payout_debit', amount, newBalance, `Payout request #${result.lastInsertRowid}`, result.lastInsertRowid);

  return db.prepare('SELECT * FROM payout_requests WHERE id = ?').get(result.lastInsertRowid);
});

const payout = insert(); // Execute transaction
```

---

## Idempotency — Preventing Duplicate Submissions

### Problem
If a user clicks "Request Payout" twice quickly, or if there's a network retry, the same request could create two payouts — double-deducting from the balance.

### Solution: Two Layers

**Layer 1: Application Check**
```javascript
const existing = db.prepare(
  'SELECT * FROM payout_requests WHERE idempotency_key = ?'
).get(idempotencyKey);
if (existing) return existing; // Return existing, don't create new
```

**Layer 2: Database Constraint**
```sql
CREATE TABLE payout_requests (
  ...
  idempotency_key TEXT UNIQUE  -- UNIQUE constraint
);
```

**Why both?** The application check is fast and gives a clean 200 response. The database constraint is the safety net — even if the application check is bypassed (race condition, bug), the database prevents duplicates.

### How It Works

1. Client generates a UUID: `crypto.randomUUID()` → `"550e8400-e29b-41d4-a716-446655440000"`
2. Client sends it as `Idempotency-Key` header
3. Server checks if this key exists in the database
4. If exists → return the existing payout (200)
5. If not exists → create new payout (201)
6. Database UNIQUE constraint prevents any bypass

---

## Race Conditions — BEGIN IMMEDIATE

### Problem
Two concurrent requests could both read the same balance, both pass the balance check, and both deduct — resulting in a negative balance.

### Without BEGIN IMMEDIATE

```
Transaction A                    Transaction B
─────────────                    ─────────────
BEGIN                            
SELECT balance → 120000          
                                 BEGIN
                                 SELECT balance → 120000
UPDATE balance → 115000          
COMMIT                           
                                 UPDATE balance → 115000  ← DOUBLE DEDUCT!
                                 COMMIT
```

### With BEGIN IMMEDIATE

```
Transaction A                    Transaction B
─────────────                    ─────────────
BEGIN IMMEDIATE                  
                                 BEGIN IMMEDIATE → BLOCKS (waiting for lock)
SELECT balance → 120000          
UPDATE balance → 115000          
COMMIT                           
                                 ← Lock released, now proceeds
                                 SELECT balance → 115000  ← Sees A's changes
                                 UPDATE balance → 110000
                                 COMMIT
```

**Key insight:** `BEGIN IMMEDIATE` acquires a write lock at transaction start, not at first write. This serializes all write transactions.

---

## Frontend Architecture

### Tech Stack

- **React 18** — Component-based UI
- **Vite** — Fast build tool
- **Tailwind CSS** — Utility-first styling
- **React Router** — Client-side routing
- **Fetch API** — HTTP requests (no axios)

### State Management

**Local state with useState/useEffect** — No Redux, no Context (except dark mode). Each page manages its own state.

```javascript
// Example: Dashboard.jsx
const [creator, setCreator] = useState(null);
const [posts, setPosts] = useState([]);
const [filter, setFilter] = useState('all');
const [disconnected, setDisconnected] = useState(new Set());

useEffect(() => {
  api.getCreator(creatorId).then(setCreator);
  api.getPosts(creatorId).then(setPosts);
}, []);
```

**Why no global state?** For a 3-hour assessment, local state is simpler, faster to implement, and easier to explain. The app doesn't have complex cross-page state dependencies.

### Dark Mode

**Implementation:** CSS custom properties (variables) + Tailwind's `dark:` modifier + localStorage persistence.

```css
:root {
  --bg: #ffffff;
  --ink: #0b1220;
  --accent: #3da9ff;
  /* ... */
}

.dark {
  --bg: #000004;
  --ink: #f5f7fc;
  --accent: #3da9ff;
  /* ... */
}
```

**Toggle mechanism:**
```javascript
// DarkModeContext.jsx
const [dark, setDark] = useState(() => {
  const saved = localStorage.getItem('creator-portal-dark-mode');
  if (saved !== null) return saved === 'true';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
});

useEffect(() => {
  localStorage.setItem('creator-portal-dark-mode', dark);
  document.documentElement.classList.toggle('dark', dark);
}, [dark]);
```

### API Layer

**Centralized fetch wrapper** in `api.js`:

```javascript
async function request(url, options = {}) {
  const { headers: customHeaders, ...rest } = options;
  const res = await fetch(url, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...customHeaders },
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export const api = {
  getCreator: (id) => request(`/api/creators/${id}`),
  getPosts: (id) => request(`/api/creators/${id}/posts`),
  requestPayout: (id, amount, idempotencyKey) =>
    request('/api/payouts', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ creator_id: id, amount }),
    }),
  // ... other methods
};
```

**Bug fixed:** The original `request()` had a spread order bug:
```javascript
// BROKEN: options.headers overwrites merged headers
fetch(url, {
  headers: { 'Content-Type': 'application/json', ...options.headers },
  ...options,  // ← this includes options.headers, overwriting above
});

// FIXED: destructure headers out first
const { headers: customHeaders, ...rest } = options;
fetch(url, {
  ...rest,
  headers: { 'Content-Type': 'application/json', ...customHeaders },
});
```

---

## UI/UX Design

### Kalpa Vision Aesthetic

The UI follows the Kalpa Vision website design:
- **Dark theme by default** with light mode toggle
- **Glassmorphism** — `backdrop-filter: blur(14px)` for nav and cards
- **Accent glow** — Cards have a glowing blue line on hover
- **Monospace labels** — JetBrains Mono for eyebrows and metadata
- **Grid layouts** — 1px gap borders between sections
- **Premium feel** — Subtle animations, smooth transitions

### Component Structure

```
App.jsx
├── DarkModeProvider (context)
├── Nav (glassmorphism, sticky)
│   ├── Logo (CP gradient)
│   ├── Navigation links (Dashboard, Wallet, Payouts)
│   ├── Dark mode toggle
│   └── Avatar
└── Routes
    ├── Dashboard.jsx
    │   ├── Profile Header (avatar, name, balance)
    │   ├── Connected Accounts (platform cards with icons)
    │   └── Recent Posts (filterable by platform)
    ├── Wallet.jsx
    │   ├── Balance Cards (gradient, glowing)
    │   ├── Payout Request Form
    │   └── Transaction History
    └── Payouts.jsx
        ├── Payout List (status badges, expandable reasons)
        └── Approve/Reject Actions
```

---

## Bugs Fixed During Development

### 1. Spread Order Bug in api.js
**Symptom:** `creator_id must be an integer` error on wallet tab
**Root cause:** `...options` overwrote merged headers, losing `Content-Type: application/json`
**Fix:** Destructure headers out first, then spread

### 2. SQLite AUTOINCREMENT Seed Bug
**Symptom:** After deleting records, new inserts got wrong IDs
**Root cause:** SQLite AUTOINCREMENT doesn't reset on DELETE
**Fix:** Use returned IDs from INSERT instead of assuming auto-increment values

### 3. Empty Database on Render
**Symptom:** Live site showed no data
**Root cause:** Seed script only ran locally, not on Render
**Fix:** Added idempotent auto-seed on startup (checks if creators table is empty)

### 4. Strict Integer Validation
**Symptom:** `creator_id must be an integer` when sending strings
**Root cause:** Client sends string numbers, server expects integers
**Fix:** Added `Number()` coercion before validation

### 5. Disconnect Button Not Visible
**Symptom:** Disconnect button hidden in both dark and light mode
**Root cause:** `opacity-0 group-hover:opacity-100` required hover on parent
**Fix:** Removed opacity classes, made button always visible with color change on hover

---

## Deployment

### Render.com Free Tier

**Why Render:**
- Free tier available
- Auto-deploys from GitHub
- Supports Node.js
- No credit card required

**Configuration (render.yaml):**
```yaml
services:
  - type: web
    name: creator-portal
    runtime: node
    buildCommand: cd client && npm install && npm run build && cd ../ && npm install
    startCommand: node server/index.js
    envVars:
      - key: NODE_ENV
        value: production
```

### Build Process

```bash
# Client build
cd client && npx vite build
# Output: client/dist/ (static files)

# Server serves static files
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});
```

---

## Interview Questions & Answers

### Q: Why did you choose SQLite over PostgreSQL?
**A:** For a 3-hour assessment, SQLite is the fastest path to real persistence. Zero configuration, synchronous API, single file database. In production, I'd use PostgreSQL for concurrent writes, but with `BEGIN IMMEDIATE`, SQLite handles the concurrency we need here.

### Q: How does idempotency work?
**A:** Two layers. Application layer checks if the idempotency key exists before inserting. Database layer has a UNIQUE constraint as a safety net. If the same key is sent twice, the second request returns the existing payout instead of creating a new one.

### Q: Why deduct at request time instead of approval time?
**A:** Simpler and prevents overcommitment. If we deduct at approval, multiple pending requests could exceed the balance. Deducting at request time means the balance always reflects what's actually available.

### Q: How do you handle race conditions?
**A:** `BEGIN IMMEDIATE` acquires a write lock at transaction start. If two transactions try to write simultaneously, the second one blocks until the first commits. This serializes writes and prevents double-spending.

### Q: Why integer cents instead of floating-point?
**A:** Floating-point arithmetic is imprecise. `0.1 + 0.2 = 0.30000000000000004`. Integer cents are always exact. This is standard practice in payment systems like Stripe and PayPal.

### Q: What would you change for production?
**A:** 
1. PostgreSQL for concurrent writes
2. Redis for caching
3. JWT authentication
4. Rate limiting
5. Webhook confirmation for payout fulfillment
6. Admin audit trail
7. Retry/backoff logic for failed operations
8. Monitoring and alerting

---

*Generated: August 27, 2026*
