# Paket — Spec v1.2

**Skapad:** 2026-06-17  
**Uppdaterad:** 2026-06-17 (§13.10 UX 10/10 · §9.10 admin · pedagog mockup v3)  
**Status:** ✅ **Approved for implementation (v1.2)**  
**Produktversion:** v1.2 = **Paket**  
**Teknisk grund:** `family_subscriptions.components` JSONB + `has_component()` + `requireComponent()`

---

## 0. Produktarkitektur

```
Paket
├── Basic                    (basic_app)
├── Familj Rapportering      (reporting)
├── Familj Pedagog           (pedagog)
└── Familj Extra stöd        (teacch)

För dig
└── Ingår i Basic — familjens målyta (inte ett eget paket)
```

**Konceptuellt beslut:** Fyra tydliga säljbara paket. **För dig** är den naturliga ingången till produkten — inte ett femte paket användaren måste förstå.

**Navigation (vid köp):** Paket säljs modulärt, men menyn ska **inte** spegla paketlogiken. Se §6 — arbetsflöden, inte funktionslista.

**Beslutregel vid nya funktioner:** *Vilket problem löser den?* → ska peka på **ett** paket (eller För dig under Basic).

**Positionering (10-sekundersregeln):**

| Problem (kund) | Paket |
|----------------|-------|
| Vardagen fungerar inte | **Basic** |
| Jag vill följa utveckling | **Familj Rapportering** |
| Jag samarbetar med skola/pedagog | **Familj Pedagog** |
| Mitt barn behöver mer struktur | **Familj Extra stöd** |

**Konstitutionell regel:** *Ett paket = ett primärt problem.* Nya features måste stärka det problemet — inte läggas till "för att de finns". Se §14.

---

## 1. Paketöversikt

| Paket | Komponent | Syfte |
|-------|-----------|-------|
| **Basic** | `basic_app` | Få vardagen att fungera |
| **Familj Rapportering** | `reporting` | Följa och dokumentera utveckling |
| **Familj Pedagog** | `pedagog` | Samarbete mellan vuxna |
| **Familj Extra stöd** | `teacch` | Ökad förutsägbarhet och struktur |

| Paket | Äger (internt) |
|-------|----------------|
| Basic | Motivation & vardagsrutiner |
| Rapportering | Insikter & dokumentation |
| Pedagog | Samarbete mellan vuxna |
| Extra stöd | Förutsägbarhet & struktur |

Modulära tillägg — kombinerbara (t.ex. Basic + Rapportering + Extra stöd utan Pedagog).  
`lifetime_free`-familjer behåller `basic_app`; tillägg är separat produktbeslut.

---

## 2. Paket 1 — Basic

| | |
|--|--|
| **Kundnamn** | Basic |
| **Komponent** | `basic_app` |
| **Pris** | 59 SEK/mån (vid betalning) |
| **Löfte** | Hjälper familjen skapa fungerande vardagsrutiner |
| **Målgrupp** | Alla familjer |
| **Status** | ✅ Live |

### 2.1 För dig — familjens målyta

Ingår i Basic. Inte separat paket.

| Område | Innehåll |
|--------|----------|
| **Utvecklingsmål** | Trygga kvällar · Bra morgnar · Självständighet · Skolansvar · Samarbete hemma · Motivation |
| **Funktioner** | Aktivera färdiga rutiner · Åldersanpassade rekommendationer · Favoriter · Mest installerade |

**Feature slug:** `for_dig`

### 2.2 Schema

| Feature slug |
|--------------|
| `veckoschema` |
| `specialdagar` |
| `kalender` |

### 2.3 Aktiviteter & delsteg

| Feature slug |
|--------------|
| `aktivitetsbibliotek` (inkl. delsteg) |

### 2.4 Stjärnor och daglogg

| Feature slug |
|--------------|
| `daglogg` |
| `manuella_stjarnor` |

### 2.5 Belöningar

| Feature slug |
|--------------|
| `beloningssystem` |
| `skattkammar_universum` |

### 2.6 Familj

| Feature slug |
|--------------|
| `familjeinbjudan` |
| `barninloggning` |

### 2.7 Push

| Feature slug |
|--------------|
| `push_notiser` |

### 2.8 UI-identitet

| Fokus |
|-------|
| Rutiner |
| Motivation |
| Självständighet |

**Ton:** varm · lekfull · enkel · motiverande (stjärnor, framsteg, illustrationer).

**Wireframe — förälder (Idag):**

```
Idag — Anna
✓ Borsta tänderna  ✓ Klä på sig  ○ Läxor
+2 stjärnor idag
Nästa: Fotbollsträning
```

**Wireframe — barn:**

```
⭐ 24 stjärnor
NU — Borsta tänderna
[ Starta ]
```

---

## 3. Paket 2 — Familj Rapportering

| | |
|--|--|
| **Kundnamn** | Familj Rapportering |
| **Komponent** | `reporting` |
| **Pris** | 19 SEK/mån (vid betalning) |
| **Löfte** | Förstå utvecklingen över tid och dela den med andra |
| **Målgrupp** | Familjer som samarbetar med skola/vård eller vill följa utveckling |
| **Status** | ⚙️ Feature finns; betalning ej aktiverad |

### 3.1 Innehåll

| Område | Feature slug | Notering |
|--------|--------------|----------|
| Rapporter | `klinisk_rapportering` | Huvudfeature |
| Historik | `klinisk_rapportering` | Ingår |
| PDF-export | `klinisk_rapportering` | Ingår |
| Delningslänkar | `klinisk_rapportering` | Ingår |
| Trender | `klinisk_rapportering` | t.ex. genomförda aktiviteter, stjärnutveckling, observationshistorik |

### 3.2 UI-identitet

| Fokus |
|-------|
| Insikter |
| Dokumentation |
| Uppföljning |

**Ton:** professionell · dataorienterad · diagram och sammanfattningar (inte lekfull som Basic).  
**Ny huvudsektion:** *Rapporter*

**Wireframe — dashboard:**

```
Rapporter — Senaste 30 dagarna
Närvaro: 92%  |  Aktiviteter: +12%  |  Belöningar: 34  |  Svåra övergångar: 5
[ Skapa PDF ]
```

### 3.3 Gating

`requireComponent('reporting')` · UI: `/reports` + `data-feature="klinisk_rapportering"`

---

## 4. Paket 3 — Familj Pedagog

| | |
|--|--|
| **Kundnamn** | Familj Pedagog |
| **Komponent** | `pedagog` |
| **Pris** | TBD |
| **Löfte** | Gör det enkelt för familj och pedagog att arbeta tillsammans |
| **Målgrupp** | Familjer med resurspedagog, elevassistent, specialpedagog eller kontaktperson |
| **Status** | ⚙️ Features delvis live; komponent ej i config |

### 4.1 Innehåll

| Område | Feature slug / kod |
|--------|-------------------|
| Pedagoginbjudan | `pedagog_invite` |
| Pedagogroll | `parent_child.role = pedagog` |
| Pedagoganteckningar | `pedagoganteckningar` |
| Pedagogöversikt | `pedagog_dashboard` — se **§4.4** *(delvis live; arbetsflöde v1.2)* |
| Daglogg i skola | `pedagog_daglogg` *(v1.2 ny)* |
| Skolaktiviteter | `pedagog_skolaktivitet` *(v1.2 ny)* |
| Samarbetskommentarer | `pedagog_samarbete` *(v1.2 ny)* |
| Åtkomstlogg | `pedagog_audit` *(v1.2 ny)* |
| Begränsad åtkomst | Schema (läs) · Daglogg (markera i skola) · Anteckningar · Historik |

**Ingen åtkomst till:** betalning · familjeinställningar · administrativa funktioner · belöningar

### 4.2 Samarbete — förälderns vy

| Fokus |
|-------|
| Samarbete |
| Kommunikation |
| Gemensam bild |

**Ton:** samarbetsverktyg — inte rapportverktyg (det är Rapportering).  
**Route:** Samarbete-fliken i föräldernav (§6) · `rollout_mode=off` → befintlig UI oförändrad.  
**Pedagogens egen vy:** se **§4.4**.

#### 4.2.1 Innehåll

| Område | Beskrivning |
|--------|-------------|
| **Pedagoglista** | Alla aktiva pedagoger med profil (§4.4.4), delade barn, senast aktiv |
| **Bjuda in** | Primärförälder väljer barn + e-post → `pedagog_invite` |
| **Återkalla** | Revokerar `parent_child`-länk omedelbart + audit |
| **Dagens flöde** | Per valt barn: alla pedagogers publicerade anteckningar + samarbetskommentar |
| **Historik** | Senaste 30 dagar · sök/filter (§4.2.4) |
| **Audit-sammanfattning** | *"Senaste aktivitet"* per pedagog (§4.4.14) |
| **Frånvaro** | Visar vem som rapporterat frånvaro |

**Gating:** `requireComponent('pedagog')` för inbjudan. Preview enligt §6.6 om ej köpt. Grandfathered familjer ser riktig vy direkt (§8.4).

#### 4.2.2 Pedagoglista & inbjudan

**Wireframe — Samarbete (översikt):**

```
Samarbete                                    [ + Bjud in pedagog ]

── Aktiva pedagoger ─────────────────────────
Anna Svensson · Klasslärare · Förskolan Solen
  Delade barn: Ella
  Senast aktiv: Idag 14:32 · anteckning publicerad
  [ Visa historik ]  [ Återkalla ]

Johan Nilsson · Resurspedagog
  Delade barn: Ella
  Senast aktiv: Igår · ingen anteckning idag
  [ Visa historik ]  [ Återkalla ]

── Barn: Ella ▼ ─────────────────────────────
```

**Wireframe — bjud in pedagog:**

```
┌─────────────────────────────────────┐
│ Bjud in pedagog                     │
│                                     │
│ E-post: [ anna@skola.se        ]    │
│ Namn:   [ Anna Svensson        ]    │
│                                     │
│ Dela barn:                          │
│ ☑ Ella                              │
│ ☐ Noah                              │
│                                     │
│ [ Avbryt ]  [ Skicka inbjudan ]     │
└─────────────────────────────────────┘
```

**Regler:** Primärförälder only · minst ett barn · `requireComponent('pedagog')` · trigger intresse-CTA om ej köpt (§9.5).

#### 4.2.3 Dagvy — per barn

Förälder väljer barn i header. Visar **alla pedagogers** publicerade/låsta anteckningar — var för sig med attribution (§4.4.6). **Inte** aggregerad status.

**Wireframe — idag · Ella · 17 juni:**

```
── Anteckningar idag ───────────────────────

Anna Svensson · Klasslärare · publicerad 14:32
  Humör 4/5 · Lunch gick bra · Lugn eftermiddag

Johan Nilsson · Resurspedagog
  ○ Ingen anteckning idag

── Skolaktiviteter & avbockningar ──────────
☑ Lunch · Avklarad i skolan av Anna 11:45
  Kommentar: "Hungrig idag"
☑ Utflykt · Tillagd av Anna

── Frånvaro ────────────────────────────────
(ingen idag)

── Samarbetskommentar ──────────────────────
Förälder (08:15): "Sov dåligt inatt."
Pedagog Anna (08:45): "Tack, vi håller extra koll idag."
[ Lägg till kommentar ]   ← max 1 per sida per dag (§4.4.7)
```

**Inte chat** — en tråd per barn per dag, max en kommentar från förälder och en från pedagog.

#### 4.2.4 Historik & sökning

| Element | Spec |
|---------|------|
| **Sök barn** | Dropdown/filter i header |
| **Filter månad** | Välj månad (default: innevarande) |
| **Filter pedagog** | Visa alla · endast Anna · endast Johan |
| **Lista** | Datum · pedagog · anteckningsstatus · frånvaro |
| **Klick** | Expandera dagvy (§4.2.3) read-only |

**Wireframe — historik (i Samarbete eller underflik):**

```
Historik · Ella

[ Sök barn ▾ ]  [ Månad: Juni ▾ ]  [ Pedagog: Alla ▾ ]

17 juni  Anna Svensson   ✓ Publicerad
16 juni  Anna Svensson   ✓ Publicerad
16 juni  Johan Nilsson   ○ Saknas
15 juni  —               FRÅNVARANDE (Anna)
```

#### 4.2.5 Förälder vs pedagog — ansvarsfördelning

| Aspekt | Förälder (§4.2) | Pedagog (§4.4) |
|--------|-----------------|----------------|
| Status *KLAR* | Per pedagog — visas separat | Per **egen** pedagog — dashboard är inte aggregerat per barn |
| Anteckningar | Ser alla publicerade | Ser/redigerar endast egna |
| Inbjudan/återkalla | ✅ | ❌ |
| Avbockning hemma | ✅ | ❌ (read-only) |
| Avbockning skola | Ser resultat | ✅ |
| Audit-logg | Sammanfattning + GDPR-export | — |
| Prenumeration upphör | Badge (§4.4.18) | Befintlig åtkomst behålls |

### 4.3 Gating, prenumeration & arkiv

| Åtgärd | Krav |
|--------|------|
| **Ny inbjudan** | `requireComponent('pedagog')` på familjens sida |
| **Ny pedagogkoppling** | Blockeras om komponent saknas |
| **Befintlig relation** | Behålls vid utgången prenumeration (§8.5) |
| **Pedagog write** | `requirePedagogAccess(childId)` — länken räcker; familjens komponentstatus blockerar inte befintliga samarbeten |
| **Nedgradering** | Data arkiveras — raderas aldrig (§8.5) |

### 4.4 Pedagogläge — komplett dokumentationsflöde

*Pedagogens egen upplevelse i appen. Kompletterar §4.2 (förälderns Samarbete-vy).*

**Produktmål v1.2:** Pedagogläget ska vara ett **komplett dokumentationsflöde** — inte bara en extra vy. Tydlig ansvarsfördelning, GDPR-spårbarhet och stöd för flera pedagoger per barn.

#### 4.4.1 Roller & inloggning

Pedagog är **inte** ett separat kontotyp i v1.2 — det är ett **vuxenkonto** (`parent`) med begränsad åtkomst via `parent_child.role = 'pedagog'` per barn.

| Kontotyp | Beskrivning |
|----------|-------------|
| **Pedagog-only** | `account_type = 'educator'` eller endast `role=pedagog`-länkar — ser **enbart** pedagogläge |
| **Dual-roll** | Förälder i egen familj **och** pedagog hos andra — växlar via `preferred_view_mode` (`parent` \| `pedagog`) |
| **Inbjuden pedagog** | Får e-post → `/pedagog-invite?token=…` → skapar/kopplar konto → `parent_child` med `role=pedagog` |

**Inloggningsflöde:**

```
Förälder bjuder in (väljer barn) → e-post till pedagog
        ↓
Pedagog öppnar länk → accepterar → konto kopplat
        ↓
Nästa inloggning → redirect till /pedagog-oversikt
        ↓
Ser endast barn som föräldern valt att dela
```

**Wireframe — inbjudan accepterad (`/pedagog-invite`):**

```
Välkommen!

Du har blivit inbjuden till:

  👧 Ella Andersson
  Förskolan Solen · Andersson-familjen

[ Acceptera inbjudan ]
```

**Wireframe — dual-roll (inställningar, ⚙️):**

```
Profil

Visningsläge
  ○ Föräldarläge
  ● Pedagogläge

[ Logga ut ]
```

**Tomt tillstånd** (inga delade barn):

```
Inga barn delade

Be en förälder bjuda in dig till sitt barn.

[ Uppdatera ]
```

**Revoke-tillstånd** (förälder återkallar medan pedagog är inloggad):

```
Åtkomst borttagen

Andersson-familjen har avslutat samarbetet för Ella.

[ Tillbaka till översikt ]
```

**Session vid revoke (GDPR, P0):** Ingen WebSocket i v1.2. Istället:

| Trigger | Beteende |
|---------|----------|
| **Varje API-anrop** | `requirePedagogAccess(childId)` — `403 ACCESS_REVOKED` om `revoked_at` satt |
| **App resume / flikväxling** | Klienten anropar `GET /api/subscription/access` + validerar pedagog-barnlista |
| **403 ACCESS_REVOKED** | **Omedelbar hård redirect** till `/pedagog-oversikt` + revoke-modal — rensa cache för barnet |
| **Pågående skärm** | Pedagog får **inte** fortsätta se känslig data efter nästa interaktion |

*Motivering:* Reaktiv middleware räcker om klienten alltid validerar vid resume — ingen passiv "sitta kvar på skärmen".

**Barnväxling (Idag-flik):** Header `Andersson — Ella ▼` med dropdown över alla delade barn. Senast valt barn sparas i `localStorage` (`pedagog_last_child_id`). Vid 0 barn → tomt tillstånd ovan.

**Befintlig kod:** `pedagog_invite`, `pedagog-oversikt.html`, `dashboard.js` redirect vid `account_type=educator` eller `preferred_view_mode=pedagog`.

#### 4.4.2 Behörighetsmodell

**Konstitutionell regel:** Pedagog får endast **skapa och redigera data med `source = 'educator'`**. Familjens data (`source = 'family'`) är read-only.

| Funktion | Läs | Skapa | Ändra | Ta bort |
|----------|-----|-------|-------|---------|
| Daganteckning (`pedagog_notes`) | ✅ egen | ✅ | ✅ egen: utkast ≤7d, publicerad t.o.m. 23:59 (§4.4.5) | ❌ |
| Skolaktivitet (`pedagog_school_activity`) | ✅ egen + andras publicerade | ✅ | ✅ egen, inom tidsfönster | ✅ egen, inom tidsfönster |
| Familjens schemaaktiviteter | ✅ | ❌ | ❌ | ❌ |
| Familjens `daily_log_item` (hemma) | ✅ | ❌ | ❌ *(avbockning hemma låst)* | ❌ |
| Barnprofil | Begränsad (namn, emoji, inga kontaktuppgifter) | ❌ | ❌ | ❌ |
| Kontaktuppgifter (förälder/e-post/telefon) | ❌ | ❌ | ❌ | ❌ |
| Veckoschema | ✅ read-only (§4.4.19) | ❌ | ❌ | ❌ |
| Samarbetskommentar | ✅ | ✅ max 1/dag | ✅ egen inom 24h | ❌ |

**Authz:** `requirePedagogAccess(childId)` på alla pedagog-routes. `requireComponent('pedagog')` endast på **nya** inbjudningar (§4.3).

#### 4.4.3 Delade barn & flera pedagoger

Pedagog ser **aldrig** hela familjen — bara barn som primärföräldern explicit valt vid inbjudan.

| Regel | Detalj |
|-------|--------|
| **Vem bjuder in** | Primärförälder (`requirePrimaryParent`) |
| **Vilka barn** | `childIds[]` i `POST /api/pedagog-invite` — minst ett |
| **Åtkomst** | `parent_child` med `role=pedagog'`, `revoked_at IS NULL` |
| **Återkalla** | Förälder revokerar länk → pedagog förlorar barnet omedelbart + audit (§4.4.14) |
| **Flera familjer** | Samma pedagog-konto kan vara kopplat till barn i **flera familjer** |
| **Flera pedagoger per barn** | ✅ v1.2 — t.ex. klasslärare + resurspedagog + fritidspedagog |

**Exempel — flera pedagoger:**

```
Ella
 ├─ Anna Svensson (klasslärare)
 ├─ Johan Nilsson (resurspedagog)
 └─ Resursteam (kontaktperson)
```

Varje pedagog har **egen** anteckningsrad per dag (`UNIQUE child_id, pedagog_id, date` på `pedagog_notes`). Förälder ser **alla publicerade** anteckningar med attribution (§4.4.6). Pedagog ser och redigerar **endast egna** anteckningar.

**Pedagogöversikt visar:** `Familjnamn — Barnnamn` (t.ex. *Andersson — Ella*).

#### 4.4.4 Pedagogprofil

Föräldern ska veta **vem** personen är. Profil visas i Samarbete-fliken (§4.2) och i antecknings-attribution.

| Fält | Krav |
|------|------|
| **Namn** | Från `parent.name` — obligatoriskt |
| **Roll** | T.ex. *Klasslärare*, *Resurspedagog* — valfritt, sätts vid accept eller i profil |
| **Förskola/skola** | Organisation — valfritt |
| **Profilbild** | Valfri (`parent` avatar eller dedikerat fält) |

**Datamodell — utökning `pedagog_profile` (1:1 med `parent` för pedagog-konton):**

```sql
CREATE TABLE IF NOT EXISTS pedagog_profile (
  parent_id       UUID PRIMARY KEY REFERENCES parent(id) ON DELETE CASCADE,
  role_title      TEXT,           -- t.ex. 'Specialpedagog'
  organization    TEXT,           -- t.ex. 'Förskolan Solen'
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Fylls vid `/pedagog-invite` accept (valfria fält) eller senare under ⚙️ Inställningar.

#### 4.4.5 Tidslåsning & tidszon

**Tidszon:** Familjens `family.timezone` gäller för alla datumgränser — **inte** pedagogens enhet. Datumväljare och "idag" beräknas i familjens tidszon.

**P0-beslut — Alternativ A (anteckningar):** Publicerad anteckning låses **kl 23:59 samma dag** → `locked`. **Ingen redigering efter låsning.**

**Statusdiagram — anteckningar (enda källan):**

```
                    ┌─────────┐
         skapa ───► │ UTKAST  │◄─── auto-spar
                    └────┬────┘
                         │ publicera
                         ▼
                    ┌───────────┐
                    │PUBLICERAD │  redigerbar t.o.m. 23:59 (familjens TZ)
                    └─────┬─────┘
                          │ midnatt (cron)
                          ▼
                    ┌─────────┐
                    │  LÅST   │  permanent read-only
                    └─────────┘

