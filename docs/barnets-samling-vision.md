# Produktspec: barnsamling v1.0

**Version:** v1.0  
**Status:** Produktkompass (utkast för teamreview)  
**Datum:** 2026-07  
**Ersätter som riktning:** "Min värld" som spel (Toca Boca / Animal Crossing-förväntan)

**Relaterat:** [npf-arkitektur-v1.md](npf-arkitektur-v1.md) · [barnmeny-v2.md](barnmeny-v2.md) · [skattkammaren-vision.md](skattkammaren-vision.md) · [handoff/spelgranskning-resultat.md](handoff/spelgranskning-resultat.md)

> **Vy-för-vy NPF-detaljer** (fokusläge, timglas, två saldon, fem statusar, sensorik): se [npf-arkitektur-v1.md](npf-arkitektur-v1.md).  
> Det här dokumentet = **navigationspivot** och samlingens känsla.

---

## Varför vi byter spår

"Min värld" lovar ett spel. Då jämförs vi med Toca Boca och Animal Crossing — och där krävs enormt mycket innehåll vi inte har.

Det vi **redan har** fungerar bättre som något annat:

| Vi har | Det passar till |
|--------|-----------------|
| Rutiner & bockningar | Verklighet som motor |
| Stjärnor & milstolpar | Samlarobjekt |
| Belöningar | Skattkammaren |
| Familj & hälsningar | Mina personer |

**Ny mental modell:** ett personligt skattgömme — en levande samling av barnets framsteg. Inte en värld att utforska.

Spelgranskningen (juli 2026) bekräftar: Idag 7/10, Skattkammaren 6/10, spelhub 3/10. Vi dubblar ner på det som fungerar.

### Befintligt före nytt

Där funktion redan finns i koden ska v1 i första hand förbättra **känsla, språk och placering** — inte bygga parallella system.

