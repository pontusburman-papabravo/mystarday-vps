# Dead code inventory (candidates only)

> **Fas 10 B4** — dokumentation only; inga filer raderade i den fasen.
> **Fas 11** — Tier A-filer borttagna 2026-06-24 (SW v315). Se `test/fas11-dead-code.test.js`.

## Metod

För varje klientfil: sök basename (t.ex. `samarbete-hub.js`) i HTML, JS, `src/`, tester och docs.
**Kandidat** = 0–1 referenser utöver filen själv, eller explicit markerad DEPRECATED i kod/docs.

## Borttagna i Fas 11 (Tier A)

| Fil | Status |
|-----|--------|
| `public/js/samarbete-hub.js` | ✅ borttagen |
| `public/admin/admin-interests.js` | ✅ borttagen |
| `public/js/landing-newsletter.js` | ✅ borttagen |
| `public/js/landing-survey-popup.js` | ✅ borttagen |
| `public/js/landing-program-matrix.js` | ✅ borttagen |
| `public/js/program-catalog-render.js` | ✅ borttagen |
| `public/js/pricing-info.js` | ✅ borttagen |
| `public/js/child-package-nav.js` | ✅ borttagen |
| `public/css/program-catalog.css` | ✅ borttagen |

## Granska innan radering

| Fil | Notering |
|-----|----------|
| `public/js/iap-manager.js` | **Behållen** — App Review-stub; IAP återaktiveras via `docs/app-store-iap.md`. |

## Kluster: program-catalog / landing pricing UI

Övergivet klientflöde — **klientfiler borttagna i Fas 11**.

Server-API (`/api/public/program-catalog`, `config/program-catalog.js`) finns kvar för admin/upgrade-preview; kan rensas i separat uppgift om oanvänt.

## Inte död (vanliga falska positiver)

- **Fas 8-moduler** (`dashboard-cta.js`, `child-dashboard-rewards.js`, …) — laddas i respektive HTML
- **Middleware-injicerade** (`parental-gate.js`, `device-mode.js`, …) — via `platform-html.js`, ej alltid i rå HTML
- **SW-precache utan HTML** — fortfarande live via injektion eller child-PWA offline
- **`/pricing-info` HTML-sida** — live statisk tillgångssida; endast orphaned JS/CSS togs bort
