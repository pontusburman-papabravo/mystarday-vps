# ADR: User observability — authentication vs session vs activity

**Status:** Accepted (2026-08-18)  
**Context:** Trusted devices allow daily app use without password/Apple login. `login_event` alone no longer measures real usage.

## Definitions

### Authentication (`last_authenticated_at`)

The latest **real credential verification** for an actor:

- Parent: password login, Apple Sign In, Google Sign In (`login_event` row).
- Child: PIN login (`login_event` with `role = 'child'`).

**Not authentication:** trusted-device restore, refresh-token rotation, silent session resume.

Source of truth: `login_event.occurred_at` per `user_id` + `role`.

### Session start (`last_session_started_at`)

When a **user session was created or explicitly resumed** with a new access context:

- Events: `parent_session_started`, `child_session_started` in `analytics_events`.
- Includes trusted-device restore (`session_mode: resume`) and fresh logins (`session_mode: fresh`).

Metadata (no PII): `actor_type`, `actor_id`, `trusted_device_id`, `device_mode`, `platform`, `source`, `session_mode`.

### Activity (`last_active_at`)

Latest **meaningful product interaction**, derived from:

1. Analytics events in `ACTIVITY_ANALYTICS_EVENT_TYPES` (`config/user-observability.js`) with `actor_id`.
2. Child completions: `daily_log_item.completed_at` where `completed = true`.

**Excluded:** token refresh, polling, health checks, background scheduler calls.

### Trusted device

A family-scoped device enrollment (`family_trusted_device`) that can restore parent or child sessions without re-entering credentials. Admin sees label, platform, mode, last seen, last active child profile, active/revoked — never raw tokens or hashes.

### Active user (period KPI)

A distinct `actor_id` (parent or child UUID) with **at least one** of within the period:

- A session-start event (`parent_session_started` / `child_session_started`), or
- A meaningful activity event (analytics allowlist), or
- A child activity completion (`daily_log_item`).

Deduplicated per actor within the period. Session starts are included so cold opens via trusted device count as usage even before first tap.

**Not counted:** refresh-token rotation alone, anonymous/unauthenticated beacons without `actor_id`.

## Why `login_event` is insufficient for usage

Before trusted devices, parent activity correlated with logins. After trusted devices:

- Parents restore sessions daily via cookie without `login_event`.
- Win-back and retention logic still need `login_event` for **authentication** signals.
- Admin “active families” based on logins under-count real usage.

Hence three separate timestamps and admin copy: **Autentisering ≠ aktiv användare**.

## Implementation

| Concern | Location |
|--------|----------|
| Constants | `config/user-observability.js` |
| Session telemetry | `src/lib/session-telemetry.js` |
| Admin aggregates | `db/user-observability.js` |
| Indexes | `migrations/1810300000000_user_observability_indexes.js` |
| Admin UI | `public/admin/admin-families.js`, `public/admin/admin-analytics.js` |

## Privacy

- Analytics metadata: internal UUIDs only; no email, name, tokens, PINs.
- Admin endpoints: `requireAdmin`; not exposed to parent/child clients.

## POS

Backend-only observability; no user-facing product change. Supports ops truth for who uses the app without violating child scope or parent dashboard rules.