Se [npf-arkitektur-v1.md § Befintligt före nytt](npf-arkitektur-v1.md#befintligt-före-nytt).

---

## Kompassen

> **När barnet öppnar appen ska känslan vara: "Wow, titta vad jag har samlat!"**

Inte: *"Vad ska jag göra nu?"*

### Grundprincip

Barn gör riktiga saker. Appen firar dem. Inget annat.

- **Rutiner är spelet.**
- **Samlingen är belöningen.**

### Filterregel (hela barnappen)

Innan något läggs till: *"Hjälper detta barnet se vad hen har åstadkommit — eller bara ge hen en ny uppgift?"*

Om svaret är *ny uppgift* → det hör hemma i **Idag**, inte i samlingen.

---

## Navigation — fyra flikar, klart

| # | Flik | Känsla | En mening |
|---|------|--------|-----------|
| 1 | ☀️ **Idag** | Handling | Vad jag ska göra nu |
| 2 | 🏆 **Min samling** | Stolthet | Titta vad jag har samlat |
| 3 | 💎 **Skattkammaren** | Dröm | Vad jag sparar till |
| 4 | ❤️ **Mina personer** | Tillhörighet | Vem som finns här |

**Ingen världskarta. Inga hubbar. Ingen "Min värld".**

Barnet ska alltid kunna svara på: *"Var ser jag mina medaljer?"* → Min samling.

---

## 1. Idag

**Mål:** Precis som idag — bli ännu bättre. Se [npf-arkitektur-v1.md § Idag](npf-arkitektur-v1.md#-idag) för fokusläge, timglas och neutral avvikelsehantering.

| Behåll | Förbättra |
|--------|-----------|
| En primär handling (nästa aktivitet) | Fokusläge: en uppgift i taget (förstklassigt, inte gömt) |
| Kort firande vid bockning (≤2 s) | Lugn efter sista aktiviteten — ingen ny destination som krävs |
| Stjärnor synliga i rutinen | Koppling till samlingen utan att tvinga barnet dit |

**Efter sista aktiviteten:** kort firande → tillbaka till lugn. Ingen toast som säger "gå till trädgården".

**POS:** C-03 en primär handling · C-04 firande ≤2 s · G-01 verklighet före firande.

---

## 2. Min samling — hjärtat

Inte en lista. **En plats** barnet vill öppna även en lugn kväll.

**Gräns mot Skattkammaren:** Min samling får inte innehålla användbar valuta, köpknappar eller inlösen. Den får visa **totalt intjänade stjärnor** och historik som stolthet. Se [npf-arkitektur-v1.md § Två stjärnsaldon](npf-arkitektur-v1.md#två-stjärnsaldon).

### Troféväggen

En vacker vägg med medaljer längs väggen.

| Medalj | Tröskel |
|--------|---------|
| Första stjärnan | 1 ⭐ |
| | 25 · 50 · 100 · 250 · 500 · 1000 |

**Interaktion:** Tryck på medaljen → snurrar lite (≤0,6 s) → mjukt ljud → kort text, t.ex. *"Du har kämpat länge."*

Låsta medaljer syns men är dämpade — barnet ser vad som väntar, utan skam.

### Dagar i rad

Inte en siffra i hörnet. En **växande kedja**:

🔥 → 🔥🔥🔥 → 🔥🔥🔥🔥🔥🔥🔥

Vid **30 dagar** blir kedjan guldig. Ingen skuldkänsla vid brutet — föräldern kan välja pausdag/sjukdag/räddning i inställningar (se NPF-spec).

### Diplom (milstolpar i tid)

| Diplom | Ungefär |
|--------|---------|
| Första veckan | 7 dagar med aktivitet |
| Första månaden | 30 dagar |
| Första året | 365 dagar |

Varje diplom är ett fysiskt objekt på väggen — inte en badge i en lista.

### Samlingshyllan

Små saker dyker upp **automatiskt** när barnet når prestationer. Exempel: 📚 bok · 🪴 växt · 🧸 nalle · 🪁 drake · 🎈 ballong · 🎂 tårta.

- Inte köp · inte val hos barnet (C-01)
- Inte användbar valuta — det bor i Skattkammaren

### Minneskort

Genomförda belöningar (status **Genomförd**, inte bara Godkänd) blir minneskort här. Se [npf-arkitektur-v1.md § Minneskort](npf-arkitektur-v1.md#minneskort).

### Årsboken

En bok. Varje månad blir ett uppslag:

> **Juli**  
> ★★★★★  
> Du tog hand om dig  
> 27 dagar.

Barnet bläddrar — inte scrollar en feed.

### Stjärnglaset

**Totalt intjänade stjärnor** — minskar aldrig. Glasburken fylls långsamt. Det här är stolthet, inte saldo att handla med.

---

## 3. Skattkammaren

Belöningar — men vackrare. [skattkammaren-vision.md](skattkammaren-vision.md) gäller fortfarande. **Fem belöningsstatusar** (Sparar → Kan lösas in → Väntar på vuxen → Godkänd → Genomförd): se [npf-arkitektur-v1.md](npf-arkitektur-v1.md#fem-belöningsstatusar).

| Skattkammaren är | Skattkammaren är inte |
|------------------|----------------------|
| Stjärnburken + mål + belöningslista | Spelhub eller världskarta |
| **Stjärnor att använda** (saldo) | Livstidsstjärnor (de bor i Min samling) |
| Hyllor, kistor, lådor | Meny med rum att teleportera till |
| En primär handling (lösa in / välj mål) | Morgonhus, trädgård, avatar-byte |

**Öppna en kista:** ✨ — belöningen kommer upp (≤2 s). Sedan lugn.

**Viktigt:** Skattkammaren är **egen flik** — inte gömd inuti "Min värld".

---

## 4. Mina personer

Familjen. Vänner. Mormor.

| Innehåll | Känsla |
|----------|--------|
| Familjemedlemmar | "De finns här" |
| Små hälsningar | Värme utan uppgift |
| Hjärtan | Enkla reaktioner |
| Födelsedagar | Minnesvärt, inte FOMO |

Ingen syskonjämförelse. Ingen leaderboard.

---

## Samlarobjekt (ersätter spelvärld)

Barnet samlar — inte bygger en värld:

- Medaljer
- Diplom
- Stjärnor (i glaset)
- Band & pokaler
- Minneskort
- Årsböcker
- Dekorationer på hyllan

**Inte:** rum att låsa upp · husdjur att mata · karta att navigera · avatar som huvudloop.

---

## Animation, ljud & design

| Regel | Värde |
|-------|-------|
| Animation | Högst 2 sekunder — sedan lugn |
| Ljud av | Full funktion utan ljud |
| Lugnt läge | *Inte samma som mute* — reducerad rörelse, mildare effekter (på sikt i barnprofil) |
| Rörelse | `prefers-reduced-motion` — alltid |
| Estetik | Apple × Moleskine × IKEA × Astrid Lindgren |
| **Inte** | Roblox · Fortnite · Disney-prinsessor · kasinoljud |

Detaljer: [npf-arkitektur-v1.md § Sensorisk design](npf-arkitektur-v1.md#sensorisk-design).

---

## Det viktigaste

> **Ingenting får kännas tomt.**

Varje sida ska innehålla något barnet **vill titta på** — även om hen inte kan göra något där just nu.

En tom hylla ska visa *vad som kan komma*, inte en vit skärm.

---

## Vad vi lägger ner

| Avslutas | Varför |
|----------|--------|
| "Min värld" som namn och löfte | Fel förväntan (spel) |
| Spelhub (tre knappar / världskarta) | Meny, inte magi |
| Morgonhus som standardingång | Tapet utan agency |
| Trädgård / rum-teleport som nav | Bryter "samling"-känslan |
| Toast "gå till din trädgård" efter bock | Tvingar spel, inte firande |

Kod för spelvärld kan finnas kvar bakom flagga tills den städas — men **inte** i barnets huvudflöde.

---

## Icke-mål

- Konkurrera med Toca Boca / Animal Crossing
- Köp eller användbar valuta i **Min samling** (R-02) — saldo och inlösning hör till Skattkammaren
- Barnformulär eller inställningar (C-01) — förälder styr i sina inställningar
- Syskonleaderboard
- Login-bonus eller daglig belöning för att öppna appen (G-01)
- Fjerde coach eller ny "vad ska jag göra nu"-yta

---

## Framgång — hur vi vet att det funkar

### Efter en vecka (barn)

Barnet säger: *"Kan vi titta på mina medaljer?"*

Inte: *"Var är knappen?"*

### Efter en vecka (produkt)

| Signal | Bra | Dåligt |
|--------|-----|--------|
| Min samling öppnas | Frivilligt, efter rutin | Aldrig, eller förvirring |
| Skattkammaren | Tydligt mål + saldo | Letar stjärnor i tre flikar |
| Idag | Rutin klar utan sidospår | Firande pekar till "värld" |

### POS-regler vi uppfyller

P-02 barnet är protagonist · C-03 en primär handling på Idag · C-04 firande ≤2 s · G-01 verklighet före firande · G-04 firandebudget · R-02 stjärnor inte köpbara.

---

## Leverans i faser (översikt)

Spec först. Sedan i små steg.

**Viktigt:** Skattkammaren som egen flik hör till Fas A — så teamet inte bygger Min samling ovanpå gammal hub-/Min värld-struktur.

| Fas | Vad | Resultat för barnet |
|-----|-----|---------------------|
| **A** | Nav + namn + **Skattkammaren som egen flik** (hub bort) | Fyra flikar; barnet förstår: Idag = tjäna · Skattkammaren = spara/inlösa · Min samling = stolthet |
| **B** | Min samling v1: vägg + glas + streak | "Titta vad jag samlat" |
| **C** | Skattkammaren v1: aktivt mål + fem statusar + historik | Tydligt sparande utan shop-känsla |
| **D** | Minneskort + hylla + diplom | Belöningar blir minnen, inte bara transaktioner |
| **E** | Årsbok + visuell polish (hyllor/kistor) | Samlingen och Skattkammaren känns färdiga |

Varje fas ska vara shippbar — inget halvfärdigt spel i produktion.

---

## Rollout (tills produktklar)

**Endast dessa familjer ska se implementationen** (Fas A och framåt) tills vi sätter `status=live`:

| Förälder | Syfte |
|----------|--------|
| `pontus@burman.cc` | Intern test |
| Testanvändaren (intern testkonto — ej App Review) | Intern QA |

**Teknik:** feature slug `barnets_samling` · `status=dev` · `family_features` per familj (samma mönster som `mina_personer_10_10`).

**Implementation (Fas A+):** Barnnav, labels och hub-borttagning ska vara bakom `hasAccess(familyId, 'barnets_samling')`. Övriga familjer behåller nuvarande barnmeny tills rollout.

**Gå live:** Sätt `features.status = 'live'` först efter explicit produktsign-off — inte automatiskt vid merge.

---

## Öppna frågor

1. **Magic vs klassisk vy** — samma fyra flikar i båda?
2. **Befintliga rum-assets** — arkivera eller återbruka i samlingens estetik?
3. **Årsbok** — månadsuppslag automatiskt från befintlig statistik, eller redaktionellt?
4. ~~Skattkammaren vs samling~~ → **Beslutat:** två saldon — se [npf-arkitektur-v1.md](npf-arkitektur-v1.md#två-stjärnsaldon)

*Beslut innan Fas B/C — inte blockera Fas A.*

---

## En sida att minnas

```
Barn gör riktiga saker
        ↓
Appen firar dem
        ↓
Samlingen växer
        ↓
"Wow, titta vad jag har samlat!"
```

Rutiner är spelet. Samlingen är belöningen.
