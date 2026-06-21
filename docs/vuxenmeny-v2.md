# Vuxenmeny v2 — informationsarkitektur & inkrementell migration

> **Syfte:** Teamreferens för design, frontend och test. Styr var föräldrfunktioner *bor* i navigationen — inte bara var routes *finns*.
>
> **Status:** Låst arkitektur · implementation pågår inkrementellt  
> **Relaterat:** [`for-dig-spec.md`](./for-dig-spec.md) · [`paket-v1.2-spec.md`](./paket-v1.2-spec.md) §6 · [`informationsarkitektur-barnapp.md`](./informationsarkitektur-barnapp.md) · [`component-feature-map.js`](../config/component-feature-map.js)
>
> **Senast uppdaterad:** 2026-06-21 (granskningsrunda: kodbasavstämning)

---

## 0. Non-goals (låst)

> **V2 bygger inte om produktlogiken. Den flyttar ägarskap och presentation. Befintliga features, routes och dataflöden återanvänds där möjligt.**

Detta innebär konkret:

| Gör | Gör inte |
|-----|----------|
| Nya hub-sidor som länkar till befintliga routes | Flytta eller omskriva `/schedule`, `/library`, `/reports` |
| Ny barnprofil-sida som samlar befintlig UI | Duplicera affärslogik i nya filer |
| Redirects från gamla entry points | Ta bort gamla routes innan analytics visar adoption |
| `nav-config.js` som presentationslager | Ny backend för befintliga flows |

Om någon föreslår "vi flyttar hela schedule-modulen till planning" — det är **utanför scope** för v2.

---

## 1. Produktprincip (en rad som styr allt)

| Fråga | Svar i v2 |
|-------|-----------|
| Vad navigerar föräldern efter? | **Föräldrajobb** (*Parent Intent*) — inte features eller paket |
| Vad gör ett paket? | **Utökar innehåll** i en befintlig domän |
| Vad gör en feature? | **Läggs till** på rätt `placement` — skapar inte menyitem |

**Designregel:** Flikar = förälderns jobb. Paket = kapabiliteter.

Fel: `feature → skapa menyitem`  
Rätt: `feature → lägg till innehåll i rätt domän`

Fel: *"Var ska den nya TEACCH-sidan ligga?"*  
Rätt: *"Vilket parent intent hjälper den?"* → Planering.

Om en ny funktion kräver ny bottenflik har den troligen fel hemvist.

**Terminologi:** *Föräldrajobb* internt · *Parent Intent* i produktteam och vid feature-review.

---

## 2. Primärnav (basic, idag)

Fem flikar. Ingen **Mer**. Ingen **Extra**. Inställningar i avatar — inte i bottennav.

| # | Flik | Route (hub) | Förälderns jobb |
|---|------|-------------|-----------------|
| 1 | 🏠 **Hem** | `/dashboard` | *Här är läget* — status, nästa steg, daglig överblick |
| 2 | 📅 **Planering** | `/planning` | *Jag vill planera* — schema, kalender, aktiviteter, bibliotek |
| 3 | 🎁 **Belöningar** | `/rewards` | *Stjärnor och belöningar* — kista, museum, historik |
| 4 | ✨ **För dig** | `/for-dig` | *Här är vad jag rekommenderar* — mål, tips, nästa bästa steg |
| 5 | 👨‍👩‍👧 **Familj** | `/family` | *Vilka är med?* — barn, vuxna, pedagoger |

### Hem vs För dig (produktprincip, inte bara routes)

| | Hem | För dig |
|--|-----|---------|
| Roll | *Här är läget* | *Här är vad jag rekommenderar* |
| Ton | Status, varningar, överblick | Guidning, mål, handlingar |
| Exempel | Astrid ⭐⭐⭐☆☆ · PIN saknas | Testa kvällsrutin → [Skapa schema] |
| Data | Samma readiness-/intelligenslager | Samma lager, mer coachande presentation |

`/for-dig` ska **inte** degenerera till en glömd tips-sida. Den är appens **coach-lager** och ingår i basic (`for_dig` → `basic_app` i `component-feature-map.js`).

### Desktop-sidebar

Samma fem som primärnav. Inställningar under avdelare — konkurrerar inte med kärnflöden.

```
Hem
Planering
Belöningar
För dig
Familj
────────
Inställningar
```

Framtida paketinnehåll syns i **hubbar** och **barnprofil** — inte som nya toppnivålänkar (se §5).

**Ikonkonvention:** 🎁 = Belöningar-fliken i nav. ⭐ = stjärnsaldo i innehåll (Hem-kort, barnprofil) — **inte** nav-ikon.

### Notis-inkorg (header, ej flik)

`/notifications` (kopplad till `notification_log`) har **ingen** bottenflik. Entré:

| Placering | `placement` | Implementation idag |
|-----------|-------------|---------------------|
| Header-klocka på alla förälderytor | `header_notifications` | `dashboard-home-hub.js` → `/notifications` |

