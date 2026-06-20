# A. Admin navigation spec v2

> **Leveransstatus (2026-06-20):** Implementerad i `admin-nav.js` + `admin-core.js`. Se `ADMIN-V2-DELIVERY.md`.

Single source of truth for IA, canonical routes, legacy aliases, section mapping,
breadcrumbs, subviews, refresh policy and route capability. Runtime target:
`public/admin/admin-nav.js` + `public/admin/admin-core.js`.

---

## 0. Guardrails (read first)

1. **Start is operational overview, not source of truth** — Fas 2 uses proxy/synthetic data.
2. **Inbox requires a data model** — real “obesvarat” needs `status`/`answered_at` (Fas 3A).
3. **Pipeline requires lead status** — shared pipeline UI waits for lead fields (Fas 3C).
4. **Canonical route is the product URL; legacy hash is compatibility** — menu uses canonical;
   legacy bookmarks resolve internally; navigation via menu **writes canonical hash** to the URL.

---

## 1. Core principles (locked)

| # | Principle |
|---|-----------|
| 1 | **Canonical routes are the product.** IA is designed around them. |
| 2 | **`targetSection` is implementation.** Legacy DOM keys stay in Fas 1–2. |
| 3 | **Aliases resolve to canonical first.** All logic uses the canonical route object. |
| 4 | **Title, breadcrumb, active nav, refresh derive from one route object.** |
| 5 | **Subview / tab / scroll is declarative in config.** No scattered `if (hash === …)`. |
| 6 | **A route is a navigation surface**, not necessarily its own DOM section. |
| 7 | **Routes declare `capability`** so the spec does not promise more than the system can do. |

### Canonical URL policy (Fas 1–2)

| Situation | Behaviour |
|-----------|-----------|
| User opens legacy bookmark `#overview` | Resolve to `#start` internally; title/breadcrumb/active nav use `#start` |
| User clicks menu item | `history` / `location.hash` set to **canonical** route (e.g. `#familjer`) |
| Incoming legacy hash | Resolve to canonical; optional `replaceState` to canonical (recommended on first load) |
| Render target | May remain `overviewSection`, `familiesSection`, etc. |

---

## 2. Route capability model

```ts
type RouteCapability =
  | 'stable'              // full support in current admin
  | 'ui-only'             // new IA/label, same underlying view
  | 'proxy-data'          // composed/heuristic data (Start)
  | 'requires-migration'; // must not ship full UX before DB/API exists

type AdminRouteConfig = {
  id: string;
  canonicalRoute: string;       // e.g. '#start'
  aliases?: string[];
  targetSection: string;        // showSection key / DOM suffix
  subview?: string;             // tab id, e.g. 'valkomstmail'
  scrollTargetId?: string;      // e.g. '#paketintresse-anchor'

  group: 'home' | 'growth' | 'communication' | 'insights' | 'content' | 'settings';
  label: string;
  parentId?: string;
  breadcrumb: string[];

  refreshOnEnter?: boolean;
  refreshHandler?: string;      // registry key

  capability: RouteCapability;
  notes?: string[];
};
```

### `RouteResolution` (output of `resolveRoute`)

```ts
type RouteResolution = {
  canonicalRoute: string;
  requestHash: string;          // raw incoming hash (for debugging)
  targetSection: string;
  subview?: string;
  scrollTargetId?: string;
  navId: string;
  pageTitle: string;
  breadcrumb: string[];
  refreshKey: string;
  capability: RouteCapability;
};
```

---

## 3. Groups (6) and menu structure

```
HEM            Start · Familjer · Meddelanden
TILLVÄXT       Paketintresse · Pedagogintresse · Waitlist (EN) · Landningssidor (→ Bildbank) · Undersökningar
KOMMUNIKATION  Nyhetsbrev · E-postmallar · E-postlogg · Kampanjer (→ Dagens nyhet)
INSIKTER       Produktanalys (→ Användning, Användarinsikter) · Retention · Experiment (→ Föräldraaktivering, För dig)
INNEHÅLL       Bibliotek
INSTÄLLNINGAR  Prenumeration & IAP · Funktioner (extern) · Konto
```

Rules: max 2 nav levels · no emojis in menu · Swedish labels (except `Waitlist (EN)`) ·
menu label == page title == last breadcrumb segment.

Default after login: **`#start`**.

---

## 4. Table 1 — Route registry

