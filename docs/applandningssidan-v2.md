<!-- pragma: allowlist secret -->
# Applandningssidan v2.2 — App Entry Spec

> **Status:** Design / Dev Ready · låsta beslut 2026-06-22  
> **Version:** 2.2  
> **Plattform:** iOS / Android native (primärt); webbläsare sekundärt  
> **Yta:** Entry, inloggning, första vägval, vuxen-/barnflöde före inloggat läge  
> **Senast uppdaterad:** 2026-06-22
>
> **Copy-variabel:** `{{APP_NAME}}` = fullständiga varumärket (**Min** + **Stjärndag**, två ord — aldrig enbart "Stjärndag").
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

# 6. Komponenter — översikt

> Detaljerad komponentspec finns i **§9 (design tokens)** och **§10 (komponentbibliotek)**. Detta avsnitt är bara en snabböversikt så att §7–§8 kan refereras i rätt ordning.

**Kärnkomponenter:** `PrimaryButton` · `SecondaryButton` · `RoleCard` · `HighlightChip` · `TextInputField` · `PinInputField` · `ChildProfileCard` · `ErrorText` · `HowItWorksSheet` · `EntryHeroBlock` · `AuthButton{Apple,Email,Google}`

**Designbeslut:** Behåll befintliga fonts (Outfit + Plus Jakarta Sans) — mockup-Poppins är referens, inte krav. Se §9.3.

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
| **Native (iOS/Android)** | Full v2.2 — `platform-theme.js` redirect till welcome |
| **PWA standalone** | Som native (`matchMedia standalone`) |
| **Vanlig webb** | `index.html` = marknadsförstavy · `/login` = samma vuxenloginlogik som 4B · rolllogik kan följa v2.2 över tid |

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
| **KPI 2** Vuxen signup conversion | `app_opened` → `signup_started` → `signup_completed` |
| **KPI 3** Första värdeskapande | `signup_completed` → `first_schema_created` |
| **KPI 4** Barnlogin success | Andel lyckade utan >1 fel |

**Sekundärt:** CTR Kom igång · CTR Jag har redan konto · CTR Så fungerar appen · drop-off 4A→4B · drop-off 5→signup

## 8.3 Eventlista

Alla events bär `platform` + `entry_version`. Full triggermappning i §13.3, serverwhitelist i §13.5.

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
| `child_login_mode_viewed` | Skärm 3 render · props: `mode` (profile_picker \| name_pin), `profiles_count` |
| `child_profile_selected` | Profil vald i variant A |
| `child_profile_not_found_clicked` | "Jag hittar inte mig själv" |
| `child_login_submitted` | Logga in · props: `name_filled`, `pin_length` |
| `child_login_success` | OK |
| `child_login_failed` | props: `reason` |
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

**Aktiveringsmått (återanvänder befintliga `funnel_*`):** `first_schema_created` / `first_child_profile_ready` mappas mot befintligt `funnel_first_child_created` i `onboarding.js` — skapa inte nya dubbletter.

## 8.4 Funnels

**Funnel A — Ny vuxen:**
`entry_welcome_viewed` → `entry_cta_started` → `role_adult_selected` → `adult_new_selected` → `signup_started` → `signup_completed` → `first_schema_created`

**Funnel B — Återkommande vuxen:**
`entry_welcome_viewed` → `entry_existing_account_tapped` → `adult_login_viewed` → `adult_login_method_selected` → `adult_login_success`

**Funnel C — Barn:**
`entry_welcome_viewed` → `entry_cta_started` → `role_child_selected` → `child_login_mode_viewed` → `child_login_submitted` → `child_login_success`

## 8.5 Success criteria (2–4 veckor post-release)

- Högre CTR "Kom igång" vs nuvarande
- Högre signup start-rate · lägre drop-off före signup
- Färre vuxenlogin-exponeringar för barn
- Hög barnlogin-success
- Färre dead-end-sessioner (öppnar men inget steg)

---

# 9. Design tokens & visuellt språk

> **Princip:** Entry-flödet ska visuellt matcha befintlig "Magisk natt"-stil i `login-magic.css` / `child-login-magic.css`. Mockup-tokens (Poppins, `#5B3D8B`) är **referens** — implementation följer befintliga fonts tills hela appen byter.

## 9.1 Färgpalett

