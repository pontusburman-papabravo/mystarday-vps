# 14 — Accessibility

**Product Bible — Kapitel 14**  
**Version:** 1.0  
**Status:** Normerande


---

## 14.1 Syfte

Tillgänglighet är en del av **låg kognitiv belastning** — inte en separat checklista i slutet av projektet.

## 14.2 Principer

1. **Tydlighet före dekoration** — läsbar text, kontrast, fokusordning
2. **Ett steg i taget** — särskilt barn och NPF-målgrupp; TEACCH-läge som förstärkare
3. **Flera sätt att förstå** — ikon + text + ev. ljud; aldrig bara färg som signal
4. **Motor, inte bara pixel** — skärmläsare, tangentbord, reduced motion
5. **Stress är en accessbarriär** — stressig UX är otillgänglig UX

## 14.3 Åldersprofiler

| Profil | Särskilt fokus |
|--------|----------------|
| Barn 4–12 | Stora touchytor, få val, förutsägbar struktur |
| Förälder | Överblick utan överbelastning |
| Ungdom/vuxen (horisont) | Respektfull densitet, inget infantilt tvång |

## 14.4 Konkreta krav (Gen 1)

- Parental gate och PIN ska vara användbara med tangentbord där plattformen tillåter
- `prefers-reduced-motion` ska respekteras för celebration-animationer
- Fokusindikatorer ska synas i modaler och nav
- Barnvy: kritiska flöden (Idag, avbockning) ska fungera utan precision på små mål

**Operativ spec:** [`barnmeny-v2.md`](../barnmeny-v2.md) (a11y-sektioner) · [`vuxenmeny-v2-operations-checklist.md`](../vuxenmeny-v2-operations-checklist.md)

## 14.5 Roadmap

| Version | Innehåll |
|---------|----------|
| v1.0 | Principer + Gen 1-minimum |
| v2.0 | WCAG 2.2 AA-mål per Presentation Profile |
| v3.0 | Tillgänglighet i varje UC acceptance criteria |
