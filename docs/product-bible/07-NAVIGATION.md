# 07 — Navigation

**Product Bible — Kapitel 7**  
**Version:** 1.0  
**Status:** Normerande


---

## 7.1 Syfte

Navigationskapitlet definierar **var användaren hittar svar på sina frågor** — inte var systemets moduler råkar ligga.

**Grundregel:** Intent före feature. Navigation svarar på användarens fråga, inte systemets modulnamn.

## 7.2 Plattformsprincip

Samma Core Platform — olika navigationsytor per Presentation Profile:

| Profil | Primär fråga | Navigationsmodell (Gen 1) |
|--------|--------------|----------------------------|
| Barn | Vad gör jag nu? | Tre världar: Idag · Min värld · Familj |
| Förälder | Hur får vi vardagen att fungera? | Fem flikar: Hem · Planering · Belöningar · För dig · Familj |
| Pedagog | Hur stöttar jag professionellt? | Befintliga pedagogytor + delade rapporter |
| Ungdom (horisont) | Hur får jag kontroll utan att bli styrd? | Idag · mål · coach |
| Vuxen (horisont) | Hur håller jag vardagen? | tasks · mål · progress |

## 7.3 Barn — tre världar

Barnets navigation ska aldrig kräva att barnet förstår veckoplanering.

| Värld | Användarens fråga | Innehåll |
|-------|-------------------|----------|
| **Idag** | Vad gör jag nu? | NU / NÄSTA / SEN, avbockning, coach |
| **Min värld** | Vad har jag byggt? | Stjärnor, belöningar, samlingar |
| **Familj** | Vem finns här? | Familjemedlemmar, enkel kontext |

**Detaljspec:** [`barnmeny-v2.md`](../barnmeny-v2.md) · [`informationsarkitektur-barnapp.md`](../informationsarkitektur-barnapp.md)

## 7.4 Förälder — fem flikar (Parent Intent)

| Flik | Parent Intent | Hub-route |
|------|---------------|-----------|
| Hem | Här är läget | `/dashboard` |
| Planering | Jag vill planera | `/planning` |
| Belöningar | Stjärnor och belöningar | `/rewards` |
| För dig | Vad rekommenderas | `/for-dig` |
| Familj | Vår familj | `/family` |

**Regler:**

- Ingen **Mer**- eller **Extra**-flik i produktion
- Inställningar i avatar — inte i bottennav
- Nya features läggs i rätt domän — skapar inte ny flik utan stark produktorsak

**Detaljspec:** [`vuxenmeny-v2.md`](../vuxenmeny-v2.md)

## 7.5 Navigationskonstitution

1. **Ett tydligt "nu"** ska alltid vara högst ett tryck bort
2. **Trygghetslager före upptäckarlager** — kärnflöden får inte gömmas i sidomenyer
3. **Samma känsloregler** i barn- och föräldernav vid misslyckande eller avbrott
4. **Presentation får ändra etiketter och antal flikar** — inte motorernas ansvar
5. **TEACCH och liknande stöd** ändrar upplevelse (overlay) — aldrig informationsarkitekturen

## 7.6 Framtida profiler

Vid övergång barn → ungdom → vuxen:

- Motor och historik är stabila
- Navigation, språk och gamification-nivå förändras
- Användaren ska inte behöva "lära om appen" emotionellt — bara presentationen

Se [15 — Future Products](./15-FUTURE-PRODUCTS.md).

## 7.7 Leverans & QA

Platform v1 (App v2) acceptance: [`APP-V2-KRAVSPEC.md`](../APP-V2-KRAVSPEC.md) §12 Navigation.

| Kontroll | Krav |
|----------|------|
| Förälder | En `PRIMARY_NAV`, fem flikar, alla plattformar |
| Barn | En `CHILD_WORLDS`, tre världar, alla plattformar |
| Regression | Inga parallella magic/classic-nav-split i produktion |
