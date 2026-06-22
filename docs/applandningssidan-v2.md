<!-- pragma: allowlist secret -->
# Applandningssidan v2.1 — App Entry Spec

> **Status:** Design / Dev Ready · låsta beslut 2026-06-22  
> **Version:** 2.1.1  
> **Plattform:** iOS / Android native (primärt); webbläsare sekundärt  
> **Yta:** Entry, inloggning, första vägval, vuxen-/barnflöde före inloggat läge  
> **Senast uppdaterad:** 2026-06-22
>
> **Copy-variabel:** `{{APP_NAME}}` = produktnamnet i UI (se varumärkesguide).
>
> **Relaterat (nuvarande implementation):**
> - [`public/login.html`](../public/login.html) — dagens appstart
> - [`public/js/login-magic.js`](../public/js/login-magic.js) — rollkort + `showParentLogin()`
> - [`public/js/platform-theme.js`](../public/js/platform-theme.js) — native redirect `/` → `/login`
> - [`public/child-login.html`](../public/child-login.html) — barninloggning
> - [`public/js/onboarding.js`](../public/js/onboarding.js) — 6-stegs wizard efter signup
> - [`public/index.html`](../public/index.html) — webbens marknadsföringssida

---

## Låsta beslut (2026-06-22)

| Beslut | Val |
|--------|-----|
| **Skärm 3** | Hybrid: profilväljare → PIN; fallback namn + PIN via "Jag hittar inte mig själv" |
| **Back från 4B** | → skärm 1 om entry via "Jag har redan konto"; → 4A om entry via rollval |
| **Plattform** | Native + PWA standalone = full v2.1 · Vanlig webb = `index.html` + `/login` (4B-logik) |

---

# 1. Mål, problem och principer

## 1.1 Bakgrund

{{APP_NAME}} är en app för familjer som vill göra vardagen enklare genom visuella scheman, tydliga steg, stjärnor och belöningar. I dagens app landar användaren direkt på inloggningssidan där både rollval och vuxeninloggning visas samtidigt (`login.html` `#role-quick-login`).

Det skapar tre problem:

1. **Nya användare förstår inte vad appen gör** — inloggning före värdeerbjudande
2. **Barn exponeras för vuxeninloggning** — Apple/e-post syns innan "Jag är vuxen"
3. **Flödet känns bakvänt** — login innan app/roll/väg etablerats

## 1.2 Mål

Den nya entryn ska:

- göra det tydligt **vad {{APP_NAME}} är inom 3–5 sekunder**
- separera **barnflöde** och **vuxenflöde**
- ge **återkommande vuxna en snabb väg till login** (1 tryck från välkomst)
- ge **nya vuxna en trygg väg till "kom igång"**
- ge barn en **enkel, barnvänlig väg till namn + PIN**
- minska felklick, tvekan och avhopp i första sessionen

## 1.3 Produktprinciper

| # | Princip |
|---|---------|
| **P1** | Ett beslut per skärm — inte roll + produkt + auth + registrering samtidigt |
| **P2** | Barn och vuxna delar aldrig login-yta |
| **P3** | Ny användare först; återkommande alltid snabb via "Jag har redan konto" |
| **P4** | Varm, trygg, familjevänlig — inte "teknisk login-app" |
| **P5** | Vardaglig copy — "Kom igång", "Namn + PIN" — inte systemspråk |

---

# 2. Informationsarkitektur

## 2.1 Fyra huvudytor

1. **Välkomstskärm** — vad appen är · Kom igång · Jag har redan konto
2. **Rollval** — Jag är barn · Jag är vuxen
3. **Barninloggning (hybrid)** — profilväljare + PIN, eller namn + PIN
4. **Vuxenstart** — redan konto vs ny här → login / signup-intro

## 2.2 Huvudflöde (v2.1)

```text
App open
  ↓
[Skärm 1: Välkommen]  ENTRY_WELCOME
  ├─ Kom igång → [Skärm 2: Vem är du?]  ENTRY_ROLE_PICK
  └─ Jag har redan konto → [Skärm 4B: Vuxen login]  ENTRY_ADULT_LOGIN

[Skärm 2: Vem är du?]
  ├─ Jag är barn → [Skärm 3: Barnlogin]  ENTRY_CHILD_LOGIN
  └─ Jag är vuxen → [Skärm 4A: Vuxenstart]  ENTRY_ADULT_START

[Skärm 4A: Vuxenstart]
  ├─ Jag har redan konto → [Skärm 4B]  ENTRY_ADULT_LOGIN
  └─ Jag är ny här → [Skärm 5]  ENTRY_ADULT_SIGNUP_INTRO
```

