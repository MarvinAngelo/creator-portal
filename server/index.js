require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDb } = require('./db');
const creatorsRouter = require('./routes/creators');
const walletRouter = require('./routes/wallet');
const payoutsRouter = require('./routes/payouts');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Initialize DB
getDb();

// API routes
app.use('/api/creators', creatorsRouter);
app.use('/api/creators', walletRouter);
app.use('/api/creators', payoutsRouter);

// POST /api/payouts — standalone payout request endpoint
app.post('/api/payouts', (req, res) => {
  const db = getDb();
  let { creator_id, amount } = req.body;
  const idempotencyKey = req.headers['idempotency-key'];

  // --- 1. Validate inputs ---
  creator_id = Number(creator_id);
  amount = Number(amount);
  if (!creator_id || !Number.isInteger(creator_id)) {
    return res.status(400).json({ error: 'creator_id must be an integer' });
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive integer (cents)' });
  }
  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Idempotency-Key header is required' });
  }

  // --- 2. Database transaction ---
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

// Serve React static files in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Creator Portal API running on http://localhost:${PORT}`);
});
