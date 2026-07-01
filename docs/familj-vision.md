# Familj 10/10 — Produktvision

**Status:** Godkänd produktkompass (2026-07)  
**Domän:** `family`  
**Route:** `/family` (hub) · `/family/child/:id` (barnprofil)  
**Relaterat:** [familj-agent-prompt.md](familj-agent-prompt.md) · [parent-hubs-index.md](parent-hubs-index.md) · [vuxenmeny-v2.md](vuxenmeny-v2.md) §4

---

## Kompassen

> **Familj ska få föräldern att känna: "Jag ser vem som är med — och vet var jag hanterar varje barn."**

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

## Informationshierarki

```
1. Familjesammanfattning   →  "2 barn · 2 föräldrar"
2. Barn                    →  Kort med emoji/avatar → /family/child/:id
3. Vuxna                   →  Lista + Bjud in
4. Pedagoger               →  feature: pedagog (dold eller intresse)
5. Familjenivå (valfritt)  →  Familjenamn, familjekista — diskret
6. Museum (valfritt)       →  Livstidsstatistik — under fold
```

### Barnprofil (`/family/child/:id`) — navets viktigaste objekt

```
🌟 Astrid · 7 år

Idag          ⭐⭐⭐☆☆
Översikt | Schema | Belöningar | Framsteg | Barnvy | PIN
```

Ersätter legacy `/child-settings` drawer som primär modell.

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

---

## Nuläge vs mål

**Redan på plats:** `family.js`, barnkort, vuxenlista, inbjudan, custody, familjekista, museum.

**Kvar för 10/10:**

- Rena sektioner utan inställningsbrus
- Barnprofil som kanonisk destination (`/family/child/:id`)
- Redirect `/child-settings?id=` → barnprofil
- Pedagogsektion enligt `nav-config` capability
- Tydlig tom-state: *Lägg till barn* → onboarding eller modal

Se [familj-agent-prompt.md](familj-agent-prompt.md) för agent-uppdrag.
