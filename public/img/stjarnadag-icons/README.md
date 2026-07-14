# Stjärndag Premium Icon System v2

65 transparenta SVG-ikoner omgjorda för Stjärndags mörka gränssnitt.

## Det som är nytt

- Ingen vit ruta eller inbakad knappbakgrund
- Kraftigare symboler som syns tydligt på mobil
- Lila, blå och guldiga duotoner med diskret glow
- Samma stil för toppmeny, snabbåtgärder och bottennavigation
- Inga inbakade notissiffror eller antal stjärnor
- Befintliga temaikoner i barnläget ska fortsatt prioriteras

## Rekommenderade storlekar

- Bottennavigation: 28–32 px
- Toppmeny: 26–30 px
- Snabbåtgärder: 38–44 px
- Stora illustrationer: 56–72 px

## Viktig CSS-regel

Lägg inte ikonerna i en helvit ruta. Använd transparent bakgrund eller en mycket diskret glasyta.

```css
.sd-icon {
  width: 2rem;
  height: 2rem;
  display: block;
}

.sd-icon--action {
  width: 2.625rem;
  height: 2.625rem;
}

.sd-icon-button {
  display: grid;
  place-items: center;
  border: 0;
  background: transparent;
}
```

## Prompt till Cursor

Packa upp mappen under `public/assets/icons/stjarnadag`. Läs `manifest.json` och ersätt nuvarande föräldra-, navigations- och systemikoner med motsvarande SVG. Ta bort vita ikonrutor där de bara används som ikonbakgrund. Behåll barnets befintliga temabaserade ikoner och använd `child-fallback` endast där temat saknar en variant. Låt notisbadge och antal stjärnor vara dynamiska HTML/CSS-element.
