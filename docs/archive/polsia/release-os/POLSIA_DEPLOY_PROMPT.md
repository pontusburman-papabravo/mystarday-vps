# Polsia — deploy & verifiering (sprint 1–26)

**Kopiera hela kodblocket nedan till Polsia.**

Repo: `https://github.com/pontusburman-papabravo/MyStarday-Polsia`  
**Branch att deploya:** `main` (senast mergad Release OS, SW **v167**)

---

## Kodblock (copy-paste till Polsia)

```
Du hostar Min Stjärndag (stjarndag). Cursor har redan implementerat Release OS sprint 1–26 i GitHub — din uppgift är DEPLOY + ENV + NATIV VERIFIERING, inte skriva om samma kod.

═══════════════════════════════════════════════════════════════
1. CHECKOUT & DEPLOY
═══════════════════════════════════════════════════════════════

1. Hämta branch: main (commit senaste på main)
2. Deploy HELA repot till produktion (stjarndag.polsia.app / mystarday.se)
3. På servern efter deploy:
   npm run migrate
   npm run test
   npm run polsia:gate0
   curl -sSf https://stjarndag.polsia.app/health
4. Tvinga PWA-cache: public/sw.js är CACHE_NAME stjarndag-v167 — användare ska få ny SW

Detaljerad fillista (dubbelkolla att allt finns live):
docs/polsia-deploy-manifest.md

═══════════════════════════════════════════════════════════════
2. ENV (Polsia Dashboard — sätt dessa)
═══════════════════════════════════════════════════════════════

| Variabel | Sprint | Obligatorisk? |
|----------|--------|----------------|
| SENTRY_DSN | 14 | Rekommenderas (crash i app) |
| RENDER_GIT_COMMIT | 14 | Auto på Render |
| PARENTAL_GATE_ENABLED | 3c | true (false endast nödfall) |
| NATIVE_TABBAR_ENABLED | 4 | true |
| FCM_SERVER_KEY | 19 | Android push |
| GOOGLE_WEB_CLIENT_ID | 18 | Android Google login |
| ANDROID_SHA256_CERT_FINGERPRINT | 22a | App Links (SHA256, komma-separerat) |
| ANDROID_PACKAGE_NAME | 22a | se.mystarday.app |
| APPLE_TEAM_ID | 22a | Universal Links AASA |
| APNS_* (befintliga) | 20 | iOS push |

═══════════════════════════════════════════════════════════════
3. SPRINT 1–26 — VAD SOM REDAN ÄR KLART I REPO (✅ = verifiera bara)
═══════════════════════════════════════════════════════════════

Kör INTE om implementation om raden är ✅ — signera med röktest istället.

| # | Sprint | Polsia ID | Repo | Polsia gör |
|---|--------|-----------|------|------------|
| 1 | 1.1 Backend auth | #2141408 | ✅ | Röktest Apple login, lifetime_free ingen 402 |
| 2 | 1.2 platform.js | #2141409 | ✅ | Verifiera inject på HTML-sidor |
| 3 | 1.3 login/register UI | #2141410 | ✅ | Apple-knapp iOS; onboarding redirect |
| 4 | 1.4 CSS scaffold | #2141411 | ✅ | — |
| 5 | 14 Crashlytics/Sentry | #2143272 | ✅ | Sätt SENTRY_DSN; test-crash <5 min |
| 6 | 2a platform-gating | #2141905 | ✅ | Native: ingen PWA-banner |
| 7 | 2b pwa-install | #2141914 | ✅ | — |
| 8 | 3a device_mode | #2141844 | ✅ | Force-close → child-login |
| 9 | 3b Parental Gate | #2141848 | ✅ | PG-PIN vid "Jag är vuxen" |
| 10 | 3c barn-JWT 403 | #2141855 | ✅ | Barn kan inte /api/family |
| 11 | 4 Native tab bar | #2141717 | ✅ | 5 flikar native, ingen hamburger |
| 12 | 5a rollval login | #2141868 | ◐ | Rollval finns — ev. polish |
| 13 | 5b barn-PIN | #2141884 | ✅ | Haptik + egen keypad |
| 14 | 5c barnlogin flow | #2141897 | ◐ | 3-vy finns — mockup-polish om tid |
| — | Gate 0 | #2142916 | ✅ | npm run polsia:gate0 |
| 15 | 16 Android smoke | #2142930 | ○ | Lokal: npx cap sync android, bygg |
| 16 | 17 Google backend | #2143390 | ✅ | POST /api/auth/google |
| 17 | 18 Google native UI | #2143391 | ◐ | UI ✅; plugin: docs/capacitor-google-auth-setup.md |
| 18 | 19 FCM server | #2143394 | ✅ | FCM_SERVER_KEY + testnotis |
| 19 | 20 APNs | #2143395 | ◐ | Verifiera prod APNs |
| 20 | 21 (övrigt push) | #2143396 | ◐ | Enligt sprintfil om scope kvar |
| 21 | 22a Deep links server | #2143403 | ✅ | assetlinks.json + AASA live |
| 22 | 22b Deep links client | #2143404 | ✅ | appUrlOpen / invite-URL |
| 23 | 23A Android release | #2143273 | ○ | docs/android-gate-23-checklist.md |
| 24 | 23B Android parity fix | #2143274 | ○ | Buggfix efter 23A |
| 25 | Gate 24 Parity | #2143329 | ○ | docs/parity-manifest.md 6/6 iOS+Android |
| 26 | Dashboard polish | #2143405 | ✅ | Skeleton/fade på dashboard |

Efter rad 26 (ej i tabellen): 9A → 9B → SSE → barn-wow → Gate 25 fältstudie (se gates/gate-25-family-delight.md).

═══════════════════════════════════════════════════════════════
4. RÖKTEST (signera efter deploy)
═══════════════════════════════════════════════════════════════

□ Barnläge: Login → Jag är barn → PIN → child-dashboard. Stäng app → öppna igen → /child-login (INTE dashboard)
□ PG: I barnläge → Jag är vuxen → föräldra-PIN → dashboard
□ Native: Ingen "lägg till på hemskärmen" / PWA-guide
□ Native vuxen: Tab bar 5 flikar (Hem, Schema, Bibliotek, Familj, Inställningar)
□ Webb: E-postlogin regression OK
□ iOS: Apple login (om TestFlight)
□ Android: Google login (efter plugin + GOOGLE_WEB_CLIENT_ID)
□ Deep link: /accept-invite?token=… eller /register?invite=… öppnar rätt sida
□ Push: notis <60s, tap → rätt route (inte bara dashboard root)
□ Sentry (staging): CrashReporter.testCrash() syns i dashboard

═══════════════════════════════════════════════════════════════
5. OM DU MÅSTE KODA (sprint ○ eller ◐)
═══════════════════════════════════════════════════════════════

Läs ENDAST motsvarande fil i docs/polsia-release-os/sprints/ — kopiera "Polsia-prompt" där.
Exempel:
- Sprint 16: docs/polsia-release-os/sprints/15-sprint-16.md
- Sprint 18 plugin: docs/capacitor-google-auth-setup.md
- Gate 24: docs/polsia-release-os/sprints/25-sprint-gate-24.md

Regler (alla sprintar):
❌ Capacitor.isNativePlatform() i view-filer — endast Platform.* i platform.js
❌ Blanda barn-PIN och app-lås-PIN
❌ Scope utanför sprintens "Gör endast"

═══════════════════════════════════════════════════════════════
6. SVAR EFTER VARJE STEG (till Pontus)
═══════════════════════════════════════════════════════════════

1. Commit/hash deployad på prod
2. npm test + polsia:gate0 resultat
3. Vilka env som saknas
4. Röktest-rader ✅/❌
5. Gate 24: länk till uppdaterad parity-manifest.md när klar

Referensdokument i repo:
- docs/polsia-deploy-manifest.md (filer + env)
- docs/polsia-release-os/04-redan-klart-i-repo.md (status)
- docs/polsia-release-os/01-korlista.md (alla sprintfiler)
- docs/MAIN-RELEASE-OS-STATUS.md (vad som ligger på main)
```
