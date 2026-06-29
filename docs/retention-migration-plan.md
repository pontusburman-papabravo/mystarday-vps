# Retention — migrationsplan

**Status:** Gällande styrdokument  
**Datum:** 2026-06-29  
**Syfte:** Beskriver vilken retention-arkitektur som gäller från och med nu.  
**Inte:** designspec, vision eller backlog för nya features.

---

## 1. Beslut

Dessa beslut gäller. De ska inte omförhandlas i varje PR.

1. **Family Journey är den enda auktoritativa källan** för en familjs livscykel, tillåten kommunikation och tillåtna automationer.
2. **Alla nya automationer** (push, mejl, in-app) ska läsa **Journey Context** — inte egna SQL-frågor om inaktivitet, segment eller fas.
3. **Legacy-schedulers får inte implementera egen segmenteringslogik.** De får finnas kvar tillfälligt men måste fråga Journey Gate innan utskick.
4. **Login är inte längre primär framgångsindikator.** North Star och retention-KPI bygger på **avbockningar** (produktvärde), inte inloggning.
5. **Ingen familj får ha två samtidiga retentionprogram.** Journey avgör vilket som gäller.
6. **Win-back i nuvarande form avvecklas.** Mejl till djupt inaktiva familjer med CTA till För dig har 0 % mätt effekt (prod 2026-06-29) och ska inte köras vidare.
7. **Risk score byggs inte nu.** `AT_RISK` och `CHURNED` definieras med enkla derived rules tills datamängden motiverar modellering (ordningstorlek: tusentals familjer, inte ~200).

---

## 2. Source of truth

All retention-logik ska följa denna kedja. Inget steg får hoppas över.

```
Family
  ↓
Journey Context          ← buildContextForFamily() + milestones + evaluator
  ↓
Derived State          ← fas + AT_RISK / CHURNED (derived, inte parallella program)
  ↓
Allowed Communications ← registry + kommunikationspolicy (§4)
  ↓
Channels               ← push, mejl, in-app (coach, banner, celebration)
```

**Fel (legacy):**

```sql
-- "Är användaren inaktiv i 18 dagar?"
SELECT ... FROM login_event WHERE occurred_at < NOW() - INTERVAL '18 days'
```

**Rätt:**

```js
const ctx = await buildContextForFamily(familyId);
// derivedState = ctx.phase + risk derivation (§3)
// allowed = journeyCommunicationGate(ctx)
```

**Tekniska ankare i kodbasen:**

| Lager | Modul |
|-------|--------|
| Milestones & fas | `db/family-milestones.js`, `src/lib/journey/ingest.js`, `src/lib/journey/phases.js` |
| Context | `src/lib/journey/context-builder.js`, `src/lib/journey/evaluator.js` |
| Experiences | `src/lib/journey/registry.js` |
| Push | `src/lib/journey/push-projector.js` (ska vara enda stället för push-UX-regler) |

**Journey Gate (ska införas):** tunn funktion som legacy-schedulers anropar. Returnerar `{ allowed: boolean, reason, derivedState }`. Tills den finns: inga nya legacy-schedulers.

---

## 3. Tillåtna states

### 3.1 Livscykelfaser (befintliga + derived)

Journey-faser (redan i prod) mappas till operativa states:

| State | Journey-fas / villkor | Betydelse |
|-------|------------------------|-----------|
| `SETTING_UP` | `SETTING_UP` | Konto/schema under uppbyggnad |
| `FIRST_USE` | `FIRST_USE` | Schema klart, väntar på första avbockning |
| `BUILDING_ROUTINE` | `BUILDING_ROUTINE` | Minst en lyckad interaktion, vana under uppbyggnad |
| `ESTABLISHED_ROUTINE` | `ESTABLISHED_ROUTINE` | Etablerad rutin (`established_routine` milestone) |
| `AT_RISK` | **Derived** — se §3.2 | Tidigare aktiverad, tystnad |
| `CHURNED` | **Derived** — se §3.2 | At risk utan återhämtning, arkivera kommunikation |

`AT_RISK` och `CHURNED` är **inte separata Journey-faser** i databasen. De härleds vid läsning från milestones + senaste avbockning.

### 3.2 Derived rules (inga risk score ännu)

**Aktivitet** = senaste `daily_log_item.completed` för familjen (primär), kompletterat med relevanta milestones. Login räknas som diagnostik, inte som primär signal.

```
AT_RISK =
  (minst en avbockning någonsin ELLER phase >= BUILDING_ROUTINE)
  OCH ingen avbockning senaste 7 hela dagar

CHURNED =
  AT_RISK
  OCH ingen avbockning senaste 30 hela dagar
```

Familjer som **aldrig** gjort en avbockning och varit tysta >30 dagar klassas som `CHURNED` (kommunikation stoppas) — de ingår inte i reaktiveringsprogram.

### 3.3 Kommunikation per state

| State | Push | Mejl | Primärt mål |
|-------|------|------|-------------|
| Setting Up | Ja | Ja | Första avbockning |
| First Use | Ja | Ja | Första avbockning + barnets första session |
| Building Routine | Ja | Nej* | Veckoaktivitet, förstärk vana |
| Established | Ja | Nej* | 30-dagars aktivitet |
| At Risk | Ja | Ja (max 1) | Reaktivering till avbockning |
| Churned | Nej | Ett sista försök, sedan nej | Arkivera — ingen vidare automation |

\*Mejl endast om push inte går att leverera (ingen token / opt-out) och Journey uttryckligen rekommenderar det.