| Token | Hex / värde | Användning |
|-------|-------------|------------|
| `entry-bg-gradient` | `#0f1a3d` → `#f5a2b8` (160deg, se CSS) | Fullskärmsbakgrund |
| `entry-bg-glow-purple` | `rgba(147,112,219,0.35)` | Radial accent |
| `entry-bg-glow-pink` | `rgba(255,105,180,0.30)` | Radial accent |
| `entry-surface-glass` | `rgba(255,255,255,0.07)` | Kort, paneler |
| `entry-surface-glass-hover` | `rgba(255,255,255,0.14)` | Kort hover |
| `entry-border-subtle` | `rgba(255,255,255,0.15)` | Kortborder |
| `entry-border-active` | `rgba(255,255,255,0.45)` | Fokus/hover |
| `entry-text-primary` | `#ffffff` | Rubriker på mörk bg |
| `entry-text-secondary` | `rgba(255,255,255,0.85)` | Brödtext |
| `entry-text-muted` | `rgba(255,255,255,0.60)` | Hjälptext, labels |
| `entry-cta-gold` | `#F5A623` | Primär CTA (befintlig `gold`) |
| `entry-cta-gold-pressed` | `#D4891A` | Primär pressed |
| `entry-role-kid-bg` | `rgba(147,112,219,0.22)` | Barn-rollkort |
| `entry-role-adult-bg` | `rgba(251,191,36,0.18)` | Vuxen-rollkort |
| `entry-auth-apple-bg` | `#ffffff` | Apple-knapp |
| `entry-auth-apple-text` | `#1d1d1f` | Apple-knapp text |
| `entry-error` | `#ef4444` | Feltext, error border |
| `entry-success` | `#4CAF50` | Checkmarks (referens) |
| `entry-input-bg` | `rgba(255,255,255,0.08)` | Input på mörk bg |
| `entry-input-border-focus` | `rgba(255,255,255,0.55)` | Input focus |

## 9.2 Gradient & bakgrund

- **Bas:** `.login-magic-bg` — lager av radial + linear gradient (behåll)
- **Dekoration:** `#stars-container` + `#clouds-container` — animerade partiklar (behåll `login-magic.js` `generateStars()`)
- **Regel:** Samma bakgrund på skärm 1–5 och child-login — visuell kontinuitet
- **Kontrast:** Text och CTA ska hålla WCAG AA mot gradient (testa rubrik + gul knapp)

## 9.3 Typografi

| Roll | Font (implementation) | Weight | Storlek (ref) |
|------|----------------------|--------|---------------|
| Display / logo | Outfit | 800 | 2.4rem (`login-magic-logo h1`) |
| Rubrik H1 | Outfit | 700–800 | 1.5–1.75rem |
| Rubrik H2 | Outfit | 700 | 1.15–1.25rem |
| Brödtext | Plus Jakarta Sans | 400–500 | 0.95–1rem |
| Knapp | Plus Jakarta Sans / system (Apple) | 600 | 1rem |
| Hjälptext | Plus Jakarta Sans | 400 | 0.78–0.85rem |
| Chip / label | Plus Jakarta Sans | 600 | 0.8rem |
| Tagline | Plus Jakarta Sans | 500 | 0.95rem, uppercase, letter-spacing 0.06em |

**Varumärke i UI:** Skriv alltid **Min Stjärndag** i intro/welcome — inte enbart "Stjärndag" (undantag: barnlogin-frasen *"din Stjärndag"* som redan finns i copy). <!-- pragma: allowlist secret -->

## 9.4 Spacing scale

| Token | värde | Användning |
|-------|-------|------------|
| `space-xs` | 4px | Tät inline |
| `space-sm` | 8px | Mellan chip/ikon |
| `space-md` | 12px | Kort gap, divider |
| `space-lg` | 16px | Sektionspadding |
| `space-xl` | 20–24px | Mellan block |
| `space-2xl` | 32px | Logo → rubrik |
| `space-3xl` | 40–48px | Hero → CTA-stack |
| `container-padding-x` | 16px | Sidomarginal mobil |
| `container-max-width` | 400px | Entry-kolumn (matchar `login.html`) |

## 9.5 Corner radius & elevation

| Element | Radius | Shadow |
|---------|--------|--------|
| Primär knapp | 14–16px | `0 4px 16px rgba(245,166,35,0.35)` |
| Sekundär knapp | 12px | none |
| Rollkort | 22px | none (glass) |
| Profilkort (barn) | 16–20px | `0 4px 20px rgba(0,0,0,0.25)` |
| Input | 12–14px | none |
| Logo mascot | 16px | `0 4px 20px rgba(0,0,0,0.3)` |
| Bottom sheet | 20px top corners | `0 -8px 32px rgba(0,0,0,0.2)` |
| Modal | 20px | `0 20px 60px rgba(0,0,0,0.35)` |

