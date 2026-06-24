# Min Stjärndag

A Swedish family app for children's daily routines, star rewards, and schedule management. Parents create structured daily schedules, children earn stars by completing activities, and redeem stars for rewards in the "Skattkammaren" (treasure chamber).

## Stack

Express.js + Neon PostgreSQL + Tailwind CDN, deployed on Render.

## Directory map

- `server.js` — Express entry point, middleware, route mounting (under 300 lines)
- `src/routes/` — All API route handlers (auth, onboarding, rewards, schedules, messages, etc.)
- `src/middleware/` — Auth middleware, rate limiter, maintenance mode, impersonation write-block, CSRF protection, validate (Zod), authz (centralized authorization helpers + middleware factories), platform-html (injects platform-theme.js + platform-native.css into all HTML responses)
- `src/lib/` — Shared utilities (db, config, hashing, i18n, schedulers, schemas, win-back-scheduler.js)
- `db/` — Named DB query functions per entity (system-messages.js, etc.)
- `public/` — Static HTML pages, CSS, client JS (SPA-like pages served by Express)
- `migrations/` — Database migrations (node-pg-migrate format)
- `config/` — Configuration files (subscription-components.js)

## Database

- `family` — household unit with timezone and section time settings; also holds is_lifetime_free BOOLEAN (all existing families = true), subscription_status ('none'|'active'|'expired'|'grace_period'|'cancelled'; defaults 'none' post-IAP migration), trial_ends_at, rc_customer_id VARCHAR(255) (RevenueCat linkage)
- `parent` — parent account (email auth, family role, account_type ('family'|'educator'|'dual'), preferred_view_mode ('parent'|'pedagog'), push_preferences JSONB, admin_push_enabled, apple_user_id/apple_email for Apple Sign In)
- `child` — child profile (name, emoji, avatar_url, birthday, PIN, view_type, username, child_view_config JSONB with view_mode + element visibility flags); avatar_url enables profile photo upload with fallback chain: image → emoji → ⭐-placeholder
- `parent_child` — parent-to-child link (primary/shared/pedagog roles); revoked_at/revoked_by for soft deletion; connected_at when pedagogen linked
- `pedagog_invite` — educator invite tokens (family_id, email, invitee_name, child_ids, token, expires_at, accepted/accepted_at)
- `activity_template` — family-scoped activities (legacy table name; API is `/api/activities`); `source` column ('admin'|'user') tracks origin
- `default_activity_template` — admin-seeded global activity library (sub_steps JSONB)
- `default_schedule` / `default_schedule_item` — admin-managed standard schedules (copied to children)
- `weekly_schedule` / `weekly_schedule_item` — per-child 7-day schedules (name column for named templates)
- `special_day_schedule` / `special_day_schedule_item` — date-specific overrides
- `daily_log` / `daily_log_item` — daily completion tracking with star values; `daily_log_item.completed_date` (DATE) stores the schedule day for each completion (supports retroactive entry)
- `reward` / `reward_redemption` — star-cost rewards and child redemptions
- `default_reward` — admin-seeded global reward library
- `streak` — child streak tracking
- `feature_flag` — operational and feature flags
- `family_invite` — multi-parent invite tokens
- `admin_audit_log` — admin impersonation sessions and blocked write attempts (admin_id, target_family_id, action, metadata)
- `push_subscriptions` — push subscriptions per parent; web uses endpoint+subscription_json; native uses native_token+platform ('web'|'ios'|'android'); platform/native_token added 2026-05-25
- `system_messages` — admin-to-family direct notifications (id, family_id, message, is_read, created_at)
- `refresh_token` — httpOnly refresh tokens (hashed SHA-256; parent_id or child_id, expires_at, 30d TTL by default); access_token cookie also 30d so refresh works on PWA reopen
- `pin_lockout` — per-child PIN lockout state (attempt_count, locked_until); one row per child, upserted
- `pin_notification_log` — tracks when parent was notified about PIN failures (for email cooldown)
- `pin_audit_log` — immutable audit trail of all PIN events (attempts, lockouts, notifications, unlocks)
- `dagens_nyhet` — admin-published news items (title, body 280 chars, show_landing, send_push, expires_at 48h, status: draft/scheduled/published/unpublished, publish_at, unpublish_at, email_sent_count, email_sent_at, email_failed)
- `newsletters` — standalone newsletter dispatches (subject, body text, status: draft/sent/failed, sent_at, sent_count, failed_count); separate from dagens_nyhet
- `welcome_email_template` — editable welcome email sent to new parents on registration (id=1, subject, body with **bold** + `{{foralderns_namn}}` vars, is_active boolean); seeded on deploy
- `email_subscriptions` — newsletter opt-in/out tracking (parent_id FK, email, subscribed, subscribed_at, unsubscribed_at, unsubscribe_token UUID)
- `notification_log` — per-parent push notification archive (id, parent_id, title, body, type, url, is_read, created_at); pruned after 7 days by midnight scheduler
- `analytics_events` — anonymised event stream (family_id UUID, event_type, metadata JSONB, created_at, time_bucket smallint); no PII; indexed on (event_type, created_at), (time_bucket, created_at), (family_id, event_type)
- `analytics_daily_snapshots` — one row per day with active_families_24h/7d, stars_given, rewards_claimed, conversion_rate, pwa counts, newsletter subscribers; written by midnight scheduler
- `surveys` — survey/form definitions (slug, title, description, target_tag, status: draft/active/paused/closed, opens_at, closes_at, thank-you config)
- `survey_questions` — ordered questions per survey (types: radio, checkbox, text_short, text_long, scale; conditional logic via condition_question_id + condition_option_id)
- `survey_options` — answer choices for radio/checkbox questions (allows_freetext flag)
- `survey_responses` — one per respondent session; status in_progress → submitted; GDPR consent + email optional
- `survey_response_answers` — one row per question per response; upserted for partial save
- `survey_participants` — cookie_token + fingerprint duplicate detection per survey
- `survey_popup_interactions` — per-parent/cookie popup action log (shown/snoozed/dismissed/clicked; snooze_until for 3-day cooldown)
- `survey_contest_entries` — contest respondents (respondent_email, is_winner, is_contacted); one per response
- `email_templates` — four admin-editable email templates (undersokning|valkomstmail|nyhetsbrev|win-back; subject, body_text plain text with variable support); win-back added 2026-05-26
- `win_back_email_log` — approval-gated win-back send log (status: pending_approval|approved|sent|rejected; parent_email, parent_name, child_name, sent_at nullable, created_at for 48h stale tracking); replaces direct email send in scheduler
- `schedule_date_exclusion` — per-date exclusion for recurring schedule items ("bara denna dag" delete); PK (child_id, date, activity_template_id)
- `professional_interest` — interest form submissions from /pedagoger-och-terapeuter (name, email, role, organization, message, gdpr_consent, ip_address, created_at)
- `waitlist` — English landing page email signups (name, email, utm_source, ip_address, created_at); unique on email; used for launch outreach
- `professional_share_link` — parent-created report share links for professionals (family_id, child_id, public_id UUID, label, parent_summary, date_from/to, pin_hash, fields TEXT[], expires_at 7d, revoked_at, view_count)
- `pedagog_notes` — daily structured observations by pedagogen-role parents (child_id, pedagog_id, date, mood 1-5, sleep_quality 1-5|'easy'|'slow'|'difficult', sleep_hours, meals, behavior, notes, meals_structured JSONB, is_draft boolean); unique (child, pedagog, date)
- `child_observation` — free-standing notes per child per date (id, child_id, parent_id, date, section: 'fm'|'em'|'kvall', content, is_important, created_at, updated_at); used for "Allmän observation" in reports
- `general_observations` — family-level, time-agnostic notes (id, family_id, created_at, archived_at, text, is_important); separate from child_observation; supports archive/restore; used for "Allmän observation" in Rapporter → Aktiviteter-fliken
- `features` — feature flag master list (slug, name, description, status: dev/live/off, tags, priority, complexity, estimated_hours, documentation JSONB); indexes on status + slug
- `family_features` — family-to-feature access mapping (family_id FK, feature_slug FK, enabled_at); PK (family_id, feature_slug); used to gate dev-mode features per family
- `family_subscriptions` — component-based subscription model (family_id FK, tier: 'lifetime_free'|'trial'|'paid', trial_expires_at TIMESTAMPTZ, components JSONB); GIN index on components; has_component() SQL function; 96 existing families migrated to lifetime_free with basic_app

