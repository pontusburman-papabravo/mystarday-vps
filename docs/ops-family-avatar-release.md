# Family Avatar v1 — release & ops checklist

**ADR:** [ADR-016-family-avatar-storage.md](./adr/ADR-016-family-avatar-storage.md)  
**PR:** Family Avatar v1

## Release-notering (migration)

- Migration `1810000000000` kopierar legacy `avatar_url` → `avatar_storage_key` där nyckeln kan härledas, sedan **nullar `avatar_url`**.
- Klienter får endast `has_avatar` + `/api/avatars/...` — inga publika CDN-URL:er.
- Om en legacy-URL inte kunde mappas försvinner bilden tills användaren laddar upp igen via v1-flödet. Detta är avsiktligt (ingen permanent publik länk).

## Releasevillkor — R2 / lagring (obligatoriskt före prod)

Kör mot **verklig** R2-konfiguration (inte bara lokal disk):

```bash
./scripts/verify-avatar-storage-privacy.sh
```

Eller manuellt:

1. **Bucket policy** — `avatars/` och `avatars-private/` ska **inte** vara publikt läsbara (ingen anonymous `GetObject`).
2. **Legacy publika objekt** — testa en känd tidigare `https://…r2.dev/avatars/…` URL utan auth → ska ge 403/404 från R2, inte bilddata.
3. **App-proxy** — `GET /api/avatars/child/:id` utan session-cookie → **404** (inte 401/403).
4. **Cross-family** — förälder familj B mot barn familj A → **404**.
5. **Efter DELETE avatar** — samma session, samma URL → **404**; `has_avatar: false` i JSON.

## Cache / revoke (verifierat i kod + test)

- `Cache-Control: private, no-cache, must-revalidate` + `Vary: Cookie`
- Authz körs **före** 304 Not Modified
- Återkallad pedagog-/föräldralänk → 404 på nästa request (ingen `max-age` som serverar cachad kropp utan omvalidering)

## Livscykel — filradering

| Händelse | Implementation |
|----------|----------------|
| Explicit `DELETE` avatar | `clearChildAvatar` / `clearParentAvatar` |
| Barn raderas | `deleteAvatarForChildRecord` i `children.js` + `family/members.js` |
| Vuxen tas bort från familj | `deleteAvatarForParentRecord` i `family/members.js` |
| Hel familj raderas | `deleteAvatarsForFamily` i `family/account.js` |

## Uppladdningsvalidering (server)

- Multer max 2 MB
- Magic-byte MIME (ej trust declared type alone)
- `sharp` med `limitInputPixels`, max kant 2048 px, JPEG re-encode
- SVG / text MIME blockeras

## Manuell a11y-smoke (beskärning)

- [ ] Tab cyklar Avbryt ↔ Zoom ↔ Spara i modalen
- [ ] Escape stänger och återställer fokus
- [ ] Avbryt och Spara har begripliga etiketter
- [ ] Borttagning av befintlig bild fungerar i barnredigering + Inställningar
