<!-- pragma: allowlist secret -->
# Applandningssidan v2 — App Entry Spec

> **Syfte:** Leveransspec för ny appstart — tydlig nog för designer, utvecklare och produktägare att arbeta direkt ifrån.
>
> **Status:** v2.0 — Design / Dev Ready  
> **Version:** 2.0  
> **Senast uppdaterad:** 2026-06-22
>

> **Copy-variabel:** `{{APP_NAME}}` = produktnamnet i UI (se varumärkesguide).

> **Relaterat (nuvarande implementation):**
> - [`public/login.html`](../public/login.html) — dagens appstart (rollval + vuxeninloggning på samma skärm)
> - [`public/js/login-magic.js`](../public/js/login-magic.js) — rollkort, `showParentLogin()`, barn-/vuxenflöde
> - [`public/js/platform-theme.js`](../public/js/platform-theme.js) — native redirect `/` → `/login`
> - [`public/index.html`](../public/index.html) — webbens marknadsföringssida (hoppas över i native)
> - [`public/child-login.html`](../public/child-login.html) — barninloggning (namn + PIN)
> - [`public/css/login-magic.css`](../public/css/login-magic.css) — befintlig entry-stil
> - [`docs/BARNAPP-INLOGGNING-GUIDE.md`](./BARNAPP-INLOGGNING-GUIDE.md)
> - [`docs/separation-contract-barnapp.md`](./separation-contract-barnapp.md)

---

## Omfattning

Den här specen täcker **appens entry-flöde före inloggat läge**:

- första appstart / welcome
- "kom igång"-väg
- "jag har redan konto"-väg
- barn/vuxen-split
- vuxen onboarding till registrering
- barn login
- grundläggande edge cases
- mätning / tracking
- post-signup onboarding (touchpoints — full spec i befintlig `/onboarding`)

**Täcker inte** full in-app navigation efter inloggning.

---

## 0. Produktprincip

**Appen ska öppna med förståelse, inte inloggning.**

Första upplevelsen ska vara:

> Det här är {{APP_NAME}} → så hjälper den er → här börjar du

**Inte:** välj roll + logga in + registrera på samma skärm.

### Nuvarande problem (kort)

| Problem | Konsekvens |
|---------|------------|
| Första skärmen gör för mycket | Otydlig primär handling, konkurrerande CTA:er |
| Nya användare får ingen intro | Ingen förklaring av vad appen gör |
| Barn exponeras för vuxenflöde | Apple/e-post/registrera synligt före rollval |
| Webb ≠ app | `index.html` förklarar produkten; native hoppar till `/login` |

Se [`public/login.html`](../public/login.html) `#role-quick-login` — "ELLER LOGGA IN" visas samtidigt som rollkort.

---

## Skärm-ID-register

| Skärm-ID | Namn | Flöde |
|----------|------|-------|
| `ENTRY_WELCOME` | Välkommen | A |
| `ENTRY_ROLE_PICK_FOR_START` | Välj väg (kom igång) | A |
| `ENTRY_LOGIN_CHOICE` | Jag har redan konto | A |
| `ENTRY_ADULT_GET_STARTED` | Vuxen kom igång | B |
| `ENTRY_ADULT_SIGNUP` | Skapa konto | B |
| `ENTRY_ADULT_EMAIL_LOGIN` | Vuxen e-post login | D |
| `ENTRY_ADULT_EMAIL_SIGNUP` | Vuxen e-post signup | D |
| `ENTRY_CHILD_GET_STARTED` | Barn kom igång | C |
| `ENTRY_CHILD_LOGIN` | Barnlogin | C |
| `ONBOARD_CHILD_NAME` | Barnets namn | E |
| `ONBOARD_FIRST_ROUTINE` | Välj rutin | E |
| `ONBOARD_TEMPLATE_PICK` | Välj mall | E |
| `ONBOARD_REWARD_PICK` | Välj mål/belöning | E |
| `ONBOARD_CHILD_PIN` | Skapa barn-PIN | E |

---

# 1. Wireframe — skärm för skärm

## FLOW A — Standard entry

### SCREEN A1 — `ENTRY_WELCOME`

**Syfte:** Förklara vad appen är och ge två tydliga vägar.

```text
┌────────────────────────────────────┐
│               [stjärn-logo]        │
│            {{APP_NAME}}             │
│                                    │
│  Lugnare vardagar med tydliga      │
│  scheman och stjärnor som          │
│  motiverar                         │
│                                    │
│  {{APP_NAME}} hjälper barn med    │
│  vardagsrutiner genom visuella     │
│  scheman, tydliga steg och         │
│  belöningar som gör det lättare    │
│  att lyckas själv.                 │
│                                    │
│  För familjer med barn som mår     │
│  bra av struktur, bildstöd och     │
│  tydlighet i vardagen.             │
│                                    │
│  [ Primär CTA: Kom igång gratis ]  │
│  [ Sekundär CTA: Jag har redan     │
│    konto ]                         │
│                                    │
│  Barn loggar in med namn och       │
│  PIN-kod efter att en vuxen har    │
│  skapat kontot.                    │
│                                    │
│  Så fungerar appen                 │
└────────────────────────────────────┘
```