## External integrations

- **Image uploads** — Cloudflare R2 when `R2_*` is set, otherwise **local disk** on VPS (`data/uploads`, served at `/uploads/…`)
- **Resend** — all outbound email (verification, invite, welcome, newsletter, PIN warning, account deletion, feedback, weekly summary); via `src/lib/email.js` → `https://api.resend.com/emails`; `RESEND_API_KEY` env var; kill switch `EMAIL_ENABLED=false`; sender `Min Stjärndag <info@mystarday.se>` (`EMAIL_FROM` / `EMAIL_FROM_NAME`)
- **RevenueCat IAP** — sole payment path on native iOS/Android (Apple/Google in-app purchase); `REVENUECAT_API_KEY` + `REVENUECAT_WEBHOOK_SECRET` env vars; `GET /api/iap/config` + `POST /api/iap/webhook` in `src/routes/iap.js`. No web checkout. See `docs/app-store-iap.md`. Stripe removed (Fas 5); history in `docs/ARKIVERAT-STRIPE.md`.
- **Web Push (VAPID)** — push notifications via VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY env vars
- **Apple APNs** — iOS native push via raw HTTP/2 + ES256 JWT auth (APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY_PATH, APNS_BUNDLE_ID env vars); BadDeviceToken/Unregistered tokens are auto-deleted from push_subscriptions; docs at `docs/app-store-apns.md`
- **Facebook Graph API** — cross-post dagens nyhet to page feed (FACEBOOK_PAGE_ACCESS_TOKEN + FACEBOOK_PAGE_ID env vars)