UTKAST: redigerbar ≤7 dagar · äldre → read-only
```

| Datatyp | Redigeringsregel |
|---------|------------------|
| **Anteckning — utkast** | Redigerbar inom **7 dagar**; äldre → read-only |
| **Anteckning — publicerad** | Redigerbar **t.o.m. 23:59 samma dag** (familjens tidszon) |
| **Anteckning — låst** | Aldrig redigerbar |
| **Skolaktiviteter** | CRUD inom **7 dagar** |
| **Egna avbockningar** | Ångra/redigera inom **7 dagar** |
| **Samarbetskommentar** | Egen kommentar inom **24h** (§4.4.7) |

*Motivering:* Anteckningar är dagens dokumentation — lås vid midnatt. Skolaktiviteter och avbockningar behåller 7-dagarsfönster.

**Midnatt & tidszoner (P0):**

| Regel | Detalj |
|-------|--------|
| **Datumgräns** | Alltid familjens `family.timezone` — oavsett var pedagogen befinner sig |
| **Cron-lås** | `note_status: published → locked` kl 23:59 **per anteckningens `date`** (inte "nu") |
| **Utkast förbi midnatt** | Utkast för *igår* förblir `UTKAST` i historik — **inte** permanent `ÅTGÄRD KRÄVS` om < 7 dagar |
| **Retroaktiv publicering** | Pedagog öppnar utkast via Historik (§4.4.13) och publicerar i efterhand → historikstatus uppdateras **retroaktivt** `UTKAST` → `KLAR` för det datumet |
| **Låst utan publicering** | Utkast > 7 dagar utan publicering → read-only `UTKAST` i historik (inte `ÅTGÄRD KRÄVS`) |

*Dashboard visar alltid status för **valt datum** i datumväljaren — inte "idag" i pedagogens enhetstidszon.*

#### 4.4.6 Anteckningsflöde (`pedagoganteckningar`)

**Route:** `/pedagog-dag?childId=&date=` sektion 2, eller `/pedagog-note?childId=&date=`

| Fält | Typ | Syfte |
|------|-----|-------|
| Humör | 1–5 + emoji | Dagsform |
| Sömn | kvalitet + timmar | Natten innan / vilostund |
| Måltider | text + `meals_structured` JSONB | Frukost, lunch, mellanmål |
| Beteende | text | Observationer |
| Fritext | `notes` | Övrigt |

**Statusflöde** (ersätter enkel `is_draft`):

```
Utkast → Publicerad → Låst
```

| Status | DB-värde | Synlig för förälder | Redigerbar av pedagog |
|--------|----------|---------------------|----------------------|
| **Utkast** | `draft` | Nej | Ja, inom 7 dagar |
| **Publicerad** | `published` | Ja | Ja, **endast t.o.m. 23:59 samma dag** |
| **Låst** | `locked` | Ja | **Nej — permanent** |

**Migration:** `is_draft=true` → `note_status='draft'`; `is_draft=false` → `note_status='published'`. Ny kolumn `note_status TEXT NOT NULL DEFAULT 'draft'`.

**Attribution (förälder ser):**

```
Skapad av: Anna Svensson · Klasslärare
Publicerad: 17 juni 14:32
Senast ändrad: 17 juni 14:40
```

Kolumner: `created_by_parent_id`, `published_at`, `updated_at` (befintlig), `note_status`.

**Regler:**

- Pedagog ser/redigerar **endast egna** anteckningar.
- Förälder ser **alla publicerade/låsta** anteckningar från alla kopplade pedagoger — med attribution.
- Publicerade anteckningar kan ingå i rapporter (`pedagog_notes` i delningslänkar).
- Publicering triggar push till förälder (§4.4.15) + audit (§4.4.14).

**API:** `GET/POST /api/pedagog-notes`, `GET /api/pedagog-notes/overview`, `POST /api/pedagog-notes/:id/publish`.

#### 4.4.7 Samarbetskommentarer

**Inte chat.** En tråd per barn per dag — max **en kommentar från förälder** och **en från pedagog**.

```
Dag 17 juni · Ella

Förälder (08:15):
  "Sov dåligt inatt."

Pedagog (08:45):
  "Tack, vi håller extra koll idag."
```

| Regel | Detalj |
|-------|--------|
| **Scope** | `child_id` + `date` + `author_role` (`parent` \| `pedagog`) |
| **Max** | 1 rad per roll per dag (upsert) |
| **Längd** | Max 280 tecken |
| **Synlighet** | Båda sidor + i Samarbete-fliken (§4.2) |
| **Redigering** | Egen kommentar inom 24h; därefter låst |

**Datamodell — `pedagog_day_comment`:**

```sql
CREATE TABLE IF NOT EXISTS pedagog_day_comment (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id        UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  author_parent_id UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
  author_role     TEXT NOT NULL CHECK (author_role IN ('parent', 'pedagog')),
  body            TEXT NOT NULL CHECK (char_length(body) <= 280),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (child_id, date, author_role)
);
```

**API:** `GET/POST /api/pedagog/day-comments?childId=&date=`

#### 4.4.8 Frånvaro

Pedagog ska kunna markera **barn frånvarande** för en dag.

| Konsekvens | Beteende |
|------------|----------|
| **Aktiviteter** | **Visas read-only** i pedagog dagvy — checkboxar inaktiverade |
| **Banner** | *"Barn markerat som frånvarande"* högst upp i dagvy |
| **Anteckning** | Valfri — inte obligatorisk |
| **Status i översikt** | `FRÅNVARANDE` (inte "åtgärd krävs") |
| **Förälder** | Ser frånvaromarkering i daglogg med etikett *"Frånvarande (rapporterat av [pedagog])"* |

**Datamodell — `pedagog_day_absence`:**

```sql
CREATE TABLE IF NOT EXISTS pedagog_day_absence (
  child_id        UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  pedagog_id      UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
  reason          TEXT,  -- valfri kort anteckning
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (child_id, date, pedagog_id)
);
```

**API:** `PUT/DELETE /api/pedagog/absence?childId=&date=`

#### 4.4.9 Pedagogöversikt (`pedagog_dashboard`)

**Route:** `/pedagog-oversikt`

Dashboard ska visa **inloggad pedagogs egen arbetsstatus** per delat barn — **inte** aggregerat över alla pedagoger.

| Element | Funktion |
|---------|----------|
| Datumväljare | Välj dag (familjens tidszon) |
| Barnlista | Alla delade barn med **egen** arbetsstatus |
| Filter | Visa alla · åtgärd krävs · klara · frånvarande |
| Progress | *(X av Y klara)* — räknar **denna pedagogs** rader |

**P0-beslut — status är per pedagog, inte per barn:**

| Scenario | Annas dashboard | Johans dashboard | Förälder (§4.2.3) |
|----------|-----------------|------------------|-------------------|
| Anna publicerat, Johan ej | Ella = **KLAR** | Ella = **ÅTGÄRD KRÄVS** | Två separata rader |
| Båda publicerat | KLAR | KLAR | Båda anteckningar visas |
| Frånvaro markerad av Anna | **FRÅNVARANDE** | (påverkas ej) | Frånvaro visas med attribution |

**Status per barn (för inloggad pedagog):**

| Status | Villkor |
|--------|---------|
| `ÅTGÄRD KRÄVS` | **Egen** anteckning saknas/utkast **eller** egna obligatoriska aktiviteter ej klara |
| `KLAR` | **Egen** publicerad/låst anteckning + egna aktiviteter klara |
| `FRÅNVARANDE` | **Egen** frånvaromarkering (§4.4.8) |
| `UTKAST` | **Egen** anteckning påbörjad men ej publicerad |

**Dashboard & datum (P0):**

- Översikten beräknar status **endast för valt datum** (`date` i datumväljaren) — nollställs inte automatiskt vid midnatt i pedagogens tidszon.
- Vid byte till *igår*: visar gårdagens status (t.ex. `UTKAST` eller `ÅTGÄRD KRÄVS`) — inte dagens.
- **Retroaktiv uppdatering:** Om pedagog publicerar ett gammalt utkast (< 7 dagar) via Historik → raden för det datumet uppdateras till `KLAR` i både Historik och Översikt (om samma datum väljs).

**Wireframe — pedagogöversikt:**

```
←  Pedagogöversikt                    [⚙️]
(2 av 5 klara) · onsdag 17 juni

[ Datum ▾ ]  [ Filter: Åtgärd krävs ▾ ]

┌────────────────────────────────────────┐
│ 👧 Andersson — Ella                    │
│    Aktiviteter: 2/4                    │
│    Anteckning: saknas                  │
│    ○ ÅTGÄRD KRÄVS                      │
├────────────────────────────────────────┤
│ 👦 Lindqvist — Noah                    │
│    Aktiviteter: 4/4                    │
│    Anteckning: publicerad 14:32        │
│    ✓ KLAR                              │
├────────────────────────────────────────┤
│ 👧 Svensson — Maja                     │
│    FRÅNVARANDE                         │
└────────────────────────────────────────┘
```

#### 4.4.10 Dagvy — tre sektioner (`pedagog_dag`)

**Route:** `/pedagog-dag?childId=&date=`

Pedagogen tänker i **tre steg** — inte en blandad lista.

**Wireframe — pedagog dagvy:**

```
←  Andersson — Ella ▼ · onsdag 17 juni

⚠️ Barn markerat som frånvarande          ← vid frånvaro (§4.4.8)

[ Markera frånvarande ] / [ Ta bort frånvaro ]

── 1. Dagens aktiviteter ─────────────────
☑ Morgonsamling     ✓ Klar hemma 07:15    ← Modell A: ej dubbelkryss
☐ Rast              ○
☑ Lunch             ✓ 11:45  [i skolan]
   Kommentar (valfri): "Hungrig idag"     ← expanderar vid avbockning
☐ Vila              ○

── 2. Dagens dokumentation ───────────────
Humör    [ 😊 4/5 ]
Sömn     [ Bra · 9h ]
Måltider [ Lunch OK ]
Beteende [ Lugn eftermiddag ]
Status: UTKAST          [ Publicera ]

── 3. Skolaktiviteter ───────────────────
+ Utflykt
+ Grupparbete
[ + Lägg till skolaktivitet ]
```

**Sektion 1:** Familjens schemaaktiviteter + avbockning (§4.4.11).  
**Sektion 2:** Inline anteckningsformulär (§4.4.6) — samma data som `pedagog-note`.  
**Sektion 3:** Pedagogskapade aktiviteter (§4.4.12).

#### 4.4.11 Daglogg i skola (`pedagog_daglogg`)

**P0-beslut — Modell A (en avbockning per aktivitet):**

En aktivitet kan bara vara **klar en gång**. Om barnet redan kryssat av hemma:

```
☑ Borsta tänder    ✓ Klar hemma av Ella 07:15
```

Pedagog **kan inte** kryssa igen. Ingen dubbel stjärnutdelning. Ingen separat skolkontext-completion för samma rad.

| Aspekt | Spec |
|--------|------|
| **Vad visas** | Dagens schemaaktiviteter + skolaktiviteter (§4.4.12) — vid frånvaro: **read-only** + banner (§4.4.8) |
| **Vad pedagog kan** | Kryssa av ej-klara aktiviteter · ångra **egen** avbockning · valfri kommentar |
| **Vad pedagog inte kan** | Dubbelkryssa hemma-klara · ändra stjärnvärde · radera familjens aktiviteter |
| **Synlighet för förälder** | *"Avklarad i skolan av [pedagog]"* eller *"Klar hemma av [barn]"* + kommentar om finns |
| **Stjärnor** | En gång per aktivitet enligt `star_value` — diskret hint: *"Ella får 2 stjärnor"* |

**UX — `completion_comment`:**

Pedagog (vid/efter avbockning):

```
☑ Lunch
Kommentar (valfri):
[ Hungrig idag                    ]
```

Förälder (Idag / Samarbete, §4.2.3):

```
Lunch
Avklarad i skolan av Anna · 11:45
Kommentar: "Hungrig idag"
```

| Regel | Detalj |
|-------|--------|
| **Fält** | `completion_comment` på `daily_log_item`, max 280 tecken |
| **Valfritt** | Visas endast om ifyllt |
| **Redigering** | Inom 7-dagarsfönster (§4.4.5), samma transaktion som ångra avbockning |

**Datamodell — utökning `daily_log_item`:**

```javascript
{
  completed: true,
  completed_date: '2026-06-17',
  completed_by: 'child' | 'parent' | 'pedagog',
  completed_by_parent_id: uuid | null,
  completed_at: timestamptz,
  completion_source: 'family' | 'educator',  // P0: attribution
  completion_comment: string | null,         // max 280 tecken
}
```

**API:**

| Metod | Endpoint | Beskrivning |
|-------|----------|-------------|
| GET | `/api/pedagog/daily-log?childId=&date=` | Dagens aktiviteter + completion-status |
| PATCH | `/api/pedagog/daily-log/items/:id` | Markera av/ångra + `completion_comment` |

**Concurrency & felför hantering (Modell A, P0):**

| HTTP | Kod | När |
|------|-----|-----|
| **409** | `ACTIVITY_ALREADY_COMPLETED` | Pedagog försöker avbocka aktivitet som redan är klar (hemma eller skola) |
| **409** | `ACTIVITY_ALREADY_COMPLETED` | Race: barn och pedagog klickar nästan samtidigt — första transaktion vinner |

**Svar vid 409:**

```json
{
  "error": "ACTIVITY_ALREADY_COMPLETED",
  "message": "Aktiviteten är redan markerad som klar",
  "completed_by": "child",
  "completed_by_name": "Ella",
  "completed_at": "2026-06-17T07:15:00Z"
}
```

**Klient (obligatoriskt):**

1. Rulla tillbaka checkbox i UI (ingen "flicker")
2. Visa diskret toast: *"Aktiviteten uppdaterades precis av [namn]"*
3. Uppdatera raden med serverns `completed_by` / `completed_at` (ersätt cache)

*Offline v1.2: ingen write-queue — vid nätverksfel efter misslyckad PATCH, refetch dagvy.*

#### 4.4.12 Skolaktiviteter (`pedagog_skolaktivitet`)

**P0-beslut — merge-logik:**

```
POST /api/pedagog/school-activities
        ↓
skapar pedagog_school_activity (source='educator')
        ↓
skapar daily_log_item direkt (completed=false)
        ↓
visas i dagloggen omedelbart
```

**Inte** "vid första avbockning" — alltid direkt koppling.

| Aspekt | Spec |
|--------|------|
| **Scope** | Endast valt datum + delat barn |
| **Skapare** | `created_by_parent_id`, `source = 'educator'` |
| **DELETE** | Endast egna, inom tidsfönster (§4.4.5); om redan avbockad → återkalla stjärnor i samma transaktion |
| **Bibliotek** | ~20 fördefinierade + fri text + emoji |

**Datamodell — `pedagog_school_activity`:**

```sql
CREATE TABLE IF NOT EXISTS pedagog_school_activity (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id              UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  created_by_parent_id  UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
  date                  DATE NOT NULL,
  name                  TEXT NOT NULL,
  emoji                 TEXT,
  star_value            SMALLINT DEFAULT 0,
  daily_log_item_id     UUID REFERENCES daily_log_item(id) ON DELETE SET NULL,
  source                TEXT NOT NULL DEFAULT 'educator',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (child_id, created_by_parent_id, date, name)
);
```

**Wireframe — lägg till skolaktivitet:**

```
┌─────────────────────────────────────┐
│ Lägg till skolaktivitet             │
│ [ 🏃 Rast ] [ 🍎 Lunch ] [ 🚌 Utflykt ] │
│ [ + Egen aktivitet ]                │
│ Namn: [ Grupparbete        ]        │
│ Stjärnor: [ 0 ▾ ]  (valfritt)       │
│ [ Avbryt ]  [ Lägg till ]           │
└─────────────────────────────────────┘
```

#### 4.4.13 Historik

**Route:** `/pedagog-historik` (ny flik, §4.4.16)

| Innehåll | Detalj |
|----------|--------|
| **Lista** | Senaste 30 dagar per valt barn |
| **Rad** | Datum · **egen** anteckningsstatus · egna aktiviteter klara · frånvaro |
| **Klick** | Öppna dagvy read-only om låst; redigerbar om inom tillåtet fönster (§4.4.5) |
| **Sök barn** | Dropdown i header (samma som Idag-flik) |
| **Filter månad** | Välj månad (default: innevarande) |
| **Filter pedagog** | *(endast förälder i §4.2.4)* — pedagog ser alltid **egen** historik |

**Wireframe — pedagog historik:**

```
Historik

[ Barn: Ella ▼ ]  [ Månad: Juni ▾ ]

17 juni   ✓ Publicerad · 4/4 aktiviteter
16 juni   ○ Utkast · 3/4 aktiviteter
15 juni   FRÅNVARANDE
14 juni   ✓ Låst · 4/4 aktiviteter
```

Förälder har motsvarande historik i Samarbete-fliken (§4.2.4) med filter per pedagog.

#### 4.4.14 Åtkomstlogg (GDPR)

Föräldern ska kunna få svar på *"vem har tittat på mitt barn?"*

**Tabell — `pedagog_audit_log`:**

```sql
CREATE TABLE IF NOT EXISTS pedagog_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id        UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  actor_parent_id UUID REFERENCES parent(id) ON DELETE SET NULL,
  action          TEXT NOT NULL,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedagog_audit_child ON pedagog_audit_log (child_id, created_at DESC);
```

| `action` | När |
|----------|-----|
| `invite_sent` | Förälder skickar inbjudan |
| `invite_accepted` | Pedagog accepterar |
| `child_viewed` | Pedagog öppnar barnets dagvy |
| `note_published` | Anteckning publiceras |
| `activity_completed` | Avbockning i skola |
| `school_activity_created` | Skolaktivitet tillagd |
| `access_revoked` | Förälder återkallar |
| `absence_marked` | Frånvaro rapporterad |

**Retention:** 12 månader. Förälder ser sammanfattning i Samarbete → *"Senaste aktivitet"* per pedagog (§4.2.1).

**GDPR-export (krav):** `pedagog_audit_log` **ska ingå** i familjens GDPR-export (`family-export.js` / `family-export-sql.js`) — samma scope som övriga barnrelaterade tabeller (`child_id IN family children`). Primärförälder kan begära full logg via befintlig exportfunktion.

#### 4.4.15 Push-notiser

| Mottagare | Händelse | Copy (exempel) |
|-----------|----------|----------------|
| **Pedagog** | Nytt barn delat | *"Du har fått åtkomst till Ella Andersson"* |
| **Pedagog** | Åtkomst återkallad | *"Åtkomst till Ella har avslutats"* |
| **Pedagog** | Påminnelse 15:00 | *"Anteckning saknas för Ella idag"* (endast om åtgärd krävs) |
| **Förälder** | Anteckning publicerad | *"Anna Svensson publicerade en anteckning om Ella"* |
| **Förälder** | Skolaktivitet tillagd | *"Ny skolaktivitet: Utflykt (Ella)"* |
| **Förälder** | Samarbetskommentar | *"Ny kommentar från Anna om Ella"* |

Respektera befintliga `push_preferences` per `parent`. Pedagog-påminnelse är opt-in (default på för pedagog-only-konton).

#### 4.4.16 Navigation

Pedagog får **egen nav** — inte förälderns fem flikar (§6). **4 flikar** i v1.2:

| # | Flik | Route | Innehåll |
|---|------|-------|----------|
| 1 | **Översikt** | `/pedagog-oversikt` | Arbetsstatus alla barn |
| 2 | **Idag** | `/pedagog-dag?id=lastChild` | Tre-sektions dagvy |
| 3 | **Historik** | `/pedagog-historik` | Senaste 30 dagar |
| 4 | **Inställningar** | top-right ⚙️ | Profil · dual-roll · logga ut |

```
[ Översikt ]  [ Idag ]  [ Historik ]     (⚙️ top-right)
```

- Pedagog ser **aldrig** Utveckling, Rutiner (redigera), Barn/Stöd, Skattkammare, För dig, betalning.
- `rollout_mode=off` → befintlig pedagog-UI oförändrad.

**Designsystem:** Migrera pedagog-UI till v1.2-palett (§13.7) — **Samarbete = lila** — vid implementation av `pedagog-nav.js`. Befintlig Syne/amber behålls tills v1.2-nav aktiveras.

#### 4.4.17 Dagligt arbetsflöde

```
08:00  Pedagog öppnar Ella (Idag-flik)
         ↓
       Kryssar aktiviteter under dagen (Modell A — ej dubbel)
         ↓
       Lägger till skolhändelser vid behov
         ↓
       Fyller dokumentation (sektion 2)
         ↓
       Publicerar anteckning
         ↓
       Förälder får push-notis
         ↓
