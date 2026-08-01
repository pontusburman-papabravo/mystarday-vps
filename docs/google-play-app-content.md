# Google Play — Konfigurera appen (App content + Butik)

**App:** Min Stjärndag · **Paket:** `se.mystarday.app`  
Kopiera svaren nedan rakt in i Play Console under **Policy → App content** och **Grow → Store presence**.

---

## 1. Integritetspolicy

| Fält | Värde |
|------|-------|
| **URL** | `https://mystarday.se/privacy` |

Sidan finns på `/privacy` och `/privacy.html`. Använd `https://mystarday.se/privacy`.

---

## 2. Appåtkomst (Inloggningsuppgifter)

Appen kräver inloggning. Välj: **All or some functionality is restricted**.

### Testkonto för Google-granskare

| Fält | Värde |
|------|-------|
| Användarnamn | `review@mystarday.se` |
| Lösenord | `APP_REVIEW_PASSWORD (secret store)` |

### Instruktioner (engelska — klistra in)

```
This is a family routine app. Login is required.

1. Open the app and tap "Logga in" (Login).
2. Email: review@mystarday.se
3. Password: APP_REVIEW_PASSWORD (secret store)
4. Parent dashboard opens with one child "Anna".
5. To test child view: tap the child card → enter PIN (APP_REVIEW_CHILD_PIN).
6. To return to parent mode: use menu → enter PIN (APP_REVIEW_CHILD_PIN) at parental gate.

Google Sign In is optional and only works for accounts already registered with the same email. The test account above uses email/password.

No 2FA. No location restriction. No special hardware required.
```

---

## 3. Annonser

| Fråga | Svar |
|-------|------|
| Innehåller appen annonser? | **Nej** |

Appen visar inga annonser. (Webbplatsen kan ha valfri analys/marknadsföring via cookie-banner med samtycke — det gäller inte annonser i Android-appen.)

---

## 4. Innehållsklassificering (IARC)

Starta enkäten. Rekommenderade svar för Min Stjärndag:

| Ämne | Svar |
|------|------|
| Våld | Ingen |
| Sexualitet | Ingen |
| Grovt språk | Ingen |
| Kontrollerade substanser | Ingen |
| Skrämmande innehåll | Ingen |
| Gambling | Ingen |
| Användargenererat innehåll | **Ja** — familjeanteckningar, observationer (modereras av föräldrar/pedagoger) |
| Delning av plats | Nej |
| Delning av personlig info | Nej (endast förälder-initierad rapportdelning) |
| Digitala köp | **Nej** i denna version (ingen Play Billing ännu) |

**Förväntat resultat:** PEGI 3 / Everyone / 3+

---

## 5. Målgrupp och innehåll

### Target audience (Målgrupp)

| Fråga | Svar |
|-------|------|
| Primär målgrupp | **Vuxna (föräldrar)** — appen marknadsförs till och installeras av föräldrar |
| Är appen riktad till barn? | **Ja** — barn använder barnvy med förälders tillåtelse |
| Åldersgrupp barn | **Upp till 12 år** (huvudsakligen 3–10) |

### Families policy

- Appen samlar in data om barn (förnamn, emoji, schema, aktiviteter) — **Ja**
- Föräldragodkännande krävs — **Ja** (förälder skapar konto och barn-PIN)
- Appen är **inte** en "Designed for Families"-certifierad app ännu, men följer familjepolicy genom föräldrakonto + PIN

**Viktigt:** Om Play frågar om **Play Families-programmet** — anmäl er om ni vill ha "Designed for Families"-badge; det är valfritt men kräver extra granskning.

---

## 6. Datasäkerhet (Data safety)

### Samlar appen in eller delar användardata?

**Ja** — appen samlar in data.

### Kryptering

| Fråga | Svar |
|-------|------|
| Krypteras data under överföring? | **Ja** (HTTPS/TLS) |
| Kan användare begära radering? | **Ja** (Inställningar → Radera konto) |

### Datatyper att kryssa i

