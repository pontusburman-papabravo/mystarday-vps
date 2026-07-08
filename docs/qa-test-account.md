# QA test accounts (all agents)

> **Canonical credentials** for manual QA, browser automation, and mobile smoke tests.
> Code source of truth: `scripts/lib/qa-test-accounts.mjs`

## Account tiers

| Tier | When to use | Parent | Child(ren) | Password / PIN |
|------|-------------|--------|------------|----------------|
| **PROD_REVIEW** | Prod manual QA, App Store review, browser smoke on prod | `review@[REDACTED].se` | Anna | See [`app-store-demo-konto.md`](app-store-demo-konto.md) |
| **LOCAL_SMOKE** | Local dev, CI mobile gate (`npm run qa:mobile-*`) | `qa.mobil@test.stjarndag.local` | Astrid + Erik | `QaMobilTest2026!Secure` / PIN `4829` + `7391` |

### Prod — App Store review (PROD_REVIEW)

Full email, password, PIN, and step-by-step flows: **[`app-store-demo-konto.md`](app-store-demo-konto.md)**.

| Role | Value |
|------|-------|
| Parent | `review@[REDACTED].se` |
| Child | Anna · PIN `4455` |
| URL | [REDACTED] |

### Local — mobile gate (LOCAL_SMOKE)

Seed idempotently before QA:

```bash
node scripts/seed-smoke-family.mjs
```

| Role | Value |
|------|-------|
| Parent | `qa.mobil@test.stjarndag.local` |
| Barn 1 | Astrid · PIN `4829` |
| Barn 2 | Erik · PIN `7391` |

## Quick login (web, prod)

1. `/login` → parent credentials from [`app-store-demo-konto.md`](app-store-demo-konto.md)
2. Child view: `/child-login` → Anna → child PIN from same doc

## Agent rules

- **`review@` (App Store review) must NEVER be deleted** — hard-blocked in `cleanup-qa-test-families.js` and all cleanup scripts
- Use **PROD_REVIEW** for all logged-in browser/mobile QA on prod — do not invent new test users
- Use **LOCAL_SMOKE** for local/CI automation — scripts read defaults from `qa-test-accounts.mjs`
- Lifetime-free (`is_lifetime_free`) on review account — no paywall (402)
- Do **not** delete Anna or run destructive prod tests without explicit approval
- Cleanup (`npm run cleanup:qa-families`) only removes ephemeral `@example.com` families — **never** `review@`
- Do **not** use globally reserved PIN `1112` on prod

## Ephemeral accounts (safe to delete)

Scripts that register throwaway families (`act1-*`, `feat1-qa-*`, `*-qa-test@example.com`, etc.) can be cleaned from the database:

```bash
npm run cleanup:qa-families:dry-run   # preview
npm run cleanup:qa-families           # delete (never touches review@ or qa.mobil@)
```

Protected emails: `review@[REDACTED].se`, `qa.mobil@test.stjarndag.local`, `Pontus@burman.cc`.

## Related docs

- [`app-store-demo-konto.md`](app-store-demo-konto.md) — prod credentials + App Store walkthrough
- [`QA-mobil-fullstandig-protokoll.md`](QA-mobil-fullstandig-protokoll.md) — local mobile gate
- [`native-app-test-checklist.md`](native-app-test-checklist.md) — native smoke
- [`RELEASE.md`](RELEASE.md) — release QA checklist