Kräv synlig 🔔 på **desktop, mobil webb och native** — samma mönster som avatar-menyn (§4).

---

## 3. Domänmodell

Fyra begrepp styr synlighet och placering:

| Begrepp | Betydelse | Exempel |
|---------|-----------|---------|
| **`feature`** | Paket-/feature-slug som styr **åtkomst** | `reporting`, `pedagog`, `teacch`, `for_dig` |
| **`domain`** | Parent intent — *vilket jobb hjälper funktionen?* (**obligatoriskt**) | `child_progress`, `planning`, `rewards`, `family` |
| **`placement`** | Var i UI innehållet **kan** renderas | `planning_hub`, `child_profile`, `home_card` |
| **`visibility`** | Om innehållet **ska** visas just nu på en placement | Per placement, oberoende av köp |

**Viktigt:** Navigationen *äger inte* funktionen. Samma feature kan ha flera placements.

### Obligatoriska fält i `CAPABILITIES`

Varje capability **måste** ha alla fyra — inga undantag:

```js
{
  id: 'reports',           // required — stabil nyckel
  feature: 'reporting',    // required — access gate (null = basic, alltid tillgänglig)
  domain: 'child_progress', // required — parent intent
  placements: ['child_profile', 'rewards_hub', 'home_card'], // required — minst en
  label: 'Rapporter',
  href: '/reports',
}
```

**Förbjudet** (återinför gamla problemet):

```js
{ label: 'Ny grej', href: '/new-feature' }  // ❌ saknar id, feature, domain, placements
```

Code review / lint: avvisa capabilities utan `domain`.

### Access vs visibility (separata lager)

| Lager | Fråga | Källa |
|-------|-------|-------|
| **Access** | Har familjen rätt att använda funktionen? | `/api/subscription/access` → `components`, `features` |
| **Visibility** | Ska vi visa den på denna placement nu? | `nav-config` + ev. rollout / aktiveringsstatus |

Exempel: TEACCH kan vara **köpt** (`access.teacch: true`) men **inte aktiverat** av föräldern → dölj i `planning_hub` tills aktivering.

```js
function shouldShow(capability, access, visibility) {
  if (!hasFeatureAccess(access, capability.feature)) return false;
  return capability.placements.every((p) => visibility[p] !== false);
}
```

Detta förhindrar att feature-flaggning och UI-beslut blandas i samma boolean.

### Domäner (låsta)

| Domän | Beskrivning |
|-------|-------------|
| `home` | Daglig överblick, readiness, snabbstatus |
| `for_you` | Coach, rekommendationer, mål, personliga tips |
| `planning` | Schema, kalender, aktiviteter, bibliotek |
| `rewards` | Stjärnor, belöningar, kista, museum |
| `child_progress` | **Framsteg** — stjärnor över tid, historik, rapporter, mål |
| `family` | Barn, vuxna, pedagoger, inbjudan |
| `child_profile` | En barns hela värld (per barn) |
| `settings` | Konto, säkerhet, notiser, app, data, **prenumeration** |
| `billing` | Paket, trial, köp, betalningsstatus |
| `pedagog_view` | Separat UI-universum (ej föräldraflik) |

### Framsteg som gemensam domän

Rapporter är **inte** en belöningssak — det är uppföljning/utveckling.

```
/family/child/astrid
└── Framsteg
    ├── Stjärnor
    ├── Historik
    ├── Rapporter      ← feature: reporting
    └── Mål
```

Belöningar kan **länka** dit utan att äga innehållet:

```
⭐ Belöningar
500 stjärnor totalt
Se Astrids utveckling →
```

---

## 4. Hubbar & undersidor

### `/planning` — Planeringshub

| Ingång | Befintlig route | Feature (basic) |
|--------|-----------------|-----------------|
| Schema | `/schedule` | `basic_app` |
| Kalender | `/calendar` | `basic_app` |
| Aktiviteter | `/activities` eller `/library` (aktiviteter) | `basic_app` |
| Bibliotek | `/library` | `basic_app` |
| Kopiera schema | `/assign-schedule` | `basic_app` |
| Stöd & verktyg | `/barn-stod` | `teacch` (framtida) |

### `/rewards` — Belöningshub

| Ingång | Befintlig route | Feature |
|--------|-----------------|---------|
| Stjärnor | `/rewards#stars` eller inbäddat | `basic_app` |
| Hantera belöningar | `/library` (flik Belöningar) | `basic_app` |
| Familjekista | `/rewards#chest` | `basic_app` |
| Familjemuseum | `/rewards#museum` | `basic_app` |
| Utveckling | länk → barnprofil → Framsteg | `basic_app` (basic-statistik) / `reporting` (rapporter) |

> **⚠️ Hub-regel:** Länka **aldrig** till `/skattkammaren` från hubben. Den URL:en är idag antingen publik demo eller (v2) redirect för inloggad förälder → loop om hubben pekar dit.

