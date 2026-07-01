# Familj 10/10 — Produktvision

**Status:** Godkänd produktkompass (2026-07)  
**Domän:** `family`  
**Route:** `/family` (hub) · `/family/child/:id` (barnprofil)  
**Relaterat:** [familj-agent-prompt.md](familj-agent-prompt.md) · [parent-hubs-index.md](parent-hubs-index.md) · [vuxenmeny-v2.md](vuxenmeny-v2.md) §4

---

## Kompassen

> **Familj ska få föräldern att känna: "Jag ser vem som är med — och vet var jag hanterar varje barn."**

---

## Kärnmetafor

> **Familj = klasslistan** — vem som är med i klassen, inte kontrollpanelen för hela skolan.

| | Klasslistan | Inte klasslistan |
|--|-------------|------------------|
| **Vad** | Barn, vuxna, pedagoger | Push, GDPR, prenumeration |
| **Handling** | Ett tryck → barnets värld | Daglig coach, undantag, schema |
| **Exempel** | *Astrid, 7 år →* | *Radera konto* ovanför barnlistan |

Hubben ska kännas som att läsa klasslistan — inte som att öppna systeminställningar.

---

## Varför finns Familj?

Appen är en **familjeenhet** med flera vuxna, barn och ibland pedagoger. Föräldern behöver en ren yta för:

1. **Vilka barn** finns — och deras profiler
2. **Vilka vuxna** har åtkomst
3. **Vem bjuder jag in** (medförälder, pedagog)

Inställningar, push, GDPR och prenumeration **hör inte hemma här** (→ `/settings`, avatar).

---

## Problemet vi löser

> *"Jag vill ändra Astrids PIN — är det under Familj eller Inställningar? Och hur bjuder jag in min partner?"* — Jenny

Familj har historiskt varit en **allt-i-ett-sida** med konto, push och barn i samma hög.

---

## Produktprincip

> **Familj = människor. Barnprofil = ett barns värld. Inställningar = konto och app.**

| Familj är | Familj är inte |
|-----------|----------------|
| Barn, vuxna, pedagoger | Push-inställningar |
| Inbjudan medförälder | Prenumeration |
| Ingång till barnprofil | Schemaeditor |
| Familjenamn, familjekista (familjenivå) | GDPR-export (→ settings) |

**POS:** P-04 (inget parent dashboard på Hem — Familj är admin, inte daglig coach), C-01 (barn har inga formulär).

---

## Framgångskriterium

> **När en förälder öppnar Familj ska det vara uppenbart vem som ingår — och ett tryck leder till rätt barns detaljer.**

---

## Den mentala modellen

```
Jag öppnar Familj
        ↓
Jag ser barn (kort eller lista)
        ↓
Jag trycker på Astrid → barnprofil
        ↓
Där: schema, belöningar, framsteg, PIN, barnvy
        ↓
Behöver jag bjuda in partner? → Vuxna → Bjud in
```

**Regel:** Alla barnrelaterade funktioner ska kunna nås via **barnprofilen** — även om de också finns i hubbar.

---

## Tre frågor — alltid besvarade (standardvy)

| # | Fråga | Rätt | Fel |
|---|--------|------|-----|
| 1 | Vem ingår? | *Barn: Astrid, Olle · Vuxna: Pontus, Anna* | Blandat med push/GDPR |
| 2 | Hur lägger jag till någon? | *+ Bjud in förälder* synlig | Gömd i inställningar |
| 3 | Var ser jag ett barns detaljer? | Tryck på barnkort → profil | Drawer utan tydlig struktur |

**Designregel:** Tre sektioner max på hub: **Barn · Vuxna · Pedagoger** (pedagoger dold tills feature live).

---

## Prioritetsordning (låst)

Allt på Familj-hubben följer denna ordning. Inget får bryta den:

```
1. Barn          →  Kort → /family/child/:id
        ↓
2. Vuxna         →  Lista + Bjud in
        ↓
3. Pedagoger     →  Om feature live
        ↓
4. Familjenivå   →  Namn, familjekista — diskret
        ↓
5. Museum        →  Livstidsstatistik — under fold
```

Lägg aldrig inställningar, push eller kontoåtgärder ovanför barnlistan.

---

## Vad hör hemma på hubben?

