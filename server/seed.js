const { getDb } = require('./db');

const db = getDb();

// Drop and recreate tables for clean seed
db.exec(`
  DROP TABLE IF EXISTS wallet_transactions;
  DROP TABLE IF EXISTS payout_requests;
  DROP TABLE IF EXISTS posts;
  DROP TABLE IF EXISTS connected_accounts;
  DROP TABLE IF EXISTS creators;
`);

// Re-run schema
db.exec(`
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
    follower_count INTEGER DEFAULT 0,
    connected_at TEXT DEFAULT (datetime('now')),
    last_synced_at TEXT DEFAULT (datetime('now')),
    UNIQUE(creator_id, platform)
  );

  CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id INTEGER NOT NULL REFERENCES creators(id),
    platform TEXT NOT NULL,
    content TEXT,
    url TEXT,
    thumbnail_url TEXT,
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
`);

// Seed creators (balance in integer cents)
const insertCreator = db.prepare(
  'INSERT INTO creators (name, avatar_url, bio, balance) VALUES (?, ?, ?, ?)'
);
const c1 = insertCreator.run('Maya Chen', 'https://ui-avatars.com/api/?name=Maya+Chen&background=6366f1&color=fff', 'Digital artist and content creator specializing in generative art and NFT collections.', 125000);
const c2 = insertCreator.run('Alex Rivera', 'https://ui-avatars.com/api/?name=Alex+Rivera&background=ec4899&color=fff', 'Tech reviewer and YouTuber with 500K subscribers. Covering the latest in AI and gadgets.', 87550);
const c3 = insertCreator.run('Jordan Park', 'https://ui-avatars.com/api/?name=Jordan+Park&background=14b8a6&color=fff', 'Lifestyle and travel photographer. Sharing stories from 40+ countries.', 210075);

const [mayaId, alexId, jordanId] = [c1.lastInsertRowid, c2.lastInsertRowid, c3.lastInsertRowid];

// Seed connected accounts (with follower counts and last synced)
const insertAccount = db.prepare(
  'INSERT INTO connected_accounts (creator_id, platform, handle, follower_count, connected_at, last_synced_at) VALUES (?, ?, ?, ?, ?, ?)'
);
insertAccount.run(mayaId, 'twitter', '@mayachen_art', 24500, '2026-03-15 10:00:00', '2026-08-27 08:00:00');
insertAccount.run(mayaId, 'instagram', '@mayachen.studio', 89200, '2026-04-01 14:00:00', '2026-08-27 09:30:00');
insertAccount.run(mayaId, 'youtube', '@MayaChenArt', 156000, '2026-02-20 09:00:00', '2026-08-27 07:15:00');
insertAccount.run(alexId, 'twitter', '@alextechreview', 312000, '2026-01-10 11:00:00', '2026-08-27 06:45:00');
insertAccount.run(alexId, 'youtube', '@AlexTechReview', 523000, '2025-11-05 08:00:00', '2026-08-27 10:00:00');
insertAccount.run(alexId, 'tiktok', '@alextechreview', 1800000, '2026-05-12 16:00:00', '2026-08-27 09:00:00');
insertAccount.run(jordanId, 'instagram', '@jordanpark.travel', 467000, '2025-12-01 10:00:00', '2026-08-27 08:30:00');
insertAccount.run(jordanId, 'youtube', '@JordanParkTravel', 89000, '2026-06-20 12:00:00', '2026-08-27 07:00:00');
insertAccount.run(jordanId, 'twitter', '@jordanparkphoto', 128000, '2026-03-08 15:00:00', '2026-08-27 09:15:00');

