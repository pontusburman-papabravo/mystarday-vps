# Cursor Execution Plan

Regel:

Implementera aldrig mer än en fas åt gången.

Begär alltid plan innan kod skrivs.

**Go live först efter Fas 6C** — inget till användare (föräldrar) förrän produktägare säger till. Se [contract § Go live](./foraldaraktivering-implementation-contract.md#go-live-sista-steg--obligatoriskt).

**Relaterat:** [Implementation contract](./foraldaraktivering-implementation-contract.md) · [Invariants](./activation-program-invariants.md) · [Spec](./foraldaraktivering-7-dagar-spec.md)

---

# Fas 1

Mål:

Datamodell och daglogik.

Skapa:

- migration
- parent_activation_program
- parent_seen_completion
- activation-program.js
- activation-program-enroll.js

Implementera:

- getCalendarDay()
- getEffectiveProgramDay()
- maybeExpireProgram()
- assignCohortArm()

Tester:

- DST
- midnight rollover
- day cap

Klart när:

alla tester passerar.

---

# Fas 2

Mål:

Aha tracking.

Implementera:

child_first_completion

parent_first_completion_seen

hours_since_completion

celebratory modal

Klart när:

första completion kan trigga modal.

---

# Fas 3

Mål:

Banner.

Implementera:

dashboard-banner

inline preview

day advancement

reflection UI

Klart när:

hela dag 1–7 kan visas.

---

# Fas 4

Mål:

Enrollment via föräldraval.

Implementera:

onboarding-val-skärm (copy i contract § Onboarding-val) — väg A

e-postinbjudan + eligibility (7+ dagar inaktiv, ej aktiva) — väg B

samma val-skärm från e-postlänk

enroll_source (onboarding_complete | email_reactivation)

onboarding hook + e-postlänk-hook (guided → enroll, direct → ingen rad)

feature flags

launch cutoff

activation_program_enroll_choice

activation_program_email_invite_sent / clicked

Klart när:

nya familjer (väg A) och inaktiva befintliga via e-post (väg B) kan välja ja/nej.

Ingen A/B vid launch — `cohort_arm = treatment` för alla som väljer ja.

---

# Fas 5

Mål:

Push scheduler.

Implementera:

dag 2–7 push (max 1/dag)

activation_program_push_sent / clicked

använder getEffectiveProgramDay() — aldrig last_seen_day

Klart när:

push triggas korrekt per programdag i staging.

---

# Fas 6A

Mål:

Retention engine.

Implementera:

Day 14

Day 30

Day 60

retention calculations (activation-program-retention.js)

Klart när:

Family Day 14-beräkning matchar låst definition (dag 13–15).

---

# Fas 6B

Mål:

Analytics API.

Implementera:

opportunity rate

conversion rate

retention wall

GET /api/admin/activation-program/retention

Klart när:

admin-API returnerar korrekta kohorttal (även om UI kommer i 6C).

---

# Fas 6C

Mål:

Admin UI.

Implementera:

dashboard

charts

exports

cohort analysis

Day 14 grouped by parent_first_completion_seen

experiment success threshold (isExperimentPromising)

Klart när:

admin kan följa funnel och Day 14 utan manuella SQL-frågor.

---

# Go live (sista steg — efter Fas 6C)

Mål:

Aktivera för riktiga användare — **endast på produktägares uttryckliga godkännande**.

**Förutsättning:** Fas 1–6C tekniskt klara och verifierade.

Gör:

- Verifiera checklista i [contract § Go live](./foraldaraktivering-implementation-contract.md#go-live-sista-steg--obligatoriskt)
- Sätt `ACTIVATION_PROGRAM_LAUNCH_AT` (fryses permanent efter första enroll)
- Sätt `ACTIVATION_PROGRAM_ENABLED=true` i prod
- Deploy

Klart när:

produktägare bekräftat go live — väg A + väg B aktiva; push live; admin redo för uppföljning.

**Implementation ska aldrig aktivera prod-flaggor utan PO-beslut.**