```
Familj-hubben visar =
✓ vilka barn och vuxna som ingår
✓ hur man bjuder in medförälder eller pedagog
✓ ingång till varje barns profil

Inte på hubben:
✗ push, GDPR, radera konto, prenumeration (→ Inställningar)
✗ daglig status, coach, undantag (→ Hem)
✗ belöningsgodkännande (→ Belöningar)
✗ schemaeditor (→ Planering / barnprofil)
✗ motivation eller prestationstext
```

---

## Barnprofil (låst)

**Barnprofilen** (`/family/child/:id`) = **ett barns värld** — inte hubben.

| Barnprofil äger | Barnprofil äger inte |
|-----------------|----------------------|
| Schema, belöningar, framsteg för **ett** barn | Familjemedlemmar, inbjudan |
| PIN, barnvy, daglig översikt | Push, GDPR, konto |
| Barnspecifika inställningar | Syskonjämförelse |

Ersätter legacy `/child-settings` drawer som primär modell.

```
🌟 Astrid · 7 år

Idag          ⭐⭐⭐☆☆
Översikt | Schema | Belöningar | Framsteg | Barnvy | PIN
```

---

## Hem vs Familj (låst)

| | Hem | Familj |
|--|-----|--------|
| **Begrepp** | **Undantag** | **Medlemmar** |
| **Exempel** | *1 väntande medförälder-inbjudan* (länk hit) | *+ Bjud in förälder* |
| **Data** | `readiness` type `pending_invite` | `family_invite` — **samma underliggande rader** |

**Regel:** Hem **visar** att en inbjudan väntar; Familj **äger** inbjudnings-UI. Saknad PIN länkar från Hem till barnprofil — inte till hubbens topp.

---

## Filterregel

Om en komponent inte hjälper föräldern att:

- **se vem som ingår** i familjen,
- **lägga till eller bjuda in** någon, eller
- **nå ett specifikt barns värld** (barnprofil),

…hör den **inte** hemma på Familj-hubben.

Flytta till rätt hub: Hem (läge idag), Belöningar (belöningar), Planering (schema), Inställningar (konto).

---

## Copy-regel

Familj beskriver:

- **vem som är med**
- **hur man lägger till någon**
- **var man hanterar ett barn**

Familj beskriver **inte**:

- hur barnet presterat eller motivation
- daglig coach eller undantag (→ Hem)
- belöningsgodkännande (→ Belöningar)

Det håller isär Familj, Hem och Belöningar.

---

## Informationshierarki

```
1. Familjesammanfattning   →  "2 barn · 2 föräldrar"
2. Barn                    →  Kort med emoji/avatar → /family/child/:id
3. Vuxna                   →  Lista + Bjud in
4. Pedagoger               →  feature: pedagog (dold eller intresse)
5. Familjenivå (valfritt)  →  Familjenamn, familjekista — diskret
6. Museum (valfritt)       →  Livstidsstatistik — under fold
```

---

## Jenny-test (Definition of Done)

En förälder som aldrig sett Familj ska inom **5 sekunder**, **utan scroll**, kunna svara:

1. **Vilka barn har vi i appen?**
2. **Hur bjuder jag in en annan vuxen?**
3. **Var klickar jag för att se Astrids detaljer?**

### Jenny-test godkänt (målbild)

```
Familj
2 barn · 2 föräldrar

Barn
🌟 Astrid          7 år        →
👶 Olle            4 år        →

Vuxna
Pontus (du)
Anna

[+ Bjud in förälder]
```

Ingen push-toggle. Ingen "Radera konto" ovanför barnlistan.

---

## Vad som ska bort

- Push, PWA, GDPR, radera konto på `/family` (→ settings)
- `/child-settings` drawer som primär UX (redirect → barnprofil)
- Föräldralås i föräldratext (→ "PIN-kod" under barnprofil)
- Pedagog som egen bottenflik
- Barnformulär i barnvy (C-01)
- Motivation, coachning eller prestationstext på hubben

---

## Nuläge vs mål

**Redan på plats:** `family.js`, barnkort, vuxenlista, inbjudan, custody, familjekista, museum.

**Kvar för 10/10:**

- Rena sektioner utan inställningsbrus
- Barnprofil som kanonisk destination (`/family/child/:id`)
- Redirect `/child-settings?id=` → barnprofil
- Pedagogsektion enligt `nav-config` capability
- Tydlig tom-state: *Lägg till barn* → onboarding eller modal
- Inbjudningsundantag synkat med Hem (`readiness` ↔ `family_invite`)

Se [familj-agent-prompt.md](familj-agent-prompt.md) för agent-uppdrag.
