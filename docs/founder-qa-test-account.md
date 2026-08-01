# Founder QA test account (Cursor / Cloud Agents)

**Canonical prod account for automated and manual agent QA** on the live app URL (stored in deployment config, not in git).

Do **not** use the App Store review demo family unless the task explicitly says App Store / release QA.

## Credentials

Values are stored outside the repository in approved secret management. See [`secret-references.md`](secret-references.md).

| Role | Secret / reference |
|------|---------------------|
| Parent email | `FOUNDER_QA_EMAIL` |
| Parent password | `FOUNDER_QA_PASSWORD` |
| Child display name | Astrid (public) |
| Child login username | `FOUNDER_CHILD_USERNAME` |
| Child PIN | `FOUNDER_CHILD_PIN` |
| Parent app-lock PIN | `FOUNDER_PARENT_PIN` (if used) |

## Login flows

1. **Parent:** `/login` → use `FOUNDER_QA_EMAIL` / `FOUNDER_QA_PASSWORD` from secret store.
2. **Child:** `/child-login` → Astrid → PIN from `FOUNDER_CHILD_PIN`.

## Agent rules

- Use **only** this account for logged-in browser/mobile smoke on prod when founder QA is required.
- Do **not** register random test users on prod when this account suffices.
- Do **not** delete Astrid or run destructive family tests without explicit founder approval.
- Expect lifetime-free / normal founder-family behaviour (not the isolated App Review demo family).

## Forbidden for agents (unless task explicitly says otherwise)

| Account | Why |
|---------|-----|
| App Store review parent + child Anna | Shared store demo — see `app-store-demo-konto.md` |
| Any other prod account | Invented logins pollute real data |

## RC-1 prod browser smoke

**Not** this founder account. RC-1 uses the dedicated QA fixture only — [`rc1-qa-fixture.md`](rc1-qa-fixture.md).

## Related

- Cursor rule: `.cursor/rules/125-qa-test-account.mdc`
- [`qa-test-account.md`](qa-test-account.md) — index
