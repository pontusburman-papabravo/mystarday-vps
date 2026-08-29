# Store Submission Checklist

**Use this before every Apple App Store or Google Play submission.** It is the human-executed complement to `npm run release:compliance` (Gate B/C — see [`RELEASE_GATE_MODEL.md`](./RELEASE_GATE_MODEL.md)) and `npm run release:pre-public-gate` (Gate A). Neither script alone makes a release "ready for App Review" — see [`STORE_POLICY_SOURCES.md`](./STORE_POLICY_SOURCES.md) for why policy currency always needs a manual check too.

**Before starting:** run `npm run release:preflight` and resolve every `FAIL`. Then work through this checklist — every `AUTO` item should already show `PASS` in the JSON report; re-verify the `MANUAL` items by hand regardless of what the script says.

Legend: **AUTO** = covered by `npm run release:compliance` / `release:pre-public-gate`. **MANUAL** = requires a human in App Store Connect, Play Console, or on a real device/build.

---

## 1. Apple App Store — pre-submission

- [ ] **No Beta/Test/Trial/Preview-marking in production UI** — MANUAL (cross-check: AUTO, Check A)
  PASS criterion: no screen a normal reviewer reaches shows "beta", "test version", "trial", "preview", "experimental", "early access", or "coming soon" attached to the app itself, a shipped language, or a live feature.
  Why it can cause rejection: **Guideline 2.2 (Beta Testing)** — Apple rejects builds that read as unfinished/beta software. This is the exact failure mode that motivated this checklist (see `docs/app-store-review-notes.md`, English Beta history).

- [ ] **App is feature-complete** — MANUAL
  PASS criterion: every visible button/link leads to working functionality; no dead-end "coming soon" screens reachable from the reviewer's normal path.
  Why: **Guideline 2.1 (App Completeness)** — incomplete features read as an unfinished submission.

- [ ] **Privacy URL works** — AUTO + MANUAL
  PASS criterion: the Privacy Policy URL entered in App Store Connect resolves (HTTP 200) and matches the market/language of the submission.
  Why: broken or mismatched legal URLs are a common rejection and delay App Review.

- [ ] **EULA/Terms correct** — AUTO + MANUAL
  PASS criterion: if using **Apple's Standard EULA** (default for this app — see `docs/app-store-review-notes.md`), the App Description links to Apple's own EULA URL (`https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`), not our own `/terms`. If a **custom EULA** is ever configured in App Store Connect → License Agreement, it must be linked instead and must not conflict with `/terms`.
  Why: Apple rejects auto-renewable-subscription apps whose metadata lacks a functional EULA link (see the 2026-08-28 rejection in `docs/app-store-review-notes.md`).

- [ ] **Sign in with Apple compliance** — AUTO + MANUAL
  PASS criterion: if the app offers any third-party/social login (Google, Facebook, etc.) on iOS, Sign in with Apple is offered equally prominently (Guideline 4.8). This app offers only Apple + email/password on iOS (no Google on iOS) — confirm that has not changed.
  Why: missing Apple Sign In alongside other social logins is an automatic rejection.

- [ ] **Account deletion** — AUTO + MANUAL
  PASS criterion: Settings → "Radera konto" is reachable, visible without contacting support, and actually deletes the account end-to-end on the review build.
  Why: **Guideline 5.1.1(v)** requires in-app account deletion for apps that support account creation.

- [ ] **IAP/subscription metadata** — AUTO + MANUAL
  PASS criterion: subscription group/products in App Store Connect match what the app can actually purchase; pricing, trial length, and renewal terms in the product page match in-app copy.
  Why: mismatched IAP metadata triggers Guideline 3.1/2.1(b) business-model questions (see Build 22 history in `docs/app-store-review-notes.md`).

- [ ] **Restore purchases** — AUTO + MANUAL
  PASS criterion: a visible "Restore Purchases" action exists wherever purchases are offered, and it works.
  Why: required whenever IAP is live; its absence is a common rejection reason.

- [ ] **Review account works** — MANUAL
  PASS criterion: the credentials in `docs/app-store-demo-konto.md` actually log in on a fresh build, right now, and reach both parent and child views.
  Why: a non-functional review account is an automatic rejection with no substantive review of the app.

