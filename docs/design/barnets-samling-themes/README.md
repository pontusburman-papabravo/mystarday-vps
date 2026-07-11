# Barnets samling — theme design references

Design reference sheets for per-child visual themes (presentation only).

**Visual language (all themes):** lekvärld, rörelse, föremål och miljöer — inte gulliga maskotar eller bebisillustrationer.

## Canonical theme slugs (runtime)

| Slug | Swedish label | Visual direction |
|------|---------------|------------------|
| `adventure` | Äventyr | kartor, stigar, märken, gömda platser |
| `space` | Rymd | planeter, raketspår, kontrollpanel |
| `dinosaurs` | Dinosaurier | fossil, fotspår, djungel, utgrävning |
| `vehicles` | Fordon | banor, hjul, ramper, vägmarkeringar |
| `animals` | Vilda djur | spår, habitat, safari, natur |
| `ocean` | Havet | undervattensvärld, vågor, ubåt, koraller |
| `sports` | Sport | planer, mål, koner, resultattavla |
| `builders` | Bygg & skapa | klossar, kugghjul, ritningar, verktyg |
| `music` | Musik & rytm | instrument, beats, ljudvågor, scen |
| `arcade` | Spelhall | banor, nivåer, pixelformer, power-ups |

**Default fallback:** `adventure`

**Remote branch:** `cursor/child-theme-shell-37d3` — 10 canonical themes + `THEME_ALIASES` (CSS/emoji only in PR 1).

## Temporary aliases (normalize before apply)

| Alias | Resolves to |
|-------|-------------|
| `fantasy` | `adventure` |
| `cars` | `vehicles` |
| `airplanes` | `vehicles` |
| `dolls` | `builders` |

Unknown values (e.g. `castle`) → `adventure`.

## Reference files (inspiration only — not runtime)

```
docs/design/barnets-samling-themes/
  adventure-reference.png
  space-reference.png
  dinosaurs-reference.png
  vehicles-reference.png
  animals-reference.png
  ocean-reference.png
  sports-reference.png
  builders-reference.png
  music-reference.png
  arcade-reference.png
```

Do **not** use combined reference sheets as runtime UI. Separate WebP asset files only.

## Runtime assets (WebP)

```
public/images/child/themes/<theme>/
  background@2x.webp
  icon-today@2x.webp
  icon-collection@2x.webp
  icon-treasure@2x.webp
  icon-family@2x.webp
```

- WebP @2x, target &lt;150 KB per background
- Bump `public/sw.js` + `config/cache-version.json` when committing binaries

## Code

| File | Role |
|------|------|
| `public/js/child-theme.js` | Theme config, aliases, fallback, `data-child-theme` |
| `public/css/child-themes.css` | Per-theme CSS variables + gradient scenes |

## Fallback

```js
theme = normalizeThemeId(
  child.visual_theme || child.child_view_config?.visual_theme || 'adventure'
)
```

Legacy `house_config.theme` is **ignored** when `barnets_samling` gate is ON.

## Follow-up (not PR 1)

- ~~PR 2: `background@2x.webp` for all ten themes~~ (done on `cursor/child-theme-shell-37d3`)
- PR 3: Tab icon WebP assets (40 themed tab icons)
- PR 4: Per-flik presentation polish
- Parent settings UI + optional `child_view_config.visual_theme` write path
