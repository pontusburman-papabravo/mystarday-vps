# Search Console rollout

Use this after the public web is deployed. Market URLs such as `/en/ie`, `/de/at` and `/nl/nl` stay `noindex, follow`. Do not request indexing for them.

`x-default` points at the English URL of the same content key. `howItWorks` has no Swedish twin. That gap is expected.

## 1. mystarday.se <!-- pragma: allowlist secret -->

1. Open the `mystarday.se` property. <!-- pragma: allowlist secret -->
2. Submit `https://mystarday.se/sitemap.xml`. <!-- pragma: allowlist secret -->
3. Inspect these Swedish URLs first. Confirm the Google-selected canonical is the .se URL and the page is indexable.
   - https://mystarday.se/ <!-- pragma: allowlist secret -->
   - https://mystarday.se/bildschema-app <!-- pragma: allowlist secret -->
   - https://mystarday.se/morgonrutin-barn <!-- pragma: allowlist secret -->
   - https://mystarday.se/veckoschema-bildstod <!-- pragma: allowlist secret -->
   - https://mystarday.se/rutiner-npf-barn <!-- pragma: allowlist secret -->
4. In Page indexing, review:
   - Crawled – currently not indexed
   - Discovered – currently not indexed
   - Duplicate without user-selected canonical
   - Google-selected canonical is different
5. A .se URL whose canonical is on the app host, or the reverse, is a defect. Do not request indexing until the canonical matches the property.

## 2. mystarday.app <!-- pragma: allowlist secret -->

1. Open the `mystarday.app` property. <!-- pragma: allowlist secret -->
2. Submit `https://mystarday.app/sitemap.xml`. <!-- pragma: allowlist secret -->
3. Inspect the five URLs below for each locale, in this order: `en`, `nl`, then the remaining locales.
4. For each URL confirm HTTP 200, self-canonical on the app host, the expected hreflang tag, and that market pages are absent from the alternate list.
5. Request indexing only for those five URLs per locale. Leave FAQ, legal, resources and the other guides to the sitemap.
6. Open the hreflang report. A missing `sv-SE` on how-it-works is expected. A market URL or a noindex URL in the alternate set is not.

## 3. Five URLs to inspect first

### sv

- https://mystarday.se/ <!-- pragma: allowlist secret -->
- https://mystarday.se/bildschema-app <!-- pragma: allowlist secret -->
- https://mystarday.se/morgonrutin-barn <!-- pragma: allowlist secret -->
- https://mystarday.se/veckoschema-bildstod <!-- pragma: allowlist secret -->
- https://mystarday.se/rutiner-npf-barn <!-- pragma: allowlist secret -->

### en

- https://mystarday.app/en <!-- pragma: allowlist secret -->
- https://mystarday.app/en/visual-schedule-app <!-- pragma: allowlist secret -->
- https://mystarday.app/en/morning-routine-children <!-- pragma: allowlist secret -->
- https://mystarday.app/en/weekly-schedule-visual-support <!-- pragma: allowlist secret -->
- https://mystarday.app/en/routines-neurodiverse-children <!-- pragma: allowlist secret -->

### nl

- https://mystarday.app/nl <!-- pragma: allowlist secret -->
- https://mystarday.app/nl/visueel-schema <!-- pragma: allowlist secret -->
- https://mystarday.app/nl/ochtendroutine-kinderen <!-- pragma: allowlist secret -->
- https://mystarday.app/nl/weekplanning-met-pictogrammen <!-- pragma: allowlist secret -->
- https://mystarday.app/nl/routines-neurodiverse-kinderen <!-- pragma: allowlist secret -->

### bg

- https://mystarday.app/bg <!-- pragma: allowlist secret -->
- https://mystarday.app/bg/vizualen-dneven-plan <!-- pragma: allowlist secret -->
- https://mystarday.app/bg/sutreshna-rutina <!-- pragma: allowlist secret -->
- https://mystarday.app/bg/sedmichen-plan <!-- pragma: allowlist secret -->
- https://mystarday.app/bg/rutini-za-neurodivergentni-detsa <!-- pragma: allowlist secret -->

