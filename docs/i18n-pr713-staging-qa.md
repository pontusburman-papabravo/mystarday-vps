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

## Option B — VPS staging (deployad 2026-07-24)

| Fält | Värde |
|------|-------|
| Path | `/home/deploy/pr713-staging` |
| Port | `3001` (prod oförändrad på `3000`) |
| SHA | `8f0bce14` (app i18n identisk med `d6b3df0e`) |
| SW | `stjarndag-v668` |
| Deploy-skript | `scripts/deploy-pr713-staging.sh` |
| Logg | `/home/deploy/pr713-staging/staging.log` |

Redeploy:

```bash
VPS_APP_PATH=/var/www/<live-app> TARGET_SHA=8f0bce14 ./scripts/deploy-pr713-staging.sh
```

(Kör på VPS via SSH, eller pipe script: `./scripts/vps-ssh.sh 'VPS_APP_PATH=... bash -s' < scripts/deploy-pr713-staging.sh`)

### Fysisk enhetsåtkomst (ingen publik port)

Port `3001` är inte öppen externt. Använd SSH-tunnel från dator på samma Wi‑Fi som telefonen:

```bash
ssh -L 0.0.0.0:3001:127.0.0.1:3001 deploy@<vps-host>
```

Öppna på telefon: `http://<datorns-lan-ip>:3001`

QA-lösenord (hämtas via SSH, committas aldrig):

```bash
ssh deploy@<vps-host> 'cat /home/deploy/pr713-staging/.qa-password'
```

Barn-PIN standard: `7137`.

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
