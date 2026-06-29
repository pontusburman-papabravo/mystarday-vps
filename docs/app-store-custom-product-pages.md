# Custom Product Pages (CPP)

> Upp till **35** skräddarsydda App Store-sidor. Varje CPP får en unik URL (`?ppid=…`) för annonser och kampanjer.  
> **Appen är redan live** — skapa CPP:er när Meta/Google-annonser startar; ingen ny app-version behövs.  
> **Du skapar CPP:er i App Store Connect** → Custom Product Pages. **Denna fil** är copy-paste-mall.

Källbilder och overlay-stil: [`app-store-screenshots/SCREENSHOT-PLAN.md`](./app-store-screenshots/SCREENSHOT-PLAN.md)

---

## Översikt

| CPP | Internt namn | Målgrupp | Primär kanal |
|-----|--------------|----------|--------------|
| Default | `default` | Allmän | Organisk sök, standardlänk |
| A | `npf-bildstod` | NPF / ADHD / autism / bildstöd | Meta-annonser, SEO `/rutiner-npf-barn` | <!-- pragma: allowlist secret -->
| B | `medforaldrar` | Växelvis boende, två hem | Meta co-parent, Oddrobo-alternativ |
| C | `beloningar` | Motivation, stjärnor | Reels belöning, barnfokus |
| D | `morgon-kvall` | Morgon- & kvällsrutin | Reels morgon/kväll |

---

## Default (standard produktsida)

**Screenshots:** se SCREENSHOT-PLAN standardordning (5 st).

**Promotional text:** (samma som metadata)
> Bildschema med stjärnbelöningar — barnet ser vad som händer, ni slipper tjat. Aktivera morgon- eller kvällsrutin på en minut. Prova gratis. ★

---

## CPP A — NPF / bildstöd

**Målgrupp:** Föräldrar som söker bildschema, bildstöd, visuellt stöd, ADHD, autism.

**Screenshots (ordning):**

| # | Källbild | Rubrik | Underrad |
|---|----------|--------|----------|
| 1 | Barnvy — idag | **Tydliga steg, mindre stress** | NU och NÄSTA — barnet vet var i rutinen de är |
| 2 | För dig — rutiner | **Struktur utan tjat** | Visuella rutiner för övergångar |
| 3 | Skattkammaren | **Positiv förstärkning** | Stjärnor istället för påminnelser |
| 4 | Barnvy — idag (delsteg) | **Delsteg när det behövs** | Bryt ner "läxor" i små, tydliga steg |
| 5 | Hem | **Du ser hur det går** | Överblick utan att stå över axeln |

**Promotional text:**
> Visuellt bildstöd med delsteg och stjärnbelöningar. Mindre stress vid övergångar — mer förutsägbarhet för barn som behöver tydlig struktur.

**Annons-UTM:** `?utm_source=meta&utm_campaign=npf-bildstod`

**Landning innan App Store:** https://mystarday.se/rutiner-npf-barn <!-- pragma: allowlist secret -->

---

## CPP B — Medföräldrar

**Målgrupp:** Separerade föräldrar, växelvis boende, två hushåll.

**Screenshots (ordning):**

| # | Källbild | Rubrik | Underrad |
|---|----------|--------|----------|
| 1 | Hem (medförälder-CTA) | **Samma schema, två hem** | Sluta fråga "vems vecka är det?" |
| 2 | Boendeschema | **Vecka A & B inbyggt** | Etikett och färg per hem |
| 3 | Barnvy — idag | **Barnet ser samma rutin** | Oavsett vilket hem de är i |
| 4 | För dig — rutiner | **En rutin — båda vuxna** | Aktivera en gång, synkat direkt |
| 5 | Skattkammaren | **Samma belöningar överallt** | Stjärnor följer barnet |

**Promotional text:**
> Växelvis boende? Min Stjärndag synkar schema och stjärnor mellan båda föräldrar. Vecka A/B, medförälder-inbjudan, noll dubbelplanering. <!-- pragma: allowlist secret -->

**Annons-UTM:** `?utm_source=meta&utm_campaign=medforaldrar`

---

## CPP C — Belöningar

**Målgrupp:** Föräldrar som provat belöningstavlor, stjärnscheman på papper.

**Screenshots (ordning):**

| # | Källbild | Rubrik | Underrad |
|---|----------|--------|----------|
| 1 | Skattkammaren | **Belöningar barnet älskar** | Restaurang, extra saga, eget val |
| 2 | Hem (stjärnprogress) | **1 stjärna till nästa mål** | Du ser framsteg i realtid |
| 3 | Barnvy — idag (+stjärnor) | **Stjärnor för varje steg** | Motivation vid varje avbockning |
| 4 | Skattkammaren (troféer) | **Troféhylla för avklarade mål** | Firar det barnet redan lyckats med |
| 5 | För dig — rutiner | **Kom igång på 1 minut** | Färdiga rutiner att aktivera |

**Promotional text:**
> Sluta med papperstavlor som tappas bort. Digital stjärnkista med önskelista, troféer och belöningar hela familjen väljer tillsammans.

**Annons-UTM:** `?utm_source=meta&utm_campaign=beloningar`

**Landning:** https://mystarday.se/beloningssystem-barn <!-- pragma: allowlist secret -->

---

## CPP D — Morgon & kväll

**Målgrupp:** Morgonstress, läggdagskaos, "kom iväg utan tjat".

**Screenshots (ordning):**

| # | Källbild | Rubrik | Underrad |
|---|----------|--------|----------|
| 1 | För dig — rutiner | **Kom iväg utan tjat** | Morgonrutin — aktivera på 1 minut |
| 2 | För dig — rutiner (kväll) | **Mindre stress vid läggdags** | Trygga kvällar, steg för steg |
| 3 | Barnvy — idag | **Barnet vet vad som händer** | Visuellt schema hela dagen |
| 4 | Skattkammaren | **Stjärnor som driver på** | Belöning efter morgonrutinen |
| 5 | Hem | **Du följer utan att tjata** | Överblick för hela familjen |

**Promotional text:**
> Morgon och kväll utan maktkamp. Aktivera färdig morgon- eller kvällsrutin — barnet följer schemat själv och samlar stjärnor.

**Annons-UTM:** `?utm_source=meta&utm_campaign=morgon-kvall`

**Landning:** https://mystarday.se/morgonrutin-barn <!-- pragma: allowlist secret -->

---

## Så skapar du en CPP (du)

1. App Store Connect → din app → **Custom Product Pages** → Create
2. Namn internt (t.ex. `npf-bildstod`)
3. Ladda upp 5 screenshots enligt tabell ovan (med overlays)
4. Klistra in **Promotional text** för CPP (kan skilja sig från default)
5. Spara → kopiera **CPP URL** till annons (Facebook/Instagram App Install)
6. Lägg UTM på webblandningssidan (inte på App Store-länken)

---

## Mätning

| Metrik | Var |
|--------|-----|
| CPP impressions / installs | App Store Connect → Analytics → Custom Product Pages |
| Kampanj → install | Meta Ads Manager (välj CPP URL som destination) |
| Post-install activation | Intern analytics (`sign_up`, `first_schedule_created`) |

Starta med **2 CPP:er** (NPF + medföräldrar) om resurserna är begränsade — de har tydligast differentiering mot konkurrenter.
