# v1 Release Candidate — QA Sign-off

**Datum:** 2026-07-02  
**Agent:** 7 (QA & Release)  
**Bas:** `cursor/v1-child-worlds-wiring-ef46` @ `adc2ad3`

---

## Gate

| Check | Resultat |
|-------|----------|
| `npm run test:gate` | **93/93 pass** |
| `test/child-art-assets.test.js` | 7/7 pass |
| `test/custody-api-integration.test.js` | Inkluderad i gate |
| `test/idag-10-10.test.js` | Pass (fas8 split uppdaterad) |
| `test/garden-asset-pipeline.test.js` | Pass (kanoniska paths) |
| `test/first-star-chrome.test.js` | Pass (activities split) |

Env: `NODE_ENV=test`, `REQUIRE_EMAIL_VERIFICATION=false`, Resend keys unset.

---

## PR-matris

| PR | Agent | Gate | Verdict |
|----|-------|------|---------|
| #497 | 8 (program) | N/A docs | Merged |
| #498 | 1 FEAT-1 | Green | Merged |
| #499 | 2 Hubs | Green | Merged |
| #500 | 5 ACT-1 | Green | Merged |
| #501 | 6 Assets | Green | **Ready** |
| #502 | 4 Worlds | Green | **Ready** |

---

## Smoke (statisk/kontrakt)

| Område | Status |
|--------|--------|
| Custody `custody_home_id` write/read | Kontraktstester gröna |
| Parent hubs integration | `hub-integration-sweep.md` v2 |
| Idag decals + celebration | Wired + CSS tests |
| Garden canonical paths | Pipeline + SW precache |
| ACT-1 flags | Default OFF per runbook |

---

## Icke-blockerande

- Hem Jenny: coach under fold på iPhone SE när barnrad fyller — dokumenterat i hub sweep v2
- För dig Sprint 3–5: utanför denna release candidate

---

## Verdict

**RELEASE CANDIDATE APPROVED** för merge av #501 + #502 efter ordning assets → worlds.

ACT-1 prod rollout kräver separat manuell QA enligt `act-1-rollout-runbook.md` innan flag ON.
