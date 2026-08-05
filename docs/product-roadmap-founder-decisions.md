# Founder-beslut — roadmap D1–D6

| | |
|--|--|
| **Status** | **Aktiv** — agent-implementation ska **inte** tolka dessa fritt |
| **Authority** | Endast founder (eller explicit skriftligt godkännande) ändrar status till *Beslutat* |
| **Relaterat** | [`product-roadmap-2026-08.md`](./product-roadmap-2026-08.md) §8 · [`adr/ADR-019-trusted-child-device.md`](./adr/ADR-019-trusted-child-device.md) |

Agenter får implementera allt som är **verifierbart och POS-aligned** utan dessa beslut. Vid *Blockerar* nedan: stoppa och eskalera — uppfinn inte produktpolicy.

---

## D1 — Trusted child device (ADR-019 Option A)

| Fält | Innehåll |
|------|----------|
| **Fråga** | Ska vi shippa device-bound child refresh (PIN-less reopen på dedikerad barnenhet)? |
| **Rekommenderat default** | **Nej** tills säkerhetsreview + copy godkänts; fortsätt med session resume där cookies finns |
| **Alternativ** | **A:** Server device-bound refresh (ADR-019 Option A) · **B:** Endast native biometri (Option B) · **C:** Ingen PIN-less; endast UX-förbättringar (större PIN, resume) |
| **Användarkonsekvens** | A/B: barn öppnar direkt till Idag; förlorad enhet kräver revoke i föräldrainställning · C: PIN kvar vid cold start |
| **Säkerhet / tillit** | A: ny attackyta (stolen device) — kräver revoke, audit, child JWT scope oförändrad · C: lägst risk |
| **Blockerar roadmap** | Parallellt spår under R0 — **blockerar inte** R0-01–R0-06. Blockerar “familjeenhet”-marketing |
| **Status** | **Öppen** |

---

## D2 — `PACKAGES_ROLLOUT_MODE=interest`

| Fält | Innehåll |
|------|----------|
| **Fråga** | När ska familjer utan komponent se mock-preview + beta-väntelista (inte köp)? |
| **Rekommenderat default** | **Efter** R2.3 Extra stöd-pilot (3–5 familjer) med positiv feedback |
| **Alternativ** | **Tidigare:** endast admin-tilldelade familjer ser Extra stöd · **Senare:** vänta till R5 · **Aldrig:** lifetime_free-only |
| **Användarkonsekvens** | `interest`: fler ser “kommer snart”-CTA; risk för supportfrågor om pris |
| **Säkerhet / tillit** | Låg teknisk risk; **App Review**-risk om copy lovar ofärdig köpfunktion |
| **Blockerar roadmap** | R2.3 pilot · R5 köp-live |
| **Status** | **Öppen** |

---

## D3 — Journey rollout-våg i prod

| Fält | Innehåll |
|------|----------|
| **Fråga** | Vilken Journey-våg är aktiv på VPS, och får vi gå till nästa våg? |
| **Rekommenderat default** | Verifiera `feature_flag` + `JOURNEY_ROLLOUT_WAVE` i admin **före** varje ny våg; max **en våg per deploy** |
| **Alternativ** | Pausa alla journey-flaggor · Hoppa över shadow och gå direkt till coach (högre risk) |
| **Användarkonsekvens** | Fel våg → handoff/ack-modaler eller coach som konkurrerar med Engine |
| **Säkerhet / tillit** | Medel — fel milestone-data fail-safe till `SETTING_UP` (spec) |
| **Blockerar roadmap** | **R1** (hela fasen) |
| **Status** | **Öppen** — kräver ops-checklista, inte kodgissning |

---

## D4 — Engelsk beta vs R0

| Fält | Innehåll |
|------|----------|
| **Fråga** | Starta parent English beta före R0 DoD är klar? |
| **Rekommenderat default** | **Nej** — R0 först (svensk barnkärna stabil) |
| **Alternativ** | **Parallellt:** endast parent English med `english_child_experience` OFF · **Efter R0:** enligt R3 |
| **Användarkonsekvens** | För tidigt: internationella familjer möter samma barn-P0-buggar |
| **Säkerhet / tillit** | Låg säkerhet; medel produktvarumärke |
| **Blockerar roadmap** | **R3** beta-gate |
| **Status** | **Öppen** |

---

## D5 — Referral belöning v1

| Fält | Innehåll |
|------|----------|
| **Fråga** | När inför vi dubbelsidig belöning (trial/komponent)? |
| **Rekommenderat default** | **Ej** förrän `referral_program` v0-data visar faktisk delning + `activation_rate_48h` motiverar det |
| **Alternativ** | Endast ny familj förlängd trial · Endast värvare · Ingen belöning (v0 permanent) |
| **Användarkonsekvens** | Belöning skapar förväntan och supportärenden |
| **Säkerhet / tillit** | Missbruk (self-referral) — kräver befintliga abuse-tester gröna |
| **Blockerar roadmap** | **R4.3** belöningscopy · inte v0-spårning |
| **Status** | **Öppen** (v0 spårning kan ON utan D5) |

---

## D6 — Kvällsanpassad onboarding (R4.4)

| Fält | Innehåll |
|------|----------|
| **Fråga** | Ska onboarding aktivt stödja “rutin klar ikväll, barn imorgon”? |
| **Rekommenderat default** | **Spec först** — inget i R0; liten copy/CTA i R4 om metrics motiverar |
| **Alternativ** | Journey-registry-meddelande · E-post dag 0 kväll · Ingen ändring |
| **Användarkonsekvens** | Minskar skuld när barn inte loggar in samma kväll som registrering |
| **Säkerhet / tillit** | Låg |
| **Blockerar roadmap** | **R4.4** endast |
| **Status** | **Öppen** |

---

## Revisionshistorik

| Datum | Ändring |
|-------|---------|
| 2026-08-05 | v1.0 — D1–D6 utökade för agent-stoppregler |
