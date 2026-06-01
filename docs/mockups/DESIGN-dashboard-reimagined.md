# DESIGN — REIMAGINED Parent Dashboard + Child View

**Källor:** Mockup-bild `dashboard-reimagined-parent-child.png` (spara i denna mapp).  
**HTML-referens:** [`foraldra.html`](foraldra.html) + [`barnvy.html`](barnvy.html)

---

## Översikt (två skärmar)

```
┌─────────────────────────┐  ┌─────────────────────────┐
│ REIMAGINED PARENT       │  │ REIMAGINED CHILD VIEW   │
│ (ljus tema)             │  │ (mörkt rymd-tema)       │
└─────────────────────────┘  └─────────────────────────┘
```

---

## Förälder — REIMAGINED PARENT DASHBOARD

### Header
- Mörk kompakt header: **Min Stjärndag** + stjärnikon + profilikon höger
- Annotering i mockup: *"Compact head from PWA"* → i **native**: samma kompakt header, **ingen** PWA-install-text

### Översikt (horisontell scroll)
- Kort per barn (t.ex. **Astrid**):
  - Namn + avatar
  - **Idag 4/14**
  - **Totalt 82** stjärnor
  - Progress bar (grön → grå)
  - Present-ikon om belöningar väntar (t.ex. **2**)

### Dagens Quick Actions
- Stora rundade knappar:
  - **Ge extra stjärna** (orange)
  - **Ledig dag** (ljusblå)
  - **+** i streckad ram (fler actions)

### IDAG — aktivitetslista
| Rad | Status |
|-----|--------|
| Frukost / Skola | tag **NU** (orange) |
| Mellanmål | tag **NÄSTA** (lila) |
| Läxor / Pyssel | neutral |
| Fritidsaktivitet | neutral |

### Native Tab Bar (förälder) — 5 flikar
| Flik | Ikon | Active state |
|------|------|--------------|
| **Hem** | hus | ✅ default på dashboard |
| Schema | kalender | |
| Bibliotek | bok | |
| Familj | personer | |
| Inställningar | kugghjul | |

**Sprint:** #2141717 — endast native; webb behåller hamburger.

---

## Barn — REIMAGINED CHILD VIEW

### Header / profil
- Mörk **stjärnhimmel** (navy + små stjärnor)
- **Astrid** + stor guldstjärna + **82** totalt

### Segment (toggle)
- **Schema** | **Skattkammaren** — Schema aktiv i mockup

### Långsiktigt mål
- Progress: t.ex. **8v** mot **150**
- Måltext: *"Utflykt till lekplats/park"*
- Grön progress bar

### Dagkort — Morgon
- Stort kort **Morgon 4/4**
- Uppgift: **Bädda sängen** med stjärnor **0/3**
- Stora touch-targets: grön bock + grå cirkel

### Interaktion (mockup-annoteringar)
- **Swipe-gester** mellan uppgifter
- **Haptisk feedback** — rymd-tema (sprint 4c / platform haptics)

### Native Tab Bar (barn) — 3 flikar
| Flik | |
|------|--|
| **Dagens Schema** | aktiv |
| Skattkammaren | |
| Min Profil | |

**Ingen** föräldra-5-flikar i barnvy.

---

## Acceptans (dashboard polish #2143405)

- [ ] Föräldra: översikt-kort + quick actions + IDAG-lista visuellt nära mockup
- [ ] Barn: mörk bakgrund, mål-progress, stora task-kort
- [ ] Tab bars matchar antal flikar (5 / 3)
- [ ] Inga nya features — endast polish mot denna design
