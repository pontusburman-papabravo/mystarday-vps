# A. Admin navigation spec (implementation source of truth)

This is the canonical spec for the new admin information architecture (IA), routing,
breadcrumbs, refresh policy and special routes. The runtime implementation lives in
`public/admin/admin-nav.js` (config + render) and `public/admin/admin-core.js`
(`resolveRoute` / `navigateToRoute`).

## 0. Core principles (locked)

1. **Canonical routes are the product.** IA is designed around them.
2. **`targetSection` is implementation.** It may keep the legacy DOM id/section key in Fas 1.
3. **Aliases always resolve to a canonical route first.** All downstream logic works on the
   canonical route object, never on the raw alias.
4. **Breadcrumb, active nav, page title and refresh derive from one route object.** Not from
   four different places in the code.
5. **Subview / tab / scroll is declarative in config.** No special cases hidden in
   `if (hash === '#valkomstmail')`.
6. **Hash-writing policy:** legacy aliases are preserved in the URL (we do NOT rewrite the
   URL to canonical), but every internal consumer reads the resolved canonical route. This
   keeps old bookmarks/links intact and avoids surprising the user with URL changes.

## 1. Groups (6) and items

```
HEM            Start · Familjer · Meddelanden
TILLVÄXT       Paketintresse · Pedagogintresse · Waitlist (EN) · Landningssidor (→ Bildbank) · Undersökningar
KOMMUNIKATION  Nyhetsbrev · E-postmallar · E-postlogg · Kampanjer (→ Dagens nyhet)
INSIKTER       Produktanalys (→ Användning, Användarinsikter) · Retention · Experiment (→ Föräldraaktivering, För dig)
INNEHÅLL       Bibliotek
INSTÄLLNINGAR  Prenumeration & IAP · Funktioner · Konto
```

Rules: max 2 nav levels, no emojis in the menu, Swedish labels (except `Waitlist (EN)`),
menu label == page title == last breadcrumb segment.

## 2. Table 1 — Route registry (canonical → implementation)

| canonical | label | group | targetSection (DOM key) | subview | aliases | breadcrumb | refreshKey |
|-----------|-------|-------|--------------------------|---------|---------|------------|------------|
| `#start` | Start | home | `overview` | – | `#overview` | Hem → Start | `overview` |
| `#familjer` | Familjer | home | `families` | – | `#families` | Hem → Familjer | `families` |
| `#meddelanden` | Meddelanden | home | `messages` | – | `#messages` | Hem → Meddelanden | `messages` |
| `#paketintresse` | Paketintresse | growth | `prenumeration` | `paketintresse` | – | Tillväxt → Paketintresse | `prenumeration` |
| `#pedagogintresse` | Pedagogintresse | growth | `intresseanmalningar` | – | `#intresseanmalningar` | Tillväxt → Pedagogintresse | `intresseanmalningar` |
| `#waitlist` | Waitlist (EN) | growth | `waitlist` | – | – | Tillväxt → Waitlist (EN) | `waitlist` |
| `#landningssidor` | Landningssidor | growth | `landning` | – | `#landning` | Tillväxt → Landningssidor | `landning` |
| `#bildbank` | Bildbank | growth | `bildbank` | – | – | Tillväxt → Landningssidor → Bildbank | `bildbank` |
| `#undersokningar` | Undersökningar | growth | `undersokningar` | – | – | Tillväxt → Undersökningar | `undersokningar` |
| `#nyhetsbrev` | Nyhetsbrev | communication | `nyhetsbrev` | – | – | Kommunikation → Nyhetsbrev | `nyhetsbrev` |
| `#epostmallar` | E-postmallar | communication | `emailmallar` | – | `#emailmallar` | Kommunikation → E-postmallar | `emailmallar` |
| `#valkomstmail` | Välkomstmail | communication | `emailmallar` | `valkomstmail` | – | Kommunikation → E-postmallar → Välkomstmail | `emailmallar` |
| `#epostlogg` | E-postlogg | communication | `emaillog` | – | `#emaillog` | Kommunikation → E-postlogg | `emaillog` |
| `#dagens-nyhet` | Dagens nyhet | communication | `dagensnyhet` | – | `#dagensnyhet` | Kommunikation → Kampanjer → Dagens nyhet | `dagensnyhet` |
| `#produktanalys` | Produktanalys | insights | `analytics` | – | `#analytics` | Insikter → Produktanalys | `analytics` |
| `#anvandning` | Användning | insights | `anvandning` | – | – | Insikter → Produktanalys → Användning | `anvandning` |
| `#anvandarinsikter` | Användarinsikter | insights | `anvandarstatistik` | – | `#anvandarstatistik` | Insikter → Produktanalys → Användarinsikter | `anvandarstatistik` |
| `#retention` | Retention | insights | `retention` | – | – | Insikter → Retention | `retention` |
| `#foraldaraktivering` | Föräldraaktivering | insights | `foraldaraktivering` | – | – | Insikter → Experiment → Föräldraaktivering | `foraldaraktivering` |
| `#fordig` | För dig | insights | `fordig` | – | – | Insikter → Experiment → För dig | `fordig` |
| `#bibliotek` | Bibliotek | content | `defaults` | – | `#defaults` | Innehåll → Bibliotek | `defaults` |
| `#prenumeration` | Prenumeration & IAP | settings | `prenumeration` | – | – | Inställningar → Prenumeration & IAP | `prenumeration` |
| `#funktioner` | Funktioner | settings | (external `/admin/development`) | – | – | – | – |
| `#konto` | Konto | settings | `password` | – | `#password` | Inställningar → Konto | `password` |

