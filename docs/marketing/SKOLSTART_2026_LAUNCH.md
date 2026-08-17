# Skolstart 2026 — kampanjmaterial (utkast) <!-- pragma: allowlist secret -->

**Baserat på:** `docs/skolstart-lanseringsaudit-2026-08.md` (2026-08-17)  
**Status:** Redo för founder-review. **Skicka/publicera inte förrän PR är deployad.**

---

## Godkända påståenden (vanliga användare idag)

- Färdiga rutiner för morgon, skola och kväll
- Barnet ser vad som händer nu och härnäst
- Stjärnor till Skattkammaren vid klara aktiviteter
- Mindre tjat hemma tack vare tydligt visuellt schema

**Ej i huvudbudskap:** delad telefon / Family Device (flaggor OFF).  
**Med förtydligande:** visuell timer (förälder aktiverar per barn).

---

## Nyhetsbrev

### Variant A — aktiva befintliga familjer

**Ämnesrader (välj en):**

1. Skolstart utan tjat – så hjälper appen hemma
2. Morgon, skola, kväll – tydligare rutiner med appen
3. En enklare skolstart för hela familjen

**Förhandsvisning:** Färdiga rutiner, tydliga steg och stjärnor som gör vardagen lite lugnare.

**Brödtext:**

Hej!

Skolstarten är här igen – och med den kommer morgnar som lätt fastnar i kläder, frukost, tänder och skolväska.

Appen hjälper barnet att se **vad som händer nu** och **vad som kommer sen** – utan att du behöver upprepa samma instruktioner hela tiden.

**🗓️ Färdiga rutiner för skoldagen**  
Kom igång snabbare med tydliga aktiviteter och färdiga rutiner för morgon, skola och kväll.

**👀 Barnet ser själv vad som händer härnäst**  
Ett steg i taget i barnets egen vy – mindre tjat, mer självständighet.

**⭐ Stjärnor som håller motivationen**  
Klara aktiviteter ger stjärnor till Skattkammaren – synligt framsteg barnet kan jobba mot.

**CTA:** Gör skolstarten lite enklare → `/login?utm_source=newsletter&utm_medium=email&utm_campaign=skolstart2026&utm_content=active-families`

**Destination:** `/login` (befintliga) med UTM.

**Påståenden:** Färdiga rutiner, Nu/Nästa, stjärnor — alla GO.

---

### Variant B — inaktiva / återvändande familjer

**Ämnesrader:**

1. Det har hänt mycket sedan sist – gör skolstarten enklare
2. Vi har förbättrat appen inför skolstarten
3. Tillbaka till lugna morgonar? Prova appen igen

**Förhandsvisning:** Färdiga rutiner, tydligare steg och stjärnor – byggt för riktiga skolmorgnar.

**Brödtext:**

Hej!

Det var ett tag sedan ni använde appen – och mycket har hänt sedan dess.

Vi har gjort appen enklare att komma igång med: **färdiga rutiner** för morgon och skola, en tydligare barnvy där barnet ser **vad som händer nu och härnäst**, och **stjärnor** som gör framsteg synligt.

Skolstarten behöver inte handla om tjat och stress. Barnet kan följa sitt schema steg för steg – du slipper vara familjens levande påminnelse.

**CTA:** Prova igen – `/register?utm_source=newsletter&utm_medium=email&utm_campaign=skolstart2026&utm_content=returning-families`

**Destination:** `/register` med UTM.

**Påståenden:** Samma GO-lista. Undvik Family Device och timer som huvudbudskap.

---

## Meta-kampanj

### Mål

- Konverteringar: registrering (web) + app-install (store events via befintlig pixel)
- Medvetenhet: skolstart + morgonrutiner

### Målgrupp (hypoteser)

- Föräldrar 28–45, Sverige
- Intressen: föräldraskap, barnuppfostran, skola, struktur/rutiner
- Lookalike på befintliga registreringar (om tillgängligt)
- **Exkludera:** inget medicinskt targeting ("ADHD-app")

### Kreativa vinklar (3–5)

| # | Vinkel | Rubrik | Primär text (kort) |
|---|--------|--------|-------------------|
| 1 | Morgon utan tjat | Har morgnarna börjat igen? | Kläder. Frukost. Tänder. Skolväska. Appen hjälper barnet se vad som händer nu – och vad som kommer sen. |
| 2 | Barnet ser nästa steg | Barnet ser själv vad som händer härnäst | Visuellt schema och stjärnor som gör skolmorgonen lite lugnare – utan att du behöver upprepa samma sak fem gånger. |
| 3 | Extra tydlighet | Struktur som många barn mår bra av | Särskilt bra för barn som behöver förutsägbarhet och tydliga steg – men användbart för alla familjer. |
| 4 | Kväll → morgon | Kvällsrutinen som gör morgondagen enklare | Tydlig kvälls- och morgonrutin i samma app. Barnet vet vad som väntar – du får lite lugnare övergångar. |

### CTA

- Registrera dig / Läs mer / Hämta appen (testa mot `/` och `/register`)

### Destination

- Primär: `/?utm_source=meta&utm_medium=paid&utm_campaign=skolstart2026&utm_content=<vinkel>`
- Sekundär test: `/resurser/bildschema-skolstart-hosten` för kall trafik

### Format

- 1:1 och 4:5 feed (använd befintliga app-skärmdumpar / design kit)
- Stories: kort hook + CTA

### UTM-struktur

```
utm_source=meta
utm_medium=paid
utm_campaign=skolstart2026
utm_content=<vinkel-slug>
utm_term=<adset-name>  (valfritt)
```

### Budget (initial rekommendation)

- Testbudget: 3 000–5 000 SEK över 7–10 dagar
- 3–4 annonsgrupper (en per vinkel), 2–3 kreativa per grupp
- Optimering mot registrering / landing page view efter 48h data

### Framgångskriterier (7 dagar)

- CTR ≥ 1,2 % på kall trafik
- Kostnad per registrering ≤ historiskt snitt (eller ≤ 150 SEK om inget baseline)
- ≥ 20 % av registreringar når `child_created` (server-side)

### Stop / failure

- CTR < 0,5 % efter 2 000 visningar → byt kreativ/vinkel
- 0 registreringar efter 1 500 SEK spend → pausa och granska landningssida
- Hög bounce på `/` → testa `/register` direkt

---

## Checklista före go-live

- [ ] PR deployad (skolstart-modul live)
- [ ] Founder godkänner nyhetsbrevstext
- [ ] Meta-pixel + GA4 consent verifierad på `/`
- [ ] UTM-parametrar testade i staging/prod registrering
- [ ] **Ej** lovat Family Device eller timer som universell feature
