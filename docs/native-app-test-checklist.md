# Testmatris — Min Stjärndag (Native iOS)

> Gedigna testfall för funktionstestning av Min Stjärndag iOS-app före App Store-lansering.
> Svenska.

**Cursor / Cloud Agents:** use [`founder-qa-test-account.md`](founder-qa-test-account.md) (`pontus@burman.cc` + Astrid), not the App Store review account below.

---

## Testmiljö

| Parameter | Värde |
|-----------|-------|
| Testkonto (förälder) | App Store demo — se `app-store-demo-konto.md` (inte för agenter) |
| Barnets namn | Anna |
| Barnets PIN | `APP_REVIEW_CHILD_PIN` |
| Antal barn | 1 |
| Antal föräldrar | 2 |

---

## 1. Registrering och inloggning

### 1.1 E-postregistrering (web+hybrid)
- [ ] Ny användare kan ange e-post + lösenord och registrera sig
- [ ] E-postverifieringslänk skickas och fungerar
- [ ]Verifierad användare kan logga in

### 1.2 Apple Sign In
- [ ] "Logga in med Apple"-knappen visas på inloggningssidan
- [ ] Godkännande-dialogen visas korrekt med rätt app-namn
- [ ] Efter godkännande redirected användaren till appen
- [ ] Ny användare (förstagång Apple Sign In) skapar automatiskt family + parent
- [ ] Befintlig användare (samma Apple ID) loggas in och kommer till sin family
- [ ] Om Apple-ID har anslutits ett annat konto: felmeddelande visas

### 1.3 Session och token-hantering
- [ ] Access token sparas (httpOnly cookie eller secure storage)
- [ ] Stäng appen → öppna igen → användaren är fortfarande inloggad
- [ ] Logga ut → navigerar till inloggningssidan

---

## 2. Föräldravy — navigation och gränssnitt

### 2.1 Huvudvy
- [ ] Hamburger-meny öppnas från vänster
- [ ] Navigation till flikarna: Scheman, Belöningar, Rapporter, Inställningar
- [ ] Profilbild + family-namn visas i headern
- [ ] Backknapp fungerar korrekt på alla undersidor

### 2.2 Barnprofiler
- [ ] Lista med barn visas på startsidan
- [ ] Varje barnkort visar namn, emoji och eventuella pågående streaker
- [ ] "Byt till barnvy"-knapp syns på varje barnkort
- [ ] Lägg till barn-knapp → formulär för att skapa nytt barn
- [ ] Redigera barn → ändra namn, emoji, födelsedatum
- [ ] Ta bort barn (soft delete) → bekräftelsedialog

---

## 3. Barnvy — PIN-skyddad

### 3.1 Åtkomst till barnvy
- [ ] PIN-prompt visas när användaren klickar på "Byt till barnvy"
- [ ] Felaktig PIN → felmeddelande visas
- [ ] 3 felaktiga försök → 30 sekunders låsning
- [ ] Rätt PIN → barnvyn visas
- [ ] Låsning nollställs efter 30 sekunder

### 3.2 Barnvyens innehåll
- [ ] Dagens schema visas med aktiviteter
- [ ] Varje aktivitet visar: tid, namn, ikon/stjärna
- [ ] Avklarade aktiviteter visas som markerade (grön bock, stjärna fylld)
- [ ] Stjärnpoäng syns prominent (t.ex. "5 av 8 stjärnor")
- [ ] "Byt tillbaka till föräldraläge"-knapp → PIN-prompt → föräldravy

### 3.3 Aktivitetsmarkering i barnvy
- [ ] Klicka/tappa på aktivitet → aktiviteten markeras som klar
- [ ] Stjärnan fylls i och poängen ökar
- [ ] Dubbelmarkering → aktiviteten avmarkeras (om tillåtet)
- [ ] Ändringen syns i föräldravyn (uppdateras i realtid)

---

## 4. Ändra PIN-kod (föräldraläge)

- [ ] Navigera till: Inställningar → Barn → Välj barn → Ändra PIN
- [ ] Ange nuvarande PIN för att bekräfta identitet
- [ ] Ange ny PIN (4 siffror) → bekräfta ny PIN
- [ ] Fel bekräftelse → felmeddelande och gör om
- [ ] Ändring sparas → ny PIN fungerar direkt
- [ ] Testa ny PIN → kan logga in i barnvy

---

## 5. Scheman och aktiviteter