| canonical | label | capability | targetSection | subview | aliases | breadcrumb | refreshKey |
|-----------|-------|------------|---------------|---------|---------|------------|------------|
| `#start` | Start | `proxy-data` | `overview` | – | `#overview` | Hem → Start | `overview` |
| `#familjer` | Familjer | `stable` | `families` | – | `#families` | Hem → Familjer | `families` |
| `#meddelanden` | Meddelanden | `stable` | `messages` | – | `#messages` | Hem → Meddelanden | `messages` |
| `#paketintresse` | Paketintresse | `ui-only` | `prenumeration` | `paketintresse` | – | Tillväxt → Paketintresse | `prenumeration` |
| `#pedagogintresse` | Pedagogintresse | `stable` | `intresseanmalningar` | – | `#intresseanmalningar` | Tillväxt → Pedagogintresse | `intresseanmalningar` |
| `#waitlist` | Waitlist (EN) | `stable` | `waitlist` | – | – | Tillväxt → Waitlist (EN) | `waitlist` |
| `#landningssidor` | Landningssidor | `stable` | `landning` | – | `#landning` | Tillväxt → Landningssidor | `landning` |
| `#bildbank` | Bildbank | `ui-only` | `bildbank` | – | – | Tillväxt → Landningssidor → Bildbank | `bildbank` |
| `#undersokningar` | Undersökningar | `stable` | `undersokningar` | – | – | Tillväxt → Undersökningar | `undersokningar` |
| `#nyhetsbrev` | Nyhetsbrev | `stable` | `nyhetsbrev` | – | – | Kommunikation → Nyhetsbrev | `nyhetsbrev` |
| `#epostmallar` | E-postmallar | `stable` | `emailmallar` | – | `#emailmallar` | Kommunikation → E-postmallar | `emailmallar` |
| `#valkomstmail` | Välkomstmail | `ui-only` | `emailmallar` | `valkomstmail` | – | Kommunikation → E-postmallar → Välkomstmail | `emailmallar` |
| `#epostlogg` | E-postlogg | `stable` | `emaillog` | – | `#emaillog` | Kommunikation → E-postlogg | `emaillog` |
| `#dagens-nyhet` | Dagens nyhet | `stable` | `dagensnyhet` | – | `#dagensnyhet` | Kommunikation → Kampanjer → Dagens nyhet | `dagensnyhet` |
| `#produktanalys` | Produktanalys | `ui-only` | `analytics` | – | `#analytics` | Insikter → Produktanalys | `analytics` |
| `#anvandning` | Användning | `ui-only` | `anvandning` | – | – | Insikter → Produktanalys → Användning | `anvandning` |
| `#anvandarinsikter` | Användarinsikter | `ui-only` | `anvandarstatistik` | – | `#anvandarstatistik` | Insikter → Produktanalys → Användarinsikter | `anvandarstatistik` |
| `#retention` | Retention | `stable` | `retention` | – | – | Insikter → Retention | `retention` |
| `#foraldaraktivering` | Föräldraaktivering | `stable` | `foraldaraktivering` | – | – | Insikter → Experiment → Föräldraaktivering | `foraldaraktivering` |
| `#fordig` | För dig | `stable` | `fordig` | – | – | Insikter → Experiment → För dig | `fordig` |
| `#bibliotek` | Bibliotek | `stable` | `defaults` | – | `#defaults` | Innehåll → Bibliotek | `defaults` |
| `#prenumeration` | Prenumeration & IAP | `stable` | `prenumeration` | – | – | Inställningar → Prenumeration & IAP | `prenumeration` |
| `#konto` | Konto | `stable` | `password` | – | `#password` | Inställningar → Konto | `password` |

**Extern (not hash-routed):** `Funktioner` → `/admin/development` — normal `<a href>`, no breadcrumb
in admin shell, no `capability` entry in hash router.

### Planned routes (not activated until migration)

| Route | Status | Blocked by |
|-------|--------|------------|
| `#meddelanden-inbox` | `requires-migration` | Fas 3A message model |
| `#tillvaxt-pipeline` | `requires-migration` | Fas 3C lead model |
| `#tillvaxt` (group overview) | planned | optional; not in Fas 1–2 |

---

## 5. Table 2 — Section registry (DOM + loaders today)

