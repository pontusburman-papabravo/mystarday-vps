# Platform Runtime — prod-safe validation (PR #400)

> **Agent:** Prod-Safe Validation  
> **Scope:** Kort, kontrollerad **produktions-testwindow** för Proof of Product.  
> **Ingen** bred rollout · **ingen** permanent aktivering · **ingen** staging-miljö.

**Miljöer som finns:** produktion (VPS), lokal Mac, Cursor. Det finns **ingen** separat staging.

Relaterat: [PROD-OPERATING-ENVELOPE.md](PROD-OPERATING-ENVELOPE.md), migration `1808950000000_platform_runtime.js`.

---

## Arkitekturbegränsning (läs först)

`platform_runtime_enabled` är en **global** `feature_flag` (boolean för hela produktionen). Per-family allowlist **stöds inte** i PR #400 (`features` + `family_features` används inte av Platform Runtime).

| Under testfönster ON | Konsekvens |
|----------------------|------------|
| Alla familjer i prod-DB | Får pack-copy, progression och `/api/me/platform-feedback` när de triggar första-completion-flödet |
| Enda avsedda testkonto | `Pontus@burman.cc` |
| Övriga användare | Kan påverkas om de råkar slutföra aktivitet under fönstret |

**Mitigering:** Kort fönster (mål ≤15 min), test utanför rusningstid, flagga **AV direkt efter** smoke. Vid avvikelse: **stäng flaggan först**, analysera sedan.

---

## Riskanalys

| Risk | Sannolikhet | Impact | Mitigering |
|------|-------------|--------|------------|
| Global flag ON påverkar andra familjer | Medel (vid aktiv användning) | Medel — pack-copy/progression för icke-test | Kort fönster; ej morgonrusning; omedelbar OFF efter test |
| Glömd flagga ON över natt | Låg | Hög — oavsiktlig bred exponering | Post-test SQL-check; kalenderpåminnelse; env-broms redo |
| Migration seedar ON istället för OFF | Låg | Hög | Post-deploy SQL före test (`enabled = false`) |
| Runtime kraschar vid completion | Låg | Medel — barn ser ev. befintlig dopamin, saknar whisper | Rollback SQL + env `false`; legacy Journey oförändrat |
| Ingen DB-åtkomst under incident | Låg | Medel | `PLATFORM_RUNTIME_ENABLED=false` i `.env` + omstart |
| Per-family allowlist saknas | **Säker** | Strukturell — kan inte isolera en familj i kod | Processkontroll; bygg inte ad hoc i denna PR |

---

## Do not proceed if

**STOPPA.** Kör inte testfönstret om något av följande är sant:

- [ ] PR #400 är **inte** mergad och deployad till produktion
- [ ] Migration `1808950000000_platform_runtime` är **inte** verifierad körd på prod
- [ ] Post-deploy SQL visar **inte** `enabled = false` (eller rad saknas och du har inte verifierat default-beteende)
- [ ] Du har **inte** skriftlig rollback-plan öppen (denna fil) och DB-åtkomst till prod
- [ ] Du kan **inte** sätta `PLATFORM_RUNTIME_ENABLED=false` i prod `.env` vid behov
- [ ] Testkonto `Pontus@burman.cc` finns inte i prod med barn + schema redo
- [ ] Det är **morgonrusning** (07:00–08:30 CET) eller annan hög trafikperiod
- [ ] Någon annan testar parallellt i prod utan koordination
- [ ] Du planerar att lämna flaggan ON “tills vidare”
- [ ] Osäkerhet kring vad som händer — **STOPPA** och eskalera

---

## Preconditions

Före deploy eller före testfönster:

- [ ] `npm run test:gate` grön på merge-commit (CI)
- [ ] Deploy till prod VPS genomförd (`GET /health` → `healthy`)
- [ ] Operatör har: SSH till prod, `psql` mot prod-DB (eller admin DB-verktyg)
- [ ] Testfamilj `Pontus@burman.cc` identifierad (SQL nedan)
- [ ] Tid bokad: **ett** fönster, en operatör, max ~15 min med flag ON
- [ ] Ingen inbjuden extern test utanför `Pontus@burman.cc`-familjen under fönstret

### Hitta testkonto och familj (prod-DB)

```sql
SELECT p.id AS parent_id,
       p.email,
       p.family_id,
       f.name AS family_name,
       (SELECT COUNT(*)::int FROM child c WHERE c.family_id = f.id) AS child_count
FROM parent p
JOIN family f ON f.id = p.family_id
WHERE LOWER(p.email) = LOWER('Pontus@burman.cc');
```

Spara `family_id` och `parent_id`. Kräv `child_count >= 1` innan test.

---

## Prod OFF verification (efter deploy, före testfönster)

Kör **alltid** efter deploy. Prod ska vara OFF tills testfönster medvetet öppnas.

### SQL — kontrollera flagga

```sql
SELECT key, enabled, description
FROM feature_flag
WHERE key = 'platform_runtime_enabled';
```

**Förväntat efter deploy:**

