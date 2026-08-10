# Family Device Architecture — normativ spec

**Status:** PRODUCT DECISION **GO** (2026-08-10)  
**Scope:** Betrodd enhet, cold start, barn-/vuxenläge, widget-paritet  
**Relaterat:** [ADR-022](adr/ADR-022-family-device-architecture.md), [ADR-019](adr/ADR-019-trusted-child-device.md) (R4.2-slice), [parent-session-handoff.md](parent-session-handoff.md), [r45-widget-native.md](r45-widget-native.md)  
**POS:** Constitution 1–5, `04` C-01/C-08, `15` routine path &lt;200ms perceived  
**Feature flag (rollout):** `trusted_device_v1` (+ widget flags efter Fas 5)

> **FREEZE:** UX-modellen i detta dokument ska inte öppnas för parallella varianter under widget-/entry-arbete. Nya features bygger på samma mental modell: **familjeapp på betrodd enhet**, inte två appar med två inloggningar.

---

## 1. Produktbeslut (definitiva)

| # | Beslut |
|---|--------|
| 1 | Familjeappen är en **familjeapp på en betrodd enhet** — inte två separata appar/inloggningar. |
| 2 | **Barnläge kräver normalt ingen PIN.** |
| 3 | **Barn → vuxen** är den enda verkliga säkerhetsgränsen i vardagen (biometri eller vuxen-PIN). |
| 4 | **Barn A → barn B** är profilbyte, inte login/logout. |
| 5 | **Ett barn + delad mobil** → direkt till barnets Idag. |
| 6 | **Flera barn + delad mobil** → stor profilväljare (inte login-skärm). |
| 7 | **Förälderns egen mobil** → direkt vuxenvy vid cold start. |
| 8 | **Barnets egen enhet** → direkt bundet barn. |
| 9 | **Widgeten** använder samma child scope som appens barnläge. |
| 10 | **Wrong-child fail closed** — hellre extra val än completion på fel barn. |

### 1.1 Mätbara 10/10-krav

| Situation | Krav |
|-----------|------|
| Delad mobil, ett barn | 0 koder, 0 val → barnvy |
| Delad mobil, flera barn | 1 tryck på barnprofil |
| Barn → vuxen | 1 tryck + biometri (eller vuxen-PIN) |
| Vuxen → ett barn | 1 tryck |
| Vuxen → flera barn | 2 tryck |
| Återöppna app nästa dag | Ingen vanlig login |
| Barnets egen mobil | Alltid rätt barn |
| Widget | Alltid synligt vilket barn |
| Widget-checkoff | 0 risk fel barn |
| Logout familj | Endast från vuxeninställningar |

---

## 2. Tre begrepp — håll isär

**Device role ≠ view context ≠ credential context.**

| Begrepp | Syfte | Värden (normativt) |
|---------|--------|---------------------|
| **Device role** (`device_mode`) | Hur **den här fysiska enheten** ska bete sig vid cold start | `parent` · `shared` · `child` |
| **View context** | Vad UI visar just nu | `parent` · `child:<child_id>` · `picker` |
| **Credential context** | Vilket token som får anropa API | `parent` · `child:<child_id>` · `none` |

### 2.1 Regler

1. **Credential styr authz** — UI får aldrig visa vuxenfunktioner med endast `child`-credential, även om `DeviceMode` i localStorage säger `parent`.
2. **Device role styr cold start** — efter giltig device identity ska entry-orchestratorn inte överprövas av gammal `localStorage`, gammal `/child-login`-state eller handoff-cookie i isolation.
3. **View context** får ligga i `picker` med `credential_context: none` tills barn valts (shared, flera barn).
4. **Privilege escalation** (barn → vuxen) byter credential till `parent` för en **begränsad privilegieperiod** — inte permanent om enheten är `shared` eller `child`.

### 2.2 Server canonical record

Sanningen om enheten ligger i `family_trusted_device` (och relaterade cookies/tokens). Klienten får **cachea** men inte **hitta på**.

