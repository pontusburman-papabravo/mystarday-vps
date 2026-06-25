# 06 · Kodanalys — buggar, brister & förbättringar

Systematisk genomgång av `src/routes/`, `src/lib/`, `src/middleware/`, `db/` och `test/`. Alla fynd har kodbelägg (`fil:rad`). Prioritet: **Kritisk → Hög → Medel → Låg**. Fynd K1 och dess body-konsumtion är manuellt verifierade i denna session; övriga bygger på riktad genomgång.

> Översta raden: fixa IAP-webhooken (betalstatus synkas inte), gör scheduler-locks korrekta (dubbla utskick), och enhetliggör `revoked_at`-kontrollen (återkallad åtkomst kvarstår).

---

## 🔴 Kritisk

### K1 · IAP-webhooken är dubbelt trasig — betalstatus synkas inte
**Fil:** `src/routes/iap.js:28–63`, `app.js:36–44`, `app.js:96`, `src/middleware/csrf.js:32–75`

Två oberoende fel gör att `POST /api/iap/webhook` inte fungerar:

1. **CSRF blockerar.** `csrfProtect` körs på allt `/api` (`app.js:96`) före `registerRoutes`. `/iap/webhook` finns **inte** i `CSRF_EXEMPT_PATHS`/`PREFIXES`, trots att kommentaren i `iap.js:30` säger "CSRF: exempt". RevenueCat kan inte skicka CSRF-token → **403 `CSRF_MISSING`** innan HMAC-validering.
2. **Bodyn är redan konsumerad.** Global `express.json()` (`app.js:44`) parsar bodyn innan route-nivåns `express.raw()` (`iap.js:32`). HMAC räknas då på fel data (`crypto.createHmac().update(req.body)` får ett objekt, inte en Buffer) och `JSON.parse(req.body)` på ett objekt fastnar.

Resend-webhooken undviker båda genom att monteras **före** `express.json()` (`app.js:36–41`).

**Konsekvens:** `family.subscription_status` uppdateras aldrig via webhook → utgångna/förnyade prenumerationer reflekteras inte.
**Åtgärd:** Montera IAP-webhooken före `express.json()` (samma mönster som Resend) med egen `express.raw()`, eller lägg `/iap/webhook` i CSRF-undantagen **och** flytta body-parsningen. Lägg till ett regressionstest (HMAC + CSRF-path).

### K2 · Scheduler advisory locks ger inget single-instance-skydd
**Filer:** `win-back-scheduler.js:183,253`, `push-reminder-scheduler.js:98–101,153`, `retention-reengagement-scheduler.js:98–100,141`, `activation-program-scheduler.js:115–118`, `activation-program-email-scheduler.js:78`, `custody-handoff-scheduler.js:61`, `nyhet-scheduler.js:30`, `deletion-scheduler.js:28`, `library-notifications.js:33`

`pg_try_advisory_lock` tas via `pool.query()`. Ett advisory lock är **connection-scoped** — nästa `pool.query()` kan landa på en annan connection, så låset skyddar inget. `midnight-scheduler.js:44–57` dokumenterar uttryckligen det rätta mönstret (samma `getClient()` för lock → jobb → unlock).

**Konsekvens:** Vid flera processer/instanser kan dubbla mejl, push och batch-jobb köras parallellt.
**Åtgärd:** Använd `midnight-scheduler.js`/`weekly-summary-scheduler.js`-mönstret i alla schedulers.

### K3 · Fail-open vid lock-fel
**Filer:** `win-back-scheduler.js:183–188`, `push-reminder-scheduler.js:103–105`, `retention-reengagement-scheduler.js:102–104`, `activation-program-scheduler.js:120–122`, `activation-program-email-scheduler.js:84`, `custody-handoff-scheduler.js:65`

Vid DB-fel under lock-försök sätts `lockAcquired = true` och jobbet körs ändå:

```js
} catch (err) {
  console.error('[WIN-BACK] Failed to acquire advisory lock:', err.message);
  lockAcquired = true; // ← kör ändå
}
```

**Åtgärd:** Fail-closed (`return`/skip) vid lock-fel.

---

## 🟠 Hög

### H1 · IDOR: `revoked_at` saknas i många åtkomstkontroller
**Filer:** `schedules/child-crud.js:20–25`, `schedules/child-bulk.js:18–23`, `special-day-schedules.js:33–40`, `onboarding.js:210–214,447–453,824–830`, `children.js:198,684,732,760,785`

