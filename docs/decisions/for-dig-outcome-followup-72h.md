# För dig-pilot 72h — beslut

**Datum:** 2026-09-20  
**Status:** Accepted (kod) · send gate oförändrad OFF  
**Batch:** `abead70f-f0fb-49ea-845e-827087cf620b`  
**Evidence:** founder_observation (72h read-only audit)  
**POS:** Constitution 1 (ett nästa steg), 00A (låg friktion), spec §19.2 B (1-klicks outcome)

---

## Vad piloten visade

| Steg | n=5 |
|------|-----|
| Levererade | 5 |
| Öppnade | 1 (förälder B, 5 frågor) |
| Klickade | 0 |
| Svar | 0 |
| Kvarvarande frågor | 13 |

Leveransen är säker. Konverteringen är noll.

Fyra av fem fick det generiska mejlet *"För ett tag sedan aktiverade du några saker"* + CTA **"Öppna appen"**. Specen bad om en 1-klicksfråga. Mejlet bad dem öppna appen.

## Beslut

1. **Ingen retry** av batch `abead70f`. Inget nytt utskick i den här PR:en.
2. **Send gate förblir OFF** (`EMAIL_SEND_ENABLED` unset). Ingen env-ändring.
3. **Nästa utskick får inte ske** förrän mejlet har en fråga och fyra svarsknappar som landar på en bekräftelsesida utan inloggning.
4. Den här PR:en bygger just den vägen. Founder väljer därefter om en ny 5-personers batch ska gå.

## Vad som inte görs

- Ingen ny batch, ingen påminnelse till A–E
- Newsletter orörd
- Hem/Journey/För dig-katalogen orörd
- Inga fler schemalagda 24h/72h-rapporter

## Success för nästa ev. batch

Minst **ett outcome-svar**. Annars är mejlkanalen fel verktyg och vi stannar vid Hem-bannern.
