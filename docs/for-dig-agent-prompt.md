# Agent-uppdrag: Bygg För dig till 10/10 (GO)

**Kopiera hela filen till en ny agent** — eller peka agenten hit: `docs/for-dig-agent-prompt.md`  
**Produktvision:** `docs/for-dig-vision.md`  
**Engineering-spec:** `docs/for-dig-spec.md`

---

# Definition of Done

Arbetet är **inte klart** förrän följande test klaras.

## Jenny-test

En förälder som aldrig sett För dig tidigare ska kunna öppna **valfritt mål** och inom **5 sekunder** svara:

1. **Vilket problem löser detta?**
2. **Vad händer om jag trycker Aktivera?**
3. **Är det tryggt att göra det?**

Om någon fråga inte kan besvaras **utan att öppna detaljer, scrolla eller läsa mycket text** — är implementationen inte klar.

## Framgångskänsla

När föräldern lämnar För dig (särskilt efter aktivering) ska det kännas som att **appen redan gjort det svåraste arbetet**.

## Tekniskt minimum

- `npm run test:gate` grön
- Mobil först (iPhone portrait, parent-magic dark theme)
- Inga POS-brott (förälder konfigurerar, barn tjänar stjärnor vid genomförande)
- Commit + PR med POS-citat och Jenny-test-resultat

---

# Ditt mandat

Du ska bygga **För dig** till en verklig 10/10-upplevelse — inte implementera en specifikationslista.

## Du får — och ska — förbättra

Du får ändra copy, informationshierarki och komponentstruktur om det leder till en tydligare upplevelse.

**Produktvisionen (`docs/for-dig-vision.md`) är viktigare än den föreslagna implementationen nedan.**

Om du hittar en enklare lösning som bättre uppfyller visionen ska du välja den och motivera varför i PR-beskrivningen.

Du ska kunna säga:

> *"Det här uppfyller inte visionen, därför gör jag annorlunda."*

Inte:

> *"Jag implementerade exakt det som stod."*

---

# Stop Rule

Om du upptäcker att den befintliga arkitekturen hindrar produktvisionen ska du:

1. Beskriva problemet.
2. Föreslå den minsta arkitekturändringen.
3. Genomföra den om den inte bryter mot POS eller `test:gate`.

**Implementera aldrig en sämre produkt bara för att följa befintlig kod.**

---

# Scope

Detta arbete gäller **endast För dig-flödet**.

Ändra inte onboarding, Hem, Schema, Barnvy eller Skattkammaren annat än om det krävs för att För dig ska fungera korrekt.

Om du hittar förbättringar utanför scope:

- dokumentera dem
- skapa TODO
- **implementera dem inte**

---

## Anti-patterns — bygg inte

- Fler steg · fler val · fler informationsblock · fler modaler · fler beslut
- Långa aktivitetslistor i standardvy
- Tekniska begrepp i föräldratext (*veckoschema*, *overwrite*, *bibliotek*)
- Mål-namn som primär rubrik (*Samarbete hemma*, *Självständighet*)
- Schema-preview som stort block före Aktivera
- Funktioner som flyttar jobbet tillbaka till föräldern

**Om du lägger till något ska något annat tas bort.**

## Självgranskning innan du är klar

Gå igenom **varje vy** (målkort, rekommendation, barnväljare, bekräftelse, efter aktivering) och fråga:

> *"Om jag vore Jenny, skulle jag fortfarande kunna skriva: 'Jag förstår inte vad som händer när jag aktiverar detta?'"*

Om **ja** på någon vy — förbättra innan du lämnar arbetet.

---

# Produktvision (läs `docs/for-dig-vision.md` för full version)

## Kompass

> **För dig ska få föräldern att känna: "Det här hade jag aldrig orkat sätta upp själv – men nu är det redan klart."**

## Varför

Föräldrar vet problemet — inte lösningen. För dig översätter vardagsproblem till färdiga rutiner. Det arbetet gör appen.