## 9.6 Ikoner & illustrationer

- **Logo:** befintlig stjärnmascot (`login-magic-logo .logo-mascot`, 56×56)
- **Rollkort:** befintliga genererade illustrationer (barn / familj) — behåll
- **Highlights (skärm 1):** emoji eller enkla line-icons — max 3, samma storlek
- **Profilavatar:** emoji → `avatar_url` → ⭐-placeholder (befintlig kedja i child-login)
- **Stil:** Varm, rund, inte corporate — inga hårda kantiga systemikoner i barnflödet

## 9.7 Komponent-state-färger

| State | Border | Background | Text |
|-------|--------|------------|------|
| Default | `entry-border-subtle` | glass | primary |
| Hover/pressed | `entry-border-active` | glass-hover | primary |
| Focus | vit/ljus border 2px | — | — |
| Disabled | 40% opacity | — | muted |
| Error | `entry-error` | `rgba(239,68,68,0.12)` | `entry-error` |
| Loading | — | 70% opacity + spinner | — |

---

# 10. Komponentbibliotek (entry)

## 10.1 Primary button (`PrimaryButton` / `.primary-btn-entry`)

| Egenskap | Värde |
|----------|-------|
| **Anatomy** | Full-width container · label centrerad · optional spinner |
| **Min höjd** | 52px (44px touch + padding) |
| **Padding** | 15px 20px |
| **Radius** | 14–16px |
| **BG** | `entry-cta-gold` gradient eller solid |
| **Text** | `#1B2340` eller mörk navy — kontrast AA |
| **States** | default · `:active` scale 0.98 · disabled 50% · loading spinner |
| **Touch** | min 44×44 pt |
| **Används på** | Skärm 1 Kom igång · Skärm 3 Logga in · Skärm 5 Skapa konto |

## 10.2 Secondary / tertiary button

| Variant | Stil | Används på |
|---------|------|------------|
| **Secondary** (`.ghost-btn`) | Transparent · 2px vit border 30% · vit text | Jag har redan konto |
| **Tertiary** (`.text-link`) | Underline eller plain text · muted | Så fungerar appen · Tillbaka |

## 10.3 Role card (`RoleCard` / `.role-card`)

| Egenskap | Värde |
|----------|-------|
| **Anatomy** | Illustration 58×58 · `.card-label` · `.card-sub` |
| **Layout** | Grid 1×2 mobil · min-height 130px · padding 22×16 |
| **Kid variant** | `.kid-card` — lila tint |
| **Adult variant** | `.parent-card` — gul tint |
| **States** | hover translateY(-4px) · active scale 0.98 |
| **Används på** | Skärm 2 · ev. Skärm 4A (alternativ-layout) |

## 10.4 Feature chip (`HighlightChip`)

| Egenskap | Värde |
|----------|-------|
| **Anatomy** | Ikon/emoji + kort label |
| **Layout** | Rad eller wrap · max 3 · gap 8px |
| **Stil** | `rgba(255,255,255,0.12)` bg · radius 999px eller 12px |
| **Används på** | Skärm 1 only |

## 10.5 Text input (`TextInputField`)

| Egenskap | Värde |
|----------|-------|
| **Anatomy** | Label · input · optional error |
| **Höjd** | 52px |
| **Radius** | 12px |
| **Font** | Plus Jakarta Sans 1rem |
| **States** | empty · focus · filled · error · disabled |
| **Används på** | Skärm 3B namn · Skärm 4B e-post (subvy) |

## 10.6 PIN input (`PinInputField`)

| Egenskap | Värde |
|----------|-------|
| **Variant A (MVP)** | Maskat fält · numeriskt keyboard |
| **Variant B (mål)** | 4 separata prickar/celler — befintlig keypad i `child-login.js` |
| **Maskering** | ● ● ● ● |
| **Används på** | Skärm 3A efter profilval · Skärm 3B |

## 10.7 Child profile card

| Egenskap | Värde |
|----------|-------|
| **Anatomy** | Avatar 64–80px · namn under |
| **Layout** | Grid 2×2 eller 2×N · gap 12–16px |
| **Selected** | Border guld/vit · scale 1.02 |
| **Används på** | Skärm 3A (`paintChildListCards`) |

## 10.8 Inline error (`ErrorText` / `.magic-error-box`)

| Egenskap | Värde |
|----------|-------|
| **Placering** | Direkt under fält eller ovanför CTA |
| **Färg** | `entry-error` |
| **Ton** | Lugn, hjälpsam — aldrig skällande |
| **Används på** | Alla formulär + auth-fel |

