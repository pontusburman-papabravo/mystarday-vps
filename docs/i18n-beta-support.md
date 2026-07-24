# English beta support

## What “beta” means

- English is **available to real users** who **actively choose** it.
- Copy may still be Swedish in unmigrated areas (Planning/Family until PR #715, Child Core, etc.).
- Translation and layout issues are expected.
- Physical device QA is **not** complete.

## User-facing surfaces

| Surface | File |
|---------|------|
| Registration choice | `public/js/language-choice.js` |
| Existing-family offer | `public/js/english-beta-offer.js` |
| In-app banner | `public/js/english-beta-banner.js` |
| Settings switcher | `public/js/locale-switcher.js` |
| Report issue | `public/js/feedback.js` type `language` |

## Product coverage matrix (factual)

| Area | sv-SE | en-GB | Beta/ready | Flag |
|------|-------|-------|------------|------|
| Auth entry | ✅ | ✅ | Ready | — |
| Onboarding | ✅ | ✅ | Ready | — |
| Home / Today | ✅ | ✅ | Beta | `english_app` |
| Journey coach | ✅ | ✅ | Beta | `english_app` |
| Planning / Library / Family | ✅ | ⏳ | PR #715 | `english_app` |
| Child Core | ✅ | ❌ | Blocked | `english_child_experience` |
| My Collection / People / Space | ✅ | ❌ | Not started | — |
| Deep Settings forms | ✅ | Partial | Beta | `english_app` |
| Public marketing P0 | ✅ | ✅ P0 | Beta | `engelsk_landingssida` |
| SEO articles / PDFs | ✅ | ❌ | Later | — |
| Email / push | sv | sv | Later | — |

## Admin

- Family locale on admin family cards (`preferred_locale`, selection source, beta badge).
- `GET /api/admin/locale-analytics` — distribution, registrations, offer states, language reports.

## Rollback

1. Turn off `english_app` per family or globally via admin features.
2. Keep user locale choice; explain temporary limits if needed.
3. Do not revert migration `1810000000005`.
