# ADR — North Star: Successful Routine Days

**Datum:** 2026-07-12  
**Status:** Proposed (produktlåsning)  
**Ägare:** Produkt  
**POS:** Constitution §1 (one next step), 00A (lugn morgon), G-01 (reality before celebration)

**Relaterat:** [`journey-event-first-onboarding.md`](./journey-event-first-onboarding.md) · [`first-success/brain.md`](../first-success/brain.md) (`full_routine`, `COMPLETE_DAY`) · [`tillvaxt-retention-krav.md`](../tillvaxt-retention-krav.md)

**Ersätter som primär styrning:** “Aktivering → betalning” som huvudtratt. Betalning är **lagging indicator**, inte optimeringsmål.

---

## 1. Produktfilosofi

> **Vi säljer en fungerande vardag — inte funktioner.**

| ❌ Fel optimering | ✅ Rätt optimering |
|------------------|-------------------|
| Fler klick | Fler fungerande vardagar |
| Fler stjärnor | Färre konflikter i verkligheten |
| Fler abonnemang | Fler morgnar utan tjat |
| “Vilken funktion ska vara premium?” | “Upplever familjen att vardagen blev enklare?” |

Klassiska North Stars mäter **värde levererat**, inte retention:

| Produkt | North Star (värde) |
|---------|-------------------|
| Spotify | Tid lyssnad |
| Airbnb | Bokade nätter |
| Slack | Meddelanden mellan team |
| Familjerutin-appen | **Successful Routine Days** |

**Vana** är den bästa *ledande* indikatorn på att värdet uppstår — men vana är ett medel, inte målet.

---

## 2. North Star Metric (NSM)

### 2.1 Definition

**Successful Routine Day (SRD)** — en kalenderdag där en familjs planerade rutin **faktiskt fungerade i verkligheten**.

Inte:

- en enskild stjärna
- 4 av 8 aktiviteter
- en completion i databasen utan sammanhang

Utan:

> Samtliga planerade aktiviteter i rutinblocket genomförda samma dag (v1: ankarsektion; v2: hel dag).

**Exempel (morgon):**

```
✅ klär på sig
✅ borstar tänderna
✅ packar väskan
✅ äter frukost
→ Morgonen fungerade.
```

### 2.2 NSM-formel (veckovis)

**Primär dashboard-rad:**

```
NSM = genomsnittligt antal Successful Routine Days per aktiv familj och vecka
```

| Term | Definition |
|------|------------|
| **Aktiv familj** | Minst en `login_event` eller barn-`completion` under veckan |
| **SRD för familj** | Minst ett barn uppfyller SRD-kriteriet den dagen |
| **Vecka** | ISO-vecka, familjens `timezone` |

**Sekundär NSM (andelsmått):**

```
SRD-adoption = andel aktiva familjer med ≥ 1 SRD under veckan
```

Rapportera båda. Primär rad = SRD/familj/vecka. Sekundär = hur många som någonsin upplever en hel rutin.

### 2.3 SRD-scope (versioner)

Full dag är målet. Morgon är ofta första beviset. Definiera scope explicit så teamet inte mäter fel sak.

| Version | Scope | När använda |
|---------|-------|-------------|
| **SRD-Morgon (v1)** | Alla `daily_log_item` i sektion `morgon` completed; `daily_log.is_paused = false` | **Lansering** — närmast produktlöftet, ofta första rutinblocket |
| **SRD-Heldag (v2)** | Alla sektioner (`morgon` + `dag` + `kvall`) completed samma datum | När SRD-Morgon-baseline > 10 % — då lyft NSM till hel dag |
| **SRD-Tidsfönster (v3)** | v2 + varje item completed innan `end_time` (familjens TZ) | När tillräckligt många aktiviteter har tider satta |

**Familjenivå:** Ett barn räcker för familj-SRD (primärbarn / första barn med schema). Rapportera även per-barn för diagnostik.

**Uteslut:** `is_paused = true` dagar; tomma loggar (0 planerade items); datum utan schema (helgdag utan log genereras ej SRD).

