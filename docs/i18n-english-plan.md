# i18n English plan — My Starday product

**Status:** In progress (platform shipped; P0 UI extraction ongoing)  
**ADR:** [`docs/adr/ADR-017-family-locale-i18n.md`](adr/ADR-017-family-locale-i18n.md)  
**Last updated:** 2026-07-23

---

## 1. Nuläge (verifierat i kod)

| Komponent | Före | Efter denna branch |
|-----------|------|---------------------|
| `src/lib/i18n.js` | Laddade `sv.json`, `t()` oanvänd i routes | `sv-SE` + `en-GB`, fallback, `compareLocaleStructures()` |
| `src/lib/locale.js` | Fanns inte | **Ny** — enda locale-resolver |
| `public/js/i18n.js` | Auto-load `sv`, 3 attribut | `I18n.init()`, `sessionStorage`, `data-i18n-aria-label`, `data-i18n-title` |
| `family.preferred_locale` | Fanns inte | Migration + API |
| Registrering | Hårdkodade aktiviteter i `register.js` | `config/default-content/<locale>/` |
| Journey registry | `locale` kolumn, default `sv` | Normalisering `sv-SE`, seed `en-GB` |
| Experience pack | Endast `child_se` | + `child_en` |
| E-post auth | Svenska hårdkodat | `t(familyLocale, …)` för verify + reset |
| Feature flag | `engelsk_landingssida` (marknad) | + `english_app` (produkt) |

**Oförändrat medvetet:** ~200 HTML-sidor med hårdkodad svenska i P2+ ytor; admin; SEO-artiklar; juridik.

---

## 2. Beslut (sammanfattning)

Se ADR-017. Kärntermer:

| Svenska | English (en-GB) |
|---------|-----------------|
| Swedish brand | My Starday |
| Hem | Home |
| Idag | Today |
| Skattkammaren | Treasure Chest |
| Stjärnor | Stars |
| Schema | Schedule |
| … | (full lista i ADR) |

---

## 3. Arkitektur

```
Browser                    Server                         Data
───────                    ──────                         ────
I18n.init()          →     locale.js (normalize/validate)
sessionStorage       →     family.preferred_locale (DB)
data-i18n*           →     i18n.t(lang, key)
/api/i18n/:lang      →     locales/*.json
register POST        →     default-content/<locale>/
Journey context      →     journey_experience_registry.locale
Child world          →     experience-packs/child_{se|en}/
Email send           →     family.preferred_locale (never client)
```

---

## 4. Locale-resolution

1. `family.preferred_locale` (efter registrering)
2. `preferred_locale` / `language` vid registrering
3. `Accept-Language` (pre-auth)
4. Fallback `sv-SE`

**Regel:** Locale ändras aldrig automatiskt efter att familjen skapats.

---

## 5. API

| Endpoint | Syfte |
|----------|--------|
| `GET /api/i18n` | Lista språk + default |
| `GET /api/i18n/:lang` | Bundle (400 om ogiltig) |
| `GET /api/i18n/options` | Pre-auth: `english_app_enabled` |
| `POST /api/auth/register` | `preferred_locale` optional |
| `GET /api/auth/me` | `preferred_locale` |
| `PUT /api/family/settings` | `preferred_locale` (+ `english_app` gate) |
| `GET /api/family/locale-options` | Autentiserad locale + flag |

---

## 6. Migrationer

| Fil | Innehåll |
|-----|----------|
| `1810000000001_family_preferred_locale.js` | Kolumn + backfill + CHECK |
| `1810000000002_english_i18n_feature_flags.js` | `features`: `english_app`, `english_child_experience` (dev, OFF) |
| `1810000000003_journey_registry_locale_en_gb.js` | sv→sv-SE + en-GB seed |

Sekvens: direkt efter `1810000000000_family_avatar_private_storage.js`.

## 6b. child_en-skydd

`english_child_experience` (per familj via `family_features`) krävs utöver `english_app` för att runtime ska välja `child_en`. Annars `child_se` även för `en-GB`.