Default route after login: **`#start`** (legacy `#overview` resolves to it).

## 3. Table 2 — Section registry (actual DOM + loaders today)

| sectionKey | domId | loader(s) called on enter | supportsSubviews |
|------------|-------|----------------------------|------------------|
| `overview` | `overviewSection` | `refreshAdminStats()` + `loadOverviewStats()` | no |
| `families` | `familiesSection` | `loadFamilies()` | no |
| `messages` | `messagesSection` | `loadMessages()` | no |
| `defaults` | `defaultsSection` | `switchLibTab('activities')` | yes (tabs) |
| `prenumeration` | `prenumerationSection` | `loadSubscriptionSettings()` (incl. `loadPackageInterest`) | yes (scroll anchor) |
| `intresseanmalningar` | `intresseanmalningarSection` | `loadInterests()` | no |
| `waitlist` | `waitlistSection` | `loadWaitlist()` | no |
| `landning` | `landningSection` | `loadLandingNews()` | no |
| `bildbank` | `bildbankSection` | `loadAdminImages()` | no |
| `emailmallar` | `emailmallarSection` | `loadEmailTemplates()` (+ `switchEmailTab(subview)`) | yes (tabs) |
| `valkomstmail` | `valkomstmailSection` | `loadWelcomeEmailTemplate()` (legacy; routed away from in Fas 1) | n/a |
| `analytics` | `analyticsSection` | `loadAnalytics()` | yes (tabs) |
| `anvandarstatistik` | `anvandarstatistikSection` | `loadUserStats()` | no |
| `anvandning` | `anvandningSection` | `loadLoginStats()` | no |
| `retention` | `retentionSection` | `loadRetentionData()` | no |
| `foraldaraktivering` | `foraldaraktiveringSection` | `loadActivationProgramAdmin()` | no |
| `fordig` | `fordigSection` | `loadForDigAdmin()` | no |
| `dagensnyhet` | `dagensnyhetSection` | `loadNyheter()` | no |
| `nyhetsbrev` | `nyhetsbrevSection` | `loadNewsletterSubscribers()` | no |
| `emaillog` | `emaillogSection` | `loadEmailLog()` | no |
| `undersokningar` | `undersokningarSection` | `loadSurveys()` | no |
| `password` | `passwordSection` | (no loader; forms) | no |

Sections **previously NOT refreshed on menu enter** (fixed by the refresh registry):
`retention`, `dagensnyhet`, `landning`, `undersokningar`, `nyhetsbrev`.

## 4. `resolveRoute(hash)` — pseudocode

```
function resolveRoute(hash):
  raw = normalize(hash)                 # strip '#', lowercase, '' -> 'overview'/'start'
  if raw in ALIAS_MAP: raw = ALIAS_MAP[raw]   # alias -> canonical key
  route = ROUTE_MAP[raw] or ROUTE_MAP['start']
  return {
    canonical, section, navId, pageTitle,
    breadcrumb[], subview|null, scrollTarget|null, requestHash: raw
  }
```

## 5. `navigateToRoute(hash)` — ordered flow

1. `route = resolveRoute(hash)`
2. set active nav item (and visually keep its group/parent highlighted)
3. render page title
4. render breadcrumb
5. show the `targetSection` DOM (hide others)
6. run refresh handler for `refreshKey`
7. open subview/tab if `route.subview` (e.g. `switchEmailTab('valkomstmail')`)
8. scroll to `route.scrollTarget` if present (e.g. `#paketintresse-anchor`)
9. close mobile menu

Bound to: nav clicks (`preventDefault` + `navigateToRoute`) and `window.hashchange`.

## 6. Special routes

- `#paketintresse` → section `prenumeration`, scrolls to `#paketintresse-anchor` (a new anchor
  added on the Paketintresse block). Fas 1 = anchor; Fas 2 = first-class subview.
- `#valkomstmail` → section `emailmallar`, subview `valkomstmail` (tab), NOT the legacy
  `valkomstmailSection`.
- `#bildbank` → section `bildbank` (kept as own section; nav nests it under Landningssidor).

## 7. Known gaps / constraints (must read before coding)

- `admin-library.js` currently **monkey-patches `showSection`** (wraps the global). The new
  `navigateToRoute`/`showSection` must remain compatible: keep a `showSection(sectionKey)`
  shim, or move the library-tab refresh into the refresh registry. Chosen approach: keep
  `showSection` as a thin wrapper that the registry calls, so the existing patch still works.
- `#funktioner` is an external page (`/admin/development`); it is a normal link, not a route.
- Page title element: `#pageTitle`. Breadcrumb container: `#adminBreadcrumb` (added in PR 1).
