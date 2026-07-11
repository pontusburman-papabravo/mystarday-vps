# Barnets samling — theme design references

Design reference sheets for per-child visual themes (presentation only).

## Theme slugs (runtime)

| Slug | Swedish label |
|------|---------------|
| `space` | Rymd |
| `dinosaurs` | Dinosaurier |
| `cars` | Bilar |
| `dolls` | Dockor |
| `airplanes` | Flygplan |
| `animals` | Djur |
| `fantasy` | Fantasi (default fallback) |

## Reference files (inspiration only — not runtime)

Place combined reference PNGs here:

```
docs/design/barnets-samling-themes/
  space-reference.png
  dinosaurs-reference.png
  cars-reference.png
  dolls-reference.png
  airplanes-reference.png
  animals-reference.png
  fantasy-reference.png
```

Do **not** use these combined sheets as runtime UI. Separate WebP asset files only.

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
| `public/js/child-theme.js` | Theme config, fallback, `data-child-theme` |
| `public/css/child-themes.css` | Per-theme CSS variables + gradient scenes |

## Fallback

```js
theme = child.visual_theme || child.child_view_config?.visual_theme || 'fantasy'
```

Unknown values → `fantasy`. Legacy `house_config.theme` is **ignored** when `barnets_samling` gate is ON.

## Follow-up (not PR 1)

- PR 2: `background@2x.webp` for fantasy, space, animals
- PR 3: Tab icon WebP assets
- PR 4: Per-flik presentation polish (dagstavla, samlingsrum, skattkammare, familjevägg)
- Parent settings UI + optional `child_view_config.visual_theme` write path