## 10.9 Bottom sheet — "Så fungerar appen" (`HowItWorksSheet`)

| Egenskap | Värde |
|----------|-------|
| **Anatomy** | Drag handle · 3 kort · stäng-knapp |
| **Höjd** | max 70vh · scroll inuti |
| **Bakgrund** | Vit eller mörk glass — kontrast mot gradient |
| **Används på** | Skärm 1 |

## 10.10 Hero block (`EntryHeroBlock`)

| Egenskap | Värde |
|----------|-------|
| **Anatomy** | Logo · H1 · brödtext · chips |
| **Vertikal ordning** | Logo → rubrik → brödtext → chips → (CTA i footer) |
| **Används på** | Skärm 1 · delvis Skärm 5 |

## 10.11 Auth buttons

| Komponent | Klass | Plattform |
|-----------|-------|-----------|
| Apple | `.apple-btn-magic` | iOS (+ ev. web Safari) |
| Google | `.apple-btn-magic` variant | Android |
| E-post | `.ghost-btn` eller `.primary-btn-entry` | Alla |

**Används på:** Skärm 4B only (v2.1-regel).

---

# 11. Layout, responsivitet & native-beteende

## 11.1 Viewport-regler

| Regel | Värde |
|-------|-------|
| Min viewport | 320×568 (iPhone SE) |
| Max content width | 400px centrerat |
| Orientation | Portrait-first — landscape ska fungera men behöver inte optimeras v1 |
| Min height | `100vh` / `100dvh` med safe areas |

## 11.2 Safe areas

- Använd befintliga klasser: `.safe-area-top` · `.safe-area-bottom` · `.safe-area-left` · `.safe-area-right`
- Alla entry-skärmar: `body` med safe-area-klasser (som `login.html`)
- CTA-stack: minst `env(safe-area-inset-bottom)` + 16px padding
- Native: `platform-theme.js` sätter `maximum-scale=1, user-scalable=no`

## 11.3 Scroll vs fixed CTA

| Skärm | Scroll | CTA |
|-------|--------|-----|
| Skärm 1 | Hela skärmen scroll vid behov | CTA i nedre del — sticky om innehåll > viewport |
| Skärm 2 | Sällan scroll | Kort centrerade |
| Skärm 3 (profil) | Grid scroll om många barn | PIN + Logga in fixed längst ned |
| Skärm 4B | Scroll OK | Auth-knappar stack |
| Skärm 5 | Scroll OK | Primär CTA synlig utan scroll på standardmobil |

**Regel:** Primär CTA ska vara synlig utan scroll på iPhone 14-storlek för skärm 1 (test).

## 11.4 Små skärmar

- Rollkort: behåll 2-kolumns grid tills <340px → överväg 1 kolumn
- Profilgrid: 2 kolumner · vid 1 barn — stor central card eller auto-select PIN
- Rubrik: min 1.35rem på små skärmar
- Highlights: wrap till 2+1 eller vertikal stack

## 11.5 Tangentbord

| Yta | Beteende |
|-----|----------|
| Barn namn (3B) | `scrollIntoView` på focus · CTA ovanför keyboard |
| PIN (3A/3B) | Egen keypad föredras (befintlig) — undvik OS-keyboard om möjligt |
| E-post login | Native keyboard · scroll form into view |
| iOS | `visualViewport` resize — padding-bottom på footer |

## 11.6 Portrait-first

- Illustrationer och kort optimerade för portrait
- iPad: samma max-width 400px centrerat — inte full bleed formulär

---

# 12. Implementation mapping

## 12.1 Delta-tabell: spec → kod

| Del i spec | Nuvarande kod | Åtgärd |
|------------|---------------|--------|
| Skärm 1 Welcome | Saknas — native → `/login` | Ny entry-view i `login.html` eller `app-welcome.html` |
| Skärm 2 Rollval | `login.html` `#role-selection` | Behåll kort · **ta bort** `#role-quick-login` från samma vy |
| Skärm 3 Hybrid | `child-login.html` + `child-login.js` | Återanvänd · lägg till "Jag hittar inte mig själv" · entry analytics |
| Skärm 4A Vuxenstart | Saknas | Ny state/view |
| Skärm 4B Vuxenlogin | `#parent-login-section` + `#role-quick-login` | Flytta auth hit · villkorlig render |
| Skärm 5 Signup intro | Delvis `/register` | Ny intro-state före register/auth |
| Back-stack | Delvis (`clBackToProfiles`) | Inför `sessionStorage.entry_path` |
| Session redirect | `login.html` DOMContentLoaded | **Behåll** |
| Signup → onboarding | `onboarding.js` (6 steg) | **Återanvänd** — ingen parallell wizard |
| Native redirect | `platform-theme.js` L53–65 | Ändra target till welcome |
| Entry analytics | Saknas (whitelist i `analytics.js`) | Ny `app-entry-analytics.js` + utöka `ALLOWED_CLIENT_EVENTS` |

