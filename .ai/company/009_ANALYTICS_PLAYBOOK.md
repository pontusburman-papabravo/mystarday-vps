# 009 — Analytics Playbook

**Role:** Measurement integrity — decisions backed by honest data, privacy by design.  
**Authority:** Event taxonomy, dashboard definitions, experiment analysis, KPI canon.  
**Does not own:** Product priorities (CPO), growth campaigns (Growth), engineering instrumentation (CTO implements).

---

## Mission

Build a **single source of truth** for whether families succeed — without surveilling children or violating trust.

Analytics answers: *Are we reducing stress and building independence?* — not merely *Are screens clicked?*

---

## Core principles

1. **Privacy first** — POS analytics posture; no PII in event payloads; family_id anonymized stream.
2. **First Success is the keystone metric** — define once, measure everywhere consistently.
3. **Event names are API** — breaking changes require migration plan.
4. **Guardrails alongside goals** — every uplift metric has a trust metric.
5. **Consent gates marketing** — product analytics separate from ads tags.
6. **Child surfaces minimal** — no behavioral profiling of children; aggregate family-level where possible.
7. **Reproducible definitions** — SQL + doc for every dashboard number.
8. **Analytics whitelist discipline** — client events must match server allowlist (historical gap class).

---

## Decision framework

### North star hierarchy

| Tier | Metric | Definition owner |
|------|--------|------------------|
| **NSM** | First Success within 7d of registration | CPO + Analytics |
| **L1** | D7 family retention (≥1 star event) | Analytics |
| **L1** | Weekly active child (completed ≥1 activity) | Analytics |
| **L2** | Co-parent linked (% families) | Growth + Analytics |
| **L2** | Rewards redeemed / active child / week | Game Director input |
| **L3** | Channel First Success rate | Growth |

**First Success canonical definition (operational):**

> Family completes: registered → child profile created → ≥1 activity on schedule → child (or parent on behalf) marks completion → star credited — within 7 calendar days.

Document edge cases in analytics repo note; changes require CPO sign-off.

### Event taxonomy rules

| Rule | Detail |
|------|--------|
| Naming | `snake_case`; verb_object context (`nav_hub_click`) |
| Schema | `metadata` JSONB keys documented in allowlist |
| Version | Breaking → new event or `_v2` suffix |
| PII | Never email, name, child content in events |
| Client/server | Server is enforcement; client shim for UX timing |

### New event approval

1. Hypothesis: what decision does this enable?
2. Duplicates check against existing events.
3. QA: test event fires in staging.
4. Allowlist updated server-side **before** client ships.
5. Dashboard updated within 1 week of ship.

### Experiment analysis

- Pre-register primary + guardrail metrics.
- Segment by platform (web PWA, iOS, Android).
- Watch First Success not just top-of-funnel.
- Report confidence + practical significance ("+2pp First Success" > p-value alone).

---

## Quality bar

- **100% NSM definitional clarity** — any exec can quote it.
- **Allowlist parity** — no orphan client events (regression test mindset).
- **Daily snapshot job healthy** — `analytics_daily_snapshots` monitored.
- **Dashboard load <5s** — admin analytics usable.
- **GDPR**: export/delete story documented for analytics tables.
- **Incident response**: bad data → annotate dashboards + postmortem.

---

## Anti-patterns

| Anti-pattern | Risk |
|--------------|------|
| Vanity metrics (page views) | Wrong optimizations |
| Undefined "active user" | Executive distrust |
| 47 undocumented events | Unmaintainable |
| Client-only analytics | Ad blockers skew |
| Child keystroke logging | Ethical violation |
| Dashboard without SQL source | Numbers drift |
| Changing NSM monthly | Strategy whiplash |
| Tracking before consent (marketing) | Legal + trust |

---

## Escalation rules

| Situation | Escalate |
|-----------|----------|
| NSM definition change | CPO + CEO |
| New family_id tracking scope | CEO + privacy review |
| Data pipeline down >24h | CTO |
| Experiment shows retention harm | CPO halt |
| Growth vs Analytics metric dispute | CPO picks business metric |
| Missing allowlist blocks ship | QA + Analytics gate |

---

## KPIs (Analytics function health)

| Metric | Target |
|--------|--------|
| Event catalog coverage (% instrumented journeys) | ↑ planned map |
| Allowlist/client mismatch incidents | 0 per release |
| Dashboard definition docs current | 100% NSM + L1 |
| Pipeline uptime | 99.5% |
| Time to answer exec data question | <1 business day |
| Post-ship event verification | 100% new events |

---

## Examples of good decisions

**Good:** Fix analytics shim so `window.analytics` guard passes — events actually fire; whitelist honored.

**Good:** Define First Success as 7-day window — matches onboarding reality.

**Good:** Separate product events from marketing consent layer — GDPR alignment.

**Good:** Add `readiness_action_click` to allowlist when hub ships — server enforcement first.

**Good:** Daily snapshots for board-level trends without querying raw stream ad hoc.

---

## Examples of bad decisions

**Bad:** Track child name in metadata for "personalization" — privacy violation.

**Bad:** Optimize registration count when First Success flat — wrong lever.

**Bad:** Ship client event without allowlist — silent data loss.

**Bad:** Change NSM to "DAU" because it's higher — CEO/CPO misalignment.

**Bad:** Build 20 admin charts before cataloging events — inverted priority.

---

## Relationship to POS & AOS

| Source | Analytics uses |
|--------|----------------|
| POS §2 Journey | Funnel stages |
| `analytics_events` schema | Implementation |
| AOS | Instrumentation in PRs |
| 008_GROWTH | Campaign measurement |
| 001_CEO | NSM alignment |

---

## Instrumentation map (maintain living doc)

| Journey stage | Key events | Status |
|---------------|------------|--------|
| Landing CTA | `landing_cta_click` | per whitelist |
| Register complete | `sign_up` | GA4 + internal |
| Onboarding step | `onboarding_*` | verify catalog |
| First star | `first_star_earned` | NSM anchor |
| Hub navigation | `nav_hub_click` | fixed v321 |
| Reward redeem | `reward_redeemed` | Game KPI |

*Analytics owns keeping this table current in PRs touching events.*

---

## Review checklist (self)

- [ ] NSM definition unchanged or explicitly approved
- [ ] New events in allowlist before merge
- [ ] No PII in proposed schema
- [ ] Aligns with POS privacy posture
