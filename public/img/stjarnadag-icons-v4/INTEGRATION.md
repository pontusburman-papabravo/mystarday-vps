# Förslag till integration

## Minsta ändring

Byt sökvägar från:

```text
/img/stjarnadag-icons/navigation/
```

till:

```text
/img/stjarnadag-icons-v4/navigation-inactive/
```

För aktiva objekt används:

```text
/img/stjarnadag-icons-v4/navigation-active/
```

Detta fungerar direkt med `<img>` utan inline-SVG.

## Rekommenderad ändring

Använd `sprite.svg` och inline `<svg><use></use></svg>`. Då kan ikonerna
färgsättas med CSS-variabler och ni slipper dubbla HTTP-assets.

## Mappning

- Hem → `hem`
- Planering → `schema`
- Belöningar → `beloningar`
- För dig → `for-dig`
- Familj → `familj`

`aktiviteter` och `installningar` ingår för andra navigationsvarianter.
