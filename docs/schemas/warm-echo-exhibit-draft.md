# warm_echo exhibit slot — schema draft (BL-044)

**Status:** Draft — requires Parent HRC (BL-042) before implementation  
**Governed by:** `docs/decisions/adr-memory-hall-bl012.md`  
**Pack reference:** `config/experience-packs/child_se/exhibits.json` v1.1.0+

---

## Purpose

`warm_echo` is a **soft milestone frame** — parent opt-in only. Shows gentle progress without streaks, scores, or pressure.

| Allowed | Forbidden |
|---------|-----------|
| Parent-enabled milestone memory | Auto-populated from streaks |
| Calm copy ("Du har kommit långt") | Leaderboard tone |
| Single frame, skippable | Gamified badges |
| Opt-out anytime | Child settings form (C-01) |

---

## Parent opt-in (HRC — BL-042)

Proposed server fields on `child` or `child_view_config`:

```json
{
  "memory_hall": {
    "warm_echo_enabled": false,
    "warm_echo_opted_in_at": null,
    "warm_echo_opted_in_by_parent_id": null
  }
}
```

**Default:** `false` — no frame shown until parent enables in Förälder flow (surface TBD — Parent HRC).

---

## Exhibit payload (API → client)

When enabled and resolver has a qualifying milestone:

```json
{
  "slot_type": "warm_echo",
  "slot_index": 0,
  "display": {
    "emoji": "🌟",
    "title": "Ett mjukt minne",
    "subtitle": "Från en bra dag",
    "tone": "warm_echo"
  },
  "source": {
    "kind": "milestone",
    "milestone_key": "first_week_complete",
    "occurred_at": "2026-06-28T08:00:00+02:00"
  },
  "parent_opt_in": true
}
```

**Max slots:** 1 `warm_echo` per child (alongside up to 6 total exhibits per ADR).

---

## Resolver rules (draft)

1. If `warm_echo_enabled !== true` → omit slot entirely
2. Eligible milestones (draft list — Parent HRC):
   - `first_week_complete`
   - `first_reward_remembered`
   - `custom_parent_note` (future)
3. No streak-derived milestones
4. No star totals or numeric stats in copy

---

## Pack schema extension

Already registered in `exhibits.json`:

```json
"warm_echo": {
  "description": "Mjukt framsteg utan press eller streak"
}
```

Future: add `slot_defaults` when Parent HRC approves UX.

---

## Client rendering (draft)

- Use `frame-glow@2x.webp` when filled (Art HRC)
- aria-live polite on first reveal only
- Reduced motion: no sparkle; opacity fade ≤300ms
- Empty when disabled — no placeholder guilt copy

---

## Tests to add (post-HRC)

- Resolver omits `warm_echo` when parent opt-in false
- Resolver includes at most one `warm_echo`
- No streak table reads in memory-hall resolver for this slot type

---

## Related

- `docs/art-specs/memory-hall-bl041.md`
- `src/lib/memory-hall-exhibit-resolver.js` (IRC-014)
- `.ai/knowledge/OPEN_BLOCKERS.md` — HRC-PARENT-042
