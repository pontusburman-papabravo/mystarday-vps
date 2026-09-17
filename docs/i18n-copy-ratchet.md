# i18n copy ratchet (PR 0)

Locks existing hardcoded user-copy debt. **Does not migrate product copy and does not change runtime fallback.**

## Commands

| Script | Purpose |
|--------|---------|
| `npm run audit:i18n` | High-signal copy ratchet vs `config/i18n-copy-ratchet-baseline.json` |
| `npm run audit:i18n:ratchet` | Same as `audit:i18n` |
| `npm run audit:i18n:write-baseline` | Rewrite baseline if count does not grow |
| `npm run audit:i18n:strict` | Legacy åäö scan of i18n infrastructure files (0 hits) |
| `npm run test:i18n:parity` | Fragment domain registration + key parity |

CI: `test:gate` includes the ratchet test plus fragment/widget guards.

## What the ratchet scans

`public/**/*.html`, `public/js/**/*.js`, `public/**/*.svg`, `src/routes/**/*.js`, `src/lib/**/*.js`

Signals: `showToast`, `textContent`/`innerText`/`innerHTML`, `confirm`/`alert`, placeholders, aria-label, title, SVG title/desc, helper fallback args (`tx`/`localizedOr`), `|| '…'` fallbacks, server `error`/`message`/`userMessage`, `throw new Error('…')`, static HTML text.

Swedish diacritics **or** the locked word list (Avbryt, Spara, Laddar, …).

## Exclusions (explicit)

- `docs/**`, `test/**`, `config/i18n/**`, `src/locales/**`, `migrations/**`
- `src/routes/admin/**`, `public/admin/**`
- SEO/legal/marketing HTML listed in `scripts/lib/i18n-copy-ratchet.js` `EXCLUDED_FILES`
- Brand proper nouns: `BRAND_RE` in `scripts/lib/i18n-copy-ratchet.js` (product name + English brand + short Swedish brand). <!-- pragma: allowlist secret -->

## data-i18n HTML

Tags with `data-i18n*` may keep Swedish inner text as **pre-JS placeholders**. For a non-Swedish locale, `I18n.apply()` always overwrites those placeholders (translation or key). `html[data-i18n-pending]` hides the nodes until apply so Swedish copy is not shown. Runtime locale payloads do not merge `sv-SE` into non-Swedish.

## Escape hatch

One hit, same line or previous line:

```js
showToast('debug only'); // i18n-ignore: internal diagnostic toast, not shown to families
```

`reason` is required. No directory wildcards.

## Shrinking debt

When a surface is migrated, rerun `npm run audit:i18n:write-baseline` (no `--force-raise`). Count must not increase. New hits require `--force-raise` plus a PR note.

## Runtime fallback

Contract:

- Requested locale first
- Then explicit canonical fallback `en-GB`
- Then missing-key handling (return the key)
- `getLocale('en-GB')` does **not** merge `sv-SE`
- Client `I18n.load('en-GB')` never fetches `/api/i18n/sv-SE` as a silent fallback
- `fi` / `fi-FI` are unsupported tags (`normalizeLocale` → `null`), not aliases of `sv-SE`. FI as a **country** still defaults to `sv-SE` via `COUNTRY_DEFAULTS`.
- Non-Swedish `data-i18n*` always overwrites Swedish HTML placeholders (key if missing). `html[data-i18n-pending]` hides those nodes until `apply()`.
- `I18n.literalFallback` / `tOrLiteral` (and helpers that call them) use a Swedish literal only when the active locale is Swedish.