**Navigation:**

| Action | Destination |
|--------|-------------|
| Kom igång gratis | `ENTRY_ROLE_PICK_FOR_START` |
| Jag har redan konto | `ENTRY_LOGIN_CHOICE` |
| Så fungerar appen | `ENTRY_INFO_MODAL` eller separat info-view |

---

### SCREEN A2 — `ENTRY_ROLE_PICK_FOR_START`

**Syfte:** Rollval i "kom igång"-flödet — inga auth-knappar.

```text
┌────────────────────────────────────┐
│ ← Tillbaka                         │
│     Vem ska använda {{APP_NAME}}? │
│     Välj den väg som passar dig.   │
│ ┌────────────────────────────────┐ │
│ │ [ikon vuxen]  Jag är vuxen     │ │
│ │ Jag vill skapa konto, lägga    │ │
│ │ upp schema och hjälpa ett      │ │
│ │ barn komma igång.              │ │
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │ [ikon barn]   Jag är barn      │ │
│ │ Jag vill öppna mitt schema med │ │
│ │ mitt namn och min PIN-kod.     │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

| Action | Destination |
|--------|-------------|
| Jag är vuxen | `ENTRY_ADULT_GET_STARTED` |
| Jag är barn | `ENTRY_CHILD_GET_STARTED` |
| Tillbaka | `ENTRY_WELCOME` |

---

### SCREEN A3 — `ENTRY_LOGIN_CHOICE`

**Syfte:** Separera vuxenlogin och barnlogin i två sektioner.

```text
┌────────────────────────────────────┐
│ ← Tillbaka                         │
│         Välkommen tillbaka         │
│   Logga in som vuxen eller barn    │
│                                    │
│   Jag är vuxen                     │
│ ┌────────────────────────────────┐ │
│ │ Fortsätt med Apple             │ │
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │ Logga in med e-post            │ │
│ └────────────────────────────────┘ │
│ [valfritt: Fortsätt med Google]    │
│   För dig som hanterar schema,     │
│   inställningar och barnets vy.    │
│                                    │
│   Jag är barn                      │
│ ┌────────────────────────────────┐ │
│ │ Logga in som barn              │ │
│ └────────────────────────────────┘ │
│   Logga in med ditt namn och PIN.  │
└────────────────────────────────────┘
```

| Action | Destination |
|--------|-------------|
| Fortsätt med Apple | `AUTH_APPLE_LOGIN` |
| Logga in med e-post | `ENTRY_ADULT_EMAIL_LOGIN` |
| Logga in som barn | `ENTRY_CHILD_LOGIN` |
| Tillbaka | `ENTRY_WELCOME` |

**Plattform:** Google visas endast på Android native (befintligt beteende i `login.html`).

---

## FLOW B — Kom igång som vuxen

### SCREEN B1 — `ENTRY_ADULT_GET_STARTED`

```text
┌────────────────────────────────────┐
│ ← Tillbaka                         │
│     Kom igång med {{APP_NAME}}    │
│  Du börjar med att skapa ett       │
│  vuxenkonto. Därefter lägger du    │
│  upp barnets schema...             │
│ ┌────────────────────────────────┐ │
│ │ 1. Skapa konto                 │ │
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │ 2. Lägg upp schema             │ │
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │ 3. Barnet loggar in själv      │ │
│ └────────────────────────────────┘ │
│ [ Primär: Skapa konto ]            │
│ [ Sekundär: Jag har redan konto ]  │
└────────────────────────────────────┘
```

| Action | Destination |
|--------|-------------|
| Skapa konto | `ENTRY_ADULT_SIGNUP` |
| Jag har redan konto | `ENTRY_LOGIN_CHOICE` |
| Tillbaka | `ENTRY_ROLE_PICK_FOR_START` |

---

### SCREEN B2 — `ENTRY_ADULT_SIGNUP`

```text
┌────────────────────────────────────┐
│ ← Tillbaka                         │
│            Skapa konto             │
│     Välj hur du vill fortsätta     │
│ ┌────────────────────────────────┐ │
│ │ Fortsätt med Apple             │ │
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │ Registrera med e-post          │ │
│ └────────────────────────────────┘ │
│ När kontot är skapat kan du lägga  │
│ till ett eller flera barn...       │
│ Har du redan konto? Logga in       │
└────────────────────────────────────┘
```

| Action | Destination |
|--------|-------------|
| Apple signup | `AUTH_APPLE_SIGNUP` |
| Registrera med e-post | `ENTRY_ADULT_EMAIL_SIGNUP` |
| Har du redan konto? | `ENTRY_LOGIN_CHOICE` |
| Tillbaka | `ENTRY_ADULT_GET_STARTED` |

---

## FLOW C — Kom igång / login som barn

### SCREEN C1 — `ENTRY_CHILD_GET_STARTED`

```text
┌────────────────────────────────────┐
│ ← Tillbaka                         │
│         Logga in som barn          │
│  En vuxen behöver först skapa      │
│  ditt konto och ditt schema...     │
│         [illustration barn]        │
│ [ Primär: Jag har namn och PIN ]   │
│ [ Sekundär: Jag behöver hjälp av   │
│   en vuxen ]                       │
└────────────────────────────────────┘
```

| Action | Destination |
|--------|-------------|
| Jag har namn och PIN-kod | `ENTRY_CHILD_LOGIN` |
| Jag behöver hjälp av en vuxen | `ENTRY_ADULT_GET_STARTED` |
| Tillbaka | `ENTRY_ROLE_PICK_FOR_START` |

---

### SCREEN C2 — `ENTRY_CHILD_LOGIN`

```text
┌────────────────────────────────────┐
│ ← Tillbaka                         │
│   Hej! Logga in till din Stjärndag │
│ Namn                               │
│ ┌────────────────────────────────┐ │
│ │ Lova                           │ │
│ └────────────────────────────────┘ │
│ PIN-kod                            │
│ ┌────────────────────────────────┐ │
│ │ ● ● ● ●                        │ │
│ └────────────────────────────────┘ │
│ [ Primär: Logga in ]               │
│ Be en vuxen om hjälp om du inte    │
│ vet ditt namn eller din PIN-kod.   │
└────────────────────────────────────┘
```

| Action | Destination |
|--------|-------------|
| Logga in (success) | `CHILD_HOME` |
| Logga in (fail) | Stanna, visa inline error |
| Tillbaka | Föregående skärm (C1 eller A3) |

**Implementation:** Befintlig [`public/child-login.html`](../public/child-login.html) — minimal ändring, ev. ny intro-skärm före.

---

## FLOW D — Vuxen e-post (miniminivå)

Följer befintligt auth-system i `login.html` / `/register`.

| Skärm-ID | Innehåll |
|----------|----------|
| `ENTRY_ADULT_EMAIL_LOGIN` | E-post + lösenord · Logga in · Glömt lösenord? · Skapa konto |
| `ENTRY_ADULT_EMAIL_SIGNUP` | E-post + lösenord + bekräfta · Skapa konto · Har du redan konto? |

---

## FLOW E — Post-signup onboarding (vuxen)

Efter lyckad signup — mappa mot befintlig [`/onboarding`](../public/js/onboarding.js). Speca **delta** mot nuvarande wizard, duplicera inte logik.

| Skärm-ID | Rubrik | Innehåll |
|----------|--------|----------|
| `ONBOARD_CHILD_NAME` | Vad heter barnet? | Fält: barnets namn · CTA: Nästa |
| `ONBOARD_FIRST_ROUTINE` | Vilken rutin vill du börja med? | Morgon / Kväll / Skola-förskola / Läxor / Annat |
| `ONBOARD_TEMPLATE_PICK` | Vill du börja från en mall? | Förskolevardag / Skolvardag / Kvällsrutin / Skapa från grunden |
| `ONBOARD_REWARD_PICK` | Vad vill ni jobba mot? | Förslag + egna mål |
| `ONBOARD_CHILD_PIN` | Skapa barnets PIN-kod | 4 siffror · CTA: Klar → `ADULT_HOME` |

---

# 2. Komponenter

## 2.1 Global komponentlista

**Layout:** `EntryScreenContainer` · `GradientBackground` · `StarfieldDecoration` · `TopBackButtonRow` · `CenteredHeroBlock` · `BottomHelperTextBlock` · `CardStackContainer` · `ButtonStack` · `AuthOptionList`

**UI:** `BrandLogo` · `HeadlineText` · `BodyText` · `SupportText` · `PrimaryButton` · `SecondaryButton` · `TextLink` · `RoleCard` · `StepCard` · `AuthButtonApple` · `AuthButtonEmail` · `AuthButtonGoogle` · `TextInputField` · `PinInputField` · `InlineInfoBox` · `IllustrationBlock` · `SectionHeader` · `ErrorText` · `LoadingButtonState`

## 2.2 Komponentdefinitioner

### `PrimaryButton`

| Egenskap | Värde |
|----------|-------|
| Användning | Primära CTA:er |
| Bredd | Full width |
| Höjd | 52–56 pt |
| Radius | 16–18 pt |
| Bakgrund | Accent-gul (`#FFC93D` — se design tokens) |
| States | default · pressed · disabled · loading |

