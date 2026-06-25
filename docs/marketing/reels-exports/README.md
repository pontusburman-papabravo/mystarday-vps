# Reels-export — färdiga bilder & videor

Exporterade **1080×1920** (9:16) från HTML-mockups. Redo att ladda upp i Meta Ads Manager eller Instagram.

## Filer per variant

| Mapp | Video | Innehåll |
|------|-------|----------|
| `morgonrutin/` | `reels-morgonrutin.mp4` (~24 sek) | Morgonrutin utan tjat |
| `kvallrutin/` | `reels-kvallrutin.mp4` | Kvällsrutin / läggdags |
| `npf/` | `reels-npf.mp4` | Bildstöd & NPF |

Varje mapp har också **6 PNG-bilder** (`01-hook.png` … `06-cta.png`) om du vill redigera själv.

Annonstext: `docs/marketing/reels-annons-*/ANNONS-KOPI.md`

---

## Hämta till din Mac

```bash
cd /Users/pontusburman/mystarday-vps
git pull origin main
open docs/marketing/reels-exports/morgonrutin/
```

Finder öppnar mappen med PNG + MP4. (Fungerar på `main` — ingen branch-byte behövs.)

---

## Ladda upp som Reels-annons (Meta)

1. [business.facebook.com](https://business.facebook.com) → **Annonshanteraren**
2. Skapa kampanj → mål **Trafik** eller **Konverteringar** (registrering)
3. Placeringar: **Instagram Reels** + **Facebook Reels**
4. **Lägg till media** → välj t.ex. `reels-morgonrutin.mp4`
5. Primär text från `ANNONS-KOPI.md`, URL: `https://mystarday.se`
6. Publicera

## Ladda upp organiskt (Instagram)

1. AirDrop `reels-morgonrutin.mp4` till iPhone
2. Instagram → **+** → **Reels** → välj videon
3. Lägg till text + länk i bio

---

## Generera om (utvecklare)

```bash
node scripts/export-reels-assets.mjs
# En variant: VARIANTS=morgonrutin node scripts/export-reels-assets.mjs
```