23:59  Anteckning låses automatiskt (familjens tidszon)
```

#### 4.4.18 Prenumeration upphör

Se **§8.5 Arkivprincip** — gäller alla paket konsekvent. Pedagog-specifikt:

| Vid arkiverad `pedagog`-komponent | Beteende |
|-----------------------------------|----------|
| **Blockera** | Nya inbjudningar · nya pedagogkopplingar · write |
| **Behåll (läsbart)** | Befintliga länkar · anteckningar · skolaktiviteter · historik · audit-logg |
| **Badge (förälder)** | *"Pedagog-funktion arkiverad. Dina anteckningar finns kvar i Arkiv."* |
| **Återaktivering** | Full write återställs · *"Fortsätt där ni slutade"* |

#### 4.4.19 Övrigt (offline, schema, stjärnor)

| Ämne | Beslut v1.2 |
|------|-------------|
| **Offline** | Read: ja (cache). Write: nej — visa banner *"Ingen uppkoppling"*. Ingen sync-queue i v1.2. |
| **Veckoschema read-only** | Idag-flik + Historik räcker; valfritt undermeny *Imorgon* / *Vecka* i dagvy-header (läs-only, familjens schema) |
| **Stjärnor** | Diskret hint vid avbockning — pedagog ser inte Skattkammare |

#### 4.4.20 Begränsningar (pedagog får INTE)

| Förbjudet | Varför |
|-----------|--------|
| Se barn som inte delats | Integritet |
| Bjuda in andra pedagoger | Endast primärförälder |
| Redigera veckoschema / aktivitetsbibliotek | Familjens struktur |
| Belöningar / Skattkammare | Hemma-motivation |
| Rapporter / PDF-export | Paket Rapportering |
| Familjeinställningar / betalning | Admin |
| Extra stöd / barn-UI | Barnläge |
| Radera familjens `daily_log_item` | Endast egna educator-rader |
| Dubbelkryssa hemma-klara aktiviteter | Modell A (§4.4.11) |
| Se föräldrars kontaktuppgifter | GDPR |

#### 4.4.21 Datakontrakt

**Princip:** Allt pedagogskapat innehåll bär `source = 'educator'` och `created_by_parent_id`.

| Entitet | Tabell | Nyckelfält |
|---------|--------|------------|
| Anteckningar | `pedagog_notes` | `pedagog_id`, `note_status`, `published_at` |
| Skolaktiviteter | `pedagog_school_activity` | `created_by_parent_id`, `source`, `daily_log_item_id` |
| Inbjudan | `pedagog_invite` | befintlig |
| Profil | `pedagog_profile` | `parent_id`, `role_title`, `organization` |
| Dagkommentar | `pedagog_day_comment` | `author_parent_id`, `author_role` |
| Frånvaro | `pedagog_day_absence` | `pedagog_id` |
| Audit | `pedagog_audit_log` | `actor_parent_id`, `action` |
| Avbockning | `daily_log_item` | `completed_by`, `completion_source`, `completion_comment` |

**Befintliga tabellnamn behålls** (`pedagog_*`) — `source='educator'` är attributionsfält, inte tabellprefix.

#### 4.4.22 API-sammanfattning & feature-slugs

| Feature slug | Komponent | Status |
|--------------|-----------|--------|
| `pedagog_invite` | `pedagog` | ✅ Live |
| `pedagoganteckningar` | `pedagog` | ⚙️ Live → `note_status` v1.2 |
| `pedagog_dashboard` | `pedagog` | ⚙️ Delvis → arbetsstatus v1.2 |
| `pedagog_daglogg` | `pedagog` | 📋 v1.2 ny |
| `pedagog_skolaktivitet` | `pedagog` | 📋 v1.2 ny |
| `pedagog_samarbete` | `pedagog` | 📋 v1.2 ny (dagkommentarer) |
| `pedagog_audit` | `pedagog` | 📋 v1.2 ny |

```javascript
pedagog: [
  'pedagog_invite', 'pedagoganteckningar', 'pedagog_dashboard',
  'pedagog_daglogg', 'pedagog_skolaktivitet', 'pedagog_samarbete', 'pedagog_audit',
],
```

#### 4.4.23 Nuläge vs v1.2

| Funktion | Idag | v1.2 mål |
|----------|------|----------|
| Inloggning + inbjudan | ✅ | + profil vid accept |
| Flera pedagoger per barn | ⚙️ Delvis (DB stödjer) | Full UX + attribution |
| Se delade barn | ✅ | + arbetsstatus-dashboard |
| Anteckningar | ✅ `is_draft` | Utkast → Publicerad → Låst |
| Samarbetskommentarer | ❌ | Per dag, max 1/sida |
| Kryssa i uppgifter | ❌ | Modell A + `completion_comment` |
| Skolaktiviteter | ❌ | Direkt `daily_log_item`-koppling |
| Frånvaro | ❌ | `pedagog_day_absence` |
| Historik-flik | ❌ | `/pedagog-historik` |
| Audit-logg | ❌ | `pedagog_audit_log` |
| Push | ❌ | §4.4.15 |
| Pedagog-nav | ❌ (enkelsida) | 4 flikar + `pedagog-nav.js` |
| Förälder Samarbete | ⚙️ Delvis | Full vy §4.2 (lista, dagvy, historik, kommentarer) |

**Filer (implementation):**

| Fil | Syfte |
|-----|-------|
| `public/pedagog-oversikt.html` | Arbetsstatus-dashboard |
| `public/pedagog-dag.html` *(ny)* | Tre-sektions dagvy |
| `public/pedagog-historik.html` *(ny)* | Historik-flik |
| `public/js/pedagog-nav.js` *(ny)* | 4-fliks bottom nav |
| `public/js/pedagog-dag.js` *(ny)* | Dagvy-logik |
| `src/routes/pedagog-daily-log.js` *(ny)* | Daglogg read/write |
| `src/routes/pedagog-school-activities.js` *(ny)* | Skolaktiviteter CRUD |
| `src/routes/pedagog-day-comments.js` *(ny)* | Samarbetskommentarer |
| `src/routes/pedagog-absence.js` *(ny)* | Frånvaro |
| `db/pedagog-*.js` | DB-lager per entitet |
| `migrations/*_pedagog_v12.js` | Alla nya tabeller + kolumner |

---

## 5. Paket 4 — Familj Extra stöd

| | |
|--|--|
| **Kundnamn** | Familj Extra stöd |
| **Komponent** | `teacch` |
| **Pris** | TBD |
| **Löfte** | Skapar mer förutsägbarhet och mindre stress i vardagen |
| **Målgrupp** | Barn som gynnas av visuellt stöd, tydliga övergångar och extra struktur |
| **Status** | 📋 Spec klar — troligen det mest emotionella paketet |

**Produkttext:** *Inspirerad av visuellt stöd och strukturerad pedagogik* — inte en officiell TEACCH-metod.

### 5.1 Innehåll v1.2

| Funktion | Feature slug | Not |
|----------|--------------|-----|
| **De sju frågorna** | `de_sju_fragorna` | Med **bild-/symbolstöd** per svar (§7.2) — inte ren text |
| **Visuell timer** | `visual_timer` | Krympande cirkel / Time Timer vid `how_long` — **inte** bara texten "5 minuter" |
| **Läs upp** | `read_aloud` | Talsyntes för aktivitet + ifyllda frågor (§7.5) |

Frågor: Vad? · Var? · Vem? · Hur länge? · Vad händer sen? · Vad behöver jag? · Varför?

**Tillgänglighetskrav (v1.2 P0):** Barn som inte läser ska kunna förstå NU-vyn utan att en vuxen läser högt — via pictogram, visuell timer och valfri uppläsning.

### 5.2 Innehåll v1.3+

| Funktion | Feature slug |
|----------|--------------|
| Distraktionsfri barnvy | `minimal_ui` |
| Övergångsstöd | `transition_support` *(planerad)* |
| Sociala berättelser | `social_stories` *(planerad)* |

*`visual_timer` finns delvis i barnvy idag (`child.visual_timer`) — v1.2 paketerar och **kräver** visuell representation i Extra stöd-läget, kopplat till `how_long`.*

### 5.3 UI-identitet

| Fokus |
|-------|
| Förutsägbarhet |
| Lugn |
| Struktur |

**Ton:** mycket lugnare än Basic — ingen visuell stress, inga stjärnor i kontextvyn.

| Basic | Extra stöd |
|-------|------------|
| ⭐ Stjärnor · 🎁 Skattkammare | NU + kontext |
| Motivation | Förutsägbarhet |

**Wireframe — De sju frågorna (v1.2):**

```
[🔊 Läs upp]                                    NU — Borsta tänderna

📍 Var?     [🚿 pictogram]  Badrummet          ← bild primär, text sekundär
👤 Vem?     [👤 pictogram]  Själv
⏱ Hur länge?  [○○○○● krympande cirkel]         ← visuell timer, inte bara "5 min"
➡ Sen?    [🥣 pictogram]  Frukost
🎒 Behöver? [🪥🧴 pictogram] Tandborste, tandkräm

[ ✓ Klar! ]
```

Tomma rader döljs. Pictogram hämtas från `icon_key` / aktivitetsbibliotek (§7.2).

**Wireframe — distraktionsfri (v1.3+):**

```
NU — Borsta tänderna
[ Klar ]
(inga menyer · inga stjärnor · inga sidfunktioner)
```

### 5.4 Gating

`requireComponent('teacch')` + per-feature flags

---

## 6. Navigation — arbetsflöden (inte paketknappar)

### 6.1 Grundprincip

När användaren har tillgång till flera paket (särskilt **alla fyra**) får menyn **inte** bli en funktionslista med 12 entry points. Paket säljs modulärt — men navigeras som **vardagslogik**.

| Fel (paketlogik) | Rätt (arbetsflöde) |
|------------------|---------------------|
| "Vilket paket innehåller detta?" | **"Vad vill jag göra nu?"** |
| En knapp per feature | Rollerad + kontextbaserad navigation |
| För dig som egen flik | För dig som modul i Idag |

**Stort grepp:** från *feature navigation* → *mental model navigation*.

### 6.2 Full åtkomst — ny huvudmeny (förälder)

**Bottom nav: max 5 items** (oförändrad mobilregel). **Inställningar** flyttas till **top-right** — inte i bottom nav.

| # | Flik | Syfte (arbetsflöde) | Paket som matar innehåll |
|---|------|---------------------|--------------------------|
| 1 | **Idag** | Allt som händer *nu* | Basic + Extra stöd (overlay) |
| 2 | **Rutiner** | Planera och strukturera vardagen | Basic |
| 3 | **Utveckling** | Förstå och följa över tid | Rapportering |
| 4 | **Samarbete** | Dela och kommunicera med andra vuxna | Pedagog |
| 5 | **Barn / Stöd** | Barnläge + behovsbaserat stöd | Basic + Extra stöd |

**⚙️ Inställningar** (top-right): konto · familjeinställningar · abonnemang · barnhantering · (tidigare *Mer*)

### 6.3 Innehåll per flik

#### 1. Idag *(ersätter Hem + delar av För dig)*

| Innehåll | Källa |
|----------|-------|
| Dagens rutiner | Basic |
| NU / NÄSTA | Basic + Extra stöd overlay |
| Snabb start av aktiviteter | Basic |
| Stjärnor idag | Basic |
| Snabb status per barn | Basic |
| **För dig-modul** *(ej egen flik)* | Basic |

**För dig inuti Idag** — modul, inte navigation:

```
Fortsätt utveckla
Rekommenderade rutiner
Nästa steg för ditt barn
```

Undvik duplicerad navigation + innehåll.

#### 2. Rutiner *(= Schema + aktivitetsbibliotek)*

| Innehåll |
|----------|
| Veckoschema |
| Specialdagar |
| Aktivitetsbibliotek |
| Delsteg |
| Mallar |

Basic *lever som system* här — inte som feed.

#### 3. Utveckling *(= Rapportering)*

| Innehåll |
|----------|
| Rapporter |
| Historik |
| PDF-export |
| Trender |
| Observationer |

Helt separat **analytiskt läge** — professionell ton (§3).

#### 4. Samarbete *(= Pedagog)*

| Innehåll |
|----------|
| Pedagoginbjudningar |
| Anteckningar |
| Gemensam vy |
| Begränsad åtkomst (schema/logg) |

Ska kännas som **extern yta** — inte familjeinterna inställningar.

#### 5. Barn / Stöd *(dynamisk hub)*

Kontextbaserad beroende på barn och aktiva paket:

| Om familjen har… | Hubben visar |
|------------------|--------------|
| **Extra stöd** (`teacch`) | De sju frågorna · visuell timer · övergångsstöd · minimal UI-läge |
| **Basic only** | Skattkammare · belöningar · genväg till barnvy |

Ersätter dagens separata *Skatt*-flik och delar av *För dig*.

### 6.4 Nav-hierarki (informationsarkitektur)

Varje funktion har **exakt en primär ingångspunkt**. Sekundära genvägar (t.ex. Idag → schema) är tillåtna men får inte duplicera hela moduler.

```
Idag                          Rutiner
├── Dagens rutiner            ├── Veckoschema
├── NU / NÄSTA                ├── Specialdagar
├── Stjärnor idag             ├── Aktivitetsbibliotek
├── Snabb status per barn     ├── Delsteg
└── För dig (modul)           └── Mallar

Utveckling                    Samarbete
├── Rapporter                 ├── Pedagoginbjudningar
├── Historik                  ├── Anteckningar
├── PDF-export                ├── Gemensam vy
├── Trender                   └── Begränsad åtkomst
└── Observationer

Barn / Stöd                   Inställningar (top-right)
├── Genväg barnvy             ├── Konto
├── Skattkammare (Basic)      ├── Familjeinställningar
└── Extra stöd-hub (teacch)    ├── Abonnemang
                              └── Barnhantering
```

| Regel | Beskrivning |
|-------|-------------|
| **En ingång** | Varje feature-slug har en primär flik/modul (denna tabell) |
| **Ingen parallell väg** | Samma modul får inte ha egen bottom-nav-flik *och* Idag-kort med samma scope |
| **Barn max 2 val** | Barnläge: Idag · Skatt — inga fler samtidiga nav-val (§14.6) |

### 6.5 Mappning — gammal → ny meny

| Idag (nuvarande) | Ny struktur |
|------------------|-------------|
| Hem | **Idag** |
| Schema | **Rutiner** |
| För dig | **Inuti Idag** (modul) |
| Skatt | **Barn / Stöd** |
| Mer | **Inställningar** (top-right) |
| *(nytt vid full access)* | **Utveckling** |
| *(nytt vid full access)* | **Samarbete** |

### 6.6 Delvis åtkomst — se allt, använd det du betalat

**Gäller endast när `rollout_mode` ≠ `off`** (§9.8). I `off`-läge: nuvarande nav och inga preview-ytor.

**Konstitutionell regel — renderingsordning (P0):** All UI som beror på paket **måste** evalueras i denna ordning — en implementation, inte tre parallella:

```
1. access        — autentisering + roll (parent / child / pedagog)
2. component     — hasComponent() + component_state (active / archived)
3. rollout       — rollout_mode (off / interest / purchase)
4. preview       — preview-shell endast om steg 2 = saknas komponent
```

| Steg | Beslutar | Exempel |
|------|----------|---------|
| **1. access** | Vem är användaren? | Barn-session → barnnav; pedagog-roll → pedagognav |
| **2. component** | Har familjen paketet? Arkiverat? | `active` → full vy; `archived` → läs + Arkiv-banner (§8.5) |
| **3. rollout** | Ska paket-UI synas alls? | `off` → ingen preview; `interest` → beta-CTA |
| **4. preview** | Mock eller riktig data? | Endast om `hasComponent === false` **och** `rollout_mode ≠ off` |

**Implementation:** `package-access.js` returnerar alla fyra dimensioner. `preview-shell.js` och `native-tab-bar.js` konsumerar **samma** objekt — aldrig separat rollout-logik per sida.

**Princip (vid `interest` eller `purchase`):** Användaren ska kunna **se alla paket** (och alla huvudflikar) men **inte använda** dem förrän de betalats eller admin tilldelat komponent. Det som visas utan köp är **mockade exempel** — inte familjens riktiga data.

**Avgörande villkor:** Tillståndet styrs av `hasComponent(familyId, component)` + `component_state`, **inte** av `rollout_mode` ensamt. `rollout_mode` styr bara CTA-copy och om preview-shellen monteras alls.

| Tillstånd | Villkor | Vad användaren ser | CTA |
|-----------|---------|-------------------|-----|
| **`off`** | `rollout_mode = off` | Nuvarande app (Hem · Schema · …) | — |
| **Aktiv komponent** | `hasComponent` + `state=active` | Riktig data, full funktion | — |
| **Arkiverad komponent** | `hasComponent` + `state=archived` | Läs + export via Arkiv (§8.5) | **Aktivera paketet igen** |
| **Saknar komponent** (`interest`) | `hasComponent = false` | Förhandsvisning med mock | **Anmäl intresse för beta** |
| **Saknar komponent** (`purchase`) | `hasComponent = false` | Förhandsvisning med mock | **Köp nu** |
| **Basic** | Alltid | Aktivt (eller ingår) | — |

**Aldrig preview för den som äger komponenten** — grandfathered reporting/pedagog-familjer (§8.4) ser sin riktiga `/reports` respektive Samarbete-vy direkt, även i `interest`-läge.

**Bottom nav (vid `interest` / `purchase`):** alla fem v1.2-flikar **syns alltid**. Flikar utan köpt paket öppnar **preview-läge**, inte tom sida eller dold flik.

```
[ Idag ] [ Rutiner ] [ Utveckling🔒 ] [ Samarbete🔒 ] [ Barn/Stöd ]
                         ↑
              mockad rapportvy + CTA (beroende på rollout_mode)
```

#### Preview-läge per flik (ej köpt)

| Flik | Mock-exempel (statiskt) | CTA (`interest`) | CTA (`purchase`) |
|------|-------------------------|------------------|------------------|
| **Utveckling** | Demo-dashboard: närvaro 92%, aktiviteter +12%, exempel-PDF | Anmäl intresse för beta | Köp Familj Rapportering |
| **Samarbete** | Demo-pedagogkort, exempelanteckning | Anmäl intresse för beta | Köp Familj Pedagog |
| **Barn / Stöd** (teacch-del) | Demo NU-kort med De sju frågorna ifyllda | Anmäl intresse för beta | Köp Familj Extra stöd |

**Regler för mock-data:**

| Regel | Detalj |
|-------|--------|
| Tydligt märkt | Banner: *"Förhandsvisning — exempeldata, inte din familj"* |
| Ingen riktig data | Mock får **inte** blanda in familjens barnnamn, loggar eller observationer |
| Ingen write | Inga spara/export/delning-knappar som fungerar — endast CTA |
| En CTA | En primär knapp per preview-yta (sekundär: *Läs mer*) — copy enligt `rollout_mode` |
| Efter köp | Samma vy byter till riktig data utan nav-omläggning |

#### Teknisk gating (oförändrad)

- **UI preview:** tillgänglig endast när `rollout_mode` ≠ `off`
- **API & write:** `requireComponent()` → 403 `COMPONENT_MISSING` + `upgrade_url`
- **Barnläge:** preview av Extra stöd gäller föräldravyn; barn ser aldrig låsta paket eller intresse-CTA

**Skilj från:** döda/låsta flikar (❌) · tom upgrade-modal vid varje klick (❌) · feature-lista utan kontext (❌)

### 6.7 Barnläge vs föräldraläge

Implicit **mode** — olika nav, samma app:

| 👩 Förälder | 👶 Barn (inloggad) |
|-------------|-------------------|
| Idag | Idag (NU/NÄSTA) |
| Rutiner | — |
| Utveckling | — |
| Samarbete | — |
| Barn / Stöd | Skatt / Stöd (enkel vy) |
| Inställningar (top-right) | — |

Barn ser aldrig Utveckling, Samarbete eller administrativa inställningar.

### 6.8 Kort sammanfattning — full access

```
Bottom nav (förälder, alla paket):
  Idag        → action
  Rutiner     → struktur
  Utveckling  → insikt
  Samarbete   → extern vuxen
  Barn/Stöd   → behov + barnläge

Top-right:
  Inställningar → meta (konto, familj, abonnemang, arkiv)
```

### 6.9 Vy-prioritering & lägeskonflikt (P0)

När flera lägen/komponenter kan gälla samtidigt — **en formell prioriteringsmatris**:

| Prioritet | Villkor | Resultat |
|-----------|---------|----------|
| **1** | Inloggad som pedagog (`role=pedagog` **eller** `preferred_view_mode=pedagog`) | **Pedagogläge** (§4.4) — 4 flikar |
| **2** | Barn-session **och** `hasComponent('teacch')` + aktiv NU | **Barn + Extra stöd** — sju frågor i NU-vy |
| **3** | Barn-session (utan teacch eller utanför aktivitet) | **Barn standard** — Idag + Skatt |
| **4** | Vuxen förälder (default) | **Föräldarläge** — 5 flikar |

**Dual-roll:** Förälder med pedagog-länkar växlar explicit via ⚙️ (§4.4.1) — auto-prioritering gäller endast vid **första** inloggning (`preferred_view_mode`).

**Exempel — barn med teacch + basic + reporting:** Barn-session öppnar **Idag/NU** (prioritet 2 om aktivitet pågår, annars 3). Rapportering och Pedagog är **föräldravyer** — barn ser dem aldrig.

**Implementation:** `resolveViewMode(user, session)` i `package-access.js` — returnerar `{ mode: 'pedagog'|'child_teacch'|'child'|'parent', … }`. Alla redirects (dashboard.js, child-login) använder samma funktion.

---

## 7. De sju frågorna — detaljspec (Extra stöd v1.2)

### 7.1 Ramverk & fältnycklar

| Fråga | Fältnyckel |
|-------|------------|
| Vad ska jag göra? | `what` |
| Var ska jag vara? | `where` |
| Vem ska jag vara med? | `who` |
| Hur länge? | `how_long` |
| Vad händer sen? | `what_next` |
| Vad behöver jag? | `what_need` |
| Varför? | `why` |

Dölj tomma fält. Kortare svar i barnvy. Delsteg = Basic (hur); sju frågor = Extra stöd (kontext).

**`what` lagras inte i `seven_questions`.** Aktivitetsnamnet (`activity_template.name` / NU-rubriken) *är* svaret på "Vad ska jag göra?". `QUESTION_ORDER` inkluderar `what` endast för renderingsordning i barnvy — värdet hämtas från aktivitetsmallen, inte dupliceras i JSONB.

**Enhetlig rendering (undvik specialfall i UI):** Vid **läsning** (GET daily-log / activities) injicerar backend ett **virtuellt** `what`-objekt så att frontend kan loopa `QUESTION_ORDER` utan undantag för första frågan:

```javascript
// vid serialisering, ej i DB
seven_questions.what = {
  text: activity.name,
  icon_key: activity.icon_key || null,
  emoji: activity.emoji || null,
  image_url: activity.avatar_url || null,
  virtual: true   // markör — sparas aldrig vid POST/PUT
};
```

`normalizeSevenQuestions()` vid **skrivning** rensar bort `what` (och alla `virtual: true`) så att det aldrig persisteras i JSONB.

### 7.2 Datamodell & API

```sql
ALTER TABLE activity_template
  ADD COLUMN IF NOT EXISTS seven_questions JSONB NOT NULL DEFAULT '{}'::jsonb;
```

**Varje svar är ett objekt — inte en ren textsträng.** Ren text räcker inte för barn som inte läser.

```json
{
  "version": 1,
  "where": {
    "text": "Badrummet",
    "icon_key": "bathroom",
    "emoji": "🚿",
    "image_url": null
  },
  "who": {
    "text": "Själv",
    "icon_key": "alone",
    "emoji": "👤",
    "image_url": null
  },
  "how_long": {
    "text": "5 minuter",
    "minutes": 5
  },
  "what_next": {
    "text": "Frukost",
    "activity_template_id": "uuid-breakfast",
    "icon_key": null,
    "emoji": null
  },
  "what_need": {
    "text": "Tandborste, tandkräm",
    "items": [
      { "text": "Tandborste", "icon_key": "toothbrush", "emoji": "🪥" },
      { "text": "Tandkräm", "icon_key": "toothpaste", "emoji": "🧴" }
    ]
  }
}
```

| Fält (rot) | Typ | Syfte |
|------------|-----|-------|
| `version` | number | Schemaversion — börja på `1`; krävs för framtida migreringar |

| Fält per svar | Typ | Syfte |
|---------------|-----|-------|
| `text` | string | Föräldredigering + uppläsning (max 500 tecken) |
| `icon_key` | string? | Nyckel till pictogram-bibliotek |
| `emoji` | string? | Fallback-symbol |
| `image_url` | string? | **Egen familjebild** (foto på badrum, mamma, …) — *rekommenderad nivå* för maximal tillgänglighet (§14.1) |
| `activity_template_id` | uuid? | Referens till aktivitetsmall — `what_next` (och senare `where`/`who`) ärver emoji, namn, bild |
| `minutes` | number? | Endast `how_long` — driver visuell timer |
| `items` | array? | Endast `what_need` — flera objekt med egna symboler |

**Pictogram-bibliotek (v1.2):** `config/seven-questions-pictograms.js` — stabilt schema från dag ett:

```javascript
{
  key: 'bathroom',
  label: 'Badrum',
  category: 'place',       // place | person | object | activity | abstract
  emoji: '🚿',
  image_url: '/pictograms/bathroom.svg',
  locale: { sv: 'Badrum' } // v1.3+ lokalisering
}
```

~40 seedade pictogram. Kategorier möjliggör sökning, filtrering och framtida egna bilder utan schemaändring.

**Koppling till aktivitetsbibliotek:** `activity_template_id` på `what_next` (v1.2 P0) — NÄSTA ärver automatiskt ikon, namn och metadata från nästa aktivitet. Samma mönster kan utökas till `where`/`who` i v1.3.

**Referensintegritet `what_next.activity_template_id`:**

| Händelse | Beteende |
|----------|----------|
| Refererad mall finns | Ärv `name`, `emoji`, `icon_key`, `image_url` till NÄSTA-kort |
| Mall raderas eller tillhör annan familj | **Frys** `what_next`: sätt `activity_template_id = null` men **behåll** `text`, `emoji`, `icon_key`, `image_url` i JSONB (snapshot) |
| API validering vid save | Avvisa `activity_template_id` som inte tillhör familjen |

*Vid scrub får NÄSTA-kortet aldrig bli tomt — barnet ska alltid se fryst visuellt tillstånd (§14.8).*

**Abstrakta svar (`why` m.m.) — visuellt stöd:**

Fält som *Varför?* kan inte alltid mappas till ett konkret pictogram. Strategi:

| Prioritet | Källa |
|-----------|-------|
| 1 | Förälder väljer `icon_key` från kategori *abstract* / *emotion* i pictogram-biblioteket |
| 2 | Förälder laddar upp `image_url` (familjefoto) |
| 3 | Auto-fallback: `emoji` från heuristik (`why` → 💡, `who` → 👤, `where` → 📍) |
| 4 | Aldrig ren text i barnvy — minst emoji måste finnas efter `normalizeSevenQuestions()` |

Pictogram-biblioteket ska inkludera en *abstract*-kategori (~8 st: t.ex. `health` 😁, `safety` 🛡️, `routine` 🔁, `calm` 😌) för Varför-svar.

**Barnvy — renderingsprioritet (obligatorisk):**

```
1. image_url     → familjefoto (störst)
2. icon_key      → pictogram från bibliotek
3. emoji         → explicit eller auto-genererad från icon_key/kategori
4. (aldrig)      → enbart text utan visuellt stöd
```

Om endast `text` finns: `normalizeSevenQuestions()` tilldelar **auto emoji-fallback** — barnet ska aldrig möta en ren textrad. Föräldervy visar mjuk uppmaning: *"Lägg till bild för bättre stöd"* (inte blockerande fel).

**Fallback baseras på fältnyckel — aldrig på textinnehåll (v1.2).** Systemet tolkar **inte** strängens betydelse (ingen "skola" → 🏫-matchning) — det undviker en i18n-mardröm i v1.3. Endast vilket fält det är avgör emoji:

| Fält | Auto-emoji |
|------|-----------|
| `where` | 📍 |
| `who` | 👤 |
| `how_long` | ⏱ |
| `what_next` | ➡️ |
| `what_need` | 🎒 |
| `why` | 💡 |

Vill föräldern ha en specifik bild väljer hen `icon_key` ur biblioteket eller laddar upp `image_url` — textmatchning sker aldrig automatiskt.

| Metod | Endpoint | Ändring |
|-------|----------|---------|
| GET/POST/PUT | `/api/activities` | `seven_questions` (objekt per fält) |
| GET | `/api/children/me/daily-log` | Berika från `activity_template` |
| GET | `/api/pictograms` *(ny)* | Lista tillgängliga `icon_key` + URL/emoji |

### 7.3 Tekniska krav

```javascript
const QUESTION_ORDER = [
  'what', 'where', 'who', 'how_long', 'what_next', 'what_need', 'why',
];
```

`normalizeSevenQuestions(input)` — trimma `text`, sätt `version: 1` om saknas, ta bort tomma fält, rensa `what` + alla `virtual: true`, validera `icon_key` mot bibliotek, `minutes` 1–120 för `how_long`, max 500 tecken per `text`, tillämpa **fältbaserad** auto emoji-fallback (§7.2) om inget visuellt finns.

**Datagränser `what_need.items` (P0):**

| Gräns | Värde |
|-------|-------|
| Max antal items | **5** |
| Max tecken per item `text` | **30** |
| Överskridande | Trunkera eller avvisa med `400 VALIDATION_ERROR` vid save |

*Motivering:* Förhindrar att NU-kortet spricker i barnvyn.

**Bakåtkompatibilitet:** Legacy-sträng (`"Badrummet"`) → `{ text: "Badrummet", emoji: "📍" }` (fältbaserad fallback, ej textmatchning). Aldrig text-only i barnvy.

### 7.4 Barnvy — NU-kort

```
1. Aktivitetsnamn
2. Delsteg (Basic, om aktivt)
3. De sju frågorna (Extra stöd, om aktivt)
4. Klar
```

NÄSTA-kort synligt (övergångsstöd). Redigering i biblioteket (progressive disclosure).

### 7.5 Tillgänglighet — icke-läsande barn (v1.2 P0)

Tre **kritiska broar** mellan text och visuell förståelse — utan dessa fungerar Extra stöd inte för målgruppen.

| # | Bro | v1.2-krav | Spec |
|---|-----|-----------|------|
| 1 | **Bild-/symbolstöd** | Varje ifyllt svar har pictogram (§7.2) | Utan `icon_key`/`emoji`/`image_url` = ofullständigt svar i barnvy |
| 2 | **Visuell timer** | `how_long` → krympande cirkel (befintlig Time Timer) | Texten "5 minuter" är **sekundär** — aldrig enda representationen |
| 3 | **Läs upp** | `read_aloud` — högtalarikon på NU-kortet | Web Speech API (web) · native TTS (iOS/Android) · läser aktivitet + ifyllda frågor |

**Läs upp — beteende:**

```
[🔊]  →  "Nu ska du borsta tänderna.
          Du ska vara i badrummet.
          Du är själv.
          Det tar ungefär fem minuter."
```

- En tryckning = hela NU-kontexten (aktivitet + alla ifyllda sju frågor)
- Språk: `sv-SE` i v1.2 (appens huvudspråk); i18n för TTS = v1.3+
- Respekterar `prefers-reduced-motion` / systemets "läs inte automatiskt"
- Gated: `requireComponent('teacch')` + `hasFeature('read_aloud')`
- **Fallback:** Om TTS ej tillgänglig (webbläsare/enhet) → **dölj högtalarknappen** — aldrig visa knapp som ger felmeddelande i barnvy

**Visuell timer — beteende (Extra stöd):**

- **Primär datakälla:** `seven_questions.how_long.minutes` (1–120) satt av förälder i biblioteket
- **Sekundär källa:** `weekly_schedule_item` / `special_day_schedule_item` med `start_time` + `end_time` — används om `minutes` saknas men schemat har tidsintervall
- **Precedens:** `how_long.minutes` > schema `start_time`/`end_time` > ingen timer (dölj timer-UI)
- Samma SVG-cirkel som idag i `child-dashboard.js` (`initTimeTimers`)
- Vid `teacch`: timer **alltid synlig** när någon tidskälla finns — förälder kan inte lämna barnet med enbart text
- Paketeras under `visual_timer` i `teacch`-komponenten

**Barn-nav — strikt nedstängning (§13.4):**

| Läge | Bottom nav |
|------|------------|
| Barn Basic | **Endast** Idag · Skatt — inga Rutiner, Mer, Inställningar |
| Barn Extra stöd (NU aktiv) | **Dölj bottom nav** tills aktivitet är avklarad — barnet ska inte kunna "villa bort sig" |
| Efter ✓ Klar | Visa Idag · Skatt igen |

**Nödutgång — obligatorisk (v1.2 P0):** Dold bottom nav får **aldrig** låsa in barnet utan väg ut. En vuxen ska alltid kunna avbryta en pågående aktivitet om vardagen krisar (barnet vägrar klicka Klar, timern fryser, nät tappas).

| Krav | Spec |
|------|------|
| **Vuxen-gated avbryt** | Långtryck 3 s i ett hörn (eller diskret ✕ som kräver bekräftelse) → stänger aktiviteten, återställer nav |
| **Inte barntillgänglig** | Får inte vara en stor synlig knapp barnet råkar trycka — gestbaserad eller bekräftelsesteg |
| **Ingen stjärna utdelas** | Avbruten aktivitet räknas inte som genomförd (ingen `daily_log_item`-completion) |
| **Timer-frys / offline** | Timern är klientberäknad (ingen nätverksberoende) — men avbryt fungerar även om allt annat hänger |
| **Återgång** | Efter avbryt: barnet tillbaka till Idag-listan, nav synlig igen |

---

## 8. Tekniskt paketregister

Målbild för `config/subscription-components.js`:

```javascript
// Priser/metadata — själva köpet sker via IAP (RevenueCat), inte Stripe (§9.7)
const PACKAGE_COMPONENT_MAP = {
  basic_app: {
    name: 'Basic',
    price_monthly_sek: 59,
    rc_product_id: null, // App Store / Play Console via RevenueCat
  },
  reporting: {
    name: 'Familj Rapportering',
    price_monthly_sek: 19,
    rc_product_id: null,
  },
  pedagog: {
    name: 'Familj Pedagog',
    price_monthly_sek: null,
    rc_product_id: null,
  },
  teacch: {
    name: 'Familj Extra stöd',
    price_monthly_sek: null,
    rc_product_id: null,
  },
};
```

*Befintlig export `STRIPE_COMPONENT_MAP` kan bytas namn vid implementation — innehållet är paketmetadata, inte betalningskanal.*

**Betalning:** endast plattforms-IAP (§9.7). Ingen Stripe-checkout, inga kortformulär, inga externa betalningslänkar i appen.

### 8.1 Komponentregister

Se `config/subscription-components.js` (metadata) och `config/component-feature-map.js` (feature → komponent). Fyra komponenter: `basic_app`, `reporting`, `pedagog`, `teacch`. Priser är metadata för köp-live — visas endast när `rollout_mode=purchase` och `show_prices=true`.

### 8.2 Gating — två nivåer

| Nivå | API | Syfte |
|------|-----|-------|
| **Komponent** | `hasComponent('teacch')` / `requireComponent('teacch')` | Paketköp — "har familjen Extra stöd?" |
| **Feature** | `hasFeature('visual_timer')` / `requireFeature('read_aloud')` | Finmaskig rollout inom paket (v1.3: `social_stories`, `minimal_ui` utan nytt paket) |

Middleware i `src/middleware/require-component.js` utökas med `requireFeature(slug)` som kollar `family_features` + komponent-mapping (§8.1).

```javascript
// Exempel
if (hasComponent('teacch') && hasFeature('de_sju_fragorna')) { … }
if (hasFeature('read_aloud') && ttsAvailable) { showSpeakerButton(); }
```

### 8.3 Feature-slug → komponent (register)

| Komponent | Feature slugs |
|-----------|---------------|
| `basic_app` | `for_dig`, `veckoschema`, `specialdagar`, `kalender`, `aktivitetsbibliotek`, `daglogg`, `manuella_stjarnor`, `beloningssystem`, `skattkammar_universum`, `familjeinbjudan`, `barninloggning`, `push_notiser`, `onboarding` |
| `reporting` | `klinisk_rapportering` |
| `pedagog` | `pedagog_invite`, `pedagoganteckningar`, `pedagog_dashboard`, `pedagog_daglogg`, `pedagog_skolaktivitet` |
| `teacch` | `de_sju_fragorna`, `visual_timer`, `read_aloud`, `minimal_ui`, `transition_support`, `social_stories` |

*(Planerade slugs: `transition_support`, `social_stories` — lägg till i `seed-features.js` vid implementation.)*

### 8.4 Grandfathering — befintliga familjer

Flera tilläggspaket-features är **redan live** utan komponentköp (`klinisk_rapportering`, `pedagog_invite`, `pedagoganteckningar`). Införande av `requireComponent()` får **inte** ta bort funktioner familjer redan använder.

**Migreringsregel (Fas 0, före gating live):**

| Familj | Villkor | Åtgärd |
|--------|---------|--------|
| Använder rapporter idag | ≥1 `professional_share_link` **eller** ≥1 rapportexport senaste 12 mån | `grantComponent(familyId, 'reporting')` — permanent, ingen `expires_at` |
| Har aktiv pedagog | ≥1 `parent_child` med `role=pedagog` och `revoked_at IS NULL` | `grantComponent(familyId, 'pedagog')` |
| `lifetime_free` | Alltid | Behåll **endast** `basic_app` — inga tillägg automatiskt |
| Övriga | — | Ingen tilläggskomponent; preview enligt `rollout_mode` |

**Implementation:** engångsmigration `migrations/*_grandfather_package_components.js` + logg i admin. `package-access.js` läser komponent från DB — grandfathering är data, inte specialfall i middleware.

**Efter migration:** nya familjer behöver komponent (köp, admin eller intresse-beta) för tillägg. Befintlig funktion = behållen åtkomst.

### 8.5 Arkivprincip & komponentlivscykel (P0)

**Konstitutionell regel:** Nedgradering, uppsägning eller borttagning av ett paket får **aldrig radera** användargenererat innehåll. Paket styr **åtkomstnivå** (läs/skriv/skapa), aldrig existensen av data.

```
Aktivt paket     → läs + skriv + skapa
Arkiverat paket  → läs + export (skrivskyddat)
Återaktiverat    → full åtkomst · historik laddas automatiskt
```

#### Komponenttillstånd

Utöka `family_subscriptions.components` JSONB per komponent:

```javascript
{
  component: 'reporting',
  state: 'active',      // 'active' | 'archived' | 'disabled'
  granted_at: '…',
  expires_at: null,     // null = grandfathered/permanent
  archived_at: null
}
```

| `state` | Läs | Skapa | Redigera | Export |
|---------|-----|-------|----------|--------|
| **active** | ✅ | ✅ | ✅ | ✅ |
| **archived** | ✅ | ❌ | ❌ | ✅ |
| **disabled** | ❌ *(saknas helt — aldrig haft paketet)* | — | — | — |

`hasComponent(familyId, c)` = `true` om `state ∈ { active, archived }`. Write-routes kräver `state === 'active'`.

#### Per paket — vad arkiveras

| Paket | Arkiverat innehåll (behålls) | Vid återaktivering |
|-------|------------------------------|-------------------|
| **Pedagog** | Anteckningar · skolaktiviteter · kommentarer · audit · relationer | *"Fortsätt där ni slutade"* |
| **Rapportering** | Rapporter · PDF:er · delningslänkar · trenddata | Samma historik tillgänglig |
| **Extra stöd** | `seven_questions` · pictogram · sessioner · anpassningar | Barn-NU återfår teacch-overlay |
| **För dig** *(Basic)* | Sparade rekommendationer · favoriter · historik | Oförändrat (ingår i Basic) |

**Banner (arkiverat):**

```
Detta innehåll tillhör paketet [Rapportering].
Aktivera paketet igen för att fortsätta använda funktionen.
[ Aktivera ]
```

#### Global Arkiv-vy

**Route:** Inställningar → **Arkiv**

```
Arkiv

Rapportering        124 rapporter
Pedagog             43 anteckningar
Extra stöd          12 scheman

[ Exportera allt ]   ← GDPR + användarexport
```

Klick på rad → läs-only lista. CTA *Aktivera* om `state=archived`.

#### GDPR & användarförväntan

| Användaren tror | Verklighet (v1.2) |
|-----------------|-------------------|
| *"Jag slutade betala → data försvann"* | ❌ Förbjudet |
| *"Data finns kvar → jag kan exportera → återaktivera senare"* | ✅ Korrekt |

`pedagog_audit_log` och allt arkiverat innehåll ingår i `family-export` (§4.4.14).

#### Ny inbjudan vs arkiv

| Situation | Beteende |
|-----------|----------|
| Komponent **active** | Full funktion |
| Komponent **archived** | Befintlig data läsbar; **blockera** nya inbjudningar/write tills återaktiverat |
| Komponent **disabled** (aldrig haft) | Preview enligt `rollout_mode` (§6.6) |

*Ersätter tidigare specialfall per paket — Pedagog, Rapportering och Extra stöd följer samma modell.*

### 8.6 API-versionering & concurrency (P1)

#### API-versionering

v1.2 behåller befintliga routes utan `/v1`-prefix (bakåtkompatibilitet). **Nya** pedagog-routes namespacas:

```
/api/pedagog/*          — v1.2 pedagog-API (breaking changes → /api/pedagog/v2/*)
/api/subscription/access — inkluderar component_state + view_mode
```

**Regel:** Breaking payload-ändring kräver ny path eller `Accept-Version` header — dokumenteras i §17.2.

#### Concurrency

| Scenario | Regel v1.2 |
|----------|------------|
| Två föräldrar redigerar samma aktivitet | **Last-write-wins** på `activity_template` |
| Två pedagoger, samma barn, samma dag | **Separata rader** (`UNIQUE child_id, pedagog_id, date`) — ingen konflikt |
| Pedagog + barn avbockar samma aktivitet | **Modell A** (§4.4.11) — första completion vinner; andra får **409 `ACTIVITY_ALREADY_COMPLETED`** |
| Samarbetskommentar | Upsert per `(child, date, role)` — senaste vinner inom 24h |

**Standardiserade felkoder (pedagog daglogg):**

| Kod | HTTP | Klientåtgärd |
|-----|------|--------------|
| `ACTIVITY_ALREADY_COMPLETED` | 409 | Rollback UI + toast med `completed_by_name` (§4.4.11) |
| `ACCESS_REVOKED` | 403 | Hård redirect till översikt (§4.4.1) |
| `EDIT_WINDOW_EXPIRED` | 403 | Visa låst läge; redirect till read-only |

**v1.3+:** Optimistic locking (`updated_at` / ETag) på `pedagog_notes` och `daily_log_item` om supportärenden kräver det.

### 8.7 Datamodell — framtida överväganden (ej v1.2)

| Postponerat | Motivering |
|-------------|------------|
| `activity_event` (global händelseström) | v1.3 — en källa för audit + historik + analytics + push |
| `child_access` (ersätter `parent_child` för pedagog) | v1.3+ — renare när flera roller växer |

---

## 9. Uppgradering & förhandsvisning (Köp nu)

### 9.1 Uppgraderingssidan (`/upgrade`)

Fyra löfteskort — rubrik = nytta. **Alla fyra syns när `rollout_mode` ≠ `off`**; i `off`-läge förblir nuvarande `/upgrade` oförändrad.

| Kort | Rubrik | `off` | Intressefas | Köp-live |
|------|--------|-------|-------------|----------|
| Basic | Vardagens grundfunktioner | Oförändrad sida | *Ingår* / aktiv | *Ingår* / aktiv |
| Rapportering | Följ utveckling över tid | — | Preview + **Anmäl intresse** | Preview + **Köp nu** eller *Aktivt* |
| Pedagog | Samarbeta med pedagoger | — | Preview + **Anmäl intresse** | Preview + **Köp nu** eller *Aktivt* |
| Extra stöd | Ökad förutsägbarhet | — | Preview + **Anmäl intresse** | Preview + **Köp nu** eller *Aktivt* |

**Intressefas:** inga priser (kr/mån) på kort eller preview — se §9.8.

Varje ej köpt kort visar **en mockad miniatyr** (skärmdump eller inline-demo) — inte bara en checklista.

### 9.2 Köp nu — enhetligt beteende

**CTA-läge styrs av rollout-fas (§9.8):** under *intressefas* visas **Jag är intresserad** istället för Köp nu.

| Element | Spec |
|---------|------|
| **Knapp (köp-live)** | `Köp nu` (primär) — när `PACKAGES_ROLLOUT_MODE=purchase` |
| **Knapp (intressefas)** | Se godkänd copy §9.8 — t.ex. *Anmäl intresse för beta* |
| **Placering** | Preview-banner (top) · bottom sticky på mobil · uppgraderingskort |
| **Klick (intressefas)** | `POST /api/subscription/interest` → bekräftelse *"Tack! Vi har noterat ditt intresse."* |
| **Klick (native iOS, köp-live)** | Öppna RevenueCat/StoreKit — **Apple** plattformsbetalning (App Store) |
| **Klick (native Android, köp-live)** | Öppna RevenueCat/Play Billing — **Google** plattformsbetalning (Play Store) |
| **Klick (webb/PWA, köp-live)** | **Ingen checkout** — *"Öppna i appen för att köpa"* |
| **Efter köp** | Webhook → `family_subscriptions.components` → preview ersätts av riktig vy |

### 9.3 Preview-mockar (innehåll)

Statiskt exempelinnehåll — fiktiva namn och siffror. **CTA-copy styrs av `rollout_mode`** (§9.8) — exemplen nedan visar `purchase`; i `interest` ersätts knapptext med *Anmäl intresse för beta*.

**Utveckling (reporting):**
```
Förhandsvisning — exempeldata
Senaste 30 dagarna · Närvaro: 92% · Aktiviteter: +12%
[ CTA enligt rollout_mode ]
```

**Samarbete (pedagog):**
```
Förhandsvisning
Emma Larsson, specialpedagog — "Övergång till lunch gick bättre idag."
[ CTA enligt rollout_mode ]
```

**Extra stöd (teacch):**
```
Förhandsvisning — De sju frågorna
NU: Borsta tänderna · Var? Badrummet · Sen? Frukost
[ CTA enligt rollout_mode ]
```

### 9.4 Var preview visas

| Yta | Beteende |
|-----|----------|
| Bottom nav-flik (ej köpt) | Fullskärms-preview med mock — **endast** `rollout_mode` ≠ `off` |
| Uppgraderingssida | Miniatyr + CTA per kort — **endast** `rollout_mode` ≠ `off` |
| Djup länk till låst feature | Redirect till preview eller upgrade med `?component=` |
| Inställningar → Abonnemang | Alla paket med status Aktivt / CTA — **endast** `rollout_mode` ≠ `off` |

Tillägg kombinerbara. Totalpris vid flerval på upgrade-sidan — **endast** när `show_prices=true` (`purchase`).

### 9.5 Kontextuella uppgraderingspunkter (konvertering)

Utöver passiv preview — visa CTA när användaren naturligt behöver paketet:

| Paket | Trigger | Copy (exempel) | CTA (intressefas) |
|-------|---------|----------------|-------------------|
| **Rapportering** | ≥14 dagar med aktivitetsdata | *"Du har registrerat aktiviteter i två veckor…"* | Jag är intresserad av Rapportering |
| **Pedagog** | Förälder försöker bjuda in extern vuxen | *"Vill du samarbeta med pedagog?"* | Jag är intresserad av Pedagog |
| **Extra stöd** | Förälder redigerar aktivitet / sju frågor | *"Lägg till visuellt stöd…"* | Jag är intresserad av Extra stöd |

Vid `PACKAGES_ROLLOUT_MODE=purchase` → samma triggers med **Köp nu** istället.

Triggers är **icke-blockerande** i v1.2 (banner/modal med dismiss) — men ska loggas i `analytics_events` för A/B.

### 9.6 Centralt preview-register

En källa för all mock-data — samma innehåll i bottom-nav-preview, `/upgrade` och djup länkar:

```javascript
// config/preview-data.js
module.exports = {
  reporting: { /* statisk rapport, trender, PDF-miniatyr */ },
  pedagog:   { /* fiktiv pedagog, anteckning */ },
  teacch:    { /* NU-kort med sju frågor + pictogram */ },
};
```

**Regel:** Ingen familjedata i preview. Alla vyer importerar från `preview-data.js` — inte hårdkodad demo per sida.

### 9.7 Betalning — endast Apple / Google (plattforms-IAP)

**Beslut:** Betalning sker **enbart** via respektive appbutiks betalning — inte via webben, Stripe eller egna kortformulär.

| Plattform | Betalning | Teknik | Tillåtet i UI |
|-----------|-----------|--------|---------------|
| **iOS-app** | Apple (App Store) | RevenueCat + StoreKit | Native köpdialog; Face ID / Apple Pay som betalmetod på Apples sida |
| **Android-app** | Google (Play Store) | RevenueCat + Play Billing | Native köpdialog; Google Pay som betalmetod på Googles sida |
| **Webb / PWA** | **Ingen köp-UI** | — | Preview + Köp nu → ladda ner-flöde; **aldrig** Stripe-länk eller kortfält |
| **Webb / PWA (efter köp)** | **Full funktion** | Samma konto | Läs + skriv enligt `package-access` — **endast själva köptransaktionen** blockeras på webben |

**Motivering:**
- Apple App Store Review Guideline 3.1.1 — digitala abonnemang i iOS-app ska via IAP
- Google Play Billing Policy — motsvarande för Android
- En köpväg per plattform — familjens `family_subscriptions` synkas via RevenueCat webhook (befintlig `src/routes/iap.js`)

**Köpflöde (native):**

```
Köp nu → iap-manager.js → Purchases.purchasePackage()
  → iOS: StoreKit (Apple)  /  Android: Play Billing (Google)
  → RevenueCat webhook → family_subscriptions.components