- [ ] **All backend services are live during review** — MANUAL
  PASS criterion: production API, push notifications, and any third-party services (RevenueCat, Resend, R2) are reachable from the review build's environment for the full review window.
  Why: the native app loads a remote WebView (no offline bundle) — if the backend is down, the reviewer sees a broken app.

- [ ] **Screenshots match the current app** — MANUAL
  PASS criterion: screenshots in App Store Connect reflect the UI of the build being submitted, not an older or newer version.
  Why: reviewers compare screenshots to the live app; mismatches read as misleading metadata.

- [ ] **Review Notes describe gated features** — MANUAL
  PASS criterion: Review Notes explain any flag-gated, region-gated, or role-gated feature the reviewer might otherwise think is broken or missing (see `docs/app-store-review-notes.md` for the running template).
  Why: unexplained gated features are frequently misread as bugs or incomplete functionality.

- [ ] **No placeholder/demo data implying an unfinished app** — AUTO + MANUAL
  PASS criterion: the review account's data looks like a real, populated family account, not empty/lorem-ipsum/obviously-fake content.
  Why: empty-state or placeholder-looking data reinforces a "beta/incomplete" impression (Guideline 2.1/2.2).

- [ ] **No external purchase/payment paths not permitted on iOS** — AUTO + MANUAL
  PASS criterion: no Stripe/web-checkout link or other external payment path is reachable from the iOS app for digital content (this app currently has none — Stripe was removed; RevenueCat/StoreKit is the sole path).
  Why: **Guideline 3.1.1** — external purchase links for digital goods are prohibited on iOS outside approved entitlements.

---

## 2. Google Play — pre-submission

- [ ] **Data Safety matches actual code** — MANUAL
  PASS criterion: the Play Console Data Safety form's data-collection/sharing answers match what the code actually collects and sends (see Check H — tracking/privacy — for the code-side facts to compare against).
  Why: Play suspends apps for Data Safety misrepresentation, discovered either at review or later audit.

- [ ] **Privacy policy correct** — AUTO + MANUAL
  PASS criterion: same URL requirements as Apple (§1) — resolves, matches market/language, not a placeholder.

- [ ] **Account deletion requirements** — AUTO + MANUAL
  PASS criterion: in addition to the in-app path, Play requires either an in-app path AND/OR a web path plus a Play Console Data Safety declaration of the deletion URL/method (see `docs/google-play-app-content.md`).
  Why: Play's account-deletion policy is stricter than Apple's about *where* deletion must be documented, not just reachable.

- [ ] **Target API level** — AUTO + MANUAL
  PASS criterion: `assets/play-store/android-sdk.json` `targetSdkVersion` meets Play's current minimum target API requirement for new submissions/updates.
  Why: apps targeting an API level below Play's floor are rejected outright.

- [ ] **Content rating** — MANUAL
  PASS criterion: the IARC content-rating questionnaire answers match the actual app content (child-directed family app, no ads/UGC unless declared).
  Why: incorrect content rating is a policy violation independent of app quality.

- [ ] **App access / reviewer access** — MANUAL
  PASS criterion: "App access" instructions in Play Console point to working review credentials (same account as `docs/app-store-demo-konto.md` unless a separate Android account is required).
  Why: Play cannot review a login-gated app without working access instructions.

- [ ] **Ads declarations** — MANUAL
  PASS criterion: "Contains ads" declaration matches reality (this app currently ships no third-party ad SDK).
  Why: a false "no ads" declaration is a policy violation if any ad SDK is later added without updating the declaration.

- [ ] **Families/children declarations where relevant** — MANUAL
  PASS criterion: if the app is ever submitted under the Families program or opts into a children's audience for any surface, the Families Policy checklist in Play Console is completed accurately for that surface only (this app's child PIN view is used by children under parent supervision — confirm current declared audience matches actual usage before every submission, this can change with product decisions).
  Why: family-policy violations carry some of Play's strictest enforcement.

- [ ] **Subscription/base plan/offer state** — AUTO + MANUAL
  PASS criterion: base plans/offers configured in Play Console match `config/iap-product-contract.js` product IDs and the "READY BUT OFF" state documented in `docs/PAYMENTS_V1_STATUS.md` — no live offer should be purchasable while `BILLING_UI_DISABLED`/`payment_enabled` are off.

