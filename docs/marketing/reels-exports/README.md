# Reels-export — färdiga bilder & videor

Exporterade **1080×1920** (9:16) från HTML-mockups. Redo att ladda upp i Meta Ads Manager eller Instagram.

## Videor (direkt i denna mapp)

| Fil | Innehåll |
|-----|----------|
| `reels-morgonrutin.mp4` | Morgonrutin utan tjat (~24 sek) |
| `reels-kvallrutin.mp4` | Kvällsrutin / läggdags (~24 sek) |
| `reels-npf.mp4` | Bildstöd & NPF (~24 sek) |

Varje variant har också en undermapp med **6 PNG-bilder** (`01-hook.png` … `06-cta.png`).

Annonstext: `docs/marketing/reels-annons-*/ANNONS-KOPI.md`

---

## Hämta till din Mac

```bash
cd /Users/pontusburman/mystarday-vps
git pull origin main
```

**Öppna alla tre i Finder:**

```bash
bash docs/marketing/reels-exports/oppna-alla.sh
```

**Eller en och en:**

```bash
open docs/marketing/reels-exports/reels-morgonrutin.mp4
open docs/marketing/reels-exports/reels-kvallrutin.mp4
open docs/marketing/reels-exports/reels-npf.mp4
```

**Eller hela mappen:**

```bash
open docs/marketing/reels-exports/
```

---

## Ladda upp som Reels-annons (Meta)

1. [business.facebook.com](https://business.facebook.com) → **Annonshanteraren**
2. Skapa kampanj → mål **Trafik** eller **Konverteringar**
3. Placeringar: **Instagram Reels** + **Facebook Reels**
4. **Lägg till media** → välj rätt `reels-*.mp4`
5. Primär text från motsvarande `docs/marketing/reels-annons-*/ANNONS-KOPI.md`
6. URL: `https://mystarday.se`

| Video | Annonstext |
|-------|------------|
| `reels-morgonrutin.mp4` | `docs/marketing/reels-annons-morgonrutin/ANNONS-KOPI.md` |
| `reels-kvallrutin.mp4` | `docs/marketing/reels-annons-kvallrutin/ANNONS-KOPI.md` |
| `reels-npf.mp4` | `docs/marketing/reels-annons-npf/ANNONS-KOPI.md` |

---

## Generera om (utvecklare)

```bash
npm run reels:export
# En variant: VARIANTS=kvallrutin node scripts/export-reels-assets.mjs
```