| `enabled` | Tolkning |
|-----------|----------|
| `false` | ✅ Korrekt — runtime av |
| `true` | ❌ STOPPA — sätt OFF (SQL nedan) innan något annat |
| (ingen rad) | ⚠️ Runtime av (kod defaultar disabled) — överväg att inserta OFF-rad |

### Beteende OFF (valfri curl mot prod)

Med förälder- eller barnsession för **testfamiljen** (eller utan session om route kräver auth — förvänta 401/403):

```bash
curl -sS -o /dev/null -w "%{http_code}\n" \
  -H "Cookie: <session-cookies>" \
  "https://<prod-host>/api/me/platform-feedback"
```

**Förväntat när OFF:** HTTP `503`, body innehåller `Platform Runtime ej aktiverat`.

### Env-nödbroms (verifiera att den fungerar)

I `orchestrator.js`: `PLATFORM_RUNTIME_ENABLED=false` returnerar `isRuntimeEnabled() === false` **även om** DB-flaggan är `true`.

**Verifiering (endast vid underhållsfönster eller med env-broms planerad):**

1. Sätt i prod `.env`: `PLATFORM_RUNTIME_ENABLED=false`
2. `eval "${VPS_RESTART_CMD:-sudo systemctl restart app}"` + health check
3. Bekräfta 503 på platform-feedback (runtime av)
4. Ta bort eller kommentera raden efter test om normal drift ska läsa DB-flagga

**Obs:** Låt **inte** `PLATFORM_RUNTIME_ENABLED=false` ligga permanent om du vill testa med DB-flag ON — env vinner alltid.

---

## Test account

| Fält | Värde |
|------|-------|
| E-post | `Pontus@burman.cc` |
| Roll | Primär förälder i testfamilj |
| Barn | Minst ett barn med PIN och dagens schema |
| Enhet | Mobil (portrait) — primär användaryta |

**Endast denna familj** ska genomföra smoke. Andra konton ska inte medvetet testas under ON-fönstret.

---

## ON window (kort prod-test)

**Varaktighet:** Mål ≤15 minuter. **Max:** 30 minuter — stäng flaggan vid max även om smoke inte klart.

### SQL — slå ON (prod, endast under testfönster)

```sql
BEGIN;

UPDATE feature_flag
SET enabled = true
WHERE key = 'platform_runtime_enabled';

-- Om rad saknas (sällsynt):
-- INSERT INTO feature_flag (key, enabled, description)
-- VALUES ('platform_runtime_enabled', true, 'Platform Runtime — prod validation window')
-- ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled;

SELECT key, enabled FROM feature_flag WHERE key = 'platform_runtime_enabled';
-- Förväntat: enabled = true

COMMIT;
```

**Efter SQL:** vänta inte på omstart — flaggan läses per request. Notera **starttid** (UTC).

**Under ON:** ingen annan prod-test, ingen demo för externa, ingen “lämna på över lunch”.

---

## Smoke flow (`Pontus@burman.cc`)

Utför i ordning. Använd **riktig** prod (webb eller PWA). För “första completion”-copy: använd barn som **inte** nyligen haft first-success, eller acceptera att copy kan vara repeat — fokus är runtime-beteende, inte funnel-noll.

| # | Aktör | Steg | Var |
|---|-------|------|-----|
| 1 | Förälder | Logga in som `Pontus@burman.cc` | Prod |
| 2 | Förälder | Bekräfta Hem laddar utan fel | `/dashboard` |
| 3 | Barn | Logga in (PIN) som testbarn | Barnvy |
| 4 | Barn | Slutför **en** schemalagd aktivitet (markera klar) | Barnvy |
| 5 | Barn | Observera feedback | **Förväntat:** dopamin-burst (befintligt) + **morgon-whisper** längst ner — **inte** dubbel systemtoast med samma budskap |
| 6 | Förälder | Öppna Hem / vänta på parent-ack (poll ≤15s) | Parent |
| 7 | Förälder | Läs parent-ack modal | **Förväntat:** relief-first rubrik (t.ex. “Idag tog … sitt första steg”), CTA **“Det ser jag”**, ingen redundant aktivitetsrad under magisk rubrik |
| 8 | Förälder | Tryck “Det ser jag” | Parent |
| 9 | Förälder | Celebration | **Förväntat:** “Ni gjorde det tillsammans”-ton, inte stjärn-grind |
| 10 | Operatör | (Valfritt) `GET /api/me/platform-feedback` med barnsession | **Förväntat:** `200` med JSON (inte `503`) |
| 11 | Operatör | Notera avvikelser | Skriv tid + skärmdump |

**Vid minsta oväntade beteende hos icke-testfamilj:** avbryt smoke → gå till Rollback omedelbart.

---

## Expected results