| sectionKey | domId | refreshHandler | supportsSubviews | notes |
|------------|-------|----------------|------------------|-------|
| `overview` | `overviewSection` | `refreshOverview` | no | + Start blocks after PR 3 |
| `families` | `familiesSection` | `loadFamilies` | no | |
| `messages` | `messagesSection` | `loadMessages` | no | flat list, not threads |
| `defaults` | `defaultsSection` | `loadDefaults` | yes | `switchLibTab` |
| `prenumeration` | `prenumerationSection` | `loadSubscriptionSettings` | yes | scroll `#paketintresse-anchor` |
| `intresseanmalningar` | `intresseanmalningarSection` | `loadInterests` | no | |
| `waitlist` | `waitlistSection` | `loadWaitlist` | no | |
| `landning` | `landningSection` | `loadLandingNews` | no | Fas 2C: tab host for bildbank |
| `bildbank` | `bildbankSection` | `loadAdminImages` | no | Fas 2C: subview of landning |
| `emailmallar` | `emailmallarSection` | `loadEmailTemplates` | yes | `switchEmailTab('valkomstmail')` |
| `valkomstmail` | `valkomstmailSection` | — | — | **DEPRECATE in UI**; route to `emailmallar` |
| `analytics` | `analyticsSection` | `loadAnalytics` | yes | internal tabs already exist |
| `anvandarstatistik` | `anvandarstatistikSection` | `loadUserStats` | no | |
| `anvandning` | `anvandningSection` | `loadLoginStats` | no | |
| `retention` | `retentionSection` | `loadRetentionData` | no | was missing from refresh |
| `foraldaraktivering` | `foraldaraktiveringSection` | `loadActivationProgramAdmin` | no | |
| `fordig` | `fordigSection` | `loadForDigAdmin` | no | |
| `dagensnyhet` | `dagensnyhetSection` | `loadNyheter` | no | was missing from refresh |
| `nyhetsbrev` | `nyhetsbrevSection` | `loadNewsletterSubscribers` | no | was missing from refresh |
| `emaillog` | `emaillogSection` | `loadEmailLog` | no | |
| `undersokningar` | `undersokningarSection` | `loadSurveys` | no | was missing from refresh |
| `password` | `passwordSection` | — | no | forms only |

---

## 6. Special / degradable routes

These are **navigation surfaces** that may not map 1:1 to a dedicated section:

| Route | Resolution |
|-------|------------|
| `#paketintresse` | `targetSection: prenumeration` + `scrollTargetId: #paketintresse-anchor` (Fas 1–2); real subview in Fas 2C |
| `#valkomstmail` | `targetSection: emailmallar` + `subview: valkomstmail` — **never** `valkomstmailSection` |
| `#bildbank` | Fas 1–2: own `bildbankSection`; Fas 2C: `landning` + `subview: bildbank` |

Subview tab id for välkomstmail is **`valkomstmail`** (matches `switchEmailTab` in `admin-email-templates.js`).

---

## 7. `resolveRoute(hash)` — pseudocode

```
function resolveRoute(hash):
  raw = normalize(hash)                    // strip '#', lowercase; '' -> 'start'
  canonicalKey = ALIAS_MAP[raw] ?? raw     // legacy -> canonical key
  route = ROUTE_MAP[canonicalKey] ?? ROUTE_MAP['start']
  return RouteResolution {
    canonicalRoute: route.canonicalRoute,
    requestHash: raw,
    targetSection: route.targetSection,
    subview, scrollTargetId, navId, pageTitle,
    breadcrumb, refreshKey, capability: route.capability
  }
```

---

## 8. `navigateToRoute(hash, opts)` — ordered flow

1. `resolution = resolveRoute(hash)`
2. If `!opts.preserveHash` and user navigated via menu → set `location.hash` to `resolution.canonicalRoute`
3. Set active nav (`data-nav-id`) + parent highlight if child route
4. Render `#pageTitle` and `#adminBreadcrumb`
5. `showSection(resolution.targetSection, resolution)` — thin shim, see §9
6. Run refresh registry for `resolution.refreshKey`
7. Apply subview (`switchEmailTab`, landning tab, etc.)
8. Scroll to `scrollTargetId` if set
9. `closeMobileMenu()`

Bind: nav clicks + `window.hashchange`.

---

## 9. Compatibility constraints (codebase reality)

| Constraint | Required handling |
|------------|-------------------|
| `admin-library.js` wraps `showSection` | Keep global `showSection(name, route?)` as shim; registry calls it; library wrapper must still run for `defaults` |
| `valkomstmailSection` duplicate | Hide from nav; never route here after PR 2B; remove/deprecate DOM in PR 5 |
| `#paketintresse-anchor` | Add in PR 2B HTML |
| `messagesBadge` | Re-render on nav build; re-apply after `applyStats()` |
| ESLint | Only `src/` + `server.js`; admin JS validated with `node --check` |
| External Funktioner | Not in hash router; no breadcrumb in admin shell |

---

## 10. Refresh registry (PR 2B)

Every `refreshOnEnter: true` route must call its handler on enter. Minimum set:

`overview`, `families`, `messages`, `defaults`, `prenumeration`, `intresseanmalningar`,
`waitlist`, `landning`, `bildbank`, `nyhetsbrev`, `emailmallar`, `emaillog`, `analytics`,
`anvandarstatistik`, `anvandning`, `retention`, `foraldaraktivering`, `fordig`,
`dagensnyhet`, `undersokningar`.

Previously broken (must fix): `retention`, `dagensnyhet`, `landning`, `undersokningar`, `nyhetsbrev`.