- [ ] **Screenshots/store listing** — MANUAL
  PASS criterion: same as Apple (§1) — screenshots and listing copy match the submitted build.

- [ ] **Permissions declarations** — AUTO + MANUAL
  PASS criterion: `AndroidManifest.xml` permissions (camera, notifications, etc. — see `scripts/patch-android-manifest.mjs`) match what's declared/justified in Play Console's sensitive-permissions disclosures.

- [ ] **Production vs testing tracks correct** — MANUAL
  PASS criterion: the build being promoted is on the intended track (internal/closed/open testing vs production) — do not promote a testing-track build to production without the intended review.
  Why: promoting the wrong track can ship an unreviewed or intentionally-test build to real users.

- [ ] **No beta/test-markings in production listing/UI** — AUTO + MANUAL
  Same PASS criterion and rejection risk as Apple §1's first item — Play also penalizes apps that read as unfinished/beta in the production listing.

---

## 3. Legal

- [ ] **Privacy Policy URL exists and resolves for every submitted market/language** — AUTO (Check B)
  PASS criterion: `npm run release:compliance` Check B reports `PASS` for every market in the submission.
  Why: broken legal links are a common, easily-avoidable rejection.

- [ ] **Terms URL exists and resolves for every submitted market/language** — AUTO (Check B)

- [ ] **EULA configuration handled correctly** — AUTO (Check B) + MANUAL
  PASS criterion: Apple's Standard EULA is used and correctly linked (see §1); Google Play does not require a separate EULA declaration but Terms of Service must still be accurate.

- [ ] **No placeholder/old/incorrect legal URLs** — AUTO (Check B + Check C)
  PASS criterion: no `localhost`, `example.com`, `staging.`/`dev.` host in any legal URL; no page still marked `(placeholder)` for a market being actively promoted.

- [ ] **Legal copy references the correct product/country/version** — MANUAL
  PASS criterion: a human reads the actual rendered Privacy/Terms/EULA pages for the market being submitted and confirms they name the right product, jurisdiction, and data controller.
  Why: this app has SE/IE/FI/UK/EEA-draft legal variants (`src/lib/legal-routing.js`) — a copy/paste error across markets is not detectable by a URL-existence check alone.

## 4. Privacy

- [ ] **Declared tracking posture matches code** — AUTO (Check H) + MANUAL
  PASS criterion: no `NSUserTrackingUsageDescription`, no ATT plugin, no Meta native SDK unless explicitly intended (matches `docs/meta-app-events.md`).

- [ ] **App Store "App Privacy" answers match code** — MANUAL
  PASS criterion: a human compares the App Store Connect "App Privacy" questionnaire against the actual data flows (see `docs/meta-app-events.md`, `src/lib/acquisition-attribution.js`).
  Why: cannot be verified from the repo — the questionnaire lives entirely in App Store Connect.

- [ ] **Play "Data Safety" answers match code** — MANUAL (same reasoning as above, Play Console).

- [ ] **Data collection/sharing disclosures are current** — MANUAL
  PASS criterion: any new analytics provider, SDK, or data flow added since the last submission is reflected in both stores' privacy declarations.

## 5. Auth / review access

- [ ] **Review/test login flow documented** — AUTO (Check E) + MANUAL
  PASS criterion: `docs/app-store-demo-konto.md` exists and its credentials work right now on the build being submitted.

- [ ] **Reviewer is not forced through a login method review can't use** — AUTO (Check E) + MANUAL
  PASS criterion: email/password login exists as a fallback wherever a native platform only offers one social login (iOS: Apple only; Android: Google only).
  Why: an App Review reviewer's Apple/Google ID may not match any test account you provisioned.

- [ ] **Child/adult flow describable and testable** — AUTO (Check E) + MANUAL
  PASS criterion: Review Notes clearly explain the parent ↔ child PIN switch, and it works on the review account.

- [ ] **No dead-end states for the reviewer** — MANUAL
  PASS criterion: a human walks the exact steps in Review Notes end-to-end on a clean device/session and reaches every described screen.

## 6. Subscriptions / IAP

