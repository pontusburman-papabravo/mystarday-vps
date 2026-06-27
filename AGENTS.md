# AGENTS.md

This repo is a Swedish family-routine app (Express.js + PostgreSQL, static frontend in `public/`). See `README.md` and `CLAUDE.md` for the product/architecture overview, directory map, and DB schema.

## Cursor Cloud specific instructions

The startup update script already installs npm dependencies. The notes below are the non-obvious things needed to run/test the app here.

### Recommended Update Script (Cursor → Cloud Agents → Environment)

Paste this into the environment **Update Script** field. It pins Node 20, installs dev deps, starts Postgres, bootstraps the local role/database from `DATABASE_URL`, then migrates:

```bash
set -euo pipefail
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
nvm install 20 2>/dev/null || true
npm install --include=dev --legacy-peer-deps
sudo pg_ctlcluster 16 main start || true
./scripts/cloud-agent-bootstrap.sh
npm run migrate
```

Without `./scripts/cloud-agent-bootstrap.sh`, `npm run migrate` fails on fresh VMs with `password authentication failed` because the Postgres role from `DATABASE_URL` does not exist yet.

### Runtime versions
- The project pins **Node 20** (`.nvmrc`). The VM default `node` (`/exec-daemon/node`) is Node 22 and takes priority on `PATH`, so prepend Node 20 explicitly in any shell that runs app/test commands:
  `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"` (install once with `nvm install 20` if missing).
- `npm install`/`npm ci` requires `--legacy-peer-deps`: a native-only Capacitor plugin (`@codetrix-studio/capacitor-google-auth`) peer-depends on Capacitor 6 while the project uses Capacitor 7. These are iOS/Android-only deps and irrelevant to the web app.
- **`NODE_ENV` is injected as a Cursor secret** into every shell, set to the deploy-mode value (the one npm treats as a prod build). This is the single most important gotcha here, with two consequences:
  1. **Installs omit devDependencies** (eslint, tailwindcss, puppeteer, …) → the startup update script and any manual install MUST use `npm install --include=dev --legacy-peer-deps`. (`eslint` *is* in the lockfile/`devDependencies`; it only goes missing because of that omission — there is no separate eslint install step.)
  2. **Running the app / tests requires overriding `NODE_ENV` per command** (see below), because the app expects a dev value and CI uses `test`. Don't try to unset the secret globally; just prefix the commands.

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
On Cursor Cloud, `DATABASE_URL` and `JWT_SECRET` are already injected as secrets — you do **not** set them manually. You only need to add `REQUIRE_EMAIL_VERIFICATION=false`. `NODE_ENV` is unfortunately injected at the deploy-mode value (see the gotcha above), so for **local dev you must override it explicitly** — run the dev server with `NODE_ENV=development …` and the test suite with `NODE_ENV=test …`. Do not rely on it being unset.

The injected `DATABASE_URL` points at `localhost:5432` but uses a specific role/db name (not literally `stjarndag`). The local Postgres role + database must match whatever that secret contains. If a fresh VM is missing them, run `./scripts/cloud-agent-bootstrap.sh` (also included in the recommended Update Script above), then `npm run migrate`.

All third-party integrations (Resend email, Cloudflare R2, Stripe, RevenueCat, Web Push, APNs/FCM, Facebook, Sentry) are **optional** and degrade gracefully without keys. Set `EMAIL_ENABLED=false` to silence email sends — but **do not set it when running the test suite** (the welcome-mailer tests expect email enabled).

### Run / lint / test
- Run dev server: `NODE_ENV=development REQUIRE_EMAIL_VERIFICATION=false npm run dev` (= `node server.js`, listens on `PORT` or 3000). Health check: `GET /health`. There is no hot-reload/watcher — restart the process after server-side changes. For manual UI testing, also add `EMAIL_ENABLED=false` so registrations don't trigger real Resend emails.
- Lint: `npm run lint` (the `src/` + `server.js` Node lint) is clean — 0 errors, ~78 warnings. Note `npm run lint:public` (separate CI step over `public/js`+`public/admin`) currently exceeds its `--max-warnings 2500` budget (~2900 pre-existing warnings) and fails; that is accumulated client-JS tech debt, not an environment issue.
- Test: run the curated CI gate with `NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false npm run test:gate` (this is all CI runs). To avoid any real outbound email, **unset `RESEND_API_KEY`** for the run (`env -u RESEND_API_KEY -u RESEND_API_KEY_WEEKLY …`); `@example.com` recipients are auto-suppressed regardless. Full `npm test` (~1026 tests) is deterministic when `DATABASE_URL` points at a real Postgres — DB integration files serialize via a PostgreSQL advisory lock in `test/helpers/db-test-lock.js`.

### Known caveats
- **Do not run `npm test` on the production VPS** with a live `RESEND_API_KEY` — integration tests POST to public routes and can send admin emails (e.g. `anna@example.com` pedagogintresse). Run tests only in dev/CI.
- Admin v2 deploy checklist: `docs/admin-v2/ADMIN-V2-DELIVERY.md` (migrations `1807800000000`, `1807900000000`).
- CI (`.github/workflows/ci.yml`) currently fails at the `npm ci` step because it does **not** pass `--legacy-peer-deps`; that is a pre-existing repo/CI issue, not an environment problem.
- The **global standard library** (`default_schedule`, `default_activity_template`, `default_reward`) is empty in a fresh local DB — it is harvested from production via `npm run harvest:library` + `npm run import:library` (needs prod admin creds). Consequence: the onboarding wizard's "schedule template" step fails locally with *"Inga aktiviteter hittades för valt schema"*. Per-family activities ARE seeded at registration (the family gets ~56 activities), so the core activity/reward/star loop works without the global library; only the prebuilt template picker is affected.

### Production deploy & ops (mystarday)

Agents **must** use these values (also `.cursor/rules/mystarday-deploy.mdc`):

| | |
|--|--|
| Local Mac | `/Users/pontusburman/mystarday-vps` |
| VPS SSH | `deploy@188.66.60.93` |
| VPS path | `/var/www/mystarday` |
| systemd | `mystarday` |
| URL | `https://mystarday.se` |

After `sudo systemctl restart mystarday`: **`sleep 3`** then `curl -s http://127.0.0.1:3000/health`.
Logs: `sudo journalctl -u mystarday -f` (not `stjarndag`).

### Direct VPS SSH (optional)

When `VPS_SSH_KEY`, `VPS_HOST`, and `VPS_USER` are set as **Cursor Cloud Agent secrets**, the agent can SSH to prod for logs, health checks, and manual deploy fallback.

- One-time setup (on your Mac): `./scripts/setup-cursor-agent-ssh.sh` — see [`docs/CURSOR-AGENT-VPS-SSH.md`](docs/CURSOR-AGENT-VPS-SSH.md)
- Verify in a cloud agent run: `./scripts/vps-ssh.sh check`
- Remote command: `./scripts/vps-ssh.sh 'sudo journalctl -u <service> -n 30 --no-pager'` (service from `*-deploy.mdc`)
- Interactive shell: `./scripts/vps-ssh.sh`

Use a **separate** ed25519 key from GitHub Actions (`VPS_SSH_KEY` in Cursor, not only in GitHub `vps` environment). Do **not** run `npm test` on prod VPS. Prefer merge-to-`main` → GitHub Actions for normal deploys.
