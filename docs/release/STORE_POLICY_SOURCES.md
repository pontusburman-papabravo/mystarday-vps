# Official Store Policy Sources

> **Policy changes over time. Before every production submission, verify this checklist against the current official Apple and Google policy pages. Repo checks (`npm run release:compliance`, [`STORE_SUBMISSION_CHECKLIST.md`](./STORE_SUBMISSION_CHECKLIST.md)) are not a substitute for current store-policy review.**

This document intentionally does **not** copy policy text — copied text goes stale and creates a false sense of currency. It links to the official source for each category so a human (or an AI agent acting on the human's behalf) opens the *live* page before a go/no-go decision.

**Maintenance:** this list of categories and links is reviewed manually. If Apple/Google restructure their docs and a link below 404s, fix the link — do not remove the category.

## Apple

| Category | Official source |
|---|---|
| App Store Review Guidelines (full) | <https://developer.apple.com/app-store/review/guidelines/> |
| Guideline 2.2 — Beta Testing (no beta apps in production) | <https://developer.apple.com/app-store/review/guidelines/#beta-testing> |
| Guideline 2.1 — App Completeness | <https://developer.apple.com/app-store/review/guidelines/#app-completeness> |
| Guideline 5.1.1(v) — Account deletion | <https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage> |
| Guideline 3.1 — In-App Purchase / payments | <https://developer.apple.com/app-store/review/guidelines/#in-app-purchase> |
| Guideline 4.8 — Sign in with Apple requirement | <https://developer.apple.com/app-store/review/guidelines/#sign-in-with-apple> |
| App Review submission guidance / process | <https://developer.apple.com/app-store/review/> |
| App privacy details (Nutrition Labels) | <https://developer.apple.com/app-store/app-privacy-details/> |
| App Tracking Transparency | <https://developer.apple.com/documentation/apptrackingtransparency> |
| In-App Purchase / subscriptions (StoreKit) | <https://developer.apple.com/in-app-purchase/> |
| Auto-renewable subscriptions guidance | <https://developer.apple.com/app-store/subscriptions/> |
| Standard/custom End User License Agreement (EULA) | <https://developer.apple.com/support/offering-apple-standard-eula/> and <https://www.apple.com/legal/internet-services/itunes/dev/stdeula/> |
| Screenshot / metadata specifications | <https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications> |
| App Store Connect help (metadata, versions, builds) | <https://developer.apple.com/help/app-store-connect/> |
| Age ratings | <https://developer.apple.com/help/app-store-connect/reference/age-ratings> |
| Kids Category / Apps for Children | <https://developer.apple.com/app-store/kids-apps/> |

## Google Play

| Category | Official source |
|---|---|
| Developer Program Policies (full) | <https://play.google.com/about/developer-content-policy/> |
| Policy Center (by topic) | <https://support.google.com/googleplay/android-developer/topic/9877467> |
| User Data policy | <https://support.google.com/googleplay/android-developer/answer/10144311> |
| Data Safety section (Play Console form) | <https://support.google.com/googleplay/android-developer/answer/10787469> |
| Account deletion requirements | <https://support.google.com/googleplay/android-developer/answer/13327111> |
| Payments policy | <https://support.google.com/googleplay/android-developer/answer/9858738> |
| Subscriptions policy | <https://support.google.com/googleplay/android-developer/answer/140504> |
| Families policy | <https://support.google.com/googleplay/android-developer/answer/9893335> |
| App access (login-required apps / reviewer access) | <https://support.google.com/googleplay/android-developer/answer/9844680> |
| Target API level requirements | <https://developer.android.com/google/play/requirements/target-sdk> |
| Store listing / metadata requirements | <https://support.google.com/googleplay/android-developer/answer/9866151> |
| Permissions / sensitive APIs (Restricted use of permissions) | <https://support.google.com/googleplay/android-developer/answer/9888170> |
| Content ratings (IARC questionnaire) | <https://support.google.com/googleplay/android-developer/answer/188189> |
| Testing tracks vs production | <https://support.google.com/googleplay/android-developer/answer/9845334> |

## How to use this document

1. Before completing [`STORE_SUBMISSION_CHECKLIST.md`](./STORE_SUBMISSION_CHECKLIST.md), open the categories relevant to what changed since the last submission (new IAP products → Payments/Subscriptions rows; new market/language → App Completeness / Families rows; any UI change touching beta/trial wording → Guideline 2.2 row).
2. If a page has moved, update the link here in the same PR — do not silently work around a stale link.
3. If a policy conflicts with something this repo currently does, that is a **P0/P1 finding**, not a reason to skip the checklist — file it per [`docs/release/RELEASE_GATE_MODEL.md`](./RELEASE_GATE_MODEL.md) and resolve before submission.
4. **AI agents:** memorized/training-data knowledge of these policies can be outdated. Fetch the live page before asserting a policy requirement is or isn't met — see `.cursor/rules/151-store-compliance.mdc`.
