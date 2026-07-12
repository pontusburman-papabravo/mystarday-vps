# QA — Barnets samling v1 (hela flödet)

Slutlig constitution-test för `barnets_samling` efter Fas A–E.

**Konto:** [`docs/qa-test-account.md`](../qa-test-account.md) (barn Anna + förälder enligt demo-dokumentet).

**Automatiserat (kör före manuell QA):**

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
NODE_ENV=test REQUIRE_EMAIL_VERIFICATION=false env -u RESEND_API_KEY npm run test:gate
npm run check:css
```

Relevanta suites: `barnets-samling-*.test.js`, `child-pictogram-packs.test.js`, `idag-*.test.js`, `mina-personer-*.test.js`, `skattkammaren-*.test.js`.

---

## Gate ON — fyra flikar

### ☀️ Idag (`/child/today`)

| # | Kontroll |
|---|----------|
| 1 | Primär handling synlig (nästa aktivitet) |
| 2 | Bockning fungerar; kort firande ≤2 s |
| 3 | Ingen toast som tvingar till ”Min värld”/hub |
| 4 | Stjärnor i rutinen; ingen shop-copy |
| 5 | Nav: fyra flikar (Idag · Min samling · Skattkammaren · Mina personer) |

### 🏆 Min samling (`/child/collection`)

| # | Kontroll |
|---|----------|
| 1 | Rubrik + ”Titta vad du har samlat” |
| 2 | Stjärnglas: **lifetime_stars** (inte spendable) |
| 3 | Trofévägg från achievements |
| 4 | Streak-kedja; neutral tomstatus |
| 5 | Minneskort + belöningshylla från redemptions (read-only) |
| 6 | Diplom (klientgenererade) |
| 7 | **Min årsbok:** månadsuppslag, snap-bläddring, varm tomstatus |
| 8 | Ingen `ChildCollections`, shop, köp, loot |

### 🎁 Skattkammaren (`/child/treasure`)

| # | Kontroll |
|---|----------|
| 1 | Spendable saldo i header |
| 2 | Aktivt mål + progress |
| 3 | Statusar: Sparar · Kan lösas in · Väntar · Genomförd |
| 4 | Inlösen (`requestRedeem`) oförändrat |
| 5 | Historik i kista-estetik; kort på hylla |
| 6 | Tillbaka → Idag (inte hub/Morgonhus) |

### ❤️ Mina personer (`/child/family`)

| # | Kontroll |
|---|----------|
| 1 | Familjemedlemmar visas |
| 2 | Ingen syskonjämförelse/leaderboard |
| 3 | Nav och tillbaka fungerar |

---

## Gate OFF — legacy

| # | Kontroll |
|---|----------|
| 1 | Flik **Min värld** (inte Min samling) |
| 2 | Hub/Morgonhus som ingång där legacy förväntas |
| 3 | Legacy Skattkammaren: saldo, inlösen, pending |
| 4 | Ingen forced route till `/child/collection` eller `/child/treasure` |
| 5 | Idag och belöningsloop oförändrad |

---

## Korsnavigering

| Från | Till | Förväntat |
|------|------|-----------|
| Idag | Skattkammaren | Saldo kvar; inget extra steg |
| Skattkammaren | Idag | Inlösen-state bevarad |
| Min samling | Idag | Ingen redeem/saldo-läcka |
| Alla flikar | Logga ut / byt barn | Fungerar |

---

## Theme system shell

Kör på **iPhone Safari** och **Android Chrome**. Testa även PWA där det är möjligt.

| # | Kontroll |
|---|----------|
| 1 | Gate ON utan tema → `data-child-theme="adventure"` |
| 2 | Okänt/legacy-tema, t.ex. `castle` → adventure |
| 3 | Alias `fantasy` → adventure; `cars`/`airplanes` → vehicles; `dolls` → builders |
| 4 | `visual_theme="space"` gäller på alla fyra flikar (Idag · Min samling · Skattkammaren · Mina personer) |
| 5 | `visual_theme="animals"` gäller på alla fyra flikar |
| 6 | Bottom nav täcker inte innehåll eller CTA |
| 7 | Ingen horisontell scroll eller låst vertikal scroll |
| 8 | Min samling: ingen visuell regression |
| 9 | Skattkammaren och redeem: ingen visuell regression |
| 10 | Gate OFF → legacy-värld och legacy-tema oförändrade |
| 11 | Gate ON: gradient syns direkt; WebP-bakgrund fade-in utan layout shift |
| 12 | Kort och text läsbara över bakgrund (scrim/overlay) |
| 13 | Ingen horisontell scroll från bakgrundsbild |
| 14 | Vertikal scroll fungerar på alla flikar |
| 15 | Offline/reload: vald bakgrund cachelagras efter första visning (PWA) |
| 16 | Trasig/saknad bild → gradient-fallback, sidan fortfarande läsbar |

**Manuella testteman:** `adventure` (default), `space`, `animals`

**Simulera tema i konsol (gate ON):** `ChildTheme.apply({ visual_theme: 'space' })`  
**DB (dev):** `child_view_config.visual_theme` utan föräldra-UI i PR 1.

---

## Theme tab icons (bottom nav)

Kör på **iPhone Safari**, **iPhone PWA** (om möjligt), **Android Chrome**, **Android PWA** (om möjligt).

| # | Kontroll |
|---|----------|
| 1 | `adventure` (default) visar fyra WebP-ikoner i bottom nav |
| 2 | `space` visar fyra WebP-ikoner |
| 3 | `animals` visar fyra WebP-ikoner |
| 4 | Samma tema-ikoner på alla fyra flikar (Idag · Min samling · Skattkammaren · Mina personer) |
| 5 | Aktiv flik markeras tydligt (befintlig accent-CSS) |
| 6 | Simulerad 404 på ikon → emoji-fallback utan layout shift |
| 7 | Ikon dubbelläses inte av skärmläsare (dekorativ `alt=""`, fliktext kvar) |
| 8 | Bottom nav täcker inget innehåll; touchytor ≥ befintlig storlek |
| 9 | Ingen horisontell scroll; ingen layout shift vid ikonladdning |
| 10 | Gate OFF → legacy bottom nav oförändrad (inga theme WebP) |
| 11 | Min samling / Skattkammaren / redeem utan regression |
| 12 | Bakgrundsbilder från föregående assetpaket fungerar fortfarande |

**Simulera 404-fallback:** DevTools → blockera t.ex. `/images/child/themes/space/icon-today@2x.webp` → emoji ska visas.

---

## Barnets temaväljare

Kör på **iPhone Safari**, **iPhone PWA** (om möjligt), **Android Chrome**, **Android PWA** (om möjligt).

| # | Kontroll |
|---|----------|
| 1 | Öppna **Min samling** → kortet **Mitt tema** syns (gate ON) |
| 2 | Alla tio teman visas i väljaren |
| 3 | Default **adventure** när inget sparat / okänt värde |
| 4 | Välj **space** → förhandsvisa → **Avbryt** → tidigare tema åter |
| 5 | Välj **animals** → **Använd tema** → sparat |
| 6 | Samma tema på alla fyra flikar efter sparning |
| 7 | Ladda om → temat kvar (`child_view_config.visual_theme`) |
| 8 | Simulera save-fel (offline) → felmeddelande + återställning |
| 9 | Simulera saknad previewbild → gradient + namn, fortfarande valbart |
| 10 | Bottom nav täcker inget; ingen horisontell scroll |
| 11 | Gate OFF → ingen temaväljare; legacy oförändrat |
| 12 | Min samling / Skattkammaren / redeem utan regression |

**Manuella testteman:** `adventure`, `space`, `animals`

---

## Bildstil (aktivitetspictogram)

Kör på **iPhone Safari**, **iPhone PWA** (om möjligt), **Android Chrome**, **Android PWA** (om möjligt).

| # | Kontroll |
|---|----------|
| 1 | Öppna **Min samling** → kortet **Bildstil** syns under **Mitt tema** (gate ON) |
| 2 | Default **Tydliga bilder** (`simple`) när inget sparat / okänt värde |
| 3 | Välj **Aktiva bilder** → förhandsvisa → **Avbryt** → tidigare stil åter |
| 4 | Välj **Aktiva bilder** → **Spara bildstil** → sparat (`child_view_config.pictogram_pack`) |
| 5 | Synliga aktiviteter uppdateras utan full reload (☀️ Idag) |
| 6 | **Frukost** (`breakfast`): pack-bild visas när ingen egen foto |
| 7 | **Bada** (`bath`): pack-bild i vald stil |
| 8 | **Borsta tänderna** (`brush_teeth` / alias): pack-bild via alias |
| 9 | **Skola** (`school`): pack-bild |
| 10 | **Lek** (`play` / `toy`): pack-bild |
| 11 | **Sova** (`sleep`): pack-bild |
| 12 | Aktivitet med **eget foto** (`image_url`) → foto vinner alltid över pack |
| 13 | Okänd `icon_key` (t.ex. `happy`) → emoji/legacy utan krasch |
| 14 | Bottom nav täcker inget; ingen horisontell scroll; vertikal scroll OK |
| 15 | Gate OFF → ingen bildstilsväljare; legacy pictogram/emoji oförändrat |
| 16 | Offline/reload: pack-bilder cachelagras efter första visning (PWA, runtime SW) |
| 17 | Min samling / Skattkammaren / redeem utan regression |

**Fallbackkedja (gate ON):** eget foto → valt pack → `simple` → befintligt pictogram/emoji

**Manuella testpaket:** `simple` (default), `action`

**Simulera okänd nyckel:** aktivitet med `icon_key: mom` → emoji, ingen vit ruta eller JS-fel.

---

## Kortstorlek (aktivitetsbilder)

Kör på **iPhone Safari**, **iPhone PWA**, **Android Chrome**, **Android PWA**.

| # | Kontroll |
|---|----------|
| 1 | Min samling → **Kortstorlek** under **Bildstil** (gate ON) |
| 2 | Default **Vanliga kort** (`standard`) |
| 3 | Välj **Stora bilder** → förhandsvisa → **Avbryt** → åter |
| 4 | Välj **Stora bilder** → **Spara kortstorlek** → sparat (`child_view_config.activity_card_size`) |
| 5 | ☀️ Idag uppdateras utan full reload |
| 6 | **Vanliga kort:** bild ~64–80 px, flera aktiviteter synliga |
| 7 | **Stora bilder:** listbild ~112–144 px, NU-bild ~160–200 px, en rad per aktivitet |
| 8 | `object-fit: contain`, ingen layout shift vid laddning |
| 9 | Aktivitetstext kvar under/bredvid bilden |
| 10 | Oberoende från **Bildstil** (t.ex. Tydliga + Stora) |
| 11 | Ingen åldersstyrd låsning |
| 12 | Gate OFF → legacy kortstorlek oförändrad |

**Kända simple-symboler att förbättra (v2 assets):** wash-hands, wash-face, get-dressed, leave-home, clear-table, break, calm-time, pajamas — kör igenkänningstest utan text med barn.

---

## Presentation polish (mobil)

Kör på **iPhone Safari** och **Android Chrome** med gate ON.

| # | Kontroll |
|---|----------|
| 1 | Alla fyra flikar: text på läsbar yta (overlay/scrim), inte direkt på bakgrund |
| 2 | Safe-area: bottom nav + Safari-bar täcker inte CTA eller rubriker |
| 3 | Första viewport känns avsiktlig — inget viktigt avklippt |
| 4 | **Min samling:** hero-kort med stjärnglas ovanför fold; scrollstart tydlig |
| 5 | **Skattkammaren:** stort mål (t.ex. 350⭐) — max ~24 visuella stjärnor; text + progressbar korrekt |
| 6 | **Mina personer:** rubrik ”Mina personer” + ”De som hjälper mig”; aktivitetsrad under hero |
| 7 | **Idag:** Hej · Nu · aktivitet · progress synlig utan trängsel |
| 8 | Gate OFF legacy: oförändrad layout (ingen regression) |

---

## Passkriterier

- [ ] Alla gate ON-flikar testade på mobil portrait
- [ ] Gate OFF legacy smoke OK
- [ ] `npm run test:gate` grön
- [ ] Ingen shop/köp/loot-copy i Min samling
- [ ] Redeem/API oförändrat

**Follow-up (ej blocker):** #631 persistent Godkänd ≠ Genomförd (`fulfilled_at`).
