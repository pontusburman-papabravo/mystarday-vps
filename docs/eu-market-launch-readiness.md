# European launch readiness — 10 October 2026

This is a read of the repo and of Apple's public screenshot specification. It does not open a market.

Statuses mean:

- **READY** — verified in this repo or on the cited public page, and sufficient for that column.
- **BLOCKED** — a verified gap that must be closed, or an intentional closed gate.
- **UNKNOWN** — not re-read. It is not approval and it is not a closed market.

App Store Connect and Google Play credentials were unset in this environment. Live distribution, live screenshot attachment, live price tiers, and the feature-flag rows on the running server were not re-read. Those cells stay UNKNOWN.

Evidence:

- `store/markets.json` activation is `live` only for SE, IE, and CA. Every other country in the 30 is `planned`.
- Registration gates are one flag per country. `market_se_open` and `market_ca_open` default open. `market_ie_open`, `market_fi_open`, `market_no_open`, and `market_dk_open` keep their existing keys and default closed. Every other registration country uses `market_<iso>_open`, default closed. `market_eu_open` stays in the database, default off, and does not open a country. A missing flag fails closed. The running server may differ. That difference was not re-read.
- `store/README.md`: shipped store listings are `sv`, `en-GB`, and `de-DE`. Other European languages are planned.
- `store/locales.json`: Apple has no Icelandic, Irish, Maltese, Bulgarian, Estonian, Latvian, or Lithuanian. Google has no Irish or Maltese. Icelandic on Google is `is-IS`.
- Screenshot pixels were measured from the PNG files named in `store/screenshots.json` on 2026-10-10. `sv` and `en-GB` are `live_external` and were not in the repo.
- Apple screenshot specification, fetched 2026-10-10 from [developer.apple.com help](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications): a submission requires at least one iPhone screenshot for Dynamic Island, medium display (1179×2556 or 1206×2622). 1290×2796 and 1320×2868 are accepted large Dynamic Island sizes. If the interface is consistent, App Store Connect can scale from the highest required resolution. 780×1688 is not an accepted size. A missing language preview falls back to another language. Re-read that page before any future submission.
- iOS 1.4.6 is a closed train (`docs/release/STORE_SUBMISSION_CHECKLIST.md`). Next native train is 1.4.7. No new version is created here.
- Legal routes (`src/lib/legal-routing.js`): Swedish documents are live for SE and FI. English EEA routes are live for IE and FI. Every other country receives `/en/eea/*` with status `draft`.
- Purchase start (`src/lib/payment-settings.js`): Sweden uses the global payment start. Ireland and Finland have their own keys. Every other country fails closed. Local price tiers were not changed and were not verified in the consoles.
- Commercial policy is unchanged: SE intro year before 2026-10-03 00:00 Europe/Stockholm, then a 14-day trial; IE and CA complimentary until 2027-01-01T00:00:00Z; every other country a 14-day trial that requires billing before signup (ADR-023, ADR-024, ADR-025).
- The first-25 offer is implemented and off (ADR-026). It covers 27 countries and at most 675 families. It does not apply to SE, IE, or CA. Public copy stays hidden while that country's registration gate is closed.

A missing localized store listing does not by itself block opening. Distribution in the country, the language inside the app, the store listing, and commercial/legal readiness are separate.

## Matrix

App language "first-run" means `showOnFirstRun` in `config/locale-catalog.json`. Icelandic, Irish, and Maltese are registered and are not on the first-run list.

