# Stjärndag UI Icons v4 — Nordic Calm

Detta paket är en drop-in-ersättare för v3-navigationen och använder samma filnamn:

- `hem.svg`
- `schema.svg`
- `aktiviteter.svg`
- `beloningar.svg`
- `for-dig.svg`
- `familj.svg`
- `installningar.svg`

## Skillnader mot v3

- Ingen dekorativ stjärnprick på varje ikon
- Unik geometri per destination
- Jämn optisk massa vid 28–30 px
- Tunnare, mjukare och mer produktlik geometri
- Temastyrning genom `--msd-icon` och `--msd-accent`
- Aktivt/inaktivt läge hanteras av CSS
- Ingen gradient, glow eller drop-shadow i själva SVG:n

## Installation

Kopiera:

```text
public/img/stjarnadag-icons-v4/
public/css/stjarnadag-icons-v4.css
```

Exempel:

```html
<a class="msd-bottom-nav__item is-active" aria-current="page">
  <img class="msd-bottom-nav__icon"
       src="/img/stjarnadag-icons-v4/navigation/hem.svg"
       alt="">
  <span>Hem</span>
</a>
```

### Viktigt om externa `<img>`

CSS-variabler går normalt inte igenom dokumentgränsen till en SVG som laddas via `<img>`.
För full temastyrning rekommenderas ett av följande:

1. inline-SVG,
2. SVG sprite med `<use>`,
3. separata aktiva/inaktiva filer,
4. CSS mask.

Paketet innehåller därför också `sprite.svg`, som är rekommenderad för webappen.

```html
<svg class="msd-bottom-nav__icon" aria-hidden="true">
  <use href="/img/stjarnadag-icons-v4/sprite.svg#nav-hem"></use>
</svg>
```

## Rekommenderad navspec

- Ikon: 28 px
- Etikett: 12–13 px
- Touchyta: minst 48×48 px
- Navhöjd: 76–84 px + safe area
- Ingen glow
- Guld reserveras för aktiv status och belöning
