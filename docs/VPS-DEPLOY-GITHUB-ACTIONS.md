# Automatisk deploy till VPS (GitHub Actions)

Workflow: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)

Körs vid **push till `main`** och kan även startas manuellt under **Actions → Deploy to VPS → Run workflow**.

## 1. Skapa deploy-nyckel (engångs)

På din laptop:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/stjarndag-deploy -N ""
```

På VPS — lägg till **publika** nyckeln:

```bash
# som den användare som ska deploya (t.ex. deploy eller din vanliga user)
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo 'INNEHÅLL_FRÅN_stjarndag-deploy.pub' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Ge användaren rätt att starta om appen, t.ex. sudoers:

```bash
# /etc/sudoers.d/stjarndag-deploy (visudo)
deploy ALL=(ALL) NOPASSWD: /bin/systemctl restart stjarndag
```

(Anpassa service-namn om ni kör pm2/docker — se `VPS_RESTART_CMD` nedan.)

## 2. GitHub Secrets

**Repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret | Obligatorisk | Exempel |
|--------|--------------|---------|
| `VPS_HOST` | Ja | serverns IP eller hostname |
| `VPS_USER` | Ja | `deploy` |
| `VPS_SSH_KEY` | Ja | Hela **privata** nyckeln (`stjarndag-deploy`) |
| `VPS_APP_PATH` | Ja | `/var/www/stjarndag-vps` |
| `VPS_SSH_PORT` | Nej | `22` (default) |
| `VPS_RESTART_CMD` | Nej | `sudo systemctl restart stjarndag` (default om utelämnad) |
| `VPS_HEALTH_URL` | Nej | `http://127.0.0.1:3000/health` på servern (default) |

### GitHub Environment (rekommenderat)

Workflowen använder environment **`vps`**. Skapa den under **Settings → Environments → New environment** och lägg secrets där (samma namn som ovan). Då kan ni kräva manuellt godkännande innan deploy om ni vill.

## 3. Förbered VPS (engångs)

```bash
cd /var/www/stjarndag-vps   # samma som VPS_APP_PATH
git clone https://github.com/ORG/REPO.git .
# eller: git remote add origin … om katalogen redan finns

# Node 20 (nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 20
nvm use 20

# .env med DATABASE_URL, JWT_SECRET, m.m. — redan på plats i prod
npm install --legacy-peer-deps
npm run migrate
```

## 4. Kör allt i ett

1. Skapa GitHub environment **`vps`** och lägg in secrets (steg 2)
2. Pusha/mergea till `main` — workflow startar automatiskt  
   **eller** Actions → **Deploy to VPS** → **Run workflow**
3. Följ loggen under Actions

Verifiera (ersätt med er publika domän):

```bash
curl -sS https://ER-DOMAN/health
curl -sS https://ER-DOMAN/sw.js | grep CACHE_NAME
```

## pm2 / Docker istället för systemd

Sätt `VPS_RESTART_CMD`:

| Setup | `VPS_RESTART_CMD` |
|-------|-------------------|
| pm2 | `pm2 restart stjarndag` |
| Docker Compose | `cd /var/www/stjarndag-vps && docker compose up -d --build` |

## Felsökning

| Problem | Åtgärd |
|---------|--------|
| `Permission denied (publickey)` | Kontrollera `VPS_SSH_KEY` och `authorized_keys` på servern |
| `git: not a directory` | Fel `VPS_APP_PATH` — måste peka på git-repo-roten |
| `systemctl: command not found` | Sätt `VPS_RESTART_CMD` till pm2/docker |
| Health check timeout | Appen startar långsamt — sätt `VPS_HEALTH_URL` eller fixa restart-kommando |
