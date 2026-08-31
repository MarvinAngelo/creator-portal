# Creator Portal

A full-stack portal for creators working with a talent agency. Three screens: Dashboard (profile, connected accounts, posts feed), Wallet (balance, pending earnings, transactions), and Payouts (request, approve/reject lifecycle).

## How It's Built

- **Frontend:** React 18 + Vite + Tailwind CSS + React Router
- **Backend:** Express.js API serving both the API and built React static files (single deployment)
- **Database:** SQLite via better-sqlite3 (zero config, synchronous, real persistence)
- **All monetary values:** Integer cents — never floating-point

## Which Slice I Made Real

**Slice B: Payout Request.** I chose this because the lifecycle (pending → approved/rejected) has more edge cases to handle than a live API fetch, and the consistency requirements (balance, idempotency, transaction history) are harder to get right. It's a better test of backend reasoning.

The payout endpoint (`POST /api/payouts`) handles:
- **Insufficient balance** — returns 422 with clear message
- **Duplicate submissions** — idempotency key in request header, UNIQUE constraint in DB, returns existing payout on retry
- **Concurrent requests** — `BEGIN IMMEDIATE` acquires SQLite write lock at transaction start, serializing concurrent requests
- **Terminal state guards** — approve/reject check status before transitioning, return 409 if already processed
- **Balance consistency** — all three writes (payout record, balance update, transaction log) wrapped in a single DB transaction

## Assumptions

- Creator is already logged in — no auth built per brief
- Connected accounts are mocked with seeded data — no real OAuth
- Posts are seeded with realistic content — Slice A (live post fetching) was not chosen
- Single creator scenario — no account switching needed
- Deployed on Render free tier

## What I'd Build Next

1. **Real social OAuth** — connect actual accounts, pull real follower counts
2. **Live post fetching** (Slice A) — YouTube Data API or RSS for real content
3. **Admin dashboard** — approve/reject payouts from a web UI instead of API calls
4. **Pagination** — for posts and transactions at scale
5. **Webhook notifications** — alert creators when payouts are processed
6. **Rate limiting** — prevent abuse on the payout endpoint

## Where the AI Got It Wrong

The `request()` helper in `api.js` had a spread order bug. The original code was:

```js
fetch(url, {
  headers: { 'Content-Type': 'application/json', ...options.headers },
  ...options,  // <-- this overwrites the merged headers above
});
```

The `...options` spread included `options.headers`, which overwrote the merged headers object — losing `Content-Type: application/json`. Without that header, Express's `express.json()` middleware didn't parse the request body, so `req.body` was `undefined` and `creator_id` failed the integer validation. I fixed it by destructuring `headers` out of `options` first:

```js
const { headers: customHeaders, ...rest } = options;
fetch(url, {
  ...rest,
  headers: { 'Content-Type': 'application/json', ...customHeaders },
});
```