| Kontroll | Runtime ON | Runtime OFF (efter rollback) |
|----------|--------------|------------------------------|
| Barn completion | Dopamin + whisper | Dopamin only; ingen runtime whisper |
| Parent ack copy | Pack-copy (relief-first) | Legacy registry-copy |
| Celebration | Pack `celebration_copy` | Legacy celebration |
| `GET /api/me/platform-feedback` | `200` | `503` + `Platform Runtime ej aktiverat` |
| `handleActivityComplete` (server) | Progression köad | `{ skipped: true, reason: 'runtime_disabled' }` |
| Övriga prod-familjer | **Kan** få runtime om de slutför under fönstret | Legacy beteende |

---

## Rollback (obligatorisk direkt efter smoke)

Kör **omedelbart** när smoke är klar — eller vid **första** avvikelse.

### 1. SQL — slå OFF

```sql
BEGIN;

UPDATE feature_flag
SET enabled = false
WHERE key = 'platform_runtime_enabled';

SELECT key, enabled FROM feature_flag WHERE key = 'platform_runtime_enabled';
-- Förväntat: enabled = false

COMMIT;
```

### 2. SQL — verifiera OFF

```sql
SELECT key, enabled
FROM feature_flag
WHERE key = 'platform_runtime_enabled';
```

**Godkänt:** exakt en rad, `enabled = false`.

### 3. Beteendeverifiering

- `GET /api/me/platform-feedback` → `503`
- Ny barn-completion i testfamilj → ingen ny runtime-whisper (legacy path)

### 4. Valfri testdata-rensning (endast testfamilj)

Kör **endast** om du vill återställa progression för upprepad first-success-smoke:

```sql
-- Ersätt <family_id> från Preconditions
DELETE FROM progression_event_queue WHERE family_id = '<family_id>';
DELETE FROM progression_feedback WHERE family_id = '<family_id>';
DELETE FROM child_progression_node WHERE family_id = '<family_id>';
```

---

## Emergency kill switch (nödbroms utan DB)

Använd när SQL inte går snabbt nog eller du vill garanterat stoppa all runtime.

### Steg

1. SSH till prod VPS
2. I app `.env` (samma katalog som deploy):

```bash
PLATFORM_RUNTIME_ENABLED=false
```

3. Omstart:

```bash
eval "${VPS_RESTART_CMD:-sudo systemctl restart app}"
sleep 3
curl -s http://127.0.0.1:3000/health
```

4. Verifiera `503` på `/api/me/platform-feedback`

**Efter incident:** sätt även DB-flaggan `enabled = false` när DB är tillgänglig. Ta bort env-raden `PLATFORM_RUNTIME_ENABLED=false` när normal drift ska styras enbart av DB (lämna flag OFF i DB).

**Prioritet vid panik:** env-broms först → DB OFF → analysera loggar.

---

## Post-test checks (inom 1 timme)

- [ ] SQL: `enabled = false` (se Verifiera OFF)
- [ ] Ingen kvarvarande `PLATFORM_RUNTIME_ENABLED=false` i `.env` om inte avsiktlig incident-broms
- [ ] `curl /health` OK
- [ ] Testfamilj kan använda appen normalt (legacy Journey)
- [ ] Inga supportärenden / felrapporter från andra familjer under testfönstret
- [ ] Loggar: sök `platform-runtime` för errors under fönstret
- [ ] Dokumentera: start/sluttid ON-fönster, resultat, avvikelser

---

## Decision: READY / NOT READY

Fyll i **efter** post-deploy OFF-verifiering och **före** ON-fönster.

### READY — öppna testfönster

Alla måste vara sant:

- [ ] Post-deploy SQL: `platform_runtime_enabled = false`
- [ ] `/health` healthy
- [ ] Testkonto `Pontus@burman.cc` + barn verifierat i prod
- [ ] Rollback-SQL och emergency kill switch dokumenterade och tillgängliga
- [ ] Operatör ensam ansvarig; tid utanför rusning
- [ ] Acceptans av global flag-risk (ingen per-family allowlist)

**Sign-off:** _______________ **Datum:** _______________

### NOT READY — kör inte ON-fönster

Något av:

- [ ] Flagga ON efter deploy utan plan
- [ ] Migration ej verifierad
- [ ] Ingen DB/SSH-åtkomst för rollback
- [ ] Testkonto eller barnschema saknas
- [ ] Rusningstid / hög trafik
- [ ] Osäkerhet kvar — **STOPPA**

**Åtgärd:** håll `enabled = false`; fixa blockerare; boka nytt fönster.

---

## SQL-snabbreferens

```sql
-- Kontrollera
SELECT key, enabled FROM feature_flag WHERE key = 'platform_runtime_enabled';

-- ON (endast under testfönster)
UPDATE feature_flag SET enabled = true WHERE key = 'platform_runtime_enabled';

-- OFF (rollback)
UPDATE feature_flag SET enabled = false WHERE key = 'platform_runtime_enabled';

-- Verifiera OFF
SELECT key, enabled FROM feature_flag WHERE key = 'platform_runtime_enabled';
```

---

## Vad som aldrig ska göras

- Permanent `enabled = true` i prod
- Bred “soft launch” eller wave-rollout i denna fas
- Ny per-family allowlist i PR #400
- Lämna flag ON över natten
- Fortsätta test efter avvikelse utan att stänga flaggan först