## 2.3 Skillnad mot nuvarande lösning

| | Idag | v2.1 |
|--|------|------|
| Första skärm | Rollval + vuxenlogin | Value prop + två CTA |
| Auth | Före/full rollval | Endast i vuxenspåret |
| Återkommande vuxen | Samma skärm som alla | 1 tryck → vuxenlogin |
| Native intro | Ingen | Ja (webben har `index.html`) |

## 2.4 Skärm-ID-register

| ID | Skärm | Nummer |
|----|-------|--------|
| `ENTRY_WELCOME` | Välkommen | 1 |
| `ENTRY_ROLE_PICK` | Vem är du? | 2 |
| `ENTRY_CHILD_LOGIN` | Barnlogin (hybrid) | 3 |
| `CHILD_PROFILE_PICKER` | Profilväljare (variant A) | 3A |
| `CHILD_NAME_PIN` | Namn + PIN (variant B) | 3B |
| `ENTRY_ADULT_START` | Vuxenstart | 4A |
| `ENTRY_ADULT_LOGIN` | Vuxenlogin | 4B |
| `ENTRY_ADULT_SIGNUP_INTRO` | Ny vuxen / intro + skapa konto | 5 |
| `ENTRY_ADULT_EMAIL_LOGIN` | E-post login (subvy) | D1 |
| `ENTRY_ADULT_EMAIL_SIGNUP` | E-post signup (subvy) | D2 |
| `ENTRY_HOW_IT_WORKS` | Modal / bottom sheet | — |
| `ONBOARD_*` | Post-signup (befintlig wizard) | E |

---

# 3. Målgrupper och scenarier

## 3.1 Ny vuxen (Målgrupp A)

**Situation:** Hört om appen via vän, Facebook, pedagog — osäker på vad den gör.

**Framgång:** Efter skärm 1–2 ska användaren kunna svara på: Vad är det? · Är det för oss? · Vad gör jag nu?

## 3.2 Återkommande vuxen (Målgrupp B)

**Behov:** Snabb in, minimalt brus.

**Framgång:** Vuxenlogin med **max 1 tryck** från välkomst ("Jag har redan konto") eller **2 tryck** via rollval.

## 3.3 Barn (Målgrupp C)

**Behov:** Enkel väg, inga vuxenval, PIN som känns igen.

**Framgång:** Namn + PIN utan Apple/e-post/skapa konto/förälderspråk.

---

# 4. Entry-flöde — skärm för skärm

## 4.1 Skärm 1 — `ENTRY_WELCOME`

**Syfte:** Första skärm — förklara appen, skapa förtroende, två vägar.

### Innehåll

| Element | Copy |
|---------|------|
| Header | Logotyp + ordmärke {{APP_NAME}} |
| Rubrik | En lugnare vardag med tydliga steg, scheman och stjärnor |
| Brödtext | {{APP_NAME}} hjälper barn och familjer med vardagsrutiner genom visuella scheman, tydliga delsteg och belöningar som gör det lättare att klara dagen mer självständigt. |
| Highlights (3 chips) | Visuella scheman · Stjärnor & belöningar · För flera barn och vuxna |
| Primär CTA | **Kom igång** |
| Sekundär CTA | **Jag har redan konto** |
| Tertiär länk | **Så fungerar appen** |

**"Så fungerar appen"** → modal/bottom sheet med 3 kort:

1. Barnet ser sitt schema steg för steg
2. Barnet tjänar stjärnor när aktiviteter blir klara
3. Vuxna följer framsteg och bygger rutiner tillsammans

### Layout

- Övre 20–25 %: logo + rubrik
- Mitten: brödtext + 3 highlights
- Nedre: CTA-stack (primär → sekundär → länk)

### Wireframe

```text
┌────────────────────────────────────┐
│            [stjärn-logo]           │
│           {{APP_NAME}}             │
│  En lugnare vardag med tydliga     │
│  steg, scheman och stjärnor        │
│  [brödtext]                        │
│  [Visuella scheman] [Stjärnor]     │
│  [Flera barn och vuxna]            │
│  [ Kom igång ]                     │
│  [ Jag har redan konto ]           │
│  Så fungerar appen                 │
└────────────────────────────────────┘
```

### Navigation

| Action | Destination |
|--------|-------------|
| Kom igång | `ENTRY_ROLE_PICK` |
| Jag har redan konto | `ENTRY_ADULT_LOGIN` |
| Så fungerar appen | `ENTRY_HOW_IT_WORKS` |

**Regel:** Ingen Apple/e-post/registrering på denna skärm.

---

## 4.2 Skärm 2 — `ENTRY_ROLE_PICK`