```

**Fyra paket i v1.2** mappas till RevenueCat *offerings/packages* (ett eller flera produkt-ID:n per komponent — produktbeslut vid IAP-setup).

**Förbjudet överallt i native:**
- Stripe Checkout / Polsia Stripe-proxy i appen
- Länkar till webb-betalning (`upgrade.html` med kortbetalning)
- Text som uppmanar att betala utanför App Store / Play Store

**Webb/PWA — Köp nu-beteende:**

Renodlade webb-/PWA-användare har **ingen native-app att hoppa till** — *"Öppna appen"* blir en återvändsgränd. Detektera plattform via `window.Capacitor?.isNativePlatform()` och visa rätt flöde:

| Kontext | Detektering | Flöde |
|---------|-------------|-------|
| **Native (Capacitor)** | `isNativePlatform() === true` | StoreKit / Play Billing direkt |
| **Webb / PWA / desktop** | `isNativePlatform()` falskt/odefinierat | **Ladda ner-flöde** — inte "öppna appen" |

```
┌─────────────────────────────────────┐
│ Köp Familj Rapportering              │
│                                     │
│ Köp sker i mobilappen via App Store  │
│ eller Google Play.                  │
│                                     │
│ Skanna för att hämta appen:          │
│   [ QR-kod ]                        │
│                                     │
│ [ App Store ]  [ Google Play ]      │
│ [ Skicka nedladdningslänk via SMS ] │
└─────────────────────────────────────┘
```

- **QR-kod / store-knappar:** leder till appbutik (inte en död "öppna app"-länk)
- **SMS-länk** *(valfritt v1.2)*: skicka nedladdningslänk till telefonen
- **Efter köp i appen:** Användaren loggar in på webben/PWA med samma konto → `package-access.js` läser DB → **full läs/skriv** för köpta paket (samma som native). Preview försvinner automatiskt.
- **Framtida webb-checkout:** om Apple/Google-policy tillåter extern betalning för webb-plattformen kan en webb-exklusiv Stripe-länk läggas till här — men **aldrig** i native-builden (§9.7 förbjudet)

**Admin / livstidsgratis:** `lifetime_free` och manuell komponenttilldelning i admin kvarstår — utan IAP.

**Referens:** `docs/app-store-iap.md` · `src/routes/iap.js` · `public/js/iap-manager.js`

### 9.8 Intressefas — fake door / smoke test före köp-live

**Beslut:** Alla delar i v1.2 **kan byggas i kod** — men **synlig funktion styrs av admin** via `PACKAGES_ROLLOUT_MODE`. Familjer går inte live med Rapportering, Pedagog eller Extra stöd förrän datat motiverar det. Under intressefasen ser familjer **som saknar komponenten** mock-preview och kan anmäla intresse via en **beta-väntelista** — inte en trasig köpknapp.

> **Kritisk regel (grandfathering, §8.4):** Preview visas **endast** om `hasComponent(familyId, component) === false`. En familj som behållit/tilldelats komponenten (grandfathered eller admin-tilldelad) ser sin **riktiga data direkt** — oavsett `rollout_mode`. En lojal familj som använt rapporter i ett år får **aldrig** "Anmäl intresse för beta" istället för sina egna rapporter.

*Produktmetod: **fake door test** / **smoke test** — validera köpintention och paketprioritet innan IAP och full implementation.*

| Fas | `PACKAGES_ROLLOUT_MODE` | CTA | Vad familjer får |
|-----|-------------------------|-----|------------------|
| **Av** *(default vid deploy + App Review)* | `off` | — | **Ingen ny UI** — appen beter sig exakt som idag |
| **Intressefas** *(admin aktiverar)* | `interest` | **Anmäl intresse för beta** *(ej "Köp")* | Mock-preview · väntelista · ingen write · ingen IAP · **inga priser** |
| **Köp-live** *(admin aktiverar)* | `purchase` | **Köp nu** | Preview → IAP (§9.7) eller aktivt paket |

**Default:** `off`. All v1.2-kod kan ligga i produktion utan att användare ser något — tills admin (Pontus) sätter `interest` eller `purchase`.

**Full funktion per familj:** Oberoende av rollout-läge kan admin tilldela komponenter i `family_subscriptions` (t.ex. ge `teacch` till en testfamilj) — då får familjen riktig funktion utan mock.

**Varför:** Mät efterfrågan bland befintliga föräldrar innan IAP-produkter, priser och support kapas — utan att påverka pågående App Review.

#### Godkänd copy (intressefas)

| ❌ Använd inte | ✅ Använd istället |
|---------------|-------------------|
| Köp nu | **Anmäl intresse för beta** |
| Lås upp / Aktivera | **Håll mig uppdaterad** |
| Pris (t.ex. 19 kr/mån) | *(ingen prisinfo)* |
| "Funktionen är inte klar" | *"Förhandsvisning — lanseras under [period]"* |

**Primär CTA per paket (rekommenderat):**

| Paket | Knapptext |
|-------|-----------|
| Rapportering | Anmäl intresse för beta |
| Pedagog | Anmäl intresse för beta |
| Extra stöd | Anmäl intresse för beta |

Alternativ: *Håll mig uppdaterad* · *Ansök om tidig tillgång*.

#### Vad alla familjer ser (intressefas)

Preview-sidan är en **förhandsvisning + väntelista** — inte en placeholder med död knapp.

```
┌─────────────────────────────────────┐
│ Förhandsvisning — Familj Rapportering │
│                                     │
│ Så här kan det se ut när funktionen  │
│ lanseras. Exempeldata — inte din familj. │
│                                     │
│ [ mockad dashboard ]                │
│                                     │
│ Vi bjuder in familjer till stängd   │
│ beta. Anmäl intresse så meddelar vi │
│ när er familj kan aktivera det.     │
│                                     │
│ [ Anmäl intresse för beta ]         │
└─────────────────────────────────────┘
        ↓ klick
