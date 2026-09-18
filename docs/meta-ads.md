# Meta Ads (approval-gated)

Create and run Facebook/Instagram **trafikannonser** (dark posts) and **boostade sidinlägg** from Cursor drafts and the admin tool. Nothing spends until a founder/admin clicks **Godkänn och publicera**.

Admin: `/admin#meta-annonser`  
Trafik: `npm run meta-ads:propose -- docs/meta-ads/examples/se-traffic-register.js`  
Boost: `npm run meta-ads:propose -- docs/meta-ads/examples/se-boost-post.js`

This uses **Marketing API** (`graph.facebook.com/v25.0/act_{id}/…`), not page-feed Graph posting. Page posts stay in `src/lib/facebook.js`.

## Product choice

- **Snabb-boosta** with defaults (Sweden, ages 25–55, `OUTCOME_ENGAGEMENT` / `POST_ENGAGEMENT`). Pick a published Dagens nyhet post or paste a `pageId_postId`.
- **Trafikannonser** stay as Cursor JSON + the longer form (new creative, destination on brand domains).
- No Ads Manager clone, no auto-audiences, no auto-spend.
- Stats: **Hämta resultat** reads campaign insights and caches them 15 minutes (`INSIGHTS_MIN_INTERVAL_MS`). This is spend/impressions/clicks/reach — not a full ROI model. First Success still lives in product analytics.

## Rules

- Cursor **never** publishes. Agents write JSON, validate, and import.
- No auto-approve (unlike win-back email).
- Pause is an emergency stop. Resume is allowed for an already approved campaign.
- Copy must not use medical claims, fake urgency, or fear-based NPF language.
- Traffic destinations must be owned brand domains. Boosts reuse an existing page post (`object_story_id`).
- Default cap: **200 kr/dag**. Raise with `META_ADS_MAX_DAILY_BUDGET_SEK`.
- Budgets are sent to Meta in **öre** (40 kr → `4000`).
- Publish only from this **server**. Never start a boost from an iOS in-app button (Apple takes ~30% of that spend).

## Permissions (Meta app + system user)

Live Marketing API almost always needs a verified Business Manager.

| Permission | Why |
|------------|-----|
| `ads_management` | Create/edit/pause campaigns, ad sets, ads |
| `ads_read` | Insights |
| `business_management` | Ad accounts attached to the business |

Do **not** reuse `FACEBOOK_PAGE_ACCESS_TOKEN` (page feed) as `META_ADS_ACCESS_TOKEN`.

## One-time Meta setup

In Meta Business Manager:

1. Create or pick an **Ad Account**. Note the id (`act_…`).
2. Create a **System User**, grant `ads_management`, `ads_read`, and `business_management` on that ad account, and assign the Facebook Page.
3. Generate a system user token. Store it as `META_ADS_ACCESS_TOKEN` (VPS env + Cursor secret if agents should insert drafts). Never commit it.
4. Set `META_AD_ACCOUNT_ID`.
5. Set `META_ADS_PAGE_ID` or reuse `FACEBOOK_PAGE_ID`.
6. Optional: `META_ADS_INSTAGRAM_ACTOR_ID`, `META_ADS_PIXEL_ID`.
7. Restart the systemd service. Admin banner should show the ad account id.

Until Marketing API access is granted, drafts and the approval queue still work; approve returns a clear Graph error.

## Hierarchy (Meta)

Campaign (paused) → Ad set + budget/targeting (paused) → Creative + Ad (paused) → activate all three after approve.

- Traffic creative: `object_story_spec.link_data` (dark post).
- Boost creative: `object_story_id` = existing `{pageId}_{postId}`.

## Cursor workflow

1. Write a brief JSON (traffic or `kind: "boost"`).
2. `npm run meta-ads:propose -- path/to/brief.json`
3. Paste JSON in admin, or `--submit`, or use **Snabb-boosta**.
4. Founder reviews and approves.

## Caps (env)

| Variable | Default | Meaning |
|----------|---------|---------|
| `META_ADS_MAX_DAILY_BUDGET_SEK` | 200 | Hard daily cap |
| `META_ADS_MAX_LIFETIME_BUDGET_SEK` | 3000 | Hard lifetime cap |
| `META_ADS_MIN_DAILY_BUDGET_SEK` | 20 | Floor |

## Out of scope

Google Ads, Advantage+ catalog, lookalike audiences, app-install campaigns, automatic budget scaling, in-app iOS boosts.
