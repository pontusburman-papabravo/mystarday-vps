# Skolstart 2026 — lanseringsaudit <!-- pragma: allowlist secret -->

**Datum:** 2026-08-17 (uppdaterad efter Family Device global rollout)  
**MAIN_SHA:** `7fc83f4077ef5bd4aabfdcc0addbf999f5616c84`  
**PROD_SHA:** `8a2771694a4078e755f3cf733066cf2e5df743cb` (via `GET /health`)  
**PROD_HEALTH:** healthy (version 2.3.1, cache stjarndag-v856)  
**REVISION_DRIFT:** main ahead of prod by deploy-ops hotfix only (#1017); FD code identical

Audit-metod: prod admin API + VPS read-only DB + live HTTP/curl + founder admin login + repo cross-check.

---

## Executive summary

**Nyhetsbrev och Meta kan gå med villkor.** Tre av de önskade budskapen är delvis blockerade:

| Budskap | Status |
|---------|--------|
| Färdiga rutiner för skoldagen | **GO** — prod har 8 standardscheman inkl. "Skola vardag" och "Morgonrutin"; nya barn får auto-seed baserat på ålder |
| Barnet ser vad som händer härnäst (Nu/Nästa) | **GO** — kärnflöde för alla användare |
| Stjärnor / Skattkammaren | **GO** — kärnflöde |
| Enklare för hela familjen (delad telefon) | **QUALIFIED** — alla Family Device-flaggor ON globalt (2026-08-17); fysisk smoke PASS |
| Visuell timer | **QUALIFIED** — teknik live (`activityTimerV2Available: true`) men per-barn opt-in, inte default |

Webb och SEO var tekniskt starka men **saknade skolstart på startsidan** — åtgärdat i denna PR (modul, meta, internlänkar).

---

## A. Produktmatris

### Globala feature flags (prod 2026-08-17, efter rollout)

| Flagga | Enabled |
|--------|---------|
| `trusted_device_v1` | **true** |
| `family_device_entry_v1` | **true** |
| `family_device_daily_ux_v1` | **true** |
| `adult_privilege_v1` | **true** |
| `native_widget_enabled` | false |
| `widget_completion_enabled` | false |
| `activation_signup_slim_v1` | true |
| `activation_first_success_v1` | false |
| `growth_home_v1` | true |
| `journey_retention_home_v1` | true |
| `english_app_global_enabled` | true |

### Release readiness (prod)

```json
{
  "authzHardeningEnabled": true,
  "rateLimitEnabled": true,
  "activityTimerV2Disabled": false,
  "activityTimerV2Available": true
}
```

### Standard Library (prod DB, verifierat 2026-08-17)

| Mått | Värde | Kommentar |
|------|-------|-----------|
| **Kanoniska aktiviteter** | **31** | `canonical_id IS NOT NULL` — matchar manifest `config/standard-library/v1.1.json` |
| Legacy/preserved rader | 25 | `canonical_id IS NULL` (t.ex. "Bada/Duscha", "Film / Pyssel") — ej del av v1.1-manifest |
| **Totalt i `default_activity_template`** | 56 | = 31 + 25; **marknadsför inte som "56 standardaktiviteter"** |
| **Kanoniska scheman** | **8** | |
| **Schema-poster** | **98** | |

**Scheman:** Förskola vardag, Helg, Jullov, Kvällsrutin, Lov, Morgonrutin, **Skola vardag**, Sommarlov.

**Ny familj:** `seedChildDefaultSchedule` väljer "Skola vardag" om barn ≥6 år, annars "Förskola vardag". Onboarding kan dessutom välja mall via `POST /api/onboarding/schedule`.

### Marketing claim matrix

| Feature / löfte | Ny vanlig familj | Befintlig vanlig familj | Founder/pilot | Plattform | SAFE_TO_MARKET |
|-----------------|------------------|-------------------------|---------------|-----------|----------------|
| Färdiga skolrutiner | Auto-seed + onboarding-mallar | Befintligt schema oförändrat; kan kopiera från standardbibliotek | Samma | Web/iOS/Android | **GO** |
| Enklare delad telefon | Legacy child-login/PIN | Samma | Pilot only om flaggor på | Web/PWA primärt | **NO** (A) |
| Visuell timer | Opt-in via onboarding-preset `time_and_order` eller barninställning | Samma | Samma | Web/native | **QUALIFIED** (B) |
| Nu / Nästa | Ja (preset `one_at_a_time` eller manuellt) | Befintliga inställningar | Ja | Alla | **GO** |
| Delsteg (substeps) | Ja om aktivitet har dem | Ja | Ja | Alla | **GO** |
| Stjärnor / checkoff | Ja | Ja | Ja | Alla | **GO** |

**Blocker-klasser:** A=rollout, B=configuration/opt-in, C=code, D=a11y, E=copy only.

---

## B. Webb-gap (före denna PR)

| Problem | Status |
|---------|--------|
| Hero sa "Ny lansering / Vi är äntligen live" | Fixat → Skolstart 2026 |
| Sommarhälsning ovanför problem-sektion | Ersatt med skolstart-modul |
| 0 omnämnanden av "skolstart" på `/` | Fixat |
| Meta description NPF-tung i primär description | Bredare copy; NPF kvar i FAQ |
| Ingen internlänk till skolstart-resurs i guider | Fixat |
| App Store / Play-länkar | Korrekta (`apple.co/4v2ESuH`, `__PLAY_STORE_URL__` injiceras) |

**Meta landning för betald trafik:** `/` (uppdaterad) eller `/resurser/bildschema-skolstart-hosten` för informativ intent.

---

## C. SEO-status

| Kontroll | Resultat |
|----------|----------|
| `robots.txt` | OK — app-sidor Disallow, sitemap pekar rätt |
| `sitemap.xml` | OK — guider + resurser inkluderade |
| `/login` noindex | OK |
| Canonical på `/` | OK |
| Strukturerad data | SoftwareApplication + FAQPage på `/` |
| `/resurser/bildschema-skolstart-hosten` | Indexerbar, title/description OK |
| Search Console | Ej verifierad i denna körning — teknisk SEO OK, **CONFIRMED_INDEXED_BY_GOOGLE ej bevisat** |

**Tematiska sidor (indexerbara):** `/morgonrutin-barn`, `/bildschema-app`, `/rutiner-npf-barn`, `/veckoschema-bildstod`, `/alternativ-bildschema-tavla`, `/resurser/*`.

---

## D. Budskapsmatris

### SAFE_TO_PROMISE_NOW (vanliga användare)

- "Färdiga rutiner för morgon, skola och kväll"
- "Barnet ser vad som händer nu och vad som kommer sen"
- "Stjärnor som belöning när aktiviteter blir klara"
- "Tydligt visuellt schema som kan göra det lättare för barnet att följa rutinen själv"
- "Särskilt bra för barn som behöver tydlighet och förutsägbarhet" (utan medicinska påståenden)

### REQUIRES_ROLLOUT_BEFORE_CAMPAIGN

- "Mindre krångel när hela familjen använder samma telefon" → **QUALIFIED** (global FD ON 2026-08-17); använd kvalificerad copy, inte "noll inloggning"

### QUALIFIED (säg med förtydligande)

- "Visuell timer hjälper barnet förstå hur lång tid som är kvar" → tillgänglig när förälder aktiverar aktivitetstimer för barnet; auto-klarmarkering sker inte

### DO_NOT_MARKET_YET

- Family Device / delad surfplatta-upplevelse som huvudbudskap
- "Helt ny Family Device" / interna feature-namn

---

## E. Mätplan

| Funnel-steg | Status | Event / källa |
|-------------|--------|---------------|
| Trafik | MEASURABLE_NOW | GA4 + `funnel_landing_visit` |
| Registrering | MEASURABLE_NOW | `signup_started` / `funnel_signup_started`, `signup_completed` + `signup_attribution` (UTM) |
| Barn skapat | MEASURABLE_NOW | Server: `funnel_first_child_created`, activation `child_created_at` |
| Schema valt/kopierat | MEASURABLE_NOW | Server: `schema_saved_at`, `starter_template_selected`, `starter_plan_saved` |
| Första aktivitet | MEASURABLE_NOW | `first_completion_recorded`, `feature_daily_log` |
| Första stjärna | MEASURABLE_NOW | Server: `star_granted` |
| Återkomst | PARTIALLY_MEASURABLE | `app_opened`, admin analytics snapshots |

**UTM:** `public/js/utm-capture.js` — first-touch 30 dagar, skickas vid registrering.

**Kampanj-UTM-förslag:** `utm_source=meta&utm_medium=paid&utm_campaign=skolstart2026&utm_content=<vinkel>`

**Gap:** Ingen dedikerad client-event `funnel_schedule_selected` — men server-side `schema_saved` täcker steget tillräckligt för kampanjutvärdering.

### Prod-baseline (read-only, 2026-08-17)

| Steg | Källa | All-time n | Konvertering |
|------|-------|------------|--------------|
| Registrering påbörjad | `funnel_signup_started` | 261 | — |
| Första barn skapat | `funnel_first_child_created` | 189 | **72,4 %** från signup |
| Senaste kohort (vecka 2026-08-11) | activation-funnel | signup 16 → child 15 | **93,8 %** (litet n) |

**Meta-mätning (terminologi):**

- **Webb/PWA:** Meta Pixel (`fbq`) via `marketing-events.js` — `CompleteRegistration`, `Lead` (marketing consent)
- **Native iOS/Android:** Meta App Events SDK via Capacitor `meta-app-events.js` — **inte** Pixel; undviker dubbelräkning
- **App-install på native:** AutoLog/App Events efter consent — inte web-pixel

---

## Produktionsåtgärder som kräver Pontus

### ACTION 1 — Family Device rollout — **KLAR (2026-08-17)**

- **Status:** Global rollout PASS; alla fyra flaggor `true`; fysisk smoke PASS; prod pilot PASS
- **Marknadsbudskap:** Använd kvalificerad formulering (se `docs/skolstart-2026-product-gate.md` claim #4)
- **Rollback vid behov:** Sätt flaggor tillbaka till `false` (SQL i product gate-dokumentet)

### ACTION 2 — Deploy skolstart-PR — **KLAR**

- **Status:** Prod SHA `8a277169`; skolstart-modul + meta live

### ACTION 3 — Skicka nyhetsbrev / publicera Meta

- **Ej utfört av agent** — material i `docs/marketing/SKOLSTART_2026_LAUNCH.md`
