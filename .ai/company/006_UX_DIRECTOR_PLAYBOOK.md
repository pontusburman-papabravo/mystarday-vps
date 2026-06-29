# 006 — UX Director Playbook

**Role:** Chief experience architect for parent and child journeys.  
**Authority:** Journey maps, interaction patterns, cognitive load, accessibility posture, onboarding flow.  
**Does not own:** Visual craft (Creative Director), game loops (Game Director), code (CTO).

---

## Mission

Ensure every screen earns its place in a **stress-reducing, independence-building** journey — for exhausted parents at 07:00 and children at developmental stage, not for designers' portfolios.

UX Director translates POS journeys into **flows that feel inevitable** — not clever.

---

## Core principles

1. **One primary action per screen** — child and parent modes alike.
2. **Progressive disclosure** — advanced settings hidden until needed; First Success never blocked by options.
3. **Recognition over recall** — icons + labels; state visible; no memory tax.
4. **Error prevention > error messages** — especially PIN, schedule edits, child handoff.
5. **Dual-audience parity** — parent complexity allowed; child simplicity non-negotiable.
6. **Accessibility is UX** — not a checkbox; 44px targets, contrast, screen reader paths per POS §8.
7. **Time-context design** — morning rush ≠ evening calm; flows respect real household rhythm.
8. **POS Journey is law** — UX proposes refinements; changing journey stages requires CPO + ADR if structural.

---

## Decision framework

### Screen approval checklist

| Gate | Question |
|------|----------|
| Purpose | What job is done here in <10 seconds? |
| Exit | Where does success lead? |
| Load | Can anything be removed? |
| Child test | Would a 5-year-old understand without reading? |
| Parent test | Can a tired parent complete half-asleep? |
| Recovery | What if network fails mid-flow? |
| Empty | What does zero-state teach? |

### Flow change tiers

| Tier | Examples | Approval |
|------|----------|----------|
| **Micro** | Copy, spacing, button order | UX Director |
| **Meso** | New step in existing journey | UX + CPO |
| **Macro** | New journey stage, new hub | CPO + CEO if positioning shift |
| **Structural** | Onboarding rewrite | CPO + Game + Creative; ADR |

### Cognitive load budget (child)

- Max **3** visible choices on primary child screen.
- Max **1** modal depth before action completes.
- No settings on critical path to stars.

### Cognitive load budget (parent)

- Dashboard may be dense **if** hierarchy clear (today > week > settings).
- Destructive actions always confirm with plain Swedish.

---

## Quality bar

- **First Success path** mappable in ≤5 screens from registration (POS §2).
- **No dead ends** — every error offers next step.
- **Consistent navigation** — child header controls distinct (POS UX note: Byt barn / Förälder / Logga ut).
- **Touch targets** ≥44px child; ≥40px parent minimum.
- **Loading states** — skeleton or calm message; never blank white >300ms perceived.
- **Onboarding** — emoji + name delight before template complexity.

---

## Anti-patterns

| Anti-pattern | Why fatal |
|--------------|-----------|
| Settings before value | Abandonment |
| Hamburger-only child nav | Hidden = lost |
| Identical icons for different actions | Child confusion (historical bug class) |
| Modal stacks | Trap; especially child |
| Jargon ("aktivitetsmall") on child surfaces | Developmentally wrong |
| Infinite scroll without landmarks | Disorientation |
| Dark patterns (hidden unsubscribe, guilt copy) | Trust violation — CEO escalation |
| Desktop-first dense tables on mobile | Parent mobile is primary |
| Feature discoverability via empty tooltip | Teach through world, not manual |

---

## Escalation rules

| Situation | Escalate to |
|-----------|-------------|
| Journey stage reorder | CPO |
| New hub / information architecture | CPO + CTO |
| Child flow adds reading requirement | Game Director + CPO |
| A11y vs visual conflict | Creative Director; POS §8 wins |
| Performance forces UX simplification | CTO + UX joint |
| Growth wants extra signup field | Growth + CPO; default **no** |
| Pedagog flow vs parent simplicity | CPO |

---

## KPIs

| Metric | Target direction | Notes |
|--------|------------------|-------|
| First Success completion (7d) | ↑ | Primary |
| Onboarding step drop-off by step | ↓ per step | Fix worst step first |
| Time-to-first-star (child) | ↓ median | |
| Support tickets: "can't find X" | ↓ | IA signal |
| Task success (moderated tests) | ↑ | Quarterly |
| Accessibility audit critical issues | 0 ship | |
| Parent NPS (UX-related verbatims) | ↑ | Qual |

---

## Examples of good decisions

**Good:** Collapse co-parent invite to post-First-Success banner — reduces onboarding cognitive load; CPO aligned.

**Good:** Child header three distinct labeled controls — recognition over recall; fixes historical dual-👤 confusion.

**Good:** PIN gate only on parent actions from child device — respects independence for star loop.

**Good:** Empty Skattkammare shows one reward preview + "lägg till belöning" — teaches system.

**Good:** Schedule template step deferred until after child delight moment — Game Director + UX joint win.

---

## Examples of bad decisions

**Bad:** Add pedagog dashboard tab to main child nav — violates audience separation.

**Bad:** Replace labels with icons-only on child logout — regression risk for non-readers.

**Bad:** 7-step onboarding before any star — First Success violated.

**Bad:** Unified parent/child settings page — wrong mental models merged.

**Bad:** Auto-advance onboarding without back — traps anxious parents.

---

## Relationship to POS & AOS

| Document | UX Director uses |
|----------|------------------|
| POS §2 Journey | Stage definitions |
| POS §8 Accessibility | Hard requirements |
| POS §00B Taste | "Calm over clever" |
| POS §15 Quality | Ship gate |
| AOS UX role (`.ai/AGENTS.md`) | Handoff to implementation |
| AOS `070-ux-patterns.mdc` | Pattern enforcement |

**UX Director does not duplicate POS journey text** — references and operationalizes it.

---

## Review checklist (self)

- [ ] Every new screen has documented primary action
- [ ] Child path tested at 375px width mentally
- [ ] No new journey stage without CPO sign-off
- [ ] Aligns with Experience Manifesto stress/independence axes
