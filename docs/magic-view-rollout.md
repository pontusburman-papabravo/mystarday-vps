# Magic view — sidkartläggning och rollout

Senast uppdaterad: 2026-06-19

## Prod-status (feature-flaggor)

| Familjer | Betydelse | Exempel |
|----------|-----------|---------|
| **159** | Live för alla | veckoschema, daglogg, kalender, bibliotek, för dig |
| **1** | Dev, en testfamilj | `klinisk_rapportering`, `pedagoganteckningar` |
| **0** | Dev, ej tilldelad | `parent_home_magic`, `ny_barnvy` |

Magic preview styrs separat via `MAGIC_VIEW_ALLOWLIST` (e-post), inte feature-tabellen.

---

## Föräldrasidor — magic-täckning

### ✅ Magic på alla live-sidor (159 familjer)

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
| Familjevecka | `/family-week` | platform-inject (family-hub) |

Ny kod: `platform-html.js` injicerar magic-CSS/JS automatiskt på parent-shell-sidor som saknar det. `parent-magic-auto.js` skapar toggle-mount, hero-mount och döljer legacy-sidebar.

### ❌ Medvetet utan magic

| Sida | Varför |
|------|--------|
| Rapporter | Dev, 1 familj — ej prioriterad |
| Pedagog-anteckning | Dev, 1 familj |
| Onboarding, login, upgrade | Engångsflöden |

---

## Barnvy — sammankopplat system

| `child_view_config.view_mode` | Preview-familj | Övriga |
|-------------------------------|----------------|--------|
| `classic` | child-dashboard klassisk | child-dashboard klassisk |
| `new` | child-dashboard magic | child-new (legacy) |

DB = sanning. Barnets UI-växlare sparar via `PATCH /view-config/self`.

---

## Nästa steg (ej magic-shell)

1. Förbättra innehålls-UX i magic (inte bara hero/shell) på schema-undersidor
2. Global rollout: ta bort `MAGIC_VIEW_ALLOWLIST`
3. Deprecera `child-new.html` när magic är globalt
4. Synka seed: `klinisk_rapportering` = `dev` (matchar prod)