### `SecondaryButton`

| Egenskap | Värde |
|----------|-------|
| Användning | "Jag har redan konto", "Jag behöver hjälp av en vuxen" |
| Stil | Transparent/semi-transparent lila · 1 px ljus border · samma höjd som primär |
| Text | Vit / off-white |

### `RoleCard`

| Egenskap | Värde |
|----------|-------|
| Användning | "Jag är vuxen" / "Jag är barn" |
| Innehåll | illustration · title · supporting text |
| Min-höjd | 132–156 pt |
| Stil | Lila glasig panel · radius 20–24 pt · hela ytan tappable |
| States | default · pressed · focused · disabled |

### `StepCard`

| Egenskap | Värde |
|----------|-------|
| Användning | 3-stegsöversikt (B1) |
| Innehåll | step badge · title · supporting text |
| Stil | Vertikal stack · radius 18–20 · padding 16–20 |

### `AuthButtonApple`

Följer Apple HIG · vit bakgrund · mörk text · höjd matchar PrimaryButton.

### `TextInputField`

| Egenskap | Värde |
|----------|-------|
| Höjd | 52–56 pt |
| Radius | 14–16 |
| States | empty · active · filled · error · disabled |

### `PinInputField`

| Variant | Beskrivning | Rekommendation |
|---------|-------------|----------------|
| A | Ett maskat fält | Acceptabel MVP |
| B | 4 separata siffror | **Rekommenderad** i barnflöde |

