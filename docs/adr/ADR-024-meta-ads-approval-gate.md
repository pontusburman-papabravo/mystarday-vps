# ADR-024 — Approval-gated Meta Ads from admin + Cursor

**Status:** Accepted  
**Date:** 2026-09-18  
**POS / COS:** Growth playbook (`.ai/company/008_GROWTH_PLAYBOOK.md`) paid channel; trust before scale; no fear-based NPF marketing. Constitution: no surprise for families (ads are not a product surface).  
**Related:** page feed posting stays in `src/lib/facebook.js` (Dagens nyhet). This ADR is **ad account spend only**.

## Context

The founder needs to create and administer Meta (Facebook/Instagram) ads from Cursor and from the existing admin tool, with an approval step before money is spent.

Paid acquisition is already allowed as a later growth channel (COS 008, after product-led / SEO / community). There was no Marketing API client, no campaign store, and no spend authority in admin. The existing `FACEBOOK_PAGE_ACCESS_TOKEN` is for page feed posts, not ads.

## Decision

1. **Drafts are cheap. Spend is gated.** Cursor and admin may create/edit drafts. Only an authenticated admin **Godkänn och publicera** call may create objects on Meta.
2. **No auto-approve.** Unlike win-back email, ads never skip the founder click. Pause is a kill switch and does not need a second approval. Resume of an already-approved campaign is allowed without a new brief.
3. **Hard budget caps in env.** Default max daily budget 200 SEK (`META_ADS_MAX_DAILY_BUDGET_SEK`). Raise the cap in env, not in code, when unit economics are proven.
4. **Copy floor in code.** Block medical claims, fake urgency, and fear-based NPF phrases. Human review still required.
5. **Destination allowlist.** Only mystarday.se / .eu / .app (plus localhost in non-prod). <!-- pragma: allowlist secret --> UTM `meta` / `paid` / campaign slug is applied at publish.
6. **v1 objective is website traffic only** (`OUTCOME_TRAFFIC`). App promotion and lead ads are out of scope until a later ADR.
7. **Secrets:** `META_ADS_ACCESS_TOKEN` (system user with `ads_management` + `ads_read`), `META_AD_ACCOUNT_ID`, page id (`META_ADS_PAGE_ID` or existing `FACEBOOK_PAGE_ID`). Do not reuse the page feed token silently.

## Consequences

- Admin: Tillväxt → Meta-annonser (`/admin#meta-annonser`).
- Cursor: validate JSON with `npm run meta-ads:propose`; import in admin or `--submit` against the target database. Agents must not call the Marketing API.
- Publish is best-effort create-then-activate; partial Meta objects stay paused and the row becomes `failed` for retry after approve.

## Out of scope

Google Ads, Advantage+ catalog, lookalike audiences beyond country/age, automatic budget scaling, child-facing surfaces, Meta Pixel changes.
