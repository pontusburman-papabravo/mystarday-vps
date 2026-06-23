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
./scripts/vps-ssh.sh 'curl -fsS http://127.0.0.1:3000/health'
./scripts/vps-ssh.sh 'systemctl status <service> --no-pager -n 5'
./scripts/vps-ssh.sh 'sudo journalctl -u <service> -n 20 --no-pager'
```

Interaktiv shell:

```bash
./scripts/vps-ssh.sh
```

---

## Kommandon agenten använder

Ersätt `<app>` / `<service>` med värden från `*-deploy.mdc` (kolumnen **systemd**).

| Syfte | Kommando | Sudo? |
|-------|----------|-------|
| Verifiera SSH + path + tjänst | `./scripts/vps-ssh.sh check` | Nej |
| Vilken commit körs? | `git log -1 --oneline` i app-sökvägen | Nej |
| Health | `curl -fsS http://127.0.0.1:3000/health` | Nej |
| Tjänstestatus | `systemctl status <service> --no-pager` | **Nej** — kör utan `sudo` |
| Är tjänsten aktiv? | `systemctl is-active <service>` | **Nej** — kör utan `sudo` |
| Läsa loggar | `sudo journalctl -u <service> -n 50 --no-pager` | Ja (NOPASSWD) |
| Starta om appen | `sudo systemctl restart <service>` | Ja (NOPASSWD) |

`vps-ssh.sh` kör SSH med `BatchMode=yes` — agenten kan **inte** skriva in sudo-lösenord interaktivt. Kommandon som kräver lösenord misslyckas med `sudo: a password is required`.

**Vanlig felsökning:** `sudo systemctl status` kräver ofta lösenord, men samma kommando **utan** `sudo` fungerar för `deploy` — använd alltid det.

### Rekommenderad sudoers (minimal)

På VPS som root (`visudo -f /etc/sudoers.d/deploy-<service>`):

```
deploy ALL=(ALL) NOPASSWD: /bin/systemctl restart <service>
deploy ALL=(ALL) NOPASSWD: /usr/bin/journalctl
```

Mer om restart-sudoers: [`VPS-DEPLOY-SETUP.md`](VPS-DEPLOY-SETUP.md) steg A3.

### Manuell deploy (undantag)

Standard-deploy sker via merge till `main` → GitHub Actions. Vid manuell deploy (Actions nere) räcker samma steg som workflow — allt utom restart körs som `deploy` utan sudo:

```bash
cd /var/www/<app>
git fetch origin main && git reset --hard origin/main
npm ci --legacy-peer-deps || npm install --legacy-peer-deps
npm run migrate
sudo systemctl restart <service>
sleep 3 && curl -fsS http://127.0.0.1:3000/health
```

### Sällan / undvik

| Scenario | Kommentar |
|----------|-----------|
| `npm test` på prod | **Undvik** — kan skicka mail (se `AGENTS.md`) |
| `journalctl -f` (live följ) | Fungerar dåligt i batch-SSH även med sudo |
| Apache, `ss`, systemd-unitfiler | Root/infrastruktur — inte agent-uppgift |

---

## Vad agenten får / inte får göra

| OK | Undvik |
|----|--------|
| Läsa loggar, health, `git log`, `systemctl status` (utan sudo) | `npm test` mot prod (kan skicka mail) |
| Manuell deploy enligt samma steg som Actions | Radera data utan explicit uppdrag |
| `sudo systemctl restart` + `sudo journalctl` om sudoers finns | Lägga privat nyckel i repo eller chat |

**Standard-deploy** sker fortfarande via merge till `main` → GitHub Actions. Direkt SSH är för felsökning och undantag.

---

## Felsökning

| Symptom | Åtgärd |
|---------|--------|
| `VPS_SSH_KEY is not set` | Secrets saknas eller fel environment — kör `secrets`-kommandot igen |
| `Permission denied (publickey)` | Publik nyckel inte i `authorized_keys`, eller fel privat nyckel i secret |
| Timeout / connection refused | Network allowlist i Cursor; brandvägg på VPS |
| `sudo: a password is required` | Sudoers saknas — lägg till NOPASSWD för `systemctl restart` och `journalctl` (se ovan) |
| `sudo systemctl status` kräver lösenord | Kör `systemctl status` **utan** `sudo` istället |

---

## Referens

- Agent-helper: [`scripts/vps-ssh.sh`](../scripts/vps-ssh.sh)
- Setup-script: [`scripts/setup-cursor-agent-ssh.sh`](../scripts/setup-cursor-agent-ssh.sh)
- GitHub Actions-deploy (parallellt): [`VPS-DEPLOY-SETUP.md`](VPS-DEPLOY-SETUP.md)
- Agent-instruktioner: [`AGENTS.md`](../AGENTS.md)
