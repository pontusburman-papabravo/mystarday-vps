# Platform Runtime — staging rollout (testfamilj only)

> **Scope:** Proof of Product för PR #400. **Ingen bred produktions-rollout.**

Relaterat: [PROD-OPERATING-ENVELOPE.md](PROD-OPERATING-ENVELOPE.md) (kill switches), migration `1808950000000_platform_runtime.js`.

---

## Principer

| Miljö | `platform_runtime_enabled` | `PLATFORM_RUNTIME_ENABLED` (env) |
|-------|---------------------------|-----------------------------------|
| **Produktion** (live VPS / prod DB) | **OFF** (default, oförändrat) | unset eller `true` — env `false` är nödbroms |
| **Staging** (icke-prod DB/VPS) | ON **endast** under aktiv test | unset under normal test |

**Testfamilj:** `Pontus@burman.cc` — enda avsedda manuella testkontot i staging.

---

## Per-family allowlist — stöds inte (ännu)

`platform_runtime_enabled` läses från **`feature_flag`** (global boolean) i `src/lib/platform-runtime/orchestrator.js` — **inte** från `features` + `family_features`.

| System | Per-family? | Används av Platform Runtime? |
|--------|-------------|------------------------------|
| `feature_flag` (`platform_runtime_enabled`) | Nej — global ON/OFF | **Ja** |
| `features` + `family_features` (dev/live) | Ja — admin tilldelar familj | **Nej** (ej kopplat i PR #400) |

**Konsekvens:** I staging aktiveras runtime **globalt för hela staging-databasen**. Planen förutsätter att staging endast används med testfamiljen `Pontus@burman.cc`. Lägg **inte** till fler riktiga familjer på staging medan flaggan är ON.

Per-family allowlist för Platform Runtime är **framtida arbete** — bygg inte ad hoc i denna PR.

---

## Förutsättningar (staging)

- [ ] PR #400 mergad och deployad till **staging** (inte prod)
- [ ] Migration `1808950000000_platform_runtime` körd (`npm run migrate`)
- [ ] Verifiera default OFF efter migrate:

```sql
SELECT key, enabled FROM feature_flag WHERE key = 'platform_runtime_enabled';
-- Förväntat: enabled = false
```

- [ ] Testkonto `Pontus@burman.cc` finns i staging-DB med minst ett barn och aktivt schema

---

## Steg 1 — Hitta testfamiljens `family_id`

Kör på **staging-DB** (inte produktion):

```sql
SELECT p.id AS parent_id,
       p.email,
       p.family_id,
       f.name AS family_name
FROM parent p
JOIN family f ON f.id = p.family_id
WHERE LOWER(p.email) = LOWER('Pontus@burman.cc');
```

Spara `family_id` för verifiering i steg 4. Om ingen rad → skapa/registrera kontot i staging först.

---

## Steg 2 — Aktivera runtime (staging only)

**Endast på staging.** Kör **aldrig** detta mot produktion.

```sql
-- STAGING ONLY — aktiverar runtime för ALLA familjer i denna databas
UPDATE feature_flag
SET enabled = true
WHERE key = 'platform_runtime_enabled';

-- Verifiera
SELECT key, enabled FROM feature_flag WHERE key = 'platform_runtime_enabled';
-- Förväntat: enabled = true
```

Starta om appen på staging efter DB-ändring (cachad process kan ha läst flaggan vid boot):

```bash
# På staging-VPS (ej produktion utan explicit staging-miljö)
eval "${VPS_RESTART_CMD:-sudo systemctl restart app}"
sleep 3
curl -s http://127.0.0.1:3000/health
```

**Prod:** lämna `enabled = false`. Ingen SQL ovan på prod.

---

## Steg 3 — Manuell smoke (testfamilj)

Logga in som `Pontus@burman.cc` på staging:

| # | Steg | Förväntat |
|---|------|-----------|
| 1 | Barn slutför första aktivitet | Dopamin-burst (befintligt) + morgon-whisper (ej dubbel systemtoast) |
| 2 | Förälder ser parent-ack | Pack-copy: "Idag tog … sitt första steg." + CTA "Det ser jag" |
| 3 | Efter ack — celebration | Relief-first copy, inte stjärn-centrerad grind |
| 4 | `GET /api/me/platform-feedback` (barnsession) | 200 med feedback när runtime ON; 503 när OFF |
| 5 | Övriga familjer på staging | **Undvik** — flaggan är global i denna miljö |

---

## Steg 4 — Verifiera att endast testfamiljen testas

Runtime är global i staging-DB. Säkerställ isolering genom **process**, inte kod:

- [ ] Endast `Pontus@burman.cc` används för manuell smoke
- [ ] Inga andra testare på staging under flag ON
- [ ] Prod-DB har fortfarande `enabled = false` (separat kontroll):

```sql
-- PROD read-only check (förväntat false)
SELECT enabled FROM feature_flag WHERE key = 'platform_runtime_enabled';
```

---

## Rollback (staging eller nödfall prod)

Kör i **denna ordning**:

### 1. Stäng feature flag (DB)

```sql
UPDATE feature_flag
SET enabled = false
WHERE key = 'platform_runtime_enabled';

SELECT key, enabled FROM feature_flag WHERE key = 'platform_runtime_enabled';
-- Förväntat: enabled = false
```

### 2. Env-nödbroms (utan DB-åtkomst)

I staging/prod `.env`:

```bash
PLATFORM_RUNTIME_ENABLED=false
```

Starta om:

```bash
eval "${VPS_RESTART_CMD:-sudo systemctl restart app}"
sleep 3
curl -s http://127.0.0.1:3000/health
```

Env `false` vinner över DB även om någon råkat sätta `enabled = true`.

### 3. Beteende efter rollback

- `handleActivityComplete` → `{ skipped: true, reason: 'runtime_disabled' }`
- `/api/me/platform-feedback*` → 503
- Journey legacy registry-copy (parent-ack, celebration) — **ingen regression**

### 4. Rensa testdata (valfritt, staging)

```sql
-- Ersätt <family_id> från steg 1
DELETE FROM progression_event_queue WHERE family_id = '<family_id>';
DELETE FROM progression_feedback WHERE family_id = '<family_id>';
DELETE FROM child_progression_node WHERE family_id = '<family_id>';
```

---

## Vad som **inte** ingår

- Ingen prod-rollout (`UPDATE … enabled = true` på prod)
- Ingen wave/allfamilj-aktivering
- Ingen ny per-family flagga i denna PR
- Ingen admin-UI för runtime-rollout

---

## Kill switches (sammanfattning)

| Mekanism | Effekt |
|----------|--------|
| `feature_flag.platform_runtime_enabled = false` | Runtime inaktiv (default efter deploy) |
| `PLATFORM_RUNTIME_ENABLED=false` (env) | Tvingar av utan DB |
| Staging SQL `enabled = true` | Runtime på för hela staging-DB — testa endast med `Pontus@burman.cc` |
