# 06 · Kodanalys — buggar, brister & förbättringar

Systematisk genomgång av `src/routes/`, `src/lib/`, `src/middleware/`, `db/` och `test/`. Alla fynd har kodbelägg (`fil:rad`), verifierade mot koden 2026-07-02. Detta är **den enda källan** för kodreview-fynd — tidigare K/H/M/L-listor och den separata N1–N11-listan är sammanslagna här. Prioritet: **Kritisk → Hög → Medel → Låg**.

Varje fynd presenteras som en tabell med fälten `Prioritet | Status | Filer | Problem | Konsekvens | Föreslagen åtgärd | Kodskiss | Tester | PR | Beroenden` — lagd **vertikalt** (fält som rader) i stället för horisontellt, eftersom numrerade åtgärdssteg och kodskisser inte går att läsa i en 10-kolumners tabell. Innehållet är identiskt med det begärda formatet.

> **Slutstatus 2026-07-02 (senast Fas 8 F3e–g, prod `638ab61`):** Alla prioriterade fynd **K1–M8** fixade eller dokumenterade. Backlog **N12, H2†, L1–L8** stängd. Medvetna uppföljningar (ej öppna buggar): **M4/M8** drift/skalning, **L2** kill switch efter 90 dagar, **L6** CSP enforcing efter 30 dagar. Se [Slutstatus & backlog](#slutstatus--backlog).

---

## Statustabell

| ID | Titel | Prioritet | PR | Status |
|----|-------|-----------|----|--------|
| K1 | IAP-webhook dubbelt trasig | 🔴 Kritisk | PR-A | ✅ Fixad |
| N1 | IDOR family-images `/uploads/`-allowlist | 🔴 Kritisk | PR-A | ✅ Fixad |
| N2 | Cross-family skriv i pedagog-day-comments | 🔴 Kritisk | PR-A | ✅ Fixad |
| H1/N4 | `revoked_at` saknas — 12 ställen | 🟠 Hög | PR-B | ✅ Fixad |
| H2 | Authz-middleware aldrig monterad | 🟠 Hög | PR-B | ✅ Fixad |
| N3 | Race: dubbel stjärna vid parallell completion | 🟠 Hög | PR-C | ✅ Fixad |
| H3 | Race: dubbla `daily_log_item` vid generering | 🟠 Hög | PR-C | ✅ Fixad |
| H4 | UTC-datum i push-scheduler | 🟠 Hög | PR-C | ✅ Fixad |
| K2 | Scheduler advisory locks utan single-instance-skydd | 🔴 Kritisk | PR-D | ✅ Fixad |
| K3 | Fail-open vid lock-fel | 🔴 Kritisk | PR-D | ✅ Fixad |
| H5 | `activation-nudge-scheduler` saknar lock | 🟠 Hög | PR-D | ✅ Fixad |
| N6 | Fler schedulers utan lock (journey-push, child-handoff) | 🟠 Hög | PR-D | ✅ Fixad |
| N5/L7/M9 | JWT-rotation saknas + JWT i query-string | 🟠 Hög | PR-E | ✅ Fixad |
| N7 | Spoofbar win-back-attribution | 🟡 Medel | PR-E | ✅ Fixad |
| N8 | `activation-flags` fail-hard vid DB-fel | 🟡 Medel | PR-E | ✅ Fixad |
| N9 | `markSent` utan statusvakt | 🟡 Medel | PR-E | ✅ Fixad |
| N10 | TOCTOU i admin family-components | 🟡 Medel | PR-E | ✅ Fixad |
| N11/M6 | PII i loggar | 🟡 Medel | PR-E | ✅ Fixad |
| M1 | Tysta fel i fire-and-forget-kedjor | 🟡 Medel | PR-E | ✅ Fixad |
| M2 | IAP `timingSafeEqual` kan kasta | 🟡 Medel | PR-E | ✅ Fixad |
| M3 | `requireComponent` fail-open vid DB-fel | 🟡 Medel | PR-E | ✅ Fixad |
| M4 | Pool `max: 5` + 13 schedulers + SSE | 🟡 Medel | PR-E | ✅ Dokumenterad |
| M5 | Saknat index i `notification_log` | 🟡 Medel | PR-E | ✅ Fixad |
| M7 | Oescapad HTML i kontakt-mejl | 🟡 Medel | PR-E | ✅ Fixad |
| M8 | In-memory rate limiting | 🟡 Medel | PR-E | ✅ Dokumenterad |
| L1–L8 | Teknisk skuld (se tabell) | 🟢 Låg | Backlog | ✅ L1–L8 klara |
| N12 | PII i loggar — utökad scope | 🟢 Låg | Backlog | ✅ Fixad |
| H2† | `requireLogAccess` / `requireItemAccess` montering | 🟢 Låg | Backlog | ✅ Fixad |

### Prod-deploy

| PR | Commit (ca.) | Status |
|----|--------------|--------|
| **PR-A** | `45d86f0` | ✅ Deployad prod 2026-07-02 |
| **PR-B** | `45d86f0` | ✅ Deployad prod 2026-07-02 |
| **PR-C** | `45d86f0` + manuell H3-dedup | ✅ Deployad prod 2026-07-02 (714 dubbletter städade + `daily_log_item_unique_activity_idx`) |
| **PR-D** | `45d86f0` | ✅ Deployad prod 2026-07-02 |
| **PR-E** | `8e0908a` | ✅ Deployad prod 2026-07-02 (inkl. `notification_log_dup_check_idx`) |

Verifiering prod: `git log -1` → `8e0908a`, `curl http://127.0.0.1:3000/health` → healthy.

---

## 🔴 Kritisk

### K1 · IAP-webhooken är dubbelt trasig — betalstatus synkas inte

| Fält | Innehåll |
|---|---|
| **Prioritet** | 🔴 Kritisk |
| **Status** | ✅ Fixad |
| **Filer** | `src/routes/iap.js:28–63`, `app.js:36–44`, `app.js:96`, `src/middleware/csrf.js:32–68` |
| **Problem** | Två oberoende fel: (1) `csrfProtect` körs på allt `/api` (`app.js:96`) före `registerRoutes` (`app.js:112`). `/iap/webhook` finns **inte** i `CSRF_EXEMPT_PATHS`/`PREFIXES` (`csrf.js:32–68`), trots att kommentaren i `iap.js:30` säger "CSRF: exempt" → RevenueCat får **403 `CSRF_MISSING`** eftersom den inte skickar CSRF-token. (2) Global `express.json()` (`app.js:44`) parsar bodyn på alla requests innan route-nivåns `express.raw()` (`iap.js:32`) hinner läsa strömmen → `crypto.createHmac().update(req.body)` (`iap.js:57`) får ett redan uttolkat objekt i stället för en Buffer, och `JSON.parse(req.body)` (`iap.js:68`) på ett objekt ger fel resultat. Resend-webhooken undviker båda genom att monteras **före** `express.json()` (`app.js:36–41`). |
| **Konsekvens** | `family.subscription_status` uppdateras aldrig via webhook → utgångna/förnyade/avbrutna prenumerationer reflekteras inte i appen. |
| **Föreslagen åtgärd** | 1. Flytta webhook-mountningen i `app.js` till samma plats som Resend-webhooken (rad 34–42), **före** `app.use(express.json())` (rad 44).<br>2. Montera med egen `express.raw({ type: 'application/json' })` på den flyttade routen; ta bort dubbel-mountningen i `iap.js:32`.<br>3. Kontrollera att `/iap/webhook` inte behöver läggas i CSRF-undantagen (onödigt när routen mountas före CSRF-middleware).<br>4. Lägg till regressionstest som postar en giltig HMAC-signerad raw body utan CSRF-cookie/header och förväntar `200`. |
| **Kodskiss** | <pre>// app.js — bredvid Resend-webhook-blocket, FÖRE express.json()<br>const { handleWebhook } = require('./src/routes/iap-webhook-handler');<br>app.post(<br>  '/api/iap/webhook',<br>  iapWebhookLimiter,<br>  express.raw({ type: 'application/json' }),<br>  handleWebhook<br>);</pre> |
| **Tester** | `test/iap-webhook.test.js` (nytt/utökat) — HMAC giltig/ogiltig, CSRF-frånvaro, `JSON.parse` på riktig Buffer. |
| **PR** | PR-A |
| **Beroenden** | inga |

---

### N1 · IDOR: öppen allowlist i family-images `/uploads/`-proxy

| Fält | Innehåll |
|---|---|
| **Prioritet** | 🔴 Kritisk |
| **Status** | ✅ Fixad |
| **Filer** | `src/routes/family-images.js:51–54`, `src/routes/family-images.js:125–135` |
| **Problem** | `GET /api/family/images/source?url=…` (rad 125) proxar bildbytes åt inloggad förälder. `isImageUrlAllowedForFamily` (rad 35–57) kollar först `family_image`/`activity_template` för familjens `family_id` — korrekt — men rad 51–52 lägger till ett globalt undantag: **alla** URL:er som börjar med `/uploads/` godkänns oavsett ägande familj (`if (imageUrl.startsWith('/uploads/')) return true;`). `resolveLocalUploadPath` (rad 59–73) skyddar bara mot path traversal, inte mot vilken familjs fil som helst — en inloggad förälder kan ange en annan familjs bild-URL och få tillbaka bytes de inte äger. |
| **Konsekvens** | Cross-family-läckage av uppladdade bilder (kan innehålla foton av barn/hem) — bryter familjeisoleringen som annars är konsekvent i kodbasen. |
| **Föreslagen åtgärd** | 1. Ta bort den okvalificerade `/uploads/`-genvägen (rad 51–54) helt.<br>2. Om nyss uppladdade bilder (under beskärning, innan de finns i `family_image`/`activity_template`) behöver stödjas: lägg till en kortlivad `pending_upload`-koll scopead till `req.user.familyId`, eller en signerad token från uploads-endpointen som `/source` verifierar.<br>3. Annars: låt de två befintliga DB-kollarna (`family_image`, `activity_template`) vara den enda vägen in.<br>4. Regressionstest: familj A postar aktivitet med `/uploads/`-bild, familj B anropar `/source?url=` med samma path → förvänta `403`. |
| **Kodskiss** | <pre>async function isImageUrlAllowedForFamily(familyId, imageUrl) {<br>  const normalized = normalizeImageUrl(imageUrl);<br>  if (!normalized) return false;<br>  const inArchive = await db.query(<br>    'SELECT 1 FROM family_image WHERE family_id = $1 AND image_url = $2 LIMIT 1',<br>    [familyId, imageUrl]<br>  );<br>  if (inArchive.rows.length > 0) return true;<br>  const onActivity = await db.query(<br>    'SELECT 1 FROM activity_template WHERE family_id = $1 AND image_url = $2 LIMIT 1',<br>    [familyId, imageUrl]<br>  );<br>  return onActivity.rows.length > 0; // ingen global /uploads/-genväg<br>}</pre> |
| **Tester** | Nytt `test/family-images-authz.test.js` — cross-family `/source`-access → 403. |
| **PR** | PR-A |
| **Beroenden** | inga |

---

### N2 · Cross-family skriv: pedagog-day-comments saknar family-check på POST

| Fält | Innehåll |
|---|---|
| **Prioritet** | 🔴 Kritisk |
| **Status** | ✅ Fixad |
| **Filer** | `src/routes/pedagog-day-comments.js:33–47` |
| **Problem** | `GET /` (rad 13–31) joinar korrekt mot `child`/`family_id` (rad 22–24). `POST /` (rad 33–47) gör ingen motsvarande koll — läser `childId` direkt från `req.body` och infogar/uppdaterar en kommentar mot vilket `child_id` som helst, oavsett familjetillhörighet. `requireComponent('pedagog')` (rad 33) kollar bara att familjen har pedagog-komponenten, inte att `childId` tillhör den familjen. |
| **Konsekvens** | En pedagog-förälder i familj A kan skriva/uppdatera dagskommentarer för ett barn i familj B genom att känna till dess `child_id` — cross-family dataintrång i en känslig funktion (observationer om barn). |
| **Föreslagen åtgärd** | 1. Lägg till ägarskapskontroll (samma som `GET /`) innan `INSERT`: verifiera att `childId` finns i `child` med `family_id = req.user.familyId`.<br>2. Returnera `403` vid misslyckad kontroll.<br>3. Dubbelkolla att `GET /samarbete/notes` redan filtrerar korrekt (verifierat OK, rad 67).<br>4. Regressionstest: förälder i familj A POST:ar med `childId` från familj B → 403, ingen rad skapad. |
| **Kodskiss** | <pre>router.post('/', requireComponent('pedagog'), async (req, res) => {<br>  const { childId, date, content } = req.body;<br>  if (!childId || !date || !content?.trim()) {<br>    return res.status(400).json({ error: 'childId, date och content krävs' });<br>  }<br>  const owns = await db.query(<br>    'SELECT 1 FROM child WHERE id = $1 AND family_id = $2',<br>    [childId, req.user.familyId]<br>  );<br>  if (owns.rows.length === 0) {<br>    return res.status(403).json({ error: 'Du har inte åtkomst till detta barn' });<br>  }<br>  // … befintlig INSERT …</pre> |
| **Tester** | Nytt `test/pedagog-day-comments-authz.test.js`. |
| **PR** | PR-A |
| **Beroenden** | inga |

---

### K2 · Scheduler advisory locks ger inget single-instance-skydd

| Fält | Innehåll |
|---|---|
| **Prioritet** | 🔴 Kritisk |
| **Status** | ✅ Fixad |
| **Filer** | `src/lib/scheduler-lock.js`, `scheduler-constants.js` (lock IDs 1004–1016), `win-back-scheduler.js`, `push-reminder-scheduler.js`, `retention-reengagement-scheduler.js`, `activation-program-scheduler.js`, `activation-program-email-scheduler.js`, `custody-handoff-scheduler.js`, `nyhet-scheduler.js`, `deletion-scheduler.js`, `library-notifications.js`, `activation-nudge-scheduler.js`, `journey-push-scheduler.js`, `child-handoff-reminder-scheduler.js` |
| **Problem** | `pg_try_advisory_lock` tas via `pool.query()` (t.ex. `push-reminder-scheduler.js:99`). Ett advisory lock är **connection-scoped** i Postgres — nästa `pool.query()` kan landa på en annan connection ur poolen, så låset skyddar inget mellan tick/requests. `midnight-scheduler.js:44–57`/`weekly-summary-scheduler.js` visar rätt mönster: samma `getClient()`-connection för lock → jobb → unlock → `release()`. |
| **Konsekvens** | Vid flera Node-processer/instanser kan dubbla mejl, push-notiser och batch-jobb köras parallellt i samtliga listade schedulers. |
| **Föreslagen åtgärd** | 1. Skapa delad hjälpfunktion `withAdvisoryLock(lockId, fn)` i `src/lib/scheduler-lock.js` (tar `getClient()`, lock, kör `fn`, unlock+`release()` i `finally`).<br>2. Migrera varje listad scheduler till `withAdvisoryLock` i stället för egen `pool.query`-baserad lock-logik.<br>3. Ta bort dubblettkoden för lock-tagning i varje fil när migrerad.<br>4. Verifiera mot `midnight-scheduler.js` som referens (inga beteendeförändringar där). |
| **Kodskiss** | <pre>// src/lib/scheduler-lock.js<br>async function withAdvisoryLock(lockId, fn) {<br>  const client = await db.getClient();<br>  try {<br>    const { rows } = await client.query(<br>      'SELECT pg_try_advisory_lock($1) AS acquired', [lockId]);<br>    if (!rows[0].acquired) return { skipped: 'lock' };<br>    return await fn(client);<br>  } finally {<br>    await client.query('SELECT pg_advisory_unlock($1)', [lockId]).catch(() => {});<br>    client.release();<br>  }<br>}<br>module.exports = { withAdvisoryLock };</pre> |
| **Tester** | Nytt `test/scheduler-lock.test.js` — två parallella anrop till samma `withAdvisoryLock(lockId, …)`, förvänta att bara ett kör `fn`. |
| **PR** | PR-D |
| **Beroenden** | inga |

---

### K3 · Fail-open vid lock-fel

| Fält | Innehåll |
|---|---|
| **Prioritet** | 🔴 Kritisk |
| **Status** | ✅ Fixad |
| **Filer** | `src/lib/scheduler-lock.js` (fail-closed `{ skipped: 'error' }`); alla migrerade schedulers ovan — inga `lockAcquired = true` i catch |
| **Problem** | Vid DB-fel under lock-försök sätts `lockAcquired = true` och jobbet körs ändå (`catch (err) { …; lockAcquired = true; }`). |
| **Konsekvens** | En DB-blipp stänger av dubbelkörningsskyddet just när databasen är instabil — sämsta tänkbara tidpunkt för dubbla mejl/push. |
| **Föreslagen åtgärd** | 1. Lös samtidigt med K2: `withAdvisoryLock` fail-closed by design — fel vid `getClient()`/lock-query propageras/returnerar `{ skipped: 'error' }` i stället för att köra `fn`.<br>2. Om K2 inte hunnit landa: byt `lockAcquired = true` → `false` (eller `return`) i samtliga listade catch-block.<br>3. Logga på `warn`-nivå så drift kan larma på upprepade lock-fel. |
| **Kodskiss** | <pre>} catch (err) {<br>  console.error('[WIN-BACK] Failed to acquire advisory lock:', err.message);<br>  lockAcquired = false; // fail-closed — hellre missat jobb än dubbelkört<br>}</pre> |
| **Tester** | Simulera `db.getClient()`-fel (mocka) → förvänta att jobbet INTE körs. |
| **PR** | PR-D |
| **Beroenden** | K2 (samma hjälpfunktion löser båda) |

---

## 🟠 Hög

### H1/N4 · IDOR: `revoked_at` saknas i 12 åtkomstkontroller

| Fält | Innehåll |
|---|---|
| **Prioritet** | 🟠 Hög |
| **Status** | ✅ Fixad |
| **Filer** | Se tabell nedan — 12 instanser i 9 filer |
| **Problem** | `db/parent-access.js:6–8` och `authz.getChildAccess` (`authz.js:44`) filtrerar centralt på `pc.revoked_at IS NULL`. Följande 12 ställen har egna inline-queries mot `parent_child` som **inte** filtrerar på `revoked_at`:<br>1. `schedules/child-crud.js:20–25` — schema-CRUD per barn<br>2. `schedules/child-bulk.js:18–23` — bulk-schemaändringar<br>3. `special-day-schedules.js:33–40` — specialdagar (rad 36, 48)<br>4. `onboarding.js:237–244` — `POST /schedule` (mall-val)<br>5. `onboarding.js:478–484` — `POST /weekend-schedule`<br>6. `onboarding.js:820–828` — `POST /child-view`<br>7. `onboarding.js:860–868` — `POST /update-pin`<br>8. `children.js:197–200,684,732,760,785` — vy-config m.fl. (5 instanser; tidigare citerad som `children.js:198` i H1 — samma kodinstans som N4:s `:197`, en post här)<br>9. `rewards.js:98–103` — `GET /child-view/:childId`<br>10. `family/core.js:252–259` — `GET /dashboard-stats`<br>11. `schedules/items.js:19–26` — `getScheduleAccess()` (delad helper för item-CRUD)<br>12. `pedagog-invite.js:63–69` + `family/pedagog.js:31–38` — pedagog-inbjudan (dubblerad kod, samma bugg) |
| **Konsekvens** | En återkallad pedagog eller borttagen delad förälder kan fortfarande läsa/ändra schema, onboarding-inställningar, belöningsvy och barninställningar efter att åtkomsten formellt tagits bort. |
| **Föreslagen åtgärd** | 1. Exportera en central helper i `db/parent-access.js` (eller använd `authz.getChildAccess` direkt) som alltid inkluderar `AND pc.revoked_at IS NULL`.<br>2. Ersätt samtliga 12 inline-queries ovan med anrop till helpern — börja med `children.js` (flest instanser) och `schedules/items.js` (delad helper, en fix täcker flera routes).<br>3. Slå ihop de två duplicerade pedagog-invite-implementationerna (`pedagog-invite.js`/`family/pedagog.js`) till en delad funktion i `db/pedagog-invite.js`.<br>4. Utöka `daily-logs-authz-contract.test.js`-mönstret till alla 12 ställen. |
| **Kodskiss** | <pre>// db/parent-access.js — central helper, återanvänd överallt<br>async function assertActiveChildAccess(parentId, childId) {<br>  const { rows } = await db.query(<br>    `SELECT c.id, c.family_id FROM child c<br>     JOIN parent_child pc ON pc.child_id = c.id<br>     WHERE pc.parent_id = $1 AND c.id = $2 AND pc.revoked_at IS NULL`,<br>    [parentId, childId]<br>  );<br>  return rows[0] || null;<br>}</pre> |
| **Tester** | Ny tabelldriven `test/revoked-access-contract.test.js` som täcker alla 12 endpoints. |
| **PR** | PR-B |
| **Beroenden** | inga |

---

### H2 · Authz-middleware definierad men aldrig monterad

| Fält | Innehåll |
|---|---|
| **Prioritet** | 🟠 Hög |
| **Status** | ✅ Fixad |
| **Filer** | `authz.js:167–241` (`requireChildAccess`/`requireLogAccess`/`requireItemAccess`), `src/middleware/childAccess.js` (hela filen, 35 rader) |
| **Problem** | `requireChildAccess`/`requireLogAccess`/`requireItemAccess` (`authz.js:167,185,203`) används ingenstans i `src/routes/` (0 träffar). `childAccess.js` är en separat, oanvänd fil **och** saknar `revoked_at`-filter i sin egen query (rad 26–27) — farlig om den tas i bruk senare eftersom den ser ut som en fungerande centraliserad lösning. |
| **Konsekvens** | Dubbla, inkonsekventa åtkomstmönster i kodbasen ökar risken för framtida IDOR-buggar (som H1/N4). |
| **Föreslagen åtgärd** | 1. Ta bort `src/middleware/childAccess.js` helt (oanvänd, farlig mall).<br>2. I samma PR som H1/N4: montera `authz.requireChildAccess`/`requireLogAccess`/`requireItemAccess` som middleware på routes som idag har inline-queries.<br>3. Uppdatera JSDoc-exempel i `authz.js:20–21` om signaturen ändras. |
| **Kodskiss** | <pre>// exempel på montering i stället för inline-query<br>router.get('/:childId/foo', authz.requireChildAccess('childId'), handler);</pre> |
| **Tester** | Samma tabelldrivna testsvit som H1/N4 verifierar även middleware-varianten. |
| **PR** | PR-B |
| **Beroenden** | H1/N4 (samma migrering) |

---

### N3 · Race: dubbel stjärna vid parallell completion (dubbeltryck/dubbelrekvest)

| Fält | Innehåll |
|---|---|
| **Prioritet** | 🟠 Hög |
| **Status** | ✅ Fixad |
| **Filer** | `src/routes/daily-logs/items.js:80–102` (`PUT /:itemId/complete`, förälder), `src/routes/daily-logs/child-self.js:246–297` (`PUT /daily-log-items/:itemId/complete`, barn) |
| **Problem** | Båda endpoints läser `item.completed` i ett separat `SELECT`/`getItemAccess`-anrop (`items.js:80`, `child-self.js:249–256`) och triggar sido-effekter (`handleActivityCompleted` → stjärna/streak, aktiveringsanalys, notiser) baserat på det **cachade** värdet — inte på resultatet av `UPDATE`. Två samtidiga requests (dubbeltryck, flaky nät/PWA-retry) kan båda läsa `completed = false` innan någon hunnit skriva `UPDATE`. |
| **Konsekvens** | Barnet kan få dubbla stjärnor/streak-krediter och föräldern dubbla push-notiser för samma aktivitet vid dubbeltryck eller nätverksretries. |
| **Föreslagen åtgärd** | 1. Gör `SELECT`+`UPDATE` atomärt: `UPDATE … WHERE id = $1 AND completed = false RETURNING …`.<br>2. Ersätt alla `if (!item.completed)`-grenar i båda filerna med `if (result.rows.length > 0)` (dvs. UPDATE:en gick faktiskt `false`→`true`).<br>3. Om `result.rows.length === 0` (redan completed av annan samtidig request): returnera samma `200`, hoppa över sido-effekter.<br>4. Upprepa i `child-self.js:273–304`. |
| **Kodskiss** | <pre>const result = await db.query(<br>  `UPDATE daily_log_item<br>   SET completed = true, completed_at = NOW(), completed_date = $2,<br>       completed_by = COALESCE(completed_by, 'parent'),<br>       completed_by_parent_id = COALESCE(completed_by_parent_id, $3)<br>   WHERE id = $1 AND completed = false<br>   RETURNING id, completed, completed_at, completed_date`,<br>  [req.params.itemId, logDate, req.user.id]<br>);<br>const justCompleted = result.rows.length > 0;<br>res.json(justCompleted ? result.rows[0] : { id: req.params.itemId, completed: true });<br>if (justCompleted) { /* sido-effekter */ }</pre> |
| **Tester** | Nytt race-test — två parallella `PUT …/complete` mot samma item, förvänta att stjärn-tilldelning triggas exakt en gång (mocka och räkna anrop). |
| **PR** | PR-C |
| **Beroenden** | inga |

---

### H3 · Race: dubbla `daily_log_item` vid parallell generering

| Fält | Innehåll |
|---|---|
| **Prioritet** | 🟠 Hög |
| **Status** | ✅ Fixad |
| **Filer** | `daily-log-generator.js:59–73,228–231`, `db/baseline-schema.sql:199–226` |
| **Problem** | `daily_log` har `UNIQUE(child_id, date)` (`baseline-schema.sql:206`) + `ON CONFLICT`, men `daily_log_item` (rad 209–226) saknar unik constraint på `(daily_log_id, activity_template_id)`. Två samtidiga anrop till `getOrGenerateDailyLog` (t.ex. förälder och barn öppnar appen samtidigt) kan båda passera `daily_log`-konflikthanteringen och båda infoga samma items. |
| **Konsekvens** | Dubblerade aktiviteter i dagsloggen — barnet ser samma aktivitet två gånger och kan tjäna dubbla stjärnor för den. |
| **Föreslagen åtgärd** | 1. Migration: `CREATE UNIQUE INDEX` på `(daily_log_id, activity_template_id)` — partiellt index (`WHERE activity_template_id IS NOT NULL`) för att hantera once-tasks utan mall.<br>2. Ändra insert i `daily-log-generator.js:59–73` till `ON CONFLICT (daily_log_id, activity_template_id) DO NOTHING`.<br>3. Alternativt/komplement: `SELECT … FOR UPDATE` på `daily_log`-raden för att serialisera samtidiga anrop.<br>4. Kör migrationen idempotent (`IF NOT EXISTS`), verifiera mot `migration-rollback-gate.test.js`. |
| **Kodskiss** | <pre>-- migrations/xxxx_daily_log_item_unique_activity.js<br>CREATE UNIQUE INDEX IF NOT EXISTS daily_log_item_unique_activity_idx<br>  ON daily_log_item (daily_log_id, activity_template_id)<br>  WHERE activity_template_id IS NOT NULL;</pre> |
| **Tester** | Parallellt integrationstest — anropa `getOrGenerateDailyLog` två gånger samtidigt (`Promise.all`) för samma barn+dag, förvänta exakt en rad per aktivitet. |
| **PR** | PR-C |
| **Beroenden** | inga |

---

### H4 · UTC-datum i push-scheduler trots Stockholm-tid

| Fält | Innehåll |
|---|---|
| **Prioritet** | 🟠 Hög |
| **Status** | ✅ Fixad |
| **Filer** | `push-reminder-scheduler.js:270,400` (jfr korrekt mönster `:164`) |
| **Problem** | Inaktivitetsnudge (rad 270) och gårdagens-datum-uppslag (rad 400) använder `new Date().toISOString().slice(0, 10)` — **UTC**-datum — medan jobbet i övrigt resonerar i Stockholm-tid (korrekt mönster rad 164: datumsträng byggd från `year/month/day` + `getDayOfWeek(dateStr, 'Europe/Stockholm')`). Runt midnatt (UTC vs CET/CEST) ger detta fel dag jämfört med `daily_log.date`. |
| **Konsekvens** | Push-påminnelser kan jämföra fel dags logg (t.ex. skicka "du har inte loggat idag" strax efter midnatt svensk tid när UTC-dagen fortfarande är gårdagens). |
| **Föreslagen åtgärd** | 1. Importera `getLocalDateStr` från `daily-log-generator.js` (redan korrekt använd där, se rad 325).<br>2. Ersätt rad 270 och 400 med `getLocalDateStr(...)`-anrop för respektive datum.<br>3. Testa kring en DST-övergång (sista söndagen mars/oktober) eller med fixerad `Date` i test. |
| **Kodskiss** | <pre>const { getLocalDateStr } = require('./daily-log-generator');<br>const todayStr = getLocalDateStr(new Date(), 'Europe/Stockholm');<br>const yesterday = new Date();<br>yesterday.setDate(yesterday.getDate() - 1);<br>const yesterdayStr = getLocalDateStr(yesterday, 'Europe/Stockholm');</pre> |
| **Tester** | Enhetstest med fryst `Date.now()` runt `2026-03-01T23:30:00Z` (00:30 svensk vintertid nästa dag) → verifiera lokal dag, inte UTC-dag. |
| **PR** | PR-C |
| **Beroenden** | inga |

---

### K2/K3-utökning — H5 · `activation-nudge-scheduler` saknar lock + idempotens

| Fält | Innehåll |
|---|---|
| **Prioritet** | 🟠 Hög |
| **Status** | ✅ Fixad |
| **Filer** | `activation-nudge-scheduler.js` — `withAdvisoryLock(ACTIVATION_NUDGE_LOCK_ID)` + claim-then-send |
| **Problem** | Skickar mejl (rad 57–61) och uppdaterar `activation_nudge_sent_at` (rad 63–65) helt utan advisory lock — till skillnad från övriga schedulers som åtminstone försöker (om än trasigt, se K2). Två samtidiga instanser kan plocka upp samma kandidatrader (rad 28–41, `LIMIT 50`) innan någon satt `activation_nudge_sent_at`. |
| **Konsekvens** | Dubbla aktiverings-mejl till samma förälder. |
| **Föreslagen åtgärd** | 1. Använd `withAdvisoryLock` (från K2) runt hela `runActivationNudgeJob`.<br>2. Komplettera med radnivå-idempotens: `UPDATE … WHERE family_id = $1 AND activation_nudge_sent_at IS NULL RETURNING id`, skicka mejl **efter** lyckad claim (inte före). |
| **Kodskiss** | <pre>const claimed = await db.query(<br>  `UPDATE family_activation_state<br>   SET activation_nudge_sent_at = NOW()<br>   WHERE family_id = $1 AND activation_nudge_sent_at IS NULL<br>   RETURNING family_id`,<br>  [row.family_id]<br>);<br>if (claimed.rows.length === 0) continue; // annan process vann racet<br>await sendActivationNudgeEmail({ to: row.email, parentName: row.parent_name, ctaUrl: '…' });</pre> |
| **Tester** | Samma parallell-mönster som K2/N6. |
| **PR** | PR-D |
| **Beroenden** | K2 (samma `withAdvisoryLock`-helper) |

---

### N6 · Fler schedulers helt utan advisory lock

| Fält | Innehåll |
|---|---|
| **Prioritet** | 🟠 Hög |
| **Status** | ✅ Fixad |
| **Filer** | `journey-push-scheduler.js` — `withAdvisoryLock(JOURNEY_PUSH_LOCK_ID)`; `child-handoff-reminder-scheduler.js` — lock + claim-then-send |
| **Problem** | Ingen av filerna anropar `pg_try_advisory_lock` överhuvudtaget. `journey-push-scheduler.js` skriver bara analytics (lägre risk), men `child-handoff-reminder-scheduler.js` skickar riktiga mejl och kan, som H5, skicka dubbla påminnelser vid samtidig körning i flera processer eftersom `SELECT`-kandidaterna (rad 19–36) och `UPDATE`-vakten (rad 49–54) inte är atomära som par. |
| **Konsekvens** | Dubbla `child_handoff_reminder`-mejl vid multi-instans-drift. |
| **Föreslagen åtgärd** | 1. Slå in `runJourneyPushJob` och `runChildHandoffReminderJob` i samma `withAdvisoryLock`-helper som K2 inför.<br>2. För `child-handoff-reminder-scheduler.js`: byt `UPDATE` till `RETURNING family_id`, skicka mejl bara vid lyckad claim (samma mönster som H5). |
| **Kodskiss** | Se K2/H5 — samma `withAdvisoryLock` + claim-then-send-mönster. |
| **Tester** | Samma parallell-mönster som K2/H5. |
| **PR** | PR-D |
| **Beroenden** | K2 (samma `withAdvisoryLock`-helper) |

---

### N5/L7/M9 · JWT-rotation kringgås på 5 ställen + JWT läcker via query-string

| Fält | Innehåll |
|---|---|
| **Prioritet** | 🟠 Hög |
| **Status** | ✅ Fixad |
| **Filer** | `src/routes/public.js:477–483` (`verifyReportToken`), `src/routes/family/pin.js:293–298` (`restore-parent-session`), `src/routes/events.js:26–44` (`extractUser`, SSE-auth), `src/middleware/impersonation.js:28`, `src/middleware/maintenance.js:52` |
| **Problem** | `src/middleware/auth.js:16–31` exporterar delad `verifyToken(token)` med dokumenterat dual-secret-stöd (`JWT_SECRET`+`JWT_SECRET_PREVIOUS` för nollstopps-nyckelrotation, rad 6–7,192–210). Fem ställen anropar i stället `jwt.verify(token, config.jwt.secret)` **direkt**, utan fallback till `previousSecret`: `public.js:479`, `family/pin.js:295`, `events.js:29,33,37,41` (fyra separata anrop i `extractUser`), `impersonation.js:28`, `maintenance.js:52`. Utöver rotationsluckan skickar `events.js:40–41` även token via `?token=`-query-param som SSE-fallback — query-strings hamnar lätt i serverloggar/proxy-loggar/`Referer`-headers. |
| **Konsekvens** | Vid en nyckelrotation loggas användare oväntat ut från rapportlänkar, PIN-återställning, SSE, admin-impersonation och underhållsläge tills token naturligt går ut — inkonsekvent med resten av appen. Query-param-token är en mindre men reell läckagerisk. |
| **Föreslagen åtgärd** | 1. Importera `verifyToken` (redan exporterad, `auth.js:286`) i samtliga fem filer i stället för direkt `jwt.verify(token, config.jwt.secret)`.<br>2. `events.js`: ersätt de fyra manuella anropen i `extractUser` med `verifyToken(token)`, en gång per källa.<br>3. Ta bort `?token=`-fallbacket i `events.js:40–42` om inga aktiva klienter behöver det (sök `EventSource(` i `public/js/` innan borttagning); annars flagga som deprecated med utfasningsdatum.<br>4. Regressionstest: sätt `JWT_SECRET_PREVIOUS`, skapa token med gammal hemlighet, verifiera att alla fem accepterar den. |
| **Kodskiss** | <pre>// public.js / family/pin.js / impersonation.js / maintenance.js<br>const { verifyToken } = require('../middleware/auth'); // justera path per fil<br>function verifyReportToken(token) {<br>  try { return verifyToken(token); } catch { return null; }<br>}</pre> |
| **Tester** | `test/jwt-rotation-contract.test.js` — tabelldrivet över alla fem call-sites (importerar `verifyToken`, inget rått `jwt.verify(token, config.jwt.secret)`, ingen `?token=`-fallback kvar) + funktionellt test att `verifyToken()` accepterar en token signerad med `JWT_SECRET_PREVIOUS`. |
| **PR** | PR-E |
| **Beroenden** | inga |

---

## 🟡 Medel

### N7 · Spoofbar win-back-attribution via publikt analytics-event

| Fält | Innehåll |
|---|---|
| **Prioritet** | 🟡 Medel |
| **Status** | ✅ Fixad |
| **Filer** | `src/routes/analytics.js:139–151`, `src/lib/win-back-return-tracker.js:42–62` |
| **Problem** | `POST /api/analytics/event` (rad 139) tillåter oautentiserade requests: `familyId` faller tillbaka till klient-skickat `session_id` (rad 147) om `req.user` saknas. Om `event_type` är `win_back_landing`/`for_dig_page_view`/`app_opened` anropas `maybeMarkWinBackReturnedFromEngagement(familyId, eventType)` (rad 151), som markerar `win_back_email_log.returned_at` utan att verifiera att avsändaren äger/representerar familjen. |
| **Konsekvens** | Vem som helst som känner till/gissar en `family_id`-UUID kan spoofa `returned_at`, vilket förvränger win-back-kampanjens returstatistik och ev. automatiska beslut baserade på den. |
| **Föreslagen åtgärd** | 1. Begränsa `maybeMarkWinBackReturnedFromEngagement`-anropet till autentiserade requests (`req.user?.familyId`, inte `session_id`-fallback) för de tre attribution-triggande event-typerna.<br>2. Om oautentiserad landningssida måste kunna trigga attribution: byt till signerat/kortlivat token i länken i stället för fri-text `session_id`.<br>3. Regressionstest: oautentiserad POST med godtycklig `session_id` → `win_back_email_log.returned_at` oförändrad. |
| **Kodskiss** | <pre>const familyId = req.user?.familyId || (typeof session_id === 'string' ? session_id : null);<br>if (!familyId) return;<br>analytics.track(familyId, event_type, metadata);<br>if (req.user?.familyId) { // kräv autentisering för win-back-attribution<br>  maybeMarkWinBackReturnedFromEngagement(req.user.familyId, event_type).catch(() => {});<br>}</pre> |
| **Tester** | `test/win-back-return-tracker.test.js` — oautentiserad request med spoofad `session_id` påverkar inte `returned_at`; autentiserad request från samma familj sätter `returned_at`. |
| **PR** | PR-E |
| **Beroenden** | inga |

---

### N8 · `activation-flags` fail-hard vid DB-fel

| Fält | Innehåll |
|---|---|
| **Prioritet** | 🟡 Medel |
| **Status** | ✅ Fixad |
| **Filer** | `src/lib/activation-flags.js` |
| **Problem** | `isActivationFlagEnabled` gör två sekventiella `await db.query(...)` (rad 43–44, 54) utan `try/catch`. Ett DB-fel (t.ex. pool-utarmning, M4) propagerar rakt upp — till skillnad från andra flagg-kontroller som failar till "av". |
| **Konsekvens** | En tillfällig DB-störning kan krascha aktiveringsflöden i stället för att bara inaktivera funktionen — motsatt önskat beteende för feature flags. |
| **Föreslagen åtgärd** | 1. Lägg `try/catch` runt båda `db.query`-anropen.<br>2. Vid fel: logga och returnera `false` (fail-closed — säkert default för en opt-in-flagga).<br>3. Dokumentera i JSDoc att funktionen aldrig kastar. |
| **Kodskiss** | <pre>async function isActivationFlagEnabled(key, familyId) {<br>  try {<br>    const result = await db.query('SELECT enabled FROM feature_flag WHERE key = $1 LIMIT 1', [key]);<br>    if (!result.rows[0]?.enabled) return false;<br>    if (COHORT_EXEMPT_FLAG_KEYS.has(key)) return true;<br>    const launchAt = parseLaunchAt();<br>    if (!launchAt || !familyId) return true;<br>    const fam = await db.query('SELECT created_at FROM family WHERE id = $1 LIMIT 1', [familyId]);<br>    if (!fam.rows[0]?.created_at) return true;<br>    return new Date(fam.rows[0].created_at) >= launchAt;<br>  } catch (err) {<br>    console.error('[ACTIVATION-FLAGS] Check failed for', key, ':', err.message);<br>    return false; // fail-closed<br>  }<br>}</pre> |
| **Tester** | `test/activation-flags-fail-closed.test.js` — mockad `db.query` som kastar → `false`, inget kastat undantag. |
| **PR** | PR-E |
| **Beroenden** | inga |

---

### N9 · `markSent` saknar statusvakt — kan re-sända/dubbelmarkera

| Fält | Innehåll |
|---|---|
| **Prioritet** | 🟡 Medel |
| **Status** | ✅ Fixad |
| **Filer** | `db/win-back-email-log.js:111–120` |
| **Problem** | `reject(id)` (rad 97–106) och `markFailed` guardar korrekt med `WHERE id = $1 AND status IN (...)`. `markSent(id)` (rad 111–120) saknar motsvarande vakt — kan anropas flera gånger för samma rad och skriver om `sent_at` varje gång, vilket förskjuter attributionsfönstret i `win-back-return-tracker` (N7, `sent_at > NOW() - N days`). |
| **Konsekvens** | Risk för duplicerad sändningsstatus och förskjuten attributionsstart vid race mellan `win-back-scheduler.js` och en manuell admin-approve-flow. |
| **Föreslagen åtgärd** | 1. Lägg till samma statusvakt-mönster som `reject`: `WHERE id = $1 AND status = 'approved' AND sent_at IS NULL`.<br>2. Låt anroparen (`win-back-sender.js` m.fl.) hantera `null`-retur (redan skickad) som no-op. |
| **Kodskiss** | <pre>async function markSent(id) {<br>  const result = await db.query(<br>    `UPDATE win_back_email_log<br>       SET status = 'sent', sent_at = NOW()<br>     WHERE id = $1 AND status = 'approved' AND sent_at IS NULL<br>     RETURNING *`,<br>    [id]<br>  );<br>  return result.rows[0] || null;<br>}</pre> |
| **Tester** | `test/win-back-email-log-mark-sent.test.js` — andra `markSent`-anropet för samma `id` returnerar `null` och `sent_at` är oförändrad; ett `pending_approval`-record kan inte gå direkt till `sent`. |
| **PR** | PR-E |
| **Beroenden** | inga |

---

### N10 · TOCTOU-race i admin family-components (read-modify-write utan lås)

| Fält | Innehåll |
|---|---|
| **Prioritet** | 🟡 Medel |
| **Status** | ✅ Fixad |
| **Filer** | `src/routes/admin/family-components.js` |
| **Problem** | `PUT /families/:familyId/components/:slug` läser hela `components`-arrayen (rad 64), muterar en lokal kopia (rad 65–88), skriver tillbaka **hela** arrayen (rad 90–95) — utan transaktion/radlås. Två parallella admin-requests för samma familj kan skriva över varandras ändring (last-write-wins). |
| **Konsekvens** | En admin-beviljad/arkiverad komponent kan tyst försvinna om två ändringar för samma familj sker nära i tiden. |
| **Föreslagen åtgärd** | 1. `SELECT … FOR UPDATE` på `family_subscriptions`-raden inom en transaktion (`db.getClient()`+`BEGIN`) innan läsning, håll låset till `UPDATE` är klar.<br>2. Alternativt: uttryck ändringen som en atomär SQL-uppdatering (`jsonb`-operatorer) i stället för läs-i-JS-skriv-tillbaka.<br>3. Om ingen transaktion önskas: optimistic-lock via `updated_at`-check från klienten. |
| **Kodskiss** | <pre>const client = await db.getClient();<br>try {<br>  await client.query('BEGIN');<br>  const { rows } = await client.query(<br>    'SELECT components FROM family_subscriptions WHERE family_id = $1 FOR UPDATE', [familyId]);<br>  const components = [...(rows[0]?.components || [])];<br>  // … mutera components som idag …<br>  await client.query(<br>    `INSERT INTO family_subscriptions (family_id, components) VALUES ($1, $2)<br>     ON CONFLICT (family_id) DO UPDATE SET components = $2, updated_at = NOW()`,<br>    [familyId, JSON.stringify(components)]);<br>  await client.query('COMMIT');<br>} catch (err) { await client.query('ROLLBACK'); throw err; }<br>finally { client.release(); }</pre> |
| **Tester** | `test/family-components-toctou.test.js` — kontrakt: `BEGIN`/`COMMIT`/`ROLLBACK`, `FOR UPDATE`, audit-log inom transaktion. |
| **PR** | PR-E |
| **Beroenden** | inga |

---

### N11/M6 · PII i loggar (view-config + forgot-password)

| Fält | Innehåll |
|---|---|
| **Prioritet** | 🟡 Medel |
| **Status** | ✅ Fixad |
| **Filer** | `src/routes/children.js:195,218,220,233`, `src/routes/auth/email.js:149,164` |
| **Problem** | `PATCH /:id/view-config` loggar hela request-body och hela det sammanslagna config-objektet okontrollerat (rad 195, 218, 220, 233 — fyra `console.log` med `JSON.stringify(req.body)`/`current`/`merged`). `auth/email.js:149` loggar e-postadress i klartext vid forgot-password. Ingen är strikt känslig (inga lösenord/PIN/betalinfo), men bryter mot dataminimering (GDPR). |
| **Konsekvens** | Onödig personuppgiftsexponering i loggar; ökar blast radius vid ett eventuellt loggläckage. |
| **Föreslagen åtgärd** | 1. `children.js`: ersätt de fyra `console.log`-raderna med loggning av enbart `Object.keys(req.body)` och `req.params.id`, inte fullständiga värden.<br>2. `auth/email.js:149`: ta bort/maskera e-postadressen i loggen (t.ex. logga bara domän eller inget alls); `parent.id` (rad 164) är ok att behålla.<br>3. Behåll `console.error`-loggning av faktiska fel oförändrad. |
| **Kodskiss** | <pre>// children.js — ersätt de fyra console.log-raderna med:<br>console.log('[VIEW-CONFIG] PATCH for child', req.params.id, 'fields:', Object.keys(req.body));</pre> |
| **Tester** | Ingen ny testtäckning krävs; manuell verifiering att `console.error`-loggning inte tas bort av misstag. |
| **PR** | PR-E |
| **Beroenden** | inga |

---

### M1 · Tysta fel i fire-and-forget-kedjor

| Fält | Innehåll |
|---|---|
| **Prioritet** | 🟡 Medel |
| **Status** | ✅ Fixad |
| **Filer** | `daily-logs/items.js:69,102,121–123`, `daily-logs/child-self.js:297,357,359`, `goals.js:342,344`, `schedules/fill-week.js:136`, `authz.js:307` (`.catch(next)` utan logg) |
| **Problem** | Tomma `catch (_) {}`/`.catch(() => {})` sväljer fel helt tyst — svårare produktionsfelsökning om t.ex. notis- eller synk-anrop kastar. |
| **Konsekvens** | Fel i bakgrundsjobb syns aldrig i loggarna. |
| **Föreslagen åtgärd** | 1. Lägg till minst `console.error` med kontext (funktionsnamn + relevant id) i varje tomt catch-block.<br>2. `authz.js:307`: byt `.catch(next)` mot `.catch((err) => { console.error(...); next(err); })` för synlighet innan felet når den generiska handlern. |
| **Kodskiss** | <pre>}).catch((err) => console.error('[DAILY-LOG-ITEM] Notify failed:', err.message));</pre> |
| **Tester** | `test/empty-catch-logging-contract.test.js` — grep att listade filer inte har tomma catch utan logg. |
| **PR** | PR-E |
| **Beroenden** | inga |

---

### M2 · IAP `timingSafeEqual` kan kasta vid olika längd

| Fält | Innehåll |
|---|---|
| **Prioritet** | 🟡 Medel |
| **Status** | ✅ Fixad (length-check i `iap-webhook-handler.js`, 6df30fe) |
| **Filer** | `src/routes/iap-webhook-handler.js` (flyttad från `iap.js`) |
| **Problem** | `crypto.timingSafeEqual` kastar `RangeError` om buffrarnas längd skiljer sig — en felformad/kortare signatur ger okontrollerat `500` i stället för `401`. |
| **Konsekvens** | Felaktig felkod till anroparen och onödig stack trace i loggar för ett förväntat scenario (ogiltig signatur). |
| **Föreslagen åtgärd** | 1. Längdkoll innan jämförelse.<br>2. Returnera `401` oavsett längdskillnad eller felaktig signatur. |
| **Kodskiss** | <pre>const providedBuf = Buffer.from(providedSig, 'base64');<br>const expectedBuf = Buffer.from(expectedSig, 'base64');<br>if (providedBuf.length !== expectedBuf.length ||<br>    !crypto.timingSafeEqual(providedBuf, expectedBuf)) {<br>  return res.status(401).json({ error: 'Unauthorized' });<br>}</pre> |
| **Tester** | `test/iap-webhook.test.js` — kort signatur → `401`, inte `500`. |
| **PR** | PR-E |
| **Beroenden** | K1 (samma fil — gör i samma PR om K1 ändå rörs) |

---

### M3 · `requireComponent` fail-open vid DB-fel

| Fält | Innehåll |
|---|---|
| **Prioritet** | 🟡 Medel |
| **Status** | ✅ Fixad |
| **Filer** | `src/middleware/require-component.js` |
| **Problem** | Paywall-kollen faller igenom (`next()`) vid DB-fel — kringgår komponent-gaten om databasen har problem. |
| **Konsekvens** | Betald komponent kan nås utan giltig prenumeration under en DB-störning. |
| **Föreslagen åtgärd** | 1. Överväg fail-closed för betalda komponenter (avväg mot tillgänglighet — om DB är nere är hela appen påverkad ändå).<br>2. Om fail-closed väljs: returnera `503` (inte `403`) så klienten kan skilja "betalning saknas" från "tillfälligt fel". |
| **Kodskiss** | <pre>} catch (err) {<br>  req.log?.error({ msg: 'component check failed', operation: 'requireComponent', error: err.message });<br>  return res.status(503).json({ error: 'Tillfälligt fel, försök igen' }); // fail-closed<br>}</pre> |
| **Tester** | `test/require-component-fail-closed.test.js` — mockat DB-fel → `503`, inte `next()`. |
| **PR** | PR-E |
| **Beroenden** | inga |

---

### M4 · Pool `max: 5` + 13 schedulers + SSE

| Fält | Innehåll |
|---|---|
| **Prioritet** | 🟡 Medel |
| **Status** | ✅ Dokumenterad (`docs/ops-pool-monitoring.md`, `AGENTS.md`) |
| **Filer** | `db.js:15,17` |
| **Problem** | `max: 5` anslutningar delas mellan HTTP-requests, 13+ schedulers och långlivade SSE-anslutningar; `connectionTimeoutMillis: 5000` risk för väntetid/timeout under last. |
| **Konsekvens** | Risk för pool-utarmning under hög last, vilket kan förvärra andra fynd (t.ex. N8:s fail-hard-beteende). |
| **Föreslagen åtgärd** | 1. Övervaka pool-wait i produktion (logga `pool.waitingCount` periodiskt).<br>2. Om K2:s `withAdvisoryLock`-refaktor minskar antalet samtidiga `pool.query`-anrop, utvärdera om `max` ändå behöver höjas (kolla Postgres `max_connections` på VPS). |
| **Kodskiss** | Ingen kodändring i sig — operativ övervakning. |
| **Tester** | Inga nya krävs. |
| **PR** | PR-E |
| **Beroenden** | K2 (färre `pool.query`-anrop från schedulers minskar trycket) |

---

### M5 · Saknat index för dup-kontroller i `notification_log`

| Fält | Innehåll |
|---|---|
| **Prioritet** | 🟡 Medel |
| **Status** | ✅ Fixad |
| **Filer** | `migrations/1809200000000_notification_log_dup_check_idx.js`, `push-reminder-scheduler.js:238–243,361,459–462` |
| **Problem** | Tre ställen filtrerar `notification_log` på `parent_id, type, title LIKE ..., created_at` utan stödjande index — full scan vid växande tabell. |
| **Konsekvens** | Långsammare dup-kontroller i push-schedulern i takt med att `notification_log` växer. |
| **Föreslagen åtgärd** | 1. Lägg till index `(parent_id, type, created_at DESC)`.<br>2. Verifiera med `EXPLAIN ANALYZE` före/efter. |
| **Kodskiss** | <pre>CREATE INDEX IF NOT EXISTS notification_log_dup_check_idx<br>  ON notification_log (parent_id, type, created_at DESC);</pre> |
| **Tester** | `test/notification-log-dup-index.test.js` — migration + indexnamn; `EXPLAIN ANALYZE` före/efter i PR-beskrivning vid deploy. |
| **PR** | PR-E |
| **Beroenden** | inga |

---

### M7 · Oescapad HTML i kontakt-mejl

| Fält | Innehåll |
|---|---|
| **Prioritet** | 🟡 Medel |
| **Status** | ✅ Fixad |
| **Filer** | `src/routes/public.js` |
| **Problem** | `${message.trim()}` injiceras direkt i HTML-mejlet till admin — ett meddelande med `<script>`/HTML-taggar renderas obehandlat i mejlklienten. |
| **Konsekvens** | Möjlig HTML/script-injektion i det interna admin-mejlklientfönstret. |
| **Föreslagen åtgärd** | 1. Escapa HTML-specialtecken innan interpolering, eller skicka mejlet som text-only. |
| **Kodskiss** | <pre>function escapeHtml(s) {<br>  return s.replace(/[&<>"']/g, (c) => ({<br>    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'<br>  }[c]));<br>}<br>// …<br>&lt;p&gt;${escapeHtml(message.trim())}&lt;/p&gt;</pre> |
| **Tester** | `test/contact-email-escape.test.js` — XSS-payload i meddelande → escapade entiteter i utgående mejl-HTML. |
| **PR** | PR-E |
| **Beroenden** | inga |

---

### M8 · In-memory rate limiting

| Fält | Innehåll |
|---|---|
| **Prioritet** | 🟡 Medel |
| **Status** | ✅ Dokumenterad (`rateLimiter.js` header — MemoryStore OK single-instance; Redis vid multi-instance) |
| **Filer** | `rateLimiter.js:7–8` |
| **Problem** | `express-rate-limit` använder default `MemoryStore` — delas inte mellan flera Node-instanser/processer. |
| **Konsekvens** | Rate limits blir per-instans i stället för globala om driften skalas till flera instanser. |
| **Föreslagen åtgärd** | 1. Byt till `rate-limit-redis` (eller motsvarande delad store) vid multi-instansdrift.<br>2. Dokumentera som förutsättning inför skalning — ingen brådska vid dagens single-instance-drift. |
| **Kodskiss** | Ingen kodändring nu — se `rate-limit-redis`-dokumentation vid implementation. |
| **Tester** | Inga nya krävs förrän multi-instance faktiskt införs. |
| **PR** | PR-E |
| **Beroenden** | inga |

---

## 🟢 Låg / teknisk skuld

| ID | Status | Fynd | Fil | Motivering / åtgärd |
|----|--------|------|-----|---------------------|
| L1 | ✅ Fas 8 klar | Stora filer | `schedule.js` ✅ ~953 r, `dashboard.js` ✅ ~791 r, `child-dashboard.js` ✅ ~550 r host + 12 moduler | Barnvy split F3a–g (offline, day-nav, timers, activities, substeps, checkoff, load-day, rewards, celebrations, …). |
| L2 | ✅ Dokumenterad | `AUTHZ_HARDENING_ENABLED` kill switch | `authz.js`, `docs/ops-incident-runbook.md` | Runbook + prod-stabil H1/N4; borttagning av switch vid 90 dagar utan incident. |
| L3 | ✅ Fixad | Manuell DST-logik i win-back | `win-back-scheduler.js` | Använder `stockholm-time.js` (samma mönster som weekly-summary). |
| L4 | ✅ Fixad | `getChildAgeInYears` server-local tid | `daily-log-generator.js` | Kalenderdatum i angiven tidszon (`STOCKHOLM_TZ` default). |
| L5 | ✅ Fixad | `req.log` utan pino-http | `app.js` | Error handler använder `console.error` med strukturerat objekt. |
| L6 | ✅ Dokumenterad | CSP report-only | `securityHeaders.js` | Enforcing efter 30+ dagar utan violations — dokumenterat i filheader. |
| L7 | ✅ Fixad | JWT-rotation i impersonation/maintenance | `impersonation.js`, `maintenance.js` | N5/PR-E del 1–2. |
| L8 | ✅ Fixad | Kommentar om middleware-ordning | `rateLimiter.js` | Kommentar uppdaterad (global vs apiLimiter, admin/refresh exempt). |

---

## Datamodell-/admin-fynd (korsref.)

- **Dubbel prenumerationsmodell** (`family.*` vs `family_subscriptions`) — se [02-datamodell.md](02-datamodell.md) §4.
- **Schema-drift** — `surveys/*`, `landing_news`, `admin_uploaded_images`, `pin_notification_log`, `deletion_job` saknar `CREATE` i `migrations/`.
- **Admin-säkerhet** — statisk admin-HTML utan server-gate, impersonation-token i query-param, admin kan skapa admin utan 2FA — se [05-logiskt-schema-admin.md](05-logiskt-schema-admin.md).

---

## ✅ Starka sidor

1. **Parametriserade queries** dominerar — ingen user-input-interpolation i SQL hittades (M7 är en HTML-mejl-injektion, inte SQL).
2. **Centraliserad authz** (`authz.js`) med `revoked_at` i helpers — bra grund, men underanvänd (se H1/N4/H2).
3. **CSRF double-submit** med `timingSafeEqual`.
4. **Transaktioner** i kritiska flöden: `children.js` create/delete, `onboarding.js`, `standard-library.js`, `activities.js`, `family-images.js` DELETE.
5. **Impersonation write-block** + audit-log.
6. **Barn-JWT deny-by-default** (`child-parent-api-block.js`).
7. **`midnight-scheduler`/`weekly-summary-scheduler`** korrekt lock-hantering — använd som mall för K2/N6.
8. **Omfattande regressionstester** (~154 testfiler) för refaktoreringar och säkerhet.
9. **Dokumenterade kill switches** och rate-limit-undantag med incidenthistorik.
10. **`createApp()`-mönstret** gör appen testbar utan att binda port/schedulers.
11. **Dual-secret JWT-stöd redan implementerat korrekt** i `auth.js` — bara ett spridnings-/adoptionsproblem (N5), inte en designbrist.

---

## PR-plan

| PR | Innehåll | Tema |
|----|----------|------|
| **PR-A** | K1, N1, N2 | Kritiska IDOR + trasig betal-webhook |
| **PR-B** | H1/N4, H2 | Enhetlig `revoked_at`-åtkomstkontroll |
| **PR-C** | N3, H3, H4 | Race conditions i daglig loggning + tidszonsbugg |
| **PR-D** | K2, K3, H5, N6 | Scheduler-locks (alla schedulers, en gemensam helper) |
| **PR-E** | N5, N7–N11, M1–M9, L1–L8 | JWT-rotation, spoofing/TOCTOU/loggning, teknisk skuld |

### Agent-referens per PR

**PR-A (Kritisk, inga inbördes beroenden):**
- K1: flytta IAP-webhook-mount i `app.js` före `express.json()`, egen `express.raw()`. Test: `test/iap-webhook.test.js`.
- N1: ta bort `/uploads/`-genvägen i `family-images.js:51–54`. Test: ny `family-images-authz.test.js`.
- N2: lägg till family-ägarskapskontroll i `pedagog-day-comments.js:33–47` POST. Test: ny `pedagog-day-comments-authz.test.js`.
- Ingen fil-överlapp mellan de tre — kan implementeras och testas oberoende av varandra.

**PR-B (Hög, bygger på samma mönster):**
- Skapa/utöka `db/parent-access.js`-helper med `revoked_at IS NULL`.
- Ersätt de 12 inline-queries som listas i H1/N4-tabellen, en fil i taget (children.js har flest instanser — börja där).
- Ta bort `childAccess.js` (H2).
- Montera `authz.requireChildAccess`/`requireLogAccess`/`requireItemAccess` som middleware där lämpligt.
- Test: en tabelldriven `test/revoked-access-contract.test.js` som täcker alla 12 endpoints.

**PR-C (Hög, tre oberoende buggar i samma domän):**
- N3: byt `if (!item.completed)` mot `UPDATE … WHERE completed = false RETURNING …` i `items.js` och `child-self.js`.
- H3: lägg till unikt index på `daily_log_item`, `ON CONFLICT DO NOTHING` i generatorn.
- H4: byt UTC-datum mot `getLocalDateStr` i `push-reminder-scheduler.js:270,400`.
- Kan göras i valfri ordning, ingen fil delas mellan de tre.

**PR-D (Kritisk/Hög, en gemensam helper löser fyra fynd):**
- Bygg `src/lib/scheduler-lock.js` med `withAdvisoryLock(lockId, fn)` (löser K2 + K3 på en gång, fail-closed by design).
- Migrera samtliga 9 schedulers i K2:s fillista + `activation-nudge-scheduler.js` (H5) + `journey-push-scheduler.js`/`child-handoff-reminder-scheduler.js` (N6) till helpern.
- Test: `test/scheduler-lock.test.js` (parallellitetstest av helpern) + smoke-test per scheduler att `runXJob` fortfarande fungerar normalt (icke-parallellt fall).

**PR-E (Medel/Låg, kan delas upp i flera mindre commits inom samma PR):**
- N5 (+L7+M9): centralisera på `auth.js`s `verifyToken` i `public.js`, `family/pin.js`, `events.js`, `impersonation.js`, `maintenance.js`; ta bort/flagga query-param-JWT i `events.js`.
- N7: kräv autentisering för win-back-attribution i `analytics.js`.
- N8: fail-closed + try/catch i `activation-flags.js`.
- N9: statusvakt i `win-back-email-log.js markSent`.
- N10: transaktion/`FOR UPDATE` i `admin/family-components.js`.
- N11/M6: reducera PII-loggning i `children.js`/`auth/email.js`.
- M1: loggning i tomma catch-block.
- M2: längdkoll i `iap.js` (kan tas ihop med K1 om samma PR).
- M3: fail-closed-beslut i `require-component.js`.
- M4: övervakning, ingen kodändring.
- M5: index-migration för `notification_log`.
- M7: HTML-escape i `public.js` kontakt-mejl.
- M8: dokumentera Redis-behov vid multi-instance (ingen kodändring nu).
- L1–L8: enligt tabell, lägst prioritet — ta med om tid finns i samma PR.

---

## Rekommenderad implementeringsordning

1. **PR-A** — kritiska IDOR (N1, N2) och betal-webhook (K1) är enskilt allvarligast och utan beroenden till annat arbete. Gör detta först.
2. **PR-D** — scheduler-lock-helpern (K2/K3/H5/N6) bör landa tidigt eftersom den minskar risk (dubbla mejl/push) medan resten av arbetet pågår, och berör inga andra PR:ar.
3. **PR-B** — `revoked_at`-enhetligheten (H1/N4/H2) är näst mest kritisk för dataisolering; gör i egen PR eftersom den rör flest filer.
4. **PR-C** — race conditions i daglig loggning (N3, H3) + tidszonsbugg (H4); oberoende av B/D men bör inte vänta för länge eftersom N3/H3 påverkar stjärnbalans (kärnmekanik).
5. **PR-E** — resten (N5, N7–N11, M1–M9, L1–L8); lägre risk, kan tas i lugnare takt, men bör inte glömmas bort (särskilt N7/N9/N10 är riktiga korrekthetsbuggar, inte bara städning).

---

## Aggregerad testchecklista

Innan varje PR anses klar (utöver `npm run test:gate`, se `130-testing.mdc`):

**PR-A** (täcks av `test:gate:db`: `iap-webhook`, `family-images-authz`, `pedagog-day-comments-authz`)
- [x] IAP-webhook: giltig HMAC + raw body → `200`, uppdaterar `subscription_status`
- [x] IAP-webhook: request utan CSRF-header lyckas ändå (routen ligger före CSRF-middleware)
- [x] `family-images/source`: cross-family `/uploads/`-URL → `403`
- [x] `pedagog-day-comments POST`: cross-family `childId` → `403`, ingen rad skapad

**PR-B** (täcks av `test:gate:unit`: `revoked-access-contract`)
- [x] Alla 12 H1/N4-endpoints: `parent_child.revoked_at` satt → `403`/`404` (tabelldrivet test)
- [x] Samma endpoints: aktiv (icke-revoked) länk → fortsatt `200` (ingen regression)
- [x] `childAccess.js` borttagen, inga referenser kvar

**PR-C** (täcks av `test:gate:unit`: `daily-log-race-contract`, `push-reminder-scheduler`)
- [x] Parallell completion (N3): atomisk `UPDATE WHERE completed = false`
- [x] Parallell daglog-generering (H3): unikt index + `ON CONFLICT DO NOTHING`
- [x] Tidszon (H4): `getLocalDateStr` i push-scheduler

**PR-D** (täcks av `test:gate:unit`: `scheduler-lock`)
- [x] `withAdvisoryLock`: två parallella anrop med samma `lockId` → bara ett kör `fn`
- [x] Fail-closed: simulerat DB-fel vid lock-försök → jobbet körs INTE
- [x] Migrerade schedulers: befintliga scheduler-tester oförändrade

**PR-E**
- [x] JWT-rotation (N5): token signerad med `JWT_SECRET_PREVIOUS` accepteras på alla 5 ställen
- [x] Win-back-spoofing (N7): oautentiserad request kan inte sätta `returned_at`
- [x] `activation-flags` (N8): DB-fel → `false`, inget kastat undantag
- [x] `markSent` (N9): dubbelanrop → andra anropet no-op
- [x] Admin TOCTOU (N10): `FOR UPDATE`-transaktion i family-components PUT
- [x] Kontakt-mejl (M7): HTML i meddelande → escapat i utgående mejl
- [x] requireComponent (M3): DB-fel → `503`, inte fail-open
- [x] PII-loggning (N11): view-config + forgot-password utan full body/e-post i loggar
- [x] Fire-and-forget (M1): tomma catch → `console.error` med kontext
- [x] notification_log-index (M5): `notification_log_dup_check_idx` migration
- [x] IAP-signatur (M2): avvikande längd → `401` inte `500`
- [x] Pool (M4): dokumenterad övervakning i `docs/ops-pool-monitoring.md`
- [x] Rate limit (M8): MemoryStore single-instance dokumenterat i `rateLimiter.js`

---

## Testtäckning (`npm run test:gate`)

Säkerhetsreview-fynden ovan täcks av följande i CI (sedan `d6d426a`):

| Område | Testfiler |
|--------|-----------|
| IAP-webhook, signaturlängd | `test/iap-webhook.test.js` |
| Family-images IDOR | `test/family-images-authz.test.js` |
| Pedagog-day-comments IDOR | `test/pedagog-day-comments-authz.test.js` |
| `revoked_at` (12 ställen) | `test/revoked-access-contract.test.js` |
| Daily-log race + index | `test/daily-log-race-contract.test.js` |
| Scheduler locks | `test/scheduler-lock.test.js` |
| JWT-rotation (5 ställen) | `test/jwt-rotation-contract.test.js` |
| Win-back spoofing + markSent | `test/win-back-return-tracker.test.js`, `test/win-back-email-log-mark-sent.test.js` |
| PII i loggar (N12) | `test/log-redact.test.js`, `test/pii-logging-contract.test.js` |
| Authz middleware (H2†) | `test/authz-middleware-mounted.test.js` |
| Fail-closed gates | `test/activation-flags-fail-closed.test.js`, `test/require-component-fail-closed.test.js` |
| Admin TOCTOU | `test/family-components-toctou.test.js` |
| Kontakt XSS | `test/contact-email-escape.test.js` |
| Catch-loggning | `test/empty-catch-logging-contract.test.js` |
| notification_log-index | `test/notification-log-dup-index.test.js` |

---

## Slutstatus & backlog

### Klart (denna review)

- **27 prioriterade fynd** (K1–M8, exkl. deferred L): implementerade, testade i `test:gate`, deployade prod.
- **Prod-migreringar:** `1809190000000_daily_log_item_unique_activity` (med dedup), `1809200000000_notification_log_dup_check_idx`.

### Medveten backlog

**Stängd 2026-07-02** — hela review-scope (N12, H2†, L1–L8). Inget öppet i denna lista.

| ID | Status | Not |
|----|--------|-----|
| **N12** | ✅ Fixad | `src/lib/log-redact.js` + maskning/parent-id i alla kvarvarande loggfiler; `test/pii-logging-contract.test.js`. |
| **H2†** | ✅ Fixad | `requireLogAccess` / `requireItemAccess` monterade i `daily-logs/logs.js` + `items.js`. |
| **L1** | ✅ Fas 8 klar | `schedule.js` + `dashboard.js` + `child-dashboard.js` host under radmål. Barnvy F3a–g extraherad (`638ab61` prod). |

### Uppföljningar utanför review-scope (tidshorisonter)

| ID | Status | Not |
|----|--------|-----|
| **M4** | 📋 Drift | Pool-övervakning — se `docs/ops-pool-monitoring.md` |
| **M8** | 📋 Skalning | MemoryStore rate limit OK single-instance; Redis vid multi-instance |
| **L2** | 📋 90 dagar | Ta bort `AUTHZ_HARDENING_ENABLED` efter 90 dagar utan incident |
| **L6** | 📋 30 dagar | CSP report-only → enforcing efter 30+ dagar utan violations |
