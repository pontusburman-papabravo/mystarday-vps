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

- Fler coach-kort · fler banners · fler CTA-rader
- Schemaeditor eller bibliotek på Hem
- Stjärndiagram som primär vy
- `encouragementCopy()` som dold policy för "nästa steg"
- Readiness som coach *och* undantag samtidigt
- Jämförelse mellan barn

**Om du lägger till något ska något annat tas bort.**

## Självgranskning innan du är klar

Gå igenom **varje sektion** (barnrad, åtgärd, coach, handoff, vecka) och fråga:

> *"Om jag vore Jenny klockan 07:15, skulle jag fortfarande undra vad jag ska titta på först?"*

Om **ja** på någon sektion — förbättra innan du lämnar arbetet.

---

# Produktvision (läs [hem-vision.md](hem-vision.md) för full version)

## Kompass

> **Hem ska få föräldern att känna: "Jag ser läget — och vet exakt vad jag gör härnäst."**

## Tre frågor (standardvy)

1. Hur går det idag? → per-barn statusrad
2. Behöver jag göra något? → undantagskort eller tydligt "inget"
3. Hur lämnar jag över? → handoff synlig

## Informationshierarki

`Idag per barn → Undantag → Ett nästa steg → Handoff → Vecka`

## Låsta regler (från vision)

### Prioritetsordning

```
Idag → Undantag → Nästa steg → Handoff → Utveckling
```

### Undantag (inte Pending)

Hem äger **undantag** — Belöningar äger **pending**. Ett väntande belöningsgodkännande är *ett exempel* på undantag.

**Källa:** `GET /api/family/readiness`. Belöningsundantag (`pending_approval`) ska peka till `/rewards` och använda samma data som `pending-requests` — ingen dubbel logik.

### Filterregel

Komponenten hör hemma bara om den hjälper föräldern förstå läget idag, se undantag, eller veta nästa steg/handoff.

### Copy-regel

Läge idag och undantag — inte belöningshantering (Belöningar) eller familjemedlemmar (Familj).

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

- `/readiness` → endast `priority <= 1` (godkännanden, inbjudningar) — dölj sektion om tom
- Ett `#engineCoachMount` eller motsvarande för Journey-nästa-steg
- Veckodiagram **under** handoff
- Ta bort eller nedgradera parallella coach-banners som duplicerar beslut

**Branch:** `cursor/for-dig-10-10-2c04`

**Test:**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false env -u RESEND_API_KEY npm run test:gate
```

---

# Arbetsflöde

1. Läs vision + kod + Jenny-scenariot (morgon, två barn, en pending approval)
2. Kartlägg var tre frågor inte besvaras idag
3. Designa minsta ändring som klarar Definition of Done
4. Implementera — ta bort lika mycket som du lägger till
5. Jenny-test + självgranskning per sektion
6. `npm run test:gate`
7. PR: vision uppfylld, Jenny-test, vad som togs bort, POS-sektioner (PA-01, PA-02, P-04, B-08)

---

# Sista instruktionen

**Bygg inte fler kort.**

Bygg den **enklaste** Hem som får en stressad förälder att känna:

> *"Jag ser läget. Jag vet vad som gäller. Nu kan barnet ta över."*

Mindre UI, färre beslut — alltid bättre om Jenny-testet fortfarande passerar.
