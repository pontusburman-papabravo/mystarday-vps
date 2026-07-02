# Bildstöd PR 2 — Constitution QA (00A morning stress test)

**Date:** 2026-07-02  
**Reviewer:** implementation agent (manual pass per EPIC 2.5 / POS 15 §A)

## Scenario

Stressed parent has left; child (7–10, portrait phone) opens barnvy at ~07:15 with `now_next_later` default.

## Findings

| Check | Result | Notes |
|-------|--------|-------|
| Next action obvious within ~2s | **Pass** | NU zone is visually dominant (gold border, gradient). First incomplete activity is the only tappable card in NU. |
| One primary action on Idag | **Pass** | Only NU card accepts check-off; Nästa/Senare are preview-only (unchanged G-01 completion path). |
| No parent forms / schedule edit | **Pass** | Veckoöversikt is read-only via `GET /api/me/weekly-schedule`; no write endpoints exposed to child. |
| Swedish copy clarity | **Pass** | "Senare" replaces ambiguous "Sedan"; zone headers NU / Nästa / Senare match help bubble. |
| Mobile thumb reach | **Pass** | Vertical NU→Nästa→Senare stack; NU checkbox remains in lower card footer (44pt targets preserved). |
| No new bottom-nav | **Pass** | "Hela veckan" is a text link inside collapsed week nav — not a fourth tab. |

## Risks noted (not blocking PR 2)

- **Custody families:** child week overview uses legacy `week_variant IS NULL` rows only; custody A/B templates may need a follow-up in PR 3+ when custody child UX is in scope.
- **Existing children:** unchanged `view_type` until parent or child toggles; intentional per EPIC 2.1.

## Verdict

**Pass** for PR 2 panel 2 (5/5) and panel 3 app criteria 1–3 (NU/Nästa/Senare + readonly week).
