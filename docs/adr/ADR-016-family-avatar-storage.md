# ADR-016 — Family avatar storage & delivery (v1)

**Status:** Accepted (2026-07-12)  
**Scope:** Profilbilder för barn och vuxna familjemedlemmar (Family Avatar v1)  
**POS:** P-02 (igenkänning), C-01 (barn upload endast selfie), 15 Section C (child data)

---

## Context

Familjesidan ska visa personliga avatarer för alla familjemedlemmar. Idag lagras barns `avatar_url` som **publika** R2- eller `/uploads/`-URL:er. Vem som helst med länken kan se bilden även efter att åtkomst återkallats.

Krav v1:

- Privat lagring; inga permanenta publika lagrings-URL:er till klienten.
- Autentiserad leverans med behörighetskontroll per medlem.
- Cache får inte ge åtkomst efter borttaget medlemskap (authz körs alltid före svar).
- Radering av fil vid explicit borttagning av avatar.
- Tydlig policy vid borttagning av barn, vuxen och familjemedlemskap.
- Migrering/utfasning av befintliga publika barnavatarer.
- Pedagogers visningsrätt dokumenterad och testad.

---

## Alternativ

### A. Autentiserad bildproxy (vald)

`GET /api/avatars/:memberType/:memberId?v={avatar_updated_at}`

- Server läser privat objekt (R2 GetObject / lokal disk).
- Session cookie (förälder eller barn) krävs; authz mot familj + ev. `parent_child`-länk.
- Klienten får endast `has_avatar` + relativ `avatar_src` i JSON — aldrig lagringsnyckel eller CDN-URL.
- `Cache-Control: private, max-age=3600, must-revalidate` + `ETag` från `avatar_updated_at`.
- Varje request kör authz **innan** 304/200; återkallad åtkomst → 404.

**Fördelar:** Full authz, ingen läckt URL, enkel mental modell, fungerar med `<img src>` + cookies.  
**Nackdelar:** Serverbandbredd (acceptabelt för små JPEG-avatarer).

### B. Kortlivade signed URLs

Server genererar presigned GET (t.ex. 5–15 min) efter authz.

**Fördelar:** Mindre proxtrafik.  
**Nackdelar:** URL kan delas inom TTL; svårare att ogiltigförklara vid revoke; klient/cache måste hantera utgång; kräver fortfarande privat bucket.

### C. Nuvarande publika URL:er (avvisad)

`avatar_url` sparas som `https://pub…r2.dev/avatars/…` eller `/uploads/avatars/…`.

**Fördelar:** Enklast; ingen proxy.  
**Nackdelar:** Bryter GDPR-krav; läckta länkar fungerar för evigt; ingen revoke.

---

## Decision

**Välj alternativ A** med privat lagring och autentiserad proxy.

### Datamodell

| Tabell | Kolumn | Syfte |
|--------|--------|--------|
| `child` | `avatar_storage_key` | Intern S3/disk-nyckel (aldrig till klient) |
| `child` | `avatar_updated_at` | Cache-busting + ETag |
| `parent` | `avatar_storage_key` | Samma |
| `parent` | `avatar_updated_at` | Samma |

`child.avatar_url` **utfas** — migreras till `avatar_storage_key`, sedan null.

Lagringsnyckelformat (nya filer):

`avatars-private/{familyId}/{memberType}/{memberId}/{timestamp}-{uuid}.jpg`

### API

| Metod | Route | Behörighet |
|-------|-------|------------|
| GET | `/api/avatars/:memberType/:memberId` | Autentiserad + `canViewMemberAvatar` |
| PUT | `/api/children/:childId/avatar` | Förälder med aktiv länk till barnet |
| DELETE | `/api/children/:childId/avatar` | Samma |
| PUT | `/api/account/avatar` | Inloggad vuxen (egen bild) |
| DELETE | `/api/account/avatar` | Inloggad vuxen (egen bild) |
| PUT | `/api/me/profile-photo` | Barn (egen selfie, befintligt produktkrav) |
| DELETE | `/api/me/profile-photo` | Barn (egen bild) |

`POST /api/upload/avatar` avvecklas för profilbilder (behålls ej som primär väg).

JSON-svar: `has_avatar: boolean`, `avatar_src: "/api/avatars/child/uuid?v=…"` — **inte** lagrings-URL.

### Visningsprioritet (klient)

1. Uppladdat foto (`has_avatar` → `avatar_src`)
2. Barnets emoji (endast barn)
3. Initialer från namn
4. Generisk standardavatar (saknat namn)

### Behörighet — visning (`canViewMemberAvatar`)

| Betraktare | Barn-avatar | Vuxen-avatar |
|------------|-------------|--------------|
| Förälder (primary/shared) | Aktiv `parent_child` till barnet, samma familj | Samma `family_id` |
| Pedagog | Aktiv pedagog-länk till **det barnet** | Samma `family_id` (familjelistan) |
| Barn (JWT) | Alla barn i samma familj | Alla vuxna i samma familj |
| Annan familj / utloggad | Nej | Nej |

Pedagog ser **inte** avatarer för barn de inte är kopplade till (403/404).

### Radering och livscykel

| Händelse | Beteende |
|----------|----------|
| Användare tar bort avatar | `DELETE` endpoint → radera objekt → `avatar_storage_key = NULL` |
| Barn raderas | Radera barnets avatarobjekt i samma transaktion/flöde |
| Vuxen tas bort från familj / konto raderas | Radera vuxens avatarobjekt |
| `parent_child` återkallas | Ingen filradering; authz nekar framtida GET |
| Familj raderas | `deleteAvatarsForFamily` raderar alla objekt före child/parent-rader |

### Migrering av befintliga publika avatarer

1. Migration extraherar lagringsnyckel från legacy `avatar_url` (`/uploads/avatars/…` eller R2 public base).
2. `avatar_storage_key` sätts; `avatar_url` nullas.
3. Direktåtkomst blockeras: `/uploads/avatars/*` och `/uploads/avatars-private/*` returnerar 404 före static middleware.
4. Prod: R2 bucket policy — avpublicera `avatars/` prefix när migrering verifierad (manuell ops-checklista).

Bilder som inte går att mappa rensas (`avatar_url` null) — användare får ladda upp igen.

**Release-notering:** Efter migration är `avatar_url` null i DB. Klienter som fortfarande har gamla publika URL:er i cache visar trasig bild tills användaren laddar upp på nytt via v1-flödet. Detta är avsiktligt — inga permanenta publika länkar.

### Cache och revoke

- Authz på **varje** GET (även vid `If-None-Match` / 304).
- Vid nekad authz: **404** för alla medlemstyper (barn, vuxen, pedagog) — ingen 403 som läcker existens.
- `Cache-Control: private, no-cache, must-revalidate` + `Vary: Cookie` — klienten måste omvalidera vid varje visning; inget `max-age` som tillåter offline-cache efter återkallad behörighet.
- `?v=` från `avatar_updated_at` ogiltigförklarar ETag vid byte/radering.

---

## Consequences

- Ny proxy-route och privat lagrings-API i `object-storage` / `avatar-storage`.
- Klienter uppdateras till `member-avatar.js` (gemensam resolver).
- `test:gate` utökas: cross-family 404, pedagog scoped, delete revokes access.
- Aktivitetsbilder (`family_image`, `uploads/`) påverkas **inte** — endast avatar-prefix.

---

## Out of scope (v1)

- Fullständig vuxenprofilsida
- Redigera andra vuxnas bilder
- Servergenererade miniatyrer
- Uppladdningsknapp per rad i familjelistan
