# PR 0 — Marketing-bildinventering (`public/images/marketing-seo/`)

**Datum:** 2026-07-02  
**Syfte:** EPIC 0.2 — dokumentera vilka bilder som är app-skärmdumpar vs utskriftsillustrationer, och om de matchar verklig app idag. Inga bilder ersätts i PR 0 (ersättning planeras i PR 1.5).

| Filnamn | Typ | Matchar verklig app? | Not |
|---------|-----|----------------------|-----|
| `fardiga-scheman-bildstod.png` | app-skärmdump (styliserad) | delvis | Visar förälderns **Bibliotek** med färdiga scheman (sommarlov, jullov m.m.) och belöningsförslag. Layout och copy stämmer i princip, men är en marknadsföringskomposition — inte en rå skärmdump från prod. |
| `morgonschema-bildstod.png` | app-skärmdump (styliserad) | delvis | Barnvy med **NU / NÄSTA / KLAR**-etiketter på morgonsteg. Appen har NU/Nästa/Senare — inte ett digitalt TEACCH-arbetssystem (Panel 7, parkerad). Badgen **KLAR** på avklarade steg är rimlig men ska inte tolkas som kolumnen "ATT GÖRA/GÖR/KLAR". Ersätt med riktig prod-skärmdump i PR 1.5. |
| `kvallsschema-bildstod.png` | app-skärmdump (styliserad) | delvis | Samma mönster som morgonbilden: kvällssteg med NU/NÄSTA/KLAR. Matchar barnvy-konceptet men är designad/marknadsföringsgrafik — verifiera mot faktisk barnvy i PR 1.5. |
| `vardagsrutiner-bildstod.png` | app-skärmdump | ja | **För dig**-kort ("Bra morgnar", "Trygga kvällar", "Självständighet") med Aktivera-knappar. Stämmer med befintlig föräldervy. |
| `stjarnor-beloningssystem.png` | app-skärmdump (styliserad) | delvis | "+1 stjärna" efter avbockning. Belöningsflödet finns i appen; exakt visuell design kan skilja sig från prod. PR 1.4 (stjärnrutnät i Skattkammaren) är ännu inte live — bilden visar inte rutnätet. |

## Sammanfattning

- **0/5** är rena utskriftsillustrationer — alla fem är app-relaterade (varav fyra styliserade mockups).
- **1/5** bedöms matcha prod väl (`vardagsrutiner-bildstod.png`).
- **4/5** bör ersättas eller verifieras mot staging-skärmdumpar i **PR 1.5**.
- Ingen bild lovar explicit Panel 7 (digitalt ATT GÖRA/GÖR/KLAR), men **KLAR**-badgen i morgon/kväll-bilderna kan förväxlas med TEACCH-terminologi — copy i guider ska hålla isär NU/Nästa/Senare och utskrivbara TEACCH-inspirerade kort.
