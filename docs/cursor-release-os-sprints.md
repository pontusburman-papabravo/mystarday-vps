# Release OS sprint 1–26 — agent-ägarskap (Cursor)

**Uppdaterad:** 2026-05-28  
**Beslut:** Cursor Cloud Agent tar **implementation i repo** för alla sprintar i [`polsia-release-os/01-korlista.md`](polsia-release-os/01-korlista.md) (inkl. nr 26 Dashboard). Polsia behövs inte för kod — endast om ni vill behålla separat deploy-kanal.

**Du (Pontus) behöver fortfarande:** deploy till prod, env-nycklar (Sentry, Firebase, Apple, Google, RevenueCat), TestFlight/Play Internal, Gate 24/25 manuell signering på riktiga enheter.

---

## Kan alla sprintar göras här?

| Ja i repo | Kräver dig / enhet |
|-----------|-------------------|
| Kod, tester, SW, docs | `SENTRY_DSN`, `FIREBASE_*`, APNs-nycklar |
| `npm test`, `polsia:gate0` | Test-crash iOS/Android <5 min |
| Parity-manifest uppdatering | Gate 25: 20 familjer × 4–6 veckor |

**Tidsmodell:** En sprint per commit/PR-block där möjligt; inte alla 26 i ett enda deploy.

---

## Status (agent-spårning)

| # | Sprint | ID | Repo | Enhet/deploy |
|---|--------|-----|------|----------------|
| 1 | 1.1 | #2141408 | ✅ | Deploy + Apple TEST |
| 2 | 1.2 | #2141409 | ✅ | Audit saknade sidor |
| 3 | 1.3 | #2141410 | ◐ | email_conflict-modal, Google UI → 18 |
| 4 | 1.4 | #2141411 | ✅ | SW vid deploy |
| 5 | 14 | #2143272 | ⬜ | Sentry/Crashlytics + DSN |
| 6 | 2a | #2141905 | ◐ | Full gating (CSS delvis i platform-native.css) |
| 7 | 2b | #2141914 | ✅ | `pwa-install.js` |
| 8 | 3a | #2141844 | ⬜ | Parental Gate |
| 9 | 3b | #2141848 | ⬜ | Session gate |
| 10 | 3c | #2141855 | ⬜ | Routing |
| 11 | 4 | #2141717 | ◐ | `platform-tab-bar.js` (≠ 5-fliks spec) |
| 12–14 | 5a–5c | #2141868… | ⬜ | Barnlogin 3 skärmar |
| — | Gate 0 | #2142916 | ✅ | `npm run polsia:gate0` |
| 15 | 16 | #2142930 | ⬜ | Capacitor Android smoke |
| 16–20 | 17–21 | #2143390… | ◐/⬜ | Google auth, FCM klient — backend delvis ✅ |
| 21–22 | 22a–22b | #2143403… | ⬜ | Deep links |
| 23–24 | 23A–23B | #2143273… | ⬜ | Android release |
| 25 | Gate 24 | #2143329 | ⬜ | Parity 6/6 |
| 26 | Dashboard | #2143405 | ⬜ | Mockup-paritet |

**Efter 26:** 9A → 9B → SSE → barn-wow → Gate 25 (ej numrerad sprint).

---

## Körordning (agent)

Samma som [`01-korlista.md`](polsia-release-os/01-korlista.md). Hoppa över rader markerade ✅ om verifiering grön.

**Nästa kodblock:** 14 → 2a (slutför) → 1.3 → 3a–3c → 4 (renodla till spec) → 5a–5c → …

---

## Verifiering varje block

```bash
npm run test
npm run polsia:gate0
# lint: befintliga fel — öka inte
```

Uppdatera [`04-redan-klart-i-repo.md`](polsia-release-os/04-redan-klart-i-repo.md) när en sprint blir ✅.

---

## PR-strategi

- Branch: `cursor/release-os-sprints-1a8b` (eller fortsätt `cursor/polsia-sprint-koordinering-1a8b`)
- En PR kan innehålla flera sprintar om scope är sammanhängande (t.ex. 2a+2b+14)
- Gate 24/25: separat signering i PR-beskrivning