**Tomt state (basic):** Raden *Utveckling* pekar på barnprofil → Framsteg → **Stjärnor/Historik** (basic). Länk till `/reports` döljs tills `feature: reporting`. Ingen disabled-rad — dölj eller visa basic-alternativ.

**Redirect (v2, inloggad förälder):** gamla bokmärken `/skattkammaren` → `/rewards`. Publik demo oförändrad: `GET /skattkammaren` utan session eller `?demo=1` (`public-pages.js`).

**Barn:** inloggat barn på `/skattkammaren` redirectas redan till `/child-dashboard#rewards` — påverkas av barnmeny v2 (`/child/world`).

### `/family` — Familjehub (ren)

```
Familj

Barn
──────
🌟 Astrid
👶 Olle

Vuxna
──────
Pontus
Anna

Pedagoger          ← feature: pedagog (dold tills live)
──────
Lisa
```

**Flytta bort från `/family`:** push, PWA-installation, föräldralås, GDPR, dataexport, radera konto → `/settings` eller avatar.

**`/samarbete` (pedagogsamarbete):** idag i Extra/Mer (`native-tab-bar.js` ROLLOUT). v2-placering:

| Placering | `placement` | Route |
|-----------|-------------|-------|
| Familj-hub → Pedagoger (intresse/info) | `family_pedagog_interest` | `/samarbete` |
| För dig (paketcoach) | `for_you_card` | `/samarbete` eller `/pricing-info#pedagog` |

Inte egen flik. Capability med `feature: pedagog` när live; intresse-läge via `rollout_mode` som idag.

### `/family/child/:slug` — Barnprofil (navets viktigaste objekt)

Största UX-lyftet. Ersätter drawer + `/child-settings`.

> **Regel:** Alla barnrelaterade funktioner ska kunna nås via barnprofilen — även om de också finns i andra domäner (hubbar, Hem, För dig).

Samma funktion, olika entréer:

| Funktion | Barnprofil | Annan entré |
|----------|------------|-------------|
| Rapporter | Framsteg → Rapporter | Hem: "Se utveckling →" |
| Schema | Schema | Planering-hub |
| Kvällsrutin | (via rekommendation) | För dig: "Bygg kvällsrutin för Astrid" |
| PIN | PIN-kod | Hem: readiness-kort |

```
🌟 Astrid · 7 år

Idag
⭐⭐⭐☆☆

Översikt
Schema
Belöningar
Framsteg
Barnvy
PIN-kod
```

**Redirect:** `/child-settings?id=…` → `/family/child/:slug`

#### Slug-strategi (låst)

| Regel | Detalj |
|-------|--------|
| **Kanonisk URL** | `/family/child/:slug` där `slug` = normaliserat barnnamn |
| **Normalisering** | Unicode NFC → gemener → å/ä/ö → `a`/`a`/`o` → mellanslag/emoji bort → `[a-z0-9-]` → max 40 tecken |
| **Kollision** | suffix `-2`, `-3`, … eller fallback till kort `child_id` (8 tecken) |
| **Namnbyte** | Slug **ändras inte** automatiskt — stabilitet för bokmärken, push och analytics. Ny slug endast via förälder "Uppdatera länk" i barnprofil (valfritt) eller alltid `child_id` om teamet prioriterar enkelhet |
| **API** | `GET /api/children/:id` returnerar `slug`; `GET /api/children/by-slug/:slug` för uppslag |
| **Analytics** | `page_view` ska logga **både** `slug` och `child_id` i metadata — kontinuitet vid ev. slug-byte |

> **Rekommendation:** använd **stabilt `child_id` i URL** (`/family/child/:id`) om slug-byten blir för komplexa i v1; `slug` som visningsalias i UI. Team väljer en strategi i Sprint 3 — men **blanda inte** id- och slug-URL:er utan explicit redirect-tabell.

#### Deep links & push (`child_id` → kanonisk URL)

Idag: push/deep links kan bära `child_id` (t.ex. `stjarndag://child/{id}`). `deep-link-router.js` känner inte barnprofil-routes ännu.

| Inkommande | v2-mål |
|------------|--------|
| `/child-settings?id=:uuid` | 302 → `/family/child/:canonical` |
| push `metadata.child_id` | resolve via API → `/family/child/:canonical` |
| gammal drawer-deep-link | samma resolve |

**Sprint 3-krav:** uppdatera `deep-link-router.js` `mapDeepPath` + push-handler med id→canonical-resolve — inte bara "vid behov".

### `/settings` — Minimal

```
⚙️ Inställningar

👤 Konto              (profil, e-post)
📦 Prenumeration      (trial, paket, köp — se §4 billing)
🔒 Säkerhet           (PIN-kod — inte "föräldralås" i föräldratext)
🔔 Notiser            (vad som skickas: påminnelser, veckosammanfattning, nyhetsbrev)
📱 App                (push-aktivering, PWA-installation, enhetsbehörigheter)
📦 Data & integritet  (GDPR, export, radering)
```