---

## 3. Indikatorstack — inte en platt lista

```
                    ┌─────────────────────────┐
                    │  NSM: Successful        │
                    │  Routine Days / v / fam │
                    └───────────▲─────────────┘
                                │
                    ┌───────────┴─────────────┐
                    │  Habit (ledande)        │
                    │  ≥5 aktiva dagar v2     │
                    └───────────▲─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
    ┌─────────┴────────┐ ┌──────┴──────┐ ┌───────┴────────┐
    │ Aha² (barn)      │ │ Aha³ (vuxen)│ │ Household      │
    │ första inlösen   │ │ enkät d14   │ │ 2 vuxna+barn   │
    └─────────▲────────┘ └──────▲──────┘ └───────▲────────┘
              │                 │                 │
              └─────────────────┼─────────────────┘
                                │
                    ┌───────────┴─────────────┐
                    │  Aha (ledande)          │
                    │  första completion      │
                    └───────────▲─────────────┘
                                │
                    ┌───────────┴─────────────┐
                    │  Signup                 │
                    └─────────────────────────┘
```

### 3.1 Leading indicators

| ID | Namn | Definition | Källa idag |
|----|------|------------|------------|
| **Aha** | Första stjärnan | `family_activation_state.first_completion_at` satt | ✅ `family_activation_state` |
| **Aha²** | Första belöning | Första `reward_redemption` med `status IN ('approved','completed')` och `redeemed_at` satt | ⚠️ Data finns; kolumn saknas |
| **Habit** | Vecka 2-vana | ≥ 5 distinkta completion-dagar under dag 8–14 efter signup | ⚠️ Beräknas från `daily_log_item` |
| **Household** | Hushållssystem | ≥ 2 vuxna med `login_event` + ≥ 1 barn-completion, samma 14d-fönster | ⚠️ Delvis i `db/analytics.js` |
| **Aha³** | Vardagen enklare | Enkät dag ~14: *"Har appen gjort vardagen lite enklare?"* | ❌ Ej byggt |

**Aha²** är barnets emotionella bevis (*"jag fick fredagsmys"*). Starkare long-term-signal än första stjärnan.

**Aha³** är förälderns bevis (*"jag behövde inte tjata idag"*). Går inte att läsa ur DB — kräver mikroundersökning.

### 3.2 Lagging indicators

| ID | Definition | Roll |
|----|------------|------|
| **D30 / D90** | Familj aktiv (login eller completion) 30/90 dagar efter signup | Bekräftar att NSM korrelerar med retention |
| **Subscription** | Betalande familjer / aktiva | Affärsutfall — inte optimeringsmål |
| **Churn** | Inaktiv 30d+ | Symptom — fråga *varför SRD sjönk* |

### 3.3 Sekundär signal (inte go/no-go)

| Signal | Roll |
|--------|------|
| `interest_registered` | Tidig köpintention — **informativ**, inte spärr |
| `upgrade_from_preview` | Köp påbörjat — endast i `purchase`-fas |

**Princip:** 60 % som använder appen fyra veckor i rad > 15 % som klickar "jag vill köpa".

---

## 4. Aha³ — mikroundersökning (dag ~14)

### 4.1 Trigger

- Familj äldre än 12 dagar
- Minst en completion (Aha uppnådd)
- Max en gång per familj per 90 dagar

### 4.2 Copy

> **Har appen gjort vardagen lite enklare?**

| Svar | Kod |
|------|-----|
| Ja, mycket | `much_easier` |
| Ja, lite | `little_easier` |
| Ingen skillnad | `no_difference` |
| Nej | `no` |

### 4.3 Lagring (förslag)

```sql
CREATE TABLE IF NOT EXISTS family_value_survey (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  parent_id   UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
  survey_key  TEXT NOT NULL DEFAULT 'day14_easier',
  response    TEXT NOT NULL CHECK (response IN (
    'much_easier', 'little_easier', 'no_difference', 'no'
  )),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (family_id, survey_key)
);
```