**Syfte:** Rent rollval — inga loginmetoder.

| Element | Copy |
|---------|------|
| Rubrik | Vem ska använda appen nu? |
| Kort 1 | **Jag är barn** — *Jag vill se mitt schema* |
| Kort 2 | **Jag är vuxen** — *Jag vill logga in eller komma igång* |
| Tillbaka | ← Tillbaka |

| Action | Destination |
|--------|-------------|
| Jag är barn | `ENTRY_CHILD_LOGIN` |
| Jag är vuxen | `ENTRY_ADULT_START` |
| Tillbaka | `ENTRY_WELCOME` |

**Design:** Rundade kort · ikon/illustration · barnkort mjukare · vuxenkort renare.

---

## 4.3 Skärm 3 — `ENTRY_CHILD_LOGIN` (hybrid) 🔒 LÅST

**Beslut (2026-06-22):** Hybrid — profilväljare först om kända profiler finns; namn + PIN som fallback. **Inte** ren namn+PIN.

**Syfte:** Barnet får en enkel inloggning utan vuxenbrus. Kända barn loggar in snabbt via profil + PIN. Okända/enheter utan cache använder namn + PIN.

### 4.3.1 Beslutslogik

| Visa | Villkor |
|------|---------|
| **Variant A — profilväljare** (`CHILD_PROFILE_PICKER`) | Minst 1 barnprofil i `stjarndag_known_children` (localStorage) **eller** från `/api/auth/login-picker-children` |
| **Variant B — namn + PIN** (`CHILD_NAME_PIN`) | Inga profiler tillgängliga **eller** användaren trycker **Jag hittar inte mig själv** |

**Regler:**

1. Profilväljare är **default** när data finns
2. Namn + PIN ska **alltid** finnas som fallback
3. Barn ska **aldrig** skickas till vuxenlogin från skärm 3

**Befintlig kod:** `child-login.js` `loadKnownChildren()` · `renderChildList()` · `handleManualName()` · `clStepProfiles` / `clStepPin`

---

### 4.3.2 Variant A — Profilväljare

| Element | Copy |
|---------|------|
| Rubrik | Vem är du? |
| Brödtext | Välj din profil och skriv din PIN-kod. |
| Profilgrid | Stora kort: avatar + barnets namn · tydlig touchyta · vald state |
| PIN | Aktiveras efter profilval · 4 siffror · maskerad |
| Primär CTA | **Logga in** |
| Sekundär länk | **Jag hittar inte mig själv** → variant B |
| Tillbaka | ← Tillbaka → `ENTRY_ROLE_PICK` |

**Auto-select:** Om exakt 1 profil → hoppa direkt till PIN (befintligt `maybeAutoSelectOnlyChild()`).

#### Wireframe 3A

```text
Vem är du?
Välj din profil och skriv din PIN-kod.

[ Lova ]   [ Noah ]
[ Ella ]   [ Liam ]

(vald profil →)
PIN-kod  [ • • • • ]
[ Logga in ]

Jag hittar inte mig själv
Tillbaka
```

---

### 4.3.3 Variant B — Namn + PIN

| Element | Copy |
|---------|------|
| Rubrik | Logga in som barn |
| Brödtext | Skriv ditt namn och din hemliga PIN-kod. |
| Fält | Namn · PIN-kod |
| Primär CTA | **Logga in** |
| Tillbaka | ← Tillbaka → `ENTRY_ROLE_PICK` *(eller profilväljare om användaren kom via "Jag hittar inte mig själv")* |

**Implementation:** Befintlig `handleManualName()` → PIN-steg kan behållas; alternativt ett kombinerat formulär enligt wireframe.

#### Wireframe 3B

```text
Logga in som barn
Skriv ditt namn och din hemliga PIN-kod.

Namn       [__________]
PIN-kod    [ • • • • ]
[ Logga in ]
Tillbaka
```

---

### 4.3.4 State machine (barnlogin)

```text
CHILD_LOGIN_ENTRY
  ├─ hasKnownChildProfiles → CHILD_PROFILE_PICKER
  └─ else                  → CHILD_NAME_PIN

CHILD_PROFILE_PICKER
  ├─ select_profile    → CHILD_PROFILE_PIN
  ├─ click_not_me      → CHILD_NAME_PIN
  └─ back              → ENTRY_ROLE_PICK

CHILD_PROFILE_PIN
  ├─ submit_success    → CHILD_HOME
  ├─ submit_error      → stay (inline error)
  ├─ change_profile    → CHILD_PROFILE_PICKER
  ├─ click_not_me      → CHILD_NAME_PIN
  └─ back              → CHILD_PROFILE_PICKER

CHILD_NAME_PIN
  ├─ submit_success    → CHILD_HOME
  ├─ submit_error      → stay (inline error)
  └─ back              → ENTRY_ROLE_PICK (eller CHILD_PROFILE_PICKER)
```

