# Automatisk deploy till VPS (GitHub Actions)

Workflow: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)

Körs vid **push till `main`** och kan även startas manuellt under **Actions → Deploy to VPS → Run workflow**.

Konfigurationen ligger i GitHub environment **`vps`**:

- **Environment secrets** — känslig data (endast privat SSH-nyckel)
- **Environment variables** — övrig deploy-konfiguration (icke-känsligt, synligt för repo-admins)

## 1. Skapa deploy-nyckel (engångs)

På din laptop:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/stjarndag-deploy -N ""
```

På VPS — lägg till **publika** nyckeln för användaren `deploy`:

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo 'INNEHÅLL_FRÅN_stjarndag-deploy.pub' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Ge `deploy` rätt att starta om appen (visudo):

```bash
# /etc/sudoers.d/stjarndag-deploy
deploy ALL=(ALL) NOPASSWD: /bin/systemctl restart stjarndag
```

## 2. GitHub environment `vps`

**Settings → Environments → `vps`**

### Environment secrets

| Secret | Beskrivning |
|--------|-------------|
| `VPS_SSH_KEY` | Hela **privata** deploy-nyckeln (`~/.ssh/stjarndag-deploy`) |

### Environment variables (prod)

| Variable | Värde | Beskrivning |
|----------|-------|-------------|
| `VPS_HOST` | `188.66.60.93` | Server-IP |
| `VPS_USER` | `deploy` | SSH-användare |
| `VPS_SSH_PORT` | `22` | SSH-port |
| `VPS_APP_PATH` | `/var/www/mystarday` | Git-repo på servern | <!-- pragma: allowlist secret -->
| `VPS_RESTART_CMD` | `sudo systemctl restart stjarndag` | Starta om efter migrate |
| `VPS_HEALTH_URL` | `http://127.0.0.1:3000/health` | Health check på servern |

Workflowen använder `secrets.VPS_SSH_KEY` och `vars.VPS_*` i [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

Valfritt: **Required reviewers** på environment `vps` för manuellt godkännande före deploy.

## 3. Förbered VPS (engångs)

```bash
cd /var/www/mystarday   # samma som VPS_APP_PATH i GitHub  # pragma: allowlist secret

# Node 20 (nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 20 && nvm use 20

npm install --legacy-peer-deps
npm run migrate
sudo systemctl enable stjarndag
sudo systemctl start stjarndag
```

## 4. Deploy

1. Secrets + variables enligt steg 2
2. **Actions → Deploy to VPS → Run workflow** (eller push till `main`)
3. Följ loggen under Actions

Verifiera mot publik domän eller:

```bash
curl -sS http://188.66.60.93/health
curl -sS http://127.0.0.1:3000/health   # på servern
```

## pm2 / Docker

Ändra variable `VPS_RESTART_CMD` i environment `vps`:

| Setup | Värde |
|-------|-------|
| pm2 | `pm2 restart stjarndag` |
| Docker Compose | `cd /var/www/mystarday && docker compose up -d --build` | <!-- pragma: allowlist secret -->

## Felsökning

| Problem | Åtgärd |
|---------|--------|
| `Permission denied (publickey)` | Kontrollera secret `VPS_SSH_KEY` och `authorized_keys` för `deploy` |
| `Input required and not supplied: host` | Variable `VPS_HOST` saknas i environment `vps` |
| `git: not a directory` | Fel `VPS_APP_PATH` |
| Health check timeout | `journalctl -u stjarndag -f` på servern |