### `InlineInfoBox`

Låg kontrastpanel · ikon + text · ej alarmröd. T.ex. "En vuxen behöver först skapa ditt konto…"

## 2.3 Komponenter per skärm

| Skärm-ID | Komponenter |
|----------|-------------|
| `ENTRY_WELCOME` | BrandLogo · HeadlineText · BodyText · SupportText · PrimaryButton · SecondaryButton · InlineInfoBox · TextLink |
| `ENTRY_ROLE_PICK_FOR_START` | TopBackButtonRow · HeadlineText · SupportText · RoleCard(adult) · RoleCard(child) |
| `ENTRY_LOGIN_CHOICE` | TopBackButtonRow · HeadlineText · SectionHeader(vuxen) · AuthButtonApple · AuthButtonEmail · AuthButtonGoogle? · SectionHeader(barn) · SecondaryButton · SupportText |
| `ENTRY_ADULT_GET_STARTED` | TopBackButtonRow · HeadlineText · BodyText · StepCard×3 · PrimaryButton · SecondaryButton |
| `ENTRY_ADULT_SIGNUP` | TopBackButtonRow · HeadlineText · AuthButtonApple · AuthButtonEmail · BodyText · TextLink |
| `ENTRY_CHILD_GET_STARTED` | TopBackButtonRow · HeadlineText · BodyText · IllustrationBlock · PrimaryButton · SecondaryButton |
| `ENTRY_CHILD_LOGIN` | TopBackButtonRow · HeadlineText · TextInputField · PinInputField · PrimaryButton · SupportText · ErrorText |

## 2.4 Design tokens (referens)

| Token | Värde | Notering |
|-------|-------|----------|
| Primär lila | `#5B3D8B` | Bakgrund/accent |
| Accent-gul (CTA) | `#FFC93D` | Primärknappar, stjärnor |
| Success | `#4CAF50` | Avbockade aktiviteter |
| Typsnitt (mockup) | Poppins | **Öppet beslut:** befintlig kod använder Outfit + Plus Jakarta Sans i `login-magic.css` |

## 2.5 Designprinciper

- Ett steg i taget
- Trygg och varm känsla
- Tydlig hierarki
- Vuxen = kontroll · Barn = enkelhet
- Min touch target: **44×44 pt** (WCAG 2.5.8 — redan i `login.html`)
- Kontrast: minst WCAG AA
- VoiceOver-labels på alla interaktiva element

---

# 3. State-spec

## 3.1 Huvudstates

| State | Definition | Visa |
|-------|------------|------|
| **S0** | Första appöppning, ej autentiserad | `ENTRY_WELCOME` |
| **S1** | Återöppning, utloggad, onboarding ej klar | `ENTRY_WELCOME` (v1: enkelt; "Fortsätt där du slutade" = senare) |
| **S2** | Utloggad, vuxenkonto funnits på enheten | `ENTRY_WELCOME` (ev. experiment: höj "Jag har redan konto") |
| **S3** | Barn försöker starta utan konto | `ENTRY_CHILD_GET_STARTED` med förklaring — **inte** tomt PIN-form |
| **S4** | Barnlogin misslyckas | Stanna på `ENTRY_CHILD_LOGIN` + inline error |
| **S5** | Vuxen signup klar, onboarding ej klar | `ONBOARD_CHILD_NAME` → … → `ONBOARD_CHILD_PIN` |
| **S6** | Fullt inloggad vuxen | `ADULT_HOME` (`/dashboard`) |
| **S7** | Fullt inloggat barn | `CHILD_HOME` (`/child/today`) |
| **S8** | Deep link barnlogin | `ENTRY_CHILD_LOGIN` (+ tillbaka-väg) |
| **S9** | Deep link vuxenlogin | `ENTRY_LOGIN_CHOICE` eller direkt vuxenlogin |

