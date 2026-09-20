# För dig-pilot 72h — beslut

**Datum:** 2026-09-20  
**Status:** Accepted (kod live via hot-deploy) · send gate OFF efter one-shot  
**POS:** Constitution 1 (ett nästa steg), 00A (låg friktion), spec §19.2 B (1-klicks outcome)

---

## Kohort 1 — `abead70f` (2026-09-17)

**Evidence:** founder_observation (72h read-only audit)

| Steg | n=5 |
|------|-----|
| Levererade | 5 |
| Öppnade | 1 (förälder B, 5 frågor) |
| Klickade | 0 |
| Svar | 0 |
| Kvarvarande frågor | 13 |

Leveransen var säker. Konverteringen var noll. Mejlet bad dem öppna appen i stället för att svara.

**Låst:** ingen retry av A–E (`9cdc8990e6c8` · `5d6689b0a62d` · `3efff5aa4d77` · `1345cb90e013` · `b4808586c1a0`).

---

## Beslut efter kohort 1

1. Ingen retry av `abead70f`.
2. Send gate förblir OFF i systemd / `.env`.
3. Nästa utskick kräver en namngiven fråga och fyra svarsknappar som landar på en bekräftelsesida utan inloggning.
4. Founder beordrade därefter: gör ändringarna, ta 5 nya, kör 24/72h.

---

## Kohort 2 — `dc12514b` (2026-09-20)

**Evidence:** `EVIDENCE_SOURCE: agent_vps_send` (hashes only)  
**Skickat:** 2026-09-20T14:49:43.944Z  
**Mall:** `one_question` (GET skriver inte; POST sparar score 1–4)

| Bokstav | parent_hash | frågor |
|---------|-------------|--------|
| A | `ebb7894c856e` | 4 |
| B | `3df9e8ab4de6` | 1 |
| C | `ffe7619b2dbe` | 1 |
| D | `0a643d0427fa` | 1 |
| E | `ed8092400180` | 5 |

| Steg vid send | n=5 |
|---------------|-----|
| Skickade | 5 |
| Misslyckade | 0 |
| Avregistrerade | 0 |
| Levererade (webhook, t+sekunder) | 5 |
| Öppnade | 0 |
| Klickade | 0 |
| Outcome-svar | 0 |

**Isolation:** `newsletter_email_send` delta = `for_dig_outcome_followup +5`. `dagens_nyhet` / `standalone` / `stuck_child_view` = 0.  
**Gate:** `EMAIL_SEND_ENABLED=true` bara på one-shot-processen. `.env` och systemd unset efteråt.  
**Överlapp kohort 1:** 0.

Hot-deploy: sex produktfiler från `8f355f25` på VPS working tree. `main` fortfarande `a810ac3f`. `/for-dig/hur-gick-det` svarar 400 + `noindex` utan token.

## Observation

- 24h och 72h: **read-only**. Ingen ny mail, ingen retry, ingen env/kod, ingen merge.
- Success: minst **ett outcome-svar**. Annars är mejlkanalen fel verktyg och vi stannar vid Hem-bannern.

## Vad som inte görs

- Ingen påminnelse till kohort 1
- Newsletter orörd
- Hem/Journey/För dig-katalogen orörd
- Ingen systemd-restart med send gate på
