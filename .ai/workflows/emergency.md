# Workflow — Emergency

**Version:** 1.0  
**Roles:** CTO · Security · CEO · Release Manager  
**When:** P0 — child safety · active exploit · data breach · widespread outage

---

## Input

- Incident report · logs · user reports
- Severity P0 confirmation

---

## Steg

| # | Step | Action |
|---|------|--------|
| 1 | **Contain** | Disable endpoint · feature flag · maintenance mode if needed |
| 2 | **Notify** | Human immediately — parallel with contain |
| 3 | **Assess** | Scope · data exposed · children affected |
| 4 | **Mitigate** | Minimal patch on branch |
| 5 | **Verify** | Security review mandatory even if abbreviated |
| 6 | **Deploy** | Human executes · health check |
| 7 | **Communicate** | Draft parent-facing message for human approval |
| 8 | **Postmortem** | Timeline · root cause · prevention ADR |

---

## Output

- Containment deployed
- Human notified with timeline
- Postmortem document
- Follow-up issues filed

---

## Quality Gates

- [ ] Harm contained before full fix shipped (if needed)
- [ ] No additional data exposure during fix
- [ ] Auth paths verified post-deploy
- [ ] Postmortem within 48h

---

## Stop Conditions

- None for containment — act first on P0 child safety
- **Do not** hide incident to preserve velocity
- **Do not** merge without human on data-breach class
- Legal/comms always human

**Maintenance mode:** `checkMaintenanceMode` in `app.js` — API 503 except `/api/iap/*` for webhooks.

---

## Agent Authority (Emergency Only)

| Action | Allowed |
|--------|---------|
| Containment PR (disable feature) | Yes — immediate |
| P0 fix PR | Yes |
| Merge to main | Human |
| Parent notification send | Human |
| Law enforcement / legal | Human |