### Edge cases (befintlig kod — ska inte brytas)

| Scenario | Beteende |
|----------|----------|
| `?next=…addChild` | Hoppa över welcome · kräv vuxenlogin · banner i `login.html` |
| Redan inloggad | Validera via `/api/auth/me` → redirect dashboard/child-dashboard |
| Add-child från barnsession | Rensa child session · tvinga vuxenlogin |

## 3.2 UI-states per kritisk skärm

**`ENTRY_WELCOME`:** default · loading assets · network unavailable (om remote content)

**`ENTRY_CHILD_LOGIN`:** empty · name only · pin only · valid ready · auth loading · auth failed · account locked (om stöds)

**`ENTRY_ADULT_SIGNUP`:** idle · apple loading · email loading · cancelled · failed generic · failed network

---

# 4. Copy — final form (svenska)

## `ENTRY_WELCOME`

| Element | Copy |
|---------|------|
| Rubrik | Lugnare vardagar med tydliga scheman och stjärnor som motiverar |
| Brödtext | {{APP_NAME}} hjälper barn med vardagsrutiner genom visuella scheman, tydliga steg och belöningar som gör det lättare att lyckas själv. |
| Stödtext | För familjer med barn som mår bra av struktur, bildstöd och tydlighet i vardagen. |
| Primär CTA | Kom igång gratis |
| Sekundär CTA | Jag har redan konto |
| Hjälptext | Barn loggar in med namn och PIN-kod efter att en vuxen har skapat kontot. |
| Länk | Så fungerar appen |

## `ENTRY_ROLE_PICK_FOR_START`

| Element | Copy |
|---------|------|
| Rubrik | Vem ska använda {{APP_NAME}}? |
| Underrubrik | Välj den väg som passar dig bäst. |
| Kort vuxen | **Jag är vuxen** — *Jag vill skapa konto, lägga upp schema och hjälpa ett barn komma igång.* |
| Kort barn | **Jag är barn** — *Jag vill öppna mitt schema med mitt namn och min PIN-kod.* |

## `ENTRY_LOGIN_CHOICE`

| Element | Copy |
|---------|------|
| Rubrik | Välkommen tillbaka |
| Underrubrik | Logga in som vuxen eller barn. |
| Sektion vuxen | **Jag är vuxen** |
| Hjälptext vuxen | För dig som hanterar schema, inställningar och barnets framsteg. |
| Apple | Fortsätt med Apple |
| E-post | Logga in med e-post |
| Google | Fortsätt med Google *(Android native)* |
| Sektion barn | **Jag är barn** |
| Barn-knapp | Logga in som barn |
| Hjälptext barn | Logga in med ditt namn och din PIN-kod. |

## `ENTRY_ADULT_GET_STARTED`

| Element | Copy |
|---------|------|
| Rubrik | Kom igång med {{APP_NAME}} |
| Intro | Du börjar med att skapa ett vuxenkonto. Därefter lägger du upp barnets schema, aktiviteter och mål. Barnet loggar sedan in med sitt eget namn och PIN-kod. |
| Steg 1 | **Skapa konto** — *Skapa ditt vuxenkonto för att komma igång.* |
| Steg 2 | **Lägg upp schema** — *Välj rutiner, aktiviteter och belöningar som passar ert barn.* |
| Steg 3 | **Barnet loggar in själv** — *Barnet använder sin egen vy med namn och PIN-kod och samlar stjärnor.* |
| Primär CTA | Skapa konto |
| Sekundär CTA | Jag har redan konto |

## `ENTRY_ADULT_SIGNUP`

| Element | Copy |
|---------|------|
| Rubrik | Skapa konto |
| Underrubrik | Välj hur du vill fortsätta. |
| Hjälptext | När kontot är skapat kan du lägga till ett eller flera barn och börja bygga scheman direkt. |
| Apple | Fortsätt med Apple |
| E-post | Registrera med e-post |
| Länk | Har du redan konto? Logga in |

## `ENTRY_CHILD_GET_STARTED`

| Element | Copy |
|---------|------|
| Rubrik | Logga in som barn |
| Text | En vuxen behöver först skapa ditt konto och ditt schema. När det är klart kan du logga in med ditt namn och din PIN-kod. |
| Primär CTA | Jag har namn och PIN-kod |
| Sekundär CTA | Jag behöver hjälp av en vuxen |

## `ENTRY_CHILD_LOGIN`

