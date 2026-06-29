# App Store Screenshots — Plan & overlay-copy

> Uppdaterad 2026-06-29 för native v2 (Hem · Planering · Belöningar · För dig · Familj).  
> **Appen är redan på App Store** — byt screenshots när overlays är klara; ingen ny build krävs.  
> **Du:** lägg overlay i Figma/Canva → ladda upp i App Store Connect → Spara.  
> **Agent:** copy, ordning och CPP-mappning (denna fil).

---

## Godkända mått

| Portrait | Landscape |
|----------|-----------|
| **1242 × 2688** | **2688 × 1242** |
| **1284 × 2778** | **2778 × 1284** |

Simulator: iPhone **14 Plus** (1284×2778) eller **11 Pro Max** (1242×2688). Screenshot **⌘S**.

```bash
file din-bild.png   # måste visa exakt ett godkänt mått
```

---

## Källbilder (juni 2026)

| Filnamn (förslag) | Vy | Beskrivning |
|-------------------|-----|-------------|
| `src-01-for-dig-rutiner.png` | Förälder → För dig | Trygga kvällar, Bra morgonar, Självständighet |
| `src-02-hem.png` | Förälder → Hem | Översikt, medförälder-CTA, flera barn |
| `src-03-planering.png` | Förälder → Planering | Bibliotek, bildarkiv, boendeschema-hub |
| `src-04-for-dig-rekommendationer.png` | Förälder → För dig | Mest installerade, per-barn-rekommendationer |
| `src-05-boendeschema.png` | Förälder → Familj | Vecka A/B, två hem |
| `src-06-barnvy-idag.png` | Barnvy | Dagens uppdrag med delsteg |
| `src-07-skattkammaren.png` | Barnvy | Stjärnor, önskelista, troféhylla |

---

## Standard App Store-set (5 bilder)

Använd för **default** produktsida och första submission.

| Upload # | Källbild | Overlay-rubrik | Overlay-underrad | Bakgrund |
|----------|----------|----------------|------------------|----------|
| **1** | `src-06-barnvy-idag` | **Barnet ser vad som händer nu** | Visuellt schema steg för steg | Mörk gradient överst (barnvy är ljus) |
| **2** | `src-07-skattkammaren` | **Stjärnor som motiverar** | Belöningar barnet faktiskt vill ha | Mörk gradient överst |
| **3** | `src-01-for-dig-rutiner` | **Morgon & kväll utan maktkamp** | Aktivera färdig rutin på 1 minut | Mörk — matchar appens UI |
| **4** | `src-02-hem` | **Hela familjen i samma överblick** | Tre barn, en app | Mörk |
| **5** | `src-05-boendeschema` | **Växelvis boende? Vecka A & B** | Båda föräldrar ser samma schema | Mörk |

### Overlay-stil

```
┌─────────────────────────────┐
│  RUBRIK (gul #F5C518, bold) │  ← ca 35 % av bildhöjden
│  Underrad (vit 80 % opacity)│
│ ┌─────────────────────────┐ │
│ │   telefon-mockup        │ │  ← befintlig screenshot, oförändrad
│ │   (app-UI)              │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

- **Rubrik:** max ~40 tecken, Poppins/SF Pro Bold, 34–40 pt  
- **Underrad:** max ~50 tecken, Regular, 22–26 pt  
- **Bakgrund:** `#1a1530` → `#0d0b1a` gradient (matchar föräldra-UI)  
- Barnvy-bilder (#1–2): lägg mörk gradient **ovanför** den ljusa app-UI:n, inte över hela bilden

### Export

- Slutlig storlek: exakt **1284×2778** eller **1242×2688**  
- Format: PNG  
- Filnamn: `01-barnvy-idag.png` … `05-boendeschema.png`

---

## Reservbilder (ej i standard-set)

| Källbild | Använd till | Varför inte standard |
|----------|-------------|----------------------|
| `src-03-planering` | CPP "Power users" / pedagoger | Funktionslista, svagare känslomässig hook |
| `src-04-for-dig-rekommendationer` | CPP social proof | Överlappar med `src-01` |

---

## CPP-varianter

Se [`../app-store-custom-product-pages.md`](../app-store-custom-product-pages.md) för full matris. Snabbreferens:

| CPP | Bild 1 | Bild 2 | Bild 3 |
|-----|--------|--------|--------|
| NPF / bildstöd | `06-barnvy-idag` | `01-for-dig-rutiner` | `07-skattkammaren` |
| Medföräldrar | `02-hem` | `05-boendeschema` | `06-barnvy-idag` |
| Belöningar | `07-skattkammaren` | `02-hem` | `06-barnvy-idag` |
| Morgon/kväll | `01-for-dig-rutiner` | `06-barnvy-idag` | `07-skattkammaren` |

---

## Checklista innan upload

- [ ] Native app (inte PWA/Safari)
- [ ] Bottennav syns: Hem · Planering · Belöningar · För dig · Familj (föräldrabilder)
- [ ] Review-konto med riktigt innehåll (`review@mystarday.se`) <!-- pragma: allowlist secret -->
- [ ] Overlay-text på alla 5 bilder
- [ ] `file` verifierar godkänt mått
- [ ] Ordning 1–5 enligt tabell ovan
