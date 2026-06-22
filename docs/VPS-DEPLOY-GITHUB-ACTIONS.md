# Automatisk deploy till VPS (GitHub Actions)

**Steg-för-steg + setup-script:** [`VPS-DEPLOY-SETUP.md`](VPS-DEPLOY-SETUP.md) — kör `./scripts/setup-github-actions-deploy.sh` på Mac.

Workflow: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)

Körs vid **push till `main`** och kan även startas manuellt under **Actions → Deploy to VPS → Run workflow**.

**Kanoniska värden:** `.cursor/rules/mystarday-deploy.mdc`, `AGENTS.md`.

| | |
|--|--|
| SSH | `deploy@188.66.60.93` |
| App path | `/var/www/mystarday` |
| systemd | `mystarday` |
| Mac clone | `/Users/pontusburman/mystarday-vps` |

Efter restart: **`sleep 3`** innan health check.

## GitHub environment `vps`

| Variable | Värde |
|----------|-------|
| `VPS_HOST` | `188.66.60.93` |
| `VPS_USER` | `deploy` |
| `VPS_APP_PATH` | `/var/www/mystarday` |
| `VPS_RESTART_CMD` | `sudo systemctl restart mystarday` |
| `VPS_HEALTH_URL` | `http://127.0.0.1:3000/health` |

## Manuell deploy på VPS

```bash
ssh deploy@188.66.60.93
cd /var/www/mystarday
git fetch origin main && git reset --hard origin/main
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 20
npm install --legacy-peer-deps && npm run migrate
sudo systemctl restart mystarday
sleep 3
curl -s http://127.0.0.1:3000/health
```

## Felsökning

| Problem | Åtgärd |
|---------|--------|
| Tom logg vid Apple Sign In | Native iOS — inget API-anrop; se iOS build 19 |
| Health check timeout | `sudo journalctl -u mystarday -f`; `sleep 3` efter restart |
| Fel service name | Använd `mystarday`, inte `stjarndag` |