| Country | Code | Market | Apple distribution | Google distribution | App language | App Store listing language | Screenshots | Legal | Price and payment | Support | Offer | Blocker |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Sweden | SE | live in catalog; gate default open | UNKNOWN | UNKNOWN | sv-SE, first-run | sv shipped | live_external, not re-read | READY, Swedish live | READY, existing SE terms | sv-SE pack exists; human coverage UNKNOWN | excluded, existing terms kept | none from this offer |
| Ireland | IE | live in catalog; gate default closed | UNKNOWN | UNKNOWN | en-GB first-run; ga-IE registered, not first-run | en-GB shipped; ga absent, fallback en-GB | live_external, not re-read | READY, English EEA live | complimentary until 2027-01-01Z; local price UNKNOWN | en-GB pack exists; human coverage UNKNOWN | excluded, existing terms kept | do not change IE terms; prod `market_ie_open` UNKNOWN |
| Canada | CA | live in catalog; gate default open | UNKNOWN | UNKNOWN | en-GB, first-run | en-GB shipped | live_external, not re-read | BLOCKED in code: English EEA route is `draft` for CA | complimentary until 2027-01-01Z; local price UNKNOWN | en-GB pack exists; human coverage UNKNOWN | excluded, existing terms kept | legal draft was not changed |
| Finland | FI | planned; gate default closed | UNKNOWN | UNKNOWN | fi-FI and sv-SE, first-run | fi and sv exist as Apple languages; not a shipped listing | repo fi 1290×2796; Google fi-FI 1080×1920; live attach UNKNOWN | READY for sv-SE and en-GB | BLOCKED until a Finland purchase is verified | packs exist; human coverage UNKNOWN | code READY, flag off, country row off | gate closed; purchase path unverified |
| Germany | DE | planned; `market_de_open` default closed | UNKNOWN | UNKNOWN | de-DE, first-run | de-DE is a shipped listing | repo 1290×2796; Google 1080×1920; live attach UNKNOWN | BLOCKED, English EEA `draft` | BLOCKED, no DE payment-start key | pack exists; human coverage UNKNOWN | code READY, off | legal, billing, gate |
| Austria | AT | planned; own gate default closed | UNKNOWN | UNKNOWN | de-DE, first-run | de-DE shipped listing can be reused; AT page UNKNOWN | same German files; live attach UNKNOWN | BLOCKED, draft | BLOCKED, no payment-start key | pack exists; human coverage UNKNOWN | code READY, off | legal, billing, gate |
| France | FR | planned; own gate default closed | UNKNOWN | UNKNOWN | fr-FR, first-run | planned, not shipped | repo 1290×2796; Google 1080×1920 | BLOCKED, draft | BLOCKED | pack exists; human coverage UNKNOWN | code READY, off | legal, billing, gate, listing not shipped |
| Luxembourg | LU | planned; own gate default closed | UNKNOWN | UNKNOWN | fr-FR, first-run | planned | same French files | BLOCKED, draft | BLOCKED | pack exists; human coverage UNKNOWN | code READY, off | legal, billing, gate |
| Netherlands | NL | planned; own gate default closed | UNKNOWN | UNKNOWN | nl-NL, first-run | planned | repo 1290×2796; Google 1080×1920 | BLOCKED, draft | BLOCKED | pack exists; human coverage UNKNOWN | code READY, off | legal, billing, gate |
| Belgium | BE | planned; own gate default closed | UNKNOWN | UNKNOWN | nl-NL, fr-FR, de-DE required | planned | those three locales have 1290 files | BLOCKED, draft | BLOCKED | packs exist; human coverage UNKNOWN | code READY, off | legal, billing, gate; three languages |
| Denmark | DK | planned; own gate default closed | UNKNOWN | UNKNOWN | da-DK, first-run | planned | repo da 1290×2796; Google 1080×1920 | BLOCKED, draft | BLOCKED | pack exists; human coverage UNKNOWN | code READY, off | legal, billing, gate |
| Norway | NO | planned; own gate default closed | UNKNOWN | UNKNOWN | nb-NO, first-run | planned; Apple locale `no` | repo no 1290×2796; Google 1080×1920 | BLOCKED, draft | BLOCKED | pack exists; human coverage UNKNOWN | code READY, off | legal, billing, gate |
| Spain | ES | planned; own gate default closed | UNKNOWN | UNKNOWN | es-ES, first-run | planned | repo 1290×2796; Google 1080×1920 | BLOCKED, draft | BLOCKED | pack exists; human coverage UNKNOWN | code READY, off | legal, billing, gate |
| Italy | IT | planned; own gate default closed | UNKNOWN | UNKNOWN | it-IT, first-run | planned | repo 1290×2796; Google 1080×1920 | BLOCKED, draft | BLOCKED | pack exists; human coverage UNKNOWN | code READY, off | legal, billing, gate |
| Portugal | PT | planned; own gate default closed | UNKNOWN | UNKNOWN | pt-PT, first-run | planned | repo 1290×2796; Google 1080×1920 | BLOCKED, draft | BLOCKED | pack exists; human coverage UNKNOWN | code READY, off | legal, billing, gate |
| Poland | PL | planned; own gate default closed | UNKNOWN | UNKNOWN | pl-PL, first-run | planned | repo 1290×2796; Google 1080×1920 | BLOCKED, draft | BLOCKED | pack exists; human coverage UNKNOWN | code READY, off | legal, billing, gate |
| Czechia | CZ | planned; own gate default closed | UNKNOWN | UNKNOWN | cs-CZ, first-run | planned | BLOCKED: Apple and Google files are 780×1688 | BLOCKED, draft | BLOCKED | pack exists; human coverage UNKNOWN | code READY, off | screenshots, legal, billing, gate |
| Slovakia | SK | planned; own gate default closed | UNKNOWN | UNKNOWN | sk-SK, first-run | planned | BLOCKED: 780×1688 | BLOCKED, draft | BLOCKED | pack exists; human coverage UNKNOWN | code READY, off | screenshots, legal, billing, gate |
| Slovenia | SI | planned; own gate default closed | UNKNOWN | UNKNOWN | sl-SI, first-run | planned | BLOCKED: 780×1688 | BLOCKED, draft | BLOCKED | pack exists; human coverage UNKNOWN | code READY, off | screenshots, legal, billing, gate |
| Croatia | HR | planned; own gate default closed | UNKNOWN | UNKNOWN | hr-HR, first-run | planned | BLOCKED: 780×1688 | BLOCKED, draft | BLOCKED | pack exists; human coverage UNKNOWN | code READY, off | screenshots, legal, billing, gate |
| Hungary | HU | planned; own gate default closed | UNKNOWN | UNKNOWN | hu-HU, first-run | planned | BLOCKED: 780×1688 | BLOCKED, draft | BLOCKED | pack exists; human coverage UNKNOWN | code READY, off | screenshots, legal, billing, gate |
| Romania | RO | planned; own gate default closed | UNKNOWN | UNKNOWN | ro-RO, first-run | planned | BLOCKED: 780×1688 | BLOCKED, draft | BLOCKED | pack exists; human coverage UNKNOWN | code READY, off | screenshots, legal, billing, gate |
| Greece | GR | planned; own gate default closed | UNKNOWN | UNKNOWN | el-GR, first-run | planned | BLOCKED: 780×1688 | BLOCKED, draft | BLOCKED | pack exists; human coverage UNKNOWN | code READY, off | screenshots, legal, billing, gate |
| Cyprus | CY | planned; own gate default closed | UNKNOWN | UNKNOWN | el-GR, first-run | planned | BLOCKED: same Greek 780×1688 files | BLOCKED, draft | BLOCKED | pack exists; human coverage UNKNOWN | code READY, off | screenshots, legal, billing, gate |
| Bulgaria | BG | planned; own gate default closed | UNKNOWN | UNKNOWN | bg-BG, first-run | Apple has no bg; fallback en-GB. Google files exist | Apple screenshots absent; Google 780×1688 BLOCKED | BLOCKED, draft | BLOCKED | pack exists; human coverage UNKNOWN | code READY, off | listing language, screenshots, legal, billing, gate |
| Estonia | EE | planned; own gate default closed | UNKNOWN | UNKNOWN | et-EE, first-run | Apple has no et; fallback en-GB | Apple screenshots absent; Google 780×1688 BLOCKED | BLOCKED, draft | BLOCKED | pack exists; human coverage UNKNOWN | code READY, off | listing language, screenshots, legal, billing, gate |
| Latvia | LV | planned; own gate default closed | UNKNOWN | UNKNOWN | lv-LV, first-run | Apple has no lv; fallback en-GB | Apple screenshots absent; Google 780×1688 BLOCKED | BLOCKED, draft | BLOCKED | pack exists; human coverage UNKNOWN | code READY, off | listing language, screenshots, legal, billing, gate |
| Lithuania | LT | planned; own gate default closed | UNKNOWN | UNKNOWN | lt-LT, first-run | Apple has no lt; fallback en-GB | Apple screenshots absent; Google 780×1688 BLOCKED | BLOCKED, draft | BLOCKED | pack exists; human coverage UNKNOWN | code READY, off | listing language, screenshots, legal, billing, gate |
| Iceland | IS | planned; `market_is_open` default closed | UNKNOWN | UNKNOWN | is-IS, registered, not first-run | Apple has no is; fallback en-GB. Google has is-IS | Apple screenshots absent; Google 780×1688 BLOCKED | BLOCKED, draft | BLOCKED | pack exists; human coverage UNKNOWN | code READY, off | language not first-run, listing, screenshots, legal, billing, gate |
| Malta | MT | planned; own gate default closed | UNKNOWN | UNKNOWN | mt-MT, registered, not first-run | Apple and Google have no mt; fallback en-GB | no mt screenshot set | BLOCKED, draft | BLOCKED | pack exists; human coverage UNKNOWN | code READY, off | language not first-run, listing, screenshots, legal, billing, gate |

