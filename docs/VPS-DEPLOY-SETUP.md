# Steg-för-steg: automatisk deploy till prod (Cursor → GitHub → VPS)

Mål: **ingen manuell SSH-deploy** efter merge till `main`.

```
Cursor Cloud Agent → PR → merge main → GitHub Actions → prod
```

Workflow som redan finns i repot: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

**Kanoniska prod-värden** (SSH, path, systemd, URL): `.cursor/rules/*-deploy.mdc` och `AGENTS.md`.

Snabb setup med script (repo-root på Mac):

```bash
chmod +x scripts/setup-github-actions-deploy.sh
./scripts/setup-github-actions-deploy.sh
```

Scriptet läser deploy-värden från deploy-regelfilen automatiskt.

---

## Förutsättningar

| Verktyg | Installera | Kontrollera |
|---------|------------|-------------|
| GitHub CLI | `brew install gh` | `gh auth login` |
| SSH | ingår i macOS | `ssh -V` |
| Åtkomst till VPS | se deploy-regelfilen | `ssh deploy@server-188-66-60-93` |

---

## Del A — Engångs-setup (≈15 min)

### A1. Kör setup-scriptet

```bash
cd ~/path/to/repo   # t.ex. din lokala VPS-klon
./scripts/setup-github-actions-deploy.sh
```

Scriptet:

1. Läser prod-värden från `.cursor/rules/*-deploy.mdc`
2. Skapar en **deploy-nyckel** i `~/.ssh/` om den inte finns
3. Visar exakt vad du ska klistra in på VPS
4. Sätter **GitHub environment `vps`** (secrets + variables) via `gh`
5. Erbjuder att trigga en test-deploy

**Alternativ — bara kontrollera senare:**

```bash
./scripts/setup-github-actions-deploy.sh check
./scripts/setup-github-actions-deploy.sh trigger   # manuell test-deploy
./scripts/setup-github-actions-deploy.sh vps-key   # visa publik nyckel igen
```

### A2. Lägg deploy-nyckel på VPS

Scriptet skriver ut den publika nyckeln och exakta kommandon. Kortversion:

```bash
# På VPS som deploy-användaren:
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo '<publik nyckel från scriptet>' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### A3. Sudo utan lösenord för restart

Scriptet skriver ut exakt sudoers-rad för din `systemd`-service (från deploy-regelfilen).

Testa efteråt:

```bash
./scripts/setup-github-actions-deploy.sh check
```

### A4. GitHub environment `vps`

Om du inte körde hela scriptet — sätt manuellt under **GitHub → Settings → Environments → vps**:

| Typ | Namn | Värde |
|-----|------|-------|
| Secret | `VPS_SSH_KEY` | Hela privata deploy-nyckeln |
| Variable | `VPS_HOST` | från deploy-regelfilen |
| Variable | `VPS_USER` | `deploy` |
| Variable | `VPS_APP_PATH` | från deploy-regelfilen |
| Variable | `VPS_RESTART_CMD` | `sudo systemctl restart <service>` |
| Variable | `VPS_HEALTH_URL` | `http://127.0.0.1:3000/health` |

Eller via CLI:

```bash
./scripts/setup-github-actions-deploy.sh github
```

### A5. Verifiera första deploy

```bash
./scripts/setup-github-actions-deploy.sh trigger
gh run watch $(gh run list --workflow=deploy.yml --limit 1 --json databaseId -q '.[0].databaseId')
```

Grönt jobb = prod uppdaterad. Dubbelkolla publik health-URL (från deploy-regelfilen + `/health`).

---

## Del B — Dagligt flöde med Cursor

### B1. Cursor gör jobbet

1. Starta **Cloud Agent** (eller Automation) på en uppgift
2. Agenten skapar branch `cursor/...` och öppnar PR
3. CI körs på PR (när CI är grön)

### B2. Du mergar (eller automatisera merge)

**Minimalt manuellt:** granska PR → **Merge** till `main`.

**Deploy sker automatiskt** inom ~1–2 min efter push till `main`.

### B3. Bekräfta deploy

- GitHub → **Actions** → "Deploy to VPS"
- Eller: `gh run list --workflow=deploy.yml --limit 5`

---

## Del C — Valfritt: slipp manuell merge också

Cursor deployar inte själv — men du kan automatisera **merge till main**:

### C1. GitHub auto-merge

1. **Settings → General** → aktivera **Allow auto-merge**
2. **Settings → Branches** → skydda `main`:
   - Require pull request before merging
   - Require status checks (CI)
3. På varje PR: **Enable auto-merge** (squash eller merge enligt smak)

### C2. Cursor Approval Agent (Team)

1. [cursor.com/automations](https://cursor.com/automations) → ny automation
2. Trigger: **Pull request opened** (eller **CI completed**)
3. Verktyg: **Comment on pull request** med godkännande när CI är grön

**Viktigt:** PR skapad av samma bot kan inte godkännas av samma bot. Koppla **ditt personliga GitHub-konto** till Cursor så PR:er skapas i ditt namn; approval körs som `cursor[bot]`.

### C3. Cursor Merge Queue (Team/Enterprise)

Aktivera **Merge when ready** eller label **Merge Queue** — PR:er landar på `main` när checks passerar.

---

## Felsökning

| Symptom | Åtgärd |
|---------|--------|
| Actions failar direkt "VPS_APP_PATH not set" | Kör `./scripts/setup-github-actions-deploy.sh github` |
| SSH permission denied | Kontrollera `authorized_keys` på VPS (A2) |
| `sudo: a password is required` | Fixa sudoers (A3) |
| Health check timeout | `ssh deploy@...` → `sudo journalctl -u <service> -f` |
| Deploy körs inte efter Cursor-PR | Har du **mergat till main**? Deploy triggas bara på `main` |
| CI blockerar merge | Se CI-notis i PR; ev. `--legacy-peer-deps` i CI (känd fråga) |

Manuell fallback (samma som Actions gör) — värden från deploy-regelfilen:

```bash
ssh deploy@server-188-66-60-93
cd /var/www/<app>    # se *-deploy.mdc
git fetch origin main && git reset --hard origin/main
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 20
npm install --legacy-peer-deps && npm run migrate
sudo systemctl restart <service>
sleep 3 && curl -s http://127.0.0.1:3000/health
```

---

## Referens

- Workflow: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)
- Setup-script: [`scripts/setup-github-actions-deploy.sh`](../scripts/setup-github-actions-deploy.sh)
- Kort översikt: [`VPS-DEPLOY-GITHUB-ACTIONS.md`](VPS-DEPLOY-GITHUB-ACTIONS.md)
- Prod-ops: `.cursor/rules/*-deploy.mdc`
