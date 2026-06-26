#!/usr/bin/env python3
"""Build product-bible chapters 06-15 from PBS volumes."""

from pathlib import Path

DOCS = Path(__file__).resolve().parent.parent / "docs"
PB = DOCS / "product-bible"
PBS = DOCS / "pbs"


def lines(path: Path, start: int, end: int | None = None) -> str:
    text = path.read_text(encoding="utf-8").splitlines()
    end = end or len(text)
    return "\n".join(text[start - 1 : end]) + "\n"


def demote_headers(body: str, levels: int = 1) -> str:
    out = []
    for line in body.splitlines():
        if line.startswith("#"):
            out.append("#" * levels + line)
        else:
            out.append(line)
    return "\n".join(out) + "\n"


def strip_volume_preamble(body: str) -> str:
    """Remove PBS volume title block before first DEL section."""
    parts = body.split("\n")
    start = 0
    for i, line in enumerate(parts):
        if line.startswith("# DEL "):
            start = i
            break
    return "\n".join(parts[start:]) + "\n"


def write_chapter(num: int, slug: str, title: str, body: str, intro: str = "") -> None:
    header = f"""# {num:02d} — {title}

**Product Bible — Kapitel {num}**  
**Version:** 1.0  
**Status:** Normerande

{intro}
---

"""
    (PB / f"{num:02d}-{slug}.md").write_text(header + body.strip() + "\n", encoding="utf-8")


