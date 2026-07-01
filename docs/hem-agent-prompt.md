# Agent-uppdrag: Bygg Hem till 10/10 (GO)

**Kopiera hela filen till en ny agent** — eller peka agenten hit: `docs/hem-agent-prompt.md`  
**Produktvision:** [hem-vision.md](hem-vision.md)  
**Index (alla hubbar):** [parent-hubs-index.md](parent-hubs-index.md)

---

# Definition of Done

Arbetet är **inte klart** förrän följande test klaras.

## Jenny-test

En förälder som aldrig sett Hem ska inom **5 sekunder**, **utan scroll**, svara:

1. **Hur går det idag?**
2. **Behöver jag göra något nu?**
3. **Hur lämnar jag över till barnet?**

Om någon fråga inte kan besvaras utan att scrolla förbi diagram, läsa mycket text eller tolka tre konkurrerande kort — är implementationen inte klar.

## Filterregel + beslutsregel

Varje komponent du lägger till eller behåller måste klara:

- **Filterregeln:** Hjälper den användaren besvara minst en av de tre frågorna inom 5 sek?
- **Beslutsregeln:** Finns det högst **en** komponent som föreslår nästa handling?

## Exit Rule

Föräldern ska kunna lämna Hem och säga: *jag vet hur dagen ser ut · jag har gjort (eller vet att inget) vuxenbeslut krävs · barnet kan ta över*.

## Success Metrics (PR)

| Mål | Mått |
|-----|------|
| Jenny hittar nästa steg | < 5 sek |
| Ingen scroll för beslut | Ja |
| Antal coacher | 1 |
| Synliga blockerande beslut | ≤ 1 |
| Tom-state | Alltid definierad |

## Framgångskänsla

När föräldern lämnar Hem ska det kännas som att **dagen redan är under kontroll**.

## Tekniskt minimum

- `npm run test:gate` grön
- Mobil först (iPhone portrait, parent-magic dark theme)
- Inga POS-brott (PA-01, PA-02, P-04, B-08)
- Commit + PR med POS-citat och Jenny-test-resultat

---

# Ditt mandat

Du ska bygga **Hem** till en verklig 10/10-upplevelse — inte implementera en specifikationslista.

## Du får — och ska — förbättra

Du får ändra copy, informationshierarki och komponentstruktur om det leder till en tydligare morgonupplevelse.

**Produktvisionen ([hem-vision.md](hem-vision.md)) är viktigare än befintlig kod.**

Om du hittar en enklare lösning som bättre uppfyller visionen ska du välja den och motivera varför i PR-beskrivningen.

Du ska kunna säga:

> *"Det här uppfyller inte filterregeln / beslutsregeln, därför gör jag annorlunda."*

---

# Stop Rule

Om du upptäcker att flera parallella beslutssystem hindrar visionen ska du:

1. Beskriva problemet (se [first-success/DECISION-BOUNDARIES.md](first-success/DECISION-BOUNDARIES.md)).
2. Föreslå den minsta arkitekturändringen.
3. Genomföra den om den inte bryter mot POS eller `test:gate`.

**Implementera aldrig en rörigare Hem bara för att följa befintlig kod.**

---

# Scope

Detta arbete gäller **endast Hem-flödet** (`/dashboard`, magic home hub).

Ändra inte Planering, Belöningar, Familj, För dig eller onboarding annat än om det krävs för att Hem ska fungera korrekt.

Om du hittar förbättringar utanför scope:

- dokumentera dem
- skapa TODO
- **implementera dem inte**

---

## Anti-patterns — bygg inte

- Fler coach-kort · fler banners · fler CTA-rader (bryter beslutsregeln)
- Schemaeditor eller bibliotek på Hem
- Stjärndiagram som primär vy
- `encouragementCopy()` som dold policy för "nästa steg"
- Readiness som coach *och* undantag samtidigt
- Tips/rekommendationer i undantagssektionen (se undantagsdefinition i visionen)
- Jämförelse mellan barn
- Veckodiagram ovanför blockerande godkännande (bryter priority ladder)

