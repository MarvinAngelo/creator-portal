# Creator Portal

A full-stack creator management portal with three screens: Dashboard, Wallet, and Payouts. Built for the Kalpa Vision technical assessment.

**Live:** [https://creator-portal-9hlt.onrender.com/dashboard](https://creator-portal-9hlt.onrender.com/dashboard)

## Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS + React Router
- **Backend:** Express.js (serves API + static files from single deployment)
- **Database:** SQLite via better-sqlite3 (zero config, real persistence)
- **Dark mode:** Toggle with localStorage persistence

## Slice B: Payout Request

I chose this because the lifecycle (pending → approved/rejected) has more edge cases than a live API fetch, and the consistency requirements are harder to get right.

**Key features:**
- Idempotency key (header) prevents duplicate submissions
- `BEGIN IMMEDIATE` serializes concurrent requests
- Balance deducted at request time, refunded on rejection
- Terminal state guards return 409 if already processed
- All writes wrapped in single transaction for atomicity

## Features

**Dashboard:** Creator profile, connected accounts (Twitter/YouTube/Instagram/TikTok) with follower counts, disconnect/reconnect with dynamic counter, posts feed filtered by platform (disconnected channels hidden).

**Wallet:** Gradient balance cards, pending earnings, payout request form, transaction history with type icons, expandable rejection reasons.

**Payouts:** Status badges (pending/approved/rejected), approve/reject actions, error banners with dismiss.

**UI/UX:** Kalpa Vision aesthetic — glassmorphism nav, accent glow effects, monospace labels, smooth animations, responsive design.

## AI Bug Fix

The `request()` helper had a spread order bug — `...options` overwrote merged headers, losing `Content-Type`. Fixed by destructuring headers first:

```js
const { headers: customHeaders, ...rest } = options;
fetch(url, { ...rest, headers: { 'Content-Type': 'application/json', ...customHeaders } });
```

## What I'd Build Next

1. Real social OAuth
2. Live post fetching (Slice A)
3. Admin dashboard for payout management
4. Pagination for posts/transactions
5. Webhook notifications
6. Rate limiting

---

*Built for Kalpa Vision Technical Assessment — August 2026*
