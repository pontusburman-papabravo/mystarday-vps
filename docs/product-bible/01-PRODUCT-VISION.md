# 01 — Product Vision

**Product Bible — Kapitel 1**  
**Version:** 1.0  
**Status:** Normerande  

---

## 1. Vision

### Varför finns produkten?

Produktplattformen finns för att hjälpa människor att **lyckas med sin vardag**.

Den ska minska den mentala belastningen kring planering, genomförande och uppföljning av vardagliga aktiviteter.

| Målgrupp | Vad produkten ska ge |
|----------|----------------------|
| **Barn** | Trygghet, struktur, motivation |
| **Ungdomar** | Självständighet med stöd |
| **Vuxna** | Hållbara vanor, mindre stress, känsla av kontroll |

Produkten är **inte**:

- ett schema
- ett belöningssystem
- en kalender

Produkten **är**:

> **Ett operativsystem för vardagsstruktur.**

---

## 2. Mission

**Vi hjälper människor att lyckas med nästa lilla steg.**

Inte nästa vecka.  
Inte nästa månad.  

**Nästa steg. Varje dag.**

---

## 3. Vision 2035

En person ska kunna börja använda plattformen som sexåring.

**Samma konto** ska kunna följa personen genom:

- lågstadiet
- mellanstadiet
- högstadiet
- gymnasiet
- universitetet
- första jobbet
- familjelivet

Produkten ska **utvecklas tillsammans med användaren**.

Användaren ska **aldrig behöva byta plattform**.

*Teknisk grund:* [`architecture-platform.md`](../architecture-platform.md) · Presentation Profiles · UC061+ i [`use-cases/`](../use-cases/)

---

## 4. Produktprinciper (översikt)

Detaljer och tillämpning: [02 — Product Philosophy](./02-PRODUCT-PHILOSOPHY.md)

| # | Princip |
|---|---------|
| 4.1 | **Nästa steg** — visa nästa, inte allt |
| 4.2 | **Framsteg framför perfektion** — missad aktivitet ≠ misslyckande |
| 4.3 | **Låg kognitiv belastning** — produkten fattar beslut, tar inte kontroll |
| 4.4 | **Positiv förstärkning** — förstärk, bestraffa aldrig |
| 4.5 | **Anpassning före standard** — samma diagnos ≠ samma stöd |
| 4.6 | **Självständighet är slutmålet** — användaren ska behöva appen **mindre** |

---

## 5. Produktkonstitution (översikt)

Fullständiga regler (30 st): [03 — Product Constitution](./03-PRODUCT-CONSTITUTION.md)

| # | Regel |
|---|-------|
| 1 | Appen hjälper alltid användaren till **nästa steg** |
| 2 | Appen skapar **aldrig skuld** |
| 3 | Coachen **dömer aldrig** |
| 4 | Historik raderas **aldrig** utan användarens godkännande |
| 5 | Barn möts **aldrig** av reklam |
| 6 | Belöningar **förstärker** beteenden — ersätter dem inte |
| 7 | Användaren ska **förstå varför** något händer |
| 8 | Det ska **alltid gå att lyckas idag** — även om gårdagen gick dåligt |
| 9 | Produkten ska vara **lugn** — inte stressig |
| 10 | **Färre funktioner** är bättre än fler |

---

## 6. Produktens kärna (beteendeloop)

All funktionalitet ska kunna kopplas till denna loop. Om inte — **ifrågasätt funktionen**.

```text
PLANERA
    ↓
STARTA
    ↓
GENOMFÖRA
    ↓
BEKRÄFTA
    ↓
FÅ FEEDBACK
    ↓
REFLEKTERA
    ↓
FÖRBÄTTRA
    ↓
UPPREPA
```

**Use cases per fas:** se [use-cases/UC-CATALOG.md](../use-cases/UC-CATALOG.md)

---

## 7. Plattform (översikt)

Samma motor — olika presentation.

```text
Core Platform
───────────────
Identity · Coach · Tasks · Goals · Progress
Rewards · Habits · Relationships · Notifications
Timeline · Analytics · AI
───────────────
```

| | Barn | Ungdom | Vuxen |
|--|------|--------|-------|
| **Ton** | Visuellt | Coachande | Analytiskt |
| **Enhet** | Stjärnor | XP & mål | Vanor & insikter |
| **Horisont** | Ett steg | Dag & vecka | Livsmål |
| **Metafor** | Fantasi | Identitet | Självledarskap |

Full spec: [11 — Core Platform](./11-CORE-PLATFORM.md)

---

## Läs vidare

| Kapitel | Ämne |
|---------|------|
| [02](./02-PRODUCT-PHILOSOPHY.md) | Produktfilosofi (utvecklad) |
| [03](./03-PRODUCT-CONSTITUTION.md) | Konstitution (30 regler) |
| [12](./12-PRODUCT-BEHAVIOR-SPEC.md) | Beteendespec + use cases |
| [15](./15-FUTURE-PRODUCTS.md) | Barn → Ungdom → Vuxen |
