# Icon Design Specification v1.0

## Grid
- Canvas: 64×64
- Safe area: 48×48
- Base unit: 4 px

## Form
- Frontalt perspektiv
- Inga outlines som standard
- Hörnradier: 4 / 6 / 8 px
- Minsta detalj: 2 px vid 64 px

## Färg
- Kategorier använder diskreta tonförskjutningar
- Light och dark har separata optiskt justerade kulörer
- Belöningsstjärna ingår inte i grundikonen

## Rörelse
- 500–800 ms
- Cubic bezier (0.4, 0, 0.2, 1)
- Max 3° rotation eller 5 % skala
- Ingen bounce, overshoot eller kontinuerlig rörelse