| Fält | Betydelse |
|------|-----------|
| `device_id` | UUID rad |
| `family_id` | Familj |
| `device_mode` | `parent` \| `shared` \| `child` |
| `default_child_id` | Bundet barn (`child` mode) eller default på shared (valfritt) |
| `last_active_child_id` | Senast valt barn på shared (restore-hint) |
| `allowed_children` | Härleds vid runtime från enrollande förälder + authz (inte egen kolumn idag) |
| `revoked_at` | NULL = aktiv |

**Klientcache:** får spegla `device_mode`, `default_child_id`, `last_active_child_id`, `allowed_children` från `GET /api/auth/trusted-device/context` efter restore — TTL kort, invalideras vid revoke/401/flag off.

**Förbjudet:** `DeviceMode` i localStorage som enda källa för cold start (idag `public/js/device-mode.js`).

---

## 3. Entry state machine (enda beslutsfattare)

Inga parallella “beslutsfattare”: `app-entry`, `trusted-device-bootstrap`, session restore, `DeviceMode`, `SessionGate` och handoff får **inte** var och en navigera oberoende. De ska anropa **en** orchestrator.

```text
APP START
   │
   ▼
Finns giltig familje-/device identity?
   │
   ├── Nej ──► Parent login / första enhets-setup
   │
   └── Ja
        │
        ▼
    Läs device_mode (server)
        │
 ┌──────┼──────────┐
 │      │          │
parent shared     child
 │      │          │
 ▼      ▼          ▼
Parent  1 barn?   Bound child
Home    │          Home
        │
      ┌─┴──┐
      │    │
     Ja   Nej
      │    │
      ▼    ▼
    Child Profile
    Home  Picker
```

### 3.1 Orchestrator-kontrakt (Fas 2)

```js
// Konceptuellt — implementation: `src/lib/app-entry-resolve.js` (Fas 2A ren resolver); Fas 2B kopplar bootstrap/gates.
resolveAppEntry({
  parentSession,      // null | { valid, user }
  trustedDevice,      // null | { device_mode, default_child_id, last_active_child_id, allowed_children, revoked }
  childSession,       // null | { valid, childId }
  deepLink,           // optional { childId, activityId, source: 'widget'|'push'|'url' }
})
```

**Returnerar exakt ett beslut** (ingen sidoeffekt i orchestratorn):

```js
{
  destination: 'parent-home' | 'child-home' | 'profile-picker' | 'parent-login' | 'device-setup',
  childId: string | null,
  deviceMode: 'parent' | 'shared' | 'child' | null,
  viewContext: 'parent' | 'child' | 'picker',
  credentialContext: 'parent' | 'child' | 'none',
  reason: string,           // telemetri / debug
  serverAction: 'restore-parent' | 'restore-child' | 'select-child' | 'none' | 'enroll-prompt',
}
```

**Ordning vid cold start:**

1. Om `trusted_device` cookie + flag ON → server context/restore **före** client-only gissningar.
2. Deep link/widget: `childId` måste ∈ `allowed_children` och matcha widget binding — annars `profile-picker` eller fail closed.
3. `SessionGate` får endast **tillämpa** redan fattat `view_context`, inte omvända entry-beslut.
4. Handoff (`stjarndag_parent_session`) är **legacy path** för parent↔child-byte under migration; mål är privilege API (Fas 3), inte logout-loop.

### 3.2 Enhets-setup (engång, intelligent default)

Efter första lyckade parent-login på enheten — **inte** vid varje start:

| Familj | Fråga |
|--------|--------|
| 1 barn | “Ska Familjeappen öppna direkt för [namn] på den här mobilen?” Ja / Nej, min vuxenmobil |
| Flera barn | “Hur ska appen öppnas?” Vuxenvy · Välj barn · [barnkort] |

Persistens: uppdatera `family_trusted_device` (`device_mode`, `default_child_id`). Ändras under **Inställningar → Den här enheten → Startläge**.

---

## 4. Beteende per device_mode