---

### 4.3.5 Felcopy (båda varianter)

| Fel | Copy |
|-----|------|
| Namn tomt | Skriv ditt namn först |
| Profil ej vald | Välj din profil först |
| PIN tom | Skriv din PIN-kod |
| Ogiltigt format | PIN-koden ska vara 4 siffror |
| Fel namn/PIN | Det gick inte att logga in. Kontrollera namn och PIN och försök igen. |
| Tekniskt fel | Något gick fel just nu. Försök igen om en liten stund. |

### 4.3.6 UX vid fel

- Behåll vald profil eller ifyllt namn vid credentials-fel
- Rensa PIN efter fel
- **Får inte innehålla:** Skapa konto · Apple · e-post · förälderkonto

| Action | Destination |
|--------|-------------|
| Lyckad login | `CHILD_HOME` (`/child/today`) |

---

## 4.4 Skärm 4A — `ENTRY_ADULT_START`

**Syfte:** "Har du konto eller är du ny?" — inte loginmetod ännu.

| Element | Copy |
|---------|------|
| Rubrik | Välkommen! Hur vill du fortsätta? |
| Alt 1 | **Jag har redan konto** — *Logga in med Apple, Google eller e-post* |
| Alt 2 | **Jag är ny här** — *Se hur appen fungerar och skapa konto kostnadsfritt* |
| Tillbaka | ← Tillbaka |

| Action | Destination |
|--------|-------------|
| Jag har redan konto | `ENTRY_ADULT_LOGIN` |
| Jag är ny här | `ENTRY_ADULT_SIGNUP_INTRO` |
| Tillbaka | `ENTRY_ROLE_PICK` |

---

## 4.5 Skärm 4B — `ENTRY_ADULT_LOGIN`

**Syfte:** Vuxnas faktiska inloggningsmetoder — först här.

| Element | Copy |
|---------|------|
| Rubrik | Logga in som vuxen |

**iOS:** Fortsätt med Apple · Logga in med e-post · (Google om aktiv)

**Android:** Fortsätt med Google · Logga in med e-post

| Element | Copy |
|---------|------|
| Hjälplänk | Har du inget konto? Skapa konto |
| Tillbaka | ← Tillbaka |

**Copy-regel:** "Fortsätt med Apple" (plattformsstandard) hellre än "Logga in med Apple".

| Action | Destination |
|--------|-------------|
| Apple/Google/e-post | Befintlig auth |
| Skapa konto | `ENTRY_ADULT_SIGNUP_INTRO` |
| Tillbaka | `ENTRY_ADULT_START` *(eller `ENTRY_WELCOME` om användaren kom via "Jag har redan konto" på skärm 1)* |

---

## 4.6 Skärm 5 — `ENTRY_ADULT_SIGNUP_INTRO`

**Syfte:** Kort trygghet före konto — inte lång onboarding.

| Element | Copy |
|---------|------|
| Rubrik | Kom igång med {{APP_NAME}} |
| Brödtext | Skapa ett kostnadsfritt konto och bygg barnets första schema med tydliga steg, stjärnor och mål. |
| Punkt 1 | Visuella scheman som barnet förstår |
| Punkt 2 | Stjärnor och belöningar som motiverar |
| Punkt 3 | Flera barn och vuxna i samma familj |
| Primär CTA | **Skapa konto kostnadsfritt** |
| Sekundär CTA | **Jag har redan konto** |
| Extra (om grundarprogram) | Just nu ingår Basic kostnadsfritt för grundarmedlemmar. |

| Action | Destination |
|--------|-------------|
| Skapa konto kostnadsfritt | Signup / befintlig `/register` + auth |
| Jag har redan konto | `ENTRY_ADULT_LOGIN` |

---

# 5. UX-copy, tonalitet och microcopy

## 5.1 Röst och ton

**Ska låta:** varm · enkel · trygg · konkret · respektfull mot stressade föräldrar

**Ska inte låta:** teknisk · myndig · säljig · överpedagogisk · barnslig (i vuxenspåret)

## 5.2 Copy-principer

- Säg vad användaren ska göra **nu**
- Beskriv värdet med enkla ord
- Korta rubriker
- Lugna, hjälpsamma felmeddelanden

**Undvik:** autentisering · användaruppgifter · fortsätt till portal · välj rolltyp

## 5.3 Godkänd copy — sammanfattning

Se §4 per skärm. All copy ovan är **godkänd för implementation**.

---

# 6. Komponenter (design/dev)

