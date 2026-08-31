# Support under bortresa 1–10 september 2026

**Uppdrag:** Läs allt som kommer in i admin-inkorgen. Svara bara när svaret är verifierat. Hitta inte på. Kan du inte svara: säg att vi är bortresta och återkommer så snart vi kan, senast 11 september.

Betalning är **inte påslagen**.

## Källa

Admin → Meddelanden (`GET /api/admin/contact-messages`). Inloggning: `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

Detta fångar `/kontakt`, support-bubblan, in-app-feedback och systemhjälp → "Rapportera problem".

**Lucka:** mejl rakt till `info@` syns inte i inkorgen. Gmail-MCP är inte inkopplad. Säg det i sammanfattningen om du inte kan läsa den kanalen.

## Beslut

1. Läs hela ärendet. Kolla ev. kopplad familj. Impersonation är **read-only**.
2. Svara bara om du kan verifiera i kod, docs eller admin-data.
3. Annars skicka exakt:

> Tack för att du hör av dig. Vi är bortresta just nu och återkommer så snart vi kan, senast 11 september.

Engelska ärenden: motsvarande text i `config/support-ooo.js` (`replyFallback`).

4. Klassificera `root_cause` när du är säker. Lämna `unknown` hellre än gissa.
5. Lova inte funktioner, datum eller att data kan återskapas.

## Verifierat (får användas)

| Fråga | Svar |
|-------|------|
| Barnets PIN | Vi kan inte läsa ut PIN (hashad). Föräldern sätter en ny 4-siffrig PIN under barnets inställningar. |
| Byta barnets namn | Barnprofil → Inställningar → namn. |
| Betalning / prenumeration | Betalning är inte påslagen. |
| Vi har tagit emot rapporten | Ja — bekräfta och hänvisa till OOO om du inte kan felsöka klart. |

## Gör inte

- Hitta på workaround eller diagnos
- IAP / återbetalning / App Store-disputes
- Radera konto eller barn utan explicit founder-godkännande
- Skriva under impersonation
- Lova nya funktioner

## Daglig automation (Cursor)

Skapa en **daglig** Cloud Agent 1–11 september, ~08:00 Europe/Stockholm, med prompten:

```
Läs docs/support-ooo-sept-2026.md och följ den exakt.

1. Logga in mot den live sajten med ADMIN_EMAIL / ADMIN_PASSWORD.
2. Hämta olästa och aktiva contact_messages (inbox=unread och inbox=active).
3. För varje ärende: läs allt. Svara bara om du kan verifiera svaret i kod, docs eller admin-data. Hitta inte på.
4. Kan du inte svara: skicka replyFallback från config/support-ooo.js.
5. Betalning är inte påslagen.
6. Sammanfatta i svaret: id, typ, vad du svarade eller varför OOO, ev. bugg att fixa.
7. Inga ärenden = skriv det och sluta. Ändra inte produktkod om inget ärende kräver det.
```

Efter 11 september: stäng av automationen. Datumstyrd copy släcks av sig själv.