| Datatyp | Samlas in | Delas | Syfte | Obligatorisk? |
|---------|-----------|-------|-------|---------------|
| **Namn** | Ja | Nej | Kontofunktion, personalisering | Ja (konto) |
| **E-postadress** | Ja | Nej | Konto, inloggning, verifiering | Ja |
| **Foton** | Ja (valfritt) | Nej | Profilbild barn (kamera) | Nej (valfritt) |
| **Appinteraktioner** | Ja | Nej | Schema, aktiviteter, stjärnor | Ja (kärnfunktion) |
| **Enhets- eller andra ID** | Ja | Nej | Push-token (FCM) | Nej (opt-in push) |
| **Kraschloggar** | Ja (om Sentry) | Med Sentry | Felsökning | Automatiskt |
| **Diagnostik** | Ja (om Sentry) | Med Sentry | Appstabilitet | Automatiskt |

**Delas INTE:** plats, kontakter, SMS, kalender, hälsodata, finansiell info, personnummer.

### Tredjepartstjänster (personuppgiftsbiträden)

| Tjänst | Data | Syfte |
|--------|------|-------|
| Neon (PostgreSQL) | Kontodata | Databas, EU |
| Render / VPS | All serverdata | Hosting |
| Resend / Postmark | E-post | Transaktionsmejl |
| Firebase (FCM) | Push-token | Push-notiser |
| Sentry (om aktivt) | Kraschdata, anonymiserat | Felsökning |
| Google | OAuth (valfritt) | Inloggning Android |

### Föräldrar och barn

- Data om barn samlas in: **Ja** (förnamn, emoji, schema)
- Data samlas in från barn under 13: **Ja** — med förälders konto som registrerar familjen

---

## 7. Myndighetsappar

| Fråga | Svar |
|-------|------|
| Är detta en myndighetsapp? | **Nej** |

---

## 8. Finansiella funktioner

| Fråga | Svar |
|-------|------|
| Tillhandahåller appen finansiella tjänster? | **Nej** |
| In-appköp / prenumeration i denna build | **Nej** |

*(Webbversionen kan ha Stripe i framtiden; Android-appen har ingen betalning i v1. Lifetime-free familjer.)*

---

## 9. Hälsa

| Fråga | Svar |
|-------|------|
| Är detta en hälsa- eller medicinsk app? | **Nej** |

Pedagoganteckningar kan innehålla humör/sömn som observation — det är **inte** medicinsk diagnos eller hälsospårning enligt Googles definition.

---

## 10. Appkategori och kontaktuppgifter

| Fält | Värde |
|------|-------|
| **Kategori** | Familj (Family) |
| **Taggar** | Utbildning, Föräldraskap (om tillgängligt) |
| **E-post** | `info@mystarday.se` |
| **Webbplats** | `https://mystarday.se` |
| **Telefon** | *(valfritt — lämna tomt eller ert nummer)* |
| **Adress** | *(land: Sverige — krävs ibland för utvecklarkonto)* |

---

## 11. Butiksuppgifter (Store listing)

### Grundläggande

| Fält | Text |
|------|------|
| **Appnamn** | Min Stjärndag |
| **Kort beskrivning** (80 tecken) | Dagliga scheman, stjärnor och belöningar — en lugnare vardag för hela familjen. |
| **Fullständig beskrivning** | Se [`google-play-metadata.md`](google-play-metadata.md) |

### Grafik (obligatoriskt)

| Tillgång | Storlek |
|----------|---------|
| Appikon | 512 × 512 px, PNG |
| Feature graphic | 1024 × 500 px |
| Skärmdumpar telefon | Minst 2 st (16:9 eller 9:16) |

### Övrigt

| Fält | Värde |
|------|-------|
| Integritetspolicy | `https://mystarday.se/privacy` |
| Standard språk | Svenska |
| Land | Sverige (primärt) |

---

## Snabbordning i Play Console

```
1. Integritetspolicy          → URL
2. Appåtkomst                 → testkonto
3. Annonser                   → Nej
4. Innehållsklassificering      → IARC-enkät
5. Målgrupp                   → vuxna + barn 3–12
6. Datasäkerhet               → tabell ovan
7. Myndighetsappar            → Nej
8. Finansiella funktioner     → Nej
9. Hälsa                      → Nej
10. Kategori + kontakt        → Familj, info@mystarday.se
11. Butiksuppgifter           → text + bilder
```

När alla sektioner har grön bock kan ni publicera till Internal testing.