| Element | Copy |
|---------|------|
| Rubrik | Hej! Logga in till din Stjärndag |
| Fält | Namn · PIN-kod |
| Primär CTA | Logga in |
| Hjälptext | Be en vuxen om hjälp om du inte vet ditt namn eller din PIN-kod. |
| Fel (ogiltig) | Vi kunde inte logga in med de uppgifterna. Be en vuxen kontrollera namn och PIN-kod. |
| Fel (nätverk) | Det gick inte att logga in just nu. Kontrollera din uppkoppling och försök igen. |

## Post-signup onboarding

| Skärm-ID | Rubrik | Hjälptext |
|----------|--------|-----------|
| `ONBOARD_CHILD_NAME` | Vad heter barnet? | Du kan lägga till fler barn senare. |
| `ONBOARD_FIRST_ROUTINE` | Vilken rutin vill du börja med? | Morgon · Kväll · Skola/förskola · Läxor · Annat |
| `ONBOARD_TEMPLATE_PICK` | Vill du börja från en mall? | Du kan alltid ändra schemat senare. |
| `ONBOARD_REWARD_PICK` | Vad vill ni jobba mot? | Välj ett mål som känns roligt och tydligt för barnet. |
| `ONBOARD_CHILD_PIN` | Skapa barnets PIN-kod | Barnet använder PIN-koden för att logga in till sin egen vy. |

---

# 5. Acceptanskriterier

## `ENTRY_WELCOME`

| ID | Kriterium |
|----|-----------|
| AC-W1 | Ej autentiserad kall start → `ENTRY_WELCOME` som första skärm (ej deep link override) |
| AC-W2 | Innehåller: branding · rubrik · produktförklaring · "Kom igång gratis" · "Jag har redan konto" · hjälptext om barn-PIN |
| AC-W3 | Apple/e-post-login får **inte** visas |
| AC-W4 | "Kom igång gratis" → `ENTRY_ROLE_PICK_FOR_START` |
| AC-W5 | "Jag har redan konto" → `ENTRY_LOGIN_CHOICE` |

## `ENTRY_ROLE_PICK_FOR_START`

| ID | Kriterium |
|----|-----------|
| AC-R1 | Exakt två val: Jag är vuxen · Jag är barn |
| AC-R2 | Vuxen → `ENTRY_ADULT_GET_STARTED` |
| AC-R3 | Barn → `ENTRY_CHILD_GET_STARTED` |
| AC-R4 | Inga authknappar (Apple/e-post) |

## `ENTRY_LOGIN_CHOICE`

| ID | Kriterium |
|----|-----------|
| AC-L1 | Vuxenlogin och barnlogin i **två separata sektioner** |
| AC-L2 | Vuxen: minst Apple (om stöds) + e-post |
| AC-L3 | Barn: tydlig action → `ENTRY_CHILD_LOGIN` |
| AC-L4 | Apple initierar vuxenauth, inte barnflöde |
| AC-L5 | "Logga in som barn" → `ENTRY_CHILD_LOGIN` |

## `ENTRY_ADULT_GET_STARTED`

| ID | Kriterium |
|----|-----------|
| AC-AG1 | Kort förklaring av vuxenflödet |
| AC-AG2 | Beskriver: vuxen skapar konto → schema → barn PIN |
| AC-AG3 | "Skapa konto" → `ENTRY_ADULT_SIGNUP` |
| AC-AG4 | "Jag har redan konto" → `ENTRY_LOGIN_CHOICE` |

## `ENTRY_ADULT_SIGNUP`

| ID | Kriterium |
|----|-----------|
| AC-AS1 | Alla godkända signup-metoder för vuxen |
| AC-AS2 | Authmetod startar korrekt flöde |
| AC-AS3 | Lyckad signup → `ONBOARD_CHILD_NAME` om onboarding ej klar |
| AC-AS4 | "Har du redan konto?" → `ENTRY_LOGIN_CHOICE` |

## `ENTRY_CHILD_GET_STARTED`

| ID | Kriterium |
|----|-----------|
| AC-CG1 | Förklarar att vuxen måste skapa konto/schema först |
| AC-CG2 | "Jag har namn och PIN-kod" → `ENTRY_CHILD_LOGIN` |
| AC-CG3 | "Jag behöver hjälp av en vuxen" → `ENTRY_ADULT_GET_STARTED` |

## `ENTRY_CHILD_LOGIN`

| ID | Kriterium |
|----|-----------|
| AC-CL1 | Fält: namn + PIN-kod |
| AC-CL2 | "Logga in" triggar barnauth |
| AC-CL3 | Lyckad auth → barnets startsida |
| AC-CL4 | Misslyckad auth → stanna + tydligt felmeddelande |
| AC-CL5 | Fel blockerar inte nytt försök |
| AC-CL6 | Namn behålls efter fel (om inte säkerhet kräver annat) |

## Post-signup onboarding

| ID | Kriterium |
|----|-----------|
| AC-O1 | Efter vuxensignup → onboarding om ej slutförd |
| AC-O2 | Minst: barnnamn · rutin · mall · barn-PIN |
| AC-O3 | Slutförd onboarding → förälderns första vy |

