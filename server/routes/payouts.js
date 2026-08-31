const express = require('express');
const { getDb } = require('../db');
const router = express.Router();

// List payouts
router.get('/:id/payouts', (req, res) => {
  const db = getDb();
  const payouts = db.prepare(
    'SELECT * FROM payout_requests WHERE creator_id = ? ORDER BY created_at DESC'
  ).all(req.params.id);
  res.json(payouts);
});

// POST /api/payouts — Create a payout request
router.post('/', (req, res) => {
  const db = getDb();
  const { creator_id, amount } = req.body;
  const idempotencyKey = req.headers['idempotency-key'];

  // --- 1. Validate inputs ---
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

// Approve payout
router.patch('/:id/payouts/:payoutId/approve', (req, res) => {
  const db = getDb();
  const payoutId = Number(req.params.payoutId);

  try {
    const result = db.transaction(() => {
      const payout = db.prepare(
        'SELECT * FROM payout_requests WHERE id = ?'
      ).get(payoutId);
      if (!payout) {
        throw Object.assign(new Error('Payout not found'), { statusCode: 404 });
      }
      if (payout.status !== 'pending') {
        throw Object.assign(
          new Error(`Cannot approve payout in '${payout.status}' status`),
          { statusCode: 409 }
        );
      }

      db.prepare(
        "UPDATE payout_requests SET status = 'approved', reviewed_at = datetime('now') WHERE id = ?"
      ).run(payoutId);

      return db.prepare(
        'SELECT * FROM payout_requests WHERE id = ?'
      ).get(payoutId);
    })();

    res.json(result);
  } catch (err) {
    const code = err.statusCode || 500;
    res.status(code).json({ error: err.message });
  }
});

// Reject payout
router.patch('/:id/payouts/:payoutId/reject', (req, res) => {
  const db = getDb();
  const creatorId = Number(req.params.id);
  const payoutId = Number(req.params.payoutId);
  const { reason } = req.body;

  try {
    const result = db.transaction(() => {
      const payout = db.prepare(
        'SELECT * FROM payout_requests WHERE id = ?'
      ).get(payoutId);
      if (!payout) {
        throw Object.assign(new Error('Payout not found'), { statusCode: 404 });
      }
      if (payout.status !== 'pending') {
        throw Object.assign(
          new Error(`Cannot reject payout in '${payout.status}' status`),
          { statusCode: 409 }
        );
      }

      // Update payout status
      db.prepare(
        "UPDATE payout_requests SET status = 'rejected', rejection_reason = ?, reviewed_at = datetime('now') WHERE id = ?"
      ).run(reason || null, payoutId);

      // Refund balance
      const creator = db.prepare(
        'SELECT balance FROM creators WHERE id = ?'
      ).get(creatorId);
      const newBalance = creator.balance + payout.amount;
      db.prepare(
        'UPDATE creators SET balance = ? WHERE id = ?'
      ).run(newBalance, creatorId);

      // Record refund transaction
      db.prepare(
        'INSERT INTO wallet_transactions (creator_id, type, amount, balance_after, reference_id, description) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(
        creatorId,
        'payout_refund',
        payout.amount,
        newBalance,
        payoutId,
        `Payout #${payoutId} rejected — refund`
      );

      return db.prepare(
        'SELECT * FROM payout_requests WHERE id = ?'
      ).get(payoutId);
    })();

    res.json(result);
  } catch (err) {
    const code = err.statusCode || 500;
    res.status(code).json({ error: err.message });
  }
});

module.exports = router;
