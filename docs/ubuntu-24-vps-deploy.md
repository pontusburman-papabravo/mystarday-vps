# Ubuntu 24 VPS — Min Stjärndag

Driftguide för egen server.

| | |
|--|--|
| **Git-repo** | `mystarday-vps` |
| **Appkatalog** | `/var/www/mystarday` |
| **Databas** | PostgreSQL på **samma VPS** (localhost) |

Stack: Node 20, Express, PostgreSQL 16, nginx + Let's Encrypt.

---

## Rekommenderad ordning

1. Användare + SSH + brandvägg  
2. **PostgreSQL** (detta avsnitt)  
3. Node 20  
4. Klona app → `.env` → `npm run build`  
5. **Importera data** (vid flytt från Render/Neon)  
6. systemd + nginx + DNS  

---

## 1. Användare och SSH

Kör appen **inte** som root.

```bash
adduser deploy
usermod -aG sudo deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
# Publik nyckel → /home/deploy/.ssh/authorized_keys
```

`/etc/ssh/sshd_config`: `PermitRootLogin no`, `PasswordAuthentication no` → `systemctl reload ssh`.

---

## 2. Grundpaket och brandvägg

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw fail2ban nginx certbot python3-certbot-nginx
sudo timedatectl set-timezone Europe/Stockholm
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
# Postgres ska INTE vara öppen utåt — ingen ufw-regel för 5432
sudo ufw enable
```

---

## 3. PostgreSQL på VPS

### 3.1 Installera och skapa databas

```bash
cd /var/www/mystarday   # eller klona repot först till temporär plats
sudo ./scripts/postgres-vps-init.sh
```

Skriptet installerar `postgresql`, skapar databas `mystarday` och användare `mystarday_app`, aktiverar `pgcrypto`, och skriver ut en färdig `DATABASE_URL`.

Manuellt (utan skript):

```bash
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres createuser -P mystarday_app
sudo -u postgres createdb -O mystarday_app mystarday
sudo -u postgres psql -d mystarday -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto;'
```

### 3.2 `DATABASE_URL` i `.env`

Använd **`localhost`** (inte `127.0.0.1`) — appen stänger av SSL för localhost:

```bash
DATABASE_URL=postgresql://mystarday_app:DITT_LÖSENORD@localhost:5432/mystarday
```

Fil: `/var/www/mystarday/.env`, ägare `deploy`, `chmod 600`.

### 3.3 Säkerhet

- Postgres lyssnar bara på `localhost` (skriptet sätter `listen_addresses = 'localhost'`)
- Ingen port 5432 i brandväggen utåt
- Backup-användare kan vara samma `postgres`-superuser via `sudo -u postgres pg_dump`

### 3.4 Schema (tom databas)

Efter att repot ligger i `/var/www/mystarday` och `.env` finns:

```bash
cd /var/www/mystarday
npm ci
npm run build    # kör alla migrationer mot lokal Postgres
```

Verifiera:

```bash
psql "$DATABASE_URL" -c '\dt family'
```

### 3.5 Flytta data från Render/Neon

**Full export (rekommenderat)** — kör **innan** DNS pekar på VPS, mot **gamla** databasen:

```bash
# På laptop eller Render Shell med källa DATABASE_URL
npm run export:database:sql
# Ger t.ex. export/stjarndag-full-export-YYYY-MM-DD.sql
```

På VPS (efter `npm run build` på tom DB, eller på tom DB före import — se nedan):

```bash
# Om SQL-filen innehåller CREATE TABLE — importera på tom instans utan migrate först.
# Om filen bara är data: kör npm run build först, sedan:
psql "postgresql://mystarday_app:...@localhost:5432/mystarday" \
  -v ON_ERROR_STOP=1 \
  -f ./export/stjarndag-full-export-YYYY-MM-DD.sql