┌─────────────────────────────────────┐
│ Tack!                               │
│ Vi har lagt till er familj på       │
│ väntelistan för beta.               │
│ Du får en notis när funktionen      │
│ blir tillgänglig.                   │
└─────────────────────────────────────┘
```

| Flik / paket | Innehåll | CTA |
|--------------|----------|-----|
| **Utveckling** (reporting) | Mock-rapport, trender | Anmäl intresse för beta |
| **Samarbete** (pedagog) | Mock-pedagog | Anmäl intresse för beta |
| **Barn/Stöd** → Extra stöd (teacch) | Mock De sju frågorna | Anmäl intresse för beta |
| **Basic** | Full funktion | — |

**Gäller även `lifetime_free`.**

| Regel | Beskrivning |
|-------|-------------|
| En knapp per preview | Primär CTA — **aldrig** Köp nu i intressefas |
| **Inga priser** | Varken på preview, `/upgrade` eller triggers |
| Ingen write | API/write fortfarande `requireComponent()` — 403 |
| Barnläge | Barn ser **inte** intresse-CTA eller tilläggspreview |
| Dubbelklick | *"Ni står redan på väntelistan"* (mjuk bekräftelse) |
| Sekundär | Valfri kort kommentar (max 280 tecken) |

#### Apple App Review & Google Play (kritiskt)

Intressefasen får **inte** se ut som en trasig IAP-knapp.

| Riktlinje | Risk | Åtgärd |
|-----------|------|--------|
| **Apple 2.1** App Completeness | Knapp → "vi bygger detta" = **avvisning** | Frama som **beta-väntelista** med fungerande bekräftelse |
| **Apple 3.1.1** In-App Purchase | "Köp" eller pris utan StoreKit = **avvisning** | Inga kommersiella ord; inga priser i intressefas |
| **Google Play** | Liknande policy | Samma copy och UX |

**Strategi inför granskning:**

1. **Nuvarande submission:** `PACKAGES_ROLLOUT_MODE=off` — appen förblir **100 % oförändrad** för granskaren; v1.2-kod får finnas men är inaktiv
2. **Efter godkännande:** admin sätter `interest` i ny uppdatering (t.ex. v1.1) med beta-väntelista-copy ovan
3. **App Review Notes (vid `interest`):** *"New sections are preview/waitlist for upcoming features. No purchases. Users can register interest for a future beta."*

**Native builds:** Skicka med `off` till review om osäkert. Vid `interest` i review-build: rätt beta-copy, **aldrig** Köp nu eller priser.

#### Datainsamling

**API:**

```
POST /api/subscription/interest
Body: {
  "component": "reporting" | "pedagog" | "teacch",
  "source": "bottom_nav_preview" | "upgrade_page" | "contextual_trigger",
  "comment": null   // valfritt, max 280 tecken
}
```

**Lagring — tabell `package_interest`:**

```sql
CREATE TABLE IF NOT EXISTS package_interest (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id       UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  parent_id       UUID NOT NULL REFERENCES parent(id) ON DELETE CASCADE,
  component       TEXT NOT NULL CHECK (component IN ('reporting', 'pedagog', 'teacch')),
  source          TEXT NOT NULL,
  comment         TEXT CHECK (char_length(comment) <= 280),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (family_id, component)   -- en rad per familj per komponent; uppdatera comment vid ny anmälan
);

CREATE INDEX IF NOT EXISTS idx_package_interest_component ON package_interest (component);
CREATE INDEX IF NOT EXISTS idx_package_interest_created ON package_interest (created_at DESC);
```

| Kolumn | Regel |
|--------|-------|
| `family_id` | Autentiserad förälders familj |
| `parent_id` | Vem som klickade (audit) |
| `component` | Paket som intresset gäller |
| `source` | Var klicket skedde — **samma enum** som analytics (nedan) |
| Dubbelklick | `ON CONFLICT (family_id, component) DO UPDATE SET comment = EXCLUDED.comment, created_at = NOW()` → UI: *"Ni står redan på väntelistan"* |

**Analytics (primär KPI för intressefas):**

```javascript
event_type: 'interest_registered',   // enda canonical name — inget alias
metadata: {
  component: 'teacch',              // reporting | pedagog | teacch — samma nyckel som API
  source: 'bottom_nav_preview'      // bottom_nav_preview | upgrade_page | contextual_trigger
}
```

**`source`-taxonomi (canonical — använd överallt):**

| Värde | Var |
|-------|-----|
| `bottom_nav_preview` | Flik i bottom nav öppnar preview |
| `upgrade_page` | `/upgrade` eller abonnemang i inställningar |
| `contextual_trigger` | Banner/modal från §9.5 |

**North Star under intressefas:** konvertering *preview → intresseanmälan* per paket (§15).

#### Admin & beslut

Se **§9.10** — fullständig admin-yta under *Prenumeration* (rollout, statistik, paketintresse, familj-komponenter).

**Beslut att gå köp-live:** När intresse + strategi motiverar → `PACKAGES_ROLLOUT_MODE=purchase`, IAP (§9.7), priser synliga, CTA = Köp nu. Väntelistefamiljer kan prioriteras till beta *(valfritt)*.

#### Teknisk växling

| Inställning | Lagring | Värde |
|-------------|---------|-------|
| `PACKAGES_ROLLOUT_MODE` | `app_config` (JSON string) | `off` *(default)* \| `interest` \| `purchase` |
| `PACKAGES_SHOW_PRICES` | `app_config` (boolean) | `false` i `off`/`interest` · `true` vid `purchase` |

**Env-fallback:** `process.env.PACKAGES_ROLLOUT_MODE` används om `app_config` saknar nyckeln. Env default = `off`.

**Admin:** `PUT /api/admin/app-config/PACKAGES_ROLLOUT_MODE` — **inte** `feature_flag` (boolean passar inte enum). Env är fallback.

**Härledda värden (ingen separat flagga):**

| `rollout_mode` | `purchase_enabled` | `show_prices` |
|----------------|---------------------|---------------|
| `off` | `false` | `false` |
| `interest` | `false` | `false` |
| `purchase` | `true` | `true` |

`package-access.js` returnerar dessa i `/api/subscription/access` — klienten behöver inte tolka enum själv.

**Klientbeteende per läge:**

| `rollout_mode` | Nav v1.2 | Preview-shell | Intresse-CTA | IAP |
|----------------|----------|---------------|--------------|-----|
| `off` | Nej — nuvarande nav | Monteras inte | Nej | Nej |
| `interest` | Ja | Ja (mock + beta-copy) | Ja | Nej |
| `purchase` | Ja | Ja (mock eller aktivt) | Nej — Köp nu | Ja (native) |

`preview-shell.js` och `native-tab-bar.js` läser `/api/subscription/access` → `rollout_mode` + `show_prices` → monterar inget när `off`.

#### Minimal smoke test (snabbaste vägen live)

För att mäta intresse **utan** att bygga hela v1.2:

| Epic | Leverans |
|------|----------|
| **E1** | `package-access` + `/api/subscription/access` |
| **E2** | `preview-data.js` + `preview-shell.js` (beta-copy, intresse-CTA) |
| **E4** | Nav förälder — nya flikar öppnar preview |
| **E10** | `interest_registered` analytics + `package_interest` API |

*Epic E6–E9 (Extra stöd full implementation) väntar på intressedata.*

**Rekommenderad körning:** smoke test **2 veckor** → dashboard visar vilket paket som prioriteras → bygg det paketet först.

**Byggordning full v1.2:** §16 oförändrad — intressefas är deploy-läge, inte kortare scope om ni väljer full build parallellt.

### 9.9 Efter köp & tomma tillstånd (P1)

#### Post-köp onboarding (första gången `state` → active)

| Paket | Direkt efter köp | Copy |
|-------|------------------|------|
| **Pedagog** | Samarbete-flik → *"Bjud in din första pedagog"* wizard | *"Nu kan ni samarbeta med skola och pedagog."* |
| **Rapportering** | Utveckling-flik → tom rapportvy + *"Skapa din första rapport"* | *"Följ utvecklingen över tid."* |
| **Extra stöd** | Barn/Stöd → aktivitetsbibliotek med *"Lägg till visuellt stöd"* | *"Ge barnet mer förutsägbarhet i vardagen."* |
| **Återaktiverat** | Arkiv → *"Välkommen tillbaka — din historik är tillgänglig"* | *"Fortsätt där ni slutade."* |

**Analytics:** `package_activated` med `{ component, source: 'purchase'|'reactivation' }`.

#### Tomma tillstånd per paket (0 data)

| Paket / yta | Tomt tillstånd |
|-------------|---------------|
| **Pedagog (pedagog)** | *"Inga barn delade"* — §4.4.1 |
| **Pedagog (förälder)** | *"Bjud in en pedagog för att komma igång"* — §4.2.2 |
| **Rapportering** | *"Inga rapporter ännu — skapa din första"* |
| **Extra stöd** | *"Inga aktiviteter med visuellt stöd — redigera i biblioteket"* |
| **För dig** | *"Utforska rekommenderade rutiner"* — §2.1 |
| **Arkiv** | *"Inget arkiverat innehåll"* (sällsynt — data behålls vid nedgradering) |

Varje tomt tillstånd har **en primär CTA** — aldrig död ände.

### 9.10 Admin → Prenumeration (P0)

**Route:** `/admin` → sektion **💳 Prenumeration** (`#prenumeration`)  
**Behörighet:** `requireAdmin` — samma som övriga admin-panelen.  
**Syfte:** Pontus (admin) ska kunna **styra lansering**, **tilldela paket per familj**, **läsa statistik** och **exportera intressedata** — utan deploy eller env-ändringar.

**Relation till befintlig kod:** Idag finns Basic-pris, trial, grundargräns, betalnings-toggle och legacy add-ons (`public/admin/admin-subscription-settings.js`). v1.2 **utökar** samma sektion — ersätter inte Familjer eller Analytics.

#### 9.10.1 Informationsarkitektur — fem block

```
💳 Prenumerationsinställningar
├── A. Rollout & lansering
├── B. Paket & priser
├── C. Statistik (dashboard)
├── D. Paketintresse (lista + export)
└── E. Familj-komponenter (länk + inline i Familjer)
```

| Block | Admin kan | Klient/app påverkas |
|-------|-----------|---------------------|
| **A** | Växla `off` / `interest` / `purchase` | Nav v1.2, preview-shell, CTA-copy, IAP |
| **B** | Redigera metadata per komponent (pris, namn, aktiv) | `/upgrade`, preview-kort — **inte** App Store-pris (RevenueCat) |
| **C** | Se KPI:er, trender, ranking | — (read-only) |
| **D** | Lista, filtrera, exportera intresseanmälningar | — |
| **E** | Tilldela/återkalla `active`/`archived` per familj | `hasComponent()`, preview vs riktig data |

#### 9.10.2 A — Rollout & lansering

**Wireframe:**

```
── Rollout & lansering ─────────────────────────────────────

Nuvarande läge:  [ Av ▾ ]  [ Intressefas ]  [ Köp live ]

Vid val av Intressefas:
  ⚠ Alla familjer utan komponent ser mock-preview + beta-CTA.
  Ingen IAP. Inga priser.

Vid val av Köp live:
  ⚠ Native IAP aktiveras. Priser synliga. CTA = Köp nu.

Härledda värden (read-only):
  Preview-shell:  AV / PÅ
  IAP-köp:         AV / PÅ
  Priser i UI:     AV / PÅ

[ Spara rollout-läge ]
```

| Inställning | Lagring | API |
|-------------|---------|-----|
| `PACKAGES_ROLLOUT_MODE` | `app_config` | `PUT /api/admin/app-config/PACKAGES_ROLLOUT_MODE` |
| `PACKAGES_SHOW_PRICES` | `app_config` *(härledd — skrivs automatiskt)* | Sätts till `true` endast vid `purchase` |

**Env-fallback:** `process.env.PACKAGES_ROLLOUT_MODE` om `app_config` saknar nyckeln. Default = `off`.

**Regler:**

- **Inte** `feature_flag` (boolean) — enum kräver `app_config`.
- Byte till `interest` eller `purchase` loggas i `admin_audit_log` med `action=rollout_mode_changed`.
- Bekräftelsedialog vid byte från `off` — *"Detta påverkar alla familjer utan köpt komponent."*
- `payment_enabled` (befintlig toggle) är **separat** — master för IAP i appen; ska vara synlig bredvid rollout med tydlig etikett *"IAP i appen (Apple/Google)"*.

**Härledda värden** (returneras i `/api/subscription/access` — §9.8):

| `rollout_mode` | `purchase_enabled` | `show_prices` | Nav v1.2 | Preview | Intresse-CTA |
|----------------|---------------------|---------------|----------|---------|--------------|
| `off` | `false` | `false` | Nej | Nej | Nej |
| `interest` | `false` | `false` | Ja | Ja | Ja |
| `purchase` | `true` | `true` | Ja | Ja | Nej — Köp nu |

#### 9.10.3 B — Paket & priser

Fyra komponenter enligt §0 — ersätter legacy *Add-ons*-listan i admin (behåll API tills migration rensar `subscription_addons`).

| `component` | Visningsnamn | Standardpris (metadata) | RevenueCat-produkt |
|-------------|--------------|-------------------------|-------------------|
| `basic_app` | Basic | 59 kr/mån | `basic_monthly` *(exempel)* |
| `reporting` | Rapportering | 19 kr/mån | `reporting_monthly` |
| `pedagog` | Pedagog | 29 kr/mån | `pedagog_monthly` |
| `teacch` | Extra stöd | 29 kr/mån | `teacch_monthly` |

**Wireframe:**

```
── Paket & priser ──────────────────────────────────────────

🟢 Basic (basic_app)          59 kr/mån   [ Redigera ]
📊 Rapportering               19 kr/mån   [ Redigera ]
👩‍🏫 Pedagog                    29 kr/mån   [ Redigera ]
🧩 Extra stöd (teacch)         29 kr/mån   [ Redigera ]

── Grundinställningar (befintligt) ───────────────────────
Pris Basic · Trial · Grundargräns (lifetime free)
```

| Fält per paket | Redigerbart i admin | Synkas till App Store |
|----------------|---------------------|------------------------|
| `name`, `description` | ✅ | ❌ (manuellt i ASC/Play) |
| `price_monthly_sek` (metadata) | ✅ | ❌ — visning i app endast |
| `revenuecat_product_id` | ✅ (referens) | ✅ via RevenueCat |
| `is_active` (säljbar) | ✅ | — |

**API (nya eller utökade):**

- `GET /api/admin/subscription-settings` — inkl. `components[]`, `rollout_mode`, `payment_enabled`
- `PATCH /api/admin/subscription-settings/components/:slug` — metadata
- Befintlig `PATCH /api/admin/subscription-settings` — Basic-pris, trial, `founder_family_limit`

**Prisvisning:** I `off` och `interest` visas **inga** priser i preview/upgrade (§9.8). Admin kan redigera metadata i förväg — synligt först vid `purchase`.

#### 9.10.4 C — Statistik (dashboard)

**Wireframe:**