**Notiser vs App (ägarskap):**

| Sektion | Äger |
|---------|------|
| 🔔 **Notiser** | *Vilka händelser* ska meddelas (preferenser per typ) |
| 📱 **App** | *Hur* enheten tar emot (push-token, PWA, native-behörigheter) |

Undvik dubbel push-UI — en toggle per kanal under Notiser, enhetsaktivering under App.

#### Billing / prenumeration (`billing`-domän)

Var trialande/köpande förälder ser status och kan uppgradera — **ersätter** Extra-fliken (`/upgrade`) i nav.

| Ingång | Route | Syfte |
|--------|-------|-------|
| Min prenumeration | `/settings#prenumeration` | Status: `lifetime_free` · `trial` · `paid` · `grace_period` (från `family_subscriptions` / `subscription_status`) |
| Välj paket | `/upgrade` → redirect `/settings#prenumeration` eller inbäddat | Ersätter dagens Extra-flik |
| Prisinfo | `/pricing-info` | Länk från settings (info, inte nav) |
| Efter köp | `/payment-success` | Redirect till `/settings#prenumeration` |

**Placements (inte flikar):**

| Placering | Innehåll |
|-----------|----------|
| `settings_subscription` | Huvudentré — status + hantera |
| `home_card` | Trial-banner: "X dagar kvar" → settings |
| `for_you_card` | Paketcoach / intresse (kopplat till `rollout_mode`) |
| `avatar_action` | "Prenumeration" när trial < 7 dagar |

Befintliga sidor behålls; v2 **flyttar ägarskap** från Extra/Mer till settings + coach-kort.

### Avatar-meny (sekundärnav)

```
[Pontus ▾]
──────────────
Byt till pedagogvy    ← dual eller educator (se §4.1)
Prenumeration         ← vid trial / grace (billing placement)
Inställningar
Logga ut
```

**Native-krav:** Inställningar och Logga ut finns **inte** i bottennav. Header-avataren **måste** öppna denna meny på **alla** ytor (native tab bar, magic shell, desktop). Smoke-test: native utan sidebar → kan logga ut.

Pedagogvy = byte av **hela UI** (`pedagog-nav.js`), inte sjätte föräldraflik.

### 4.1 Roller — ren pedagog (`account_type = 'educator'`)

| Roll | Default efter login | Ser fem föräldraflikar? |
|------|---------------------|-------------------------|
| `family` | `/dashboard` | Ja |
| `dual` | `/dashboard` (eller senast vald vy) | Ja — avatar → pedagogvy |
| `educator` | **`/pedagog-oversikt`** (`dashboard.js` redirect) | **Nej** — pedagog-nav: Översikt · Idag · Historik · Inställningar |

v2 föräldranav (`PRIMARY_NAV`) gäller **inte** ren pedagog. `nav-config.js` ska exportera separat `PEDAGOG_PRIMARY_NAV` eller pedagogläget läser befintlig `pedagog-nav.js` — **ingen** merge av de två universen.

`switch_pedagog` i avatar: `role: 'dual_or_educator'` — dold för ren `family` utan pedagog-länk.

---

## 5. Paket → placering (framtida, ingen navändring)

| Paket | Feature-slug | Domän | Placements | Synligt som |
|-------|--------------|-------|------------|-------------|
| **Basic** | `for_dig`, m.fl. | diverse | `primary`, hubbar | Fem flikar idag |
| **Billing** | — | `billing` | `settings_subscription`, `home_card`, `avatar_action` | Prenumeration under Inställningar |
| **Reporting** | `reporting` | `child_progress` | `child_profile`, `rewards_hub`, `home_card` | Framsteg → Rapporter |
| **Pedagog** | `pedagog` | `family` | `family` (Pedagoger), `avatar` (vyväxling) | Sektion + pedagog-UI |
| **TEACCH** | `teacch` | `planning` | `planning_hub` | Stöd & verktyg |

**Regel vid lansering:** lägg till rader i `nav-config.js` — refaktorera inte bottennav.

### Pedagogläge (separat universum)

När `pedagog` är live för dual-roll:

- **Inte** ny föräldraflik
- Familj → Pedagoger-sektion
- Avatar → Byt till pedagogvy
- Befintligt pedagog-nav: Översikt · Idag · Historik · Inställningar

---

## 6. Teknisk källa: `nav-config.js`

**Mål:** en källa för all föräldranavigation.

### Nuläge idag — två osynkade källor (måste förenas)

Det finns **två** nav-implementationer med varsin LEGACY + ROLLOUT:

| Källa | LEGACY (default) | ROLLOUT (`rollout_mode !== 'off'`) |
|-------|------------------|-------------------------------------|
| `native-tab-bar.js` | Hem · Schema · För dig · Skatt · **Mer** (5) | + **Extra** (`/upgrade`, `/samarbete`, …) · Mer (6) |
| `parent-magic-shell.js` | Hem · Schema · För dig · **Familj** · Inställn. (5) | Hem · Schema · För dig · Skatt · **Extra** · Mer (6) |

