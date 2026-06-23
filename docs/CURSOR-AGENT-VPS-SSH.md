# Cursor Cloud Agent → direkt SSH till VPS

Mål: Cloud Agent ska kunna köra kommandon på prod-VPS (loggar, health, manuell deploy) utan att du SSH:ar själv.

**Separat nyckel** från GitHub Actions — samma mönster som `setup-github-actions-deploy.sh`, men secrets hamnar i **Cursor** istället för GitHub.

Kanoniska prod-värden: `.cursor/rules/*-deploy.mdc`, `AGENTS.md`.

---

## Steg 1 — Kör setup på din Mac

```bash
cd ~/path/to/repo
chmod +x scripts/setup-cursor-agent-ssh.sh scripts/vps-ssh.sh
./scripts/setup-cursor-agent-ssh.sh
```

Scriptet:

1. Skapar en ed25519-nyckel i `~/.ssh/cursor_agent_<service>_deploy` (namn från deploy-regelfilen)
2. Visar exakt rad att lägga i `authorized_keys` på VPS
3. Listar vilka secrets du ska lägga i Cursor

**Senare, bara påminnelse:**

```bash
./scripts/setup-cursor-agent-ssh.sh vps-key    # publik nyckel igen
./scripts/setup-cursor-agent-ssh.sh secrets    # Cursor Secrets-lista
./scripts/setup-cursor-agent-ssh.sh test       # SSH-test från Mac
```

---

## Steg 2 — Lägg publik nyckel på VPS

Som `deploy` på servern (värden från deploy-regelfilen):

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo '<publik nyckel från scriptet>' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Om du redan har GitHub Actions deploy-nyckel där: **lägg till** en ny rad — ta inte bort den gamla.

---

## Steg 3 — Secrets i Cursor

Öppna **[cursor.com/dashboard](https://cursor.com/dashboard) → Cloud Agents → Secrets** (samma environment som repot använder).

| Namn | Typ i Cursor | Innehåll |
|------|----------------|----------|
| `VPS_SSH_KEY` | **Runtime Secret** | Hela privata nyckeln (`pbcopy < ~/.ssh/cursor_agent_…`) |
| `VPS_HOST` | Environment Variable | t.ex. `188.66.60.93` |
| `VPS_USER` | Environment Variable | `deploy` |
| `VPS_APP_PATH` | Environment Variable | från `*-deploy.mdc` (VPS path) |
| `VPS_SERVICE` | Environment Variable | från `*-deploy.mdc` (systemd) |

`VPS_SSH_KEY` som **Runtime Secret** så den inte syns i chat eller commits.

### Nätverk (om SSH inte fungerar)

Om miljön har begränsad egress: **Security & Network → allowlist** — tillåt utgående TCP **22** till VPS-IP.

---

## Steg 4 — Verifiera i Cloud Agent

Starta en ny agent-körning (secrets injiceras vid start) och kör:

```bash
./scripts/vps-ssh.sh check
./scripts/vps-ssh.sh 'cd /var/www/<app> && git log -1 --oneline'
./scripts/vps-ssh.sh 'sudo journalctl -u <service> -n 20 --no-pager'
```

Interaktiv shell:

```bash
./scripts/vps-ssh.sh
```

---

## Vad agenten får / inte får göra

| OK | Undvik |
|----|--------|
| Läsa loggar, health, `git log` på VPS | `npm test` mot prod (kan skicka mail) |
| Manuell deploy enligt samma steg som Actions | Radera data utan explicit uppdrag |
| `sudo systemctl restart <service>` om sudoers finns | Lägga privat nyckel i repo eller chat |

**Standard-deploy** sker fortfarande via merge till `main` → GitHub Actions. Direkt SSH är för felsökning och undantag.

---

## Felsökning

| Symptom | Åtgärd |
|---------|--------|
| `VPS_SSH_KEY is not set` | Secrets saknas eller fel environment — kör `secrets`-kommandot igen |
| `Permission denied (publickey)` | Publik nyckel inte i `authorized_keys`, eller fel privat nyckel i secret |
| Timeout / connection refused | Network allowlist i Cursor; brandvägg på VPS |
| `sudo: a password is required` | Sudoers för `systemctl restart` — se `VPS-DEPLOY-SETUP.md` A3 |

---

## Referens

- Agent-helper: [`scripts/vps-ssh.sh`](../scripts/vps-ssh.sh)
- Setup-script: [`scripts/setup-cursor-agent-ssh.sh`](../scripts/setup-cursor-agent-ssh.sh)
- GitHub Actions-deploy (parallellt): [`VPS-DEPLOY-SETUP.md`](VPS-DEPLOY-SETUP.md)
- Agent-instruktioner: [`AGENTS.md`](../AGENTS.md)
