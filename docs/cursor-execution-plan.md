# Cursor Execution Plan

Regel:

Implementera aldrig mer än en fas åt gången.

Begär alltid plan innan kod skrivs.

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

Enrollment.

Implementera:

onboarding hook

feature flags

launch cutoff

control-arm

Klart när:

nya familjer enrollas automatiskt.

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