**Problem idag:** LEGACY skiljer redan (Skatt+Mer vs Familj+Inställn.). Fas 1 i v2 måste **förena båda** till samma `PRIMARY_NAV` — inte bara byta namn på en av dem.

`/samarbete`, `/upgrade`, `/notifications` ligger idag under Mer/Extra-paths i `native-tab-bar.js` — v2 flyttar dem till placements (§4).

### Konsumenter (ska läsa samma config)

| Fil | Idag | v2 |
|-----|------|-----|
| `public/js/native-tab-bar.js` | `LEGACY_TABS` / `ROLLOUT_TABS` | `nav-config` → `primary` |
| `public/js/parent-magic-shell.js` | `LEGACY_NAV` / `ROLLOUT_NAV` | `nav-config` → `primary` |
| `public/js/mobile-nav.js` | Parsar sidebar DOM | Sidebar genererad från config |
| Sidebar i `*.html` | Duplicerad per sida | Config eller delad partial |
| Hub-sidor | — | `planning_hub`, `rewards_hub` placements |
| `public/js/session-gate.js` | `PARENT_ONLY_PATHS` | Lägg till `/planning`, `/rewards`, `/family/child/*` |

### Config-struktur (koncept)

```js
// public/js/nav-config.js

/** Primärnav: INTE feature-gatat. Fail-closed på access får inte ta bort kärnflikar. */
export const PRIMARY_NAV = [
  {
    id: 'home',
    href: '/dashboard',
    label: 'Hem',
    icon: '🏠',
    paths: ['/dashboard', '/daily-log', '/'],
  },
  {
    id: 'planning',
    href: '/planning',
    label: 'Planering',
    icon: '📅',
    paths: ['/planning', '/schedule', '/calendar', '/activities', '/library', '/assign-schedule', '/barn-stod'],
  },
  {
    id: 'rewards',
    href: '/rewards',
    label: 'Belöningar',
    icon: '🎁',
    paths: ['/rewards', '/library'], // library belöningsflik — inte /skattkammaren
  },
  {
    id: 'for_you',
    href: '/for-dig',
    label: 'För dig',
    icon: '✨',
    paths: ['/for-dig'],
    // feature: null — basic_app, alltid synlig (§1: feature skapar inte menyitem)
  },
  {
    id: 'family',
    href: '/family',
    label: 'Familj',
    icon: '👨‍👩‍👧',
    paths: ['/family', '/family/child'],
  },
];

/** Aktiv flik — samma logik som native-tab-bar.js isActive() */
export function activeNavItem(pathname, nav = PRIMARY_NAV) {
  const p = (pathname || '/').replace(/\/$/, '') || '/';
  return nav.find((tab) =>
    tab.paths.some((tp) => {
      if (p === tp) return true;
      if (tp === '/dashboard' && p.startsWith('/daily')) return true;
      if (tp !== '/' && p.startsWith(tp + '/')) return true;
      return false;
    })
  );
}

export const CAPABILITIES = [
  {
    id: 'subscription',
    label: 'Prenumeration',
    feature: null,
    domain: 'billing',
    href: '/settings#prenumeration',
    placements: ['settings_subscription', 'home_card', 'avatar_action'],
  },
  {
    id: 'reports',
    label: 'Rapporter',
    feature: 'reporting',
    domain: 'child_progress',
    href: '/reports',
    placements: ['child_profile', 'rewards_hub', 'home_card'],
  },
  {
    id: 'samarbete',
    label: 'Pedagogsamarbete',
    feature: 'pedagog',
    domain: 'family',
    href: '/samarbete',
    placements: ['family_pedagog_interest', 'for_you_card'],
  },
  // … pedagog_invite, teacch_tools
];

export const HEADER_ACTIONS = [
  { id: 'notifications', href: '/notifications', icon: '🔔', placement: 'header_notifications' },
];

export const AVATAR_ACTIONS = [
  { id: 'switch_pedagog', label: 'Byt till pedagogvy', feature: 'pedagog', role: 'dual_or_educator' },
  { id: 'subscription',   label: 'Prenumeration', href: '/settings#prenumeration', placement: 'avatar_action' },
  { id: 'settings',       href: '/settings', label: 'Inställningar' },
  { id: 'logout',         action: 'logout', label: 'Logga ut' },
];
```

### Primärnav vs capabilities — feature-gating

| Lager | Feature-gating? | Vid access-fel |
|-------|-----------------|----------------|
| `PRIMARY_NAV` | **Nej** — alla fem alltid | Visa alla flikar; innehåll i hub kan vara tomt |
| `CAPABILITIES` | **Ja** — per `feature` | Dölj placement, inte flik |
| `HEADER_ACTIONS` | Nej (notiser) | Alltid synlig klocka |