## Navigation & Icke-funktionellt

| ID | Kriterium |
|----|-----------|
| AC-N1 | Alla skärmar utom `ENTRY_WELCOME` har back-navigation |
| AC-N2 | Back går till logiskt föregående steg |
| AC-N3 | Barn kan inte hamna i vuxen Apple/e-post utan aktivt val av vuxenväg |
| AC-NF1 | Touch targets minst 44×44 pt |
| AC-NF2 | Kontrast WCAG AA |
| AC-NF3 | VoiceOver-labels på alla interaktiva element |
| AC-NF4 | Auth-actions: loading state + skydd mot dubbeltryck |

---

# 6. Event tracking-plan

## 6.1 Gemensamma properties

`screen_id` · `user_type_selected` (adult|child|null) · `entry_path` (start|existing_account|deep_link) · `auth_method` (apple|email|google|child_pin|null) · `is_first_launch` · `has_previous_session` · `platform` (ios|android) · `app_version` · `language`

## 6.2 Eventlista

| # | Event | När | Nyckel-properties |
|---|-------|-----|-------------------|
| 1 | `app_open` | Cold start | `is_first_launch`, `entry_source` |
| 2 | `entry_welcome_viewed` | A1 renderad | `screen_id=ENTRY_WELCOME` |
| 3 | `entry_cta_tapped` | CTA på A1 | `cta_name=get_started\|existing_account\|how_it_works` |
| 4 | `entry_role_selected` | Rollval A2 | `selected_role=adult\|child` |
| 5 | `entry_login_choice_viewed` | A3 renderad | — |
| 6 | `adult_get_started_viewed` | B1 renderad | — |
| 7 | `adult_get_started_cta_tapped` | CTA B1 | `cta_name=create_account\|existing_account` |
| 8 | `adult_signup_viewed` | B2 renderad | — |
| 9 | `adult_auth_started` | Vuxen auth start | `auth_method`, `auth_context=signup\|login` |
| 10 | `adult_auth_completed` | Vuxen auth OK | `is_new_account` |
| 11 | `adult_auth_failed` | Vuxen auth fail | `error_type=cancelled\|invalid\|network\|unknown` |
| 12 | `child_get_started_viewed` | C1 renderad | — |
| 13 | `child_get_started_cta_tapped` | CTA C1 | `cta_name=has_name_and_pin\|needs_adult_help` |
| 14 | `child_login_viewed` | C2 renderad | `entry_source` |
| 15 | `child_login_started` | Barn trycker Logga in | `has_name`, `has_pin` |
| 16 | `child_login_success` | Barn auth OK | — |
| 17 | `child_login_failed` | Barn auth fail | `error_type` |
| 18 | `post_signup_onboarding_started` | E1 efter signup | `auth_method` |
| 19 | `onboarding_step_completed` | E-steg klart | `step_id`, `step_order` |
| 20 | `post_signup_onboarding_completed` | E5 klart | `template_used` |
| 21 | `first_schedule_created` | Första schema/rutin | — |
| 22 | `first_child_profile_ready` | Barnprofil + PIN klar | — |

## 6.3 KPI-funnels

**Funnel A — första förståelse:**
`app_open` → `entry_welcome_viewed` → `entry_cta_tapped(get_started)`

**Funnel B — vuxenkonvertering:**
`entry_cta_tapped(get_started)` → `entry_role_selected(adult)` → `adult_get_started_cta_tapped(create_account)` → `adult_auth_completed(is_new_account=true)` → `post_signup_onboarding_completed` → `first_schedule_created`

**Funnel C — återkommande vuxen:**
`entry_cta_tapped(existing_account)` → `adult_auth_completed(is_new_account=false)`

**Funnel D — barn:**
`entry_role_selected(child)` eller child från A3 → `child_login_started` → `child_login_success`

---

# 7. Flödesdiagram

## 7.1 Huvudflöde — routing vid app open

```text
APP OPEN
│
├─ if authenticated adult -> ADULT_HOME
├─ if authenticated child -> CHILD_HOME
├─ if deep_link == child_login -> ENTRY_CHILD_LOGIN
├─ if deep_link == adult_login -> ENTRY_LOGIN_CHOICE
├─ if ?next=addChild -> vuxenlogin direkt (befintligt)
└─ else -> ENTRY_WELCOME
```

## 7.2 Entry-flöde (fullständigt)