## 12.2 Filer att återanvända

| Fil | Roll |
|-----|------|
| `public/login.html` | Host för entry states 1, 2, 4A, 4B, 5 |
| `public/js/login-magic.js` | Stars/clouds · refaktorera till entry state machine |
| `public/css/login-magic.css` | Tokens, kort, knappar |
| `public/child-login.html` | Skärm 3 (separat route eller embed) |
| `public/js/child-login.js` | Hybrid login logik |
| `public/css/child-login-magic.css` | Barnlogin-stil |
| `public/js/auth.js` | Session, known children, redirect |
| `public/js/platform-theme.js` | Native detect, redirect |
| `public/js/apple-sign-in-diagnostics.js` | Apple auth |
| `public/js/google-auth-ui.js` | Google auth (Android) |
| `public/js/onboarding.js` | Post-signup — **orör** |
| `public/index.html` | Webb marknadsförstavy |

## 12.3 Nya filer / states

| Nyhet | Förslag |
|-------|---------|
| Entry state machine | `public/js/app-entry.js` |
| Entry analytics | `public/js/app-entry-analytics.js` |
| How-it-works modal | `public/js/app-entry-how-it-works.js` (liten) |
| CSS delta | Utöka `login-magic.css` eller `app-entry.css` |

## 12.4 State machine (entry_path)

```javascript
// sessionStorage keys (förslag)
entry_path: 'welcome_existing' | 'welcome_get_started' | 'role_adult' | 'role_child'
entry_back_stack: JSON array of screen IDs
entry_version: 'v2_1'
```

**Navigation helper:**

```text
navigateTo(screenId) → push current to back stack → show screen
goBack() → pop back stack → show previous
```

## 12.5 Routing (implementation)

| Action | Route / state |
|--------|---------------|
| Skärm 1–5 (vuxen entry) | `/login` med internal states (rekommenderat) |
| Skärm 3 (barn) | `/child-login` (befintlig) · `entry_path=role_child` query eller session |
| Efter vuxen auth | `Auth.redirectToDashboard()` (befintlig) |
| Efter barn auth | `/child/today` (befintlig) |

## 12.6 Får inte brytas i v2.1.1 🔒

| Constraint | Var | Varför |
|------------|-----|--------|
| Auth/session-hantering | `auth.js` | JWT, refresh, CSRF |
| `?next=addChild` / `cl_add_child_pending` | `login.html`, `login-magic.js`, `child-login.js` | Add-child-flöde |
| Befintlig onboarding efter signup | `onboarding.js` | 6-stegs wizard — inte duplicera |
| `stjarndag_known_children` | `auth.js`, `child-login.js` | Hybrid skärm 3 |
| `maybeAutoSelectOnlyChild()` | `child-login.js` | 1-barn UX |
| Apple Sign In iPad main-thread | iOS native patch | App Review |
| Webb `index.html` som förstavy | `platform-theme.js` | SEO + konvertering |
| `DeviceMode` / `SessionGate` | `auth.js`, child flows | Barn/vuxen-separation |
| Parental gate / PIN overlay | `login-magic.js`, `parental-gate.js` | Barnsession → vuxen |

---

# 13. Tracking — implementation

## 13.1 Arkitektur

| Lager | Ansvar |
|-------|--------|
| **Client** | `app-entry-analytics.js` — `trackEntry(event, props)` |
| **Transport** | `POST /api/analytics/event` (befintlig) |
| **Server** | `src/routes/analytics.js` — whitelist + `db/analytics.track()` |
| **Consent** | Respektera cookie/consent där GA4 gäller; produkt-events till `analytics_events` är separat |

**Viktigt:** Alla entry-events måste läggas till i `ALLOWED_CLIENT_EVENTS` i `src/routes/analytics.js`.

## 13.2 Client API (förslag)

```javascript
// public/js/app-entry-analytics.js
window.EntryAnalytics = {
  track: function (eventName, props) {
    props = props || {};
    props.entry_version = 'v2_1';
    props.platform = detectPlatform(); // ios | android | web | pwa
    props.entry_path = sessionStorage.getItem('entry_path') || null;
    // session_id for unauthenticated (reuse existing nonce pattern)
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        event_type: eventName,
        metadata: props,
        session_id: getOrCreateSessionNonce(),
      }),
    }).catch(function () {});
  },
};
```

