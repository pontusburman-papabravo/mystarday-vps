# Resursbiblioteket — spec v1

Normative description of the shipped resource library. History lives in git.

## A. Produktprinciper

- Appen är inte ett utskriftsverktyg.
- Resursbiblioteket är ett separat, gratis SEO-/acquisition-spår. Inget konto krävs.
- PDF-resurser har ingen betalvägg.
- App-CTA förklarar varför ett levande schema är enklare när dagen ändras. CTA är relevant, inte aggressiv.
- Formulering: “TEACCH-inspirerat”. Ingen certifiering eller officiell metodstatus.
- Okända `/resurser/*` och `/en/resources/*` ger 404, aldrig startsidan.
- HTML-landningar är sidor. `.pdf`-URL:er är filer.
- Inga emoji som PDF-illustrationer.
- Svenska sidor serverar svenska PDF:er. Engelska sidor serverar engelska PDF:er.

## B. Informationsarkitektur

Sidtyper:

1. Hub — `/resurser` · `/en/resources`
2. Kategori — `/resurser/{kategori}` · `/en/resources/{category}`
3. Bildkort (HTML) — `/resurser/bildkort/{kategori}` · `/en/resources/picture-cards/{category}`
4. PDF-landning (HTML) — `/resurser/pdf/{mall}` · `/en/resources/pdf/{template}`
5. PDF-fil — `/resurser/pdf/{fil}.pdf` · `/en/resources/pdf/{file}.pdf`

Kategorisidans primära yta länkar direkt till PDF-filer (tom mall, exempel, bildkort — de varianter som finns). HTML-bildkort är en sekundär länk, visuellt skild från PDF-korten. PDF-landningar finns för SEO och instruktion och är inte ett obligatoriskt steg från kategorin.

Kanoniska engelska filnamn följer slug-översättningen (`morgonschema.pdf` → `morning-schedule.pdf`). Svenska filnamn under `/en/resources/pdf/` är alias till den engelska filen.

## C. Resursmodell

Katalog: `config/resurser-catalog.js`. Copy: `config/resurser-i18n/sv-SE.json` och `config/resurser-i18n/en-GB.json`.

PDF-varianter (22 × två locales):

- Morgon: tom mall, exempel, bildkort
- Kväll: tom mall, exempel, bildkort
- Känslor: bildkort
- Övergångar: tom mall, exempel, bildkort
- TEACCH-inspirerat: bildkort
- Skola: tom mall, exempel, bildkort
- Hygien: tom mall, exempel, bildkort
- Belöningsschema, veckoschema (tom + exempel), helgschema, läxschema

Piktogramnycklar är samma `icon_key` som appen (`config/pictogram-library.js`).

## D. PDF-designsystem

- Generator: `src/lib/resurser-pdf.js`
- Bygge: `npm run generate:resurser-pdfs`
- A4, PDFKit, Helvetica (WinAnsi). Inga pilar, stjärn-glypher eller andra tecken Helvetica inte kan rita.
- En sida för varje resurs som ryms på en sida
- Titel, ingress, instruktion/disclaimer, footer och sidnummer från locale-bundle
- Illustrationer: barnets `simple`-pictogram (`public/images/child/pictograms/simple/`) rasteriseras till PNG via `sharp` (`src/lib/resurser-icons.js`). Samma bilder som Idag i appen. Nycklar utan app-pictogram (känslor, TEACCH-token) faller tillbaka till design-kit-SVG. Textetikett finns alltid. Saknas båda används numrerad yta, inte emoji.
- Färg är inte enda bärare av information (ikon + text + kryssruta).

## E. I18n

Locales: `sv-SE`, `en-GB`.

Samma katalog renderar HTML och PDF. Core-sidor genereras med `npm run generate:resurser-html` och speglas inte av Google Translate. Långsvans-sidor kan fortfarande speglas; PDF-alias gör att deras `.pdf`-länkar serverar rätt språkfil.

## F. SEO

- Kategori fångar bred intent, PDF-landning mall-intent, bildkort picture-card-intent.
- Canonical pekar på den egna URL:en.
- hreflang `sv` / `en` / `x-default` (x-default = svensk URL).
- HTML-sidor i sitemap via befintliga R1/R2/R3 + EN-mirror-index.
- PDF-binärer: `X-Robots-Tag: noindex, nofollow` så de inte konkurrerar med landningarna.
- 404 för okända resurssökvägar.

## G. Analytics

Förstaparts-events via `/api/analytics/event`, samma allowlist och consentmodell som övriga publika sidor (`public/js/article-events.js`):

- `resource_page_viewed`
- `resource_pdf_download` (kategori, pdf_id, fil, locale)
- `resource_cta_clicked`

Befintlig `article_cta_register` skickas fortfarande på app-CTA.

## H. Acceptanskriterier

- Förväntade sv/en resource-routes = 200
- Okända routes och PDF:er = 404, ingen homepage-fallback
- Alla deklarerade PDF:er genereras (`%PDF-`, `application/pdf`, rimlig storlek, förväntat sidantal)
- sv-sida länkar sv-PDF, en-sida länkar en-PDF
- Ingen svensk brödtext i engelska PDF:er
- Inga emoji i PDF
- Kategori morgon: tom mall, exempel och bildkort-PDF direkt; HTML-bildkort sekundärt; inget “Direct link”-språk
- Inga hårdkodade svenska användartexter på core `/en/resources/**`

## I. Explicit senare

- Full omskrivning av ~100 longtail-HTML-sidor till handöversatt en-GB (nu: Direct link borttaget; PDF-alias ger rätt fil)
- Extra PDF-varianter som inte finns i katalogen
- Structured data på resurssidor
- Appens vanliga schema-/print-vy
