# Resursbibliotek R3 — Search Console checklista (månatlig)

**Syfte:** Löpande uppföljning av long-tail-sidor under `/resurser/*` (EPIC R3.3). Ingen API-integration — manuell granskning av Google Search Console och interna verktyg.

**Relaterat:** [`bildstod-app-tasklist.md`](./bildstod-app-tasklist.md) PR R3 · [`seo-handoff.md`](./seo-handoff.md) SEO-14 · plan [`bildstod-app-plan.md`](./bildstod-app-plan.md) §8 + risk D8.

---

## Varje månad (ca 30 min)

### 1. Google Search Console — prestanda

1. Gå till [Google Search Console](https://search.google.com/search-console) (property: `mystarday.se`).
2. **Sökresultat → Sidor:** filtrera på URL som innehåller `/resurser/`.
3. Notera sidor med **höga impressions men låg CTR** (&lt;2 % vid &gt;50 impressions/månad).
4. För dessa sidor: justera `title` och `meta description` i `config/resurser-r3-pages-data.js` (eller R1/R2-config om kategorisidor), kör `node scripts/generate-resurser-r3-html.mjs`, deploya, begär omindexering via URL-inspektion.

### 2. Index coverage

1. **Indexering → Sidor:** kontrollera att nya `/resurser/*`-URL:er inte hamnar i "Hittades men indexeras inte" eller "Crawlad – inte indexerad".
2. Vid nya R3-batchar efter deploy: skicka in `https://mystarday.se/sitemap.xml` (Sitemaps) och URL-inspektera 2–3 representativa long-tail-URL:er.
3. Verifiera att sidan **inte** har `noindex` — endast paths i `SEO_INDEXABLE_PATHS` (`src/lib/seo-pages.js`) ska indexeras.

### 3. Sitemap och kod

1. `GET https://mystarday.se/sitemap.xml` ska innehålla alla R3-paths från `R3_INDEXABLE_PATHS` (`config/resurser-r3.js`).
2. Kör lokalt vid behov: `npm run test:gate` → `test/resurser-r3.test.js` + `test/seo-pages.test.js`.

### 4. Konvertering (intern)

1. **GA4:** granska events `article_cta_register` med `utm_content` som börjar med `resurs-` — vilka long-tail-slugs driver registrering?
2. **Nedladdningar:** spåra klick på PDF-länkar per kategori (manuellt i analytics eller framtida event om tillagt).
3. Om en sida har många impressions men noll CTA-klick: förbättra ingress och nedladdningsblock — undvik att skapa nästan-dubbletter (plan §5.6).

---

## Kvartalsvis

- Jämför top-queries för `/resurser/*` mot befintliga sidor — finns sökintention utan matchande sida? Lägg till max **5 long-tail + 2 PDF** enligt R3.4-kadens (se tasklist).
- Granska om tunna/dubbla sidor kan slås ihop eller noindexas (CTR + bounce i GA4).

---

## Referenser i repot

| Vad | Var |
|-----|-----|
| Indexerbara paths | `src/lib/seo-pages.js` → `SEO_INDEXABLE_PATHS` |
| Sitemap-generering | `src/lib/sitemap.js` → `GET /sitemap.xml` |
| R3 page data | `config/resurser-r3-pages-data.js` |
| HTML-generator | `scripts/generate-resurser-r3-html.mjs` |
| Tester | `test/resurser-r3.test.js`, `test/seo-pages.test.js` |
| SEO-handoff (GA4/Ads) | `docs/seo-handoff.md` |
| Tillväxt-KPI (GSC) | `docs/tillvaxt-retention-krav.md` |

---

## Eskalering

- **Tekniskt:** sidor saknas i sitemap → fixa `R3_INDEXABLE_PATHS` + deploy.
- **Innehåll:** låg CTR trots bra position → skriv om title/description/ingress (inte keyword-stuffing).
- **Strategi:** många impressions, ingen konvertering efter 3 månader → diskutera kadens eller pausa nya long-tail (D8 — mät innan skala upp).
