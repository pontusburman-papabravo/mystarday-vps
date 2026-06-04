# Ubuntu 24 VPS — Min Stjärndag

Driftguide för egen server. **Git-repo:** `mystarday-vps` · **Appkatalog på servern:** `/var/www/mystarday`

Stack: Node 20, Express (`server.js`), PostgreSQL via `DATABASE_URL` (Neon eller lokal Postgres), nginx + Let's Encrypt.

---

## 1. Användare och SSH

Kör appen **inte** som root.

```bash
# Första inloggning som root
adduser deploy
usermod -aG sudo deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
# Lägg din publika nyckel i /home/deploy/.ssh/authorized_keys
```

`/etc/ssh/sshd_config` (sedan `systemctl reload ssh`):

- `PermitRootLogin no`
- `PasswordAuthentication no`

Logga in framöver som `deploy` (eller din egen användare med sudo).

---

## 2. Grundpaket och brandvägg

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw fail2ban nginx certbot python3-certbot-nginx
sudo timedatectl set-timezone Europe/Stockholm
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 3. Node 20

Matchar `.nvmrc` och CI.

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x
```

---

## 4. Klona `mystarday-vps` → `/var/www/mystarday`

```bash
sudo mkdir -p /var/www/mystarday
sudo chown deploy:deploy /var/www/mystarday

sudo -u deploy git clone git@github.com:YOUR_ORG/mystarday-vps.git /var/www/mystarday
cd /var/www/mystarday
sudo -u deploy npm ci
```

Byt `YOUR_ORG` mot er GitHub-organisation/användare. Deploy-nyckel eller SSH-agent ska kunna läsa repot.

Första gången och vid varje release:

```bash
cd /var/www/mystarday
npm run build    # kör migrate.js
```

Eller använd `scripts/vps-deploy.sh` (se avsnitt 8).

---

## 5. Miljövariabler

Skapa `/var/www/mystarday/.env` (ägare `deploy`, `chmod 600`).

**Obligatoriskt:**

| Variabel | Kommentar |
|----------|-----------|
| `DATABASE_URL` | Neon eller lokal Postgres |
| `JWT_SECRET` | Minst 32 tecken i produktion |
| `NODE_ENV` | `production` |
| `APP_URL` | `https://mystarday.se` |
| `POLSIA_API_KEY` | E-post, R2-upload, m.m. |

**En instans på VPS (rekommenderat):**

```bash
POLSIA_IN_PROCESS_CRONS_ENABLED=true
```

Då körs push-påminnelser (var 5:e min) in-process. Midnatt och veckosammanfattning startas redan från `server.js` vid uppstart.

Full produktionslista: `docs/RELEASE.md` och `docs/polsia-release-os/ENV_FOR_POLSIA_DASHBOARD.md`.

---

## 6. systemd

Kopiera från repot:

```bash
sudo cp /var/www/mystarday/deploy/mystarday.service /etc/systemd/system/mystarday.service
sudo systemctl daemon-reload
sudo systemctl enable --now mystarday
curl -s http://127.0.0.1:3000/health
```

Loggar: `journalctl -u mystarday -f`

---

## 7. nginx + SSL

```bash
sudo cp /var/www/mystarday/deploy/nginx-mystarday.conf.example /etc/nginx/sites-available/mystarday
sudo ln -sf /etc/nginx/sites-available/mystarday /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d mystarday.se -d www.mystarday.se
```

Appen sätter redan `trust proxy` — nginx skickar `X-Forwarded-*`.

---

## 8. Deploy (uppdatering)

Som `deploy`:

```bash
cd /var/www/mystarday
./scripts/vps-deploy.sh
```

Skriptet gör `git pull`, `npm ci`, `npm run build`, `sudo systemctl restart mystarday`.

Manuellt:

```bash
cd /var/www/mystarday
git pull
npm ci
npm run build
sudo systemctl restart mystarday
```

---

## 9. DNS och externa webhooks

Innan cutover från Render:

- A/AAAA → VPS IP för `mystarday.se`
- RevenueCat: `https://mystarday.se/api/iap/webhook`
- Stripe-webhook (om aktiv)
- Neon: tillåt VPS utgående IP om allowlist används

---

## 10. Databas

| Val | När |
|-----|-----|
| **Neon kvar** | Enklast vid flytt — bara byta `DATABASE_URL` |
| **Postgres på VPS** | `sudo apt install postgresql` + import enligt `docs/MIGRATION_IMPORT.md` |

---

## 11. Säkerhet — snabb checklista

- [ ] Appanvändare `deploy`, ingen root-SSH
- [ ] `.env` chmod 600
- [ ] `ufw` + `fail2ban`
- [ ] `unattended-upgrades` för säkerhetspatchar
- [ ] Backup av databas (Neon eller `pg_dump` off-site)
- [ ] `/health` övervakas efter deploy

---

## Filer i detta repo

| Fil | Syfte |
|-----|--------|
| `deploy/mystarday.service` | systemd-enhet |
| `deploy/nginx-mystarday.conf.example` | nginx reverse proxy |
| `scripts/vps-deploy.sh` | Pull + migrate + omstart |
