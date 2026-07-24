# Public web i18n coverage

## URL structure

| Swedish | English | Status |
|---------|---------|--------|
| `/` | `/en` | ✅ Landing |
| `/faq` | `/en/faq` | ✅ P0 |
| `/kontakt` | `/en/contact` | ✅ P0 |
| `/privacy` | `/en/privacy` | ⚠️ Working EN + legal review banner |
| `/terms` | `/en/terms` | ⚠️ Working EN + legal review banner |
| `/pricing-info` | `/en/pricing` | ✅ P0 |
| — | `/en/how-it-works` | ✅ P0 |
| `/register` | `/en/register` | ✅ Same app page + language choice |
| `/login` | `/en/login` | ✅ i18n auth entry |
| `/forgot-password` | `/en/forgot-password` | ✅ i18n auth entry |

## SEO

- `hreflang` on P0 English pages (sv-SE / en-GB / x-default where applicable).
- `src/lib/seo-pages.js` indexable paths updated.
- `public/js/public-lang-switcher.js` on English marketing pages.

## Remaining scope (later phases)

| Area | Notes |
|------|-------|
| SEO articles (`/morgonrutin-barn`, …) | Swedish only — inventory for curated migration |
| `/resurser/*` PDF hub | Swedish only |
| `/pedagoger-och-terapeuter` | Swedish professional landing |
| `/skattkammaren` demo | Swedish marketing copy |
| Accessibility statement | Not yet duplicated in EN |

## Auth / app

Logged-in product routes are **not** duplicated under `/en/*` (ADR-017). Locale is `family.preferred_locale` + client i18n bundles.

## Registry

Route pairs: `config/public-web-routes.js`  
Server mount: `src/routes/public-pages.js`
