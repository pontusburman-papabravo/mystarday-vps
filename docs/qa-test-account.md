# QA test account (all agents)

> **Canonical credentials** for manual QA, browser automation, and mobile smoke tests.
> Full email, password, PIN, and step-by-step flows: **[`app-store-demo-konto.md`](app-store-demo-konto.md)**.

## Quick reference

| Role | Email / name | Details |
|------|----------------|---------|
| Parent | `review@mystarday.se` | Password in [`app-store-demo-konto.md`](app-store-demo-konto.md) |
| Child | Anna | PIN in [`app-store-demo-konto.md`](app-store-demo-konto.md) |

**Prod URL:** https://mystarday.se

## Quick login (web)

1. `/login` → parent credentials from [`app-store-demo-konto.md`](app-store-demo-konto.md)
2. Child view: `/child-login` → Anna → child PIN from same doc

## Agent rules

- Use this account for **all** logged-in browser/mobile QA on prod — do not invent new test users
- Lifetime-free (`is_lifetime_free`) — no paywall (402)
- Do **not** delete Anna or run destructive tests without explicit approval
- Local dev seed: `migrations/1790061000000_appstore_test_account.sql` or `scripts/browser-apple-review-account.mjs`

## Related docs

- [`app-store-demo-konto.md`](app-store-demo-konto.md) — credentials + App Store walkthrough
- [`native-app-test-checklist.md`](native-app-test-checklist.md) — native smoke
- [`RELEASE.md`](RELEASE.md) — release QA checklist
