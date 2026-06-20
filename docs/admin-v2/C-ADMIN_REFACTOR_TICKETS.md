# C. Admin refactor tickets (PR plan + acceptance criteria)

Base branch: `main`. Implementation branch: `cursor/admin-v2-all-phases-458a`.
All work ships as ordered commits mapping to the PRs below.

---

## PR 1 — Fas 1A: grouped nav + renames + Start default

**Goal:** turn the 23-item flat menu into 6 groups, rename labels, remove emojis, make Start the
default landing. Pure UI/IA — no `resolveRoute` yet.

**Files:** `public/admin/admin-nav.js` (new, config + render), `public/admin/index.html`
(sidebar markup → rendered container, breadcrumb container, page title), `public/admin/admin-core.js`
(render nav on init, default to Start).

**Out of scope:** alias resolution engine, special-route scroll/subview, Start dashboard.

**Acceptance:** 6 groups visible; max 2 levels; no emojis; Paketintresse + Pedagogintresse under
Tillväxt; Bildbank under Landningssidor; Välkomstmail under E-postmallar; Användning/Användarinsikter
under Produktanalys; Föräldraaktivering/För dig under Experiment; default after login is Start;
breadcrumb shows "Hem → Start".

## PR 2A — routing foundation

**Goal:** central route registry + `resolveRoute()` + `navigateToRoute()` + alias resolution +
breadcrumb derivation + active-nav state, driven by `hashchange`.

**Files:** `admin-nav.js` (route map + aliases), `admin-core.js` (resolve/navigate, hashchange).

**Acceptance:** `#overview`→Start, `#families`→Familjer, `#analytics`→Produktanalys,
`#intresseanmalningar`→Pedagogintresse all work; breadcrumb/title/active-nav all derive from one
route object; old bookmarks don't break.

## PR 2B — special routes + refresh registry

**Goal:** `#paketintresse` (scroll anchor), `#valkomstmail` (email tab), `#bildbank`; refresh
registry so every section reloads on enter (incl. retention, dagensnyhet, landning, undersokningar,
nyhetsbrev).

**Files:** `admin-nav.js` (subview/scrollTarget), `admin-core.js` (refresh registry, post-show
actions), `index.html` (add `#paketintresse-anchor`).

**Acceptance:** `#paketintresse` opens Prenumeration and scrolls to the interest block;
`#valkomstmail` opens E-postmallar on the welcome tab; `#bildbank` opens Bildbank; all listed
sections refresh on enter.

## PR 3 — Fas 2A: Start dashboard MVP

**Goal:** Start aggregator endpoint + Start dashboard (Block A/B/C/D).

**Files:** `src/routes/admin/start-summary.js` (new) + mount in `src/routes/admin.js`;
`public/admin/admin-start.js` (new); `index.html` (Start blocks markup); refresh registry wiring;
`test/admin-start-summary.test.js` (new).

**Acceptance:** Start shows unread + to-handle, 4 growth KPIs with 7d deltas, activity feed,
shortcuts; loading/empty/error states behave; aggregator returns the §B-7 contract.

## PR 4 — Fas 2B: Produktanalys consolidation

**Goal:** Produktanalys as a tabbed hub; Användning + Användarinsikter reachable as tabs while
their routes still work.

**Acceptance:** `#produktanalys` shows tabs; `#anvandning`/`#anvandarinsikter` open the right tab.

## PR 5 — Fas 2C: communication/growth consolidation

**Goal:** Välkomstmail lives inside E-postmallar (tab); Bildbank presented within Landningssidor;
Paketintresse as a first-class subview of Prenumeration.

**Acceptance:** no duplicate top-level Välkomstmail; Bildbank reachable from Landningssidor;
Paketintresse is a labelled subview, not just an anchor.

## PR 6 — Fas 3A: Familjer kontrollcenter

**Goal:** a family detail view aggregating subscription + activity + audit-log + related messages
(by email) + impersonation, without hopping sections.

**Files:** `src/routes/admin/family.js` (new `GET /families/:id/overview`), admin family JS, modal/panel.

**Acceptance:** opening a family shows support + subscription + activity in one view.

## PR 7 — Fas 3B: Meddelanden inbox

**Goal:** inbox filters (Olästa / Att hantera / Alla), mark handled, family context link.

**Acceptance:** sortable/filterable by unread/handled; thread shows family context; jump to family.

## PR 8 — Fas 3C: Tillväxt lead pipeline

**Goal:** shared lead status (Ny/Kontaktad/Kvalificerad/Konverterad/Avslutad) for package interest,
professional interest, waitlist.

**Files:** migration adding `lead_status` + `lead_note` to `package_interest`,
`professional_interest`, `waitlist`; admin endpoints to update status; UI status pills + filters.

**Acceptance:** each lead can be moved through statuses and filtered; persists across reloads.

## PR 9 — Fas 3D–G: command palette + object links + smart Start

**Goal:** ⌘K/Ctrl+K palette (navigate to sections, families, messages); cross-object links;
basic decision-support cards on Start.

**Acceptance:** palette opens with ⌘K and can navigate to any section + jump to a family/message;
object links connect family ↔ message ↔ interest; Start shows at least one recommendation card.

---

## QA checklist (run per PR)

- `npx eslint src/ server.js` clean (no new errors).
- `node --check` on each changed `public/admin/*.js`.
- `NODE_ENV=test npm test` — no new failures vs baseline (1 pre-existing failure allowed:
  `test/release-os.test.js`).
- Manual: nav all groups; old hashes resolve; mobile menu works; sections refresh on enter.

## Dependencies

PR 2A depends on PR 1. PR 2B depends on PR 2A. PR 3 depends on PR 2B (refresh registry).
PR 4/5 depend on PR 2B (subview/tab plumbing). PR 6–9 depend on PR 3 (Start + nav stable).
