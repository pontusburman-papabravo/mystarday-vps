# Meta Ads (approval-gated)

Create and run Facebook/Instagram ads from **Cursor drafts** and the **admin tool**. Nothing spends until a founder/admin clicks **Godkänn och publicera**.

Admin: `/admin#meta-annonser`  
Cursor: `npm run meta-ads:propose -- docs/meta-ads/examples/se-traffic-register.js`

## Rules

- Cursor **never** publishes. Agents write JSON, validate, and import.
- No auto-approve (unlike win-back email).
- Pause is an emergency stop. Resume is allowed for an already approved campaign.
- Copy must not use medical claims, fake urgency, or fear-based NPF language.
- Destination must be mystarday.se / .eu / .app. <!-- pragma: allowlist secret -->
- Default cap: **200 kr/dag**. Raise with `META_ADS_MAX_DAILY_BUDGET_SEK`.

## One-time Meta setup

In Meta Business Manager:

1. Create or pick an **Ad Account**. Note the id (`act_…`).
2. Create a **System User**, grant `ads_management` and `ads_read` on that ad account, and assign the Facebook Page.
3. Generate a system user token. Store it as `META_ADS_ACCESS_TOKEN` (VPS env + Cursor secret if agents should insert drafts). Never commit it.
4. Set `META_AD_ACCOUNT_ID`.
5. Set `META_ADS_PAGE_ID` or reuse `FACEBOOK_PAGE_ID`.
6. Optional: `META_ADS_INSTAGRAM_ACTOR_ID`, `META_ADS_PIXEL_ID`.
7. Restart the systemd service. Admin banner should show the ad account id.

The app must have Marketing API access (Standard/Advanced) for the system user token to create campaigns. Until that is granted, drafts still work; approve returns a clear “not configured / Graph error”.

## Cursor workflow

1. Write a brief JSON (see `docs/meta-ads/examples/se-traffic-register.js`).
2. `npm run meta-ads:propose -- path/to/brief.json` — validates copy, budget, destination.
3. Paste JSON in admin **Importera JSON från Cursor**, or `--submit` against the environment `DATABASE_URL`.
4. Founder opens Tillväxt → Meta-annonser, reviews, and approves.

Required JSON fields: `name`, `destination_url`, `daily_budget_sek`, `primary_text`, `headline`, `hypothesis`, `primary_metric`. `image_url` is required before submit/approve.

## Caps (env)

| Variable | Default | Meaning |
|----------|---------|---------|
| `META_ADS_MAX_DAILY_BUDGET_SEK` | 200 | Hard daily cap |
| `META_ADS_MAX_LIFETIME_BUDGET_SEK` | 3000 | Hard lifetime cap |
| `META_ADS_MIN_DAILY_BUDGET_SEK` | 20 | Floor |

## v1 limits

Website traffic ads only (`OUTCOME_TRAFFIC`). Country + age targeting. No Advantage+ shopping, no app-install campaigns, no automatic budget increases.