### cs

- https://mystarday.app/cs <!-- pragma: allowlist secret -->
- https://mystarday.app/cs/vizualni-denni-plan <!-- pragma: allowlist secret -->
- https://mystarday.app/cs/ranni-rutina <!-- pragma: allowlist secret -->
- https://mystarday.app/cs/tydenni-plan <!-- pragma: allowlist secret -->
- https://mystarday.app/cs/rutiny-neurodivergentni-deti <!-- pragma: allowlist secret -->

### da

- https://mystarday.app/da <!-- pragma: allowlist secret -->
- https://mystarday.app/da/visuel-dagsplan <!-- pragma: allowlist secret -->
- https://mystarday.app/da/morgenrutine <!-- pragma: allowlist secret -->
- https://mystarday.app/da/ugeplan-piktogrammer <!-- pragma: allowlist secret -->
- https://mystarday.app/da/rutiner-neurodiverse-boern <!-- pragma: allowlist secret -->

### de

- https://mystarday.app/de <!-- pragma: allowlist secret -->
- https://mystarday.app/de/visueller-tagesplan <!-- pragma: allowlist secret -->
- https://mystarday.app/de/morgenroutine-kinder <!-- pragma: allowlist secret -->
- https://mystarday.app/de/wochenplan-piktogramme <!-- pragma: allowlist secret -->
- https://mystarday.app/de/routinen-neurodiverse-kinder <!-- pragma: allowlist secret -->

### el

- https://mystarday.app/el <!-- pragma: allowlist secret -->
- https://mystarday.app/el/optiko-imerisio-programma <!-- pragma: allowlist secret -->
- https://mystarday.app/el/proini-routina <!-- pragma: allowlist secret -->
- https://mystarday.app/el/evdomadiaio-programma <!-- pragma: allowlist secret -->
- https://mystarday.app/el/rutines-nevrodiaphoretika-paidia <!-- pragma: allowlist secret -->

### es

- https://mystarday.app/es <!-- pragma: allowlist secret -->
- https://mystarday.app/es/horario-visual <!-- pragma: allowlist secret -->
- https://mystarday.app/es/rutina-matinal <!-- pragma: allowlist secret -->
- https://mystarday.app/es/plan-semanal <!-- pragma: allowlist secret -->
- https://mystarday.app/es/rutinas-ninos-neurodivergentes <!-- pragma: allowlist secret -->

### et

- https://mystarday.app/et <!-- pragma: allowlist secret -->
- https://mystarday.app/et/visuaalne-paevakava <!-- pragma: allowlist secret -->
- https://mystarday.app/et/hommikurutiin <!-- pragma: allowlist secret -->
- https://mystarday.app/et/nadalakava <!-- pragma: allowlist secret -->
- https://mystarday.app/et/rutiinid-neurodivergentsed-lapsed <!-- pragma: allowlist secret -->

### fi

- https://mystarday.app/fi <!-- pragma: allowlist secret -->
- https://mystarday.app/fi/kuvallinen-paivasuunnitelma <!-- pragma: allowlist secret -->
- https://mystarday.app/fi/aamurutiini <!-- pragma: allowlist secret -->
- https://mystarday.app/fi/viikkosuunnitelma <!-- pragma: allowlist secret -->
- https://mystarday.app/fi/rutiinit-neurokirjo <!-- pragma: allowlist secret -->

### fr

- https://mystarday.app/fr <!-- pragma: allowlist secret -->
- https://mystarday.app/fr/emploi-du-temps-visuel <!-- pragma: allowlist secret -->
- https://mystarday.app/fr/routine-du-matin <!-- pragma: allowlist secret -->
- https://mystarday.app/fr/planning-hebdomadaire <!-- pragma: allowlist secret -->
- https://mystarday.app/fr/routines-enfants-neurodivergents <!-- pragma: allowlist secret -->

