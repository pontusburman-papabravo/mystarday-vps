# Föräldraplattformen — Gemensamma hubbprinciper

**Status:** Godkänd referens (2026-07)  
**Syfte:** Regler som återkommer i alla fem hubbvisioner — en referens för människor och agenter.  
**Baseline:** [parent-hubs-product-baseline-10-10.md](parent-hubs-product-baseline-10-10.md)  
**Detaljer per hub:** [parent-hubs-index.md](parent-hubs-index.md)

---

## En hub, ett verb

Varje hub kan beskrivas med **ett verb**. Användaren ska aldrig behöva fundera över *vilken* del av appen som äger en uppgift.

| Hub | Verb | Kärnfråga | En mening |
|-----|------|-----------|-----------|
| **Hem** | Se | Vad händer idag? | Se hur dagen ser ut och gör det enda som behövs nu. |
| **Planering** | Bygga | Hur ändrar jag vardagen? | Gå till rätt verktyg för att bygga vardagen. |
| **Belöningar** | Hantera | Vad väntar och hur fungerar belöningarna? | Hantera belöningar och se vad som väntar. |
| **Familj** | Administrera | Vem ingår och vem ansvarar för vad? | Hantera människorna i familjen och öppna rätt barnprofil. |
| **För dig** | Aktivera | Vilken färdig lösning hjälper mig? | Aktivera färdiga lösningar på vardagsproblem. |

---

## Plattformsregler (alla hubbar)

### 1. En hub äger ett enda mentalt jobb

Om en funktion passar två hubbar — välj **en** ägare. Den andra hubben **länkar** dit.

### 2. Jenny-testet går före implementation

Varje hub har tre frågor som ska besvaras inom **5 sekunder utan scroll**. Om designen misslyckas — bygg om, lägg inte till fler element.

### 3. Om något läggs till ska något annat tas bort

Hubbar får inte växa obegränsat. Ny funktion kräver aktiv avvägning mot befintligt innehåll.

### 4. Mobil först

Designa för iPhone portrait, tumzon, parent-magic dark theme. Desktop är sekundärt.

### 5. Max ett nästa steg

På Hem: ett coach-kort. På För dig: ett primärt CTA per mål. Undvik parallella "gör det här nu"-budskap.

### 6. Status ≠ planering ≠ administration ≠ rekommendation

| Typ | Hub |
|-----|-----|
| Daglig status, undantag, handoff | Hem |
| Bygga schema, bibliotek, kalender | Planering |
| Belöningar, stjärnor, godkännanden | Belöningar |
| Barn, vuxna, pedagoger, barnprofil | Familj |
| Problem → färdig rutin | För dig |

### 7. Vision vinner över befintlig kod

POS och hubbvisioner styr. Legacy-beteende som bryter mot visionen ska refaktoreras — inte bevaras.

### 8. Hubbar länkar vidare — de duplicerar inte varandra

- Belöningar länkar till barnprofil för Framsteg — äger det inte.
- Familj länkar till barnprofil för schema/belöningar — äger det inte.
- Hem länkar till Planering för byggjobb — gör det inte inline.

### 9. Barnprofil = ett barns värld

Allt som rör **ett specifikt barn** (schema, belöningar, framsteg, PIN, barnvy, historik) ägs av barnprofilen (`/family/child/:id`). Hubbar och Familj **öppnar** barnprofilen — de ersätter den inte.

### 10. Filterregel (mall)

Innan något läggs till i en hub, ställ frågan:

> Hjälper detta användaren att *[hubbens verb och kärnfråga]*?

Om nej — hör det inte hemma i den hubben.

Hubbspecifika filterregler finns i respektive `*-vision.md`.

---

## Dokumentstruktur

| Fil | Innehåll |
|-----|----------|
| `parent-platform-principles.md` | Denna fil — gemensamma regler |
| `parent-hubs-product-baseline-10-10.md` | Fryst baseline, implementationsordning, DoD |
| `parent-hubs-index.md` | Index och snabbkopiering till agenter |
| `*-vision.md` | Produktkompass, Jenny-test, hierarki, anti-patterns |
| `*-agent-prompt.md` | Definition of Done, mandat, scope, teknisk vägledning |

**Viktigt:** Agent-uppdrag finns **endast** i `*-agent-prompt.md` — aldrig inklistrade i visionerna.

---

## Definition of Done (gemensam)

Utöver varje hubs Jenny-test:

- Mobil först (iPhone portrait)
- Inga POS-brott (`.cursor/rules/010-product.mdc`)
- `npm run test:gate` grön vid implementation
- Commit + PR med POS-citat och Jenny-test-resultat

---

*Senast uppdaterad: 2026-07-01*
