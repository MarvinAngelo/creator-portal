const express = require('express');
const { getDb } = require('../db');
const router = express.Router();

router.get('/:id', (req, res) => {
  const db = getDb();
  const creator = db.prepare('SELECT * FROM creators WHERE id = ?').get(req.params.id);
  if (!creator) return res.status(404).json({ error: 'Creator not found' });

  const accounts = db.prepare('SELECT * FROM connected_accounts WHERE creator_id = ?').all(req.params.id);
  res.json({ ...creator, connected_accounts: accounts });
});

router.get('/:id/posts', (req, res) => {
  const db = getDb();
  const posts = db.prepare(
    'SELECT * FROM posts WHERE creator_id = ? ORDER BY published_at DESC'
  ).all(req.params.id);
  res.json(posts);
});

module.exports = router;
