# Android — bjuda in testare (Play)

**Paket:** `se.mystarday.app` <!-- pragma: allowlist secret -->
**Opt-in-testlänk (skicka alltid denna):** `https://play.google.com/apps/testing/se.mystarday.app` <!-- pragma: allowlist secret -->
**Store-URL (undvik under test):** `https://play.google.com/store/apps/details?id=se.mystarday.app` <!-- pragma: allowlist secret -->

**Status:** Appen är **inte** publikt live på Google Play. Installation sker via testspår (internal/closed/open testing).

## Vilken länk ska skickas?

| Länk | När den fungerar | Använd för testare? |
|------|------------------|---------------------|
| Opt-in-testlänken ovan | När ett testspår är aktivt och opt-in är på | **Ja — alltid** |
| Store-URL:en ovan | Först när appen är i **produktion** (eller efter att personen redan gått med i testet) | **Nej** under testperioden |

Store-länken (`/store/apps/details`) visar ofta bara Play-sidan utan möjlighet att installera — exakt det Jonathan beskrev. Det betyder inte att bygget saknas; det betyder att mottagaren inte är ansluten till testspåret ännu.

## Så här gör testaren

1. Öppna **opt-in-testlänken** på en Android-telefon (Chrome eller Play-appen).
2. Logga in med det Google-konto som används i Google Play.
3. Tryck **Bli testare** / **Join the test** (eller motsvarande).
4. Vänta någon minut, öppna sedan Play-listningen och installera appen.
5. Om knappen saknas: uppdatera Play Store-appen, byt till rätt Google-konto, prova igen.

## Checklista innan du skickar mejl

- [ ] Release finns på Internal / Closed / Open testing i Play Console
- [ ] Spåret är **Available** (inte bara draft)
- [ ] Opt-in-länken är aktiverad (Closed/Open) **eller** testarens e-post finns på Internal-listan
- [ ] Mejlet innehåller **opt-in-testlänken** ovan — inte bara store-URL:en

## Mejlmall (kopiera)

**Ämne:** Hjälp oss testa appen på Android

Klistra in **opt-in-testlänken** från toppen av detta dokument i steg 1.

```
Hej!

Nu finns appen tillgänglig för testning på Android via Google Play.
Den är ännu inte publikt live — därför behövs testlänken nedan (den vanliga
Play-sidan fungerar inte förrän du anslutit dig till testet).

Så här gör du:

1. Öppna testlänken på din Android-telefon:
   <klistra in opt-in-testlänken här>

2. Anslut dig till testet med det Google-konto som du använder i Google Play.

3. Installera eller uppdatera appen via Play Store.

Under testperioden får du gärna återkomma med synpunkter — t.ex. om något är
svårt att förstå, inte fungerar som förväntat eller skulle kunna förbättras.

Tack för att du hjälper till!

Vänliga hälsningar,
Pontus
```

## Svar om någon redan fick fel länk

Klistra in **opt-in-testlänken** från toppen av detta dokument.

```
Tack för att du hörde av dig — och du har helt rätt.

Appen ligger just nu i Googles testspår, inte som publik release.
Därför funkar den vanliga Play-länken inte än.

Använd den här testlänken på din Android-telefon i stället:

<klistra in opt-in-testlänken här>

1) Anslut dig till testet med ditt Google-konto
2) Installera appen
3) Hör gärna av dig hur det känns

Tack!
Pontus
```

## Relaterat

- Play-checklista: [`google-play-checklist.md`](google-play-checklist.md) (Steg 6)
- Review-konto: [`google-play-review-notes.md`](google-play-review-notes.md)
- Stabilitet / AAB: [`android-play-stability-2026-07.md`](android-play-stability-2026-07.md)
