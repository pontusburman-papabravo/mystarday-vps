# Barnapp & delad telefon — så gör familjen (föräldrar)

Kort guide att dela med testfamiljer eller lägga i onboarding-mail.

## Förälder — första gången

1. Ladda ner appen → **Jag är vuxen** → skapa konto / logga in.
2. Lägg till barn, sätt **PIN**, ladda gärna upp **profilbild (selfie)** under barninställningar.
3. På **barnets telefon**: öppna appen → **Jag är barn** → välj barn i listan (eller skriv namn första gången) → PIN.

## Barnets telefon (egen enhet)

- Appen vet inte vilken familj som “äger” telefonen — barnet identifieras med **namn/användarnamn + PIN**.
- Efter första inloggning: barnet syns i listan **Välj vem du är** med namn och bild (om selfie finns).

## Delad surfplatta / flera barn

| Knapp | Var | Gör |
|--------|-----|-----|
| **Byt barn** | Barnvy (header) | Tillbaka till barnväljaren — välj syskon |
| **← Byt barn** | PIN-skärm | Byt barn innan PIN slagits in |
| **Jag är vuxen →** | Barninloggning | Byt till vuxen (ev. föräldra-PIN) |
| **Byt användare** | Inställningar (vuxen) | Logga ut till start — välj vuxen eller barn |
| **Logga ut** (🚪) | Barnvy | Avsluta barnläge; kan öppna vuxenvy om förälder var inloggad på samma app |

## Selfie / profilbild

- Laddas upp av **vuxen** (inte barnet i barnvyn).
- Syns på barnväljaren och PIN-skärmen när `avatar_url` finns i databasen och listan uppdaterats.

## Felsökning

- **Bara ett barn i listan:** deploy + migration `parent_child` (se `REPAIR-PARENT-CHILD-LINKS.md`).
- **Ingen bild, bara emoji:** ladda upp selfie som vuxen; logga in som barn igen eller tryck **Byt barn**.
- **Fel barn efter utloggning:** använd **Byt barn**, inte bara 🚪 om ni vill byta syskon utan att hamna i vuxenpanelen.
