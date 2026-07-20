# Nordic Calm Design Kit

Ett appklart designsystem i stilen **Nordic Calm Icons**, baserat på den senaste godkända riktningen.

## Innehåll
- **400 SVG-ikoner**, light + dark
- PNG-exporter i **24, 32, 48, 64 och 128 px** (inkluderade)
- **50 SVG-illustrationer**, light + dark
- **20 Lottie JSON**-mallar för lugna mikroanimationer
- Design tokens för färger, grid, radier, skuggor och motion
- Manifest för sökning och dynamisk laddning
- Exempel för webb och Expo/React Native

## Visuella regler
- 64×64 canvas, 48×48 safe area, 4 px grid
- Frontalt perspektiv
- Organisk, rundad geometri
- Dämpad salvia, terrakotta, dimblå, sand och petrol
- En standardiserad skugga: 8 % opacity, 12 px blur, 3 px Y-offset
- Ingen återkommande stjärna i ikonerna; belöningsstjärnan används separat
- Animationer 500–800 ms, utan bounce eller overshoot

## Integration i nuvarande repo
Kopiera mappen till exempelvis:

```text
public/assets/min-stjarndag-design-kit/
```

SVG kan därefter användas direkt:

```html
<img src="/assets/min-stjarndag-design-kit/icons/svg/light/borsta-tanderna.svg"
     width="64" height="64" alt="Borsta tänderna">
```

## Expo / React Native
Installera vid behov:

```bash
npx expo install react-native-svg
```

Använd SVG-filerna med en SVG-transformer eller PNG-exporterna genom `Image`.
Se `react-native/appIcon.tsx`.

## Licens
Skapad specifikt som ett designunderlag för produkten. Kontrollera och finjustera
SVG-geometri i Figma före slutlig produktionslansering.

## I detta repo

Installerad under `public/assets/min-stjarndag-design-kit/` (SVG light/dark, illustrationer, Lottie, tokens).
PNG-exporter (17 MB) utelämnas — webb använder SVG.

- Aktivitets-/bildstödsikoner: `config/pictogram-library.js` mappar varje `icon_key` → kit-SVG.
- UI-chrome (bottennav m.m.): behåller `public/img/stjarnadag-icons/` (high-contrast v3) tills kit-UI-geometri är Figma-godkänd.
- Förhandsvisning: öppna `preview/index.html` lokalt.