## 6.1 Global lista

**Layout:** `EntryScreenContainer` · `GradientBackground` · `StarfieldDecoration` · `TopBackButtonRow` · `CenteredHeroBlock` · `ButtonStack` · `HighlightChips`

**UI:** `BrandLogo` · `HeadlineText` · `BodyText` · `PrimaryButton` · `SecondaryButton` · `TextLink` · `RoleCard` · `StepCard` · `HighlightChip` · `AuthButtonApple` · `AuthButtonEmail` · `AuthButtonGoogle` · `TextInputField` · `PinInputField` · `InlineInfoBox` · `HowItWorksSheet` · `ErrorText` · `LoadingButtonState`

## 6.2 Nyckelkomponenter

### `PrimaryButton`

Full width · höjd 52–56 pt · radius 16–18 pt · accent-gul (`#FFC93D` eller befintlig `gold: #F5A623`) · states: default/pressed/disabled/loading

### `RoleCard`

Full width · min-höjd 132–156 pt · glasig lila panel · radius 20–24 pt · hela ytan tappable

### `HighlightChip`

3 st på skärm 1 — ikon + kort label · låg profil, inte konkurrerande med CTA

### `PinInputField`

**Rekommendation:** 4 separata siffror (barn) · MVP: ett maskat fält acceptabelt

## 6.3 Design tokens

| Token | Mockup | Befintlig kod |
|-------|--------|---------------|
| Primär lila | `#5B3D8B` | `login-magic.css` gradient |
| Accent-gul | `#FFC93D` | `#F5A623` (theme gold) |
| Typsnitt | Poppins | Outfit + Plus Jakarta Sans |
| Touch target | min 44×44 pt | Redan i `login.html` |

**Beslut:** Behåll befintliga fonts om inte hela appen byter — mockup-Poppins är referens, inte krav.

---

# 7. Interaktionsregler, states och felhantering

## 7.1 Back-navigation 🔒 LÅST

Back ska gå till **den faktiska väg användaren tog** — spara `entry_path` i state.

| Från | Tillbaka till | Villkor |
|------|---------------|---------|
| Skärm 2 | Skärm 1 | alltid |
| Skärm 3 (barn) | Skärm 2 | alltid |
| Skärm 4A | Skärm 2 | alltid |
| Skärm 4B | Skärm 1 | om entry via "Jag har redan konto" på skärm 1 |
| Skärm 4B | Skärm 4A | om entry via skärm 2 → vuxen → "Jag har redan konto" |
| Skärm 5 | Skärm 4A | alltid |
| Barnlogin variant B | Skärm 2 eller profilväljare | beroende på hur användaren kom dit |

**Implementation:** `sessionStorage.entry_back_target` eller motsvarande per navigation.

## 7.1.1 Plattform 🔒 LÅST

| Plattform | Entry-flöde |
|-----------|---------------|
| **Native (iOS/Android)** | Full v2.1 — `platform-theme.js` redirect till welcome |
| **PWA standalone** | Som native (`matchMedia standalone`) |
| **Vanlig webb** | `index.html` = marknadsförstavy · `/login` = samma vuxenloginlogik som 4B · rolllogik kan följa v2.1 över tid |

## 7.2 Auth avbruten

Om Apple/Google stängs: ingen hård error · tillbaka till login-yta · ev. diskret: *Inloggningen avbröts*

## 7.3 Loading states

- Disable dubbeltryck på primär CTA under nätverk/auth
- Spinner i knapp
- Disable parallella auth-försök

## 7.4 Form states

| State | Beteende |
|-------|----------|
| Default | Tomma fält · neutral border |
| Focus | Tydligare border/accent |
| Error | Röd markering · feltext under fält |
| Disabled | Sparsamt — föredra aktiv knapp + fel efter tryck för barn |

## 7.5 Barnlogin — UX vid fel

- Rensa **inte** namn automatiskt vid fel credentials
- Rensa PIN om säkrare/tydligare

## 7.6 Session / återbesök

| State | Beteende |
|-------|----------|
| Vuxen inloggad | Hoppa entry → `/dashboard` (befintlig logik i `login.html`) |
| Barn inloggad | Hoppa entry → `/child/today` |
| Add-child deep link | Hoppa welcome · tvinga vuxenlogin (`?next=addChild`) |

---

# 8. Mätning, KPI:er och event tracking

## 8.1 Syfte

Svara på: Förstår fler? · Fler når konto/schema? · Färre barn i vuxenlogin? · Snabbare vuxenlogin? · Var faller de ur?

## 8.2 KPI:er

