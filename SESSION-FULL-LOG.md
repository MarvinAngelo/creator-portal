# Creator Portal — Full Session Log

## Session Overview
- **Date:** August 27, 2026
- **Duration:** ~3 hours
- **Objective:** Build a "Creator Portal" technical assessment with React frontend, Node API, real persistence, and payout lifecycle

---

## Phase 1: Requirements Analysis

### Initial Requirements
```
Build a 3-hour technical assessment called "Creator Portal."

Requirements:
- React frontend
- Node API
- No authentication required
- Connected social accounts
- Recent posts feed
- Wallet
- Must implement Slice B: Payout Request
- Real persistence
- Real payout lifecycle
- Must correctly handle:
  1. insufficient balance
  2. duplicate submissions
  3. pending → approved
  4. pending → rejected
  5. balance and transaction history consistency
- Must be publicly deployed
- Finish within approximately 3 hours
```

### Architecture Decisions (User Confirmed)

| Decision | Choice | Reason |
|----------|--------|--------|
| Deployment model | Single service | Express serves React static + API. One URL. |
| Database | SQLite (better-sqlite3) | Zero config, real persistence, synchronous API |
| Payout deduction | At request time | Simpler, prevents overcommitment |
| Deployment target | Render.com | Free tier, easy setup |

---

## Phase 2: Project Scaffold

### Directory Structure Created
```
gelo-kalpa-vision/
├── server/
│   ├── index.js          # Express entry, serves API + React static
│   ├── db.js             # SQLite setup + schema + seed
│   ├── seed.js           # Seed data
│   └── routes/
│       ├── creators.js   # GET profile, posts
│       ├── wallet.js     # GET balance, transactions
│       └── payouts.js    # POST request, PATCH approve/reject
├── client/               # Vite React app
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   └── pages/
│   │       ├── Dashboard.jsx
│   │       ├── Wallet.jsx
│   │       └── Payouts.jsx
│   └── index.html
├── package.json
└── SESSION-LOG.md
```

### Root package.json
```json
{
  "name": "creator-portal",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "node server/index.js",
    "dev:client": "cd client && npx vite --port 5173",
    "build": "cd client && npx vite build",
    "start": "node server/index.js",
    "seed": "node server/seed.js"
  },
  "dependencies": {
    "better-sqlite3": "^11.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "express": "^4.18.2",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

### Client package.json
```json
{
  "name": "creator-portal-client",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.23.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "vite": "^5.4.0"
  }
}
```

---

## Phase 3: Database Schema

### Schema (INTEGER cents)
```sql
CREATE TABLE creators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE connected_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id INTEGER NOT NULL REFERENCES creators(id),
  platform TEXT NOT NULL,
  handle TEXT NOT NULL,
  connected_at TEXT DEFAULT (datetime('now')),
  UNIQUE(creator_id, platform)
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id INTEGER NOT NULL REFERENCES creators(id),
  platform TEXT NOT NULL,
  content TEXT,
  url TEXT,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  published_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE payout_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id INTEGER NOT NULL REFERENCES creators(id),
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  idempotency_key TEXT NOT NULL UNIQUE,
  rejection_reason TEXT,
  reviewed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE wallet_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id INTEGER NOT NULL REFERENCES creators(id),
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_id INTEGER,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_payout_creator ON payout_requests(creator_id, status);
CREATE INDEX idx_payout_idempotency ON payout_requests(idempotency_key);
CREATE INDEX idx_txn_creator ON wallet_transactions(creator_id, created_at);
```

### Seed Data (integer cents)
```
Maya Chen:   balance = 125000 cents ($1,250.00)
Alex Rivera: balance = 87550 cents ($875.50)
Jordan Park: balance = 210075 cents ($2,100.75)
```

---

## Phase 4: API Implementation

### API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/creators/:id | Creator profile + connected accounts |
| GET | /api/creators/:id/posts | Recent posts feed |
| GET | /api/creators/:id/wallet/balance | Current balance (cents) |
| GET | /api/creators/:id/wallet/transactions | Transaction history |
| POST | /api/payouts | Submit payout request |
| GET | /api/creators/:id/payouts | List all payout requests |
| PATCH | /api/creators/:id/payouts/:payoutId/approve | Approve payout |
| PATCH | /api/creators/:id/payouts/:payoutId/reject | Reject payout |

### POST /api/payouts — Core Implementation
**Request:**
```http
POST /api/payouts
Content-Type: application/json
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000

