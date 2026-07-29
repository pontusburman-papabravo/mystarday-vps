# Code review P0 — RevenueCat-webhook och deterministisk deploy

> Status: P0 stängt i kod. Merge PR #781 före stagingtest.

Detta dokument beskriver P0-åtgärderna: säker RevenueCat-webhook, deterministisk deploy, orphan-spårbarhet och reconciliation.

---

## 1. RevenueCat-webhook

### Vad som var fel

| Problem | Risk |
|---------|------|
| `app_user_id` lästes från `event.data.attributes` (fel struktur) | Fel användare eller ingen uppdatering |
| Auth via `Bearer nyckel:base64_hmac(body)` | Ogiltig enligt RevenueCat — webhooks kunde avvisas eller accepteras fel |
| `200` vid DB-fel och saknad identitet | Tysta fel, RevenueCat retryade inte |
| `CANCELLATION` → `cancelled` direkt | Åtkomst togs bort före periodslut |
| Ingen idempotens på `event.id` | Dubbla events kunde dubbeluppdatera |

### Korrekt payload (RevenueCat)

Fält läses från `payload.event`:

- `id` — idempotensnyckel
- `type` — t.ex. `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`
- `app_user_id` — family UUID (samma som `Purchases.login(familyId)`)
- `original_app_user_id`, `aliases` — fallback vid identitetsupplösning
- `expiration_at_ms` — avgör om avslut fortfarande har aktiv period

### Autentisering

**Metod 1 — statisk Authorization (rekommenderad standard)**

1. Sätt samma sträng i RevenueCat Dashboard → Webhooks → Authorization header.
2. Sätt `REVENUECAT_WEBHOOK_SECRET` i VPS `.env` till **exakt samma värde**.
3. Servern jämför hela `Authorization`-headern med konstant-tids jämförelse.

**Metod 2 — HMAC (valfritt)**

Om HMAC är aktiverat i RevenueCat:

- Header: `X-RevenueCat-Webhook-Signature: t=<unix>,v1=<hex>`
- Sätt `REVENUECAT_WEBHOOK_SIGNING_SECRET` i `.env`
- Verifiering över `{timestamp}.{raw_body}` (rå bytes före JSON-parse)

### HTTP-svar

| Situation | Status |
|-----------|--------|
| Ogiltig/saknad auth | `401` |
| Ogiltig JSON / saknat event / saknad identitet | `400` |
| Familj hittas inte | `200` med `{ skipped: "family_not_found" }` — RevenueCat retryar alla icke-200 |
| Tillfälligt DB-fel | `503` (RevenueCat retryar) |
| Lyckad bearbetning eller duplicerat event | `200` |

### Prenumerationssemantik

| Event | `subscription_status` |
|-------|----------------------|
| `INITIAL_PURCHASE`, `RENEWAL`, `UNCANCELLATION`, `PRODUCT_CHANGE`, … | `active` |
| `CANCELLATION` med `expiration_at_ms` i framtiden | `active` (behåller åtkomst) |
| `EXPIRATION` | `expired` |
| `BILLING_ISSUE` | `grace_period` |

`hasActiveSubscription()` i `src/lib/subscription.js` behandlar `active` och `grace_period` som aktiv åtkomst.

### Idempotens

Migration `1810000000012_iap_webhook_log.js` skapar tabellen `iap_webhook_log`:

```sql
revenuecat_event_id TEXT PRIMARY KEY
event_type          VARCHAR(64)
family_id           UUID
processed_at        TIMESTAMPTZ
```

Samma `event.id` andra gången → `200` med `{ duplicate: true }`, ingen ny statusändring.

### Filer

- `src/lib/revenuecat-webhook-verify.js`
- `src/lib/revenuecat-webhook-process.js`
- `src/routes/iap-webhook-handler.js`
- `test/iap-webhook.test.js`

### Manuell verifiering (produktion)

1. `npm run migrate` på VPS
2. Kontrollera `REVENUECAT_WEBHOOK_SECRET` mot RevenueCat Dashboard
3. Skicka TEST-event från RevenueCat → förvänta `200`
4. `SELECT * FROM iap_webhook_log ORDER BY processed_at DESC LIMIT 5;`
5. Testa CANCELLATION med framtida `expiration_at_ms` → familj ska fortfarande ha `active`

---

## 2. Deterministisk deploy

### Vad som var fel

Deploy-workflow gjorde:

```bash
git fetch origin main
git reset --hard origin/main
```

Det deployade **senaste** `main`, inte nödvändigtvis commiten som passerade CI.

### Nytt beteende

1. Triggas efter grön CI på `main` (`workflow_run`) eller manuellt (`workflow_dispatch` med `deploy_sha`).
2. Använder `github.event.workflow_run.head_sha` som `DEPLOY_SHA`.
3. Validerar 40-teckens SHA och att källgrenen är `main`.
4. På VPS: `scripts/vps-deploy-revision.sh`
   - Sparar tidigare SHA
   - `git fetch` + `checkout --detach` exakt mål-SHA
   - Verifierar `git rev-parse HEAD`
   - `npm ci --legacy-peer-deps` (ingen `npm install`-fallback)
   - `npm run migrate`
   - Restart via `VPS_RESTART_CMD` eller `VPS_SERVICE`
   - Health check
5. Vid fel: rollback till tidigare SHA, `npm ci`, restart, health check igen.
6. Concurrency: `vps-deploy` (serialiserade deploys).

### GitHub-variabler (environment `vps`)

