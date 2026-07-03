# Open Blockers

**Last updated:** 2026-07-03  
**Rule:** HRC = human decision required. Technical = agent may fix.

---

## HRC — Human Release Candidates

| ID | Mission | Trigger | Exact decision needed | Agent while waiting |
|----|---------|---------|----------------------|---------------------|
| HRC-ART-041 | BL-041 | Creative direction / assets | Approve and commit `memory-hall` scene WebP set per `docs/art-specs/memory-hall-bl041.md` | Asset pipeline stub only — no binaries |
| HRC-PARENT-042 | BL-042 | Parent UX not in POS | Approve parent opt-in copy + flow for `warm_echo` milestone frames | Schema draft + docs only |
| HRC-DEPLOY-IRC | IRC bundle | Live deploy boundary | Human merge + deploy IRC-007–015 to live hosts | Continue IRC prep on branches |
| HRC-FLAG-MH | memory_hall_playable | Live flag enablement | Explicit approval to allowlist families for Minnesrummet QA | **Dev:** `Pontus@burman.cc` via migration `180955`. App Store review-konto avallowlistat. |

---

## Technical blockers

| ID | Mission | Blocker | Owner | Status |
|----|---------|---------|-------|--------|
| — | — | None active | — | — |

---

## Resolved (session 2026-07-03)

| ID | Resolution |
|----|------------|
| HRC-BL-012 | BL-012 approved — Minnesrummet warm pride room (ADR `docs/decisions/adr-memory-hall-bl012.md`) |

---

## Blocked-ROI protocol

When any HRC above is open:

1. Document here (done)
2. Pick highest unblocked AMQ mission
3. Reversible prep allowed: tests, stubs, schema drafts, migration templates
4. **Never idle** if productive autonomous work exists

Source: `.ai/company/HUMAN_APPROVAL_GATE.md`