**Motivering:** `for_dig` i `component-feature-map.js` mappar till `basic_app`, men dagens `native-tab-bar.js` feature-gatar För dig med fail-closed → flik försvinner vid nätverksfel. v2 korrigerar detta.

### Filtrering (access + visibility)

```js
function visibleAtPlacement(capability, access, visibility, placement) {
  if (!capability.placements.includes(placement)) return false;
  if (!hasFeatureAccess(access, capability.feature)) return false;
  if (visibility[placement] === false) return false;
  return true;
}

function capabilitiesForPlacement(access, visibility, placement) {
  return CAPABILITIES.filter((c) => visibleAtPlacement(c, access, visibility, placement));
}
```

`access` från befintlig `/api/subscription/access`. `visibility` kan börja som `{}` (allt synligt om access finns) och utökas vid behov (t.ex. TEACCH aktivering).

### Tillgänglighet (a11y) — krav på nav-render

Befintlig `mobile-nav.js` har `role="dialog"` / `aria-expanded`. v2 ska föra vidare:

| Krav | Detalj |
|------|--------|
| Aktiv flik | `aria-current="page"` på aktiv primärnav-länk |
| Bottennav | `role="navigation"` + `aria-label="Huvudnavigering"` |
| Avatar-meny | `aria-haspopup="menu"`, fokusfälla, Escape stänger |
| Hubbar | Rubrik = `h1`, kort = fokuserbara länkar med beskrivande text |
| Tangentbord | Tab-ordning: header (notis, avatar) → innehåll → bottennav |

### Filer att **inte** omskriva

| Fil | Strategi |
|-----|----------|
| `public/js/dashboard.js` | Behåll; lägg readiness i ny `home-readiness.js` |
| `public/js/family.js` | Behåll; barnprofil i ny `child-profile.js` |
| `public/js/schedule.js` | Orörd; hub länkar in |
| `src/routes/*` | Orörd; nya sidor är tunna HTML + hub-JS |

---

## 7. Readiness / Home cards (fas 5)

Delat intelligenslager för Hem, För dig och barnprofil.

### Exempel-kort på Hem

```
⚠️ Astrid saknar PIN
[Sätt PIN]                    → /family/child/astrid#pin

⭐ 2 dagar kvar till belöning
[Visa]                        → /rewards

✨ Rekommenderat: Kvällsrutin
[Skapa]                       → /for-dig eller /planning
```

### Data (klient eller ny endpoint)

```js
// Per barn — pseudostruktur
{
  child_id,
  slug,
  stars_today: 3,
  stars_possible: 5,
  pin_set: false,
  schema_ok: true,
  rewards_ok: true,
  next_action: { label: 'Sätt PIN', href: '/family/child/astrid#pin' },
  for_you_tip: { label: 'Kvällsrutin', href: '/for-dig?intent=evening' },
}
```

Aggregering kan ske i `GET /api/family/readiness` (ny) eller via befintliga endpoints på dashboard-init.

---

## 8. Inkrementell migration

**Princip:** Ny mental modell snabbt. Gamla routes lever tills de fasas ut (redirects).

### Fas 0 — Lås arkitekturen (1–2 dagar)

| Leverans | Detalj |
|----------|--------|
| `public/js/nav-config.js` | `PRIMARY_NAV`, `CAPABILITIES`, `AVATAR_ACTIONS`, hub-definitioner |
| Koppla konsumenter | `native-tab-bar`, `parent-magic-shell`, `mobile-nav` läser config |
| **Inte** bygga om UI ännu | Bara en källa — beteende kan vara oförändrat tills fas 1 |

### Fas 1 — Nytt nav (snabb vinst)

**Från (två källor, båda måste uppdateras):**

| Källa | LEGACY idag | ROLLOUT idag |
|-------|-------------|--------------|
| `native-tab-bar.js` | Hem · Schema · För dig · Skatt · Mer | + Extra · Mer |
| `parent-magic-shell.js` | Hem · Schema · För dig · Familj · Inställn. | + Skatt · Extra · Mer |

**Till (en `PRIMARY_NAV` för alla):**

Hem · Planering · Belöningar · För dig · Familj

Gamla routes fungerar: `/schedule`, `/library`, `/upgrade`, `/samarbete`, `/notifications`.

### Fas 2 — Hubbar

| Route | Innehåll | Strategi |
|-------|----------|----------|
| `/planning` | Tunn hub-sida | Länkar till befintliga sidor |
| `/rewards` | Tunn hub-sida | Redirect `/skattkammaren` → `/rewards` |

Ingen affärslogik flyttas.

### Fas 3 — Familj + barnprofil (största UX-lyftet)

| Leverans | Detalj |
|----------|--------|
| `/family/child/:slug` | Ny barnprofil-sida |
| Rensa `/family` | Endast barn, vuxna, pedagoger |
| Redirect | `/child-settings` → barnprofil |
| Drawer | Avvecklas till förmån för barnprofil (behåll fallback tills analytics OK) |

#### Analytics (krav i fas 3)