**Fallback:** Om `fetch` misslyckas — tyst (samma som `child-shell.js`). Inga blockers för UX.

## 13.3 Event trigger map

| Event | Triggas när | Fil / funktion |
|-------|-------------|----------------|
| `app_opened` | Entry init, cold start | `app-entry.js` init |
| `entry_welcome_viewed` | Skärm 1 render | `showScreen('ENTRY_WELCOME')` |
| `entry_cta_started` | Klick Kom igång | welcome CTA handler |
| `entry_existing_account_tapped` | Klick Jag har redan konto | welcome CTA handler |
| `entry_how_it_works_opened` | Öppna modal | how-it-works handler |
| `role_selection_viewed` | Skärm 2 render | `showScreen('ENTRY_ROLE_PICK')` |
| `role_child_selected` | Klick Jag är barn | role card handler |
| `role_adult_selected` | Klick Jag är vuxen | role card handler |
| `child_login_mode_viewed` | Skärm 3 / child-login init | `child-login.js` init · props: `mode`, `profiles_count` |
| `child_profile_selected` | Profilval | `selectChild()` |
| `child_profile_not_found_clicked` | Jag hittar inte mig själv | ny handler |
| `child_login_submitted` | Logga in | PIN submit |
| `child_login_success` | Auth OK | auth success callback |
| `child_login_failed` | Auth fail | props: `reason` |
| `adult_start_viewed` | Skärm 4A render | `showScreen('ENTRY_ADULT_START')` |
| `adult_existing_selected` | 4A → redan konto | handler |
| `adult_new_selected` | 4A → ny här | handler |
| `adult_login_viewed` | Skärm 4B render | `showScreen('ENTRY_ADULT_LOGIN')` |
| `adult_login_method_selected` | Apple/Google/email | auth button handler |
| `adult_login_success` | Auth OK | auth callback |
| `adult_login_failed` | Auth fail | props: `method`, `reason` |
| `adult_signup_intro_viewed` | Skärm 5 render | handler |
| `signup_started` | Skapa konto kostnadsfritt | handler |
| `signup_completed` | Konto klart | auth/register callback |

## 13.4 Required vs optional properties

| Property | Required på | Värden |
|----------|-------------|--------|
| `entry_version` | Alla entry events | `v2_1` |
| `platform` | Alla | `ios` \| `android` \| `web` \| `pwa` |
| `entry_path` | Alla entry navigation | se §12.4 |
| `mode` | `child_login_mode_viewed` | `profile_picker` \| `name_pin` |
| `profiles_count` | `child_login_mode_viewed` | number |
| `method` | adult auth events | `apple` \| `google` \| `email` |
| `reason` | failed events | se §7.4–7.5 |

## 13.5 Serverändring (krav)

Lägg till i `ALLOWED_CLIENT_EVENTS`:

```text
app_opened, entry_welcome_viewed, entry_cta_started, entry_existing_account_tapped,
entry_how_it_works_opened, role_selection_viewed, role_child_selected, role_adult_selected,
child_login_mode_viewed, child_profile_selected, child_profile_not_found_clicked,
child_login_submitted, child_login_success, child_login_failed,
adult_start_viewed, adult_existing_selected, adult_new_selected,
adult_login_viewed, adult_login_method_selected, adult_login_success, adult_login_failed,
adult_signup_intro_viewed, signup_started, signup_completed
```

## 13.6 Versioning & rollout

- `entry_version: v2_1` på alla events — möjliggör före/efter-jämförelse
- Behåll befintliga `funnel_*` events i onboarding — entry events är **komplement**
- Dashboard: bygg funnel A/B/C från §8.4

---

# 14. Leveransplan / Jira-uppdelning

## 14.1 Epic

**Epic: Min Stjärndag — App Entry v2.1.1** <!-- pragma: allowlist secret -->

Mål: Ny welcome-first entry för native/PWA utan att bryta auth, child-login cache eller onboarding.

## 14.2 Stories

### Story 1 — Welcome screen (Skärm 1)

**Scope:** Ny `ENTRY_WELCOME` · logo **Min Stjärndag** · highlights · CTA · "Så fungerar appen"-modal <!-- pragma: allowlist secret -->

**Acceptance:** AC-W1–W5 (§15)

**Filer:** `login.html`, `app-entry.js`, `login-magic.css`, `app-entry-analytics.js`

