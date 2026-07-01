# Barnbilder (`public/images/child/`)

Kanonisk mapp för illustrerade barnvy-assets. **Register och mapping:** [`docs/child-image-assets.md`](../../../docs/child-image-assets.md).

## Struktur

```
today/          Idag
world/          Min värld (hub + rooms/)
family/         Mina personer
morgonhus/      Morgonhuset
```

## Filnamn

Runtime: `{namn}@2x.webp` (t.ex. `bg@2x.webp`, `rooms/chest@2x.webp`).

Källexport enligt Art Bible får ha längre namn utanför `public/`; döp om vid commit enligt registret.

## Innan du committar

1. Uppdatera rad i `docs/child-image-assets.md` (status → `godkänd` eller `behöver iteration`).
2. Bump `public/sw.js` när assets ska precachas.
3. Koppla in `url()` / `<picture>` i relevant CSS/JS — minimal diff.
