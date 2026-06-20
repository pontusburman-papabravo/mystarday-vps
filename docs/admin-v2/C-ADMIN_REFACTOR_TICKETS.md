# C. Admin refactor tickets v2 (PR plan)

> **Leveransstatus (2026-06-20):** PR 1–10 levererade och mergade till `main`.  
> Se `ADMIN-V2-DELIVERY.md` för deploy, migrationer och kvarvarande out-of-scope.

Base: `main`. Ursprunglig feature branch: `cursor/admin-v2-all-phases-458a` (Fas 1–2, PR #184), Fas 3 (PR #192).

**Fas 1** = green (IA + routing). **Fas 2** = honest MVP (Start + consolidation).
**Fas 3** = split into **data migrations** then **UX** — do not mix UI-only inbox/pipeline
with schema work in one PR.

Spec references: `A-admin-nav-spec.md`, `B-START_PAGE_SPEC.md`, `D-GAPS_AND_DECISIONS.md`.

---

## PR 1 — Fas 1A: grouped nav + renames + Start default

**Capability:** UI-only routing (legacy `showSection` still drives sections).

| | |
|---|---|
| **Goal** | 23 flat items → 6 groups; labels; no emojis; Start default |
| **Files** | `admin-nav.js` (render only), `index.html`, `admin-core.js` (render nav, default `#start`) |
| **Out of scope** | `resolveRoute`, aliases, special scroll/tab, Start aggregator |

**Acceptance**

- [x] 6 groups, max 2 levels, no emojis
- [x] Paketintresse + Pedagogintresse under Tillväxt
- [x] Bildbank under Landningssidor; Välkomstmail under E-postmallar (nav only)
- [x] Användning/Användarinsikter under Produktanalys; Experiment-children under Insikter
- [x] Login lands on Start; breadcrumb `Hem → Start`
- [x] Funktioner remains external link to `/admin/development`

---

## PR 2A — Routing foundation

| | |
|---|---|
| **Goal** | Route registry, `resolveRoute`, `navigateToRoute`, canonical hash on menu nav, breadcrumb, active state |
| **Files** | `admin-nav.js`, `admin-core.js` |
| **Policy** | Menu writes **canonical** hash; legacy bookmarks resolve to canonical internally |

**Acceptance**

- [x] `#overview` → `#start`; `#families` → `#familjer`; `#analytics` → `#produktanalys`; `#intresseanmalningar` → `#pedagogintresse`
- [x] Title, breadcrumb, active nav from single `RouteResolution`
- [x] `hashchange` wired
- [x] Each route has `capability` in config (per A-spec §2)

---

## PR 2B — Special routes + refresh registry

| | |
|---|---|
| **Goal** | Special routes + full refresh on enter + library wrapper compatibility |
| **Files** | `admin-nav.js`, `admin-core.js`, `index.html` |

**Acceptance**

- [x] `#paketintresse` → prenumeration + scroll `#paketintresse-anchor`
- [x] `#valkomstmail` → `emailmallar` + tab `valkomstmail` (not `valkomstmailSection`)
- [x] `#bildbank` opens Bildbank
- [x] Refresh fixed: `retention`, `dagensnyhet`, `landning`, `undersokningar`, `nyhetsbrev`
- [x] **`admin-library.js` `showSection` wrapper still works** (explicit QA)
- [x] `messagesBadge` survives nav re-render

---

## PR 3 — Fas 2A: Start MVP (proxy + aggregator)

| | |
|---|---|
| **Goal** | Composed `GET /api/admin/start-summary` + Start UI per B-spec v2 |
| **Files** | `src/routes/admin/start-summary.js`, `admin.js` mount, `admin-start.js`, `index.html`, tests |

**In scope**

- Block A growth (7d/prev7d)
- Block B message follow-up **heuristic** (not “obesvarade”)
- Block C synthetic activity
- Block D shortcuts
- Disclaimer in messages block

**Out of scope**

- Real inbox status, threads, pipeline

**Acceptance**

- [x] Growth cards with deltas for package / pedagog / waitlist
- [x] `needsFollowUpCount` uses heuristic from B-spec §2 (ersatt av riktig status efter Fas 3A)
- [x] Activity feed max ~20, typed events with canonical `route`
- [x] Loading / empty / error per block
- [x] Legacy overview KPI grid still below new blocks

---

## PR 4 — Fas 2B: Produktanalys entry (low-risk)

| | |
|---|---|
| **Goal** | `#produktanalys` as primary entry; tabs route to **existing sections** via shared tab-bar (option 2 — low risk) |
| **Approach** | One shell with tab bar that calls `navigateToRoute` for `#anvandning`, `#anvandarinsikter`, internal analytics tabs — **not** one merged DOM section yet |

**Acceptance**

- [x] `#produktanalys` is default analytics view
- [x] `#anvandning` / `#anvandarinsikter` open correct tab/section
- [x] Breadcrumb always `Insikter → Produktanalys → …`

---

## PR 5 — Fas 2C: Kommunikation + Tillväxt consolidation

| Kommunikation | Tillväxt |
|---------------|----------|
| Hide/deprecate `valkomstmailSection` in UI | Paketintresse as labelled subview in Prenumeration |
| `#landningssidor` canonical; `#bildbank` as subview/tab | IA only — not pipeline |

**Acceptance**

- [x] No ghost Välkomstmail top-level section visible
- [x] Bildbank reachable from Landningssidor workspace
- [x] Paketintresse is more than scroll-only (labelled panel/tab)

---

## PR 6 — Fas 3A: Meddelandemodell (DATA)

**Must land before real inbox.**

| | |
|---|---|
| **Migration** | `contact_message`: `status`, `answered_at`, optional `assigned_to` |
| **API** | PATCH status; list filters by status |
| **Statuses** | `new`, `read`, `in_progress`, `answered`, `archived` |

**Acceptance**

- [x] Admin can mark answered / set status
- [x] “Needs follow-up” computable without heuristic (or heuristic retired)
- [x] Start aggregator can use real fields

---

## PR 7 — Fas 3B: Meddelanden inbox (UX)

**Depends on PR 6.**

| | |
|---|---|
| **Goal** | Real inbox: Olästa / Pågående / Besvarade / Arkiverade |
| **Family link** | Min: manual “koppla familj”; Better: `family_id` nullable + backfill where possible |

**Acceptance**

- [x] Filters by status work
- [x] Message shows family context when linked
- [x] Jump to family from message
- [x] Start Block B uses real status (remove disclaimer)

---

## PR 8 — Fas 3C: Leadmodell + pipeline (DATA + UX)

**Depends on PR 6 optional, not blocking.**

| Tables | New fields |
|--------|------------|
| `package_interest`, `professional_interest`, `waitlist` | `lead_status`, `owner`, `last_contacted_at`, `notes`, optional `converted_at` |

**Statuses:** Ny · Kontaktad · Kvalificerad · Konverterad · Avslutad

**Acceptance**

- [x] Status editable per lead type
- [x] Filter by status / source
- [x] Pipeline view (or unified Tillväxt workspace) — not three isolated lists

---

## PR 9 — Fas 3D: Familjer kontrollcenter + objektlänkar

**Depends on PR 6–8 for meaningful links.**

| | |
|---|---|
| **Goal** | Family workspace: subscription, messages, audit, interests, impersonate in one view |
| **API** | `GET /api/admin/families/:id/overview` |

**Acceptance**

- [x] One family view replaces 3–4 section hops for support triage
- [x] Links: family ↔ message ↔ package interest (where data exists)

---

## PR 10 — Global sök / ⌘K + smart Start

**Depends on PR 9.**

| | |
|---|---|
| **Goal** | Command palette: sections, families, messages, leads |
| **Start** | At least one recommendation card (Fas 3E light) |

**Acceptance**

- [x] ⌘K / Ctrl+K opens palette
- [x] Navigate to section, family, message from search
- [x] Start shows prioritisation hint (e.g. unread from paying families — if data allows)

---

## Optional PR — Fas 3D-alt: Admin activity model

Not blocking PR 3. Recommended before PR 10 if feed quality matters.

- Light: keep composed aggregator, standardise event shape
- Robust: `admin_activity` table written on create/update of key entities

---

## Dependency graph

```
PR1 → PR2A → PR2B → PR3
              ↓
         PR4, PR5 (parallel after PR2B)
PR3 → PR6 → PR7
PR2B → PR8 (can parallel PR6)
PR6,7,8 → PR9 → PR10
```

---

## QA checklist (every PR)

- [x] `npx eslint src/ server.js` — no new errors
- [x] `node --check public/admin/*.js` for touched admin files
- [x] `NODE_ENV=test npm test` — no new failures
- [x] Manual: all nav groups; legacy hashes; mobile menu; section refresh on enter
- [x] PR 2B: verify library tab still loads after `defaults` navigation

---

## Out of scope (entire programme)

- Rewriting Familjer list UX in Fas 1
- Full CRM / campaign engine (Fas 3D kommunikationsmotor — future)
- Renaming all DOM section ids to match canonical routes (deferred past Fas 2)
- ESLint coverage for `public/admin/` (use `node --check` until separately scoped)
