# Cursor Execution Plan

Regel:

Implementera aldrig mer än en fas åt gången.

Begär alltid plan innan kod skrivs.

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

onboarding-val-skärm (copy i contract § Onboarding-val)

onboarding hook (guided → enroll, direct → ingen rad)

feature flags

launch cutoff

activation_program_enroll_choice

Klart när:

nya familjer kan välja "Ja, hjälp oss första veckan" eller "Vi kör själva".

---

# Fas 5

Mål:

Push scheduler.

Ej MVP.

---

# Fas 6A

Mål:

Retention engine.

Implementera:

Day 14

Day 30

Day 60

retention calculations

---

# Fas 6B

Mål:

Analytics API.

Implementera:

opportunity rate

conversion rate

retention wall

---

# Fas 6C

Mål:

Admin UI.

Implementera:

dashboard

charts

exports

cohort analysis
