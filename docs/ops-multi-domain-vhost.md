# Multi-domain VPS setup (mystarday.app + mystarday.eu) <!-- pragma: allowlist secret -->

Backend redirect logic lives in `src/lib/domain-redirect.js` (deployed with the Node app). **Apache/DirectAdmin must still terminate TLS and proxy each hostname to Node** — otherwise visitors hit the default Apache page or a certificate mismatch before Express runs.

## Product routing (after deploy)

| Host | Behavior |
|------|----------|
| `mystarday.se` | Swedish site (canonical) — no redirect | <!-- pragma: allowlist secret -->
| `www.mystarday.se` | 301 → apex (Express) | <!-- pragma: allowlist secret -->
| `mystarday.app` | International site — no redirect | <!-- pragma: allowlist secret -->
| `www.mystarday.app` | 301 → `https://mystarday.app` (Express) | <!-- pragma: allowlist secret -->
| `mystarday.eu` | 301 → `https://mystarday.app` (Express) | <!-- pragma: allowlist secret -->
| `www.mystarday.eu` | 301 → `https://mystarday.app` (Express) | <!-- pragma: allowlist secret -->
| Legacy aliases (`minstjärndag.se`, …) | 301 → `https://mystarday.se` (unchanged) | <!-- pragma: allowlist secret -->

`APP_URL` stays on the Swedish apex domain until a separate i18n/product decision changes it.

---

## Current VPS state (2026-08-21)

Verified from Cloud Agent SSH (`deploy@188.66.60.93`):

| Check | Result |
|-------|--------|
| Node on `:3000` | OK — serves all hosts when reached directly |
| `https://mystarday.se` | OK — Apache → Express | <!-- pragma: allowlist secret -->
| `https://mystarday.app` | **Broken** — wrong/missing TLS cert; Apache default page | <!-- pragma: allowlist secret -->
| `https://mystarday.eu` | **Broken** — wrong/missing TLS cert (needs DNS + vhost) | <!-- pragma: allowlist secret -->
| DirectAdmin / Inleed | Cert renewal uses webroot under `/home/admin/domains/mystarday.se/public_html` | <!-- pragma: allowlist secret -->
| `deploy` sudo | Limited — **cannot** edit Apache vhosts or run certbot |

---

## DNS (founder)

### mystarday.app — done (Cloudflare) <!-- pragma: allowlist secret -->

- `A mystarday.app` → `188.66.60.93` (DNS only) <!-- pragma: allowlist secret -->
- `A www.mystarday.app` → `188.66.60.93` (DNS only) <!-- pragma: allowlist secret -->

### mystarday.eu — fix on One.com <!-- pragma: allowlist secret -->

`.eu` is still on **One.com**. Point apex + www to the VPS:

| Record | Type | Value |
|--------|------|-------|
| `@` (apex) | A | `188.66.60.93` |
| `www` | A | `188.66.60.93` |

Remove old/wrong A records (e.g. `216.24.57.1`). Until this is fixed, Let's Encrypt cannot issue a cert for `.eu` and HTTPS will fail even after Apache is configured.

---

## Apache / DirectAdmin (founder — requires admin/root)

The VPS uses **Inleed + DirectAdmin** (Apache/2 on `:80`/`:443`). Domain vhosts are **not** in `/etc/nginx/sites-enabled`; they are managed in the DirectAdmin panel (`:2222`) or custom Apache includes.

### Option A — DirectAdmin panel (recommended)

1. Log in to DirectAdmin (`https://188.66.60.93:2222` or Inleed panel).
2. **Add domain** `mystarday.app` (and alias `www.mystarday.app`) under the same account as `mystarday.se`, **or** add them as **domain pointers / aliases** to the existing site — mirror however `mystarday.se` is set up today. <!-- pragma: allowlist secret -->
3. For each new hostname, ensure the document root uses the **same reverse proxy** as `mystarday.se` (proxy to `http://127.0.0.1:3000/`). Typical Apache snippet: <!-- pragma: allowlist secret -->

```apache
ProxyPreserveHost On
ProxyPass / http://127.0.0.1:3000/
ProxyPassReverse / http://127.0.0.1:3000/
```

4. **SSL → Let's Encrypt**: expand the certificate to include:
   - `mystarday.app` <!-- pragma: allowlist secret -->
   - `www.mystarday.app` <!-- pragma: allowlist secret -->
   - `mystarday.eu` (after One.com DNS points to VPS) <!-- pragma: allowlist secret -->
   - `www.mystarday.eu` (after DNS fix) <!-- pragma: allowlist secret -->

5. Rebuild Apache config in DirectAdmin and reload.

### Option B — Manual Apache custom config (root SSH)

If you prefer shell, run as root on the VPS:

```bash
sudo bash /var/www/mystarday/scripts/ops/setup-multi-domain-vhost.sh --check <!-- pragma: allowlist secret -->
sudo bash /var/www/mystarday/scripts/ops/setup-multi-domain-vhost.sh <!-- pragma: allowlist secret -->
```

The script prints the exact `certbot` expand command and a reference vhost block. It does **not** auto-edit DirectAdmin-managed files — use it as a checklist.

---

## Verify after VPS changes

```bash
# TLS + proxy
curl -sSI https://mystarday.app/health | head -5 <!-- pragma: allowlist secret -->
curl -sSI https://www.mystarday.app/ | head -5    # expect 301 → mystarday.app <!-- pragma: allowlist secret -->
curl -sSI https://mystarday.eu/ | head -5         # expect 301 → mystarday.app (after deploy) <!-- pragma: allowlist secret -->
curl -sSI https://www.mystarday.eu/foo | head -5  # expect 301 → mystarday.app/foo <!-- pragma: allowlist secret -->

# Swedish site unchanged
curl -sSI https://www.mystarday.se/ | grep -i location <!-- pragma: allowlist secret -->
curl -sSI https://mystarday.se/health | head -3 <!-- pragma: allowlist secret -->

# Node health (on VPS)
curl -s http://127.0.0.1:3000/health
```

After code deploy + Apache fix:

```bash
sudo systemctl restart mystarday <!-- pragma: allowlist secret -->
sleep 3
curl -s http://127.0.0.1:3000/health
```

---

## Deploy order

1. Merge this PR (Node redirect logic).
2. GitHub Actions deploy to VPS (or manual `git pull` + restart).
3. Founder: DirectAdmin vhost + cert for `.app` (and `.eu` after DNS).
4. Smoke-test URLs above.

---

## Related files

- `src/lib/domain-redirect.js` — redirect middleware
- `test/domain-redirect.test.js` — unit tests
- `scripts/ops/setup-multi-domain-vhost.sh` — VPS checklist script (root)