### 4.1 `parent` — förälderns egen mobil

| Cold start | Vuxenvy (`/dashboard` / magic home) |
| Bakgrund | Vuxenläge kvar; känsliga ytor kan kräva biometri igen (valfritt steg 2) |
| Barnläge | Förälder trycker **Barnläge** → `child:<id>` utan barn-PIN |
| Auto-lock till barn | **Nej** — ska inte kasta förälder till Astrid efter 5 min SMS |

**Implementation gap (2026-08-10):** DB tillåter `device_mode = 'parent'` men enroll/restore för parent-first är **inte** komplett i `src/lib/trusted-device.js` (endast `child` + `shared`). Fas 2/3 ska slutföra detta eller dokumentera ekvivalent parent refresh lineage.

### 4.2 `shared` — delad familjemobil

| Barn i familjen | Cold start |
|-----------------|------------|
| 1 | `child-home` direkt |
| 2+ | `profile-picker` (stora kort + **Vuxen 🔒**) |

| Händelse | Beteende |
|----------|----------|
| Barn → vuxen | Biometri / vuxen-PIN → `credential: parent` (privilegieperiod) |
| Privilegieperiod slut / app i bakgrund (policy) | Parent credential låses; återgå till `default_child` eller picker |
| Barn A → B | `select-child` / picker — **inte** logout |

### 4.3 `child` — barnets egen enhet

| Cold start | Alltid `child-home` för `default_child_id` |
| Vuxen 🔒 | Biometri → vuxenvy under privilegieperiod |
| Byt barn | Döljs om endast ett barn på enheten |

---

## 5. Säkerhet & credentials

### 5.1 Barn → vuxen (enda dagliga säkerhetsgränsen)

1. Användaren trycker **Vuxen 🔒** i barnvy.
2. **Biometri först** (native); fallback **vuxen-PIN** (app-lås, ≠ barn-PIN).
3. Vid lyckad unlock: **aktivera giltig parent session** (refresh/access från säker lagring + servervalidering där det krävs).
4. **Inte:** parent-token aktivt medan barn-UI visas.

### 5.2 Offline (medvetet avgränsat v1)

| Aktör | Offline |
|-------|---------|
| Barn | Befintliga offline-köer för completion (oförändrat scope) |
| Vuxen | Biometri får visa **read-only** eller blockerad vy; **state-changing parent-API** kräver anslutning med tydlig copy |

**Ingen** generell offline-administration i v1.

### 5.3 Wrong-child

- Deep link / widget / push utan verifierad `childId` → picker eller fel — **aldrig** gissa aktiv profil.
- Köade offline-operationer bär `{ childId, operationId, timestamp }` — appliceras inte på “nuvarande profil” vid sync.
- Nytt barn i familjen ändrar **inte** befintlig widgets `childId`.
- Barn borttaget → revoke widget binding + child credentials för det barnet.

---

## 6. Widget-paritet

Widget är **alternativ klient** till barnläge, inte separat auth-värld.

```text
installationId / widgetInstanceId
        │
        ▼
    childId (fast bunden)
        │
        ▼
child-scoped completion API (samma som app)
```

| Regel | Detalj |
|-------|--------|
| Binding | Per widget-instans → `childId` (se `WidgetBindingScope`) |
| App ≠ widget global state | Appens `last_active_child_id` får **inte** omskriva widgetens barn |
| UI | Barnets namn/avatar alltid synligt vid checkoff |
| Revoke enhet | Dödar app + widget |

Befintlig kod: `plugins/capacitor-widget-bridge`, `src/routes/widget.js`, `public/js/widget-bridge-provision.js`.

---

## 7. UX — barnspråk vs vuxenspråk

### 7.1 Barn ska inte möta kontobegrepp

**Tillåtet i barnvy:** barnnamn, **Byt barn** (om flera), **Vuxen 🔒**.

**Ej i normal barnvy:** Logga ut, Login, Session, Konto, “PIN krävs för åtkomst” som standardväg.