Stor UX-förändring — mät adoption, inte bara känsla.

**Baseline före (2 veckor eller retrospektivt):**

| Event | Syfte |
|-------|-------|
| `page_view` `/child-settings` | Gammal barninställningsväg |
| `page_view` `/skattkammaren` | Gammal belöningsväg |
| `family_drawer_open` | Drawer-användning |

**Efter lansering:**

| Event | Syfte |
|-------|-------|
| `page_view` `/family/child/:slug` | Barnprofil-adoption |
| `nav_hub_click` `planning` / `rewards` | Hub-användning vs direktlänkar |
| `readiness_action_click` | Hem-kort leder till handling |
| `child_profile_section` `schema` / `framsteg` / `pin` | Vilka sektioner används |

**Beslutskriterium:** drawer och `/child-settings` kan tas bort när barnprofil ≥ 80% av barnrelaterade sessioner i 14 dagar.

Använd befintlig `analytics_events` (`event_type` + `metadata`) — inga nya tabeller krävs för v1-mätning.

### Fas 4 — Settings-sanering

| Flytta från `/family` | Till |
|-----------------------|------|
| PIN, notiser, GDPR, data, radering | `/settings` |
| Prenumeration / köp (idag `/upgrade` Extra-flik) | `/settings#prenumeration` |
| Pedagog-växling | Avatar-meny |

### Fas 5 — Hem som coach

| Leverans | Detalj |
|----------|--------|
| `home-readiness.js` | Kort på Hem |
| Delad data | Hem + För dig + barnprofil |

### Fas 6 — Paket-placements

Lägg till `CAPABILITIES`-rader när paket går live. Ingen nav-refaktor.

### Fas 7 — Städa gammalt

| Route / mönster | Åtgärd |
|-----------------|--------|
| Extra / Mer-flikar | Ta bort från nav-config |
| `/upgrade` (direktnav) | Redirect → `/settings#prenumeration` |
| `/child-settings` | Permanent redirect |
| `/skattkammaren` (inloggad förälder) | Permanent redirect → `/rewards` (publik demo kvar) |
| Preview-shells i huvudnav | Behåll endast som intresse-banner om `rollout_mode !== off` |

---

## 9. Sprint-plan (låst ordning)

Varje sprint ska lämna appen **användbar** — inte halvfärdig nav med gamla sidor under.

### Sprint 1 — Synlig v2
- [ ] `nav-config.js` med `paths` + `activeNavItem()` + obligatoriska capability-fält
- [ ] **Båda** konsumenter förenade: `native-tab-bar` + `parent-magic-shell` + `mobile-nav` + sidebar
- [ ] Fem flikar live: Hem · Planering · Belöningar · För dig · Familj
- [ ] Header 🔔 → `/notifications` på alla ytor
- [ ] `session-gate.js` uppdaterad
- [ ] `public/sw.js` CACHE_NAME-bump

*Leverans:* användaren ser ny mental modell direkt. Gamla routes fungerar fortfarande.

### Sprint 2 — Hubbar
- [ ] `/planning` tunn hub
- [ ] `/rewards` tunn hub
- [ ] Redirect `/skattkammaren` → `/rewards`
- [ ] `nav_hub_click` analytics

*Leverans:* slut på route-navigation som huvudmodell.

### Sprint 3 — Barnprofil (största kvalitetslyftet)
- [ ] `/family/child/:slug`
- [ ] `/family` rensad (barn, vuxna, pedagoger only)
- [ ] Redirect `/child-settings` → barnprofil
- [ ] Analytics baseline + post-launch events (§8 Fas 3)
- [ ] Drawer kvar som fallback tills mätvärden OK

### Sprint 4 — Settings & avatar
- [ ] `/settings` minimal inkl. **Prenumeration** (`billing`)
- [ ] Flytta operativt från `/family`; `/upgrade` → settings-redirect
- [ ] Avatar-meny (inställningar, logout, pedagog, prenumeration) — **native smoke**
- [ ] Språk: "PIN-kod" / "Säkerhet" — inte "föräldralås" i föräldratext
- [ ] Notiser vs App ägarskap tydliggjort (§4)

### Sprint 5 — Readiness-lager
- [ ] `home-readiness.js` (eller `/api/family/readiness`)
- [ ] Hem-kort: saknas-status, nästa steg
- [ ] För dig kopplat till samma intelligenslager
- [ ] Entréer till barnprofil från Hem och För dig

### Sprint 6+ — Paket-placements
- [ ] `CAPABILITIES` för reporting, pedagog, teacch (dolda tills live)
- [ ] Access + visibility separerat i nav-render
- [ ] Fas 7-städning (Extra/Mer borta, permanenta redirects)

---

## 10. Redirects (sammanfattning)

