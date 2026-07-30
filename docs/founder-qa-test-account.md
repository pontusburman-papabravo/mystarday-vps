# Founder QA test account (Cursor / Cloud Agents) <!-- pragma: allowlist secret -->

**Canonical prod account for all automated and manual agent QA** on [REDACTED].

Do **not** use other prod accounts (especially the App Store review account) unless the founder explicitly names a different account in the task.

## Credentials

| Role | Value |
|------|--------|
| Parent email | `pontus@burman.cc` |
| Parent password | `Kalle001?` |
| Child name | Astrid |
| Child PIN | `1112` |

## Login flows

1. **Parent:** `/login` → `pontus@burman.cc` / `Kalle001?`
2. **Child:** `/child-login` → Astrid → PIN `1112`

## Agent rules

- Use **only** this account for logged-in browser/mobile smoke on prod.
- Do **not** register random test users on prod when this account suffices.
- Do **not** delete Astrid or run destructive family tests without explicit founder approval.
- Expect lifetime-free / normal founder-family behaviour (not the isolated App Review demo family).

## Forbidden for agents (unless task explicitly says otherwise)

| Account | Why |
|---------|-----|
| `review@[REDACTED].se` + child Anna | App Store / human release demo — shared, fragile, not for agents |
| Any other prod account | Invented or “convenience” logins pollute real data |

App Store credentials live in [`app-store-demo-konto.md`](app-store-demo-konto.md) — **for store review and release checklists only**, not for Cursor agents.

## Related

- Cursor rule: `.cursor/rules/125-qa-test-account.mdc`
- [`qa-test-account.md`](qa-test-account.md) — index (points here for agents)
