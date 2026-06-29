# Standard — Testing

**Version:** 1.0  
**Authority:** `product-operating-system/12_TESTING.md` · `15_PRODUCT_QUALITY_STANDARD.md` · `.cursor/rules/130-testing.mdc`

> Full test philosophy in POS 12. Agents run the **gate** as minimum bar.

---

## Commands (Cloud / CI)

Run the curated test gate per root `AGENTS.md` — prefix with test-mode env overrides documented there (`REQUIRE_EMAIL_VERIFICATION=false`, unset outbound email keys when appropriate).

Full suite: `npm test` (~1026 tests) — DB integration serializes via advisory lock.

Unset `RESEND_API_KEY` for runs that must not send email.

---

## Minimum Bar

| Check | When |
|-------|------|
| `test:gate` | Every PR |
| Regression test | Every bug fix |
| Auth integration test | Authz changes |
| Migration rollback gate | New migrations |

---

## Test Types

| Type | Location | Use |
|------|----------|-----|
| Unit | `test/*.test.js` | Pure logic · validators |
| Integration | `test/` with DB | Routes · DB queries |
| Contract | `test/*-contract.test.js` | Authz boundaries |
| Gate | `npm run test:gate` | CI curated subset |

---

## Agent Checks (before PR)

- [ ] Gate green with test-mode env per root `AGENTS.md`
- [ ] New behavior has automated test where feasible
- [ ] Manual QA noted in PR if UI-only gap
- [ ] No skipped tests without issue link

---

## Deep References

| Topic | Location |
|-------|----------|
| Testing workflow | [workflows/testing.md](../workflows/testing.md) |
| QA Director role | [roles/qa-director.md](../roles/qa-director.md) |
| Root runtime | `/AGENTS.md` |
| QA engine | `.ai/runtime/QA_ENGINE.md` |