United Kingdom, Switzerland, and Liechtenstein are outside these 30 markets and are not seeded for the offer.

## Launch order

Open one country at a time. Do not flip `market_eu_open`.

1. **Finland first among new markets.** The app already has Finnish and Swedish on first run. Legal routes are live for both. Repo screenshots for Finnish are 1290×2796 on Apple and 1080×1920 on Google. The registration gate is still closed, and a Finland purchase has not been verified. Fix that before opening. The first 25 can be offered only after the flag and the FI row are turned on in a separate decision.
2. **Then countries that already have a first-run language and 1290×2796 files:** Germany and Austria (German), France and Luxembourg (French), Netherlands, Denmark, Norway, Spain, Italy, Portugal, Poland. Germany already has a shipped `de-DE` listing. Belgium waits until Dutch, French, and German are all accepted for that storefront.
3. **Then correct the seven 780×1688 Apple sets** before they are uploaded: Czech, Slovak, Slovenian, Croatian, Hungarian, Romanian, Greek. The same pixel size on Google is over the 2:1 aspect limit in `play-live-audit` and is not uploadable as-is.
4. **Then countries whose Apple listing language does not exist:** Bulgaria, Estonia, Latvia, Lithuania, Iceland, Malta. Use en-GB as the store fallback. Icelandic and Maltese are not on the first-run language list, so the in-app language is a separate decision. A missing listing does not by itself block opening once legal, payment, language, and support are accepted.