```
── Prenumerationsstatistik ─────────────────────────────────

Period: [ 7 dagar ▾ ] [ 30 dagar ] [ 90 dagar ]

┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Intresse    │ Aktiva      │ Preview →   │ IAP köp     │
│ anmälningar │ familjer    │ intresse %  │ (30d)       │
│ 47 totalt   │ per paket   │ 12.4 %      │ 8           │
└─────────────┴─────────────┴─────────────┴─────────────┘

Per komponent (ranking):
  pedagog      ████████████  23 intresse ·  4 aktiva
  reporting    ████████      18 intresse · 12 aktiva
  teacch       ██████        14 intresse ·  2 aktiva

Källa: package_interest · family_subscriptions · analytics_events · iap_webhook_log
```

| KPI | Definition | Källa |
|-----|------------|-------|
| **Intresse totalt** | Unika familjer med ≥1 rad i `package_interest` | `package_interest` |
| **Intresse per komponent** | `COUNT(DISTINCT family_id) GROUP BY component` | `package_interest` |
| **Preview → intresse %** | `interest_registered` / `preview_viewed` per komponent | `analytics_events` (§15) |
| **Aktiva familjer** | `state=active` i `family_subscriptions.components` | DB |
| **Arkiverade** | `state=archived` | DB |
| **Lifetime free** | `family.is_lifetime_free=true` | `family` |
| **IAP köp / förnyelser** | Webhook-händelser senaste N dagar | `iap_webhook_log` |
| **Churn** | `subscription_status=expired` senaste N dagar | `family` |

**API:**

- `GET /api/admin/subscription-stats?period=7d|30d|90d`
- Returnerar: `summary`, `by_component[]`, `interest_trend[]`, `purchases_trend[]`

**North Star under intressefas:** konvertering *preview → intresseanmälan* per paket (§15) — visas som primär KPI när `rollout_mode=interest`.

#### 9.10.5 D — Paketintresse (lista + export)

Bygger på `package_interest` (§9.8 schema).

**Wireframe:**

```
── Paketintresse ───────────────────────────────────────────

Filter: [ Komponent: Alla ▾ ] [ Källa ▾ ] [ Från–Till ]

17 jun  Andersson    pedagog     bottom_nav_preview
16 jun  Lindqvist    reporting   upgrade_page
15 jun  Svensson     teacch      contextual_trigger

[ Exportera CSV ]     Visar 47 av 47
```

| Kolumn | Fält |
|--------|------|
| Datum | `created_at` |
| Familj | `family.name` (ej PII i export om anonymiserat läge) |
| Komponent | `reporting` \| `pedagog` \| `teacch` |
| Källa | `bottom_nav_preview` \| `upgrade_page` \| `contextual_trigger` |
| Prioriterad beta | `is_priority` *(valfritt admin-flagga)* |

**API:**

- `GET /api/admin/package-interest?component=&source=&from=&to=&limit=&offset=`
- `GET /api/admin/package-interest/export.csv` — samma filter
- `PATCH /api/admin/package-interest/:id` — `{ is_priority: true }` *(valfritt)*

#### 9.10.6 E — Familj-komponenter (per familj)

**Primär ingång:** Admin → **Familjer** → familjekort → panel *Paket & åtkomst*.  
**Sekundär:** Snabblänk från Prenumeration-statistik (*"Visa familjer med pedagog"*).

**Wireframe (på familjekort):**

```
── Paket & åtkomst — Andersson ─────────────────────────────

Lifetime free:  Nej
Rollout:        Intressefas (familjen ser preview om ej köpt)

Komponent        Status      Tilldelad        Åtgärd
basic_app        ● Aktiv     grandfather      —
reporting        ○ Saknas    —                [ Tilldela ]
pedagog          ● Aktiv     admin 2026-06-01 [ Arkivera ]
teacch           ○ Saknas    —                [ Tilldela ]

[ Spara ]   Audit: alla ändringar loggas
```

| Åtgärd | Effekt |
|--------|--------|
| **Tilldela** | `grantComponent(familyId, slug)` → `state=active`, `granted_at=now`, `source=admin` |
| **Arkivera** | `state=archived`, `archived_at=now` — data kvar (§8.5) |
| **Återaktivera** | `state=active` — full write |
| **Ta bort tilldelning** | Endast om `source=admin` och ingen IAP-historik — annars arkivera |

**Regler (§8.4, §2122):**

- Oberoende av `rollout_mode` kan admin ge valfri komponent → familjen ser **riktig data**, aldrig mock.
- `lifetime_free` → endast `basic_app` automatiskt; tillägg kräver explicit admin-tilldelning eller köp.
- Grandfathered familjer (migration) visas med `source=grandfather` — ej raderbar.

**API:**

- `GET /api/admin/families/:id/subscription` — komponenter + tier + `is_lifetime_free`
- `PUT /api/admin/families/:id/components/:slug` — `{ action: 'grant'|'archive'|'reactivate' }`
- Alla anrop → `admin_audit_log` (`action=component_granted|component_archived`, `metadata`)

#### 9.10.7 Audit & säkerhet

| Händelse | Logg |
|----------|------|
| Rollout-byte | `rollout_mode_changed` |
| Komponent tilldelad/arkiverad | `component_granted`, `component_archived` |
| Basic-pris/trial ändrat | `subscription_settings_updated` |
| `payment_enabled` toggle | `payment_enabled_changed` |

**Ingen** massändring av komponenter utan bekräftelse. Export CSV kräver admin — rate-limit enligt befintlig `globalLimiter` exempt för `/api/admin/*`.

#### 9.10.8 Implementation — filer & epic

| # | Leverans | Filer |
|---|----------|-------|
| 9.10.1 | Migration `package_interest` | `migrations/*_package_interest.js` |
| 9.10.2 | Stats + intresse API | `src/routes/admin/subscription-stats.js`, `package-interest.js` |
| 9.10.3 | Familj-komponent API | `src/routes/admin/family-components.js` |
| 9.10.4 | Admin UI — rollout + stats + intresse | `public/admin/admin-subscription-settings.js` *(utökad)*, `index.html` `#prenumerationSection` |
| 9.10.5 | Familj-panel komponenter | `public/admin/admin-families.js` |
| 9.10.6 | `subscription-components.js` — alla fyra paket | `config/subscription-components.js` |

**Epic:** **E10** (intresse + analytics) + **E13** *(ny)* Admin prenumeration full. Minimal smoke test (§9.8) kräver minst **A + D + C (grund)** innan `interest` sätts live.

**Exit-kriterium:**

- [ ] Admin kan sätta `rollout_mode` utan deploy
- [ ] Statistik visar intresse per komponent + export CSV
- [ ] Admin kan tilldela `pedagog` till testfamilj → familjen ser riktig Samarbete, inte mock
- [ ] Alla admin-ändringar i audit-logg
- [ ] Befintlig Basic/trial/grundargräns/betalnings-toggle fungerar oförändrat

#### 9.10.9 Visuell referens — pedagogläge mockup

**Definitiv 10/10 UX-referens:** `docs/mockups/pedagog-lage-v12-ux-v3-PROMPT.md` (§13.10)  
**Utdatafil:** `docs/mockups/pedagog-lage-v12-ux-v3.png`

**Minimikrav IA (v2):** `docs/mockups/pedagog-lage-v12-reference-PROMPT.md` — använd endast om v3 saknas.

Kontaktkarta 4×3 (12 skärmar). Kritiska regler: prioriteringskö · stepper · puls-kort · ingen chat · pedagog `Översikt·Idag·Historik` · förälder 5 flikar.

---

## 10. Rollout v1.2 (översikt)

**Detaljerad plan:** §16.  
**Princip:** Bygg paketering och preview **före** nav-omläggning och Extra stöd-UI.

| Fas | Epics | Leverans |
|-----|-------|----------|
| **0** | 1 | Access-brygga (`package-access`, `/api/subscription/access`) |
| **1** | 2–3 | Preview-shell + `/upgrade` (4 paket, IAP på native) |
| **2** | 4–5 | Nav förälder + barn (§6) |
| **3** | 6–9 | Extra stöd: datamodell, bibliotek, barnvy, TTS |
| **2b** | 12 | Pedagogläge: daglogg i skola, skolaktiviteter, nav (§4.4) |
| **4** | 10–11 | Analytics §15 + kontextuella triggers §9.5 |
| **5** | 12 | IAP-produkter App Store + Play Console (§9.7) — **efter** intressefas |

**Rekommenderad go-to-market:** (1) Deploy v1.2-kod med `off` → godkänn gratis app i review · (2) Admin sätter `interest` → ship smoke test (E1+E2+E4+E10) · (3) Mät 2 v · (4) Bygg vinnande paket · (5) Admin sätter `purchase` + IAP.

---

## 11. Acceptanskriterier

- [ ] Fyra paket med löfte, komponent, feature-register
- [ ] För dig dokumenterat under Basic — inte femte paket
- [ ] `pedagog_dashboard`, `pedagog_daglogg`, `pedagog_skolaktivitet` enligt §4.4
- [ ] `hasComponent()` + `hasFeature()` tvånivå-gating (§8.2)
- [ ] `seven_questions.version` + `activity_template_id` på `what_next` (§7.2)
- [ ] Pictogram-schema med `key`, `category`, `image_url` (§7.2)
- [ ] Auto emoji-fallback — barnvy aldrig text-only (§7.2)
- [ ] `config/preview-data.js` — en mock-källa (§9.6)
- [ ] Betalning endast via Apple (iOS) / Google (Android) IAP — ingen webb-checkout (§9.7)
- [ ] TTS: dölj högtalare om ej tillgänglig (§7.5)
- [ ] Nav-hierarki: en primär ingång per feature (§6.4)
- [ ] AI-princip §14.14 dokumenterad — inga autonoma AI-skrivningar utan föräldragodkännande
- [ ] Success metrics §15 — NSM + paket-KPI:er instrumenterade i `analytics_events`
- [ ] Uppgradering & preview enligt §9 — CTA enligt `rollout_mode`; i `off` ingen förändring
- [ ] Navigation: arbetsflödesflikar (§6); alla 5 flikar synliga; ej köpta = preview-läge
- [ ] Mock-data tydligt märkt; ingen familjedata i preview
- [ ] API/write blockerat via `requireComponent()` tills köp
- [ ] Inställningar i top-right, inte bottom nav eller Idag-grid
- [ ] Pedagogläge §4.4 — delade barn, anteckningar, daglogg i skola, skolaktiviteter
- [ ] Design enligt §13: en nav-väg, Extra stöd som NU-overlay, minimal barn-nav, pedagog-nav **4 flikar**
- [ ] `PACKAGES_ROLLOUT_MODE=off` som default — ingen synlig förändring vid deploy/review
- [ ] **Admin → Prenumeration (§9.10)** — rollout, statistik, paketintresse, familj-komponenter
- [ ] Grandfathering §8.4 — befintliga reporting/pedagog-familjer behåller åtkomst
- [ ] **Preview endast om `hasComponent === false`** — grandfathered familjer ser riktig data, aldrig intresse-CTA (§6.6, §9.8)
- [ ] `package_interest`-schema + canonical `source`-taxonomi (§9.8)
- [ ] **Vuxen-gated nödutgång** ur dold barn-nav (§7.5)
- [ ] **DELETE-route scrubbar `what_next`** — fryser snapshot, inga tomma NÄSTA-kort (§7.2, §16.6)
- [ ] **Fältbaserad** emoji-fallback — ingen textmatchning (§7.2)
- [ ] **Webb/PWA köp** = ladda ner-flöde (QR/store), inte död "öppna app" (§9.7)
- [ ] **Ett analytics-event per fas** — `interest_registered` vs `upgrade_from_preview` (§15.3)
- [ ] Intressefas §9.8 — beta-väntelista, inga priser, Apple-säker copy, `interest_registered`
- [ ] **Arkivprincip §8.5** — nedgradering raderar aldrig data; `component_state` active/archived/disabled
- [ ] **Renderingsordning §6.6** — access → component → rollout → preview (en implementation)
- [ ] **Vy-prioritet §6.9** — `resolveViewMode()` i package-access
- [ ] **Post-köp onboarding §9.9** — wizard per paket + tomma tillstånd
- [ ] **Inställningar → Arkiv** — läs-only + export + återaktivera-CTA
- [ ] **GDPR-export** inkl. `pedagog_audit_log` (§8.5, §4.4.14)
- [ ] **409 ACTIVITY_ALREADY_COMPLETED** + klient-rollback (§4.4.11)
- [ ] **Revoke-session** — validera vid resume; 403 → hård redirect (§4.4.1)
- [ ] **what_next scrub fryser snapshot** — inte tom NÄSTA-rad (§7.2, §16.6)
- [ ] **what_need.items** max 5 × 30 tecken i `normalizeSevenQuestions()`
- [ ] **PWA efter köp** — full läs/skriv, endast köp blockeras (§9.7)
- [ ] **IAP idempotens** — `revenuecat_event_id` (§16.8)

---

## 12. Beslut

| # | Beslut |
|---|--------|
| A | v1.2 = Paket — fyra säljbara moduler |
| B | **För dig ∈ Basic** — familjens målyta, inte eget paket |
| C | Feature-slug-register per komponent (§7.1) |
| D | Extra stöd v1.2 = De sju frågorna + pictogram + visuell timer + Läs upp; `minimal_ui` m.m. = v1.3+ |
| E | Nya funktioner → ett paket via beslutregeln (§0) |
| F | **Meny = arbetsflöden** vid köp — inte paketknappar (§6) |
| G | För dig = modul i Idag — aldrig egen huvudflik |
| H | Bottom nav max 5; Inställningar top-right |
| I | **Se allt, använd det du betalat** — mock-preview + CTA enligt `rollout_mode` (§6.6, §9) |
| J | Mock = statiskt exempel; aldrig familjens riktiga data i preview |
| K | Extra stöd = overlay på barnets NU-vy — inte separat app med egen nav (§13) |
| L | Idag har en nav-väg — inte grid + bottom nav som dubbel huvudmeny (§13) |
| M | **Svar på sju frågor = objekt med pictogram** — ren text räcker inte i barnvy (§7.2) |
| N | **Visuell timer ∈ v1.2** under `teacch` — `how_long` får aldrig vara text-only (§7.5) |
| O | **Läs upp (`read_aloud`) ∈ v1.2** — TTS som komplement till pictogram (§7.5) |
| P | **Barn-nav strikt** — Basic: Idag+Skatt; Extra stöd under aktivitet: dölj nav (§7.5) |
| Q | **Ett paket = ett problem** — positioneringstabell §0 |
| R | **En primär nav-ingång** per feature (§6.4) |
| S | **`hasComponent` + `hasFeature`** — tvånivå-gating (§8.2) |
| T | **`seven_questions.version`** + `activity_template_id` på `what_next` (§7.2) |
| U | **Centralt `preview-data.js`** — en mock-källa (§9.6) |
| V | **Kontextuella uppgraderingspunkter** — inte bara passiv preview (§9.5) |
| W | **North Star** = genomförda aktiviteter/barn/vecka; retention = ≥3 dagar/vecka (§15) |
| X | **AI får föreslå, aldrig automatiskt ändra** utan föräldragodkännande (§14.12) |
| Y | **Betalning endast via Apple/Google IAP** — ingen Stripe/webb-checkout (§9.7) |
| Z | **Intressefas före köp-live** — fake door / beta-väntelista (§9.8) |
| AA | **Apple-säker intresse-copy** — inga priser, inga "Köp"-ord i intressefas (§9.8) |
| AB | **`off` som default** — all v1.2-kod deploybar utan synlig effekt; admin aktiverar `interest` / `purchase` (§9.8) |
| AC | **Grandfathering** — familjer med befintlig reporting/pedagog-åtkomst behåller komponent (§8.4) |
| AD | **`app_config` för rollout** — enum i `app_config`, inte boolean `feature_flag` (§9.8) |
| AE | **Preview styrs av `hasComponent`, inte enbart `rollout_mode`** — den som äger komponenten ser aldrig mock (§6.6, §9.8) |
| AF | **Vuxen-gated nödutgång** — dold barn-nav får aldrig låsa in barnet (§7.5) |
| AG | **Fältbaserad emoji-fallback** — ingen textmatchning i v1.2 (§7.2) |
| AH | **Webb/PWA = ladda ner-flöde** vid köp — aldrig en död "öppna app"-länk (§9.7) |
| AI | **Ett analytics-event per fas** — `interest_registered` (interest) vs `upgrade_from_preview` (purchase) (§15.3) |
| AJ | **Pedagogläge §4.4** — delade barn, anteckningar, daglogg i skola, skolaktiviteter |
| AK | **Arkivprincip** — paket styr åtkomst, aldrig radering av användardata (§8.5) |
| AL | **Renderingsordning** — access → component → rollout → preview (§6.6) |
| AM | **Vy-prioritet** — pedagog > barn+teacch > barn > förälder (§6.9) |
| AN | **Anteckningslås Alternativ A** — publicerad → låst 23:59 permanent (§4.4.5) |
| AO | **Dashboard per pedagog** — status aggregeras aldrig över flera pedagoger (§4.4.9) |
| AP | **Pedagog-nav 4 flikar** — Översikt · Idag · Historik · ⚙️ (§4.4.16) |
| AQ | **409 ACTIVITY_ALREADY_COMPLETED** — Modell A race + klient-rollback (§4.4.11) |
| AR | **Revoke-session** — validera vid resume; 403 hård redirect (§4.4.1) |
| AS | **what_next scrub fryser visuellt snapshot** vid mallradering (§7.2) |
| AT | **PWA full funktion efter köp** — endast köptransaktion blockeras på webben (§9.7) |
| AU | **IAP webhook idempotent** via `revenuecat_event_id` (§16.8) |
| AV | **Pedagog UX v3** — prioriteringskö, stepper, puls-kort; IA > estetik (§13.10) |

---

## 13. Designprinciper & mockup-granskning

*Referens: treläges-mockup (Föräldarläge · Barnläge · Extra stöd-läge), 2026-06-17.*

### 13.1 Lägen & vy-prioritet

| Läge | Syfte | Målgrupp |
|------|-------|----------|
| **Pedagogläge** | Dokumentera skoldag för delade barn | Pedagog / terapeut (§4.4) |
| **Barn + Extra stöd** | Lugn struktur — De sju frågorna i NU | Barn med aktiv `teacch` |
| **Barnläge** | Enkel vy — fokus på nuet | Barn (Basic-ton) |
| **Föräldarläge** | Full översikt, alla arbetsflöden | Förälder |

**Viktigt:** Fyra upplevelser, inte fyra paket. Paket säljs kommersiellt; lägen styrs av roll + komponenter.

**Vy-prioritet (P0):** Se §6.9 — pedagog > barn+teacch > barn > förälder.

**Pedagog-nav (låst v1.2):** **4 flikar** — Översikt · Idag · Historik · ⚙️ (inte 3).

### 13.2 Designprinciper (gäller implementation)

| # | Princip |
|---|---------|
| 1 | **En primär nav-väg** — bottom nav (5 flikar) är huvudnavigering; Idag duplicerar inte hela menyn |
| 2 | **Idag = action** — checklista, stjärnor, NU/NÄSTA, För dig-modul; inte sex jämbördiga kort |
| 3 | **Inställningar top-right** — kugghjul/avatar; aldrig sjätte kort i grid eller bottom nav |
| 4 | **Extra stöd = overlay** — De sju frågorna visas *inuti* barnets NU-vy, inte som separat app med egen meny |
| 5 | **Barn = minimal nav** — Idag + Skatt/Stöd; ingen Rutiner, Utveckling, Samarbete eller Mer |
| 6 | **En primär handling (barn)** — ✓ Klar; inga konkurrerande knappar |
| 7 | **Färg = arbetsflöde** — konsekvent palett: Rutiner (teal) · Utveckling (blå) · Samarbete (lila) · Barn/Stöd (grön) · Extra stöd (dämpad blå) |
| 8 | **Preview synlig** — ej köpta flikar visar mock + CTA enligt `rollout_mode` (§9.8), inte tom eller dold; i `off` ingen preview |

### 13.3 Föräldarläge — mockup

**Det som fungerar:**

- Idag överst: checklista, +stjärnor, barnväljare
- Fem bottom-flikar: Idag · Rutiner · Utveckling · Samarbete · Barn/Stöd
- Färgkodade områdeskort med kort beskrivning — tydlig paketidentitet utan paketknappar

**Justera:**

| Problem | Rekommendation |
|---------|----------------|
| Grid **och** bottom nav visar samma fem områden | **Alternativ A (rekommenderat):** Idag = bara dagens action + För dig-modul; bottom nav = enda huvudnav |
| Inställningar som grått kort i grid | Flytta till **top-right** (header) |
| För dig-modul saknas | Lägg under checklistan: *"Fortsätt utveckla" · "Rekommenderade rutiner"* |

**Målbild — Idag (förälder):**

```
[Anna ▾]                              [🔔] [⚙️]

Idag
✓ Borsta tänderna  ✓ Klä på sig  ○ Läxor
+2 stjärnor idag                    [Skatt]

── Fortsätt utveckla ──          ← För dig-modul (Basic)
Rekommenderad rutin: Trygga kvällar
[Aktivera]

(bottom nav: Idag · Rutiner · Utveckling · Samarbete · Barn/Stöd)
```

### 13.4 Barnläge — mockup

**Det som fungerar (9/10):**

- NU stort med illustration
- NÄSTA synligt (övergångsstöd)
- En grön **✓ Klar!**-knapp
- Stjärnor diskret (⭐ 24) — motivation utan att dominera

**Justera:**

| Problem | Rekommendation |
|---------|----------------|
| Rutiner i barn-bottom nav | **Dölj** — barn planerar inte schema |
| Mer i bottom nav | **Dölj** — bryter mot distraktionsfrihet |
| Skatt + Stöd som separata flikar | Överväg **2 flikar:** Idag · Skatt (Stöd = del av Idag när teacch aktivt) |

**Målbild — barn-bottom nav (Basic):**

```
[ Idag ]  [ Skatt ]
```

**Med teacch:** samma — Extra stöd är innehåll på Idag, inte egen flik.

### 13.5 Extra stöd — mockup (barn)

**Det som fungerar (9/10):**

- Vertikal lista med De sju frågorna + ikoner
- Lugn blå palett — tydlig skillnad mot Basic
- En **✓ Klar!**-knapp
- Inga stjärnor/poäng i kontextlistan

**Största greppet:**

Extra stöd-skärmens *innehåll* är rätt — men det ska vara **hur NU-kortet ser ut** när `teacch` är aktivt, inte ett tredje läge med egen bottom nav.

```
Barn utan teacch:     NU + illustration + timer + Klar
Barn med teacch:      NU + sju frågor-lista + Klar  (samma skärm, lugnare ton)
```