```

Alternativ: familjer JSON/SQL, harvest — se `docs/MIGRATION_IMPORT.md`.

**Pool-storlek:** `src/lib/db.js` har `max: 5` (anpassat för Neon). På dedikerad VPS kan ni öka vid behov i en senare ändring; 5 räcker för normal trafik på en instans.

### 3.6 Backup (cron)

```bash
sudo install -d -m 700 /var/backups/mystarday
sudo crontab -e
```

```
0 3 * * * sudo -u postgres pg_dump -Fc mystarday > /var/backups/mystarday/mystarday-$(date +\%F).dump
```

Kopiera dumps off-site (S3, annan server). Behåll minst 7–30 dagar lokalt beroende på disk.

Återställning:

```bash
sudo -u postgres pg_restore -d mystarday --clean /var/backups/mystarday/mystarday-YYYY-MM-DD.dump
```

---

## 4. Node 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x
```

---

## 5. Klona `mystarday-vps` → `/var/www/mystarday`

```bash
sudo mkdir -p /var/www/mystarday
sudo chown deploy:deploy /var/www/mystarday

sudo -u deploy git clone git@github.com:pontusburman-papabravo/mystarday-vps.git /var/www/mystarday
cd /var/www/mystarday
sudo -u deploy npm ci
npm run build
```

---

## 6. Miljövariabler (`.env`)

| Variabel | Kommentar |
|----------|-----------|
| `DATABASE_URL` | `postgresql://mystarday_app:...@localhost:5432/mystarday` |
| `JWT_SECRET` | Minst 32 tecken |
| `NODE_ENV` | `production` |
| `APP_URL` | `https://mystarday.se` |
| `IN_PROCESS_CRONS_ENABLED` | `true` på enkel VPS |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | Utgående e-post (ingen Polsia) |
| `R2_*` | Cloudflare R2 direkt — se `docs/remove-polsia-migration.md` |

Övrig prod-lista: `docs/RELEASE.md`, `docs/remove-polsia-migration.md`.

---

## 7. systemd

```bash
sudo cp /var/www/mystarday/deploy/mystarday.service /etc/systemd/system/mystarday.service
sudo systemctl daemon-reload
sudo systemctl enable --now mystarday
curl -s http://127.0.0.1:3000/health
```

`journalctl -u mystarday -f`

---

## 8. nginx + SSL

```bash
sudo cp /var/www/mystarday/deploy/nginx-mystarday.conf.example /etc/nginx/sites-available/mystarday
sudo ln -sf /etc/nginx/sites-available/mystarday /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d mystarday.se -d www.mystarday.se
```

---

## 9. Deploy (app-uppdatering)

```bash
cd /var/www/mystarday
./scripts/vps-deploy.sh
```

(`git pull`, `npm ci`, `npm run build`, `systemctl restart mystarday`)

---

## 10. DNS och cutover

1. Exportera databas från **gamla** miljön  
2. Postgres + schema + import på VPS  
3. Röktest på IP eller staging-host (`/health`, login, ett barn-flöde)  
4. Byt DNS A/AAAA → VPS  
5. Uppdatera webhooks: RevenueCat `https://mystarday.se/api/iap/webhook`, Stripe m.m.  
6. Stäng av Render när allt är grönt  

---

## 11. Säkerhet — checklista

- [ ] `deploy`-användare, ingen root-SSH  
- [ ] `.env` chmod 600  
- [ ] Postgres endast localhost, ingen öppen 5432  
- [ ] `ufw` + `fail2ban`  
- [ ] Daglig `pg_dump` + off-site kopia  
- [ ] `/health` efter varje deploy  

---

## Filer i repot

| Fil | Syfte |
|-----|--------|
| `scripts/postgres-vps-init.sh` | Engångs Postgres-setup |
| `deploy/mystarday.service` | systemd |
| `deploy/nginx-mystarday.conf.example` | nginx |
| `scripts/vps-deploy.sh` | App-deploy |
| `docs/MIGRATION_IMPORT.md` | Detaljerad dataflytt |
