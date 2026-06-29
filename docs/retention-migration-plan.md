# Retention — migrationsplan (ADR)

| | |
|--|--|
| **Status** | Accepted |
| **Gäller från** | 2026-06-29 |
| **Ersätter** | Win-back v1, Activation Program v1 (kommunikations- och segmenteringslogik) |
| **Typ** | Architecture Decision Record — normativt styrdokument |
| **Inte** | designspec, vision eller feature-backlog |

**Arkitekturmål:** All kommunikationslogik ska vara centraliserad. Ingen scheduler får implementera egen affärslogik eller segmentering.

**Grundprincip:** Family Journey äger användarens livscykel. Journey Gate äger beslutet om kommunikation. Alla andra komponenter är utförare, inte beslutsfattare.

---

## 1. Beslut

Dessa beslut gäller. De ska inte omförhandlas i varje PR.

1. **Family Journey är den enda auktoritativa källan** för en familjs livscykel och kommunikationsstatus (`SETTING_UP` … `CHURNED`).
2. **Journey Gate är den enda komponenten** som avgör om en retention-kommunikation får skickas (se §2).
3. **Alla nya automationer** ska läsa Journey Context — inte egna SQL-frågor om inaktivitet, segment eller fas.
4. **Legacy-schedulers får inte implementera egen segmenteringslogik.** De får finnas kvar tillfälligt men måste anropa Journey Gate innan utskick.
5. **Login är inte längre primär framgångsindikator.** North Star och retention-KPI bygger på **avbockningar** (produktvärde), inte inloggning.
6. **Ingen familj får ha två samtidiga retentionprogram.** Journey avgör vilket som gäller.
7. **Win-back v1 avvecklas.** Mejl till djupt inaktiva familjer med CTA till För dig har 0 % mätt effekt (prod 2026-06-29).
8. **Risk score byggs inte nu.** `AT_RISK` och `CHURNED` härleds med enkla regler (§3.2) tills datamängden motiverar modellering (~tusentals familjer).

---

## 2. Source of truth

All retention-logik ska följa denna kedja. Inget steg får hoppas över.

```
Family
  ↓
Journey Context          ← milestones, fas, derived state (AT_RISK / CHURNED)
  ↓
Journey Gate             ← tillåten kommunikation? (§2.1)
  ↓
Channels                 ← push, mejl, in-app (coach, banner, celebration)
```

**Fel (legacy):**

```sql
-- "Är användaren inaktiv i 18 dagar?"
SELECT ... FROM login_event WHERE occurred_at < NOW() - INTERVAL '18 days'
```

**Rätt:**

```js
const ctx = await buildContextForFamily(familyId);
// Journey äger: ctx.phase, derived AT_RISK / CHURNED (§3)
const decision = await journeyCommunicationGate(familyId, { channel: 'email', intent: 'retention' });
// Gate äger: decision.allowed, decision.reason
```

### 2.1 Journey Gate

**Journey Gate** är den enda komponenten som avgör om en kommunikation får skickas till en familj. Alla schedulers måste anropa Gate innan utskick.

| Ansvar | Ägare |
|--------|--------|
| Livscykelstatus (`SETTING_UP` … `CHURNED`) | **Journey** (milestones, faser, derived rules) |
| Beslut om utskick tillåtet | **Journey Gate** (läser Journey state + kommunikationspolicy §4) |
| Leverans (Resend, push, in-app-render) | **Utförare** (email.js, push-notifications, registry experiences) |

Gate returnerar minst: `{ allowed: boolean, reason: string, state: string }`.

**Tekniska ankare:**

| Lager | Modul |
|-------|--------|
| Milestones & fas | `db/family-milestones.js`, `src/lib/journey/ingest.js`, `src/lib/journey/phases.js` |
| Context & state | `src/lib/journey/context-builder.js`, `src/lib/journey/evaluator.js` |
| Gate (ska införas) | `src/lib/journey/communication-gate.js` |
| Experiences / in-app | `src/lib/journey/registry.js` |
| Push-UX | `src/lib/journey/push-projector.js` |

