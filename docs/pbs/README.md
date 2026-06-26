# Product Behavior Specification (PBS) — arkiv

## Produktplattformen — Version 1.0

**Typ:** Arkiv — femvolymsserie  
**Kanoniskt bibliotek:** [`../product-bible/README.md`](../product-bible/README.md) + [`../use-cases/`](../use-cases/)  
**Status:** Innehåll migrerat till Product Bible (15 kapitel)  
**Ägare:** Produkt

> **Ny läsning börjar i [`product-bible/`](../product-bible/).** Denna mapp behålls som referens tills full migrering är verifierad.

## Mappning volym → Product Bible

| Arkiv (pbs/) | Product Bible |
|--------------|---------------|
| VOL-01 | Kap. 01–02, del av 06–08 |
| VOL-02 | Kap. 04–05 |
| VOL-03 | [`use-cases/`](../use-cases/) |
| VOL-04 | Kap. 10 |
| VOL-05 | Kap. 03, 08–09, 12, 15 |

> PBS beskriver **hur produkten ska bete sig** — inte hur koden är implementerad.  
> Vid konflikt om beteende, ton, ansvar eller användarupplevelse **vinner PBS** över kravspec och teknisk arkitektur.

---

## Vem läser vad?

| Volym | Produkt | UX/UI | Utvecklare | QA/Test | AI/Coach | Pedagog | Terapeut | Investerare | Nya medarbetare |
|-------|---------|-------|------------|---------|----------|---------|----------|-------------|-----------------|
| [Vol 1 – Vision](VOL-01-VISION.md) | ●●● | ●● | ● | ● | ●● | ● | ● | ●● | ●●● |
| [Vol 2 – Roller & domän](VOL-02-ROLLER-DOMAN.md) | ●●● | ●●● | ●● | ●● | ●● | ●●● | ●●● | ● | ●●● |
| [Vol 3 – Use cases](VOL-03-USE-CASES.md) | ●●● | ●●● | ●●● | ●●● | ●● | ●● | ● | ● | ●● |
| [Vol 4 – Coach Bible](VOL-04-COACH-BIBLE.md) | ●●● | ●●● | ● | ●● | ●●● | ●● | ●● | ● | ●● |
| [Vol 5 – Motivation & konstitution](VOL-05-MOTIVATION-EMOTION-KONSTITUTION.md) | ●●● | ●●● | ●● | ●●● | ●●● | ● | ● | ●● | ●●● |

---

## Volymserie

| Volym | Fil | Innehåll | Sidmål | v1.0-status |
|-------|-----|----------|--------|-------------|
| **1** | [VOL-01-VISION.md](VOL-01-VISION.md) | Vision, mission, filosofi, principer, vad produkten aldrig får göra | 30–40 | ✅ Grund |
| **2** | [VOL-02-ROLLER-DOMAN.md](VOL-02-ROLLER-DOMAN.md) | Domänmodell + roller (barn, ungdom, vuxen, förälder, pedagog, terapeut) | 50–70 | ✅ Grund |
| **3** | [VOL-03-USE-CASES.md](VOL-03-USE-CASES.md) | UC-mall, katalog UC001–UC120, 8 fulla UC (4–8 sidor vardera vid komplett) | 150–200 | 🔄 Pågår |
| **4** | [VOL-04-COACH-BIBLE.md](VOL-04-COACH-BIBLE.md) | AI-coachens tänkande, språk, tystnad, triggers | 50–80 | ✅ Grund |
| **5** | [VOL-05-MOTIVATION-EMOTION-KONSTITUTION.md](VOL-05-MOTIVATION-EMOTION-KONSTITUTION.md) | Motivation, emotion, failure, livsresa, **30 konstitutionsregler** | 40–60 | ✅ Grund |

**Master-index (kort):** [`../PRODUCT_BEHAVIOR_SPEC.md`](../PRODUCT_BEHAVIOR_SPEC.md)

---

## Dokumenthierarki

```text
PBS (detta bibliotek)
  > architecture-platform.md     — motorer, Presentation Profiles
    > APP-V2-KRAVSPEC.md         — Platform v1 leverans
      > barnmeny-v2 / vuxenmeny-v2
```

---

## Hur vi skriver vidare (inte allt på en gång)

| Version | Fokus |
|---------|--------|
| **PBS 1.0** | Vol 1–5 grund, UC001–UC008 fulla, katalog UC001–UC060 |
| **PBS 1.1** | UC009–UC030 fulla |
| **PBS 1.2** | UC031–UC060 fulla |
| **PBS 2.0** | UC061–UC120, Coach copy library, QA behavior checklist |
| **PBS 3.0** | Ungdom/vuxen-presentation i varje UC |

### Regel för nya use cases

1. Lägg till rad i Vol 3 katalog  
2. Skriv UC i **full mall** (4–8 sidor) — inte bara rubrik  
3. Testa mot [Vol 5 konstitution](VOL-05-MOTIVATION-EMOTION-KONSTITUTION.md#del-10--produktkonstitution)  
4. Testa mot beslutsgate: *Kan samma motor presenteras för en 24-åring med ADHD utan omskrivning?*

---

## Relaterade dokument

- [`architecture-platform.md`](../architecture-platform.md)
- [`VISION-2030.md`](../VISION-2030.md)
- [`APP-V2-KRAVSPEC.md`](../APP-V2-KRAVSPEC.md)
- [`USE_CASES_PLATFORM.md`](../USE_CASES_PLATFORM.md) — arkiv

---

## Versionshistorik (serien)

| Version | Datum | Ändring |
|---------|-------|---------|
| 1.0 | 2026-06-26 | Volymserie skapad från monolit PBS; 5 volymer + README |
