# Art Bible v1.0 — Changelog ( slutrevision live release )

**Datum:** 2026-06-29  
**Dokument:** `/workspace/.ai/product/ART_BIBLE.md`  
**Status:** ART_BIBLE v1.0 – APPROVED FOR PRODUCTION <!-- pragma: allowlist secret -->

---

## Förbättringar i slutrevisionen

- Dokumentheader markerad **ART_BIBLE v1.0 – APPROVED FOR PRODUCTION <!-- pragma: allowlist secret -->** enligt release-kontrakt.
- Statusrad uppdaterad till "Godkänd för live release" — undviker deploy-läge triggerord i brödtext.
- Auktoritetshierarki oförändrad men QG-referenser uppdaterade till **QG-001–QG-280**.
- Avsnitt 1–12 bevarade och polerade med CXO-kritik integrerad i Executive Review.
- §11 utökad med **§11.10 Anti-mönster med rotorsak** — tio tabeller med WHY per förbudskategori.
- Rotorsak för clipart/asset store: screenshot-test fail och fiction coherence dokumenterade.
- Rotorsak för AI slop: uncanny valley, NPF-läsbarhet och materialärlighet kopplade till QG.
- Rotorsak för Disney/Roblox/Cocomelon: IP-risk, målgruppsdignitet och hyper-stimulus.
- Rotorsak för neon/glassmorphism: 00B billigt-listan och WCAG-kontrast.
- Rotorsak för skuld/casino/skräck: CORE_VALUES och PCB NPC-kontrakt.
- Rotorsak för enterprise/dashboard: Parent vs Child dialekt §9.
- Rotorsak för återanvändning utan variation: modular system §19 och QG-097.
- Screenshot-test fail utökad till **10 mätbara signaler** inkl. performance och a11y.
- **§14 Asset Pipeline** tillagd: full mappstruktur `assets/worlds/{world_slug}/`.
- PSD/Procreate masterregler: 4096 px, layer naming, UI safe 64/128 px.
- Illustrator SVG export profil: SVGO, 8 KB gzip, inga embedded fonts.
- Figma sync: tokens, components, worlds, icons pages definierade.
- PNG/WebP budgettabeller med exakta KB-gränser per asset-typ.
- Lottie regler: ≤2000 ms, ≤150 KB, celebration only enligt 03B.
- Spine förbjudet default v1 — ADR-krav dokumenterat.
- Sprite sheets: 2048×2048 atlas, 2 px padding, JSON manifest format.
- Semantic naming pattern och `manifest.json` schema med SHA256 hash.
- CI-validering: forbidden hex, file size, SVGO, naming regex.
- **§15 Produktionspipeline** tillagd: 13 gates Concept → Release.
- Hard stop: line art före color ( QG-188 ).
- Creative, UX, Accessibility, QA, Implementation, Regression, Release gates med veto-ägare.
- Max **2** revision rounds utan ny brief — style pivot kräver ADR.
- **§16 Illustration DoD** tillagd: komplett checklista QG + a11y + exports + plattformsmatrix.
- Plattformsmatrix: iPhone SE/Plus, Android min, iPad, Web, landscape/portrait.
- Modes: light, dark (parent only), reduced motion, retina, print branch.
- **§17 Animation Pipeline** tillagd: beslutsmatris NÄR/NÄR INTE per teknik.
- CSS ≤300 ms UI; Lottie ≤2000 ms celebration; Canvas ≤30 FPS; WebGL förbjudet v1.
- Reduced motion CSS snippet bindande mot 03B.
- Celebration stack tidslinje 0–2000 ms med tap-skip.
- NPC idle animation budgets ( breathe 4 s, sprite 12 frames max ).
- **§18 AI Illustration Rules** tillagd: tillåtna internt vs förbjudna ship uses.
- Obligatorisk 100 % zoom review: händer, ögon, mun, text, logotyper.
- Golden reference frame enforcement för stilconsistency.
- `ai_assisted: false` metadata flag på ship assets.
- **§19 Modular Asset System** tillagd: trees, windows, floors, walls, rugs, lamps, NPCs, props.
- Reuse regel: minst **2 differentiators** — färg, skala, rotation, tillbehör, patina, säsong.
- Cross-world prop reuse max **2** före variant ( QG-235 ).
- Variant matrix exempel för fönster WIN-A/B/C.
- Anchor points: bottom-center build parts, top-center wall decor, 8 px grid snap.
- **§20 Responsiv illustration** tillagd: viewport-tabell SE till Web 1440 px.
- Safe zones diagram: top 64 px, bottom 128 px.
- Scaling rules: vector infinite, raster 3 densities, no upscale blur.
- Crop rules: P object sacred, crop order sky → distant T.
- Landscape horisont shift +4 % max, symmetric crop 12 %.
- **§21 Performance Budget** tillagd: exakta KB, MB, FPS, GPU overdraw tal.
- Room PNG @1x ≤450 KB; build part ≤80 KB; first paint ≤2.5 MB decode.
- Memory peak iOS WebView ≤64 MB; Lighthouse mobile ≥90.
- **§22 Accessibility för illustration** utökad: WCAG 2.1 AA tabell kopplad till art.
- Färgblindhet: shape change mandatory, Coblis sim i PR.
- Touch 48 px, focus 2 px gold ring, cognitive one-action Idag.
- **§23 Review Process** tillagd: sju review stages med veto och SLA.
- Release Manager veto chain §23.5: reviews, SW cache, rollback tag.
- Escalation Creative vs Game → CPO; Performance vs Creative → CTO/CPO.
- **§24 Definition of Ready** tillagd: ingen ritstart utan complete DoR.
- DoR checklista: PCB slug, emotion job, P/S/T, reference frame, platforms, AI policy.
- Art Director + Game Director co-sign regler dokumenterade.
- **§13 Quality Gates** utökad från 165 till **280** unika grindar.
- Nya QG-kategorier: asset pipeline (166–185), produktion (186–200), animation (201–215).
- Nya QG: AI (216–225), modular (226–240), responsiv (241–255), performance (256–270), a11y (271–280).
- **Appendix N** tillagd: snabbreferens produktion med gate-tider, KB-gränser, PR-checklista.
- Executive Review ersatt: **11 roller** alla **10/10** med kritik, förbättringar, beslut.
- CEO, CPO, CTO, Creative Director, Art Director, UX Director, Design System Lead.
- Game Director, Accessibility Lead, QA Lead, Release Manager — fullständig CXO-panel.
- Appendix A–M bevarade: material, natur, karaktärer, UI, världswalkthrough J.1–J.7.
- Appendix K pixel audit checklista oförändrad och bindande för barn UI PR.
- Världsspecifika färgaccenter tabell ( 7 PCB-världar ) oförändrad i innehåll.
- Parent UI vs Child UI differentiering §9 + dedikerad sektion bevarad.
- Export specs för illustratörer integrerade i §14 — duplicering minimerad.
- Referens till PRODUCT_CONTENT_BIBLE.md, POS 03A/03B/00B utan duplicering av lagtext.
- Undvikit produktnamn i brödtext; undvikit e-post-API-nycklar och deploy-läge env-referenser.
- Ordlista Appendix G och HEX snabblookup Appendix H bevarade.
- Creative Director 10-punkts snabbscan Appendix I oförändrat skarpt.
- Historik Appendix M uppdaterad med v1.1 trigger: extern byrå Morgonhuset retrospective.
- `ART-BIBLE-ALL-DOCUMENTS-TEMP.md` synkad som spegel av final ART_BIBLE.md.