Tills Gate finns: **inga nya legacy-schedulers.**

---

## 3. Tillåtna states

### 3.1 Livscykelfaser

| State | Journey-fas / villkor | Betydelse |
|-------|------------------------|-----------|
| `SETTING_UP` | `SETTING_UP` | Konto/schema under uppbyggnad |
| `FIRST_USE` | `FIRST_USE` | Schema klart, väntar på första avbockning |
| `BUILDING_ROUTINE` | `BUILDING_ROUTINE` | Minst en lyckad interaktion, vana under uppbyggnad |
| `ESTABLISHED_ROUTINE` | `ESTABLISHED_ROUTINE` | Etablerad rutin (`established_routine` milestone) |
| `AT_RISK` | **Derived** — §3.2 | Tidigare aktiverad, tystnad |
| `CHURNED` | **Derived** — §3.2 | At risk utan återhämtning |

`AT_RISK` och `CHURNED` är **inte separata faser i databasen**. Journey härleder dem vid läsning. Gate konsumerar resultatet — Gate implementerar inte state-logiken.

### 3.2 Derived rules (inga risk score ännu)

**Aktivitet** = senaste `daily_log_item.completed` för familjen (primär). Login är diagnostik, inte primär signal.

```
AT_RISK =
  (minst en avbockning någonsin ELLER phase >= BUILDING_ROUTINE)
  OCH ingen avbockning senaste 7 hela dagar

CHURNED =
  AT_RISK
  OCH ingen avbockning senaste 30 hela dagar
```

Familjer som **aldrig** avbockat och varit tysta >30 dagar → `CHURNED` (ingen reaktiveringskampanj).

### 3.3 Kommunikation per state

Gate använder Journey state för att avgöra om kommunikation är tillåten:

| State | Push | Mejl | Primärt mål |
|-------|------|------|-------------|
| Setting Up | Ja | Ja | Första avbockning |
| First Use | Ja | Ja | Första avbockning + barnets första session |
| Building Routine | Ja | Nej* | Veckoaktivitet |
| Established | Ja | Nej* | 30-dagars aktivitet |
| At Risk | Ja | Ja (max 1) | Reaktivering till avbockning |
| Churned | Nej | Ett sista försök, sedan nej | Arkivera |

\*Mejl endast om push inte kan levereras och Gate uttryckligen tillåter det.

**CTA-regel:** Retention-kommunikation leder till **konkret handling** (schema, barnvy, avbockning) — inte generell landning eller För dig för icke-aktiverade familjer.

---

## 4. Kommunikationspolicy

1. **En familj, ett program.** Aldrig samtidiga motstridiga retention-utskick.
2. **Journey vinner.** Vid konflikt gäller Context (`recommended_experiences`, `blocking_experience`).
3. **Legacy måste anropa Gate.** `win-back-scheduler`, `activation-program-email-scheduler`, `activation-nudge-scheduler`, `retention-reengagement-scheduler` — inget utskick utan `allowed: true`.
4. **Cooldown.** Max ett retention-mejl per familj per 30 dagar. Max tre push per at-risk-episod (dag 3, 7, 14).
5. **Churned = tystnad** efter sista försök.
6. **Opt-out** alltid före Gate.

---

## 5. KPI

### North Star

> **Andel familjer med första avbockning inom 48 timmar efter registrering.**

Mätning: `family_activation_state.p0_activated_within_48h` / `child_first_completion` inom 48h.

**Prod baseline (2026-06-29):** ~0,5 % (1/198). Kvartalsmål: **dubbla**.

### Stödmått (diagnostik)

| Mått | Syfte |
|------|--------|
| ≥3 avbockningar första 7 dagar | Vana |
| Aktiv (avbockning) dag 30 | Retention |
| Aktiv (avbockning) dag 90 | Långsiktigt värde |

### Inte längre styr-KPI