**KPI:** `aha3_positive_rate` = andel `much_easier` + `little_easier` bland svarande.

---

## 5. Teknisk implementation

### 5.1 `family_activation_state` — nya kolumner

| Kolumn | Sätts när |
|--------|-----------|
| `first_redemption_at` | Första godkända inlösen |
| `first_srd_morgon_at` | Första SRD-Morgon |
| `first_srd_fullday_at` | Första SRD-Heldag (v2) |
| `aha3_response` | Enkät besvarad (denormaliserat för funnel) |
| `aha3_responded_at` | Tidsstämpel |

Uppdateras via midnight job eller event-hook vid completion/inlösen — samma mönster som `first_completion_at`.

### 5.2 SRD-Morgon — referens-SQL

```sql
-- Per barn + datum: är morgonrutinen klar?
WITH morgon AS (
  SELECT
    dl.child_id,
    dl.date,
    c.family_id,
    COUNT(*) FILTER (WHERE dli.completed) AS done,
    COUNT(*) AS total
  FROM daily_log dl
  JOIN child c ON c.id = dl.child_id
  JOIN daily_log_item dli ON dli.daily_log_id = dl.id
  WHERE dl.is_paused = false
    AND dli.section = 'morgon'
  GROUP BY dl.child_id, dl.date, c.family_id
  HAVING COUNT(*) > 0
)
SELECT child_id, date, family_id
FROM morgon
WHERE done = total;
```

**Familj-SRD per dag:** `EXISTS` minst ett barn som uppfyller ovan.

**Veckans NSM:**

```sql
-- SRD per aktiv familj per ISO-vecka (förenklad)
SELECT
  family_id,
  date_trunc('week', date)::date AS week,
  COUNT(DISTINCT date) AS srd_days
FROM family_srd_days  -- materialiserad vy eller nattlig tabell
GROUP BY family_id, week;
```

Rekommendation: materialiserad `family_srd_days (family_id, date, scope)` uppdaterad av midnight scheduler — undvik tung join i admin-dashboard.

### 5.3 Analytics-events (nya)

| Event | Metadata | Syfte |
|-------|----------|-------|
| `srd_morgon_achieved` | `{ child_id, date }` | Första gången + trend |
| `srd_fullday_achieved` | `{ child_id, date }` | v2 NSM |
| `aha2_first_redemption` | `{ child_id, reward_id }` | Aha² funnel |
| `aha3_survey_answered` | `{ response }` | Aha³ |

### 5.4 Admin dashboard — veckovis layout

```
┌─────────────────────────────────────────────────────────────┐
│ NSM  SRD / aktiv familj / vecka        1.4    (↑ från 0.9) │
│      SRD-adoption (≥1 SRD/vecka)       22 %   (↑ från 18 %) │
├─────────────────────────────────────────────────────────────┤
│ Leading                                                     │
│   Aha (första stjärna)                 24 %                 │
│   Aha² (första inlösen)                11 %                 │
│   Habit (5 dagar v2)                   14 %                 │
│   Household (2 vuxna + barn)            8 %                 │
│   Aha³ positiv (enkät)                 67 %  (n=45)         │
├─────────────────────────────────────────────────────────────┤
│ Lagging                                                     │
│   D30 (aktiverade)                     28 %                 │
│   Intresse-CTA (sekundär)               4 %                 │
└─────────────────────────────────────────────────────────────┘
```

### 5.5 Koppling till Product Brain

[`first-success/brain.md`](../first-success/brain.md) har redan:

- `first_success_kind`: `star` | `full_routine` | `smooth_morning`
- `primaryNeed`: `COMPLETE_DAY`

**SRD är den operativa definitionen av `full_routine`/`COMPLETE_DAY`.** Brain och NSM ska konvergera — inte divergera.

---

## 6. Målområden (mjuka trösklar)

Inte hårda spärrar. Go-live och feature-beslut är **bedömning**.

