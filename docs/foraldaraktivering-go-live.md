# Föräldraaktivering 7D — Go-live

**Status:** Fas 1–6C verifierad — redo för produktionsaktivering.  
**Beslut:** Endast produktägare aktiverar prod-flaggor.

**Relaterat:** [Contract § Go live](./foraldaraktivering-implementation-contract.md#go-live-sista-steg--obligatoriskt) · [Execution plan](./cursor-execution-plan.md) · [Invariants](./activation-program-invariants.md)

---

## 0. Dubbel grind (båda krävs)

| Variabel | Vid go-live | Effekt om saknas/false |
|----------|-------------|-------------------------|
| `ACTIVATION_PROGRAM_ENABLED` | `true` | Ingen banner, modal, val-skärm, enroll |
| `ACTIVATION_PROGRAM_LAUNCH_AT` | ISO 8601 UTC (fryses permanent) | Ingen enroll, inget e-postutskick |

Kod i `main` + migrerad DB **≠** live. Användare ser inget förrän båda är satta i prod.

---

## 1. Pre-flight (körs innan env sätts)

```bash
npm run lint
node --test test/activation-program*.test.js   # 106 tester
npm run verify:activation-go-live              # om DATABASE_URL finns: tabellcheck
```

Checklista (ska vara grön efter smoke 1–6c):

- [x] Fas 1–4: daglogik, banner, modal, onboarding-val (väg A)
- [x] Väg B: e-postmall + eligibility (7+ dagar inaktiv) + länk → val-skärm
- [x] Fas 5: push dag 2–7 (max 1/dag)
- [x] Fas 6A–6C: retention API + admin-vy
- [ ] Produktägare säger **go live** (detta dokument)

---

## 2. Sätt env i Render

**Var:** [Render Dashboard](https://dashboard.render.com) → din Web Service (`mystarday`) → **Environment**.

**Ordning:** Sätt alla variabler → **Manual Deploy** (eller vänta på auto-deploy från `main`) → verifiera med testkonto.

| Variabel | Go-live värde | Kommentar |
|----------|---------------|-----------|
| `ACTIVATION_PROGRAM_ENABLED` | `true` | Master switch |
| `ACTIVATION_PROGRAM_LAUNCH_AT` | *se nedan* | **Ändras ALDRIG efter första enroll** |
| `ACTIVATION_PROGRAM_EMAIL_ENABLED` | `true` | Väg B — daglig inbjudan till inaktiva |
| `ACTIVATION_PROGRAM_AB_ENABLED` | *(ej satt)* | **Inte** `true` vid launch — alla guided = treatment |
| `ACTIVATION_PROGRAM_EXPIRY_DAY` | `21` | Default |
| `ACTIVATION_PROGRAM_TREATMENT_PCT` | `50` | Gäller först när `AB_ENABLED=true` (ej nu) |
| `ACTIVATION_PROGRAM_SMOKE_TEST_DAYS` | `3` | Gäller först när A/B aktiveras |

### `ACTIVATION_PROGRAM_LAUNCH_AT`

Välj exakt UTC-tidpunkt för **första riktiga kohort-enroll**. Rekommendation: samma morgon som deploy, före första riktiga registrering eller första e-postbatch.

```bash
# Exempel: onsdag 11 juni 2026 kl 08:00 svensk sommartid (CEST)
ACTIVATION_PROGRAM_LAUNCH_AT=2026-06-11T06:00:00Z
```

---

## 3. Deploy

1. Merge + push till `main` (migrationer `179950…`–`179990…` körs via `npm run build` → `npm run migrate`)
2. Sätt env ovan i **Render → Environment**
3. **Deploy Latest** (vid behov: Clear build cache)
4. Valfritt — **Render Shell** (samma service):

```bash
node scripts/seed-features.js
npm run verify:activation-go-live
```

**Git:** push till `main` triggar deploy om auto-deploy är på. Env-ändringar kräver alltid ny deploy/omstart på Render.

---

## 4. Verifiera efter go-live (dag 0)

### Väg A — ny familj

1. Slutför onboarding → val-skärm visas
2. Välj **Ja, hjälp oss första veckan** → `activation_program_started` + `enroll_source: onboarding_complete`
3. Dashboard → banner (dag 1, inline preview)
4. Barn checkar av → celebratory modal → `child_first_completion` → `parent_first_completion_seen`

### Väg B — befintlig inaktiv

1. Familj med 7+ dagar utan förälder-login, har schema, ej aktivt program
2. E-post skickas (daglig scheduler) → klick → val-skärm
3. Välj guided → samma program som väg A, `enroll_source: email_reactivation`

### Väg A/B — "Vi kör själva"

- **Ingen** rad i `parent_activation_program`
- Vanlig dashboard

### Admin (internt)

- `/admin` → Aktiveringsprogram: funnel, Day 14, opportunity/conversion

### Analytics-kedja (minst ett komplett flöde)

```
activation_program_enroll_choice (guided)
  → activation_program_started
  → activation_program_first_banner_seen
  → child_first_completion
  → parent_first_completion_seen
```

---

## 5. Vad som är förbjudet

| ❌ | Varför |
|----|--------|
| Ändra `LAUNCH_AT` efter första enroll | Invariant #13 — förorenar kohort |
| `ACTIVATION_PROGRAM_AB_ENABLED=true` vid launch | Contract — ingen slump-A/B förrän inflöde motiverar |
| Tyst enroll utan val-skärm | Contract — båda vägar kräver aktivt val |
| Maila familjer med login <7 dagar | Eligibility — aktiva familjer |
| `ENABLED=false` mitt i kohort | Förstör uppföljning |

---

## 6. Rollback (nödfall)

```bash
ACTIVATION_PROGRAM_ENABLED=false
# ACTIVATION_PROGRAM_EMAIL_ENABLED=false  (valfritt — stoppar väg B)
```

Stoppar ny enroll, banner och utskick. Befintliga programrader påverkas inte.

---

## 7. North Star (oförändrad)

**Family Day 14 retention** — `parent_login` OR `child_completion` dag **13–15** från `started_at` (familj timezone). Jämför guided vs "Vi kör själva" (observationell tills A/B aktiveras).

---

## 8. Senare (ej vid go-live)

- Slumpmässig A/B (`ACTIVATION_PROGRAM_AB_ENABLED=true`) när inflödet motiverar
- `reactivation_3d` — separat beslut