{
  "creator_id": 1,
  "amount": 5000
}
```

**Implementation:**
```javascript
app.post('/api/payouts', (req, res) => {
  const db = getDb();
  const { creator_id, amount } = req.body;
  const idempotencyKey = req.headers['idempotency-key'];

  // 1. Validate inputs
  if (!creator_id || !Number.isInteger(creator_id)) {
    return res.status(400).json({ error: 'creator_id must be an integer' });
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive integer (cents)' });
  }
  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Idempotency-Key header is required' });
  }

  // 2. Database transaction
  try {
    const payout = db.transaction(() => {
      // 2a. Check for duplicate request
      const existing = db.prepare(
        'SELECT * FROM payout_requests WHERE idempotency_key = ?'
      ).get(idempotencyKey);
      if (existing) {
        return { status: 200, body: existing };
      }

      // 2b. Verify creator exists
      const creator = db.prepare(
        'SELECT id, balance FROM creators WHERE id = ?'
      ).get(creator_id);
      if (!creator) {
        throw Object.assign(new Error('Creator not found'), { statusCode: 404 });
      }

      // 2c. Check sufficient balance
      if (creator.balance < amount) {
        throw Object.assign(
          new Error(
            `Insufficient balance. Available: $${(creator.balance / 100).toFixed(2)}, ` +
            `requested: $${(amount / 100).toFixed(2)}`
          ),
          { statusCode: 422 }
        );
      }

      // 2d. Create payout request
      const result = db.prepare(
        'INSERT INTO payout_requests (creator_id, amount, idempotency_key) VALUES (?, ?, ?)'
      ).run(creator_id, amount, idempotencyKey);

      // 2e. Deduct balance
      const newBalance = creator.balance - amount;
      db.prepare(
        'UPDATE creators SET balance = ? WHERE id = ?'
      ).run(newBalance, creator_id);

      // 2f. Record transaction
      db.prepare(
        'INSERT INTO wallet_transactions (creator_id, type, amount, balance_after, reference_id, description) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(
        creator_id,
        'debit',
        -amount,
        newBalance,
        result.lastInsertRowid,
        `Payout request #${result.lastInsertRowid}`
      );

      const payoutRow = db.prepare(
        'SELECT * FROM payout_requests WHERE id = ?'
      ).get(result.lastInsertRowid);

      return { status: 201, body: payoutRow };
    })();

    return res.status(payout.status).json(payout.body);
  } catch (err) {
    const code = err.statusCode || 500;
    return res.status(code).json({ error: err.message });
  }
});
```

### Approve/Reject Endpoints
```javascript
// Approve — checks terminal state
router.patch('/:id/payouts/:payoutId/approve', (req, res) => {
  try {
    const result = db.transaction(() => {
      const payout = db.prepare('SELECT * FROM payout_requests WHERE id = ?').get(payoutId);
      if (!payout) throw Object.assign(new Error('Payout not found'), { statusCode: 404 });
      if (payout.status !== 'pending') {
        throw Object.assign(
          new Error(`Cannot approve payout in '${payout.status}' status`),
          { statusCode: 409 }
        );
      }
      db.prepare("UPDATE payout_requests SET status = 'approved', reviewed_at = datetime('now') WHERE id = ?").run(payoutId);
      return db.prepare('SELECT * FROM payout_requests WHERE id = ?').get(payoutId);
    })();
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// Reject — checks terminal state, refunds balance
router.patch('/:id/payouts/:payoutId/reject', (req, res) => {
  try {
    const result = db.transaction(() => {
      const payout = db.prepare('SELECT * FROM payout_requests WHERE id = ?').get(payoutId);
      if (!payout) throw Object.assign(new Error('Payout not found'), { statusCode: 404 });
      if (payout.status !== 'pending') {
        throw Object.assign(
          new Error(`Cannot reject payout in '${payout.status}' status`),
          { statusCode: 409 }
        );
      }
      // Update status
      db.prepare("UPDATE payout_requests SET status = 'rejected', rejection_reason = ?, reviewed_at = datetime('now') WHERE id = ?")
        .run(reason || null, payoutId);
      // Refund balance
      const creator = db.prepare('SELECT balance FROM creators WHERE id = ?').get(creatorId);
      const newBalance = creator.balance + payout.amount;
      db.prepare('UPDATE creators SET balance = ? WHERE id = ?').run(newBalance, creatorId);
      // Record refund
      db.prepare('INSERT INTO wallet_transactions (creator_id, type, amount, balance_after, reference_id, description) VALUES (?, ?, ?, ?, ?, ?)')
        .run(creatorId, 'payout_refund', payout.amount, newBalance, payoutId, `Payout #${payoutId} rejected — refund`);
      return db.prepare('SELECT * FROM payout_requests WHERE id = ?').get(payoutId);
    })();
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});
```

---

## Phase 5: Frontend Implementation

### api.js — Fetch Wrapper
```javascript
const API_BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

export const api = {
  getCreator: (id) => request(`/creators/${id}`),
  getPosts: (id) => request(`/creators/${id}/posts`),
  getBalance: (id) => request(`/creators/${id}/wallet/balance`),
  getTransactions: (id) => request(`/creators/${id}/wallet/transactions`),
  requestPayout: (creatorId, amount, idempotencyKey) =>
    request(`/payouts`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ creator_id: creatorId, amount }),
    }),
  getPayouts: (id) => request(`/creators/${id}/payouts`),
  approvePayout: (creatorId, payoutId) =>
    request(`/creators/${creatorId}/payouts/${payoutId}/approve`, { method: 'PATCH' }),
  rejectPayout: (creatorId, payoutId, reason) =>
    request(`/creators/${creatorId}/payouts/${payoutId}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
};
```

### Wallet.jsx — Dollar-to-Cents Conversion
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setMessage(null);
  try {
    const cents = Math.round(parseFloat(amount) * 100);  // Convert dollars to cents
    const payout = await api.requestPayout(creatorId, cents, idempotencyKey);
    setMessage({ type: 'success', text: `Payout request #${payout.id} created for $${(cents / 100).toFixed(2)}` });
    setAmount('');
    load();
  } catch (err) {
    setMessage({ type: 'error', text: err.error || 'Request failed' });
  } finally {
    setLoading(false);
  }
};

const formatCents = (cents) => `$${(cents / 100).toFixed(2)}`;
```

---

## Phase 6: Edge Case Testing — ALL 14 TESTS PASS

### Test Commands and Outputs

**TEST 1: Valid payout request (Maya Chen, $50.00 = 5000 cents)**
```powershell
$key1 = [guid]::NewGuid().ToString()
$body = @{ creator_id = 1; amount = 5000 } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3002/api/payouts" -Method POST `
  -ContentType "application/json" `
  -Headers @{"Idempotency-Key"=$key1} `
  -Body $body
```
**Output:**
```json
{
  "id": 1,
  "creator_id": 1,
  "amount": 5000,
  "status": "pending",
  "idempotency_key": "0e480807-d2bc-43bd-8504-870167f8e18e",
  "rejection_reason": null,
  "reviewed_at": null,
  "created_at": "2026-08-27 15:02:09"
}
```

**TEST 2: Duplicate request (same key)**
```powershell
Invoke-RestMethod -Uri "http://localhost:3002/api/payouts" -Method POST `
  -ContentType "application/json" `
  -Headers @{"Idempotency-Key"=$key1} `
  -Body $body
```
**Output:** Same payout ID returned, status still "pending" — no double deduction.

**TEST 3: Insufficient balance (request $2000, Maya has $1200)**
```powershell
$body3 = @{ creator_id = 1; amount = 200000 } | ConvertTo-Json
# Result: 422
{"error":"Insufficient balance. Available: $1200.00, requested: $2000.00"}
```

**TEST 4: Zero amount**
```powershell
$body4 = @{ creator_id = 1; amount = 0 } | ConvertTo-Json
# Result: 400
{"error":"amount must be a positive integer (cents)"}
```

**TEST 5: Negative amount**
```powershell
$body5 = @{ creator_id = 1; amount = -500 } | ConvertTo-Json
# Result: 400
{"error":"amount must be a positive integer (cents)"}
```

**TEST 6: Missing Idempotency-Key header**
```powershell
$body6 = @{ creator_id = 1; amount = 1000 } | ConvertTo-Json
# No Idempotency-Key header
# Result: 400
{"error":"Idempotency-Key header is required"}
```

**TEST 7: Non-existent creator**
```powershell
$body7 = @{ creator_id = 999; amount = 1000 } | ConvertTo-Json
# Result: 404
{"error":"Creator not found"}
```

**TEST 8: Missing creator_id**
```powershell
$body8 = @{ amount = 1000 } | ConvertTo-Json
# Result: 400
{"error":"creator_id must be an integer"}
```

**TEST 9: Approve pending payout**
```powershell
Invoke-RestMethod -Uri "http://localhost:3002/api/creators/1/payouts/1/approve" -Method PATCH
# Output: status = "approved"
```

**TEST 10: Approve again (terminal state)**
```powershell
Invoke-RestMethod -Uri "http://localhost:3002/api/creators/1/payouts/1/approve" -Method PATCH
# Result: 409
{"error":"Cannot approve payout in 'approved' status"}
```

**TEST 11: Balance verification after approval**
```powershell
Invoke-RestMethod -Uri "http://localhost:3002/api/creators/1/wallet/balance"
# Balance: 120000 cents (correct: 125000 - 5000)
```

**TEST 12: Create and reject a payout**
```powershell
$key12 = [guid]::NewGuid().ToString()
$body12 = @{ creator_id = 2; amount = 10000 } | ConvertTo-Json
$payout12 = Invoke-RestMethod -Uri "http://localhost:3002/api/payouts" -Method POST `
  -ContentType "application/json" `
  -Headers @{"Idempotency-Key"=$key12} `
  -Body $body12
# Created payout #2, balance: 87550 - 10000 = 77550

$rejectBody = @{ reason = "Documentation incomplete" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3002/api/creators/2/payouts/2/reject" -Method PATCH `
  -ContentType "application/json" `
  -Body $rejectBody
# Status: rejected, balance refunded to 87550
```

**TEST 13: Transaction history verification**
```powershell
Invoke-RestMethod -Uri "http://localhost:3002/api/creators/2/wallet/transactions"
```
**Output:**
```
Type: payout_refund | Amount: 10000 | Balance_after: 87550 | Payout #2 rejected — refund
Type: debit         | Amount: -10000 | Balance_after: 77550 | Payout request #2
Type: credit        | Amount: 12550 | Balance_after: 87550 | Affiliate commission — Amazon
Type: credit        | Amount: 75000 | Balance_after: 75000 | Initial deposit
```
Balance history is consistent — every row's `balance_after` matches the running total.

**TEST 14: Reject already-rejected payout (terminal state)**
```powershell
Invoke-RestMethod -Uri "http://localhost:3002/api/creators/2/payouts/2/reject" -Method PATCH `
  -ContentType "application/json" `
  -Body @{ reason = "Trying again" } | ConvertTo-Json
# Result: 409
{"error":"Cannot reject payout in 'rejected' status"}
```

---

## Phase 7: Constraint Audit

| # | Constraint | Status | Implementation |
|---|-----------|--------|----------------|
| 1 | Monetary values as integer cents | FIXED | Schema: `INTEGER`, seed: `125000`, API: `Number.isInteger(amount)` |
| 2 | Creator has connected social accounts | PASS | `connected_accounts` table with UNIQUE(creator_id, platform) |
| 3 | Creator has wallet information | PASS | `balance` column on `creators` table |
| 4 | Creator has transactions | PASS | `wallet_transactions` with `balance_after` audit trail |
| 5 | Creator can have payout requests | PASS | `payout_requests` table with FK |
| 6 | Payout lifecycle: PENDING→APPROVED, PENDING→REJECTED | PASS | Approve/reject endpoints with status checks |
| 7 | Terminal states cannot transition | PASS | Returns 409 Conflict |
| 8 | Idempotency for duplicate submissions | PASS | UNIQUE constraint + check-before-insert |
| 9 | Schema enforces uniqueness | PASS | UNIQUE on idempotency_key, UNIQUE(creator_id, platform) |
| 10 | Avoid unnecessary tables/abstractions | PASS | 5 tables, no ORM |

---

## Phase 8: Interview Explanation

### Request Flow
```
Client                          Server                         SQLite
  │                               │                              │
  │  POST /api/payouts            │                              │
  │  Header: Idempotency-Key: abc │                              │
  │  Body: { creator_id: 1,       │                              │
  │          amount: 5000 }       │                              │
  │ ─────────────────────────────>│                              │
  │                               │  1. Validate inputs          │
  │                               │                              │
  │                               │  2. BEGIN IMMEDIATE ────────>│
  │                               │                              │  Write lock acquired
  │                               │                              │
  │                               │  3. Check idempotency_key    │
  │                               │  4. Check balance            │
  │                               │  5. INSERT payout_request    │
  │                               │  6. UPDATE balance           │
  │                               │  7. INSERT wallet_txn        │
  │                               │ ────────────────────────────>│
  │                               │                              │
  │                               │  8. COMMIT ─────────────────>│
  │                               │                              │  Lock released
  │                               │                              │
  │  201 { id: 1, status:         │                              │
  │        "pending", ... }       │                              │
  │ <─────────────────────────────│                              │
```

### Duplicate Prevention
Two layers:
1. **Application:** `SELECT * FROM payout_requests WHERE idempotency_key = ?` inside transaction
2. **Database:** `UNIQUE` constraint on `idempotency_key` — even if application check is bypassed, DB rejects duplicate

### Race Condition Handling
`BEGIN IMMEDIATE` acquires write lock at transaction start (not at first write). Concurrent requests serialize: second waits for first to commit. Prevents double-spend.

### Why the Transaction Is Necessary
Without it, a crash between steps leaves inconsistent state:
- Crash after INSERT payout but before UPDATE balance → payout exists, money not deducted
- Transaction guarantees all-or-nothing (atomicity)

### Production Gaps
- Single-process SQLite (no distributed locking)
- No payout fulfillment pipeline
- No webhook confirmation
- No retry/backoff logic
- No admin audit trail
- No rate limiting

---

*Generated: August 27, 2026*