**CTA-regel:** All retention-kommunikation ska leda till **konkret handling** (dagens schema, barnets vy, första avbockning) — inte generell landning eller För dig om familjen inte redan är aktiverad.

---

## 4. Kommunikationspolicy

1. **En familj, ett program.** Aldrig samtidigt: win-back + aktiveringsprogram-e-post + retention-push + Journey coach med motstridiga budskap.
2. **Journey vinner.** Vid konflikt gäller `recommended_experiences` / blocking experience från Context.
3. **Legacy måste fråga.** Schedulers som `win-back-scheduler`, `activation-program-email-scheduler`, `activation-nudge-scheduler` och `retention-reengagement-scheduler` får inte skicka utan Journey Gate-godkännande.
4. **Cooldown.** Max ett retention-mejl per familj per 30 dagar. Max tre push-försök per at-risk-episod (dag 3, 7, 14).
5. **Churned = tystnad.** Efter ett sista mejl (eller utebliven respons) inga fler automatiska utskick. Familjen finns kvar i data men inte i aktiva kampanjer.
6. **Opt-out respekteras.** `notification_preference`, `email_enabled`, push-preferences — alltid före Gate.

---

## 5. KPI

### North Star (enda mål som styr prioritering)

> **Andel familjer med första avbockning inom 48 timmar efter registrering.**

Mätning: `family_activation_state.p0_activated_within_48h` (eller ekvivalent milestone `child_first_completion` inom 48h).

**Prod baseline (2026-06-29):** ~0,5 % (1/198). Kvartalsmål: **dubbla** — sedan iterera.

### Stödmått (diagnostik, inte styrning)

| Mått | Varför |
|------|--------|
| Minst 3 avbockningar första 7 dagar | Vana |
| Aktiv (avbockning) dag 30 | Retention |
| Aktiv (avbockning) dag 90 | Långsiktigt värde |

### Inte längre styr-KPI

- Login inom 7/14 dagar som primär win-back-metric
- Antal skickade win-back-mejl
- Öppningsgrad mejl utan koppling till avbockning

### Veckovis rutin

Kör på prod-VPS i app-katalogen:

```bash
node scripts/diagnose-churn.js
```

Följ särskilt retention wall: aktiverade vs icke-aktiverade familjer (14d).

---

## 6. Onboarding — lika viktigt som kommunikation

Kommunikationsmotorn löser inget om familjen faller bort **innan** första avbockningen.

Vid ~1/198 P0 inom 48h är den största produktsignalen troligen **friktion i första sessionen**, inte brist på mejl.

**Obligatorisk analys (minst månatligen):**

| Steg | Fråga | Datakälla |
|------|-------|------------|
| 1 | Hur många skapar schema? | `family_activation_state.schema_saved_at`, funnel |
| 2 | Hur många når barnets vy? | `child_access_completed_at`, `child_logged_in` milestone |
| 3 | Hur många ser första aktiviteten? | Barnvy-session, `child_first_completion` |
| 4 | Hur många bockar av? | `first_completion_at`, `daily_log_item` |
| 5 | Var faller de bort? | `db/activation-funnel.js`, admin activation cohort |

**Princip:** Om funnel visar stort drop-off före avbockning — prioritera UX i onboarding/barnvy före fler retention-utskick.

Family Journey ska göra fler familjer framgångsrika under **sina första två dygn** — inte bara skicka fler påminnelser till familjer som redan lämnat.

---

## 7. Legacy-avveckling

Checklista. Inget punkt är "klart" förrän verifierat i prod.

```
☐ WIN_BACK_ENABLED=false (env)
☐ ACTIVATION_PROGRAM_EMAIL_ENABLED=false (env)
☐ retention_reengagement_v1 — endast ON efter Journey Gate äger dag 3/7/14
☐ CTA "Utforska För dig" borttagen från win-back-mall (eller hela mallen borttagen)
☐ activation_program_new_enrollments förblir OFF
☐ activation_program_ui_removed förblir ON
☐ Journey Gate införd — legacy schedulers anropar den
☐ Login som primär KPI borttagen från admin email-logg / win-back-stats
☐ Admin dashboard: en rad North Star (P0 48h %)
☐ win-back-scheduler borttagen eller no-op
☐ activation-program-email-scheduler borttagen eller no-op
☐ Dokumentera att AT_RISK/CHURNED derived rules är implementerade i Gate
```

**Ordning:** stäng av utskick (env) → inför Gate → ta bort kod → uppdatera dashboard.

---

## 8. Vad vi inte gör (nästa kvartal)

- Ny win-back-copy eller A/B-test mot För dig
- Risk score 0–100 utan prediktionsdata
- Fler parallella retention-program
- Nya mejl-schedulers med egen SQL-segmentering
- Retroaktiv enroll av befintliga churnade familjer i 7-dagarsprogrammet

---

## 9. Referenser

| Dokument / kod | Roll |
|----------------|------|
| `src/lib/journey/` | Journey-implementation |
| `docs/foraldaraktivering-7-dagar-spec.md` | Historik — activation program (avvecklas) |
| `scripts/diagnose-churn.js` | Veckovis retention-diagnostik |
| `db/activation-funnel.js` | Onboarding-funnel |
| `docs/tillvaxt-retention-krav.md` | Bakgrund och äldre krav |

---

*Revidera detta dokument när legacy-checklistan är helt avbockad eller när North Star-baseline ändras väsentligt.*