def fix_existing_chapter(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    for artifact in ("– FILOSOFI\n", "– DOMÄNMODELL\n", "– ROLLER\n", "– PRODUKTKONSTITUTION\n"):
        text = text.replace(artifact, "")
    lines_out = []
    for line in text.splitlines():
        if line.startswith("# DEL "):
            continue  # drop PBS volume section headers inside chapters
        lines_out.append(line)
    path.write_text("\n".join(lines_out) + "\n", encoding="utf-8")


def main() -> None:
    PB.mkdir(parents=True, exist_ok=True)

    for p in sorted(PB.glob("0*.md")):
        fix_existing_chapter(p)

    vol01 = PBS / "VOL-01-VISION.md"
    vol04 = PBS / "VOL-04-COACH-BIBLE.md"
    vol05 = PBS / "VOL-05-MOTIVATION-EMOTION-KONSTITUTION.md"

    # 06 — Experience Principles (product + coach + motivation principles)
    exp = lines(vol01, 58, 98) + "\n" + lines(vol01, 137, 196)
    write_chapter(
        6,
        "EXPERIENCE-PRINCIPLES",
        "Experience Principles",
        exp,
        intro="> Hur produkten ska *kännas* i mötet med användaren — oavsett ålder och presentation.",
    )

    # 07 — Navigation
    nav = """## 7.1 Syfte

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
"""
    write_chapter(7, "NAVIGATION", "Navigation", nav)

    # 08 — Design Language
    design = lines(vol01, 100, 136) + "\n" + strip_volume_preamble(lines(vol05, 250, 397))
    write_chapter(
        8,
        "DESIGN-LANGUAGE",
        "Design Language",
        design,
        intro="> Visuellt språk, rörelse, färg och emotionell design — hur känslan blir konkret.",
    )

    # 09 — Motivation Engine
    motivation = strip_volume_preamble(lines(vol05, 11, 248))
    write_chapter(
        9,
        "MOTIVATION-ENGINE",
        "Motivation Engine",
        motivation,
        intro="> Hur produkten förstärker handling, bygger vanor och gör progress begriplig.",
    )

    # 10 — Coach Bible
    coach = strip_volume_preamble(lines(vol04, 11))
    write_chapter(
        10,
        "COACH-BIBLE",
        "Coach Bible",
        coach,
        intro="> AI-coachens tänkande, språk, tystnad och eskalering — teknikval får ändras, beteendet inte.",
    )

    # 11 — Core Platform (summary + pointer)
    platform = """## 11.1 Syfte

Detta kapitel är **produktperspektivet** på Core Platform. Teknisk arkitektur, engines och API-mappning finns i [`architecture-platform.md`](../architecture-platform.md).

## 11.2 En rad som styr allt

> **Samma motor, olika upplevelser.**

Beslutsgate för varje produktändring:

> *Kan samma motor presenteras för en 24-åring med ADHD utan arkitekturomskrivning?*

| Svar | Betydelse |
|------|-----------|
| Ja | Plattform — bygg vidare |
| Nej | Barnapp-skuld — ompröva |

## 11.3 Två lager

```text
┌─────────────────────────────────────────┐
│           CORE PLATFORM (Layer 1)        │
│  Identity · Tasks · Goals · Rewards      │
│  Progress · Habits · Relationships       │
│  Timeline · Coach · Notifications        │
│  Analytics · Permissions                 │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│        PRESENTATION LAYER (Layer 2)      │
│  Navigation · språk · färger · animation │
│  CHILD · TEEN · YOUNG_ADULT · ADULT     │
└─────────────────────────────────────────┘
```

**Regel:** Presentation får aldrig äga affärslogik.

## 11.4 Engines (översikt)

| Engine | Produktansvar |
|--------|---------------|
| **Task** | Planera, schemalägga, slutföra uppgifter |
| **Goal** | Riktning över dagar och veckor |
| **Reward** | Poäng, inlösen, unlocks |
| **Progress** | Streaks, historik, synlig rörelse |
| **Habit** | Återkommande mönster |
| **Relationship** | Familj, roller, inbjudan, stödpersoner |
| **Timeline** | NU / NÄSTA / SEN |
| **Coach** | Nästa steg, omplanering, lugn återstart |
| **Notification** | Push, påminnelser |
| **Permission** | Roller, integritet, parental gate |
| **Identity** | Person, konto, session |

## 11.5 Kärnloopen

```text
Planera → Starta → Genomföra → Bekräfta → Feedback → Reflektera → Förbättra → Upprepa
```

Varje engine ska kunna kopplas till minst ett steg i loopen.

## 11.6 Generationer

| Generation | Målgrupp | Status |
|------------|----------|--------|
| Gen 1 | Barn 4–12 + föräldrar + pedagoger | Live |
| Gen 2 | Ungdomar 13–17 | Horisont |
| Gen 3 | Unga vuxna 18–30 | Horisont |
| Gen 4 | Vuxna | Horisont |

App v2 = **Platform v1** — navigation och IA-refaktor, samma backend.

**Full spec:** [`architecture-platform.md`](../architecture-platform.md) · leverans: [`APP-V2-KRAVSPEC.md`](../APP-V2-KRAVSPEC.md)
"""
    write_chapter(11, "CORE-PLATFORM", "Core Platform", platform)

    # 12 — Product Behavior Specification
    pbs = """## 12.1 Vad PBS är

Product Behavior Specification beskriver **hur produkten ska bete sig** — inte hur koden är implementerad.

Vid konflikt om beteende, ton, ansvar eller känsla **vinner PBS** över kravspec och teknisk arkitektur.

## 12.2 Struktur

| Del | Plats |
|-----|-------|
| Vision, filosofi, konstitution | Kapitel 01–03 i detta bibliotek |
| Domän & roller | Kapitel 04–05 |
| Upplevelse & design | Kapitel 06–08 |
| Motivation & coach | Kapitel 09–10 |
| Plattform | Kapitel 11 |
| **Use cases (hjärtat)** | [`use-cases/`](../use-cases/) |
| Failure design | §12.4 nedan |
| Analytics & a11y | Kapitel 13–14 |

## 12.3 Use cases

**Mål:** 100–120 use cases à 3–8 sidor (≈400–600 sidor totalt).

| Status | Omfattning |
|--------|------------|
| **v1.0** | 8 fulla UC + katalog UC001–UC060 |
| **v1.1** | UC009–UC030 fulla |
| **v1.2** | UC031–UC060 fulla |
| **v2.0** | UC061–UC120 + coach copy library + QA checklist |

- **Mall:** [`use-cases/UC-TEMPLATE.md`](../use-cases/UC-TEMPLATE.md)
- **Katalog:** [`use-cases/UC-CATALOG.md`](../use-cases/UC-CATALOG.md)
- **Arkiv (monolit):** [`pbs/VOL-03-USE-CASES.md`](../pbs/VOL-03-USE-CASES.md)

### Fulla use cases (v1.0)

| ID | Fil |
|----|-----|
| UC001 | [`UC001-skapa-konto.md`](../use-cases/UC001-skapa-konto.md) |
| UC003 | [`UC003-skapa-forsta-barnet.md`](../use-cases/UC003-skapa-forsta-barnet.md) |
| UC004 | [`UC004-bygga-schema-planera-dag.md`](../use-cases/UC004-bygga-schema-planera-dag.md) |
| UC007 | [`UC007-starta-aktivitet.md`](../use-cases/UC007-starta-aktivitet.md) |
| UC008 | [`UC008-slutfora-aktivitet.md`](../use-cases/UC008-slutfora-aktivitet.md) |
| UC009 | [`UC009-hoppa-over-aktivitet.md`](../use-cases/UC009-hoppa-over-aktivitet.md) |
| UC014 | [`UC014-coach-interagerar.md`](../use-cases/UC014-coach-interagerar.md) |
| UC030 | [`UC030-aterstart-efter-misslyckande.md`](../use-cases/UC030-aterstart-efter-misslyckande.md) |

## 12.4 Failure design (sammanfattning)

Failure är inte identitet. Produkten skiljer:

| Typ | Produktens svar |
|-----|-----------------|
| Skip | Legitim väg — ingen skuld |
| Glömt | Mjuk återstart, ett steg |
| Tappad motivation | Coachen tyst eller lugn — aldrig skam |
| Vecka/månad borta | Låg tröskel tillbaka — ingen "nystart från noll" emotionellt |
| Bruten streak | Historik sanningsenlig — streak är verktyg, inte identitet |

**Full spec:** [`pbs/VOL-05`](../pbs/VOL-05-MOTIVATION-EMOTION-KONSTITUTION.md) Del 8.

## 12.5 Regel för nya use cases

1. Lägg till rad i UC-katalogen
2. Skriv UC i **full mall** (3–8 sidor)
3. Testa mot [03 — Constitution](./03-PRODUCT-CONSTITUTION.md)
4. Testa beslutsgate: *Kan samma motor presenteras för ungdom/vuxen utan omskrivning?*

## 12.6 Den gyllene regeln

> Produkten får aldrig få användaren att känna sig misslyckad som människa. Den ska alltid hjälpa till nästa lilla steg.
"""
    write_chapter(12, "PRODUCT-BEHAVIOR-SPEC", "Product Behavior Specification", pbs)

    # 13 — Analytics
    analytics = """## 13.1 Syfte

Analytics ska mäta **om produkten hjälper människor att lyckas med vardagen** — inte maximera skärmtid eller skuldinducerande engagement.

## 13.2 Principer

1. **Handling före appnärvaro** — mät genomförande, inte bara öppningar
2. **Kontext, inte dom** — aggregera utan att exponera barn som prestationsobjekt för föräldrar
3. **Nästa steg som KPI** — tid till första avbockning, återstart efter avbrott
4. **Konstitution före funnel** — om ett mått motiverar skamlig UX, är måttet fel
5. **Anonymiserad plattformsdata** — familj-ID i `analytics_events`, ingen PII i event stream

## 13.3 Per use case

Varje UC ska definiera (se UC-mallen):

- **Analytics** — vilka events som skickas
- **KPI** — produktmål (t.ex. tid till första stjärna, skip utan abandon)
- **Statistik** — vad som visas för användaren vs internt

## 13.4 Plattformsmått (översikt)

| Mått | Varför |
|------|--------|
| Aktiva familjer 24h/7d | Hälsa, inte vanity |
| Stjärnor given / belöningar lösta | Loopen fungerar |
| Conversion (onboarding → första stjärna) | Aktivering |
| Återstart efter 7d inaktivitet | Failure design fungerar |
| PWA / native adoption | Kanal, inte mål i sig |

**Implementation:** `analytics_events`, `analytics_daily_snapshots`, allowlist i server — se befintlig kodbas.

## 13.5 Roadmap

| Version | Innehåll |
|---------|----------|
| v1.0 | Principer + fält i UC-mall |
| v1.1 | Per-UC KPI-baseline dokumenterad |
| v2.0 | QA behavior checklist kopplad till analytics |
"""
    write_chapter(13, "ANALYTICS", "Analytics", analytics)

    # 14 — Accessibility
    a11y = """## 14.1 Syfte

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
"""
    write_chapter(14, "ACCESSIBILITY", "Accessibility", a11y)

    # 15 — Future Products
    future = strip_volume_preamble(lines(vol05, 568, 677))
    future += "\n\n## 15.8 Presentationstabell (Vision 2035)\n\n"
    future += """| | Barn | Ungdom | Vuxen |
|--|------|--------|-------|
| **Ton** | Visuellt | Coachande | Analytiskt |
| **Enhet** | Stjärnor | XP & mål | Vanor & insikter |
| **Horisont** | Ett steg | Dag & vecka | Livsmål |
| **Metafor** | Fantasi | Identitet | Självledarskap |

**Relaterat:** [01 — Vision](./01-PRODUCT-VISION.md) · [`VISION-2030.md`](../VISION-2030.md) · [`architecture-platform.md`](../architecture-platform.md)
"""
    write_chapter(
        15,
        "FUTURE-PRODUCTS",
        "Future Products",
        future,
        intro="> Barn → ungdom → vuxen på samma konto och samma motor.",
    )

    print("Built chapters 06-15 in", PB)


if __name__ == "__main__":
    main()
