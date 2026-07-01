# Agent-uppdrag: Bygg Familj till 10/10 (GO)

**Kopiera hela filen till en ny agent** — eller peka agenten hit: `docs/familj-agent-prompt.md`  
**Produktvision:** [familj-vision.md](familj-vision.md)  
**Index (alla hubbar):** [parent-hubs-index.md](parent-hubs-index.md)

---

# Definition of Done

## Jenny-test

En förälder som aldrig sett Familj ska inom **5 sekunder**, **utan scroll**, svara:

1. **Vilka barn har vi i appen?**
2. **Hur bjuder jag in en annan vuxen?**
3. **Var klickar jag för att se Astrids detaljer?**

## Tekniskt minimum

- `npm run test:gate` grön
- Mobil först
- POS: P-04, C-01
- Commit + PR med Jenny-test-resultat

---

# Ditt mandat

Bygg **Familjehubben** och **barnprofilen** till 10/10 — ren "vem är med"-yta.

**Vision > legacy drawer.**

---

# Stop Rule

Om barnprofil kräver ny backend — minimal route + redirect först. Bryt inte `test:gate`.

Om inställningar fortfarande bor på `/family` — flytta till `/settings` innan du lägger till nytt.

---

# Scope

`/family`, `/family/child/:id`, redirects från `/child-settings`.

Ändra inte Hem, Planering, Belöningar, För dig.

---

## Anti-patterns

- Push/GDPR/radera på Familj-sidan
- Drawer som enda barn-UX utan profil-route
- Ny bottenflik för pedagog
- Barnformulär i barnläge (C-01)

---

# Teknisk vägledning

**Nyckelfiler:**

| Fil | Roll |
|-----|------|
| `public/js/family.js` | Familjehub |
| `public/family.html` | Shell |
| `public/js/deep-link-router.js` | child-settings redirect |
| `public/js/nav-config.js` | Pedagog capability |
| `src/routes/family/members.js` | Inbjudan, barn |

**Branch:** `cursor/for-dig-10-10-2c04`

---

# Sista instruktionen

Familj ska kännas som **klasslistan** — inte kontrollpanelen för hela appen.

Tre sektioner. Tydliga kort. Ett tryck till barnets värld.
