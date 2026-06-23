# Min Stjärndag

Swedish family app for children's daily routines, star rewards, and schedule management. Parents create structured daily schedules, children earn stars by completing activities, and redeem stars for rewards in the "Skattkammaren" (treasure chamber).

**Repository:** [pontusburman-papabravo/mystarday-vps](https://github.com/pontusburman-papabravo/mystarday-vps) — produktion på egen VPS ([mystarday.se](https://mystarday.se)).

> Det tidigare repot **MyStarday-Polsia** är omdöpt till `mystarday-vps` och Polsia-deploy är avvecklat. Se [`docs/ARKIVERAT-POLSIA-REPO.md`](docs/ARKIVERAT-POLSIA-REPO.md).

## Stack

Express.js + Neon PostgreSQL + Tailwind CDN, deployed on VPS (Resend email, R2 or local uploads, RevenueCat IAP on native — see [External Integrations](#external-integrations)).

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

- **Resend** — outbound email (verification, invites, newsletters)
- **Cloudflare R2** or **local disk** — image uploads (`data/uploads` on VPS without R2)
- **RevenueCat** — in-app purchases on iOS/Android (Apple/Google IAP); webhook syncs `subscription_status` via `POST /api/iap/webhook`. No web checkout — see [`docs/app-store-iap.md`](docs/app-store-iap.md).
- **Web Push (VAPID)** — browser push notifications
- **Apple APNs / FCM** — native push (iOS/Android)

## Key Endpoints

- `GET /health` — Health check (no DB query)
- `POST /api/auth/login` — Parent login (returns access token)
- `POST /api/auth/child-login` — Child login with PIN
- `POST /api/auth/refresh` — Silent token refresh
- `POST /api/auth/logout` — Logout

## Deployment

Produktion: VPS på https://mystarday.se. Efter merge till `main`:

```bash
git pull origin main
npm install
npm run migrate
# starta om appen (systemd/pm2/docker)
```

Se [`docs/VPS-ANDROID-ENV.md`](docs/VPS-ANDROID-ENV.md) för env och verifiering.

Build: `npm run build` (= `npm run migrate`)  
Start: `npm start`

Tests expect **Node 20** (see `.nvmrc`). Run `npm ci` then `npm test` with `DATABASE_URL`, `JWT_SECRET`, and `NODE_ENV=test` set (CI uses mock values — see `.github/workflows/ci.yml`).