## 6c. Auth-mejl locale

Se `src/lib/auth-email-locale.js` och `docs/i18n-foundation-hardening.md`.

---

## 7. Testmatris

| Test | Fil |
|------|-----|
| Normalisering, fallback, Accept-Language | `test/i18n-locale.test.js` |
| Locale-struktur sv/en paritet | `test/i18n-locale.test.js` |
| Default content loader | `test/i18n-locale.test.js` |
| Registrering en-GB | `test/i18n-registration-integration.test.js` |
| Audit P0 svenska | `npm run audit:i18n` / `audit:i18n:strict` / `audit:i18n:baseline` |
| Pack gating | `test/i18n-child-pack-flags.test.js` |
| Auth email locale | `test/i18n-auth-email.test.js` |
| Hardening matrix | `test/i18n-foundation-hardening.test.js` |

Kör: `NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false npm run test:gate`

---

## 8. Definition of done — publik engelsk beta

- [ ] Registrering → första stjärna utan synlig svenska i P0/P1
- [ ] Barnupplevelse användbar på en-GB (`child_en`)
- [ ] Auth-mejl på rätt språk
- [ ] Locale överlever logout, reload, ny enhet, onboarding resume
- [ ] `english_app` per familj i admin
- [ ] Mobil QA iPhone + Android
- [ ] Juridiska en-texter märkta **LEGAL_REVIEW_REQUIRED**

---

## 9. Prioriterad backlog

### P0 (denna branch — plattform + auth)
- [x] Locale-plattform
- [x] DB + API
- [x] Default content
- [x] Registrering + verify/reset email
- [x] Journey en-GB seed
- [x] child_en pack (grund)
- [ ] Onboarding strängar extraherade
- [ ] Login/register/child-login full data-i18n

### P1 (nästa)
- Home / Journey UI
- Today / daily-log
- Schedule hub labels
- Rewards / Treasure Chest
- Settings språkväljare
- Push locale från Journey registry

### P2 (senare)
- Rapporter, pedagog, För dig
- Veckosammanfattning email
- Admin (svenska OK)

### Medvetet svenska (v1)
- Admin panel
- SEO-artiklar (`/morgonrutin-barn` etc.)
- PDF-resurser / bildstöd
- `privacy.html` / `terms.html` (juridisk granskning krävs)
- Pedagog B2B-sidor

---

## 10. Feature flag — instruktion

```sql
-- Per QA family (recommended)
INSERT INTO family_features (family_id, feature_slug)
VALUES ('<family-uuid>', 'english_app')
ON CONFLICT DO NOTHING;

INSERT INTO family_features (family_id, feature_slug)
VALUES ('<family-uuid>', 'english_child_experience')
ON CONFLICT DO NOTHING;
```

Global `feature_flag` används **inte** för `english_app` — se `features` + `family_features`.

---

## 11. Deploy / SW

Efter merge till `main`:

1. Migration körs automatiskt via deploy
2. Bump `config/cache-version.json` + `public/sw.js` CACHE_NAME (statiska JS ändrade)
3. Verifiera `GET /api/i18n/en-GB` returnerar bundle
4. Registrera testkonto med `preferred_locale: en-GB`

---

## 12. Manuell QA-checklista

1. `/register` — byt till English, registrera, verifiera mejl på engelska
2. Onboarding — inga blockerande svenska strängar
3. Home — coach på engelska (kräver `english_app` + journey DB)
4. Barnlogin — enkel engelska
5. Första aktivitet → stjärna — firande på engelska
6. Logga ut / in — locale kvar
7. Svenskt befintligt konto — oförändrat utan flag

---

## 13. Risker

| Risk | Åtgärd |
|------|--------|
| Stora JS-filer (dashboard, schedule) | Inkrementell extraktion, audit-script |
| Admin-bibliotek svenska för en familjer | en-GB använder locale-filer, inte DB templates |
| Journey JSON-fallback svenska | DB seed en-GB + locale candidates |
| Juridiska texter | Ej auto-godkända |