### 7.2 Vuxen — en plats för enheten

**Inställningar → Den här enheten**

Exempel:

- Startar som: **Astrid**
- Användning: **Delad med barn**
- Barn på enheten: **Astrid**
- Vuxenåtkomst: **Face ID**
- Widgetar: **Astrid · 2**
- **Ändra startläge** · **Ta bort denna enhets åtkomst**

Support och revoke ska kunna hanteras här utan att “logga ut hela familjen”.

---

## 8. Mapping mot befintlig kod (R4)

| Område | Idag | Mål |
|--------|------|-----|
| Trusted device DB | `family_trusted_device`, modes child/shared | + parent enroll/restore |
| Restore | `POST /api/auth/trusted-device/restore`, `select-child` | Orchestrator anropar; single-child shared auto |
| Context | `GET /api/auth/trusted-device/context` | Canonical cache input |
| Handoff | `parent_session_handoff`, PIN picker | Ersätts gradvis av privilege unlock (Fas 3) |
| Entry UI | `app-entry.js` rollval | Setup endast; inte daglig start |
| Barn entry | `/child-login` + PIN | Legacy; ej vardagsväg |
| Client hint | `device-mode.js`, `session-gate.js` | Följer orchestrator-beslut |
| Widget | R4.5 engineering complete, flags OFF | Fas 5 efter entry + unlock |
| Flag | `trusted_device_v1` default OFF | Pilot → bred ON efter Fas 4 DoD |

---

## 9. Implementationsfaser

### Fas 1 — Lås kontraktet ✅ (detta dokument)

**Leverans:**

- [x] Normativ spec (denna fil)
- [x] ADR-022 PRODUCT GO
- [ ] Kontraktstester som **beskriver** orchestrator I/O (kan börja röda innan implementation)

**DoD:** Team refererar endast denna modell i PR:ar för entry/widget/session; inga nya parallella UX-förslag.

---

### Fas 2 — Entry orchestrator

**Fas 2A (denna PR-typ):** ren `resolveAppEntry()` i `src/lib/app-entry-resolve.js` + beslutsmatris + invariants (ingen navigation, ingen UI).

**Fas 2B:** koppla `TrustedDeviceBootstrap`, Auth restore, `SessionGate`, `app-entry` till resolvern.

**Mål:** En funktion bestämmer cold start; inget annat modul får `location.replace` på grund av device identity utan orchestrator.

**Arbete:**

1. Ny `public/js/app-entry-orchestrator.js` (+ tunna adapters för bootstrap/restore).
2. Slutför **parent** `device_mode`: enroll + cold restore till parent home (eller tydlig regel med parent refresh only).
3. `GET /api/auth/trusted-device/context` → standard första anrop vid appstart (native + web).
4. Refaktor: `TrustedDeviceBootstrap.tryColdStart`, `app-entry.js`, `native-child-session-restore.js` anropar orchestrator.
5. `SessionGate` tar `view_context` från orchestrator-resultat (event eller session snapshot), inte egen localStorage-läsning första gången.
6. Enhets-setup UI kopplad till enroll endpoints (`/trusted-devices/child`, `/shared`, framtida `/parent`).

**DoD:**

- Integrationstest: shared 1 barn / 2 barn / child device / parent device cold start.
- Inga regressioner i `test:gate`.
- Telemetri: `app_entry_resolved` med `destination`, `device_mode`, `reason`.

**Flag:** `trusted_device_v1` ON för pilotfamiljer.

---

### Fas 3 — Vuxen 🔒 (privilege escalation)

**Mål:** Barn → vuxen utan logout/login; shared device återgår säkert efter privilegieperiod.

**Arbete:**

1. Native biometri (Capacitor) + vuxen-PIN fallback (app-lås, se `docs/plattform-webb-ios-android.md` §3).
2. Säker lagring av parent refresh/material för unlock — **inte** “UI unlock only”.
3. API eller befintlig handoff utökad till **privilege session** med TTL; på `shared`/`child` device: auto-drop parent credential vid timeout/background (policy per device_mode).
4. Barnvy: **Vuxen 🔒** ersätter dörr-ikon/PIN-vägar som primär escalation.

