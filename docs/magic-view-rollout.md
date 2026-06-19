# Magic view — sidkartläggning och rollout

Senast uppdaterad: 2026-06-19

## Två system (före sammankoppling)

| System | Lagring | Styr | UI |
|--------|---------|------|-----|
| `child_view_config.view_mode` | PostgreSQL | Routing `/child/:id`, föräldrainställning | `classic` → child-dashboard klassisk, `new` → child-new.html |
| `AppViewMode` | localStorage | Toggle Klassisk/Ny design (preview) | Magic chrome i child-dashboard + föräldrasidor |

**Mål:** Ett sammanhängande system där `view_mode` i databasen är sanningen och magic-vyn i child-dashboard ersätter child-new.html för preview-familjer.

---

## Föräldrasidor — status idag

### ✅ Har magic (shell + funktion)

| Sida | Route | Init | Bottom nav | Kommentar |
|------|-------|------|------------|-----------|
| Dashboard | `/dashboard` | `ParentMagicShell.init('dashboard')` | Hem | Full home-hub (`dashboard-home-hub.js`) |
| Schema | `/schedule` | `ParentMagicShell.init('schedule')` | Schema | Magic hero; innehåll fortfarande klassisk schedule.js |
| För dig | `/for-dig` | `data-magic-page` + bootstrap | För dig | Magic hero |
| Familj | `/family` | `ParentMagicShell.init('family')` | Familj | Magic hero |
| Inställningar | `/settings` | `ParentMagicShell.init('settings')` | Inställn. | Grupperad magic-meny |
| Bibliotek | `/library` | `LibraryMagicHub.init()` | — | Egen magic-navigering; inte i parent-bottom-nav |

### ⚠️ Delvis magic

| Sida | Route | Problem |
|------|-------|---------|
| Dagbok | `/daily-log` | `data-magic-page="dashboard"` — får orbs/nav men ingen egen hero |
| Skattkammaren (förälder) | `/skattkammaren-parent` | `data-magic-page="skattkammaren"` finns inte i bottom nav |

### ❌ Saknar magic helt

| Sida | Route | Tab-grupp | Prioritet |
|------|-------|-----------|-----------|
| **Rapporter** | `/reports` | Mer | **P1** |
| **Kalender** | `/calendar` | Schema | **P1** |
| **Aktiviteter** | `/activities` | Schema | **P1** |
| **Tilldela schema** | `/assign-schedule` | Schema | **P1** |
| **Barninställningar** | `/child-settings` | Familj-flöde | **P1** |
| Notiser | `/notifications` | — | P2 |
| Familjevecka | `/family-week` | — | P2 |
| Pedagog-översikt | `/pedagog-oversikt` | Pedagog | P3 (egen UX) |
| Pedagog-anteckning | `/pedagog-note` | Pedagog | P3 |

### 🚫 Ska inte få magic (engångsflöden)

Login, register, onboarding, upgrade, verify-email, child-login (egen login-magic), professional-report, landing.

---

## Barnsidor — status idag

| Sida | Route | Magic | Kommentar |
|------|-------|-------|-----------|
| child-dashboard | `/child-dashboard` | ✅ AppViewMode | Magic = Hem/Schema/Skatt/Familj-flikar |
| child-new | `/child-new` | ❌ Separat legacy | Syne/Instrument Serif; ska fasas ut för preview-familjer |
| child-settings | `/child-settings` | ❌ | Föräldrasida |
| skattkammaren | `/skattkammaren` | ❌ | Fristående barnsida |

---

## Rekommenderad rollout-ordning

### Fas 1 — Barnvy-sammankoppling (pågår)

1. `view_mode: new` + magic-preview → `child-dashboard` magic (inte child-new)
2. Barnets UI-växlare sparar till `child_view_config` (DB = sanning)
3. Förälderns barnvy-inställning och barnets toggle använder samma fält

### Fas 2 — P1 föräldrasidor (nästa)

1. **Rapporter** — shell + legacy-hide; ofta öppnad från Mer-fliken
2. **Kalender + Aktiviteter + Tilldela schema** — schema-kluster; dela `parent-magic-page-hubs` hero-mönster
3. **Barninställningar** — föräldrar som justerar barnvy bör se konsekvent chrome
4. **Dagbok** — egen `data-magic-page="daily-log"` + hero
5. **Skattkammaren-parent** — lägg till i bottom nav eller tydlig magic-hub

### Fas 3 — P2/P3

Notiser, familjevecka, pedagogvyer (bedöm separat designspråk).

### Fas 4 — Global rollout

Ta bort `MAGIC_VIEW_ALLOWLIST`-begränsning; deprecera `child-new.html` helt.

---

## Tekniska krav per ny sida

Varje sida som får magic behöver:

1. `parent-magic-3d.css` + `parent-magic-common.css`
2. `app-view-mode.js` + `parent-magic-shell.js` (eller bootstrap via `data-magic-page`)
3. `#appViewToggleMount` för preview-växlare
4. `parent-magic-legacy-hide` på sidebar/header som ska döljas i magic
5. `ParentMagicShell.init('<page-id>')` med korrekt page-id i `NAV`-arrayen (om sidan ska markera aktiv flik)

`native-tab-bar.js` hanterar redan PWA/native — `parent-magic-shell.js` skippar dubbel nav när `has-native-tab-bar` finns.