`db/parent-access.js:6–8` och `authz.getChildAccess` (`authz.js:44`) filtrerar centralt på `pc.revoked_at IS NULL`. Lokala kopior/inline-queries gör det **inte**.

**Konsekvens:** En återkallad pedagog eller borttagen delad förälder kan fortfarande läsa/ändra schema, onboarding och barninställningar.
**Åtgärd:** Ersätt alla lokala `getChildAccess` med `authz.getChildAccess` / `requireChildAccess`-middleware.

### H2 · Authz-middleware definierad men aldrig monterad
**Fil:** `authz.js:167–241`, `childAccess.js` (hela)

`requireChildAccess`, `requireLogAccess`, `requireItemAccess` används ingenstans i routes. `childAccess.js` är helt oanvänd **och** saknar `revoked_at` (`childAccess.js:23–28`) — farlig om den tas i bruk.

**Åtgärd:** Ta bort `childAccess.js`; migrera routes till `authz`-middleware. Utöka `daily-logs-authz-contract.test.js`-mönstret till schedules/onboarding/children.

### H3 · Race: dubbla `daily_log_item` vid parallell generering
**Fil:** `daily-log-generator.js:59–73,228–231`, `db/baseline-schema.sql:209–224`

`daily_log` har `UNIQUE(child_id, date)` + `ON CONFLICT`, men `daily_log_item` saknar unik constraint på `(daily_log_id, activity_template_id)`. Två samtidiga `getOrGenerateDailyLog` kan båda inserta items.

**Åtgärd:** Transaktion med `SELECT … FOR UPDATE` på log-raden, eller unikt index + `ON CONFLICT DO NOTHING`.

### H4 · UTC-datum i push-scheduler trots Stockholm-tid
**Fil:** `push-reminder-scheduler.js:270,299,403,432` (jfr korrekt `:164`)

Inaktivitetsnudge och backfill använder `new Date().toISOString().slice(0,10)` (UTC) medan jobbet triggas på Stockholm-tid. Fel dag jämfört med `daily_log.date`.
**Åtgärd:** Använd `getLocalDateStr` per familj som i `daily-log-generator.js:325`.

### H5 · `activation-nudge-scheduler` saknar lock + idempotens
**Fil:** `activation-nudge-scheduler.js:23–58`

Skickar mejl och uppdaterar `activation_nudge_sent_at` utan advisory lock → race kan ge dubbla nudge-mejl.
**Åtgärd:** Lägg till lock + idempotent send (`ON CONFLICT` likt `retention_reengagement_push`).

---

## 🟡 Medel

### M1 · Tysta fel i fire-and-forget-kedjor
**Fil:** `daily-logs/items.js:102–103,121–123`, `daily-logs/child-self.js:288–290`, `goals.js:341–343`, `schedules/fill-week.js:136`, `authz.js:307` (`.catch(next)` utan logg)
Tomma `catch` / `.catch(() => {})` sväljer fel. **Åtgärd:** minst `console.error` med kontext.

### M2 · IAP `timingSafeEqual` kan kasta vid olika längd
**Fil:** `iap.js:60` — `crypto.timingSafeEqual` kastar `RangeError` om signaturlängder skiljer sig → 500 i stället för 401. **Åtgärd:** längdkoll först.

### M3 · `requireComponent` fail-open vid DB-fel
**Fil:** `require-component.js:82–85` — paywall kan kringgås vid DB-fel. **Åtgärd:** överväg fail-closed för betalda komponenter (väg mot tillgänglighet).

### M4 · Pool `max: 5` + 13 schedulers + SSE
**Fil:** `db.js:15–24` — risk för pool-utarmning / `connectionTimeoutMillis: 5000` under last. **Åtgärd:** övervaka pool-wait; ev. dedikerad connection för schedulers eller större pool på VPS.

### M5 · Saknat index för dup-kontroller i `notification_log`
**Fil:** `push-reminder-scheduler.js:237–243`, `baseline-schema.sql:544–553` — filtrerar på `parent_id, type, title LIKE, created_at` utan stödjande index. **Åtgärd:** `(parent_id, type, created_at DESC)`.

### M6 · PII i loggar
**Fil:** `children.js:195` (hela `req.body` för view-config), `auth/email.js:149,164` (e-post + parent-id vid forgot-password). **Åtgärd:** reducera/strukturera loggning utan PII.

