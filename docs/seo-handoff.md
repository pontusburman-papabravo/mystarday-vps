# SEO-handoff — Min Stjärndag <!-- pragma: allowlist secret -->

**Syfte:** Denna fil är till för nästa agent/utvecklare. Läs den innan du börjar jobba med SEO, landningssidor eller indexering.

**Senast uppdaterad:** 2026-06-23  
**Status:** Sprint 1–3 + landing v2 sidor (`/faq`, `/kontakt`) **implementerat**. Search Console (SEO-14) kvar.

---

## 1. Sammanfatta läget i en mening

Den tekniska SEO-grunden och sidrollerna är på plats, inklusive `/faq` och `/kontakt` efter landing v2. **Bygg inte om från ticket 1.** Nästa arbete är uppföljning (Search Console, `/en`-beslut, copy-finjustering utifrån data).

---

## 2. Strategiska sidroller (beslutade)

| URL | Roll | Index? |
|-----|------|--------|
| `/` | Primär SEO-landning | Ja |
| `/register` | Primär konvertering (Ads, brand) | Ja (sekundär SEO) |
| `/pedagoger-och-terapeuter` | B2B/professionell | Ja |
| `/skattkammaren` | Innehåll om belöningssystem | Ja |
| `/pricing-info` | Tillgång + framtida Apple/Google IAP (inte prissida) | Ja |
| `/faq` | Fullständig FAQ (långsvans-SEO) | Ja |
| `/kontakt` | Kontakt (branded/trust) | Ja (låg prioritet) |
| `/privacy` | Juridik | Ja |
| `/en` | Engelsk landning | Endast om feature flag är på |
| `/login` + auth-routes | Funktion | **Nej** (`noindex`) |

**Princip:** SEO drivs av `/` + `/skattkammaren` + `/pedagoger-och-terapeuter`. Ads drivs av `/register`. Betalningsinfo är lågmäld tills Apple-review är klar.

---

## 3. Vad som redan är gjort

### Kod (merge `16d36e1` på `main`)

| Ticket | Beskrivning | Filer |
|--------|-------------|-------|
| SEO-01 | Dold SEO-text (`font-size:0`) borttagen | `public/index.html` |
| SEO-02 | Canonical på `/` | `public/index.html` (`href="/"`) |
| SEO-03–04 | `noindex` på login + alla icke-marketing HTML | `src/lib/seo-pages.js`, `src/middleware/platform-html.js` |
| SEO-05 | Sitemap uppdaterad | `public/sitemap.xml` |
| SEO-06 | `/register` metadata + hero | `public/register.html` |
| SEO-07 | `/` title, meta, hero-ingress | `public/index.html` |
| SEO-08 | `/register` indexerbar funnel | dokumenterat i `docs/seo-landing-tickets.md` |
| SEO-09 | `/pedagoger-och-terapeuter` metadata + hero | `public/pedagoger-och-terapeuter.html` |
| SEO-10 | `/pricing-info` som publik tillgångssida | `public/pricing-info.html`, `src/routes/public-pages.js` |
| SEO-11 | `/skattkammaren` utökad | `public/skattkammaren.html` |
| SEO-12 | Internlänkar mellan publika sidor | `public/index.html`, undersidor |
| SEO-13 | Problem/lösnings-copy på `/` | `public/index.html` |
| SEO-16 | `/faq` + `/kontakt` indexerbara (landing v2) | `seo-pages.js`, `sitemap.xml`, `faq.html`, `kontakt.html` |

### Landing v2 (2026-06-23)

- `/faq` — full FAQ flyttad från `/`, `FAQPage` JSON-LD, canonical
- `/kontakt` — kontaktformulär flyttat från `/`, canonical
- Kort FAQ + JSON-LD (6 frågor) kvar på `/`

### Tester

- `test/seo-pages.test.js` — noindex, canonical, sitemap, copy
- `test/pricing-info-route.test.js` — pricing-info publik
- `test/meny-v23.test.js` — pricing-info inte billing-gated

### Dokumentation

- `docs/seo-landing-tickets.md` — 15 tickets (13 DONE, 2 backlog)

---

## 4. Produktion — verifierat 2026-06-23

Kör dessa för att dubbelkolla efter ny deploy:

