# D. Gaps, decisions and guardrails (Admin v2)

Companion to A/B/C specs. Documents codebase reality checks and locked product decisions.

> **Leveransstatus (2026-06-20):** Kritiska gap #1–#6 och routing-gap #7–#11 åtgärdade i PR 1–10.  
> Se `ADMIN-V2-DELIVERY.md`.

---

## Guardrails (verbatim policy)

### 1. Start is operational overview, not source of truth

> Start-sidan i Fas 2 får använda proxylogik och syntetiska sammanställningar. Den ska hjälpa
> admin att prioritera arbete, men ska inte presenteras som en fullständig inbox- eller
> pipeline-sanning innan meddelande- och leadmodellerna är utbyggda.

### 2. Inbox requires a data model

> En riktig meddelandeinbox med “obesvarat”, familjkontext och trådar är inte en ren UI-fråga.
> Den kräver minst `status`/`answered_at` och helst `family_id` eller motsvarande explicit koppling.

### 3. Pipeline requires lead status

> Paketintresse, pedagogintresse och waitlist kan grupperas i navigationen innan de delar
> datamodell, men en gemensam pipelinevy ska inte byggas innan status/ägare/anteckningar finns
> definierade per lead.

### 4. Canonical route is product URL; legacy hash is compatibility

> I Fas 1–2 ska navigationen använda canonical routes. Legacy-hashar ska fortsatt fungera men
> alltid resolvas till canonical route innan titel, breadcrumb, refresh och aktiv meny beräknas.
> Menyn skriver canonical hash till URL vid navigering.

---

## Locked decisions

| Topic | Decision |
|-------|----------|
| Canonical URL on menu click | **Write canonical** (e.g. `#familjer`, not `#families`) |
| Legacy bookmark | Resolve internally; may `replaceState` to canonical on load |
| DOM section ids in Fas 1–2 | **Keep** (`overviewSection`, etc.) |
| Välkomstmail | Route to `emailmallar` + tab; deprecate `valkomstmailSection` UI in PR 5 |
| Produktanalys Fas 2B | **Option 2:** tab-bar routing between existing sections, not one merged DOM |
| Message “obesvarat” in Fas 2 | **Renamed** to “att följa upp” with documented heuristic |
| Start block order | **Tillväxt first**, then meddelanden |
| Fas 3 ordering | Data model (PR 6, 8) before inbox/pipeline UX (PR 7, 8 UI) |

---

## Gap register (codebase audit)

### Critical — affects Fas 2/3 design

| # | Gap | Impact | MVP workaround | Proper fix (PR) | Status |
|---|-----|--------|----------------|-----------------|--------|
| 1 | `contact_message` has no `answered_at` / `status` | Cannot show true “obesvarat” | Heuristic: unread OR read without `internal_note` | PR 6 | ✅ Fixed |
| 2 | No `family_id` on `contact_message` | No reliable message→family | Email match on `parent.email` | PR 7 | ✅ Fixed |
| 3 | No `GET /api/admin/start-summary` | Start needs new endpoint | Build composed aggregator | PR 3 | ✅ Fixed |
| 4 | Package interest `/summary` is totals only | No 7d/prev7d for Start | New SQL in aggregator | PR 3 | ✅ Fixed |
| 5 | No unified activity/event table | Feed must be composed | Multi-table UNION in aggregator | Optional activity PR | ⏸ Optional |
| 6 | No `lead_status` on interest tables | No pipeline | Counts/lists only on Start | PR 8 | ✅ Fixed |

### Important — affects Fas 1 routing

| # | Gap | Impact | Fix (PR) | Status |
|---|-----|--------|----------|--------|
| 7 | Duplicate `valkomstmailSection` + `emailmallarSection` | Ghost section / wrong route | PR 2B route; PR 5 hide | ✅ Fixed |
| 8 | `admin-library.js` patches `showSection` | Routing can break library load | PR 2B compatibility test | ✅ Fixed |
| 9 | Canonical vs legacy hash mismatch (`#dagens-nyhet` vs `#dagensnyhet`) | Alias map required | PR 2A | ✅ Fixed |
| 10 | `#paketintresse-anchor` missing in HTML | Scroll route fails | PR 2B | ✅ Fixed |
| 11 | Sections not refreshed on enter | Stale data | PR 2B registry | ✅ Fixed |
| 12 | `Funktioner` is external | No breadcrumb in shell | Documented; intentional | ✅ By design |
| 13 | Messages are flat rows, not threads | “Trådar” is UX fiction until model exists | PR 7 | ✅ Accepted |
| 14 | ESLint does not cover `public/admin/` | Admin JS via `node --check` only | QA checklist | ✅ By design |
| 15 | Produktanalys already has internal analytics tabs | Consolidation scope ambiguous | PR 4 = shell + routing only | ✅ Fixed |

---

## `contact_message` schema (efter migration 1807800000000)

```
id, name, email, message, message_type, is_read, internal_note, noted_at, noted_by, created_at,
status, answered_at, assigned_to, family_id
```

No: `thread_id` (meddelanden är fortfarande platta rader, inte trådar).

---

## Subview vocabulary (do not rename in Fas 1–2)

| Route | subview value | Mechanism |
|-------|---------------|-----------|
| `#valkomstmail` | `valkomstmail` | `switchEmailTab('valkomstmail')` |
| `#paketintresse` | `paketintresse` | scroll + later tab |
| `#bildbank` (Fas 2C) | `bildbank` | landning tab |

---

## Fas summary

| Fas | Status | Focus |
|-----|--------|-------|
| **1** | ✅ Delivered | IA, canonical routing, refresh — no backend rewrites |
| **2** | ✅ Delivered | Start aggregator + proxy; light consolidation |
| **3** | ✅ Delivered | **Data** (message + lead models) then **UX** (inbox, pipeline, family hub, search) |

---

## When to start coding

**Avslutat 2026-06-20.** Nya admin-ändringar: skapa ny ticket utanför PR 1–10-planen eller se out-of-scope i `ADMIN-V2-DELIVERY.md`.
