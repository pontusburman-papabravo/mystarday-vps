# AGENTS.md

This repo is a Swedish family-routine app (Express.js + PostgreSQL, static frontend in `public/`). See `README.md` and `CLAUDE.md` for the product/architecture overview, directory map, and DB schema.

## Cursor Cloud specific instructions

The startup update script already installs npm dependencies. The notes below are the non-obvious things needed to run/test the app here.

### Runtime versions
- The project pins **Node 20** (`.nvmrc`). The VM default `node` (`/exec-daemon/node`) is Node 22 and takes priority on `PATH`, so prepend Node 20 explicitly in any shell that runs app/test commands:
  `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"` (install once with `nvm install 20` if missing).
- `npm install`/`npm ci` requires `--legacy-peer-deps`: a native-only Capacitor plugin (`@codetrix-studio/capacitor-google-auth`) peer-depends on Capacitor 6 while the project uses Capacitor 7. These are iOS/Android-only deps and irrelevant to the web app.
- **eslint is not in the lockfile** — install it separately before linting: `npm install --no-save eslint@^9.0.0 --legacy-peer-deps` (CI does the same).

### Database
- A local **PostgreSQL 16** is used for dev. Start it with `sudo pg_ctlcluster 16 main start`.
- Connection string for local dev: `postgresql://<user>:<pass>@localhost:5432/stjarndag` — set up a local role/DB named `stjarndag` (the role can match the password for dev). `src/lib/db.js` auto-disables SSL when the host is `localhost`.
- Apply schema with `npm run migrate` (idempotent; also aliased as `npm run build`). The app **exits immediately** if `DATABASE_URL` is unset.

### Required env to run the server / tests
```
export DATABASE_URL="postgresql://<user>:<pass>@localhost:5432/stjarndag"
export JWT_SECRET="<any-dev-string-at-least-32-chars-long>"
export REQUIRE_EMAIL_VERIFICATION="false"   # lets new accounts log in without email verification
```
Leave `NODE_ENV` unset (or any non-`production` value) for local dev — `JWT_SECRET` is only length-enforced (>=32) when `NODE_ENV` is the production value.

All third-party integrations (Resend email, Cloudflare R2, Stripe, RevenueCat, Web Push, APNs/FCM, Facebook, Sentry) are **optional** and degrade gracefully without keys. Set `EMAIL_ENABLED=false` to silence email sends — but **do not set it when running the test suite** (the welcome-mailer tests expect email enabled).

### Run / lint / test
- Run dev server: `npm run dev` (= `node server.js`, listens on `PORT` or 3000). Health check: `GET /health`. There is no hot-reload/watcher — restart the process after server-side changes.
- Lint: `npm run lint` (after installing eslint as above). Currently clean: 0 errors, ~74 pre-existing warnings.
- Test: `NODE_ENV=test npm test` (Node's built-in runner over `test/*.test.js`). Match CI's env (`DATABASE_URL`, `JWT_SECRET`, `REQUIRE_EMAIL_VERIFICATION=false`, `NODE_ENV=test`).

### Known caveats
- CI (`.github/workflows/ci.yml`) currently fails at the `npm ci` step because it does **not** pass `--legacy-peer-deps`; that is a pre-existing repo/CI issue, not an environment problem.
- The **global standard library** (`default_schedule`, `default_activity_template`, `default_reward`) is empty in a fresh local DB — it is harvested from production via `npm run harvest:library` + `npm run import:library` (needs prod admin creds). Consequence: the onboarding wizard's "schedule template" step fails locally with *"Inga aktiviteter hittades för valt schema"*. Per-family activities ARE seeded at registration (the family gets ~56 activities), so the core activity/reward/star loop works without the global library; only the prebuilt template picker is affected.