| KPI | Mätning |
|-----|---------|
| **KPI 1** Start rate till rätt väg | Barn vs vuxen från entry |
| **KPI 2** Vuxen signup conversion | `app_open` → `signup_started` → `signup_completed` |
| **KPI 3** Första värdeskapande | `signup_completed` → `first_schema_created` |
| **KPI 4** Barnlogin success | Andel lyckade utan >1 fel |

**Sekundärt:** CTR Kom igång · CTR Jag har redan konto · CTR Så fungerar appen · drop-off 4A→4B · drop-off 5→signup

## 8.3 Eventlista

Alla events: `platform` · `entry_version: v2_1`

| Event | När |
|-------|-----|
| `app_opened` | App öppnas till entry |
| `entry_welcome_viewed` | Skärm 1 |
| `entry_cta_started` | "Kom igång" |
| `entry_existing_account_tapped` | "Jag har redan konto" (skärm 1) |
| `entry_how_it_works_opened` | "Så fungerar appen" |
| `role_selection_viewed` | Skärm 2 |
| `role_child_selected` | Jag är barn |
| `role_adult_selected` | Jag är vuxen |
| `child_login_viewed` | Skärm 3 |
| `child_login_submitted` | Logga in · props: `name_filled`, `pin_length` |
| `child_login_success` | OK |
| `child_login_failed` | props: `reason` |
| `child_login_mode_viewed` | props: `mode` (profile_picker \| name_pin), `profiles_count` |
| `child_profile_selected` | profil vald i variant A |
| `child_profile_not_found_clicked` | "Jag hittar inte mig själv" |
| `adult_start_viewed` | Skärm 4A |
| `adult_existing_selected` | Jag har redan konto (4A) |
| `adult_new_selected` | Jag är ny här |
| `adult_login_viewed` | Skärm 4B |
| `adult_login_method_selected` | props: `method` (apple/google/email) |
| `adult_login_success` | props: `method` |
| `adult_login_failed` | props: `method`, `reason` |
| `adult_signup_intro_viewed` | Skärm 5 |
| `signup_started` | "Skapa konto kostnadsfritt" · `source: adult_intro` |
| `signup_completed` | props: `method` |
| `first_schema_created` | Aktivering |
| `first_child_profile_ready` | Barn + PIN klart |

## 8.4 Funnels

**Funnel A — Ny vuxen:**
`entry_welcome_viewed` → `entry_cta_started` → `role_adult_selected` → `adult_new_selected` → `signup_started` → `signup_completed` → `first_schema_created`

**Funnel B — Återkommande vuxen:**
`entry_welcome_viewed` → `entry_existing_account_tapped` → `adult_login_viewed` → `adult_login_method_selected` → `adult_login_success`

**Funnel C — Barn:**
`entry_welcome_viewed` → `entry_cta_started` → `role_child_selected` → `child_login_viewed` → `child_login_submitted` → `child_login_success`

## 8.5 Success criteria (2–4 veckor post-release)

- Högre CTR "Kom igång" vs nuvarande
- Högre signup start-rate · lägre drop-off före signup
- Färre vuxenlogin-exponeringar för barn
- Hög barnlogin-success
- Färre dead-end-sessioner (öppnar men inget steg)

---

# 9. Acceptanskriterier (v2.1)

| ID | Kriterium |
|----|-----------|
| AC-W1 | Kall start → `ENTRY_WELCOME` först (ej deep link) |
| AC-W2 | Skärm 1: branding · rubrik · highlights · två CTA · hjälptext |
| AC-W3 | **Ingen** vuxenauth på skärm 1 |
| AC-W4 | "Kom igång" → skärm 2 |
| AC-W5 | "Jag har redan konto" → skärm 4B **direkt** (1 tryck) |
| AC-R1 | Skärm 2: exakt två rollkort, inga authknappar |
| AC-R2 | Barn → skärm 3 · Vuxen → skärm 4A |
| AC-CL1 | Skärm 3: hybrid — profilväljare om profiler finns, annars namn + PIN |
| AC-CL2 | "Jag hittar inte mig själv" → variant B utan vuxenlogin |
| AC-CL3 | Fel copy enligt §4.3.5 · profil/namn behålls vid credentials-fel |
| AC-AS1 | Skärm 4A: konto vs ny — inga loginmetoder |
| AC-AL1 | Skärm 4B: plattformsanpassade auth-metoder |
| AC-AL2 | Back från 4B → 1 eller 4A beroende på `entry_path` |
| AC-SI1 | Skärm 5: intro + "Skapa konto kostnadsfritt" |
| AC-N1 | Alla skärmar utom 1 har back |
| AC-NF1 | Touch 44×44 pt · WCAG AA · VoiceOver labels · loading/disabled på auth |

