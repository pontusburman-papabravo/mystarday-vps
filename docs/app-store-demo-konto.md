# App Store Review — Test Account

> Test account credentials and step-by-step walkthrough for Apple App Store reviewers.
> English — Apple reviewers read English.

---

## Credentials

| Field | Value |
|-------|-------|
| Parent email | `review@mystarday.se` |
| Parent password | `AppReview2026!` |
| Child name | Anna |
| Child PIN | `4455` |
| App URL | https://mystarday.se |

---

## How to log in

1. Open **Min Stjärndag** on a simulator or test device.
2. On the login screen, enter:
   - Email: `review@mystarday.se`
   - Password: `AppReview2026!`
3. Tap **Logga in** (Login).
4. You are now in the **parent dashboard**.

---

## What the parent sees

The parent dashboard shows:
- Family name (Review Family)
- 1 child profile: **Anna** (🌟) with an active weekly schedule
- A pre-populated example schedule with 5 activities
- Reward history (Skattkammaren / treasure chamber)
- Notification settings and push toggles

---

## How to switch to the child view

1. As the parent, tap the **child's card** or look for the "Byt till barnvy" (switch to child view) button.
2. Enter PIN: `4455`
3. You are now in the **child's daily view** — a colorful, star-themed interface showing today's schedule.
4. Children can tap activities to mark them complete and earn stars.

---

## Key features to demonstrate

| Feature | How to find it |
|---------|---------------|
| Weekly schedule | Dashboard → Veckoschema tab |
| Daily log | Dashboard → Daglig logg |
| Child view (PIN required) | Tap child avatar → enter `4455` |
| Skattkammaren (rewards) | Hamburger menu → Skattkammaren |
| Settings | Hamburger menu → Inställningar |
| Privacy Policy | `/privacy` on the web, or Settings → Integritetspolicy |
| Terms of Service | `/terms` on the web, or Settings → Användarvillkor |

---

## Test account setup (internal use only)

To create this account in the database, run:

```sql
-- 1. Create the parent account (family_id will be generated)
INSERT INTO parent (email, password_hash, name, family_id, email_verified, account_type, created_at, updated_at)
VALUES (
  'review@mystarday.se',
  (SELECT ('$2b$' || rounds || '$' || encode(gen_salt('bf', ' Geno'), 'hex')) FROM (SELECT 12 AS rounds) AS x),
  'Review Tester',
  gen_random_uuid(),
  true,
  'family',
  now(),
  now()
);

-- The password hash is generated separately; use bcrypt with 12 rounds.
-- Replace the hash above with a real bcrypt hash of 'AppReview2026!' before inserting.
```

> **Note:** For the actual seed, use bcrypt rounds=12 on `AppReview2026!` to generate the hash.
> The full seed script is in `migrations/1790061000000_appstore_test_account.sql`.

---

## Expected test flow (App Store reviewer)

1. **Launch app** → see landing page / login screen
2. **Log in** with `review@mystarday.se` / `AppReview2026!`
3. **Parent dashboard** loads — shows family + child
4. **Tap "Byt till barnvy"** on the child card
5. **Enter PIN `4455`** → child daily view with stars
6. **Tap an activity** → it completes, star count increases
7. **Open Settings** → see privacy policy and terms links
8. **Log out** from the sidebar/hamburger menu
9. **Log in again** → verify session persists

---

## Troubleshooting

**Can't log in?**
- Check the account is seeded in the database (run the migration)
- Try password reset at `/login?reset=1`

**Child PIN not working?**
- The PIN is `4455`. If it doesn't work, the child may not be created — check the migration.

**App loads as blank?**
- The app requires JavaScript and a network connection for the initial load.
- If offline, the PWA may show an offline page for non-cached routes.

---

## App URLs

| URL | Purpose |
|-----|---------|
| https://[REDACTED] | Main app |
| https://[REDACTED]/privacy | Privacy Policy |
| https://[REDACTED]/terms | Terms of Service |
| https://[REDACTED] | Marketing landing page |