## Tre frågor (standardvy, utan detaljer)

1. Vad löser det? → utfall (`headline`), inte mål-slug  
2. Vad händer om jag trycker? → konkret per barn  
3. Är det säkert? → du kan ändra efteråt  

**Designregel:** Beslut ska kunna fattas **utan att öppna detaljer**.

## Informationshierarki

`Problem → Vad som händer → Handling → Detaljer (Visa mer)`

## Utfallscopy

| Slug | Headline |
|------|----------|
| `trygga-kvallar` | Få lugnare läggningar |
| `bra-morgnar` | Kom iväg utan morgontjat |
| `sjalvstandighet` | Få barnet att klä sig själv |
| `skolansvar` | Få läxor och väska att funka |
| `samarbete-hemma` | Få hjälp med dukning och städning |
| `motivation` | Hålla motivationen uppe med belöningar |

---

# Kontext: Jenny (#33)

> *"Jag förstår inte vad som händer när man aktiverar Samarbeta hemma?"*

Förtroendeproblem. Lösningen är **rätt information vid beslutet**, inte mer information.

**Jenny-test godkänt (målbild):**

```
Få hjälp med dukning och städning

✓ Aktiviteterna för Astrid är klara på mindre än en minut.

Det här händer:
  ✓ Lägger till aktiviteter i schemat
  ✓ Befintligt schema behålls
  ✓ Du kan ändra efteråt

[Lägg till aktiviteterna]  [Anpassa]  [Avbryt]

Visa detaljer
```

---

# Teknisk vägledning (inte order)

**Läs:** `docs/for-dig-vision.md`, `docs/for-dig-spec.md`, `AGENTS.md`, `.cursor/rules/000-core.mdc`, `010-product.mdc`

**Nyckelfiler:**

| Fil | Roll |
|-----|------|
| `src/lib/for-dig-config.js` | Måldefinitioner (server truth) — lägg till `headline` |
| `src/lib/for-dig-activate.js` | Aktivering + plan-preview |
| `src/routes/for-dig.js` | API |
| `public/js/for-dig.js` | Förälder-UI |
| `public/for-dig.html`, `public/css/for-dig.css` | Shell + stil |

**Redan på plats (bygg vidare):** barnväljare, `child_ids[]`, append/replace, Aktivera/Anpassa/Avbryt, ett post-aktiveringssteg, rekommendationer före katalog, mål-badges, magic hero med fokusfråga.

**Sannolik riktning (du avgör hur):**

- `headline` i config + utfallsrubriker i UI
- Bekräftelse som **beslutsskärm** (✓/⚠️/👧), inte schema-preview-block
- `POST /api/for-dig/:slug/preview-plan` med `{ child_ids }` → beslutspunkter
- Detaljer bakom *Visa detaljer*
- Rekommendation: *Bra nästa steg för [namn]*

**Branch:** `cursor/for-dig-10-10-2c04`

**Test:**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false env -u RESEND_API_KEY npm run test:gate
```

---

# Arbetsflöde

1. Läs vision + kod + Jenny-scenariot (Samarbete hemma)
2. Kartlägg var tre frågor inte besvaras idag
3. Designa minsta ändring som klarar Definition of Done
4. Implementera — ta bort lika mycket som du lägger till
5. Jenny-test + självgranskning per vy
6. `npm run test:gate`
7. PR: vision uppfylld, Jenny-test, vad som togs bort, POS-sektioner

---

# Sista instruktionen

**Bygg inte lösningen som beskrivs ovan.**

Bygg den **enklaste** lösning som får en ny förälder att känna:

> *"Nu förstår jag exakt vad som kommer hända."*

Mindre UI, mindre text, färre steg — alltid bättre om Jenny-testet fortfarande passerar.

---

*Om agenten tappar fokus: använd `docs/for-dig-agent-prompt-short.md` istället.*
