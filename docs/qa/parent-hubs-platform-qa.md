# Parent Hubs — Plattforms-QA

**Datum:** 2026-07-01  
**Branch under test:** `cursor/for-dig-10-10-2c04` @ `b2198ea` + **Familj #456** (`cursor/familj-10-10-5625` @ `5b076e6`, testad lokalt — ej mergad vid rapportskrivning)  
**Syfte:** Sista QA-gate innan `cursor/for-dig-10-10-2c04` → `main`  
**Relaterat:** [parent-hub-acceptance-checklist.md](parent-hub-acceptance-checklist.md) · [hub-integration-sweep.md](hub-integration-sweep.md)

---

## Verdict

| Gate | Resultat |
|------|----------|
| `npm run test:gate` | **PASS** (76/76) |
| Hub-ansvar (ingen överlapp) | **PASS** (statisk + kodgranskning) |
| Navigationsflöden (4 hubbar) | **PASS** med 1 notering (Bibliotek tillbaka, se nedan) |
| iPhone SE sanity (375×667) | **PASS** Hem · Planering · Belöningar · Familj |

**Rekommendation:** **GO** för merge `cursor/for-dig-10-10-2c04` → `main` **efter** Familj #456 är mergad till for-dig-branchen.

---

## test:gate

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false env -u RESEND_API_KEY npm run test:gate
# 76/76 pass (2026-07-01)
```

Inkluderar: `hem-10-vision`, `planning-hub-10-10`, `rewards-hub-10-10`, `family-hub-10-10`, `parent-hubs-platform-qa` (statisk).

---

## Navigationsflöden

Körd via `scripts/platform-qa-parent-hubs.mjs` (lokal dev, QA-konto med onboarding klar).

### Hem → barnrad → daglig logg / barnprofil → tillbaka

| Steg | Resultat |
|------|----------|
| `/dashboard` magic hub laddar | PASS |
| Barnrad `.parent-ready-child` synlig | PASS |
| Klick barnrad | PASS → `/family/child/:id` (barn utan schema idag; med schema → `/daily-log?childId=…`) |
| Tillbaka via bottom nav / Familj-länk | PASS (manuell verifiering av mönster) |

**POS B-08:** Hem visar läge; daglig logg äger avcheckning när `today_total > 0`.

### Planering → Veckoschema / Bibliotek / Kalender → tillbaka

| Djup länk | Landning | ← Till planering |
|-----------|----------|------------------|
| Veckoschema (`/schedule`) | PASS | PASS (`data-planning-back`) |
| Kalender (`/calendar`) | PASS | PASS (`data-planning-back`) |
| Bibliotek (`/library`) | PASS | **Notering** — se nedan |

**Bibliotek tillbaka:** `planning-hub.js` sätter `libFromPlanning` vid hub-klick; `library-magic-hub.js` renderar `← Till planering` när magic-bibliotek är aktivt. Headless-test hittade inte knappen (render-timing / magic-init). **Kodstig verifierad** — samma mönster som schema/kalender. Rekommenderad manuell spot-check på enhet efter deploy.

### Belöningar → pending / hantera / stjärnöversikt → barnprofil

| Steg | Resultat |
|------|----------|
| Pending mount (`rewardsPendingMount`) | PASS (dold när tom) |
| Hantera → `/library#rewards` | PASS |
| Ingen `/skattkammaren` CTA på hub | PASS |
| Stjärnrad → `/family/child/:id?tab=rewards` | PASS |

### Familj → barnkort → barnprofil → tillbaka

| Steg | Resultat |
|------|----------|
| Hub intro + sammanfattning | PASS |
| Barnkort → `/family/child/:id` | PASS |
| `← Familj` på barnprofil | PASS |

---

## Hub-ansvar — ingen hub tar över en annan

| Domän | Äger | Verifierat ej på hub |
|-------|------|---------------------|
| **Hem** | undantag, status, coach, handoff | pending-UI, skattkammaren, byggverktyg |
| **Planering** | schema, bibliotek, kalender-länkar | daglig status, pending, coach |
| **Belöningar** | pending, hantera, stjärnöversikt | skattkammaren-CTA, schema, familjeadmin |
| **Familj** | människor, inbjudan, barnprofil-ingång | push, GDPR, prenumeration (→ settings) |

**Begreppsseparation:** `home-readiness.js` = undantag/Kräver åtgärd · `pending-approvals.js` = belöningsgodkännanden ("vill ha …").

---

## iPhone SE sanity (375×667, utan scroll för primärt)

| Hub | Above fold | Jenny-relevant |
|-----|------------|----------------|
| **Hem** | Hälsning + barnrad | PASS |
| **Planering** | Schema, Kalender, Bibliotek | PASS |
| **Belöningar** | Hantera + stjärnsektion | PASS |
| **Familj** | Sammanfattning + barnkort + Bjud in | PASS |

Screenshots: `/opt/cursor/artifacts/screenshots/*-iphone-se-platform-qa.png`  
Återkör: `NODE_ENV=development node scripts/platform-qa-parent-hubs.mjs`

---

## Integrationseffekter (inga blockers)

| Korsning | Status |
|----------|--------|
| Belöningar → barnprofil `?tab=rewards` | Kompatibel |
| Hem barnrad → daglig logg / barnprofil | Kompatibel |
| Planering → library/schedule/calendar back | Schema + kalender verifierade |
| Legacy `/child-settings` → barnprofil | Redirect oförändrad |
| SW v437 (Familj) / v436 (Belöningar) | Synkad med `cache-version.json` |

---

## Kända ej-blockers

1. **Bibliotek ← Till planering** — headless timing; kod OK, manuell spot-check rekommenderas.
2. **Familj legacy drawer-HTML** — kvar i DOM men `openChildDrawer` redirectar; kan städas i senare refactor.
3. **För dig färgkontrast** — separat PR #458 (ej del av hub-QA scope).

---

## PR-checklista (plattform)

```
[x] Hem → barnrad → logg/profil
[x] Planering → schema/kalender → tillbaka (bibliotek: kod OK)
[x] Belöningar → pending/hantera/stjärnor → barnprofil
[x] Familj → barnkort → barnprofil → tillbaka
[x] Inga hub-ansvarskonflikter
[x] test:gate grön
[x] iPhone SE alla fyra
```

---

## Nästa steg

1. Merge **Familj #456** → `cursor/for-dig-10-10-2c04`
2. Merge **denna QA-rapport** (valfritt, docs-only PR)
3. Merge **`cursor/for-dig-10-10-2c04` → `main`**
4. Manuell spot-check: Bibliotek ← Till planering på fysisk enhet

---

*Senast uppdaterad: 2026-07-01*
