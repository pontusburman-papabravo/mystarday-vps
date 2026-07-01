# Föräldrahubb — Visionmall (låst format)

**Status:** Standardmall (2026-07)  
**Användning:** Alla nya föräldrahubbar ska följa denna struktur. Befintliga hubbar: [parent-hubs-index.md](parent-hubs-index.md).

---

## Obligatoriska sektioner (i denna ordning)

Varje `*-vision.md` ska innehålla:

| # | Sektion | Syfte |
|---|---------|--------|
| 1 | **Kompass** | En mening — känslan användaren ska ha |
| 2 | **Filterregel** | Hub-specifik — vad får finnas här? |
| 3 | **Beslutsregel** | Hub-specifik — hur många primära handlingar? |
| 4 | Varför finns [hub]? | Domänens roll |
| 5 | Problemet vi löser | Jenny-citat + problemtyp |
| 6 | Produktprincip + **Copy-regel** | Vad hubben är/inte är + språkgränser |
| 7 | Framgångskriterium + **Exit Rule** | När är användaren klar? |
| 8 | Den mentala modellen | Flödesdiagram |
| 9 | Tre frågor | Jenny-testfrågor i standardvy |
| 10 | Undantagsdefinition | Om tillämpligt (Hem, Belöningar) |
| 11 | **Priority Ladder** | Objektiv ordning vid konkurrens |
| 12 | Informationshierarki | Implementation av ladder |
| 13 | **Jenny-test** | DoD med målbild |
| 14 | **Success Metrics** | PR-granskningsmått |
| 15 | Vad som ska bort | Anti-patterns |
| 16 | Nuläge vs mål | Kod + kvarstående arbete |

Varje `*-agent-prompt.md` ska innehålla:

| # | Sektion |
|---|---------|
| 1 | Definition of Done (Jenny-test, filterregel, beslutsregel, exit rule, success metrics) |
| 2 | Mandat (vision > kod) |
| 3 | Stop Rule |
| 4 | Scope |
| 5 | Anti-patterns + självgranskning |
| 6 | Kärnregler (tabell) |
| 7 | Teknisk vägledning |
| 8 | Arbetsflöde |
| 9 | Sista instruktionen |

---

## Gemensamma byggstenar per hub

| Byggsten | Hem | Planering | Belöningar | Familj |
|----------|-----|-----------|------------|--------|
| **Filterregel** | Besvara tre frågor om läget | Hitta rätt byggverktyg | Godkänna, hantera, följa belöningar | Hitta, administrera, öppna person |
| **Beslutsregel** | ≤ 1 nästa steg | ≤ 1 ingång per föräldrajobb | ≤ 1 primär handling (godkännande först) | ≤ 1 åtgärd per sektion |
| **Priority Ladder** | Safety → Status → Coach → Handoff → Vecka | Orientering → Bygg → Planera → Paket | Godkännande → Hantera → Följa → Utveckling | Barn → Vuxna → Pedagoger → Familjenivå |
| **Exit Rule** | Vet läget · gjort vuxenbeslut · barn tar över | Vet vilken dörr att gå igenom | Vet väntande · hantera · stjärnor | Vet vem som ingår · kan nå barnprofil |
| **Copy-regel** | Läge | Handlingar | Belöningsläge | Människor |

---

## Mall — kopiera och fyll i

```markdown
# [Hub] 10/10 — Produktvision

## Kompassen

> **[Hub] ska få föräldern att känna: "[känsla]."**

### Filterregel

> **Om en komponent inte hjälper användaren [hub-specifik filter] inom fem sekunder, hör den inte hemma på [Hub].**

### Beslutsregel

> **På [Hub] får det aldrig finnas [hub-specifik beslutsregel].**

## Exit Rule

[Hub] är **färdigt** när föräldern kan säga:
- [kriterium 1]
- [kriterium 2]
- [kriterium 3]

## Priority Ladder

```
1. [Steg 1]
        ↓
2. [Steg 2]
        ...
```

## Success Metrics (PR-granskning)

| Mål | Mått |
|-----|------|
| Jenny [hub-specifikt] | < 5 sek |
| Ingen scroll krävs | Ja |
| Filterregeln | Varje komponent motiverad |
```

---

## PR-granskning — snabbchecklista

För varje hub-PR, verifiera:

- [ ] Filterregeln: kan varje ny komponent motiveras?
- [ ] Beslutsregeln: finns det bara en primär handling där det ska?
- [ ] Priority ladder: inget högre steg nedgraderat av lägre?
- [ ] Exit rule: kan Jenny lämna hubben "klar"?
- [ ] Copy-regel: rätt ton för rätt hub?
- [ ] Jenny-test: tre frågor besvarade utan scroll?
- [ ] Success metrics: tabellen ifylld i PR-beskrivningen

---

*Senast uppdaterad: 2026-07-01*