| Målområde | Grönt | Gult (överväg) | Rött |
|-----------|-------|----------------|------|
| SRD-Morgon / aktiv fam / v | ≥ **1.0** | 0.5–0.9 + Aha³ > 60 % | < 0.5 |
| SRD-adoption | ≥ **20 %** | 12–19 % | < 12 % |
| Aha (första stjärna) | ≥ 25 % | 20–24 % + stark SRD | < 20 % |
| Aha² (första inlösen) | ≥ 15 % av aktiverade | 10–14 % | < 10 % |
| Habit (5 dagar v2) | ≥ 15 % | 10–14 % + NSM ↑ | < 10 % |
| Aha³ positiv | ≥ **55 %** | 45–54 % | < 45 % |
| Intresse-CTA | informativt | informativt | — |

**Exempel gult köp-läge:** Aha 23 %, men SRD/vecka 1.2, Aha³ 62 %, D30 dubblad → vana och upplevt värde bevisade; betalning kan aktiveras medan aktivering fortsätter optimeras.

---

## 7. Marknadsföring & copy

NSM gör copy enkel — ni säljer utfall, inte features:

| ❌ Sälj inte | ✅ Sälj istället |
|-------------|-----------------|
| Schema-app | Fler morgnar utan tjat |
| Belöningssystem | En fungerande vardag — tillsammans |
| Stjärnor & statistik | Mindre tjat. Lugnare morgnar. |
| Premium / paket | Varumärket — 59 kr/mån |

App Store, landningssida, betalvägg och coach ska använda samma löfte. NSM är det interna måttet på att löftet hålls.

---

## 8. Prioritering — pausa betalpaket

**Rekommendation:** Pausa arbete med fler betalpaket/SKU:er. Lägg nästa sprint på:

| Epic | Leverans |
|------|----------|
| **NSM-1** | `family_srd_days` materialisering + SRD-Morgon SQL |
| **NSM-2** | `first_redemption_at` + Aha² i activation state |
| **NSM-3** | Admin dashboard-rad (NSM + leading stack) |
| **NSM-4** | Aha³ enkät (dag 14, en fråga) |
| **NSM-5** | `scripts/diagnose-srd.js` (read-only, som `diagnose-churn.js`) |

Betalnings-ADR:er (ett abonnemang, prisstege, tidsbegränsat lifetime) förblir giltiga — men **implementeras efter NSM-baseline finns**.

---

## 9. Alternativ som avvisades

| Alternativ | Varför |
|------------|--------|
| **Vana som NSM** | Medel, inte värde — en familj kan öppna appen dagligen utan att rutinen fungerar |
| **Första stjärna som NSM** | För låg tröskel — en completion ≠ fungerande morgon |
| **DAU / WAU** | Aktivitet utan kvalitet |
| **Betalande som NSM** | Optimerar fel sak; korrelerar med vana, inte orsakar den |
| **Intresse-CTA som go/no-go** | Säger vilja, inte beteende |
| **5 completions vecka 2** | Räknar aktivitet, inte fungerande rutin |

---

## 10. Nästa steg

1. **Produkt:** Godkänn ADR (status → Accepted)
2. **Engineering:** NSM-1–NSM-5 enligt §8
3. **Mät 4 veckor** baseline innan köp-live-beslut
4. **Uppdatera** `tillvaxt-retention-krav.md` North Star-rad till SRD
5. **Skriv** kommersiella ADR:er (ett abonnemang, prisstege) — sekundärt till detta dokument

---

## Bilaga A — Ordlista

| Term | Betydelse |
|------|-----------|
| **SRD** | Successful Routine Day — rutinblocket klart |
| **NSM** | SRD per aktiv familj per vecka |
| **Aha** | Första completion |
| **Aha²** | Första godkända belöning (barn) |
| **Aha³** | Förälder: "vardagen blev enklare" (enkät) |
| **Habit** | ≥ 5 aktiva dagar under vecka 2 |
| **Household** | Två vuxna + barn aktivt i samma system |
