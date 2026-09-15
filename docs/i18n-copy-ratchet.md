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

Tags with `data-i18n*` may keep Swedish inner text / attributes in this PR (current fallback contract).

**Remove or tighten this exception in the fallback-contract PR.** After that PR, Swedish remaining in `data-i18n` DOM is a leak.

## Escape hatch

One hit, same line or previous line:

```js
showToast('debug only'); // i18n-ignore: internal diagnostic toast, not shown to families
```

`reason` is required. No directory wildcards.

## Shrinking debt

When a surface is migrated, rerun `npm run audit:i18n:write-baseline` (no `--force-raise`). Count must not increase. New hits require `--force-raise` plus a PR note.

## Runtime fallback (unchanged)

Still known debt, later PR:

- `getLocale('en-GB')` merges missing keys from `sv-SE`
- `data-i18n` can leave Swedish DOM copy
- `tx(key, 'Avbryt')` Swedish helper fallback
- `fi-FI` aliases to `sv-SE`