- [ ] **Kill switches match documented "READY BUT OFF" state** — AUTO (Check G)
  PASS criterion: `BILLING_UI_DISABLED` and `app_settings.payment_enabled` match `docs/PAYMENTS_V1_STATUS.md` at submission time — do not submit with a stale assumption about their state.

- [ ] **Purchase buttons not live while purchases are disabled** — AUTO (Check G)

- [ ] **Trial/free wording used correctly** — AUTO (Check A, safe-context patterns) + MANUAL
  PASS criterion: "free trial" subscription copy (allowed) is not confused with "trial version of the app" pre-release wording (not allowed) — a human sanity-checks any new trial-related copy.

- [ ] **External payment links not exposed on iOS** — AUTO (Check G)

- [ ] **Restore purchases documented/wired when IAP is active** — AUTO (Check G) + MANUAL

- [ ] **Subscription terms/pricing copy structured correctly** — MANUAL
  PASS criterion: pricing, billing period, and cancellation copy match both stores' required subscription-disclosure format.

- [ ] **RevenueCat/native readiness not marked ready prematurely** — MANUAL
  PASS criterion: `docs/app-store-iap.md` §8 kill-switch state matches what is actually configured in the RevenueCat dashboard and both stores' product consoles.

## 7. Metadata

- [ ] **App Store Connect metadata current** — MANUAL
  PASS criterion: `docs/app-store-connect-metadata.md` / `-en-GB.md` reflect what is actually pasted into App Store Connect for this submission (description, keywords, support/marketing/privacy URLs).

- [ ] **Play Console store listing current** — MANUAL
  PASS criterion: `docs/google-play-app-content.md` reflects the actual Play Console listing.

- [ ] **What's New / release notes accurate** — MANUAL
  PASS criterion: per-version release notes describe what actually changed in this build, not a stale copy-paste from the previous release.

- [ ] **Promotional text, keywords, support/marketing/privacy URLs current** — MANUAL

## 8. Screenshots

- [ ] **Screenshots reflect the current build on both stores** — MANUAL
  PASS criterion: no UI shown in a screenshot has since changed materially; capture fresh screenshots after any significant UI change (see `docs/app-store-screenshots/README.md` for the capture process).

- [ ] **Required device sizes covered** — MANUAL
  PASS criterion: App Store Connect's required screenshot sizes for the declared device support (iPhone-only vs Universal — see `docs/app-store-review-notes.md` Build 22/23 history) are all present.

## 9. Review notes

- [ ] **Review Notes reference the exact build being submitted** — AUTO (submission-metadata check) + MANUAL
  PASS criterion: the top-most entry in `docs/app-store-review-notes.md` names the current `CURRENT_PROJECT_VERSION`, and that is what actually gets pasted into App Store Connect.

- [ ] **Gated/flagged features explained** — MANUAL (see §1)

- [ ] **Test credentials present and current** — MANUAL
  PASS criterion: credentials referenced come from `docs/app-store-demo-konto.md` / the secret store — never hardcode a real credential value into a submitted review-notes field.

- [ ] **No unresolved placeholder text in the pasted notes** — AUTO (Check C)
  PASS criterion: `npm run release:compliance` Check C reports no `A_CONSUMER_UI` hits in `docs/app-store-review-notes.md`.

## 10. Post-submission check

- [ ] **Confirm the correct build/version was actually submitted** — MANUAL
  PASS criterion: App Store Connect / Play Console shows the expected build number / versionCode attached to the submitted version.

- [ ] **Monitor for a rejection and log it** — MANUAL
  PASS criterion: any rejection is appended to `docs/app-store-review-notes.md` (Apple) or an equivalent Play rejection log, with root cause and fix — do not let it become an undocumented one-off fix a second time.

- [ ] **Re-run `npm run release:compliance` after a metadata-only fix** — AUTO
  PASS criterion: metadata-only corrections (e.g. an EULA link fix) are still verified by the gate before resubmission, even though no code changed.

- [ ] **Confirm production backend health after any related deploy** — MANUAL
  PASS criterion: `GET /health` healthy per the deploy-ops Cursor rule — a store release can go live while a backend deploy is in flight; confirm both landed cleanly.
