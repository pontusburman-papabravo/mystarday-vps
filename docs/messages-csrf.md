# System messages — CSRF client contract

## Endpoints

| Method | Path | Auth | CSRF (target) |
|--------|------|------|----------------|
| GET | `/api/messages/unread` | Parent session | Not required (safe method) |
| PUT | `/api/messages/:id/read` | Parent session | **Required** (after D4) |

## How the client sends CSRF today

### Login / refresh

1. `POST /api/auth/login` (or `/refresh`) calls `generateCsrfToken(res)`.
2. Server sets readable cookie `csrf_token` and returns `csrfToken` in JSON.
3. `public/js/auth.js` stores token in `localStorage` (`stjarndag_csrf`) and reads `csrf_token` cookie as source of truth.

### Dashboard system message dismiss

`public/js/dashboard-system-messages.js` → `dismissSystemMessage()`:

```js
await fetch('/api/messages/' + id + '/read', {
  method: 'PUT',
  credentials: 'include',
  headers: {
    'X-CSRF-Token': document.cookie.match(/csrf_token=([^;]+)/)?.[1] || '',
  },
});
```

This matches the double-submit pattern in `src/middleware/csrf.js`: header must equal `csrf_token` cookie.

### Other API calls

Most authenticated mutations use `Auth.getCsrfToken()` via `Auth.api()` or explicit `X-CSRF-Token` headers (see `public/js/auth.js`).

## Server middleware

- `src/middleware/csrf.js` — `csrfProtect` mounted on `/api` in `app.js`.
- **Pre-D4:** `/messages/` is in `CSRF_EXEMPT_PREFIXES` (historical exemption).
- **D4:** remove `/messages/` from exemptions so PUT requires token like other state-changing routes.

## Integration test

`test/messages-read-csrf-integration.test.js` covers:

- Full unread → mark-read → unread-empty flow (with valid CSRF).
- CSRF negative cases (403 `CSRF_MISSING` / `CSRF_INVALID`) — active after D4 removes exemption.
- Static check that dashboard client includes `X-CSRF-Token` on dismiss.