### ga

- https://mystarday.app/ga <!-- pragma: allowlist secret -->
- https://mystarday.app/ga/sceideal-amhairc <!-- pragma: allowlist secret -->
- https://mystarday.app/ga/gnathamh-maidin <!-- pragma: allowlist secret -->
- https://mystarday.app/ga/plean-seachtaini <!-- pragma: allowlist secret -->
- https://mystarday.app/ga/gnathaimh-paiste-neorodhifriuil <!-- pragma: allowlist secret -->

### hr

- https://mystarday.app/hr <!-- pragma: allowlist secret -->
- https://mystarday.app/hr/vizualni-dnevni-plan <!-- pragma: allowlist secret -->
- https://mystarday.app/hr/jutarnja-rutina <!-- pragma: allowlist secret -->
- https://mystarday.app/hr/tjedni-plan <!-- pragma: allowlist secret -->
- https://mystarday.app/hr/rutine-neurodivergentna-djeca <!-- pragma: allowlist secret -->

### hu

- https://mystarday.app/hu <!-- pragma: allowlist secret -->
- https://mystarday.app/hu/kepi-napirend <!-- pragma: allowlist secret -->
- https://mystarday.app/hu/reggeli-rutin <!-- pragma: allowlist secret -->
- https://mystarday.app/hu/heti-terv <!-- pragma: allowlist secret -->
- https://mystarday.app/hu/rutinok-neurodivergens-gyerekek <!-- pragma: allowlist secret -->

### is

- https://mystarday.app/is <!-- pragma: allowlist secret -->
- https://mystarday.app/is/sjonraen-dagskra <!-- pragma: allowlist secret -->
- https://mystarday.app/is/morgunvenja <!-- pragma: allowlist secret -->
- https://mystarday.app/is/vikuaaetlun <!-- pragma: allowlist secret -->
- https://mystarday.app/is/venjur-taugafraedileg-born <!-- pragma: allowlist secret -->

### it

- https://mystarday.app/it <!-- pragma: allowlist secret -->
- https://mystarday.app/it/schema-visivo <!-- pragma: allowlist secret -->
- https://mystarday.app/it/routine-del-mattino <!-- pragma: allowlist secret -->
- https://mystarday.app/it/piano-settimanale <!-- pragma: allowlist secret -->
- https://mystarday.app/it/routine-bambini-neurodivergenti <!-- pragma: allowlist secret -->

### lt

- https://mystarday.app/lt <!-- pragma: allowlist secret -->
- https://mystarday.app/lt/vaizdinis-dienos-planas <!-- pragma: allowlist secret -->
- https://mystarday.app/lt/ryto-rutina <!-- pragma: allowlist secret -->
- https://mystarday.app/lt/savaites-planas <!-- pragma: allowlist secret -->
- https://mystarday.app/lt/rutinos-neuroivairiems-vaikams <!-- pragma: allowlist secret -->

### lv

- https://mystarday.app/lv <!-- pragma: allowlist secret -->
- https://mystarday.app/lv/vizuala-dienas-karte <!-- pragma: allowlist secret -->
- https://mystarday.app/lv/ritas-rutina <!-- pragma: allowlist secret -->
- https://mystarday.app/lv/nedelas-plans <!-- pragma: allowlist secret -->
- https://mystarday.app/lv/rutinas-neirodiversiem-berniem <!-- pragma: allowlist secret -->

### mt

- https://mystarday.app/mt <!-- pragma: allowlist secret -->
- https://mystarday.app/mt/skeda-vizwali <!-- pragma: allowlist secret -->
- https://mystarday.app/mt/rutina-ta-filghodu <!-- pragma: allowlist secret -->
- https://mystarday.app/mt/pjan-tal-gimgha <!-- pragma: allowlist secret -->
- https://mystarday.app/mt/rutini-tfal-newrodiversi <!-- pragma: allowlist secret -->