**Målbild — NU med Extra stöd:**

```
[🔊]                                              NU — Borsta tänderna

📍 Var?     [🚿]  Badrummet          ← pictogram stort, text liten
👤 Vem?     [👤]  Själv
⏱ Hur länge?  [○○●●● timer-ring]
➡ Sen?    [🥣]  Frukost
🎒 Behöver? [🪥][🧴]
💡 Varför?  [😁]  För friska tänder

NÄSTA — Frukost

[ ✓ Klar! ]

(ingen bottom nav medan aktivitet pågår)
```

Dölj tomma rader. NÄSTA kvar för övergångsstöd. **Utan pictogram = ofullständig implementation** — inte godkänd för release.

### 13.6 Tillgänglighetsgranskning — icke-läsande barn (2026-06-17)

*Referens: mockup `paket-v1.2-nav.png` + extern granskning.*

**Det som fungerar:**

| Styrka | Varför |
|--------|--------|
| NU / NÄSTA-separation | Kronologisk sekvens utan läsning |
| Aktivitetsikoner (emoji/illustration) | Barn förstår rutiner utan text |
| Nedtonad stress i Extra stöd | Inga stjärnor/poäng i kontextvyn |
| En primär handling | ✓ Klar — inget valkaos |

**Kritiska luckor (åtgärdade i §7.5):**

| Problem i mockup/spec | Åtgärd |
|-----------------------|--------|
| Sju frågor = textvägg | Objekt-datamodell + pictogram per svar (§7.2) |
| "5 minuter" abstrakt | Visuell timer flyttad till v1.2 (§5.1) |
| Ingen uppläsning | `read_aloud` tillagt (§7.5) |
| Rutiner/Mer i barn-nav | Strikt Idag+Skatt; dölj nav under aktiv NU (§13.4) |

**Rekommenderad prioritering vid implementation:**

1. Pictogram-datamodell + barnvy-rendering (blockerande)
2. Visuell timer kopplad till `how_long` (blockerande)
3. Läs upp (hög prioritet — komplement till bildstöd)
4. `minimal_ui` (v1.3 — helbild + en knapp för mest utmanade barn)

### 13.7 Preview-skärm (ej i mockup — ska skissas)

För ej köpta paket i **föräldarläge** (endast `rollout_mode` ≠ `off`):

```
┌─────────────────────────────────────┐
│ Förhandsvisning — Utveckling        │
│ Exempeldata — inte din familj       │
│                                     │
│ [mockad dashboard, statisk data]    │
│                                     │
│ [ CTA enligt rollout_mode ]         │
└─────────────────────────────────────┘
```

Samma mönster för Samarbete och Extra stöd (§9.3). I `interest`: *Anmäl intresse för beta*. I `purchase`: *Köp Familj Rapportering*.

### 13.8 Mockup vs spec — checklista

| Mockup | Spec | Åtgärd |
|--------|------|--------|
| Idag som hub | ✅ | Behåll |
| För dig-modul | Modul i Idag | Lägg till under checklista |
| Inställningar-kort | Top-right | Flytta till header |
| Grid + bottom nav | En nav-väg | Förenkla Idag |
| Extra stöd = eget läge | Overlay på NU | Integrera innehåll |
| Preview / CTA | §9 | Skissa preview-skärmar; tre rollout-lägen |
| Barn: Rutiner, Mer | Minimal nav | Ta bort från barnläge |

### 13.9 Sammanfattande dom

| Del | Betyg | Beslut |
|-----|-------|--------|
| Föräldarläge (Idag-feed) | 8/10 | Behåll innehåll; förenkla nav |
| Barnläge | 9/10 | Nära målbild; minska flikar |
| Extra stöd-innehåll | 7/10 → 9/10 | Integrera i NU **med pictogram + timer + Läs upp** |
| Paketstrategi i UI | 7/10 | Lägg till preview-skärmar |
| Tillgänglighet icke-läsande | — | §7.5 + §14.1 — pictogram, timer, TTS, familjefoto |
| **Pedagog & Samarbete** | v2: 7/10 · snygg fel-IA: 5/10 | **Mål 10/10:** §13.10 + `pedagog-lage-v12-ux-v3-PROMPT.md` |

### 13.10 Pedagog & Samarbete — UX 10/10 (målbild)

*§4.2/§4.4 = **vad**. Denna sektion = **hur det ska kännas**. Implementation ska sikta hit — inte form-tunga wireframes eller snygga men felaktiga mockups.*

**Konstitutionell UX-regel:** *IA > estetik.* En pedagog öppnar appen för att svara på tre frågor inom 2 sekunder:

1. **Vad behöver jag göra nu?**
2. **Vilket barn gäller det?**
3. **Finns något som kräver åtgärd?**

**Förbjudet i pedagog-UI:** kollegolistor, veckostatistik, notis-feeds, *"senaste kommentarer"*, återkommande schema i dagvy, `Hem`/`Mer`-nav.

#### 13.10.1 Pedagogöversikt — prioriteringsmotor

**Princip:** En **kö** sorterad på handling — inte dashboard med statistik.

```
Pedagogöversikt                              ⚙️
Idag · 2 kräver åtgärd · onsdag 17 juni

⚠️ 2 barn kräver åtgärd

────────────────────────────────────────
🟠 Ella Andersson
   2 aktiviteter kvar · anteckning saknas
   [ Fortsätt → ]
────────────────────────────────────────
🟢 Noah Lindqvist
   Allt klart · publicerad 14:32
   [ Visa → ]
────────────────────────────────────────
⚪ Maja Svensson
   Frånvarande idag
   [ Visa → ]
────────────────────────────────────────

[ Filter ▾ ]  Åtgärd krävs · Alla · Klara · Frånvarande
```

| UX-regel | Detalj |
|----------|--------|
| **Färgremsa vänster** | Orange = åtgärd · grön = klar · grå = frånvaro |
| **Primär copy = handling** | *"Fortsätt dokumentation"* — inte skrikande `ÅTGÄRD KRÄVS` |
| **Hela raden klickbar** | → Idag med rätt `childId` |
| **Frånvaro egen grupp** | Längst ner — blockerar inte prioritetskö |
| **Aldrig här** | Andra pedagoger · veckosammanfattning · *"12 skolaktiviteter"* |

**Nav:** `Översikt · Idag · Historik` + ⚙️ — **aldrig** Hem/Mer.

#### 13.10.2 Idag — guidat stepper (inte tre formulär)

```
Andersson — Ella ▼     ons 17 jun  [ Frånvaro ▾ ]

●━━━━━○━━━━━○  Steg 2 av 3 · Dokumentation

── 1. Aktiviteter ───────────────  ✓ Klar  [▾]
── 2. Dokumentation ─────────────  ● Nu
   Humör  [😊 4/5]  Måltider  Beteende  (chips, tap-to-set)
── 3. Publicera ──────────────────  ○

+ Lägg till skolaktivitet          (sekundär länk)

┌─────────────────────────────────────┐
│  [ Publicera anteckning ]           │  ← sticky footer
└─────────────────────────────────────┘
```

| UX-regel | Detalj |
|----------|--------|
| **Stepper** | Klara steg hopfälls till en rad |
| **Veckoremsa** *(valfritt)* | Kompakt M T O T F under header — kompletterar barnväljare |
| **Modell A** | `✓ Klar hemma 07:15` som muted chip — checkbox endast för ej-klara |
| **Sticky Publicera** | Syns när steg 2 påbörjat |
| **Frånvaro** | `Frånvaro ▾` i header — banner top + allt disabled, ingen stepper |

#### 13.10.3 Lägg till skolaktivitet — en skärm, extremt snabb

**Förbjudet:** starttid, återkommande, typ-dropdown, grupphantering.

```
Lägg till skolaktivitet

[ 🏃 Rast ]  [ 🍎 Lunch ]  [ 🚌 Utflykt ]  [ 👥 Grupparbete ]

Namn
[ Grupparbete                    ]

★ Stjärnor (valfritt)  [ 0 ▾ ]

[ Avbryt ]              [ Lägg till ]
```

Bottom sheet eller modal — **max 5 interaktioner** till klar.

#### 13.10.4 Samarbete (förälder) — arbetsyta, inte feed

**Segmenterad vy** (underflikar i Samarbete — **inte** extra bottom-nav-flikar):

```
Samarbete                         [ + Bjud in pedagog ]

[ Ella ▾ ]

[ Idag ● | Pedagoger | Historik ]

┌─ Dagens puls · 17 juni ─────────────────┐
│ 📋 Anna · publicerad 14:32               │
│ Humör bra · Lunch OK · Lugn eftermiddag   │
│                                          │
│ 💬 Förälder: "Sov dåligt inatt"          │
│    Anna: "Vi håller extra koll"          │  ← max 2 rader
└──────────────────────────────────────────┘

┌─ Väntar ─────────────────────────────────┐
│ Johan har inte antecknat idag            │
└──────────────────────────────────────────┘

[ Lägg till kommentar ]   ← endast om ej kommenterat idag
```

| Flik | Innehåll |
|------|----------|
| **Idag** | Puls-kort + väntar-status + kommentar-CTA |
| **Pedagoger** | Profil, barn, senast aktiv, Återkalla, Visa historik |
| **Historik** | §4.2.4 — filter månad/pedagog |

**Förbjudet:** *"1 oläst"*, *"SENASTE KOMMENTARER"*, kronologisk chat, *"Svara"*.

**Bottom nav (förälder):** `Idag · Rutiner · Utveckling · Samarbete · Barn/Stöd` — **alla 5 alltid**.

#### 13.10.5 Övriga skärmar — polish från snygg mockup (behåll)

| Skärm | Behåll från senaste iteration | Justera |
|-------|------------------------------|---------|
| Inbjudan | Stor check, tydlig CTA | — |
| Tomt tillstånd | Illustration + en primär CTA | 3 numrerade steg, inte textvägg; *Uppdatera* sekundär |
| Åtkomst borttagen | Empati + en knapp | *"Gå till Översikt"* |
| Inställningar | KONTO / NOTISER / SUPPORT | Minimikrav §4.4.16: profil + logga ut |
| Kommentar-input | *max 1 per dag* | Knapp *Spara* — inte *Skicka* |

#### 13.10.6 Mikrointeraktioner

| Moment | Beteende |
|--------|----------|
| Avbocka aktivitet | Check-animation + *"Ella får 2 stjärnor"* (diskret) |
| Publicera | Toast + haptic · *"Föräldern meddelas"* |
| Frånvaro | Mjuk övergång till disabled — lavendel banner **top** |
| Revoke | Empati-copy — inte tekniskt 403 |

#### 13.10.7 Visuell hierarki & designsystem

| Nivå | Exempel |
|------|---------|
| 1 — Primär | Barnnamn, puls-rubrik |
| 2 — Handling | Lila knappar: Fortsätt, Publicera, Lägg till |
| 3 — Status | Muted: Klar hemma 07:15, publicerad 14:32 |
| 4 — Meta | Filter, sekundära länkar |

**Tokens:** bakgrund `#F5F4F0` · navy `#1B2340` · lila `#8B5CF6` · grön `#22C55E` · amber `#F5A623` · Outfit + Plus Jakarta Sans · kort 16px radius.

#### 13.10.8 Mockup-versioner — vilken gäller?

| Version | Betyg | Status |
|---------|-------|--------|
| v1 (11 panel) | 6/10 | Superseded |
| v2 (12 panel, form-tung) | 7/10 | Minimikrav IA |
| Snygg fel-IA (14 panel, Hem/Mer) | 5/10 | **Avvisa** |
| **v3 (12 panel, §13.10)** | **10/10 mål** | **Definitiv referens** |

**Prompt:** `docs/mockups/pedagog-lage-v12-ux-v3-PROMPT.md`  
**Utdata:** `docs/mockups/pedagog-lage-v12-ux-v3.png`

---

## 14. Produktprinciper (oföränderliga regler)

*Konstitutionella regler — gäller alla versioner. När teamet växer är det dessa som avgör om produkten fortfarande känns sammanhållen om två år.*

| # | Princip |
|---|---------|
| **14.1** | **Barn ska kunna använda produkten utan att läsa** — pictogram, timer, TTS och familjefoto (`image_url`) är tillgänglighetslager, inte nice-to-have |
| **14.2** | **Varje funktion tillhör exakt ett paket** (eller För dig under Basic) |
| **14.3** | **Varje funktion har exakt en primär navigationsväg** (§6.4) |
| **14.4** | **Extra stöd är alltid ett lager ovanpå vardagen** — aldrig en separat app med egen nav |
| **14.5** | **Preview visar värde, inte funktionslistor** — mockad upplevelse; CTA enligt `rollout_mode` (`off` = ingen preview) |
| **14.6** | **Barn får aldrig fler än två navigationsval samtidigt** — Idag · Skatt; dölj nav under aktiv NU |
| **14.7** | **Ett paket = ett primärt problem** — inget feature creep utan problemkoppling (§0) |
| **14.8** | **Barnvy visar aldrig text utan visuellt stöd** — auto emoji-fallback minimum; familjefoto = rekommenderad nivå |
| **14.9** | **Gating på två nivåer** — komponent (paket) + feature (rollout) (§8.2) |
| **14.10** | **Samma preview-data överallt** — `preview-data.js`, aldrig familjens riktiga data (§9.6) |
| **14.11** | **Betalning endast i appen** — Apple (iOS) eller Google (Android); webb visar preview och hänvisar till appen (§9.7) |
| **14.12** | **Arkiv, inte radering** — paket styr åtkomst, aldrig existens av användardata (§8.5) |
| **14.13** | **Renderingsordning** — access → component → rollout → preview (§6.6) |

### 14.14 AI-princip (framtidssäkring)

*Gäller all framtida AI-funktionalitet — byggs inte i v1.2, men beslutet tas nu för att undvika senare kaos.*

| Regel | Beskrivning |
|-------|-------------|
| **AI får föreslå** | Rutiner, schemaförändringar, rapporter, observationer, stödmaterial |
| **AI får aldrig automatiskt ändra** | Schema, rapporter, `seven_questions`, belöningar eller stödmaterial utan explicit godkännande från förälder |
| **AI-output är utkast** | Alltid preview + *Godkänn* / *Avvisa* — aldrig tyst skrivning till `activity_template`, `weekly_schedule` eller `daily_log` |
| **Barndata** | AI får inte tränas på familjens data utan separat samtycke (GDPR) |

Exempel på framtida features som omfattas: AI-rutiner · AI-förslag i För dig · AI-sammanfattade rapporter · AI-observationer.

### 14.15 Vägen till 10/10 — luckor täppta

| Dimension | Före | Nu |
|-----------|------|-----|
| Produktstrategi | 9.5 | **10** — §0 + §14.7 ✅ |
| Informationsarkitektur | 9 | **10** — §6.4 ✅ |
| Tillgänglighet | 9 | **10** — §7.2 + §14.8 ✅ |
| Implementerbarhet | 8.5 | **10** — §7.2 + §8.2 ✅ |
| Monetisering | 9 | **10** — §9.5 ✅ |
| Styrning & uppföljning | — | **10** — §15 + §14.12 ✅ |

---

## 15. Success metrics

*Specen definierar vad produkten är, hur den fungerar och hur den säljs. Detta avsnitt definierar **hur vi vet att den fungerar**.*

### 15.1 North Star Metric

**Primär NSM (v1.2):**

> **Antal genomförda aktiviteter per barn och vecka**

Mäter kärnvärdet: barnet genomför rutiner, föräldern ser framsteg, produkten används i vardagen.

**Baseline (före v1.2):** mät nuvarande medelvärde i `analytics_daily_snapshots` eller ad hoc-query — sätt mål som +10% relativt baseline efter 90 dagar med v1.2 live. Exakt siffra är ett produktbeslut vid go-live, inte hårdkodad i spec.

**Stödjande retention-metric:**

> **Andel familjer aktiva ≥ 3 dagar/vecka**

Mäter vanemönster och churn-risk. Använd som komplement — inte som primärt optimeringsmål om det konkurrerar med djup användning (kvalitet före frekvens).

### 15.2 KPI per paket

| Paket | KPI | Mätdefinition | Mål (initialt) |
|-------|-----|---------------|----------------|
| **Basic** | Aktiv rutin | % familjer med ≥1 avklarad aktivitet/dag i 30 dagar efter onboarding | Baseline → +10% efter 90 dagar |
| **Basic** | För dig-engagemang | % familjer som klickar För dig-modulen ≥1 gång/vecka | ≥25% av aktiva |
| **Rapportering** | Rapportanvändning | Antal skapade/exporterade rapporter per familj och månad | ≥1/månad bland köpare |
| **Pedagog** | Aktiva relationer | Antal familjer med ≥1 accepterad pedagoginbjudan + aktiv inom 30 dagar | Baseline efter lansering |
| **Pedagog** | Daganteckningar | Antal publicerade `pedagog_notes` per aktiv pedagog och vecka | ≥3/vecka bland aktiva |
| **Pedagog** | Skolavbockningar | Antal `daily_log_item` med `completed_by=pedagog` per vecka | Baseline efter lansering |
| **Extra stöd** | Sju frågor-täckning | % schemalagda aktiviteter med ≥3 ifyllda `seven_questions`-fält (inkl. pictogram) | ≥60% bland teacch-köpare |
| **Extra stöd** | Visuellt stöd | % svar med `image_url` eller `icon_key` (ej enbart auto-fallback) | ≥40% inom 60 dagar |
| **Monetisering** | Konvertering preview → köp | % familjer som köper efter kontextuell trigger (§9.5) | Baseline efter `purchase`-live |
| **Intressefas** | Registrerat intresse | Antal familjer per `component` i `package_interest` (§9.8) | Ranking per paket |
| **Intressefas** | Intresse-rate | % aktiva familjer med ≥1 intresse / komponent | Baseline → A/B-test |
| **Tillgänglighet** | Läs upp-användning | % NU-sessioner med teacch där `read_aloud` används | Baseline (valfritt) |

### 15.3 Datainsamling

Befintlig infrastruktur: `analytics_events` (anonymiserat, `family_id` UUID) + `analytics_daily_snapshots`.

| Event (exempel) | `event_type` | `metadata` | Fas |
|-----------------|--------------|------------|-----|
| Aktivitet avklarad | `activity_completed` | `{ child_id_hash, source: 'child'|'parent' }` | alla |
| Rapport exporterad | `report_exported` | `{ format: 'pdf' }` | alla |
| Pedagog kopplad | `pedagog_linked` | `{ invite_accepted: true }` | alla |
| Pedagog anteckning klar | `pedagog_note_published` | `{ child_id_hash }` | alla |
| Pedagog anteckning låst | `pedagog_note_locked` | `{ child_id_hash }` | alla |
| Skolaktivitet avbockad | `pedagog_activity_completed` | `{ child_id_hash, source: 'educator' }` | alla |
| Skolaktivitet tillagd | `pedagog_school_activity_added` | `{ child_id_hash }` | alla |
| Samarbetskommentar | `pedagog_day_comment_added` | `{ author_role }` | alla |
| Frånvaro rapporterad | `pedagog_absence_marked` | `{ child_id_hash }` | alla |
| Pedagog audit (agg) | `pedagog_child_viewed` | `{ child_id_hash }` | alla |
| Sju frågor visad | `seven_questions_shown` | `{ fields_filled: 3 }` | alla |
| Preview visad | `preview_shown` | `{ component: 'reporting', source: 'bottom_nav_preview' }` | `interest` + `purchase` |
| **Intresse registrerat** | `interest_registered` | `{ component: 'reporting', source: 'bottom_nav_preview' }` | **endast `interest`** |
| **Köp påbörjat** | `upgrade_from_preview` | `{ component: 'reporting', source: 'bottom_nav_preview' }` | **endast `purchase`** |
| Kontextuell trigger | `upgrade_trigger_shown` | `{ component: 'reporting', trigger: '14_day_activity_data' }` | `interest` + `purchase` |

**Regel — ett event per fas (undvik dubbelspårning):**

| `rollout_mode` | CTA-klick triggar |
|----------------|-------------------|
| `interest` | `interest_registered` — **aldrig** `upgrade_from_preview` |
| `purchase` | `upgrade_from_preview` (= köp påbörjat, betaldialog öppnas) — **aldrig** `interest_registered` |

`interest_registered` och `upgrade_from_preview` mäter **olika** handlingar i **olika** faser. Bygg spårningen mot rätt event för aktuell fas — annars blir intressedatat oanvändbart de första veckorna.

**Regel:** KPI:er beräknas i midnight-scheduler till `analytics_daily_snapshots` — inte ad hoc i produktionsqueries.

### 15.4 Granskningsrytm

| Intervall | Aktivitet |
|-----------|-----------|
| Veckovis | NSM + aktiva familjer (internt dashboard) |
| Månadsvis | KPI per paket — beslut om iteration |
| Per release | Acceptanskriterier §11 + relevanta KPI:er gröna innan "klar" |

---

## 16. Implementationsplan

*Hur v1.2 byggs i kod — kopplar spec, designmockups och befintlig kodbas.*

### 16.1 Nuläge vs mål

| Område | Finns idag | v1.2 mål |
|--------|------------|----------|
| `family_subscriptions` + `has_component()` | ✅ | + `pedagog`, `teacch` i register |
| `requireComponent()` | ✅ | Använd på alla paket-gatade routes; `lifetime_free` = endast `basic_app` |
| `requireFeature()` + `hasAccess()` | ✅ | Koppla till komponenter via `component-feature-map` (§8.2) |
| Föräldernav | Hem · Schema · För dig · Skatt · Mer | Idag · Rutiner · Utveckling · Samarbete · Barn/Stöd (§6) |
| Barnnav | 4 flikar | Idag · Skatt; dölj under aktiv NU med teacch (§7.5) |
| Betalning | RevenueCat IAP (iOS/Android), ej webb | Fyra paket via IAP; webb = preview only (§9.7) |
| `visual_timer` | ✅ på `child` | Paketerat under teacch i Extra stöd-NU |
| Rapporter | `requireFeature('klinisk_rapportering')` | + `requireComponent('reporting')` + preview |
| De sju frågorna | — | Migration, API, bibliotek, barnvy (§7) |
| Preview-register | — | `config/preview-data.js` (§9.6) |

**Kritisk insikt:** Två gating-system (`requireComponent` vs `requireFeature`) pratar inte ihop idag. **Fas 0** måste länka dem innan UI byggs.

### 16.2 Arkitektur

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend                                                     │
│  native-tab-bar.js · preview-shell.js · child-seven-       │
│  questions.js · iap-manager.js · features-cache.js            │
└──────────────────────────┬──────────────────────────────────┘
                           │ GET /api/subscription/access
