# Produktfeedback — barnvy & Skattkammaren (PWA → native)

**Källa:** Design-/produktgenomgång (barnvy som appens hjärta)  
**Datum:** 2026-05-28  
**Status:** Arkiverad källtext — **implementationskrav** finns strukturerat i [`app2.md`](../app2.md) §2.2, §7, §9, §16.5

**Syfte:** Bevara feedback ordagrant så Polsia, mockups och acceptans inte tappar *varför* kraven finns. Uppdatera inte denna fil med status — det görs i `app2.md`.

---

## Sammanfattning (kort)

Barnvyn med rymdtema och mjuka former är rätt riktning. För native iOS/Android behövs särskilt: **haptik**, **immersiv fullskärm**, **Skattkammaren som motor** (parallax, mål-animation), **swipe-navigation**, **tillfredsställande delsteg-UI**, **sticky stjärnsaldo**, **iOS swipe-back**, **dörr bakom föräldra-lås**, **robust offline**, och **ljudeffekter**.

---

## Källtext (ordagrant)

> Wow, barnvyn är verkligen appens hjärta! Du har lyckats skapa en magisk och lekfull känsla med rymdtemat och de mjuka formerna. Det här kommer barnen att älska.
>
> Här är mina specifika tips för att lyfta just barnvyn och skattkammaren från PWA till en högkvalitativ nativ app:

### 1. Inloggningen (Screenshot 11 & 12)

Den här vyn är klockren för en app. Men för att få den där "nativa" känslan:

- **Haptik vid tryck:** Varje siffra barnet trycker på bör ge en kort vibration (haptic feedback). Det gör att skärmen känns mer som en fysisk apparat.
- **Fullskärm:** I appen slipper du webbläsarens vita fält i toppen. Låt rymdbakgrunden flöda hela vägen upp bakom klockan och batteri-ikonen för en total "immersive" upplevelse.

### 2. Skattkammaren (Screenshot 3, 4 & 5)

Det här är motorn i barnets motivation.

- **Gör belöningarna "fysiska":** Istället för en statisk lista, låt belöningskorten ha en svag 3D-effekt eller "glans" som rör sig när man vickar på telefonen (parallax-effekt). Det gör att stjärnorna och belöningarna känns mer värdefulla.
- **Animation vid mål:** När stapeln för "Långsiktigt mål" blir full, bör det trigga en helskärms-animation (t.ex. konfetti eller en raket som skjuts upp) direkt i appen. Webben är ofta lite för långsam för att det ska kännas helt sömlöst, men i en app sitter det direkt.

### 3. Navigationen i barnvyn (Screenshot 1 & 3)

Du har en flikmeny ("Schema" / "Skattkammaren") i mitten av skärmen.

- **App-standard:** I appar placeras navigering oftast längst ner. Men eftersom detta är för barn och du vill behålla fokus på innehållet, kan du behålla din nuvarande lösning men göra flikarna större.
- **Swipe mellan vyer:** Användaren (barnet) bör kunna swipa åt höger/vänster för att växla mellan sitt schema och skattkammaren. Det är en naturlig rörelse på mobilen som känns mycket smidigare än att pricka en knapp.

### 4. Schemavyn & Delsteg (Screenshot 2)

- **Interaktiva cirklar:** Cirklarna för delsteg (Packa ryggsäcken, Säg hejdå...) bör vara stora och tillfredsställande att klicka i. När man klickar i en cirkel, låt den fyllas med en färgstark animation snarare än bara en bock.
- **Sticky Header för barnet:** Se till att barnets namn och stjärnsaldo alltid syns i toppen, även när de scrollar ner i eftermiddagens aktiviteter. Det ger trygghet att alltid veta hur många stjärnor man har.

### 5. "Tillbaka"-knappar och avslut (Screenshot 11)

- **System-gester:** I iOS förväntar man sig att kunna swipa från vänsterkanten för att gå "Tillbaka". Se till att din app stöder detta så att barnet inte behöver pricka den lilla knappen uppe till vänster.
- **Dörr-ikonen:** Du har en dörr-ikon (logga ut/stäng). I en app-miljö kan denna ligga gömd bakom ett "föräldra-lås" (t.ex. "Håll inne i 3 sekunder") för att förhindra att barnet råkar logga ut av misstag.

### Offlineläge

PWA:er dör ofta om nätet försvinner. För barn (som kanske sitter i baksätet på en bil eller i en skola med dålig täckning) är det superviktigt att appen fungerar offline. Se till att schemat sparas lokalt på telefonen så att stjärnorna kan delas ut även utan wifi, och synkas när man får täckning igen.

### Ljud

Hur tänker du kring "ljud" i appen? För målgruppen barn kan små ljudeffekter (ett pling när en stjärna tjänas, eller ett swoosh när man byter vy) göra enorm skillnad för hur kul appen är att använda.

---

## Mappning → `app2.md` (implementationskrav)

| Feedback (§ ovan) | `app2.md` | Mockup / kod |
|-------------------|-----------|--------------|
| 1 Haptik PIN | §7.2 Haptik PIN | §2.3, `docs/archive/polsia/polsia-barnlogin-design.md` |
| 1 Fullskärm immersive | §7.2 Fullskärm, §2.2 Rymd-tema | Capacitor status bar |
| 2 Parallax belöningskort | §7.2 Parallax kort (v2) | `beloningar.html` |
| 2 Mål-animation | §7.2 Mål-animation, §16.5 wow | `celebration.html` |
| 3 Större flikar / bottennav | §2.2 Bottennav, §4 städlista | `barnvy.html` |
| 3 Swipe Schema ↔ Skattkammaren | §7.2 Swipe | `child-dashboard.js` |
| 4 Delsteg-cirklar + fill-animation | §7.1, §2.2 Aktivitetskort | Barnvy mockup |
| 4 Sticky namn + ⭐ | §7.2 Sticky ⭐, §2.2 Profilzon | — |
| 5 iOS swipe-back | §7.2 | Native navigation |
| 5 Dörr → håll inne 3 s PG | §7.2, §2.2 Tillbaka till vuxen | Parental Gate |
| Offline schema + synk | §9 Offline | `offline-queue.js` |
| Ljud pling / swoosh | §7.2 Ljud, ljudpolicy | `playCoinSound()` m.fl. |

**Screenshot-nummer** i feedbacken avser typiskt App Store-/interna skärmdumpar (barnvy schema = 1–2, Skattkammaren = 3–5, PIN = 11–12). Jämför med [`public/pedagoger-och-terapeuter.html`](../public/pedagoger-och-terapeuter.html) (Screenshot 1–9) om numrering skiljer sig.

---

## Polsia / Release OS (var det landar)

| Tema | Typisk sprint |
|------|----------------|
| Barnlogin haptik + fullskärm | 5a–5b (#2141868, #2141884) |
| Barnvy nav + swipe + sticky | Fas A+ / app2 §12 prompt F |
| Skattkammaren wow | Efter Gate 24 → barn-wow / §16.5 |
| Offline banner barn | §9 gap |

Se [`docs/archive/polsia/release-os/README.md`](archive/polsia/release-os/README.md) och [`polsia-sprint-koordinering.md`](archive/polsia/polsia-sprint-koordinering.md).