### M7 · Okänd HTML i kontakt-mejl
**Fil:** `public.js:82` — `${message.trim()}` injiceras i HTML-mejl till admin. **Åtgärd:** escapa HTML eller skicka text-only.

### M8 · In-memory rate limiting
**Fil:** `rateLimiter.js:7–8` — delas inte mellan instanser. **Åtgärd:** Redis store vid multi-instance.

### M9 · JWT i query-string för SSE
**Fil:** `auth.js:150–152` — `?token=` riskerar läckage via Referer/loggar. **Åtgärd:** föredra cookie/header även för SSE.

---

## 🟢 Låg / teknisk skuld

| ID | Fynd | Fil |
|----|------|-----|
| L1 | Stora filer (svåra att underhålla) | `public/js/schedule.js` (~2594 r), `public/js/dashboard.js` (~1459 r) |
| L2 | `AUTHZ_HARDENING_ENABLED=false` kill switch gör middleware no-op (helpers opåverkade) | `authz.js:29,169` |
| L3 | Manuell DST-logik i stället för Luxon | `win-back-scheduler.js:54–102` |
| L4 | `getChildAgeInYears` använder server-local tid | `daily-log-generator.js:25–30` |
| L5 | `req.log` används i error handler men sätts aldrig (ingen pino-http) | `app.js:134` |
| L6 | CSP är report-only (XSS blockas inte av CSP) | `securityHeaders.js:42–43` |
| L7 | `impersonation.js`/`maintenance.js` verifierar JWT bara med primär secret (ej previous) | `impersonation.js:28`, `maintenance.js:52` |
| L8 | Föråldrad kommentar om middleware-ordning | `rateLimiter.js:104–106` |

---

## Datamodell-/admin-fynd (korsref.)

- **Dubbel prenumerationsmodell** (`family.*` vs `family_subscriptions`) — se [02-datamodell.md](02-datamodell.md) §4.
- **Schema-drift** — `surveys/*`, `landing_news`, `admin_uploaded_images`, `pin_notification_log`, `deletion_job` saknar `CREATE` i `migrations/`.
- **Admin-säkerhet** — statisk admin-HTML utan server-gate, impersonation-token i query-param, admin kan skapa admin utan 2FA — se [05-logiskt-schema-admin.md](05-logiskt-schema-admin.md).

---

## ✅ Starka sidor

1. **Parametriserade queries** dominerar — ingen user-input-interpolation i SQL hittades.
2. **Centraliserad authz** (`authz.js`) med `revoked_at` i helpers — bra grund (delvis adopterad).
3. **CSRF double-submit** med `timingSafeEqual`.
4. **Transaktioner** i kritiska flöden: `children.js` create/delete, `onboarding.js`, `standard-library.js`, `activities.js`.
5. **Impersonation write-block** + audit-log.
6. **Barn-JWT deny-by-default** (`child-parent-api-block.js`).
7. **`midnight-scheduler`** korrekt lock-hantering — använd som mall.
8. **Omfattande regressionstester** (~154 testfiler) för refaktoreringar och säkerhet.
9. **Dokumenterade kill switches** och rate-limit-undantag med incidenthistorik.
10. **`createApp()`-mönstret** gör appen testbar utan att binda port/schedulers.

---

## Rekommenderad åtgärdsordning

1. **K1** — verifiera i prod-loggar (`403 CSRF_MISSING` på `/api/iap/webhook`) och fixa webhook (CSRF + body).
2. **K2 + K3** — advisory locks på dedikerad connection + ta bort fail-open i alla schedulers.
3. **H1 + H2** — enhetlig `getChildAccess` med `revoked_at`; ta bort `childAccess.js`.
4. **H3** — race-skydd för `daily_log_item`.
5. **H4 + H5** — timezone-fix i push-scheduler; lock + idempotens i nudge.
6. **M1–M9** — loggning, längdkoll i IAP, index, PII-reducering.
7. **Testtäckning** — IAP-webhook, `revoked_at`-nekning, scheduler-lock/idempotens, parallell daglog-generering.

### Testluckor att fylla
- IAP-webhook (HMAC + CSRF-path)
- `revoked_at`-nekning på schedule/onboarding/children
- Scheduler advisory lock på dedikerad connection + fail-open-beteende
- Parallell `getOrGenerateDailyLog` (race)
- `activation-nudge-scheduler` idempotens
- Onboarding-transaktioner (rollback vid fel)
