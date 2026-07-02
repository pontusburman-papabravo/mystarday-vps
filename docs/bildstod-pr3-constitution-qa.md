# Bildstöd PR 3 — Constitution QA (00A morning stress test)

**Date:** 2026-07-02  
**Reviewer:** implementation agent (manual pass per EPIC 3.1–3.8 / POS 15 §A)

## Scenario

Stressed parent has left; child (7–10, portrait phone) opens barnvy at ~07:15. Family A has no `teacch`. Family B has admin-granted `teacch` + `transition_support` accessible.

## Findings

| Check | Result | Notes |
|-------|--------|-------|
| Next action obvious with transition inline | **Pass** | NU card remains the only check-off target. Transition text is a small pill *above* activity title — not a modal, not a second CTA. |
| Families without teacch see zero transition UI | **Pass** | `transitionSupportEnabled` false when `transition_support` absent from `/api/features`. No lead-time settings in child-settings without `teacch` component. |
| Emotion flow never shows two modals | **Pass** | Single `#ratingModal`; `mood_input_mode` shows slider **or** cards via `hidden` class — never both. `off` skips modal entirely. |
| Parent mood summary not on Hem | **Pass** | Summary only on `/daily-log` (Idag fill-in view) via `#moodSummaryBlock` — not injected into `dashboard-home-hub` or parent Hem. |
| Child protagonist (P-02) | **Pass** | Child taps emotion card or slider; parent only configures mode in settings. |
| No surprise modal (Constitution 2) | **Pass** | Transition is inline; mood is same post-completion modal as before PR 3 (one surface). |
| Swedish copy | **Pass** | Snart / Om X min / Nu; känslokort labels match pictogram library. |

## Risks noted (not blocking PR 3)

- **Transition + no start_time:** phase defaults to "Snart" when activity lacks scheduled start — acceptable until schedule times are set.
- **emotion_tracking live:** all families get Basic känslostöd once migration runs; existing `show_mood_rating=false` default preserved until parent enables.

## Verdict

**Pass** for PR 3 panel 5 (övergångsstöd motor + gated UI) and panel 6 (känslostöd cards/slider/API/summary).
