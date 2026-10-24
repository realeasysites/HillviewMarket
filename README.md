# Hillview Market & Deli — website

Neighborhood market & deli site for 21 Buxton Rd, Saco, ME, with an order-ahead form and a password-protected order dashboard.

## Run locally

```bash
npm install
ADMIN_PASSWORD=choose-something SESSION_SECRET=long-random-string npm start
# site:      http://localhost:3000
# dashboard: http://localhost:3000/admin
```

## Deploy on Render

1. New **Web Service** from this repo. Build: `npm install` · Start: `npm start` (Node 20 is pinned).
2. Environment variables:
   - `ADMIN_PASSWORD` — required; the dashboard login stays disabled until it's set.
   - `SESSION_SECRET` — long random string (keeps the owner signed in across restarts).
   - `NOTIFY_EMAIL` + `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM` — optional email alert on each new order.
   - `DATA_DIR` — point at a Render persistent disk (e.g. `/var/data`) so orders survive deploys.
3. Point the store's domain at the service.

## Layout

- `server.js` — thin entry point
- `routes/public.js` — `POST /api/requests` (order-ahead form; validation, honeypot, rate limit)
- `routes/admin.js` — password login, list / update status / delete requests
- `lib/auth.js` — password-only login, signed session cookie
- `lib/mailer.js` — optional email alerts
- `db/index.js` — SQLite schema + queries
- `public/` — site, admin dashboard, assets

## Before launch

- Swap `public/assets/emblem.svg` for the store's real logo file.
- Confirm hours, phone number and menu details with the owner.
- Add real photos of the store and the food (and Instagram/TikTok links if they make accounts).