| Variabel | Syfte |
|----------|--------|
| `VPS_APP_PATH` | App-katalog på servern |
| `VPS_RESTART_CMD` | Valfri anpassad restart |
| `VPS_SERVICE` | systemd-tjänst om `VPS_RESTART_CMD` saknas |
| `VPS_HEALTH_URL` | Standard `http://127.0.0.1:3000/health` |

### Manuell deploy av specifik SHA

GitHub Actions → Deploy to VPS → Run workflow → ange 40-teckens commit-SHA.

### Verifiering efter deploy

```bash
cd "$VPS_APP_PATH"
git rev-parse HEAD   # ska matcha CI-SHA
curl -fsS http://127.0.0.1:3000/health | jq .git_sha   # ska matcha deployad SHA
```

### Rollback

- Automatisk vid misslyckad deploy (skriptet)
- Manuell: workflow_dispatch med tidigare känd bra SHA, eller `git revert` på `main` och ny CI-deploy

Deploy-loggen skriver en sammanfattningsrad:

```
DEPLOY_SUMMARY status=... requested_sha=... previous_sha=... deployed_sha=... health_check_result=... rollback_sha=...
```

---

## 3. Orphan-events och reconciliation

Okänd familj returnerar `200` med `skipped: family_not_found` och loggar **WARN** med:

- `app_user_id`, `original_app_user_id`, `event`, `type`, `product_id`, `expiration_at_ms`, `skip_reason`

Samma fält sparas i `iap_webhook_log` (migration `1810000000013`).

**Manuell reconciliation** (återspelar inte webhook):

```bash
npm run reconcile:revenuecat -- <family-uuid>
npm run reconcile:revenuecat -- --dry-run <family-uuid>   # read-only, ingen DB-skrivning
```

Hämtar `GET /v1/subscribers/{app_user_id}` från RevenueCat och uppdaterar `family.subscription_status`.
Kräver `REVENUECAT_SECRET_API_KEY` (server `sk_…`-nyckel). Nyckeln loggas aldrig.

---

## 4. Webhook-auth-läge

`REVENUECAT_WEBHOOK_AUTH_MODE`:

| Värde | Beteende |
|-------|----------|
| `static` | Endast Authorization-header |
| `hmac` | Endast `X-RevenueCat-Webhook-Signature` |
| `both` | Kräver **båda** — ingen downgrade om HMAC misslyckas men static lyckas |

**Viktigt:** Sätt `REVENUECAT_WEBHOOK_AUTH_MODE` **explicit** i `.env` — förlita er inte på autodetekterad standard.

Om ni sätter `both` måste RevenueCat skicka **både** Authorization-headern **och** `X-RevenueCat-Webhook-Signature` i staging. Annars får korrekt konfigurerade anrop avsiktligt `401`. Om RevenueCat bara skickar static header, använd `static`.

Standard när osett: `both` om båda secrets finns, annars den konfigurerade metoden.

---

## 5. Godkännandekriterier staging

| Scenario | HTTP | DB |
|----------|------|-----|
| Initialt köp | 200 `processed` | `active` |
| Förnyelse | 200 `processed` | `active` |
| Uppsägning | 200 `processed` | `active` till utgång |
| Återaktivering | 200 `processed` | `active` |
| Utgång | 200 `processed` | `expired` |
| Samma event ×3 | 200 ×3 (`duplicate` efter första) | 1 loggrad, 1 statusändring |
| Felaktig auth | 401 | ingen loggrad / ingen statusändring |
| Tillfälligt DB-fel | 503 | RevenueCat kan leverera igen |
| Okänd familj | 200 `skipped: family_not_found` | orphan-logg med felsökningsfält |

### Go till staging (efter merge av PR #781)

- [ ] PR #781 mergad
- [ ] Migration `1810000000013` körd och verifierad (`\d iap_webhook_log` visar audit-kolumner)
- [ ] `REVENUECAT_WEBHOOK_AUTH_MODE` explicit satt (matchar vad RevenueCat faktiskt skickar)
- [ ] `curl /health` visar `git_sha` som matchar deployad revision
- [ ] `npm run reconcile:revenuecat -- --dry-run <family-uuid>` fungerar mot känd testfamilj
- [ ] `REVENUECAT_SECRET_API_KEY` finns i `.env` men skrivs **aldrig** i logg eller deploy-output

### Go till produktion

Alla staging-kriterier ovan, plus:

- [ ] Samtliga åtta staging-scenarier gröna (tabell ovan)
- [ ] `CANCELLATION` behåller åtkomst till framtida `expiration_at_ms`
- [ ] `EXPIRATION` tar bort åtkomst
- [ ] Trippelleverans → en enda behandling
- [ ] Felaktig auth → `401` utan DB-rad
- [ ] Simulerat DB-fel → `5xx`, lyckas vid nästa leverans
- [ ] Orphan-event kan identifieras (SQL ovan) och reconcileras (`reconcile:revenuecat`)
- [ ] `DEPLOY_SUMMARY` visar samma `requested_sha` och `deployed_sha`
- [ ] Rollback verifierad i kontrollerat stagingtest

**Nästa prioritet efter produktion:** rewards-concurrency som separat P1-PR — utan engelska, UI eller ytterligare RevenueCat-förändringar.

---

## 6. Tester

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false \
  env -u RESEND_API_KEY -u RESEND_API_KEY_WEEKLY \
  node --test test/iap-webhook.test.js test/deploy-revision.test.js test/revenuecat-ops.test.js test/paywall-model-contract.test.js
```

Förväntat: alla gröna.
