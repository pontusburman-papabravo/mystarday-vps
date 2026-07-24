# PR #713 — Staging / preview for physical mobile QA

**Purpose:** Test exact PR #713 HEAD before merge. **Do not use the public live site** for #713 en-GB validation.

**Branch:** `cursor/i18n-today-home-shell-b8ba`  
**Expected SW after nav fix:** `stjarndag-v668`

---

## Option A — Local preview (cloud agent / developer machine)

### 1. Checkout PR branch

```bash
git fetch origin cursor/i18n-today-home-shell-b8ba
git checkout cursor/i18n-today-home-shell-b8ba
```

### 2. Start Postgres + migrate

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
sudo pg_ctlcluster 16 main start || true
./scripts/cloud-agent-bootstrap.sh
npm run migrate
```

Run migrate with the same runtime mode as local dev (see `AGENTS.md`).

### 3. Prepare QA families

```bash
export QA_PASSWORD='your-local-qa-password-min-12-chars'
node scripts/setup-pr713-qa-accounts.mjs
```

Creates (default emails, override with `QA_SV_EMAIL` / `QA_EN_EMAIL`):

| Family | `preferred_locale` | `english_app` | Default email |
|--------|-------------------|---------------|---------------|
| Svensk kontroll | `sv-SE` | OFF | `qa-pr713-sv@example.com` |
| Engelsk test | `en-GB` | ON | `qa-pr713-en@example.com` |

Password is set via `QA_PASSWORD` — **never commit it**.

### 4. Run server

```bash
REQUIRE_EMAIL_VERIFICATION=false EMAIL_ENABLED=false npm run dev
```

Use development runtime per `AGENTS.md` (override injected deploy-mode env when starting the server).

Open `http://<your-machine>:3000` from a phone on the same network (or use ngrok/tunnel if needed).

### 5. Verify locale API before UI QA

```bash
curl -s http://127.0.0.1:3000/api/i18n/en-GB | jq '.nav.primary'
curl -s http://127.0.0.1:3000/api/i18n/sv-SE | jq '.nav.primary'
```

Expected en-GB: `home=Home`, `planning=Planning`, etc.  
Expected sv-SE: `planning=Planering` (not `Planning`).

---

## Option B — VPS staging path (separate from the public live deploy)

The public live deploy (default app port) must **not** receive PR #713 until merge.

### Manual staging deploy (project owner / ops)

```bash
# On VPS as deploy user — separate directory, separate port
export STAGING_PATH=/var/www/pr713-staging
export STAGING_PORT=3001
export BRANCH=cursor/i18n-today-home-shell-b8ba

git clone --branch "$BRANCH" <repo-url> "$STAGING_PATH"  # or fetch in existing clone
cd "$STAGING_PATH"
git checkout "$BRANCH"
npm install --legacy-peer-deps --include=dev
npm run migrate
PORT=$STAGING_PORT node server.js
```

Use host runtime env vars from the secret store (same as normal deploy, but separate `DATABASE_URL` if possible).

Expose via nginx staging subdomain or SSH tunnel:

```bash
ssh -L 3001:127.0.0.1:3001 deploy@<vps-host>
```

Health: `curl http://127.0.0.1:3001/health`

### Staging QA families on VPS DB

Use a **separate database** or dedicated test families — do not modify the shared App Store review account without approval (see `docs/qa-test-account.md`).

Run `scripts/setup-pr713-qa-accounts.mjs` against the staging `DATABASE_URL`.

---

## Physical QA checklist (human tester)

Use `docs/i18n-en-gb-home-today.md` § Manual QA checklist.

**Platforms required (all four):**

1. iOS Safari
2. iOS Capacitor WebView (TestFlight/internal build pointing at staging URL)
3. Android Chrome
4. Android Capacitor WebView

**Locales:**

- Log in as sv-SE family → Swedish nav: Hem, Planering, Belöningar, För dig, Familj
- Log in as en-GB + english_app → English nav: Home, Planning, Rewards, For you, Family

**Verify after nav fix:**

- No Swedish nav labels after en-GB session is established
- No `Planning` on sv-SE (must be `Planering`)
- Locale persists after reload and app restart
- Home → Today → complete activity → undo

---

## SW / cache

After deploying a new build, confirm in browser DevTools → Application → Service Workers:

- Cache name matches `config/cache-version.json` (`stjarndag-v668` after nav fix)
- Hard refresh or clear site data if old `v667` persists

---

## Status

| Item | Value |
|------|-------|
| QA status | **QA BLOCKERAD** — physical mobile QA not yet done |
| Merge | **Not allowed** until physical QA passes |
| Prod | **Do not use** for #713 sign-off |
