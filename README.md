# Min Stjärndag (MyStarday-Polsia)

Swedish family app for children's daily routines, star rewards, and schedule management. Parents create structured daily schedules, children earn stars by completing activities, and redeem stars for rewards in the "Skattkammaren" (treasure chamber).

**Repository:** [pontusburman-papabravo/MyStarday-Polsia](https://github.com/pontusburman-papabravo/MyStarday-Polsia) — Polsia-hosted deployment of the Stjärndag codebase (`polsia.toml` for cron jobs and platform integrations).

## Stack

Express.js + Neon PostgreSQL + Tailwind CDN, deployed on Render (Polsia: email, R2 uploads, Stripe proxy — see [External Integrations](#external-integrations)).

## Local Development

```bash
# Install dependencies
npm install

# Start dev server (requires DATABASE_URL)
DATABASE_URL="postgresql://..." npm run dev

# Run tests (Node 20 — matches CI and .nvmrc)
npm test

# If your shell uses Node 22+, use Node 20 explicitly:
# nvm use 20 && npm test

# Run linter (requires eslint installed)
npm run lint
```

> **Note:** `npm install` is required before running tests locally. Several test
> files `require()` route modules that depend on express, pg, and other
> packages. Without `node_modules`, the upload/auth suites will crash and
> cancel. CI (`.github/workflows/ci.yml`) handles this automatically via
> `npm ci`.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `PORT` | No | Server port (default: 3000) |
| `JWT_SECRET` | Yes | Secret for signing access tokens (15-min JWTs) |
| `JWT_SECRET_PREVIOUS` | No | Previous secret for zero-downtime key rotation |
| `NODE_ENV` | No | Set to `production` in deployed env |
| `VAPID_PUBLIC_KEY` | No | Web Push VAPID public key |
| `VAPID_PRIVATE_KEY` | No | Web Push VAPID private key |
| `SMTP_HOST` | Yes (prod) | Outbound mail server |
| `SMTP_USER` / `SMTP_PASS` | Yes (prod) | SMTP credentials |
| `R2_ACCOUNT_ID` + R2 keys | Yes (uploads) | Cloudflare R2 direct upload |
| `EMAIL_ENABLED` | No | Set to `false` to disable email sending |
| `REQUIRE_EMAIL_VERIFICATION` | No | Set to `false` after email delivery confirmed |
| `SECURITY_HEADERS_ENABLED` | No | Set to `false` to disable security headers |

## Database

Schema is managed via `migrate.js` (runs on every deploy via `npm run build`).

Create new migrations in `migrations/` with timestamp prefix:
```
migrations/1750000000000_add_new_table.js
```

## External Integrations

- **SMTP** — transactional email (`SMTP_*` env vars)
- **Cloudflare R2** — image uploads (`R2_*` env vars)
- **Stripe** — checkout and webhooks (`STRIPE_*` env vars)
- **Web Push (VAPID)** — browser push notifications

## Key Endpoints

- `GET /health` — Health check (no DB query)
- `POST /api/auth/login` — Parent login (returns access token)
- `POST /api/auth/child-login` — Child login with PIN
- `POST /api/auth/refresh` — Silent token refresh
- `POST /api/auth/logout` — Logout

## Deployment

Deployed to Render. Push to main auto-deploys to staging. Manual production deploy via GitHub Actions.

Build: `npm run build` (= `npm run migrate`)
Start: `npm start`

## Polsia / this repository

| Item | Value |
|------|--------|
| GitHub | [MyStarday-Polsia](https://github.com/pontusburman-papabravo/MyStarday-Polsia) |
| Product | Min Stjärndag (`stjarndag` in `package.json`) |
| Cron jobs | Declared in `polsia.toml` (push reminders, midnight tasks, weekly email) |
| Proxies | Email, R2 uploads, Stripe — configured in Polsia (not in this repo) |

Tests expect **Node 20** (see `.nvmrc`). Run `npm ci` then `npm test` with `DATABASE_URL`, `JWT_SECRET`, and `NODE_ENV=test` set (CI uses mock values — see `.github/workflows/ci.yml`).