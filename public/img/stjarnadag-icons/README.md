# Stjärndag Icon System v1.0

Ett komplett SVG-paket för föräldraläge, gemensamma systemfunktioner och fallback-ikoner i barnläget.

## Innehåll

- **65 separata SVG-filer**
- `manifest.json` med sökvägar och användningsområden
- `stjarnadag-icons.sprite.svg` för SVG-sprite-användning
- Barnens befintliga temaikoner ska fortsatt prioriteras
- `child-fallback/` används bara när valt tema saknar en egen ikon

## Rekommenderad placering

Kopiera mappen till:

```text
public/assets/icons/stjarnadag/
```

## Enkel användning

```html
<img
  src="/assets/icons/stjarnadag/parent/extra-stjarnor.svg"
  width="32"
  height="32"
  alt=""
  aria-hidden="true"
/>
```

## CSS

```css
.app-icon {
  width: 2rem;
  height: 2rem;
  object-fit: contain;
  flex: 0 0 auto;
}

.app-icon--large {
  width: 3.5rem;
  height: 3.5rem;
}
```

## Regel för barnläget

1. Försök ladda ikon från barnets valda tema.
2. Finns ingen temavariant, använd motsvarande ikon i `child-fallback/`.
3. Använd aldrig föräldraikoner som temagrafik i barnläget.

## Dynamiskt innehåll

Badge, antal stjärnor och statusvärden ska ritas i HTML/CSS och inte bakas in i SVG-filen.

## Cursor-instruktion

Kopiera ZIP-filen till projektet och be Cursor:

> Packa upp Stjärndag Icon System under `public/assets/icons/stjarnadag`. Inventera befintliga ikonreferenser i HTML, JavaScript och CSS. Ersätt föräldra- och systemikoner med motsvarande filer från manifest.json. Behåll befintliga temabaserade barnikoner och använd `child-fallback` endast när temat saknar ikon. Rita badges och antal dynamiskt i koden. Gör ändringarna stegvis och kör befintliga tester efteråt.