```bash
# noindex
curl -s $APP_URL/login | grep -i noindex
curl -s $APP_URL/dashboard | grep -i noindex

# publika sidor
curl -sI $APP_URL/pricing-info | head -3   # ska vara 200, inte redirect till /dashboard
curl -s $APP_URL/ | grep 'rel="canonical"'
curl -s $APP_URL/sitemap.xml | grep pricing-info
curl -s $APP_URL/sitemap.xml | grep login   # ska INTE finnas

# copy
curl -s $APP_URL/ | grep 'morgonrutiner som havererar'
curl -s $APP_URL/register | grep 'visuellt schema'
curl -s $APP_URL/pricing-info | grep 'Apple App Store'
curl -s $APP_URL/faq | grep 'rel="canonical"'
curl -s $APP_URL/kontakt | grep 'rel="canonical"'
curl -s $APP_URL/faq | grep -i noindex    # ska INTE finnas
curl -s $APP_URL/kontakt | grep -i noindex # ska INTE finnas
curl -s $APP_URL/sitemap.xml | grep faq
```

**Deploy/ops:** Se `AGENTS.md` (deploy & ops). Cloud Agents har inte VPS-nyckel — deploy via GitHub Actions.

---

## 5. Kvar att göra (backlog)

### SEO-14 — Search Console-uppföljning (Growth)

**Kräver:** Pontus Google-konto (inte automatiserbart från agent).

1. Gå till [Google Search Console](https://search.google.com/search-console)
2. Skicka in sitemap: `$APP_URL/sitemap.xml`
3. URL-inspektion → begär indexering för `/register` och `/pricing-info`
4. Efter 2–4 veckor: granska queries, CTR, impressions
5. Finjustera title/meta på `/` utifrån data (plan §9 punkt 12)

### SEO-15 — `/en` indexeringsbeslut (Growth + Dev)

Feature flag: `engelsk_landingssida` i `src/routes/public-pages.js` och `src/routes/landing.js`.

- **Flag OFF:** `/en` redirectar till `/` → överväg ta bort `/en` ur `sitemap.xml`
- **Flag ON:** behåll `/en` + hreflang i sitemap

`SEO_INDEXABLE_PATHS` i `src/lib/seo-pages.js` inkluderar `/en` — justera om flaggan är permanent av.

### Ads + GA4 (relaterat, ej SEO-kod)

- Primär konvertering: **Sign-up** (inte Page view)
- GA4: markera `sign_up` som key event
- Ads final URL: `/register` (3 grupper), `/` (varumärke)

---

## 6. Viktiga implementationdetaljer

### `noindex`-logik

```text
src/lib/seo-pages.js  →  SEO_INDEXABLE_PATHS (allowlist)
src/middleware/platform-html.js  →  injectNoindexMeta() på alla HTML-svar
```

Alla HTML-sidor **utom** allowlist får `<meta name="robots" content="noindex">` injicerat. Ingen manuell `noindex` per auth-fil behövs.

### `/pricing-info` — strategisk ändring

**Tidigare:** redirect till `/dashboard` när `isBillingUiEnabled()` var false.  
**Nu:** alltid publik informationssida om tillgång och framtida Apple/Google-betalning.

Rör inte tillbaka billing-gaten utan explicit produktbeslut.

### Canonical

Planen föreslog `$APP_URL/`. Implementerat som `href="/"` (relativ, fungerar korrekt).

---

## 7. Gör INTE detta igen

- ❌ Lägg tillbaka dold SEO-text
- ❌ Ta bort `seo-pages.js` middleware
- ❌ Gör `/register` till en lång SEO-landning
- ❌ Gör `/pricing-info` till klassisk prissida innan IAP är live
- ❌ Lägg `/login` eller `/dashboard` i sitemap
- ❌ Börja om Sprint 1 från scratch

---

## 8. Referensdokument

| Fil | Innehåll |
|-----|----------|
| `docs/seo-landing-tickets.md` | 15 Linear/Jira-tickets med DoD |
| `docs/seo-handoff.md` | Denna fil |
| `public/sitemap.xml` | Aktuell indexstrategi |
| `src/lib/seo-pages.js` | Indexeringsallowlist |

---

## 9. Kontakt mellan agenter

**SEO-implementering (klar):** agent `cursor/seo-landing-plan-7e37`, PR #293, merge `16d36e1`.

**Nästa agent börjar med:** SEO-14 (Search Console) och SEO-15 (`/en`), samt eventuell copy-finjustering efter data — inte ny grundimplementation.