| Gammal | Ny |
|--------|-----|
| `/skattkammaren` (inloggad förälder) | `/rewards` |
| `/skattkammaren` (utloggad / `?demo=1`) | **Oförändrad** publik demo |
| `/upgrade` | `/settings#prenumeration` |
| `/payment-success` | `/settings#prenumeration` |
| `/child-settings?id=:id` | `/family/child/:canonical` |
| `/home` (om skapad) | `/dashboard` |

Befintliga sidor (`/schedule`, `/library`, `/calendar`, `/assign-schedule`, `/for-dig`, `/reports`, `/samarbete`, `/notifications`, `/pricing-info`) behålls som **mål** för hub-länkar och capabilities.

---

## 11. Relation till befintliga specs

| Dokument | Relation |
|----------|----------|
| `paket-v1.2-spec.md` §6 | v2 **ersätter** fem-fliks-förslaget Idag/Rutiner/Utveckling/Samarbete med domänmodell + placements; pedagog-nav oförändrat |
| `for-dig-spec.md` | För dig förblir `/for-dig` men rollen utökas till coach-lager (§2) |
| `informationsarkitektur-barnapp.md` | Parallell doc för barnsidan; vuxenmeny v2 är föräldrarnas spegel |

---

## 12. Checklista innan merge (per sprint)

- [ ] Alla nav-konsumenter läser `nav-config.js` (inkl. **båda** native + magic)
- [ ] `PRIMARY_NAV` har `paths`; `activeNavItem()` testad på undersidor
- [ ] Inga kärnflikar feature-gatade (`for_dig` utan `feature` på primärnav)
- [ ] Varje `CAPABILITY` har `id`, `feature`, `domain`, `placements`
- [ ] Billing: `/settings#prenumeration` + redirect `/upgrade`
- [ ] `/notifications` via header; `/samarbete` via capability — inte Mer/Extra
- [ ] Rewards-hub: **ingen** länk till `/skattkammaren`; basic tom-state definierad
- [ ] Barnprofil: slug/id-strategi beslutad; `deep-link-router.js` id→canonical
- [ ] Ren `educator` ser inte föräldraflikar; `PEDAGOG_PRIMARY_NAV` separat
- [ ] Avatar-meny nåbar på **native** (logout/settings)
- [ ] a11y: `aria-current` på aktiv flik, avatar-meny tangentbord
- [ ] Access och visibility inte sammanslagna i en boolean
- [ ] Inga tomma hub-ytor för basic-användare (gated items dolda, inte disabled)
- [ ] Barnrelaterade flows nåbara via barnprofil
- [ ] `session-gate.js` inkluderar nya parent-only paths
- [ ] Analytics-events tillagda vid UX-förändring (Sprint 3+)
- [ ] `CACHE_NAME` i `public/sw.js` bumpad
- [ ] Manuell smoke: desktop sidebar, mobil webb, native tab bar, magic view
- [ ] Ingen omskrivning av `/schedule`, `/library`, `/reports` (non-goal §0)

---

## 13. Ägarskap efter migration

| Parent intent | Äger |
|---------------|------|
| Daglig överblick | Hem |
| Planera vardag | Planering |
| Stjärnor & belöningar | Belöningar |
| Coach & rekommendationer | För dig |
| Personer i hushållet | Familj |
| **Ett barns hela värld** | **Barnprofil** (kanonisk väg för allt barnrelaterat) |
| Utveckling över tid | Framsteg (domän under barnprofil) |
| Konto & säkerhet | Inställningar / avatar |
| Prenumeration & köp | Inställningar → Prenumeration (`billing`) |
| Notis-inkorg | Header 🔔 → `/notifications` |
| Pedagogsamarbete (info) | Familj / För dig capability → `/samarbete` |

**Slutsats:** Navigationen växer inte när paket kommer — **djupet** i varje värld växer. Barnprofilen är navets viktigaste objekt; hubbar och Hem är entréer, inte ägare.

---

## 14. Granskningslogg (2026-06-21)

Kodbasavstämning mot `origin/main`. Åtgärdade brister:

| # | Brist | Åtgärd i detta doc |
|---|-------|-------------------|
| A1 | Ingen billing-hemvist | `billing`-domän, `/settings#prenumeration`, redirects `/upgrade` |
| A2 | `/samarbete`, `/notifications` utan placering | Capabilities + header 🔔 |
| A3 | Rewards-hub loop via `/skattkammaren` | Hub pekar på `/library`; redirect endast för gamla bokmärken |
| B4 | `PRIMARY_NAV` saknar `paths` | `paths` + `activeNavItem()` i §6 |
| B5 | `for_dig` feature-gatad på primärnav | `feature: null` på kärnflikar |
| B6 | Felaktig "Från"-beskrivning i Fas 1 | Två källor LEGACY/ROLLOUT tabell |
| C7–8 | Slug + deep links underspecificerade | §4 barnprofil + Sprint 3-krav |
| D9 | Ren educator ospecificerad | §4.1 — `/pedagog-oversikt`, separat nav |
| E10–14 | Avatar native, push-dubbel, a11y, ikon, tomma states | §4, §6, §12 |