// Seed posts (with thumbnails)
const insertPost = db.prepare(
  'INSERT INTO posts (creator_id, platform, content, url, thumbnail_url, likes, comments, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);
insertPost.run(mayaId, 'twitter', 'Just dropped my latest generative art collection — 1/1 pieces exploring the intersection of chaos and order. Link in bio.', 'https://twitter.com/mayachen_art/status/1', null, 1243, 89, '2026-08-26 14:30:00');
insertPost.run(mayaId, 'instagram', 'Behind the scenes of my creative process. From sketch to algorithm to final render.', 'https://instagram.com/p/1', 'https://placehold.co/400x400/6366f1/ffffff?text=Art+Process', 3421, 156, '2026-08-25 10:00:00');
insertPost.run(mayaId, 'youtube', 'How I Built an Art Generator with p5.js — Full Tutorial', 'https://youtube.com/watch?v=1', 'https://placehold.co/480x270/6366f1/ffffff?text=p5.js+Tutorial', 8900, 234, '2026-08-24 16:00:00');
insertPost.run(alexId, 'youtube', 'GPT-5 Real-World Test: Is It Actually Smarter? (Honest Review)', 'https://youtube.com/watch?v=2', 'https://placehold.co/480x270/ec4899/ffffff?text=GPT-5+Review', 45000, 1890, '2026-08-26 18:00:00');
insertPost.run(alexId, 'twitter', 'Hot take: The new MacBook Pro is overkill for 90% of developers. Fight me.', 'https://twitter.com/alextechreview/status/2', null, 5670, 432, '2026-08-25 09:15:00');
insertPost.run(alexId, 'tiktok', 'Unboxing the weirdest tech gadgets from AliExpress — part 12', 'https://tiktok.com/@alextechreview/video/2', 'https://placehold.co/400x720/0f0f0f/ffffff?text=Tech+Gadgets', 120000, 4500, '2026-08-24 20:00:00');
insertPost.run(jordanId, 'instagram', 'Sunrise over Santorini. Nothing beats the golden hour in Greece.', 'https://instagram.com/p/3', 'https://placehold.co/400x400/14b8a6/ffffff?text=Santorini', 8900, 345, '2026-08-26 06:30:00');
insertPost.run(jordanId, 'youtube', 'How I Travel Full-Time on $2000/month — Budget Breakdown', 'https://youtube.com/watch?v=3', 'https://placehold.co/480x270/14b8a6/ffffff?text=Budget+Travel', 23000, 890, '2026-08-25 12:00:00');
insertPost.run(jordanId, 'twitter', 'Just arrived in Tokyo. Any restaurant recommendations? Drop them below!', 'https://twitter.com/jordanparkphoto/status/3', null, 2340, 167, '2026-08-24 08:00:00');

// Seed wallet transactions (amounts in integer cents)
const insertTxn = db.prepare(
  'INSERT INTO wallet_transactions (creator_id, type, amount, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, ?)'
);
insertTxn.run(mayaId, 'credit', 50000, 50000, 'Initial deposit', '2026-08-20 10:00:00');
insertTxn.run(mayaId, 'credit', 35000, 85000, 'Sponsorship payment — ArtSupply Co', '2026-08-22 14:00:00');
insertTxn.run(mayaId, 'credit', 20000, 105000, 'Merch sales revenue', '2026-08-24 11:00:00');
insertTxn.run(mayaId, 'credit', 30000, 135000, 'YouTube ad revenue — August', '2026-08-25 09:00:00');
insertTxn.run(mayaId, 'debit', -10000, 125000, 'Payout request #1 — approved', '2026-08-26 10:00:00');

insertTxn.run(alexId, 'credit', 75000, 75000, 'Initial deposit', '2026-08-20 10:00:00');
insertTxn.run(alexId, 'credit', 12550, 87550, 'Affiliate commission — Amazon', '2026-08-23 16:00:00');

insertTxn.run(jordanId, 'credit', 150000, 150000, 'Initial deposit', '2026-08-18 10:00:00');
insertTxn.run(jordanId, 'credit', 40000, 190000, 'Brand deal — TravelApp', '2026-08-22 12:00:00');
insertTxn.run(jordanId, 'credit', 20075, 210075, 'Print sales', '2026-08-25 15:00:00');

console.log('Database seeded successfully.');
console.log('Creators: 3');
console.log('Connected accounts: 9');
console.log('Posts: 9');
console.log('Transactions: 10');
