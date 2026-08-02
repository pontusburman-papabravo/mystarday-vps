# Restore regression matrix — 2026-08-02

Baseline reviewed: `e47bfc77` (`origin/main`). Historical baseline: `6a784ddf`.

| Område | Historiskt fynd/fix | SHA/PR | Finns i aktuell main | Beteendetestat | Status | Åtgärd |
| ------ | ------------------- | ------ | -------------------: | -------------: | ------ | ------ |
| SSRF family images | REV-001 safe-url-fetch | #787 / `8a116787` | Delvis (no pin) | Unit only on main | VERIFIED gap | Pin HTTP + expand tests |
| API rate limits | REV-002 | `8a116787` | Ja | `rate-limit-behavior` | FIX_ALREADY_PRESENT | Key namespace `parent:`/`child:` |
| IAP webhook scope | REV-003 | `ab4763c0` branch only | Nej | Missing on main | VERIFIED | Cherry-pick IAP pack |
| RC identity | REV-004 | `ab4763c0` | Nej | — | VERIFIED | Same |
| IAP client key | REV-005 | `ab4763c0` | Nej (leaks secret) | — | VERIFIED P0 | Same |
| Rewards revoked | REV-006 | #786 area | Ja | integration | FIX_ALREADY_PRESENT | — |
| Reward visibility | REV-007 | #786 | Ja | `reward-visibility` | FIX_ALREADY_PRESENT | — |
| requires_approval | REV-008 | #786 | Ja | `rewards-integrity` | FIX_ALREADY_PRESENT | — |
| Service worker | REV-009 | #787 | Ja | static/contract | FIX_ALREADY_PRESENT | — |
| Scheduler list | REV-010 | docs only | Nej registry file | — | VERIFIED | Add registry + test |
| Push family-wide | REV-011 | partial | Ja | — | REQUIRES_MANUAL_VERIFICATION | Document |
| SW changelog | REV-012 | — | Ja | — | P3 open | — |
| CSP enforce | REV-013 | — | Nej | — | REQUIRES_MANUAL_VERIFICATION | — |
| content-translator fetch | REV-014 | — | Ja raw fetch | — | SUSPECTED P2 | — |
| midnight/weekly locks | REV-015 | — | Ja (`midnight-scheduler.js`) | unit | DISPROVED as P0 | Locks present |

## PR ancestry (requested set)

| PR | State (2026-08-02) | On `main` |
|----|-------------------|-----------|
| #781 | MERGED | Yes (`6a784ddf`) |
| #805–#806 | MERGED | Yes |
| #809 | MERGED | Yes |
| #819–#822 | MERGED | Yes (`e47bfc77`) |
| #787 integrity IAP pack | Open branch `cursor/full-repo-integrity-review-01b8` | **Not fully merged** (`ab4763c0` not ancestor) |
