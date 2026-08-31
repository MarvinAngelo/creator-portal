const express = require('express');
const { getDb } = require('../db');
const router = express.Router();

router.get('/:id/wallet/balance', (req, res) => {
  const db = getDb();
  const creator = db.prepare('SELECT balance FROM creators WHERE id = ?').get(req.params.id);
  if (!creator) return res.status(404).json({ error: 'Creator not found' });
  res.json({ balance: creator.balance });
});

router.get('/:id/wallet/pending', (req, res) => {
  const db = getDb();
  const row = db.prepare(
    'SELECT COALESCE(SUM(amount), 0) as pending FROM payout_requests WHERE creator_id = ? AND status = ?'
  ).get(req.params.id, 'pending');
  res.json({ pending: row.pending });
});

router.get('/:id/wallet/transactions', (req, res) => {
  const db = getDb();
  const transactions = db.prepare(
    'SELECT * FROM wallet_transactions WHERE creator_id = ? ORDER BY created_at DESC'
  ).all(req.params.id);
  res.json(transactions);
});

module.exports = router;
