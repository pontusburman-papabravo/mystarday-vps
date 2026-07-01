# Belöningar 10/10 — Produktvision

**Status:** Godkänd produktkompass (2026-07)  
**Domän:** `rewards`  
**Route:** `/rewards` (hub) → `/library#rewards`, `/skattkammaren`, barnprofil → Framsteg  
**Relaterat:** [beloningar-agent-prompt.md](beloningar-agent-prompt.md) · [parent-hubs-index.md](parent-hubs-index.md) · [parent-hub-vision-template.md](parent-hub-vision-template.md) · [vuxenmeny-v2.md](vuxenmeny-v2.md) §4

---

## Kompassen

> **Belöningar ska få föräldern att känna: "Jag ser vad som väntar — och vet var stjärnorna och belöningarna hör hemma."**

### Filterregel

> **Om en komponent inte hjälper användaren godkänna, hantera eller förstå belöningsläget inom fem sekunder, hör den inte hemma på Belöningar.**

Innan något läggs till: *"Hjälper detta användaren att (1) godkänna, (2) hantera belöningar eller (3) förstå barnets stjärnor?"* Om svaret är *inget* — flytta eller ta bort.

### Beslutsregel

> **På Belöningar får det aldrig finnas mer än en primär handling synlig åt gången — och godkännanden dominerar alltid hantera och följa.**

När pending finns är godkännande den enda primära handlingen. Schema, familjeadmin och daglig coach hör **inte** hemma här.

---

## Varför finns Belöningar?

Stjärnor är bränsle, inte poängjakt (G-01, R-02). Föräldern behöver:

1. **Godkänna** undantag (pending redemptions)
2. **Hantera** belöningsutbudet (skapa, redigera, kosta stjärnor)
3. **Följa** vad barnen samlat och begärt

Barnet upplever belöningar i **Skattkammaren**. Föräldern styr här.

---

## Problemet vi löser

> *"Olle har begärt en belöning — var godkänner jag? Och var ändrar jag vad som finns i kistan?"* — Jenny

Belöningar, stjärnor, rapporter och bibliotek **blandas** om hubben inte äger sin domän tydligt.

---

## Produktprincip

> **Belöningar = stjärnor + kista + väntande. Framsteg/rapporter = barnprofil (länkas, ägs inte här).**

| Belöningar är | Belöningar är inte |
|---------------|-------------------|
| Godkännande-UI (undantag) | Veckodiagram / analytics |
| Ingång till belöningsbibliotek | Schema |
| Överblick stjärnor per barn | Jämförelse syskon |
| Länk till utveckling | Ersättning av `/reports` |

**POS:** R-02 (stjärnor ej köpbara), G-01 (reality before celebration), PA-06 (godkännande = undantag).

### Copy-regel

| Yta | Beskriver |
|-----|-----------|
| **Belöningar** | Belöningsläget — *vad som väntar, hanteras och samlats* |
| **Hem** | Dagens läge — *undantag visas även här, samma data* |
| **Planering** | Bygg — *skapa/redigera belöningar i biblioteket* |
| **Familj → barnprofil** | Utveckling — *framsteg över tid* |

Föräldern ser *Hantera belöningar* och *Stjärnor & kista* — inte *Skattkammaren* som hub-CTA.

---

## Framgångskriterium

> **När en förälder öppnar Belöningar ska hen omedelbart se om något kräver godkännande — och veta var belöningarna hanteras.**

| Fråga | Om nej → bygg inte |
|--------|---------------------|
| Hjälper det här Jenny med belöningsläget? | |
| Flyttar vi schema eller familjeadmin hit? | |
| Bryter det mot beslutsregeln? | |

### Exit Rule

Belöningar är **färdigt** när föräldern kan säga:

- Jag vet om något väntar på godkännande (eller att inget gör det)
- Jag vet var jag hanterar belöningsutbudet
- Jag vet hur barnets stjärnor ser ut

---

## Den mentala modellen

```
Jag öppnar Belöningar
        ↓
Finns något att godkänna? → synligt överst (priority ladder)
        ↓
Jag ser var jag hanterar belöningar (bibliotek)
        ↓
Jag ser barnens stjärnor/kista
        ↓
Vill jag följa utveckling? → länk till Familj → barnprofil
```