**Beror på:** —

---

### Story 2 — Roll selection (Skärm 2)

**Scope:** Separera rollval · dölj `#role-quick-login` på welcome/roll-vy

**Acceptance:** AC-R1–R4

**Filer:** `login.html`, `login-magic.js` → `app-entry.js`

**Beror på:** Story 1

---

### Story 3 — Adult start + login split (4A + 4B)

**Scope:** Ny 4A · flytta Apple/Google/e-post till 4B · `entry_path` back-stack

**Acceptance:** AC-AS1, AC-AL1–AL2, back-regler §7.1

**Filer:** `login.html`, `app-entry.js`, befintlig auth UI

**Beror på:** Story 1–2

---

### Story 4 — Child login integration (Skärm 3 hybrid)

**Scope:** Entry → `/child-login` · "Jag hittar inte mig själv" · hybrid analytics

**Acceptance:** AC-CL1–CL3

**Filer:** `child-login.html`, `child-login.js`, `app-entry.js`

**Beror på:** Story 2

---

### Story 5 — Signup intro (Skärm 5)

**Scope:** Kort intro före `/register` · dynamisk grundarprogram-copy

**Acceptance:** AC-SI1

**Filer:** `login.html` eller `/register`, `app-entry.js`

**Beror på:** Story 3

---

### Story 6 — Native redirect

**Scope:** `platform-theme.js` — `/` → welcome state, inte direkt mixed login

**Acceptance:** Native öppnar Skärm 1

**Filer:** `platform-theme.js`

**Beror på:** Story 1

---

### Story 7 — Analytics whitelist + client

**Scope:** `app-entry-analytics.js` · utöka `analytics.js` whitelist · alla §13.3 events

**Acceptance:** Events syns i `analytics_events` med `entry_version`

**Filer:** `app-entry-analytics.js`, `src/routes/analytics.js`

**Beror på:** Story 1 (kan parallellas)

---

### Story 8 — Web/PWA behavior

**Scope:** Webb behåller `index.html` · PWA standalone = v2.1 · `/login` 4B-logik

**Acceptance:** §15.4 plattform

**Filer:** `platform-theme.js`, `index.html`

**Beror på:** Story 1, 6

---

## 14.3 Beroenden (graf)

```text
Story 1 (Welcome)
  ├─→ Story 2 (Roll)
  │     └─→ Story 4 (Child)
  ├─→ Story 3 (Adult 4A/4B)
  │     └─→ Story 5 (Signup intro)
  ├─→ Story 6 (Native redirect)
  └─→ Story 7 (Analytics) [parallell]

Story 8 (Web/PWA) ← Story 1 + 6
```

## 14.4 Sprint-slicing (förslag)

| Sprint | Stories | Leverans |
|--------|---------|----------|
| **S1** | 1, 2, 6, 7 (grund) | Welcome + roll + native redirect + events grund |
| **S2** | 3, 4 | Vuxen 4A/4B + child hybrid |
| **S3** | 5, 8 | Signup intro + web/PWA + analytics komplett |
| **S4** | Polish | How-it-works modal · a11y · QA edge cases · SW bump |

---

# 15. QA & acceptanskriterier

## 15.1 Skärm för skärm

### Welcome (Skärm 1)

- **G/W1** Given ej autentiserad native cold start → When app öppnas → Then Skärm 1 visas
- **G/W2** Given Skärm 1 → Then ingen Apple/e-post/registrering syns
- **G/W3** Given Skärm 1 → When "Kom igång" → Then Skärm 2
- **G/W4** Given Skärm 1 → When "Jag har redan konto" → Then Skärm 4B direkt (1 tryck)
- **G/W5** Given Skärm 1 → Then ordmärke **Min Stjärndag** och value prop syns <!-- pragma: allowlist secret -->

### Rollval (Skärm 2)

- **G/R1** Given Skärm 2 → Then exakt två rollkort, inga auth-knappar
- **G/R2** When "Jag är barn" → Then `/child-login` (hybrid)
- **G/R3** When "Jag är vuxen" → Then Skärm 4A
- **G/R4** When Tillbaka → Then Skärm 1

### Hybrid child login (Skärm 3)

- **G/C1** Given ≥1 känd profil på enheten → Then profilväljare visas först
- **G/C2** Given 0 profiler → Then namn + PIN (variant B)
- **G/C3** Given profilväljare → When "Jag hittar inte mig själv" → Then variant B
- **G/C4** Given barnflöde → Then Apple/Google/e-post syns aldrig
- **G/C5** Given fel PIN → Then namn/profil behålls · PIN rensas · felcopy §4.3.5
- **G/C6** Given 1 barn → Then auto-select till PIN (befintligt beteende)

