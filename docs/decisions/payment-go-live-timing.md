# ADR — När vi slår på betalning

**Datum:** 2026-07-12  
**Status:** Proposed (produktlåsning)  
**Ägare:** Produkt  
**POS:** Constitution §1, 00A, G-01

**Relaterat:** [`successful-routine-days-north-star.md`](./successful-routine-days-north-star.md) · [`journey-event-first-onboarding.md`](./journey-event-first-onboarding.md)

---

## 1. Beslut i en mening

> **Betalning aktiveras när en betydande andel familjer har gjort appen till en vana — inte när tekniken är redo.**

| Triggas **inte** av | Triggas **av** |
|---------------------|----------------|
| App Store-godkännande | Återkommande användning (vana) |
| RevenueCat konfigurerat | Stabil eller förbättrad retention bland aktiverade |
| Perfekt onboarding | Köpintresse från familjer som redan ser värdet |
| Fler premiumfunktioner | Supportfrågor skiftar från “komma igång” till användning |

---

## 2. Tidsram — inte kalenderdatum

**Målperiod:** 6–12 veckor *aktivt arbete med aktivering och mätning* efter att onboarding-förbättringar är live.

- Inte “1 januari” eller “efter nästa release”
- En **mätningsperiod** där teamet optimerar mot NSM (Successful Routine Days) och leading indicators
- Beslut vid periodens slut (eller tidigare om signalerna är starka) — bedömning, inte automatisk grind

---

## 3. Bilden vi vill se (målområden, inte spärrar)

Inga KPI:er behöver vara perfekta. Ungefär den här bilden räcker för att **överväga** betalning:

| Signal | Målområde | Källa |
|--------|-----------|-------|
| **Aha** — första stjärnan | 25–30 % av nya familjer | `family_activation_state.first_completion_at` |
| **Habit** — vecka 2-vana | Tydlig kohort med ≥ 5 aktiva dagar under dag 8–14 | `daily_log_item` |
| **SRD** — fungerande rutin | NSM stiger vecka för vecka | `family_srd_days` (NSM-1) |
| **D14/D30** bland aktiverade | Stabil eller förbättras | `diagnose-churn.js`, activation retention |
| **Köpintresse** | Familjer klickar uppgradera / anmäler intresse | `interest_registered`, `upgrade_from_preview` |
| **Support** | Domineras av användning — inte “hur kommer jag igång?” | Manuell taggning / support-logg |

**Aha³** (enkät dag ~14: *"Har appen gjort vardagen lite enklare?"*) är stark bekräftelse men inte obligatorisk för start.

**Princip:** Beteende > köpintresse. Köpintresse utan vana är svag signal. Vana utan köpintresse kan fortfarande motivera försiktig lansering.

---

## 4. Vad vi inte väntar på

Dessa får **inte** blockera betalningslansering:

- Perfekt onboarding
- AI-funktioner
- Årsabonnemang (kan läggas till vecka 2–4 av betalningsrullning)
- Family+ / Skola / pedagogpaket
- Fler premiumfunktioner eller synliga paket

> Risken med “bara en sak till” är att skjuta den viktigaste valideringen: **kommer någon faktiskt att betala när vanan finns?**

---

## 5. Kommersiell modell vid go-live (låst från tidigare diskussion)

| Beslut | Värde |
|--------|-------|
| Ett abonnemang | Varumärket — allt ingår |
| Pris | 59 kr/mån (790/990 kr vid framtida prissteg med grandfathering) |
| Betalväg | RevenueCat / App Store / Play Store endast |
| Lifetime free | Tidsbegränsat intro (registrering före cutoff) — inte obegränsat |
| Synliga paket | Nej — komponenter internt (`requireComponent`) |

Årsplan (590 kr) kan aktiveras i samma veva eller vecka 2 av rullningen — inte förutsättning.

---

## 6. Gradvis rullning — inte 0 → 100 %

Nya familjer exponeras stegvis för betalnings-UI (`billing_rollout_pct` eller feature-flag-kohort):

| Vecka | Andel nya familjer som ser Premium |
|-------|-------------------------------------|
| 1 | 10 % |
| 2 | 25 % |
| 3 | 50 % |
| 4 | 100 % |

**Syfte:** Fånga oväntade effekter på onboarding, retention och support innan alla påverkas.

**Teknik:** Utöka befintlig `rollout_mode=purchase` med kohort-procent i `app_config` eller `family_features`. Admin sätter procent utan deploy.

**Övriga familjer:** Lifetime free / trial enligt befintlig policy tills de aktivt uppgraderar.

---

## 7. Om nästan ingen betalar

**Sänk inte priset först.**

Diagnostisera i ordning:

1. Nådde de **Aha²** (första belöningen)?
2. Använde de appen **flera dagar** (Habit / SRD)?
3. Såg de **värdet** (Aha³ positiv)?
4. Förstod de **varför** de skulle uppgradera (copy/erbjudande)?

Om svaren är nej → **produkt eller upplevelse**, inte prismodell.

Om svaren är ja men ingen betalar → då (och först då) testa pris, trial-längd eller erbjudande.

---

## 8. Investerar-testet

> *“Visa mig att 100 familjer använder appen varje vecka innan du visar mig att 100 familjer betalar.”*

Operationalisering:

| Mått | Definition |
|------|------------|
| **WAU (värde)** | Familjer med ≥ 1 completion eller SRD senaste 7 dagar |
| **Mål före betalning** | WAU ≥ 100 (eller trend mot det med stark NSM) |
| **Betalande** | Sekundärt utfall efter vana bevisad |

100 veckovana familjer → betydligt högre sannolikhet för växande betalande bas än 100 registreringar med betalvägg.

---

## 9. Beslutsflöde (sammanfattning)

```
Onboarding-förbättringar live
        ↓
6–12 veckor: mät NSM + leading indicators
        ↓
Ser vi “bilden”? (§3) ──nej──→ Fortsätt aktivering
        │
       ja
        ↓
rollout_mode = purchase
billing_rollout_pct = 10 % → 25 → 50 → 100
        ↓
Mät: konvertering, churn, support, SRD (får inte sjunka)
        ↓
Om konvertering låg → diagnostisera §7 (inte pris först)
```

---

## 10. Alternativ som avvisades

| Alternativ | Varför |
|------------|--------|
| Betalning vid App Store-godkännande | Teknik ≠ värdebevis |
| Vänta på perfekt produkt | Skjuter validering oändligt |
| 100 % betalvägg dag 1 | Fel signaler, supportrisk |
| Prissänkning som första åtgärd | Maskerar aktiveringsproblem |

---

## 11. Nästa steg

1. Godkänn detta ADR + [`successful-routine-days-north-star.md`](./successful-routine-days-north-star.md)
2. Kör NSM-1…NSM-5 (instrumentering)
3. Starta 6–12-veckors aktiveringssprint
4. Veckovis: NSM-rad + WAU + funnel i admin
5. Först därefter: `purchase` + gradvis `billing_rollout_pct`