Login, antal win-back-mejl, mejlöppning utan koppling till avbockning.

### Veckovis rutin

```bash
node scripts/diagnose-churn.js
```

---

## 6. Onboarding — lika viktigt som kommunikation

Vid ~1/198 P0 inom 48h är den största signalen troligen **friktion i första sessionen**, inte brist på mejl.

| Steg | Fråga | Datakälla |
|------|-------|------------|
| 1 | Schema skapat? | `schema_saved_at`, funnel |
| 2 | Barnets vy nådd? | `child_access_completed_at`, `child_logged_in` |
| 3 | Första aktivitet sedd? | `child_first_completion` |
| 4 | Avbockning? | `first_completion_at`, `daily_log_item` |
| 5 | Var faller de bort? | `db/activation-funnel.js` |

**Princip:** Stort drop-off före avbockning → prioritera onboarding-UX före fler utskick.

Family Journey ska göra fler familjer framgångsrika under **sina första två dygn**.

---

## 7. Legacy-avveckling

### Steg 1 — Stoppa legacy

```
☐ WIN_BACK_ENABLED=false
☐ ACTIVATION_PROGRAM_EMAIL_ENABLED=false
☐ retention_reengagement_v1 — endast ON när Gate äger dag 3/7/14
```

### Steg 2 — Migrera

```
☑ Journey Gate införd (src/lib/journey/communication-gate.js)
☑ derived-state (src/lib/journey/derived-state.js)
☑ Legacy-schedulers anropar Gate
☑ Gate använder Journey state (AT_RISK, CHURNED, etc.) för tillåtelsebeslut
☐ activation_program_new_enrollments förblir OFF
☐ activation_program_ui_removed förblir ON
```

### Steg 3 — Rensa

```
☐ win-back-scheduler borttagen eller no-op (env OFF räcker tillfälligt)
☐ activation-program-email-scheduler borttagen eller no-op
☑ Win-back CTA → dashboard (win-back-sender; mejlmall kan uppdateras)
☐ Login borttagen som primär KPI (admin email-logg / win-back-stats)
☑ Admin Start: North Star — P0 48h
```

---

## 8. Definition of Done

Migreringen är **klar** när alla punkter är sanna och verifierade i prod:

- [ ] Inga retention-utskick kan ske utan Journey Gate
- [ ] Inga schedulers innehåller egen segmenteringslogik
- [ ] Admin visar P0 48h som North Star
- [ ] Win-back- och activation-email-schedulers är borttagna eller no-op
- [ ] Journey ensam avgör familjens kommunikationsstatus; Gate ensam avgör utskick

---

## 9. Referenser

| Dokument / kod | Roll |
|----------------|------|
| `src/lib/journey/` | Journey-implementation |
| `docs/foraldaraktivering-7-dagar-spec.md` | Historik — Activation Program v1 |
| `scripts/diagnose-churn.js` | Veckovis diagnostik |
| `db/activation-funnel.js` | Onboarding-funnel |
| `docs/tillvaxt-retention-krav.md` | Äldre krav (ersatt av detta dokument) |

---

## 10. Icke-mål

Journey och Gate ska **inte** ansvara för:

- **Innehåll** i mejl eller push (copy, mallar, översättning) — det äger email/registry/UX-lager
- **Leverans** via e-post- eller push-leverantörer (Resend, APNs, FCM)
- **Experimentramverk** eller A/B-test (separat infrastruktur om det behövs)
- **Rapportering** utöver att exponera state, milestones och händelser för admin/analytics
- **Betalning, prenumeration eller paywall** — utanför retention-scope
- **Risk score / ML-modeller** — tills datamängd och behov motiverar det (§1.8)

Syftet är att Journey inte växer till ett "gudobjekt". Det äger livscykel och status. Gate äger kommunikationsbeslut. Resten är utförare.

---

*Revidera vid väsentlig ändring av North Star-baseline eller när Definition of Done (§8) är uppfylld.*