### 5.1 Veckoschema (föräldrar)
- [ ] Veckovy med 7 dagar (måndag–söndag) visas
- [ ] Varje dag visar schemats aktiviteter med tid och namn
- [ ] Lägg till aktivitet → sök i mallar eller skapa egen
- [ ] Redigera aktivitet → ändra namn, tid, ikon
- [ ] Ta bort aktivitet → bekräftelse
- [ ] Dra-och-släpp för att ändra ordning (om stöds)

### 5.2 Manuell stjärngivning
- [ ] Förälder kan ge stjärna direkt till barn (t.ex. för extrabra beteende)
- [ ] Stjärnan syns i barnvy och i dagloggen
- [ ] "Ta bort stjärna"-åtgärd finns i historiken

### 5.3 Schemalagd push-notis (backend-trigger)
- [ ] Konfigurera push-notis för aktiviteter (t.ex. "Kl. 08:00 — frukost")
- [ ] Backend skickar notis vid rätt tidpunkt
- [ ] Notis visas på låsskärmen
- [ ] Klick på notis → öppnar appen i relevant vy
- [ ] Notis visas även om appen är stängd

### 5.4 Särskilda dagar (undantag)
- [ ] "Särskild dag"-läge: välj datum → anpassat schema
- [ ] Återgång till normal schedule nästa dag
- [ ] Schemalägg undantag i förväg

---

## 6. Belöningar (Skattkammaren)

### 6.1 Belöningsvy
- [ ] Lista med belöningar visas med stjärnkostnad
- [ ] Varje belöning har: bild/emoji, namn, beskrivning, stjärnkrav
- [ ] Filtrera belöningar: tillgängliga, inlösta, alla

### 6.2 Lös in belöning
- [ ] Välj belöning → bekräftelsedialog ("Vill du lösa in X för Y stjärnor?")
- [ ] Bekräfta → stjärnor dras av, belöning markeras som inlöst
- [ ] Felmeddelande om otillräckligt med stjärnor
- [ ] Historik över inlösta belöningar sparas

### 6.3 Lägg till/redigera belöning (föräldrar)
- [ ] "Skapa belöning"-knapp → formulär
- [ ] Ange: namn, emoji/icon, stjärnkostnad, beskrivning
- [ ] Spara → belöningen visas i listan
- [ ] Redigera belöning → ändra kostnad/innehåll
- [ ] Ta bort belöning → bekräftelse

---

## 7. Push-notifikationer

### 7.1 Godkännande av notiser
- [ ] Vid första start: systemprompt för push-tillstånd visas
- [ ] Godkänn → notiser aktiverade
- [ ] Avböj → notiser avaktiverade, appen visar instruktioner att aktivera manuellt
- [ ] Inställningar → möjligt att ändra notispreferenser

### 7.2 Notisbackend (API-triggerad)
- [ ] POST till `/api/admin/test-push` med family_id → test-notis skickas
- [ ] Notis visas på enheten inom 30 sekunder
- [ ] Notis-innehållet matchar skickad payload (title + body)
- [ ] iOS: notisleverans bekräftad via APNs-status

### 7.3 Notispreferenser (föräldrar)
- [ ] Toggla för att aktivera/avaktivera notiser per typ (schema, belöningar, påminnelser)
- [ ] Spara inställningar → sparas i databasen

---

## 8. Offline-läge och PWA-fallskärm

### 8.1 Offline-start
- [ ] Stäng av wifi och mobilnät (flygplansläge)
- [ ] Öppna appen → visa offline-skärm ("Ingen internetuppkoppling")
- [ ] Offline-skärmen är snygg och användarvänlig
- [ ] Skärmen har "Försök igen"-knapp

### 8.2 Delvis offline
- [ ] Appen kan cacha statiskt innehåll (ikoner, css, js)
- [ ] Cachelagrat innehåll visas även offline
- [ ] Nätverksåterställning → appen fungerar normalt igen

---

## 9. Rendering och skärmstorlekar

### 9.1 iPhone-modeller
- [ ] Testa på: iPhone SE (liten), iPhone 13/14 (standard), iPhone Plus/Max (stor)
- [ ] Innehåll skalas korrekt utan horisontell scroll
- [ ] Text är läsbar på alla skärmstorlekar

### 9.2 iPad
- [ ] Layout anpassad för större skärm (mer spacing)
- [ ] Innehåll centreras korrekt
- [ ] Inga element klipps av

### 9.3 Notch och Safe Areas
- [ ] Innehåll börjar under statusfältet (Safe Area)
- [ ] Navigationsknappar hamnar inte under notch
- [ ] Bottom navigation hamnar ovanför hem-knappen (home indicator)
- [ ] Testa på iPhone X+ (notch) och iPhone 14 Pro (Dynamic Island)

