# Ta App Store-screenshots på Mac (native iOS)

Svenska steg-för-steg. Målet är **samma UI som granskaren ser i TestFlight** — inte mobil Safari/PWA.

## Godkända mått (kom ihåg)

| Portrait | Landscape |
|----------|-----------|
| **1242 × 2688** | **2688 × 1242** |
| **1284 × 2778** | **2778 × 1284** |

Inget annat accepteras av App Store Connect.

---

## 1. Förbered Xcode

```bash
cd ~/mystarday-vps
git pull origin main
npm ci
npm run cap:sync:ios
open ios/App/App.xcworkspace
```

## 2. Välj simulator med rätt mått

I Xcode verktygsfältet:

| Vill du ha | Välj simulator |
|------------|----------------|
| **1284 × 2778** | iPhone **14 Plus** |
| **1242 × 2688** | iPhone **11 Pro Max** |

**Product → Run** (⌘R). Appen laddar `https://mystarday.se` i native WebView.

## 3. Logga in (review-konto)

| Fält | Värde |
|------|-------|
| E-post | `review@mystarday.se` |
| Lösenord | `AppReview2026!` |
| Barn-PIN | `4455` |

## 4. Ta fem screenshots (⌘S)

Varje **⌘S** sparar PNG på **Skrivbordet**. Kontrollera mått:

```bash
file ~/Desktop/*.png | grep -E '1242 x 2688|1284 x 2778'
```

| # | Navigera till | Vad ska synas |
|---|---------------|---------------|
| 1 | Förälder → Hem | Native **bottenflik** (inte hamburger) |
| 2 | Barninloggning | "Välj vem du är" / Anna |
| 3 | Barnvy | Flik **☀️ Idag** |
| 4 | Barnvy | Flik **💎 Skattkammaren** (vänta tills rummen syns) |
| 5 | Barnvy | Flik **🏡 Familj** |

Döp om filerna t.ex. `01-parent.png` … `05-family.png` innan upload.

## 5. Ladda upp i App Store Connect

1. **App Store** → din version → **Screenshots**
2. Välj iPhone-slot som matchar ditt mått (6.5" / 6.7" — Connect-etiketten varierar)
3. Dra in PNG:erna i ordning 1–5

Om Connect klagar på mått: öppna bilden i Preview → **Verktyg → Justera storlek** till exakt **1284×2778** eller **1242×2688** (ingen annan storlek).

---

## Fysisk iPhone (TestFlight)

1. Installera build från TestFlight
2. Samma inloggningsflöde som ovan
3. **Volym upp + sidoknapp** för screenshot
4. AirDrop till Mac → verifiera `file bild.png`

Fysiska skärmdumpar kan ibland få udda mått — skala i Preview till ett av de fyra godkända måtten ovan.