## Recent changes

- 2026-06-24: Refactor Fas 8 F2d — timeline + side-by-side views extracted from `dashboard.js` to `public/js/dashboard-views.js` (IIFE; 6 `window.*` handlers); loaded after `dashboard-approvals.js`; SW v310.
- 2026-06-24: Refactor Fas 8 F2f — give-stars modal + request panel extracted from `dashboard.js` to `public/js/dashboard-approvals.js` (IIFE; 8 `window.*` handlers); loaded after `dashboard-card-actions.js`; SW v309.
- 2026-06-24: Refactor Fas 8 F2i — card actions (pause/give-stars/quick checkoff) extracted from `dashboard.js` to `public/js/dashboard-card-actions.js` (IIFE; 10 `window.*` handlers); loaded after `dashboard.js`; SW v308.
- 2026-06-24: Refactor Fas 8 F2h — copy-day/copy-child/delete/confirm modals extracted from `dashboard.js` to `public/js/dashboard-copy-modals.js` (IIFE; 11 `window.*` handlers); loaded after `dashboard.js`; SW v307.
- 2026-06-23: Refactor Fas 8 F2c — weekly star-history chart extracted from `dashboard.js` to `public/js/dashboard-star-history.js` (IIFE; `window.loadStarHistory`/`renderStarHistory`); loaded after `dashboard.js`; SW v298.
- 2026-06-23: Refactor Fas 8 F2b — co-parent invite + dela-appen CTA banners extracted from `dashboard.js` to `public/js/dashboard-cta.js` (IIFE; entry points on `window`); loaded after `dashboard.js`; SW v297.
- 2026-06-23: Refactor Fas 8 F3 — milestone/confetti/dopamin-burst celebration effects extracted from `child-dashboard.js` to `public/js/child-dashboard-celebrations.js` (IIFE; `window.checkMilestones`/`launchMilestoneConfetti`/`launchDopaminBurst`); loaded after + precached in SW; SW v296.
- 2026-06-23: Refactor Fas 8 F2 — special-day calendar + edit modal extracted from `dashboard.js` to `public/js/dashboard-special-days.js` (IIFE; entry points on `window`: `renderSpecialDaysCalendar` + `sd*` onclick handlers); loaded after `dashboard.js`; SW v295.
- 2026-06-23: Refactor Fas 8 F1 — shared schedule helpers extracted to `public/js/schedule-core.js` (`DAYS`, `SECTIONS`, `updateBirthdayHidden`, `fmtTime`, `sectionTimeLabel`, `getDayDateLabel`, `buildSectionCardsHtml`); loaded before `dashboard.js` + `schedule.js`; SW v294.
- 2026-06-23: Refactor Fas 7 E2 (complete) — login/session routes extracted to `src/routes/auth/login.js` (login, logout, me, me/preferences, login-picker-children); `index.js` is now a thin barrel mounting login/register/refresh/child-login/email/oauth-apple/oauth-google. `auth.js` (1770 r) fully split into `src/routes/auth/`.
- 2026-06-23: Refactor Fas 7 E2 — registration route extracted to `src/routes/auth/register.js` (POST /register + default activity seeding); removed now-unused imports from index.js.
- 2026-06-23: Refactor Fas 7 E2 — CSRF + refresh routes extracted to `src/routes/auth/refresh.js` (GET /csrf-token, POST /refresh); removed now-unused verifyRefreshToken/clearRefreshCookie imports from index.js.
- 2026-06-23: Refactor Fas 7 E2 — child-login route extracted to `src/routes/auth/child-login.js` (POST /child-login, PIN lockout); removed now-unused imports (childLoginLimiter, ChildLoginSchema, pinLockout, sendPinWarningEmail, createSystemMessage, broadcast) from index.js.
- 2026-06-23: Refactor Fas 7 E2 — email-flow routes extracted to `src/routes/auth/email.js` (verify-email, resend-verification, forgot-password, reset-password); removed now-unused imports from index.js.
- 2026-06-23: Refactor Fas 7 E2 — Google Sign In route extracted to `src/routes/auth/oauth-google.js` (POST /google); removed now-unused appleLoginLimiter/parentDb/completeLogin imports from index.js.
- 2026-06-23: Refactor Fas 7 E2 — Apple Sign In routes + helpers extracted to `src/routes/auth/oauth-apple.js` (POST /apple, /apple/link, verifyAppleIdToken, JWKS cache, createParentWithApple); test path updated.
- 2026-06-23: Refactor Fas 7 E2 (fas 1) — shared auth session helpers extracted to `src/routes/auth/session.js` (parseDuration, completeLogin, clearAllSessionCookies); index.js imports them. No route move; removed now-unused clearAccessCookie import.
- 2026-06-23: Refactor Fas 7 E2 (relocate) — `auth.js` moved to `src/routes/auth/index.js` (no route move; require paths fixed one level deeper). Prep for incremental auth split per `docs/refactor/e2-auth-endpoint-map.md`. Test path updated in `test/apple-signup-sql.test.js`.
- 2026-06-23: Refactor Fas 7 E1 (complete) — core family routes extracted to `src/routes/family/core.js` (read/update, settings, dashboard-stats, readiness, star-history, subscription-status); `index.js` is now a thin barrel mounting invites-public (before gate) → requireParent → core/account/invites/members/pedagog/pin. `family.js` (2198 r) fully split into `src/routes/family/`.
- 2026-06-23: Refactor Fas 7 E1 — family account-deletion route extracted to `src/routes/family/account.js` (DELETE /delete-account).
- 2026-06-23: Refactor Fas 7 E1 — parent-invite routes extracted to `src/routes/family/invites.js` (check-member, invite, DELETE invite/:inviteId, add-parent, accept-invite); removed unused imports from index.js.
- 2026-06-23: Refactor Fas 7 E1 — family member/child management routes extracted to `src/routes/family/members.js` (PUT/DELETE members, PUT members children, DELETE children).
- 2026-06-23: Refactor Fas 7 E1 — pedagog invite/access routes extracted to `src/routes/family/pedagog.js` (invite-pedagog ×3, pedagog-access/revoke); mounted after the requireParent gate.
- 2026-06-23: Refactor Fas 7 E1 — parent PIN + login-picker session routes extracted to `src/routes/family/pin.js` (parent-pin-status[-picker], verify-pin[-picker], set-pin, restore-parent-session + picker/cookie helpers); mounted after the requireParent gate (behavior preserved, endpoint-map R3).
- 2026-06-23: Refactor Fas 7 E1 — public family-invite routes extracted to `src/routes/family/invites-public.js` (GET /invite/:token, POST /invite/accept-new); mounted before the requireParent gate in index.js.
- 2026-06-23: Refactor Fas 7 E1 (relocate) — `family.js` moved to `src/routes/family/index.js` (no route move; require paths fixed one level deeper). Prep for incremental family split per `docs/refactor/e1-family-endpoint-map.md`.
- 2026-06-23: Refactor Fas 7 E4 — split `account.js` → `src/routes/account/` (export, password, notifications, lifecycle, identity); split `surveys.js` → `src/routes/surveys/` (admin, public, shortlink).
- 2026-06-23: Refactor Fas 7 E3c — daily-logs authz confirmed N/A (D1c helpers already used); contract test `test/daily-logs-authz-contract.test.js`.
- 2026-06-23: Refactor Fas 7 E3b — daily-logs logs router moved to `src/routes/daily-logs/logs.js`. Files: src/routes/daily-logs/logs.js, src/routes/daily-logs.js.
- 2026-06-23: Refactor Fas 7 E3b — daily-logs items router moved to `src/routes/daily-logs/items.js`. Files: src/routes/daily-logs/items.js, src/routes/daily-logs.js, test/three-layer-separation.test.js.
- 2026-06-23: Refactor Fas 7 E3b — daily-logs parent router moved to `src/routes/daily-logs/parent.js` (childRouter, no path change). Files: src/routes/daily-logs/parent.js, src/routes/daily-logs.js.
- 2026-06-23: Refactor Fas 7 E3a — daily-logs shared helpers extracted to `src/routes/daily-logs/helpers.js` (no route move). Files: src/routes/daily-logs.js, src/routes/daily-logs/helpers.js.
- 2026-06-23: Refactor Fas 7 E0 — baseline Express route inventory (`docs/route-inventory-pre-split.md`, `scripts/dump-routes.js`, `npm run dump:routes` / `check:routes`). Files: docs/route-inventory-pre-split.md, scripts/dump-routes.js, test/route-inventory.test.js, package.json.
- 2026-06-23: Refactor Fas 6 B1 — remove legacy Polsia `users` table from `migrate.js` core bootstrap (no app/db code referenced it). Existing prod rows remain until manual DROP. Files: migrate.js, test/migration-rollback-gate.test.js.
- 2026-06-23: Refactor Fas 6 A5c — DB migration drops unused `family.stripe_customer_id` / `stripe_subscription_id` (Stripe removed in Fas 5). Files: migrations/1808300000000_drop_family_stripe_columns.js, CLAUDE.md.
- 2026-06-23: Refactor Fas 5 A7 — docs: RevenueCat/IAP as sole payment path; Stripe removed from README/CLAUDE/app-store-iap; history archived in `docs/ARKIVERAT-STRIPE.md`. Files: README.md, CLAUDE.md, docs/app-store-iap.md, docs/ARKIVERAT-STRIPE.md.
- 2026-06-23: Refactor Fas 5 A6 — admin prenumeration Stripe UI removed (SW v267): IAP status card only in admin subscription settings; Stripe CSS hooks removed from `platform-native.css`. Files: public/admin/index.html, public/admin/admin-subscription-settings.js, public/css/platform-native.css, public/sw.js.
- 2026-06-23: Refactor Fas 0 (Gate A prep) — `checkMaintenanceMode` moved before `registerRoutes()` in `app.js` so API routes return 503 during maintenance; `/api/iap/*` exempt so RevenueCat webhooks keep flowing; regression test `test/maintenance-order.test.js`. Files: app.js, src/middleware/maintenance.js, test/maintenance-order.test.js.
- 2026-06-21: Bugfix — Apple Sign In on iPad, main-thread presentation (iOS build 19, SW v266): App Review 2.1a kept rejecting Sign in with Apple on iPad even after builds 16/17 added the `ASAuthorizationControllerPresentationContextProviding`. Root cause was orthogonal to the presentation anchor: Capacitor dispatches plugin methods on a **background queue**, but `ASAuthorizationController.performRequests()` and the `presentationAnchor(for:)` UIKit lookup MUST run on the main thread. iPhone tolerates being called off-main (the system bounces the sheet to main), iPad strictly requires a main-thread presentation and otherwise fails with `ASAuthorizationError 1000` + error sheet — the exact "works on iPhone, fails on iPad" symptom. Fix: (1) wrapped the entire `authorize` body in `DispatchQueue.main.async` in `scripts/ios/SignInWithApple-Plugin.patched.swift`; (2) `verify-ios-apple-sign-in-patch.mjs` and the `Podfile` `post_install` hook now also require `DispatchQueue.main.async` in the vendored patch so the main-thread hop can't silently regress; (3) fixed `platform.js` native name mapping (plugin returns `givenName`/`familyName` at the response top level, code only read `fullName.*` → name was always lost on native); (4) bumped `CURRENT_PROJECT_VERSION` to 19. Files: scripts/ios/SignInWithApple-Plugin.patched.swift, scripts/verify-ios-apple-sign-in-patch.mjs, ios/App/Podfile, public/js/platform.js, ios/App/App.xcodeproj/project.pbxproj, public/sw.js.
- 2026-06-19: Bugfix — Apple Sign In on iPad, durable fix (iOS build 17): App Review 2.1a kept rejecting because Sign in with Apple errored on iPad while working on iPhone. Root cause: the `@capacitor-community/apple-sign-in` pod lacks an `ASAuthorizationControllerPresentationContextProviding`, which iPad strictly requires (iPhone tolerates its absence). The fix existed only in an ephemeral Node script (`patch-ios-apple-sign-in-presentation.mjs`) that patches `node_modules`/`Pods`, and build 16's vendored patch used the iOS-15-only `windowScene.keyWindow` API on an iOS-14 target → compile error → the uploaded binary fell back to the unpatched plugin. Made the fix durable: (1) hardened `scripts/ios/SignInWithApple-Plugin.patched.swift` with a robust, iOS-14-compile-safe presentation anchor (Capacitor WebView window first, never an empty `ASPresentationAnchor()`); (2) added a committed `Podfile` `post_install` hook that re-applies the patch on EVERY `pod install` (local Xcode archive or Xcode Cloud), independent of the Node script; (3) `verify-ios-apple-sign-in-patch.mjs` now also fails the build if the provider isn't assigned or if the iOS-15-only `windowScene.keyWindow` regression returns; (4) bumped `CURRENT_PROJECT_VERSION` to 17. Files: scripts/ios/SignInWithApple-Plugin.patched.swift, ios/App/Podfile, scripts/verify-ios-apple-sign-in-patch.mjs, ios/App/App.xcodeproj/project.pbxproj.
- 2026-05-30: Bugfix — /api/children error logging (SW v165): requireNotPedagogOnly had silent `.catch(next)` — DB errors produced no server log, making 500s impossible to diagnose. Added explicit `console.error('[AUTHZ] requireNotPedagogOnly failed for parent', req.user.id, ':', err.message)` before `next(err)`. children.js GET now logs parentId + stack trace on DB errors. daily-log.js now shows server error message + HTTP status code in toast so users can report useful info. Files: src/middleware/authz.js, src/routes/children.js, public/js/daily-log.js.
- 2026-05-30: Bugfix — subscription paywall blocking lifetime-free families (SW v164): requireActiveSubscription read `req.user.family_id` (snake_case) but JWT stores `familyId` (camelCase) → always undefined → DB query with NULL → 0 rows. Also missing `is_lifetime_free === true` check → inaugural families with `subscription_status='none'` got 402 blocked. Fixed property name + added is_lifetime_free check in subscription.js; fixed same property mismatch in stripe-checkout.js and family.js. Files: src/middleware/subscription.js, src/routes/stripe-checkout.js, src/routes/family.js.
- 2026-05-29: Bugfix — Onboarding TDZ crash fix (SW v163): `const IS_ADD_CHILD` declared at line 988 but used at line 922 → Temporal Dead Zone ReferenceError killed entire onboarding.js → emoji grid never built, template groups never loaded, "Laddar scheman…" stuck forever. Fix: moved declaration before first usage. Files: public/js/onboarding.js, public/sw.js, CLAUDE.md.
- 2026-05-29: Bugfix — Admin SyntaxError crash fix (SW v162): email validation regex on line 693 of admin-families.js had escaped closing slash (`\/` instead of `/`), preventing entire file from parsing → loadFamilies/loadMessages never defined → Familjer/Meddelanden/Bibliotek stuck on "Laddar..." forever. One-char fix. Files: public/admin/admin-families.js, public/sw.js, CLAUDE.md.
- 2026-05-29: Bugfix — Admin mobile navigation fix PART 2 (SW v160): v159's static-asset exemption was insufficient — API calls to /api/admin/* and /api/auth/refresh still hit the 200 req/min globalLimiter (which runs before optionalAuth so req.user is always undefined). When /api/auth/refresh gets 429'd, the access token expires without renewal → next API call gets server-side 401 → silentRefresh returns 401 → redirect to /login. Fix: exempt /api/admin/* and /api/auth/refresh from globalLimiter; added redirect interceptor to admin page for remaining diagnostics. Files: src/middleware/rateLimiter.js, public/admin/index.html, public/sw.js, CLAUDE.md.
- 2026-05-29: Bugfix — Admin mobile navigation fix (SW v159): global rate limiter was counting static assets (.js, .css, etc.) against the 200 req/min IP budget — admin panel loads 20+ JS files per page, exhausting the limit → 429 on API calls → redirect to /login. Fix: exempt static file extensions from globalLimiter; admin-core.js catch block now only redirects on 401/403, not 429/network errors. Files: src/middleware/rateLimiter.js, public/admin/admin-core.js, public/sw.js, CLAUDE.md.
- 2026-05-29: Bugfix — child-login manual name fallback (SW v158): replaced "Be en vuxen logga in först" dead-end with manual name input form so children can type their name + PIN in browsers without a parent session; added handleManualName() + hideSuccess(); /child-login now works identically on all platforms. Files: public/child-login.html, public/js/child-login.js, public/sw.js, CLAUDE.md.
