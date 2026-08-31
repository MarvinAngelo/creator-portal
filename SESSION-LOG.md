# Creator Portal — Session Log

## Session: Build & Implementation

---

### 1. Requirements Analysis & Planning

**Constraints reviewed:**
- React frontend + Node API, no auth required
- Connected social accounts, recent posts feed, wallet, payout requests
- Must implement Slice B: Payout Request
- Real persistence, real payout lifecycle
- Handle: insufficient balance, duplicate submissions, pending→approved, pending→rejected, balance/transaction consistency
- Publicly deployed, ~3 hour time limit

**Architecture decisions:**
- Single service (Express serves React static + API)
- SQLite via better-sqlite3 (zero config, synchronous, real persistence)
- Deduct balance at request time (simpler, prevents overcommitment)
- Deploy to Render.com

---

### 2. Project Scaffolded

**Structure created:**
```
gelo-kalpa-vision/
├── server/
│   ├── index.js          # Express entry, serves API + React static
│   ├── db.js             # SQLite setup + schema + seed
│   ├── seed.js           # Seed data (3 creators, 9 accounts, 9 posts, 10 transactions)
│   └── routes/
│       ├── creators.js   # GET profile, posts
│       ├── wallet.js     # GET balance, transactions
│       └── payouts.js    # POST request, PATCH approve/reject
├── client/               # Vite React app
│   ├── src/
│   │   ├── App.jsx       # Router + nav shell
│   │   ├── api.js        # Fetch wrapper
│   │   └── pages/
│   │       ├── Dashboard.jsx  # Profile, social accounts, post feed
│   │       ├── Wallet.jsx     # Balance, transactions, payout form
│   │       └── Payouts.jsx    # Payout history, approve/reject
│   └── index.html
└── package.json
```

**Dependencies installed:**
- Root: express, better-sqlite3, cors, dotenv, uuid, concurrently
- Client: react, react-router-dom, vite, tailwindcss

---

### 3. Database Schema (INTEGER cents)

```sql
creators (id, name, avatar_url, bio, balance INTEGER, created_at)
connected_accounts (id, creator_id, platform, handle, connected_at, UNIQUE(creator_id, platform))
posts (id, creator_id, platform, content, url, likes, comments, published_at)
payout_requests (id, creator_id, amount INTEGER, status, idempotency_key UNIQUE, rejection_reason, reviewed_at, created_at)
wallet_transactions (id, creator_id, type, amount INTEGER, balance_after INTEGER, reference_id, description, created_at)
```

---

### 4. Constraint Audit Results

| # | Constraint | Status |
|---|-----------|--------|
| 1 | Monetary values as integer cents | **FIXED** — converted from REAL to INTEGER |
| 2 | Creator has connected social accounts | PASS |
| 3 | Creator has wallet information | PASS |
| 4 | Creator has transactions | PASS |
| 5 | Creator can have payout requests | PASS |
| 6 | Payout lifecycle: PENDING→APPROVED, PENDING→REJECTED | PASS |
| 7 | Terminal states cannot transition | PASS (409 Conflict) |
| 8 | Idempotency for duplicate submissions | PASS |
| 9 | Schema enforces uniqueness where appropriate | **FIXED** — added UNIQUE(creator_id, platform) |
| 10 | Avoid unnecessary tables/abstractions | PASS |

---

### 5. POST /api/payouts Implementation

**Endpoint:** `POST /api/payouts`
**Header:** `Idempotency-Key: <uuid>`
**Body:** `{ creator_id: number, amount: number (cents) }`

**Request flow:**
1. Extract header + body, validate inputs → 400
2. `BEGIN IMMEDIATE` transaction
   a. Check idempotency_key exists → return existing payout (200)
   b. SELECT balance from creators → 404 if not found
   c. Compare balance >= amount → 422 if insufficient
   d. INSERT payout_requests (status='pending')
   e. UPDATE creators SET balance = balance - amount
   f. INSERT wallet_transactions (debit)
   g. COMMIT
3. Return 201 with payout object
4. On any error → ROLLBACK, return appropriate status

**Key design points:**
- `BEGIN IMMEDIATE` acquires write lock at transaction start (race condition protection)
- UNIQUE constraint on idempotency_key (database-level duplicate prevention)
- Balance deducted at request time, refunded on rejection
- All monetary values in integer cents

---

### 6. Edge Cases Tested — ALL PASS

| Test | Input | Expected | Result |
|------|-------|----------|--------|
| 1. Valid payout | creator_id=1, amount=5000 | 201 + payout | PASS |
| 2. Duplicate key | same Idempotency-Key | 200 + same payout | PASS |
| 3. Insufficient balance | amount=200000, bal=120000 | 422 | PASS |
| 4. Zero amount | amount=0 | 400 | PASS |
| 5. Negative amount | amount=-500 | 400 | PASS |
| 6. Missing header | no Idempotency-Key | 400 | PASS |
| 7. Bad creator_id | creator_id=999 | 404 | PASS |
| 8. Missing creator_id | no creator_id | 400 | PASS |
| 9. Approve pending | payout #1 | status=approved | PASS |
| 10. Approve again | payout #1 (already approved) | 409 | PASS |
| 11. Balance check | after approval | 120000 cents | PASS |
| 12. Reject pending | payout #2, reason given | status=rejected, balance refunded | PASS |
| 13. Transaction history | Alex (creator 2) | 4 txns, balance_after consistent | PASS |
| 14. Reject again | payout #2 (already rejected) | 409 | PASS |

**Transaction history for Alex after reject:**
```
payout_refund | +10000 | bal: 87550 | Payout #2 rejected — refund
debit         | -10000 | bal: 77550 | Payout request #2
credit        | +12550 | bal: 87550 | Affiliate commission — Amazon
credit        | +75000 | bal: 75000 | Initial deposit
```

---

### 7. Interview Explanation — POST /api/payouts

**Request flow:**
1. Extract `Idempotency-Key` header + `{ creator_id, amount }` body
2. Validate: amount is positive integer, key exists → 400 if invalid
3. `BEGIN IMMEDIATE` transaction (acquires write lock)
4. Check idempotency_key exists → return existing payout (200) if duplicate
5. SELECT creator balance → 404 if not found
6. Compare balance >= amount → 422 if insufficient
7. INSERT payout_requests (status='pending')
8. UPDATE creators SET balance = balance - amount
9. INSERT wallet_transactions (debit record with balance_after)
10. COMMIT → release lock
11. Return 201 with payout object

**Duplicate prevention:**
- Application: SELECT before INSERT inside transaction
- Database: UNIQUE constraint on idempotency_key
- Client generates UUID once per submission, reuses on retry

**Race condition handling:**
- `BEGIN IMMEDIATE` acquires write lock at transaction start
- Concurrent requests serialize: second waits for first to commit
- Prevents double-spend where two transactions both see sufficient balance

**Why the transaction is necessary:**
- Atomicity: all 3 writes (payout, balance update, transaction log) succeed or none do
- Without it, crash between steps leaves inconsistent state

**Production gaps:**
- Single-process SQLite (no distributed locking)
- No payout fulfillment pipeline
- No webhook/callback confirmation
- No retry/backoff logic
- No admin audit trail
- No rate limiting

---

*Last updated: 2026-08-27*