---

# 10. Flödesdiagram

## 10.1 App open routing

```text
APP OPEN
├─ authenticated adult  → ADULT_HOME
├─ authenticated child  → CHILD_HOME
├─ deep_link addChild     → vuxenlogin (skip welcome)
├─ deep_link child_login  → ENTRY_CHILD_LOGIN
└─ else                   → ENTRY_WELCOME
```

## 10.2 Fullständigt entry-flöde

```text
ENTRY_WELCOME
├─ Kom igång → ENTRY_ROLE_PICK
│   ├─ Barn  → ENTRY_CHILD_LOGIN → CHILD_HOME
│   └─ Vuxen → ENTRY_ADULT_START
│       ├─ Redan konto → ENTRY_ADULT_LOGIN → ADULT_HOME
│       └─ Ny här → ENTRY_ADULT_SIGNUP_INTRO
│           └─ Skapa konto → signup → ONBOARD → ADULT_HOME
└─ Jag har redan konto → ENTRY_ADULT_LOGIN (direkt)
```

## 10.3 Error-handling

```text
CHILD_LOGIN: success→CHILD_HOME | invalid→inline error | network→retry message
ADULT_AUTH:  success+onboard done→HOME | success+incomplete→ONBOARD | cancelled→stay
```

---

# 11. Mapping mot befintlig kod

| v2.1 skärm | Befintlig fil | Anteckning |
|------------|---------------|------------|
| Skärm 1 | Ny vy eller omstrukturera `login.html` | Ersätter `#role-selection` + `#role-quick-login` |
| Skärm 2 | `login-magic.js` state | Rollkort finns — flytta auth bort |
| Skärm 3 | `child-login.html` + `child-login.js` | **Hybrid låst** — återanvänd profilgrid + PIN + `handleManualName()`; lägg till "Jag hittar inte mig själv" |
| Skärm 4A | Ny sektion | Finns inte idag |
| Skärm 4B | `#parent-login-section` i `login.html` | Flytta hit, visa villkorligt |
| Skärm 5 | Ny sektion eller `/register` intro | Kortare än v2.0:s 3-stegskort |
| Post-signup | `onboarding.js` (6 steg) | Återanvänd — mappa mot ONBOARD_* |
| Native redirect | `platform-theme.js` | `/` → welcome, inte `/login` |
| Auth | `auth.js`, Apple/Google UI | Återanvänd oförändrat |
| State machine | `login-magic.js` eller ny `app-entry.js` | Skärm-ID-baserad navigation |

---

# 12. Kodinformerad bedömning

> Denna sektion är teamets tekniska kommentar utifrån nuvarande repo — inte en del av designbriefen, men viktig för realistisk leverans.

## 12.1 v2.1 är rätt — och bättre än v2.0 på ett avgörande ställe

**"Jag har redan konto" → direkt till 4B** är den viktigaste förbättringen gentemot v2.0. Idag måste alla genom samma skärm. v2.1 matchar målgrupp B (återkommande vuxen) och kravet på max 1 tryck.

**Förenklat barnflöde** (skärm 2 → 3 direkt, utan pedagogisk mellanskärm på happy path) är OK för återkommande barn. Behåll dock en **fallback** om login misslyckas eller inga barn finns: kort text "Be en vuxen skapa ditt konto" — inte dead-end.

## 12.2 Det mesta kan byggas som omstrukturering — inte ny app

| Tillgång | Bedömning |
|----------|-----------|
| `login-magic.css` | Stjärnbakgrund, kort, knappar — **återanvänd** |
| `login-magic.js` | `showParentLogin()` / rollkort — **refaktorera** till state machine |
| Apple/Google auth | `apple-sign-in-diagnostics.js`, `google-auth-ui.js` — **oförändrat** |
| Session redirect | `login.html` DOMContentLoaded + `Auth.isLoggedIn()` — **behåll** |
| Add-child | `?next=addChild`, `cl_add_child_pending` — **rör inte** |

**Rekommendation:** En HTML-fil (`login.html` eller `/app-welcome`) med **vyn per skärm-ID** (show/hide), inte 6 separata routes — mindre SW-cache-yta, enklare back-stack.

## 12.3 Skärm 3 — 🔒 LÅST som hybrid

**Beslut:** Profilväljare först · namn + PIN som fallback.

Koden stödjer detta redan i stort:

| Befintligt | Spec-koppling |
|------------|---------------|
| `stjarndag_known_children` (localStorage) | Kvar efter vuxen logout — variant A |
| `renderChildList()` + `paintChildListCards()` | Profilgrid |
| `selectChild()` → `clStepPin` | Profil → PIN |
| `maybeAutoSelectOnlyChild()` | 1 barn → direkt PIN |
| `handleManualName()` + `clManualNameForm` | Variant B (utöka med "Jag hittar inte mig själv") |

