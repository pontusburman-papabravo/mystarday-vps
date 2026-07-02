# Barnbilder (`public/images/child/`)

**Register:** [`docs/child-image-assets.md`](../../../docs/child-image-assets.md) · **Manifest:** [`manifest.json`](./manifest.json)

Kanonisk mapp för illustrerade barnvy-assets (Idag, Min värld, Familj, Skattkammar-rum, dekaler).

## Struktur

```
today/bg@2x.webp
world/hub@2x.webp + hub-{castle,treehouse,space}@2x.webp
world/rooms/{room-id}@2x.webp
family/hall@2x.webp
morgonhus/scene@2x.webp
decals/
```

Runtime: `{namn}@2x.webp`. All CSS pekar på `/images/child/…`.

## Innan du committar

1. Uppdatera `docs/child-image-assets.md` + `manifest.json`.
2. Bump `public/sw.js` + `config/cache-version.json`.
3. `npm run check:css` om CSS ändrats.