---

## Tre frågor — alltid besvarade (standardvy)

| # | Fråga | Rätt | Fel |
|---|--------|------|-----|
| 1 | Väntar något på mig? | *Olle vill ha "Extra sagostund"* | Gömt under tre klick |
| 2 | Var hanterar jag belöningar? | *Hantera belöningar → biblioteket* | *Skattkammaren* som enda ingång |
| 3 | Hur ser stjärnorna ut? | *Stjärnor & kista — överblick per barn* | Aggregerad familjestatistik utan kontext |

**Designregel:** Godkännanden **ovanför** hub-länkar — samma mönster som Hem-undantag.

---

## Vad är ett undantag?

**Undantag** på Belöningar = en väntande belöningsbegäran som kräver vuxenbeslut **nu**.

| Är undantag | Är inte undantag |
|-------------|------------------|
| ✓ Pending redemption som kräver godkännande | ✗ Tips om nya belöningar |
| ✓ Blockerar barnet från att få belöningen | ✗ Veckosammanfattning av stjärnor |
| ✓ Kan inte vänta till senare | ✗ Uppmuntran eller statistik |

Samma undantagsdata kan synas på **Hem** och **Belöningar** — men logiken ska vara **en källa**, inte dubbel implementation.

---

## Priority Ladder

```
1. Godkännanden    →  Pending approvals (om några)
        ↓
2. Hantera         →  Hantera belöningar (→ /library#rewards)
        ↓
3. Följa           →  Stjärnor & kista (föräldervy, per barn)
        ↓
4. Utveckling      →  Textlänk: Familj → barnprofil → Framsteg
        ↓
5. Paket           →  Rapporter — endast om `reporting` köpt
```

**Exempel:** Veckodiagram får aldrig ligga ovanför ett väntande godkännande.

### Hub-regel (låst)

Länka **aldrig** till `/skattkammaren` som primär CTA i hubben för inloggad förälder — använd föräldervy eller inbäddad överblick. `/skattkammaren` är barn/demo/universe.

---

## Informationshierarki

Priority Ladder i implementation — se ovan.

---

## Jenny-test (Definition of Done)

En förälder som aldrig sett Belöningar ska inom **5 sekunder**, **utan scroll**, kunna svara:

1. **Väntar något på mig?**
2. **Var ändrar jag vilka belöningar som finns?**
3. **Var ser jag barnets stjärnor?**

### Jenny-test godkänt (målbild)

```
Belöningar

⚠️ Olle vill ha "Extra sagostund" (15 ⭐)     [Godkänn]

🎁 Hantera belöningar
   Skapa och redigera i biblioteket

⭐ Stjärnor & kista
   Överblick per barn
```

Om inget väntar: sektion 1 dold — inte "Inga väntande" som tar plats.

---

## Success Metrics (PR-granskning)

| Mål | Mått |
|-----|------|
| Jenny ser om något väntar | < 5 sek |
| Ingen scroll för beslut | Ja |
| Antal primära handlingar synliga | ≤ 1 |
| Synliga blockerande godkännanden | ≤ 1 åt gången |
| Tom-state utan brus | Ja (dölj sektion, inte "inga väntande") |
| Filterregeln | Varje komponent = godkänna, hantera eller följa |

---

## Vad som ska bort

- `/skattkammaren` som hub-huvudingång (loop / barn-UI)
- Stjärnor som köpbara (R-02)
- Jämförande leaderboard syskon
- Rapporter som egen sektion utan `reporting`-feature
- Duplicerat godkännande på Hem **och** Belöningar utan synk (undantag ska synas på båda — samma data, inte dubbel logik)

---

## Nuläge vs mål

**Redan på plats:** `rewards-hub.js`, `PendingApprovals.mountHub`, länk till bibliotek, länk till föräldervy, capability för rapporter.

**Kvar för 10/10:**

- Godkännande alltid överst när pending finns
- Tydlig tom-state utan brus
- Konsekvent copy (inte "Skattkammaren" i föräldratext på hub)
- Verifiera att pending synkas med Hem-readiness

Se [beloningar-agent-prompt.md](beloningar-agent-prompt.md) för agent-uppdrag.