**Om du lägger till något ska något annat tas bort.**

## Självgranskning innan du är klar

Gå igenom **varje sektion** enligt priority ladder (Safety → Status → Coach → Handoff → Vecka) och fråga:

1. *"Vilken av de tre frågorna besvarar denna sektion?"* (filterregeln)
2. *"Om jag vore Jenny klockan 07:15, skulle jag fortfarande undra vad jag ska titta på först?"*

Om **ja** på fråga 2 — eller **ingen** på fråga 1 — förbättra innan du lämnar arbetet.

---

# Produktvision (läs [hem-vision.md](hem-vision.md) för full version)

## Kompass

> **Hem ska få föräldern att känna: "Jag ser läget — och vet exakt vad jag gör härnäst."**

## Kärnregler

| Regel | En mening |
|-------|-----------|
| **Filterregel** | Om en komponent inte hjälper besvara en av tre frågor inom 5 sek — hör den inte hemma på Hem |
| **Beslutsregel** | Högst en komponent föreslår nästa handling |
| **Copy-regel** | Hem = läge · För dig = rekommendation · Planering = handlingar |
| **Undantag** | Kräver vuxenbeslut nu · blockerar barnet · kan inte vänta |

## Tre frågor (standardvy)

1. Hur går det idag? → per-barn statusrad
2. Behöver jag göra något? → undantagskort eller tydligt "inget"
3. Hur lämnar jag över? → handoff synlig

## Priority Ladder

`Safety (undantag) → Status (idag) → Coach (ett nästa steg) → Handoff → Vecka`

---

# Teknisk vägledning (inte order)

**Läs:** [hem-vision.md](hem-vision.md), [vuxenmeny-v2.md](vuxenmeny-v2.md), [first-success/DECISION-BOUNDARIES.md](first-success/DECISION-BOUNDARIES.md), `AGENTS.md`, `.cursor/rules/040-parent-experience.mdc`

**Nyckelfiler:**

| Fil | Roll |
|-----|------|
| `public/js/dashboard-home-hub.js` | Magic home layout |
| `public/js/home-readiness.js` | Undantagskort (`/api/family/readiness`) |
| `public/js/dashboard.js` | Legacy + stats |
| `public/js/engine-client.js` | First Success / Journey (mål: en coach) |
| `public/dashboard.html` | Shell + mount points |
| `src/routes/family/core.js` | `readiness`, `dashboard-stats`, `first-success` |

**Sannolik riktning (du avgör hur):**

- `/readiness` → endast undantag (`priority <= 1`: godkännanden, inbjudningar) — dölj sektion om tom
- Ett `#engineCoachMount` eller motsvarande för Journey-nästa-steg (beslutsregeln)
- Veckodiagram **under** handoff (priority ladder steg 5)
- Ta bort eller nedgradera parallella coach-banners som duplicerar beslut

**Branch:** `cursor/hem-vision-docs-6752` (eller aktuell feature-branch)

**Test:**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false env -u RESEND_API_KEY npm run test:gate
```

---

# Arbetsflöde

1. Läs vision + kod + Jenny-scenariot (morgon, två barn, en pending approval)
2. Kartlägg var tre frågor inte besvaras idag; märk komponenter som bryter filterregel/beslutsregel
3. Designa minsta ändring som klarar Definition of Done + priority ladder
4. Implementera — ta bort lika mycket som du lägger till
5. Jenny-test + självgranskning per sektion
6. `npm run test:gate`
7. PR: vision uppfylld, Jenny-test, success metrics, vad som togs bort, POS-sektioner (PA-01, PA-02, P-04, B-08)

---

# Sista instruktionen

**Bygg inte fler kort.**

Bygg den **enklaste** Hem som får en stressad förälder att känna:

> *"Jag ser läget. Jag vet vad som gäller. Nu kan barnet ta över."*

Mindre UI, färre beslut — alltid bättre om Jenny-testet fortfarande passerar.