Do not create App Store version 1.4.7 for this offer. The offer is server-side. Screenshot replacement belongs on the next native version, after the screenshot page is read again. Prioritize the ten 1290×2796 languages already in the repo, and confirm whether the required medium Dynamic Island slot is satisfied by scaling.

## Risks

- Family 26 cannot create an account until billing is ready. Opening earlier looks like a closed market at family 26. That is safer than an account that cannot pay, and it is still a reason to verify purchase first.
- Disabling the offer does not remove Premium from families who already received it.
- A deleted family does not return its place.
- The running server's values for `market_ie_open` and the other gates are UNKNOWN. This change does not write them.
- Canada is open in the catalog while the English legal route for CA is `draft`. This change does not edit legal settings.
- 1290×2796 is an accepted large size. The required submit slot on the page read today is medium Dynamic Island. Treat "approved 6.7-inch screenshots" as founder observation plus repo files, not as a fresh App Store Connect read.

## Decisions required before any new market opens

1. Name the single country. Recommended first new country: Finland.
2. Accept the legal documents for that country, or commission them. Do not treat `draft` as live.
3. Verify the local App Store and Google Play price and a real purchase and restore for family 26.
4. Say who answers support, and in which language.
5. Turn on `launch_cohort_offer_v1` and that one country row. Leave every other row off.
6. Open that country's own registration flag only. Leave `market_eu_open` off. It does not open any country.
7. Leave SE, IE, and CA commercial terms as they are.

None of those steps is done in the implementation pull request.