┌──────────────────────────▼──────────────────────────────────┐
│ Backend                                                      │
│  package-access.js · requireComponent() · requireFeature()    │
│  family_subscriptions · features / family_features          │
└──────────────────────────┬──────────────────────────────────┘
                           │ POST /api/iap/webhook
┌──────────────────────────▼──────────────────────────────────┐
│ RevenueCat → App Store (iOS) / Play Billing (Android)        │
└─────────────────────────────────────────────────────────────┘

Config: subscription-components.js · component-feature-map.js
        preview-data.js · seven-questions-pictograms.js
```

**Regel:** `hasComponent('teacch')` = familjen har köpt paketet. `hasFeature('de_sju_fragorna')` = feature rollout inom paketet. Klienten hämtar **båda** från ett API.

### 16.3 Fas 0 — Fundament (backend, inget synligt UI)

| # | Leverans | Filer |
|---|----------|-------|
| 0.0 | Rollout-läge `off` som default i `app_config` | `app_config` seed, `src/lib/package-access.js` |
| 0.0b | Grandfathering-migration | `migrations/*_grandfather_package_components.js` (§8.4) |
| 0.0c | `component_state` på subscriptions | `migrations/*_component_state.js` (§8.5) |
| 0.1 | `pedagog` + `teacch` i paketregister | `config/subscription-components.js` |
| 0.2 | Feature → komponent-mapping | `config/component-feature-map.js` *(ny)* |
| 0.3 | Enhetlig access-modul | `src/lib/package-access.js` *(ny)* |
| 0.4 | Uppdatera `hasAccess()` — komponent krävs för icke-CORE features | `db/features.js` |
| 0.5 | Fixa `lifetime_free` — ge `basic_app`, inte alla paket | `src/middleware/require-component.js` |
| 0.6 | API för klient | `GET /api/subscription/access` *(ny route)* |

```javascript
// GET /api/subscription/access — svar
{
  rollout_mode: 'off',   // 'off' | 'interest' | 'purchase' — default 'off'
  show_prices: false,
  purchase_enabled: false,
  view_mode: 'parent',   // resolveViewMode() — §6.9
  components: {
    basic_app:  { has: true,  state: 'active' },
    reporting:  { has: false, state: 'disabled' },
    pedagog:    { has: false, state: 'disabled' },
    teacch:     { has: false, state: 'disabled' },
  },
  features:   { de_sju_fragorna: false, read_aloud: false, klinisk_rapportering: false, … },
  preview:    { reporting: false, pedagog: false, teacch: false },  // rollout !== 'off' && !has
  archive:    { reporting: 0, pedagog: 0, teacch: 0 },              // antal arkiverade poster
}
```

**Rendering:** Klienten evaluerar `access → component.state → rollout_mode → preview` (§6.6) — inga undantag per sida.

**Tester:** `test/package-access.test.js` — komponent + feature + lifetime_free.

**Exit-kriterium:** Admin kan tilldela komponent → rätt features togglas; API returnerar konsekvent state. Med `rollout_mode=off` ser klienten ingen ny UI.

### 16.4 Fas 1 — Preview + intresse (eller köp)

| # | Leverans | Filer |
|---|----------|-------|
| 1.1 | Central mock-data | `config/preview-data.js` |
| 1.2 | Preview-shell (banner, vattenstämpel, CTA växling) | `public/js/preview-shell.js`, `public/css/preview-shell.css` |
| 1.3 | `/upgrade` — fyra löfteskort (§9.1) | `public/upgrade.html` |
| 1.4 | **Intressefas:** `POST /api/subscription/interest` + `package_interest` | `src/routes/subscription.js`, migration (§9.8 schema) |
| 1.5 | CTA: *Jag är intresserad* när `rollout_mode=interest` | `preview-shell.js` |
| 1.6 | **Köp-live:** Native Köp nu → RevenueCat | `public/js/iap-manager.js` |
| 1.7 | Webb Köp nu → öppna appen (§9.7) | `preview-shell.js` |
| 1.8 | Webhook → `family_subscriptions.components` | `src/routes/iap.js` |
| 1.9 | Admin: paketintresse + rollout + statistik (§9.10) | `public/admin/admin-subscription-settings.js`, `admin-families.js` |

**Exit-kriterium (intressefas):** Alla familjer ser mock för reporting/pedagog/teacch; klick loggas; ingen IAP; ingen write.

**Exit-kriterium (köp-live):** `PACKAGES_ROLLOUT_MODE=purchase` → Köp nu + sandbox-köp aktiverar komponent.

### 16.5 Fas 2 — Navigation

#### Förälder — `native-tab-bar.js`

| Nu | v1.2 | Route |
|----|------|-------|
| Hem | **Idag** | `/dashboard` |
| Schema | **Rutiner** | `/schedule`, `/library` |
| För dig | *(modul i Idag)* | `/dashboard#fordig` |
| Skatt | *(in i Barn/Stöd)* | — |
| Mer | **Inställningar** | top-right ⚙️ → `/settings` |
| *(ny)* | **Utveckling** | `/reports` (preview om ej köpt) |
| *(ny)* | **Samarbete** | pedagog-hub *(ny eller befintliga sidor)* |
| *(ny)* | **Barn/Stöd** | hub: barnvy-genväg + Extra stöd |

**Filer:** `public/js/native-tab-bar.js`, `public/js/parent-magic-shell.js`, `public/js/dashboard-home-hub.js` (För dig-modul), `public/css/parent-bottom-nav.css`.

**Redirects:** `/for-dig` → `/dashboard#fordig` (bokmärken).

#### Barn — `child-dashboard.html`

| Nu | v1.2 |
|----|------|
| Idag · Schema · Skatt · Mer | **Idag · Skatt** |
| Nav alltid synlig | Dölj nav under aktiv NU + teacch |

**Filer:** `public/child-dashboard.html`, `public/js/child-dashboard.js`, `public/css/child-bottom-nav.css`.

**Exit-kriterium:** 5 flikar förälder; För dig inte i nav; barn max 2 flikar; pedagog **4 flikar** (Översikt · Idag · Historik · ⚙️); gamla URL:er redirectar.

### 16.5b Fas 2b — Pedagogläge (§4.4)

Bygg efter Fas 0 (gating) — kan parallellt med Fas 2 eller 3.

| # | Leverans | Filer |
|---|----------|-------|
| 2b.1 | Migration: `pedagog_school_activity`, `pedagog_profile`, `pedagog_day_comment`, `pedagog_day_absence`, `pedagog_audit_log`, `note_status` på `pedagog_notes`, completion-fält på `daily_log_item` | `migrations/*_pedagog_v12.js` |
| 2b.2 | API: pedagog daglogg (Modell A + `completion_comment`) | `src/routes/pedagog-daily-log.js` *(ny)* |
| 2b.3 | API: skolaktiviteter CRUD (direkt `daily_log_item`-koppling) | `src/routes/pedagog-school-activities.js`, `db/pedagog-school-activity.js` |
| 2b.4 | API: samarbetskommentarer, frånvaro, audit-write | `src/routes/pedagog-day-comments.js`, `pedagog-absence.js`, `src/lib/pedagog-audit.js` |
| 2b.5 | Pedagog dagvy (tre sektioner) | `public/pedagog-dag.html`, `public/js/pedagog-dag.js` *(ny)* |
| 2b.6 | Pedagog-nav (**4 flikar**) + historik | `public/js/pedagog-nav.js`, `public/pedagog-historik.html` |
| 2b.7 | Arbetsstatus-dashboard | `public/pedagog-oversikt.html` |
| 2b.8 | Förälder Samarbete (§4.2): lista, dagvy, historik/sök, kommentarer | Samarbete-flik + `public/js/samarbete.js` *(ny)* |
| 2b.9 | Push-notiser pedagog + förälder | befintlig push-infra + `pedagog-push.js` |
| 2b.10 | Feature-seed + analytics | `scripts/seed-features.js`, §15.3 |
| 2b.11 | GDPR-export inkl. `pedagog_audit_log` | `src/lib/family-export.js`, `family-export-sql.js` |

**Gating:** `requireComponent('pedagog')` på **nya** inbjudningar (§4.3); `requirePedagogAccess(childId)` på alla pedagog-write-routes.

**Exit-kriterium:** Pedagog arbetsflöde (§4.4.17) + förälder Samarbete (§4.2). Dashboard-status per pedagog (ej aggregerad). Anteckning låses 23:59 permanent. Frånvaro = read-only aktiviteter + banner. `completion_comment` i UI. GDPR-export inkluderar audit-logg.

### 16.6 Fas 3 — Extra stöd (teacch)

Bygg i denna ordning:

| # | Leverans | Filer |
|---|----------|-------|
| 3.1 | Migration `seven_questions JSONB` | `migrations/` |
| 3.2 | `normalizeSevenQuestions()`, `QUESTION_ORDER` | `src/lib/seven-questions.js` *(ny)* |
| 3.3 | Pictogram-bibliotek (~40 st) | `config/seven-questions-pictograms.js` *(ny)* |
| 3.4 | API: activities + pictograms + daily-log enrich (inkl. virtuellt `what`, §7.1) | `src/routes/activities.js`, `src/lib/schemas.js` |
| 3.4b | **DELETE-route scrubbar JSONB-referenser** (§7.2) | `src/routes/activities.js` |
| 3.5 | Förälder: redigering i bibliotek | `public/js/library.js` |
| 3.6 | Barnvy: NU-kort med sju frågor + **nödutgång** (§7.5) | `public/js/child-seven-questions.js` *(ny)* |
| 3.7 | Visuell timer (klientberäknad) kopplad till `how_long` | återanvänd `initTimeTimers()` i `child-dashboard.js` |
| 3.8 | Läs upp (TTS) — dölj om ej tillgänglig | `public/js/child-read-aloud.js` *(ny)* |
| 3.9 | Feature-seed | `scripts/seed-features.js` |

**Gating:** `requireComponent('teacch')` på write; read i barnvy om komponent finns.

**Referensintegritet (3.4b):** PostgreSQL kan **inte** sätta FK från ett JSONB-fält. När en aktivitet raderas måste `DELETE /api/activities/:id` i **samma transaktion**:

1. Hämta `name`, `emoji`, `icon_key`, `image_url` från mallen som ska raderas
2. Skriv in dessa som **snapshot** i `what_next` på alla berörda rader (frys visuellt tillstånd)
3. Sätt `activity_template_id = null`
4. Radera mallen

```sql
-- Pseudokod: applicera per träffande rad med värden från raderad mall ($name, $emoji, …)
UPDATE activity_template
SET seven_questions = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(seven_questions, '{what_next,activity_template_id}', 'null'),
        '{what_next,text}', to_jsonb($name::text)
      ),
      '{what_next,emoji}', to_jsonb($emoji::text)
    ),
    '{what_next,icon_key}', to_jsonb($icon_key::text)
  ),
  '{what_next,image_url}', to_jsonb($image_url::text)
)
WHERE family_id = $1
  AND seven_questions->'what_next'->>'activity_template_id' = $2;
```

`normalizeSevenQuestions()` vid läsning: om `activity_template_id` saknas men `text`/symbol finns → rendera fryst kort; droppa endast trasig referens utan snapshot.

**Designreferens:** `docs/mockups/paket-v1.2-nav.png` panel 3 · `docs/mockups/barnvy.html` · §13.5.

**Exit-kriterium:** Barn ser pictogram (aldrig text-only); timer vid `how_long`; högtalare om TTS finns; ingen bottom nav under aktivitet **men vuxen-gated nödutgång finns** (§7.5); radering av aktivitet lämnar inga ghost-referenser.

### 16.7 Fas 4 — Analytics & triggers

| # | Leverans | Var |
|---|----------|-----|
| 4.1 | `activity_completed` — standardisera metadata | befintliga completion-flöden |
| 4.2 | `seven_questions_shown` | `child-seven-questions.js` |
| 4.3 | `interest_registered` (interest) / `upgrade_from_preview` (purchase) — ett per fas (§15.3) | `preview-shell.js` |
| 4.4 | `upgrade_trigger_shown` | kontextuella banners (§9.5) |
| 4.5 | Midnight snapshot — NSM | befintlig scheduler |

**Kontextuella triggers (§9.5):**

| Paket | Trigger | Hook |
|-------|---------|------|
| Rapportering | ≥14 dagar aktivitetsdata | midnight scheduler |
| Pedagog | pedagoginbjudan | `pedagog_invite` routes |
| Extra stöd | redigera aktivitet / sju frågor | `library.js` |

### 16.8 Fas 5 — IAP-produkter (§9.7)

| # | Leverans |
|---|----------|
| 5.1 | Produkt-ID per paket i App Store Connect + Play Console |
| 5.2 | RevenueCat offerings/packages mappade till `basic_app`, `reporting`, `pedagog`, `teacch` |
| 5.3 | Webhook uppdaterar `family_subscriptions.components[]` med `component` + `expires_at` |
| 5.3b | **Idempotent webhook** — `revenuecat_event_id` UNIQUE; duplicerade events ignoreras | `iap_webhook_log` eller kolumn på subscription |
| 5.4 | Sandbox-test iOS + Android |
| 5.5 | App Review — inga webb-betalningstexter i native |

**Målbild RevenueCat:**

```
Offering "v1.2"
  ├── package_basic      → basic_app
  ├── package_reporting  → reporting
  ├── package_pedagog    → pedagog
  └── package_teacch     → teacch
```

Kombinerbara köp = flera packages i samma offering (produktbeslut).

**IAP idempotens (P0):**

```sql
CREATE TABLE IF NOT EXISTS iap_webhook_log (
  revenuecat_event_id TEXT PRIMARY KEY,
  event_type          TEXT NOT NULL,
  family_id           UUID REFERENCES family(id),
  processed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Webhook-handler: `INSERT … ON CONFLICT (revenuecat_event_id) DO NOTHING` → returnera 200. Förhindrar dubbel `component_state=active` vid RevenueCat-retries.

### 16.9 Epics — PR-uppdelning

| Epic | Fas | Beskrivning | Beror på |
|------|-----|-------------|----------|
| **E1** | 0 | package-access + API | — |
| **E2** | 1 | preview-data + preview-shell + intresse-CTA | E1 |
| **E3** | 1 | `/upgrade` 4-paket + interest API | E1, E2 |
| **E3b** | 5 | IAP-köp native (efter intressefas) | E3, admin-beslut |
| **E4** | 2 | Nav förälder (native-tab-bar) | E2 |
| **E5** | 2 | Nav barn (2 flikar, dölj vid NU) | — |
| **E6** | 3 | seven_questions migration + lib | E1 |
| **E7** | 3 | library editor + pictograms | E6 |
| **E8** | 3 | child-seven-questions UI | E6, E7 |
| **E9** | 3 | read_aloud + timer teacch | E8 |
| **E10** | 4 | analytics + triggers + admin stats/intresse | E2, E3 |
| **E11** | 5 | IAP produkter + webhook components | E3 |
| **E12** | 2b | Pedagogläge: arbetsflöde, audit, flera pedagoger, 4-fliks nav (§4.4) | E1 |
| **E13** | 1/4 | Admin → Prenumeration full (§9.10): rollout, komponenter, familj-tilldelning | E1 |

**Rekommenderad start:** E1 → **E13 (minimal)** → E2 → E4 → E10 för **smoke test** (§9.8 minimal path). **E12** kan byggas parallellt efter E1 om Pedagog prioriteras. Full v1.2 enligt §16 parallellt eller efter intressedata.

### 16.10 Visuell implementation

| Yta | Profil | Referens |
|-----|--------|----------|
| Förälder | Ljus bakgrund `#F0F4FF`, navy header, gold accenter | `docs/mockups/foraldra.html` |
| Barn | Mörk `#0F1629`, gold NU, stjärnhimmel | `docs/mockups/barnvy.html` |
| Extra stöd | Pictogram större än text, grön Klar, ingen nav under aktivitet | `docs/mockups/paket-v1.2-nav.png` |
| Preview | Fade + vattenstämpel + CTA enligt `rollout_mode` | §9.3, panel 4 i mockup |
| Pedagogläge | 12-panel kontaktkarta, Samarbete förälder utan chat | `docs/mockups/pedagog-lage-v12-reference-PROMPT.md` §9.10.9 |

**Typsnitt:** Outfit (rubriker) · Plus Jakarta Sans (brödtext).  
**Vid konflikt:** HTML-mockups > design-affisch > improvisation.

### 16.11 Risker

| Risk | Åtgärd |
|------|--------|
| `lifetime_free` fail-open (alla paket) | Explicit `basic_app` only i Fas 0.5 |
| `hasAccess` ignorerar komponenter | `package-access.js` bridge i Fas 0 |
| Befintliga familjer förlorar reporting/pedagog | Grandfathering-migration §8.4 **före** `requireComponent` på routes |
| **Grandfathered familj ser intresse-CTA istället för sin data** | Preview gated på `hasComponent === false`, inte enbart `rollout_mode` (§6.6, §9.8) |
| **Barn inlåst i dold-nav-aktivitet** | Vuxen-gated nödutgång (§7.5); klientberäknad timer (ej nätberoende) |
| **Ghost-länkar i `seven_questions` JSONB** | DELETE-route scrubbar `activity_template_id` i transaktion (§16.6 3.4b) |
| **Webb/PWA-köp blir återvändsgränd** | Plattformsdetektering → ladda ner-flöde (QR/store/SMS) (§9.7) |
| **Dubbelspårning av intresse vs köp** | Ett event per fas — `interest_registered` / `upgrade_from_preview` (§15.3) |
| `off` vs preview-copy krockar | All preview-UI gated på `rollout_mode !== 'off'` (§9.8) |
| `feature_flag` för enum | Använd `app_config` för `PACKAGES_ROLLOUT_MODE` (§9.8) |
| `child-dashboard.js` växer okontrollerat | All Extra stöd-UI i egna filer (§16.6) |
| Nav bryts på Capacitor iOS/Android | Testa `native-tab-bar.js` på riktiga enheter |
| App Review avvisar webb-betalningstext | §9.7 checklista före submit |
| IAP webhook synkar fel komponent | Idempotent webhook + `revenuecat_event_id` UNIQUE (§16.8) |
| Analytics `source` inkonsekvent | Canonical enum §9.8 — samma i API, DB och events |
| Nedgradering raderar data | Arkivprincip §8.5 — `component_state=archived`, aldrig DELETE |
| Tre parallella preview-implementationer | Renderingsordning §6.6 — ett `package-access`-svar |
| Vy-konflikt (pedagog+barn+teacch) | `resolveViewMode()` §6.9 |

### 16.12 Medvetet inte i v1.2

| Postponerat | Version |
|-------------|---------|
| `minimal_ui` (helbild + en knapp) | v1.3 |
| `transition_support`, `social_stories` | v1.3+ |
| `activity_event` (global händelseström) | v1.3 (§8.7) |
| `child_access` (ersätter `parent_child`) | v1.3+ (§8.7) |
| Optimistic locking / ETag | v1.3 (§8.6) |
| Stripe / webb-checkout | Aldrig (§9.7) |
| AI-rutiner / AI-rapporter | Framtid (§14.14) |
| Full API-kontrakt per endpoint (§17.2) | Iterativt under E1/E12 |

---

## 17. Bilagor — formella kontrakt (team-scale)

*Dessa bilagor kompletterar huvudspecen. v1.2 kan starta utan fullständiga bilagor — men de ska fyllas i parallellt med E1/E12 för att undvika produktbeslut under implementation.*

### 17.1 State machines

| Entitet | Tillstånd | Spec-referens |
|---------|-----------|---------------|
| **Komponent** | `disabled` → `active` → `archived` → `active` | §8.5 |
| **Pedagoginbjudan** | `pending` → `accepted` → `revoked` | §4.4.1, `pedagog_invite` |
| **Pedagogrelation** | `active` (`revoked_at IS NULL`) → `revoked` | `parent_child` |
| **Anteckning** | `draft` → `published` → `locked` | §4.4.5–6 |
| **Aktivitet (completion)** | `open` → `completed` (Modell A, en gång) | §4.4.11 |

### 17.2 API-kontrakt (index)

| Namespace | Endpoints | Epic |
|-----------|-----------|------|
| `/api/subscription/access` | GET | E1 |
| `/api/subscription/interest` | POST | E2 |
| `/api/pedagog-notes` | GET, POST, publish | E12 (befintlig + utökad) |
| `/api/pedagog/daily-log` | GET, PATCH (+ 409) | E12 |
| `/api/pedagog/school-activities` | GET library, POST, DELETE | E12 |
| `/api/pedagog/day-comments` | GET, POST | E12 |
| `/api/pedagog/absence` | PUT, DELETE | E12 |
| `/api/admin/subscription-stats` | GET | E13 |
| `/api/admin/package-interest` | GET, export CSV | E13 |
| `/api/admin/families/:id/subscription` | GET | E13 |
| `/api/admin/families/:id/components/:slug` | PUT | E13 |
| `/api/admin/app-config/PACKAGES_ROLLOUT_MODE` | PUT | E13 |

Fullständiga request/response-schemas i `src/lib/schemas.js` vid implementation.

### 17.3 Databas-ERD (referens)

Kärnrelationer v1.2:

```
family ── child ── daily_log_item
  │         │
  │         ├── pedagog_notes (pedagog_id)
  │         ├── pedagog_school_activity (created_by_parent_id)
  │         ├── pedagog_day_comment
  │         ├── pedagog_day_absence
  │         └── pedagog_audit_log
  │
  ├── family_subscriptions.components[] (state per komponent)
  └── parent ── parent_child (role: primary|shared|pedagog)
```

Visuellt ERD: lägg till `docs/diagrams/paket-v1.2-erd.png` vid implementation.

### 17.4 Acceptance criteria — E12 (exempel)

| # | Given | When | Then |
|---|-------|------|------|
| E12.1 | Pedagog med åtkomst till Ella | Öppnar Idag-flik | Ser tre sektioner + barnväljare |
| E12.2 | Ella kryssat av "Lunch" hemma | Pedagog öppnar dagvy | Lunch visar *Klar hemma* — ej kryssbar |
| E12.3 | Pedagog publicerar anteckning 14:32 | Klockan passerar 23:59 (familj TZ) | `note_status=locked` · förälder ser i Samarbete |
| E12.4 | Familj saknar `pedagog`-komponent | Förälder öppnar Samarbete | Preview **eller** arkiv-läs (§8.5) — aldrig raderad data |
| E12.6 | Ella kryssat av hemma | Pedagog PATCH samma rad | 409 + toast *"uppdaterades av Ella"* |
| E12.7 | Förälder revokerar åtkomst | Pedagog klickar vidare | 403 → omedelbar redirect |

---

*Spec v1.2 Paket — **implementationsklar**. Produktprinciper §14, success metrics §15, implementationsplan §16 och bilagor §17.*