### Vuxenstart (Skärm 4A)

- **G/A1** Given Skärm 4A → Then inga loginmetoder — bara "redan konto" vs "ny här"
- **G/A2** When "Jag har redan konto" → Then 4B
- **G/A3** When "Jag är ny här" → Then Skärm 5

### Vuxenlogin (Skärm 4B)

- **G/L1** Given Skärm 4B → Then plattformsanpassade auth-metoder
- **G/L2** Given entry via Skärm 1 "Jag har redan konto" → When Tillbaka → Then Skärm 1
- **G/L3** Given entry via 4A → When Tillbaka → Then Skärm 4A
- **G/L4** When Apple avbruten → Then diskret meddelande, stanna på 4B

### Signup intro (Skärm 5)

- **G/S1** When "Skapa konto kostnadsfritt" → Then signup-flöde → onboarding (befintlig)

## 15.2 Edge cases

| Scenario | Förväntat |
|----------|-----------|
| Redan inloggad vuxen | Hoppa entry → dashboard |
| Redan inloggat barn | Hoppa entry → `/child/today` |
| `?next=addChild` | Hoppa welcome · vuxenlogin · banner |
| Vuxen logout → barn login | Profiler kvar i localStorage |
| Ny enhet, inga profiler | Namn + PIN fallback |
| Nätverksfel vid auth | Retry-meddelande · ingen full reset |
| Registration stängd | Dölj/gråa signup CTA dynamiskt |

## 15.3 Regressionschecklista

- [ ] Apple Sign In iOS + iPad
- [ ] Google Sign In Android
- [ ] E-post login/register
- [ ] Add-child från child-login
- [ ] Parental gate (barnsession → vuxen)
- [ ] PWA standalone entry
- [ ] Webb `index.html` opåverkad som landning
- [ ] Onboarding 6 steg efter signup
- [ ] SW cache bump (`public/sw.js`)
- [ ] Touch targets ≥44px på alla entry-knappar

## 15.4 Plattformsspecifik acceptance

| Plattform | Kriterium |
|-----------|-----------|
| **iOS native** | Skärm 1 vid cold start · Apple på 4B · safe areas |
| **Android native** | Skärm 1 vid cold start · Google på 4B |
| **PWA standalone** | Samma som native |
| **Webb (browser)** | `index.html` först · `/login` har vuxenlogin (4B-logik) |

---

# Bilaga A — Flödesdiagram (routing)

```text
APP OPEN
├─ authenticated adult  → ADULT_HOME
├─ authenticated child  → CHILD_HOME
├─ deep_link addChild     → ENTRY_ADULT_LOGIN (skip welcome)
└─ else                   → ENTRY_WELCOME

ENTRY_WELCOME
├─ Kom igång → ENTRY_ROLE_PICK
│   ├─ Barn  → /child-login (hybrid)
│   └─ Vuxen → ENTRY_ADULT_START → 4B or 5
└─ Jag har redan konto → ENTRY_ADULT_LOGIN
```

---

# Bilaga B — Kodinformerad bedömning (v2.1.1)

Kort sammanfattning — full analys fanns i v2.1.0:

- **Hybrid skärm 3 låst** — matchar `child-login.js` (~90 % återanvändning)
- **Min Stjärndag** som varumärke på welcome — inte bara "Stjärndag" <!-- pragma: allowlist secret -->
- **Entry analytics** kräver whitelist-uppdatering i `src/routes/analytics.js`
- **Onboarding** — 6 steg i `onboarding.js`, duplicera inte i entry
- **P0:** Skärm 1 + dölj quick-login + 1-tryck till 4B

---

# Bilaga C — v2.0 → v2.1 ändringar

| v2.0 | v2.1 / v2.2 |
|------|-------------|
| "Kom igång gratis" | "Kom igång" |
| "Jag har redan konto" → rollval | → direkt 4B |
| Ren namn+PIN barnlogin | Hybrid låst |
| Copy utan highlights | 3 feature chips på Skärm 1 |
| Ingen §9–15 | Design tokens · komponenter · Jira · QA |

---

# Bilaga D — Lokaliseringsnycklar (senare)

Entry-copy bör eventually flyttas till `i18n.js`. Prefix-förslag: `entry.welcome.title`, `entry.role.child`, etc. **Ej blockerande för v2.1.1** — hårdkodad svensk copy OK i första iteration.