### 9.4 Mörk/ljus läge
- [ ] Ljus läge: vit bakgrund, mörk text
- [ ] Mörkt läge: mörk bakgrund, ljus text
- [ ] Appen följer systemets tema-inställning

---

## 10. iOS-versionstester

### 10.1 iOS 16
- [ ] Appen startar utan krasch
- [ ] Push-notiser fungerar
- [ ] Apple Sign In fungerar
- [ ] UI ser korrekt ut (inga kompatibilitetsproblem)

### 10.2 iOS 17
- [ ] Appen startar utan krasch
- [ ] Push-notiser fungerar
- [ ] Apple Sign In fungerar
- [ ] Dynamic Island-kompatibilitet (om relevant)
- [ ] Uppdaterade iOS-dialoger (popup-prompter) fungerar korrekt

### 10.3 iOS 18
- [ ] Appen startar utan krasch
- [ ] Push-notiser fungerar
- [ ] Apple Sign In fungerar
- [ ] Skärmtidsregler (om relevant) hanteras korrekt
- [ ] Nyheter i iOS 18: AI-genererade notiser, nya widgets — testa kompatibilitet

---

## 11. Prestanda och stabilitet

### 11.1 App-start
- [ ] Kald start (app ej i minnet): < 3 sekunder till första skärm
- [ ] Varm start (app i bakgrunden): < 1 sekund

### 11.2 Minnesförbrukning
- [ ] Kör appen i 5 minuter → minnesförbrukning < 200MB
- [ ] Navigera mellan alla skärmar → inga minnesläckor

### 11.3 Batteri
- [ ] Bakgrundsaktivitet minimal när appen inte används
- [ ] Location-servicet inte aktiverade onödigt (om relevant)

---

## 12. Delad enhet — barnväljare (iOS + Android)

> Testa på **fysisk enhet** med Capacitor-appen (TestFlight / intern Android-build).
> Appen laddar JS från `https://mystarday.se` — deploya servern före test.

### 12.1 Vuxen → barn efter logout
- [ ] Logga in som vuxen → logga ut → «Jag är barn» → **båda/syskon syns** på barnväljaren
- [ ] Välj barn → PIN → barnvy öppnas
- [ ] Stäng appen helt → öppna igen → hamnar på barnväljare (inte vuxenvy)

### 12.2 Byt barn
- [ ] Från barnvy: «Byt barn» → **lista med alla barn** (ingen auto-PIN)
- [ ] Välj syskon → PIN → rätt barns schema

### 12.3 Lägg till barn
- [ ] «Nytt barn» → vuxenlogin (mail/lösenord) → **onboarding direkt** (ingen dubbel PIN)
- [ ] «Befintligt barn» på enhet där syskon redan loggat in → namn+PIN utan vuxenlogin

### 12.4 Barn logout med föräldralås
- [ ] Barn trycker logout när vuxen har PIN → **PIN-ruta visas** (inte tyst redirect till dashboard)
- [ ] Avbryt PIN → tillbaka till barnväljare

### 12.5 Uppdatering efter deploy
- [ ] Efter server-deploy: stäng och öppna appen → senaste login-flöde fungerar (SW registreras **inte** i native)

---

## Sammanfattande resultatmatris

| Område | Antal testfall | Klar | Pending | Fallerad |
|--------|---------------|------|---------|----------|
| Registrering/inloggning | 14 | ☐ | ☐ | ☐ |
| Föräldravy | 6 | ☐ | ☐ | ☐ |
| Barnvy (PIN) | 7 | ☐ | ☐ | ☐ |
| PIN-ändring | 5 | ☐ | ☐ | ☐ |
| Scheman/aktiviteter | 12 | ☐ | ☐ | ☐ |
| Belöningar | 9 | ☐ | ☐ | ☐ |
| Push-notifikationer | 8 | ☐ | ☐ | ☐ |
| Offline-läge | 4 | ☐ | ☐ | ☐ |
| Rendering/skärmar | 8 | ☐ | ☐ | ☐ |
| iOS-versioner | 9 | ☐ | ☐ | ☐ |
| Prestanda | 4 | ☐ | ☐ | ☐ |
| **Totalt** | **86** | **0** | **86** | **0** |

---

## Kända begränsningar

- Apples automatiska signering kan kräva manuell konfiguration på äldre Xcode-versioner
- APNs push-notiser kräver fysisk enhet för testning (simulator stöder inte push)
- Apple Sign In kan endast testas med riktigt Apple-konto (inte simulator)