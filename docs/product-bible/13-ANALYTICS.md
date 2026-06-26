# 13 — Analytics

**Product Bible — Kapitel 13**  
**Version:** 1.0  
**Status:** Normerande


---

## 13.1 Syfte

Analytics ska mäta **om produkten hjälper människor att lyckas med vardagen** — inte maximera skärmtid eller skuldinducerande engagement.

## 13.2 Principer

1. **Handling före appnärvaro** — mät genomförande, inte bara öppningar
2. **Kontext, inte dom** — aggregera utan att exponera barn som prestationsobjekt för föräldrar
3. **Nästa steg som KPI** — tid till första avbockning, återstart efter avbrott
4. **Konstitution före funnel** — om ett mått motiverar skamlig UX, är måttet fel
5. **Anonymiserad plattformsdata** — familj-ID i `analytics_events`, ingen PII i event stream

## 13.3 Per use case

Varje UC ska definiera (se UC-mallen):

- **Analytics** — vilka events som skickas
- **KPI** — produktmål (t.ex. tid till första stjärna, skip utan abandon)
- **Statistik** — vad som visas för användaren vs internt

## 13.4 Plattformsmått (översikt)

| Mått | Varför |
|------|--------|
| Aktiva familjer 24h/7d | Hälsa, inte vanity |
| Stjärnor given / belöningar lösta | Loopen fungerar |
| Conversion (onboarding → första stjärna) | Aktivering |
| Återstart efter 7d inaktivitet | Failure design fungerar |
| PWA / native adoption | Kanal, inte mål i sig |

**Implementation:** `analytics_events`, `analytics_daily_snapshots`, allowlist i server — se befintlig kodbas.

## 13.5 Roadmap

| Version | Innehåll |
|---------|----------|
| v1.0 | Principer + fält i UC-mall |
| v1.1 | Per-UC KPI-baseline dokumenterad |
| v2.0 | QA behavior checklist kopplad till analytics |
