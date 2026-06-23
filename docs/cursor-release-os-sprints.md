# Release OS sprint 1–26 — agent-ägarskap (Cursor)

**Uppdaterad:** 2026-05-28  
**Beslut:** Cursor Cloud Agent tar **implementation i repo** för alla sprintar i [`archive/polsia/release-os/01-korlista.md`](archive/polsia/release-os/01-korlista.md) (inkl. nr 26 Dashboard). Polsia behövs inte för kod — endast om ni vill behålla separat deploy-kanal.

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
| 3 | 1.3 | #2141410 | ✅ | Google UI → sprint 18 plugin |
| 4 | 1.4 | #2141411 | ✅ | SW vid deploy |
| 5 | 14 | #2143272 | ✅ | Sätt `SENTRY_DSN` + enhetstest |
| 6 | 2a | #2141905 | ✅ | — |
| 7 | 2b | #2141914 | ✅ | `pwa-install.js` |
| 8 | 3a | #2141844 | ✅ | device_mode + session-gate |
| 9 | 3b | #2141848 | ✅ | PG (befintlig overlay + device_mode) |
| 10 | 3c | #2141855 | ✅ | API 403 + klient redirect |
| 11 | 4 | #2141717 | ✅ | `native-tab-bar.js` 5 flikar |
| 12–14 | 5a–5c | #2141868… | ◐ | Rollval + child-login finns |
| — | Gate 0 | #2142916 | ✅ | `npm run polsia:gate0` |
| 15 | 16 | #2142930 | ○ | Capacitor Android build lokalt |
| 16 | 17 | #2143390 | ✅ | POST /api/auth/google |
| 17 | 18 | #2143391 | ◐ | Native Google plugin |
| 18–20 | 19–21 | #2143394… | ◐ | FCM/APNs backend finns |
| 21–22 | 22a–22b | #2143403… | ⬜ | Deep links |
| 23–24 | 23A–23B | #2143273… | ⬜ | Android release |
| 25 | Gate 24 | #2143329 | ⬜ | Parity 6/6 |
| 26 | Dashboard | #2143405 | ⬜ | Mockup-paritet |

**Efter 26:** 9A → 9B → SSE → barn-wow → Gate 25 (ej numrerad sprint).

---

## Körordning (agent)

Samma som [`01-korlista.md`](archive/polsia/release-os/01-korlista.md). Hoppa över rader markerade ✅ om verifiering grön.

**Nästa (agent/Polsia):** sprint 18 plugin · 16 Android smoke · 22 deep links · Gate 24 parity · deploy enligt `archive/polsia/polsia-deploy-manifest.md`

---

## Verifiering varje block

```bash
npm run test
npm run polsia:gate0
# lint: befintliga fel — öka inte
```

Uppdatera [`04-redan-klart-i-repo.md`](archive/polsia/release-os/04-redan-klart-i-repo.md) när en sprint blir ✅.

---

## PR-strategi

- Branch: `cursor/release-os-sprints-1a8b` (eller fortsätt `cursor/polsia-sprint-koordinering-1a8b`)
- En PR kan innehålla flera sprintar om scope är sammanhängande (t.ex. 2a+2b+14)
- Gate 24/25: separat signering i PR-beskrivning