**Implementation delta:** Lägg till länken **Jag hittar inte mig själv** på profilväljaren. Säkerställ att variant B är nåbar även när profiler finns. Entry state machine ska routa skärm 2 → befintlig `/child-login` (eller inbäddad vy).

**Inte göra:** Riv inte profilväljaren till förmån för rent namnfält.

## 12.4 Skärm 5 + onboarding — duplicera inte

Befintlig `onboarding.js` har redan **6 steg**:

1. Barnets namn + emoji/avatar
2. Välj mall (förskola/skola/morgon/kväll/…)
3. Bekräfta schema
4. Välj belöningar
5. PIN + inloggningsinfo
6. Bjud in / firande

v2.1 skärm 5 ("3 värdepunkter + Skapa konto") är **pre-signup intro** — bra. Efter signup ska användaren in i **befintlig wizard**, inte en parallell 5-stegs ONBOARD_* i entry-specen.

**Justera spec-språk:** Skärm 5 leder till `/register` eller inline signup → sedan `/onboarding` som idag.

## 12.5 Event tracking — finns infrastruktur men inte entry-events

`analytics_events`-tabellen finns (server-side). Entry-events i §8 **finns inte** i frontend idag — GA4/cookie-banner hanterar sidvisning, inte produktfunnel.

**Leverans:** Ny liten `app-entry-analytics.js` som POST:ar till befintlig analytics-API (eller utökar den) — planera i sprint 1, inte sprint 4.

## 12.6 Webb vs native — 🔒 LÅST

Se §7.1.1. Native + PWA = full v2.1. Webb = marknadssida + `/login` med 4B-logik.

## 12.7 Grundarprogram-copy på skärm 5

`/api/registration-status` returnerar `registration_enabled: true`. Copy om grundarmedlemmar bör **hämtas dynamiskt** (som `registerBanner` i `login.html` idag) — inte hårdkodas om programmet stängs.

## 12.8 Risker att planera för

| Risk | Mitigering |
|------|------------|
| Back från 4B → 1 vs 4A | Spara `entry_path` i session/state vid navigation |
| iPad barn ser welcome varje gång | OK enligt spec — överväg "kom ihåg senaste roll" senare |
| Apple Sign In iPad (build 19-fix) | Auth oförändrad — entry-ombyggnad rör inte Swift |
| SW cache | Bump `sw.js` vid varje frontend-deploy (repo-regel) |
| Tom global library lokalt | Onboarding mall-steg failar i dev — prod OK |

## 12.9 Sammanfattande rekommendation

| Prioritet | Gör |
|-----------|-----|
| **P0** | Skärm 1 + dölj `#role-quick-login` + "Jag har redan konto" → 4B direkt |
| **P1** | Skärm 2 rollval · Skärm 4A vuxenstart |
| **P2** | Skärm 5 intro · Skärm 3 hybrid (profil + namn/PIN) |
| **P3** | "Så fungerar appen" modal · entry analytics · A/B |

**Slutsats:** v2.1-specen är **implementerbar** — hybrid skärm 3 var rätt beslut och matchar ~90 % av befintlig `child-login.js`.

---

# 13. Leveransordning (referens)

| Sprint | Innehåll |
|--------|----------|
| **1** | Skärm 1 · 2 · 4B direkt-länk · dölj quick-login · entry events grund |
| **2** | Skärm 4A · 3 (hybrid child-login) · back-stack |
| **3** | Skärm 5 · signup hooks · onboarding-koppling |
| **4** | Så fungerar appen-modal · polish · a11y · edge cases |

---

# Bilaga — v2.0 → v2.1 ändringar

| v2.0 | v2.1 |
|------|------|
| "Kom igång gratis" | "Kom igång" |
| "Jag har redan konto" → rollval först | → direkt 4B |
| `ENTRY_CHILD_GET_STARTED` på barnväg | Borttagen från happy path — kvar som fel/fallback |
| 3-stegskort på vuxen intro (B1) | Flyttat till skärm 5 (kortare) |
| `ENTRY_LOGIN_CHOICE` med barn+vuxen | Split: 4B (vuxen) · skärm 3 (barn) |
| Copy "Lugnare vardagar…" | "En lugnare vardag…" + 3 highlights |

---

# Nästa steg (v2.2 — ej inkluderat)

- §9–§15 utökad leverans (UI tokens per pixel, PRD/tickets, Figma-manus)
- A/B-testförslag
- Lokaliseringsnycklar (`i18n.js`)
