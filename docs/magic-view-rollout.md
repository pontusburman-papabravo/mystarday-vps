# Magic view — sidkartläggning och rollout

Senast uppdaterad: 2026-06-19

## Prod-status

Magic-växlare (Klassisk / Ny design) är **globalt aktiverad** för alla familjer via `magic_view_enabled` i `/api/auth/me`.

| Env | Effekt |
|-----|--------|
| *(standard)* | Alla familjer ser växlaren |
| `MAGIC_VIEW_DISABLED=true` | Nödstopp — ingen magic |
| `MAGIC_VIEW_PREVIEW_ONLY=true` | Begränsa till `MAGIC_VIEW_ALLOWLIST` |

Feature-flaggor i admin (`parent_home_magic`, `ny_barnvy`) är satta till `live` i seed.

---

## Föräldrasidor — magic-täckning

### ✅ Magic på alla live-sidor

| Sida | Route | Hur |
|------|-------|-----|
| Dashboard | `/dashboard` | `ParentMagicShell` + home-hub |
| Daglig logg | `/daily-log` | bootstrap + hero |
| Veckoschema | `/schedule` | shell + hero |
| Kalender | `/calendar` | platform-inject + auto |
| Aktiviteter | `/activities` | platform-inject + auto |
| Tilldela schema | `/assign-schedule` | platform-inject + auto |
| För dig | `/for-dig` | bootstrap + hero |
| Familj | `/family` | shell + hero |
| Inställningar | `/settings` | grupperad magic-meny |
| Bibliotek | `/library` | `LibraryMagicHub` |
| Skattkammaren | `/skattkammaren` | bootstrap + hero |
| Barninställningar | `/child-settings` | platform-inject + auto |
| Notiser | `/notifications` | platform-inject + auto |

`/family-week` redirectar 301 → `/schedule?view=family` (magic via schema-sidan).

`platform-html.js` injicerar magic-CSS/JS automatiskt på parent-shell-sidor. `parent-magic-auto.js` skapar toggle-mount, hero-mount och döljer legacy-sidebar.

### ❌ Medvetet utan magic

| Sida | Varför |
|------|--------|
| Rapporter | Dev, 1 familj — ej prioriterad |
| Pedagog-anteckning | Dev, 1 familj |
| Onboarding, login, upgrade | Engångsflöden |

---

## Barnvy — sammankopplat system

| `child_view_config.view_mode` | Effekt |
|-------------------------------|--------|
| `classic` | child-dashboard klassisk |
| `new` | child-dashboard magic |

DB = sanning. Barnets UI-växlare sparar via `PATCH /view-config/self`.

---

## Nästa steg

1. Förbättra innehålls-UX i magic (inte bara hero/shell) på schema-undersidor
2. Deprecera `child-new.html` när magic är stabilt globalt
3. Magic på rapporter/pedagog när dev-features går live