**DoD:**

- Barn kan inte nå parent API med child JWT (befintliga authz-tester gröna).
- Shared device: efter timeout inte kvar i vuxenläge.
- Parent device: förälder inte tvingad till barnvy efter bakgrund.

**Ej i scope:** offline parent administration.

---

### Fas 4 — Ta bort gammal produktmodell (UX)

**Mål:** Användaren möter inte längre dual-login i vardagen.

**Bort från normal UX (behåll endpoints för migration):**

| Element | Ersättning |
|---------|------------|
| “Jag är vuxen / Jag är barn” varje start | Orchestrator + enhets-setup |
| `/child-login` som vardagsväg | Trusted restore + picker |
| Obligatorisk barn-PIN | Opt-in syskonspärr |
| Logga ut i barnvy | Endast vuxeninställningar |
| Logout → login för profilbyte | `select-child` / picker |
| PIN-picker för byte barn på trusted shared | Profilkort |

**Arbete:**

- Uppdatera `docs/BARNAPP-INLOGGNING-GUIDE.md`, landning/copy, child header (`child-system-menu.js`).
- Tester: uppdatera contract tests som **förväntar** logout i barnvy.
- `app-entry` v2: barn-roll endast för legacy URL / ej trusted.

**DoD:**

- Founder QA-scenario (Emma): delad mobil, ett barn, 0 PIN, Vuxen 🔒 → Face ID.
- Constitution test (15) på morgonstress-path.

---

### Fas 5 — Widget (efter Fas 2–4)

**Mål:** Widget = snabbaste vägen till samma barnläge; ingen extra auth-modell.

**Arbete:**

1. Verifiera `installationId` → `childId` oförändrat vid app profile switch.
2. Deep link från widget till `child-home` + aktivitet.
3. Inställningar → Den här enheten visar widgetantal per barn.
4. Rollout `widget_completion_enabled` / `native_widget_enabled` efter entry stabil.

**DoD:**

- `test/r45-*` + manuell pilot: checkoff fel barn omöjligt.
- App utan widget känns identisk (samma barnvy).

---

## 10. Rollout & risk

| Risk | Mitigation |
|------|------------|
| Flera entry-beslutsfattare | Fas 2 orchestrator; code review blockar ny `location.replace` i bootstrap |
| localStorage vs server | Context endpoint canonical |
| Handoff-race | Orchestrator + privilege API; minska logout-vägar |
| Wrong-child | Fail closed; tester för deep link + offline queue |
| Flag OFF i prod | Pilot overrides; comms innan bred ON |

**Ordning:** `trusted_device_v1` pilot **före** bred widget — annars widget utan enkel app-fallback.

---

## 11. Analytics (minimum)

| Event | När |
|-------|-----|
| `app_entry_resolved` | Efter orchestrator |
| `device_setup_completed` | Enhets-setup |
| `adult_privilege_unlock` | Lyckad Vuxen 🔒 |
| `adult_privilege_expired` | Timeout/shared |
| `shared_device_child_selected` | Picker (finns delvis) |
| `child_context_restore` | Trusted restore (finns) |
| `wrong_child_prevented` | Avvisad deep link/widget |

---

## 12. Öppna tekniska punkter (ägare: engineering)

1. **Parent device enroll** — ny endpoint vs återanvänd parent refresh utan `trusted_device` child restore competing.
2. **Privilegieperiod TTL** — exakta sekunder per `device_mode` (shared vs child vs parent).
3. **Web biometri** — WebAuthn begränsningar; vuxen-PIN som primär på web PWA.
4. **ADR-019 “Not in this slice”** — superseded av ADR-022 för shared/parent/widget.

---

*Senast uppdaterad: 2026-08-10 · PRODUCT DECISION GO · FREEZE UX MODEL*