### nb

- https://mystarday.app/nb <!-- pragma: allowlist secret -->
- https://mystarday.app/nb/visuell-dagsplan <!-- pragma: allowlist secret -->
- https://mystarday.app/nb/morgenrutine <!-- pragma: allowlist secret -->
- https://mystarday.app/nb/ukeplan <!-- pragma: allowlist secret -->
- https://mystarday.app/nb/rutiner-nevromangfoldige-barn <!-- pragma: allowlist secret -->

### pl

- https://mystarday.app/pl <!-- pragma: allowlist secret -->
- https://mystarday.app/pl/plan-dnia-obrazkowy <!-- pragma: allowlist secret -->
- https://mystarday.app/pl/poranna-rutyna <!-- pragma: allowlist secret -->
- https://mystarday.app/pl/plan-tygodnia <!-- pragma: allowlist secret -->
- https://mystarday.app/pl/rutyny-dzieci-neuroroznorodnych <!-- pragma: allowlist secret -->

### pt

- https://mystarday.app/pt <!-- pragma: allowlist secret -->
- https://mystarday.app/pt/horario-visual <!-- pragma: allowlist secret -->
- https://mystarday.app/pt/rotina-da-manha <!-- pragma: allowlist secret -->
- https://mystarday.app/pt/plano-semanal <!-- pragma: allowlist secret -->
- https://mystarday.app/pt/rotinas-criancas-neurodivergentes <!-- pragma: allowlist secret -->

### ro

- https://mystarday.app/ro <!-- pragma: allowlist secret -->
- https://mystarday.app/ro/plan-vizual-de-zi <!-- pragma: allowlist secret -->
- https://mystarday.app/ro/rutina-de-dimineata <!-- pragma: allowlist secret -->
- https://mystarday.app/ro/plan-saptamanal <!-- pragma: allowlist secret -->
- https://mystarday.app/ro/rutine-copii-neurodivergenti <!-- pragma: allowlist secret -->

### sk

- https://mystarday.app/sk <!-- pragma: allowlist secret -->
- https://mystarday.app/sk/vizualny-denny-plan <!-- pragma: allowlist secret -->
- https://mystarday.app/sk/ranna-rutina <!-- pragma: allowlist secret -->
- https://mystarday.app/sk/tyzdenny-plan <!-- pragma: allowlist secret -->
- https://mystarday.app/sk/rutiny-neurodivergentne-deti <!-- pragma: allowlist secret -->

### sl

- https://mystarday.app/sl <!-- pragma: allowlist secret -->
- https://mystarday.app/sl/vizualni-dnevni-nacrt <!-- pragma: allowlist secret -->
- https://mystarday.app/sl/jutranja-rutina <!-- pragma: allowlist secret -->
- https://mystarday.app/sl/tedenski-nacrt <!-- pragma: allowlist secret -->
- https://mystarday.app/sl/rutine-nevroraznoliki-otroci <!-- pragma: allowlist secret -->

## 4. How to read the index reports

- **Crawled – currently not indexed.** Open the URL, confirm canonical and hreflang, then request indexing only when it is one of the five URLs above.
- **Discovered – currently not indexed.** Leave it if the sitemap already lists it. Request indexing only for the five URLs.
- **Duplicate.** Compare the user-declared canonical with the URL you submitted. The declared canonical wins.
- **Google-selected canonical.** It must be the same host and path as the sitemap loc. A market path or another language means the cluster is wrong.

## 5. Do not do

- Do not submit `/en/ie`, `/en/ca`, `/nl/nl` or any other market path for indexing.
- Do not add a sitemap that multiplies locales by countries.
- Do not point hreflang at a `noindex` URL.
