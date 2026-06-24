# Dead code inventory (candidates only)

> **Fas 10 B4** — dokumentation only; inga filer raderade i denna fas.
> Genererad 2026-06-24 via `rg`-svep över `public/js/**` och `public/admin/**`.

## Metod

För varje klientfil: sök basename (t.ex. `samarbete-hub.js`) i HTML, JS, `src/`, tester och docs.
**Kandidat** = 0–1 referenser utöver filen själv, eller explicit markerad DEPRECATED i kod/docs.

## Hög konfidens — inga aktiva laddvägar

| Fil | Referenser | Bevis |
|-----|------------|-------|
| `public/js/samarbete-hub.js` | 0 | `samarbete.html` laddar `samarbete-parent.js` |
| `public/admin/admin-interests.js` | 0 | `admin/index.html` har inline `loadInterests()` (~rad 1980) |
| `public/js/landing-newsletter.js` | 0 | DOM-ids (`landingNewsletterForm`) saknas i HTML |
| `public/js/landing-survey-popup.js` | 1 (self) | Aldrig `<script>`-taggad; `survey-popup.js` används på dashboard |
| `public/js/landing-program-matrix.js` | test only | `test/pricing-info-route.test.js` bekräftar att den inte laddas |
| `public/js/program-catalog-render.js` | döda syskon | Endast från `pricing-info.js` / `landing-program-matrix.js` |
| `public/js/pricing-info.js` | self + test | `pricing-info.html` har inga script-taggar (statisk sida) |
| `public/js/child-package-nav.js` | docs + test | DEPRECATED av barnmeny v2; `child-worlds.js` ersätter |
| `public/css/program-catalog.css` | 0 | Companion till ovan program-catalog-kluster |

## Granska innan radering

| Fil | Notering |
|-----|----------|
| `public/js/iap-manager.js` | Aldrig script-taggrad; App Review-stub. Behåll om IAP återaktiveras (`docs/app-store-iap.md`). |

## Kluster: program-catalog / landing pricing UI

Övergivet klientflöde för dynamisk programmatris:

- `landing-program-matrix.js`
- `program-catalog-render.js`
- `pricing-info.js`
- `landing-newsletter.js`
- `program-catalog.css`

Server-API (`/api/public/program-catalog`) kan fortfarande finnas; klientrendering är orphaned.

## Inte död (vanliga falska positiver)

- **Fas 8-moduler** (`dashboard-cta.js`, `child-dashboard-rewards.js`, …) — laddas i respektive HTML
- **Middleware-injicerade** (`parental-gate.js`, `device-mode.js`, …) — via `platform-html.js`, ej alltid i rå HTML
- **SW-precache utan HTML** — fortfarande live via injektion eller child-PWA offline

## Nästa steg (ej i Fas 10)

1. Ta bort Tier A-filer en i taget med PR + regressionstest
2. Uppdatera `test/pricing-info-route.test.js` / `test/meny-v22.test.js` vid borttag
3. Verifiera att ingen admin-route förlitar sig på `admin-interests.js`