```text
ENTRY_WELCOME
│
├─ Kom igång gratis
│   └─> ENTRY_ROLE_PICK_FOR_START
│        ├─ Jag är vuxen
│        │   └─> ENTRY_ADULT_GET_STARTED
│        │        ├─ Skapa konto -> ENTRY_ADULT_SIGNUP
│        │        │   └─ auth success -> ONBOARD_CHILD_NAME -> ... -> ONBOARD_CHILD_PIN -> ADULT_HOME
│        │        └─ Jag har redan konto -> ENTRY_LOGIN_CHOICE
│        └─ Jag är barn
│            └─> ENTRY_CHILD_GET_STARTED
│                 ├─ Jag har namn och PIN -> ENTRY_CHILD_LOGIN -> CHILD_HOME
│                 └─ Jag behöver hjälp -> ENTRY_ADULT_GET_STARTED
│
└─ Jag har redan konto
    └─> ENTRY_LOGIN_CHOICE
         ├─ Apple / e-post / Google -> auth -> ADULT_HOME
         └─ Logga in som barn -> ENTRY_CHILD_LOGIN -> CHILD_HOME
```

## 7.3 Back-navigation

```text
ENTRY_ROLE_PICK_FOR_START  -> back -> ENTRY_WELCOME
ENTRY_LOGIN_CHOICE         -> back -> ENTRY_WELCOME
ENTRY_ADULT_GET_STARTED    -> back -> ENTRY_ROLE_PICK_FOR_START
ENTRY_ADULT_SIGNUP         -> back -> ENTRY_ADULT_GET_STARTED
ENTRY_CHILD_GET_STARTED    -> back -> ENTRY_ROLE_PICK_FOR_START
ENTRY_CHILD_LOGIN          -> back -> previous screen (C1 or A3)
```

## 7.4 Error-handling

```text
CHILD_LOGIN submit
├─ success -> CHILD_HOME
├─ invalid credentials -> inline error on ENTRY_CHILD_LOGIN
└─ network error -> retryable error on ENTRY_CHILD_LOGIN

ADULT_AUTH submit
├─ success + onboarding complete -> ADULT_HOME
├─ success + onboarding incomplete -> ONBOARD_CHILD_NAME
├─ cancelled -> stay on current screen
└─ failed -> inline error / toast
```

---

# 8. Leveransordning (referens)

| Sprint | Innehåll |
|--------|----------|
| **1 — Entry foundation** | A1 · A2 · A3 · C1 · C2 · entry tracking |
| **2 — Vuxen entry** | B1 · B2 · vuxen auth hooks · auth tracking |
| **3 — Post-signup** | E1–E5 · onboarding tracking |
| **4 — Polish** | Edge cases · a11y · back behavior · resume states |

---

# 9. Mapping mot befintliga filer

| Skärm-ID | Befintlig / ny | Anteckning |
|----------|----------------|------------|
| `ENTRY_WELCOME` | Ny vy eller omstrukturerad `login.html` | Ersätter nuvarande första vy |
| `ENTRY_ROLE_PICK_FOR_START` | Del av entry state machine | Ersätter `#role-selection` utan `#role-quick-login` |
| `ENTRY_LOGIN_CHOICE` | Ny sektion | Nuvarande auth flyttas hit |
| `ENTRY_ADULT_GET_STARTED` | Ny sektion | — |
| `ENTRY_ADULT_SIGNUP` | `/register` + auth från `login.html` | Återanvänd |
| `ENTRY_CHILD_GET_STARTED` | Ny intro före `child-login.html` | — |
| `ENTRY_CHILD_LOGIN` | `child-login.html` | Minimal ändring |
| `ONBOARD_*` | `/onboarding` + `onboarding.js` | Mappa delta, duplicera inte |
| CSS | `login-magic.css` | Utöka eller `app-welcome.css` |
| Native redirect | `platform-theme.js` | `/` → entry welcome (ej `/login`) |
| State machine | `login-magic.js` eller ny `app-entry.js` | Skärm-ID-baserad navigation |
| SW | `sw.js` | Cache bump vid deploy |

---

# 10. Öppna beslut

| # | Fråga | Alternativ |
|---|-------|------------|
| 1 | Typsnitt | Poppins (mockup) vs Outfit/Jakarta (befintlig) |
| 2 | "Så fungerar appen" | Modal · ny skärm · länk till webb |
| 3 | Entry som route | Ny `/app-welcome` vs omstrukturera `/login` |
| 4 | PinInputField | Variant A (MVP) vs B (4 siffror) |
| 5 | Resume onboarding | Visa "Fortsätt där du slutade" i S1? (v1: nej) |

---

# 11. UX-regler (sammanfattning)

1. **Ingen vuxeninloggning på A1** — Apple/e-post först efter "Jag har redan konto" eller vuxenväg
2. **Barn ser aldrig vuxenauth** före aktivt val av vuxenväg
3. **A1 bär produktförklaringen** — scheman, rutiner, stjärnor, familjer
4. **Vuxen börjar** — skapar konto → schema → barn PIN
5. **Barn har alltid utväg** — "Jag behöver hjälp av en vuxen"
6. **Inget dead-end** — barn utan konto möts av C1, inte tomt formulär
