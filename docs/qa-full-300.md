# Fullständig QA — Min Stjärndag (300 kontrollpunkter)

> **Status:** Ej påbörjad — dokumentet är en körbar checklista, inte en automatisk testkörning.  
> **Version:** 1.0 · 2026-06-01  
> **Omfattning:** Webb (desktop + mobil), PWA, iOS native, Android native (där markerat), admin.

---

## Så här använder du checklistan

| Fält | Värde |
|------|--------|
| **Kör-ID** | `QA-YYYY-MM-DD-###` (fyll i vid start) |
| **Miljö** | `staging` / `production` / `local` |
| **Build / SW** | t.ex. `sw.js` cache-version |
| **Utförare** | Namn eller agent-ID |
| **Godkänd tröskel** | 0 blockerande (P0), ≤5 P1 öppna med plan |

**Prioritet:** P0 = blockerande · P1 = viktigt · P2 = mindre · P3 = kosmetiskt

**Plattformskolumn i rubriker:** 🌐 = webb · 📱 = mobil webb · 🍎 = iOS · 🤖 = Android · 🔧 = admin

Markera varje punkt: `[ ]` ej testad · `[x]` godkänd · `[!]` underkänd (notera QA-ID i buggticket)

---

## A. Testmiljö och förberedelse (QA-001 – QA-005)

| ID | P | Kontrollpunkt |
|----|---|---------------|
| QA-001 | P0 | Testmiljö är dokumenterad (URL, DB-miljö, e-post fångas i sandbox) |
| QA-002 | P0 | Minst ett testkonto: förälder med `primary`-roll och minst ett barn |
| QA-003 | P0 | Minst ett testkonto: `shared`-förälder med delmängd av barn (per-barn-inbjudan) |
| QA-004 | P1 | Minst ett testkonto: `pedagog`-roll med endast tilldelade barn |
| QA-005 | P1 | Rensad webbläsardata / ny app-installation finns tillgänglig för “första gången”-flöden |

---

## B. Landningssidor och offentligt innehåll (QA-006 – QA-015)

| ID | P | Kontrollpunkt |
|----|---|---------------|
| QA-006 | P1 | `/` (index) laddar utan JS-fel i konsolen |
| QA-007 | P2 | Landningssidans CTA leder till registrering eller inloggning |
| QA-008 | P1 | `/en` engelsk landning visas korrekt på mobil och desktop |
| QA-009 | P2 | `/en-thank-you` visas efter engelsk waitlist-signup |
| QA-010 | P1 | `/pedagoger-och-terapeuter` formulär validerar obligatoriska fält |
| QA-011 | P1 | Intresseformulär sparas (bekräftelse / inget dubbel-submit) |
| QA-012 | P1 | `/privacy` och `/terms` är länkbara från registrering |
| QA-013 | P2 | Dagens nyhet (om publicerad) visas på landning där `show_landing` är satt |
| QA-014 | P2 | Offline-sida `/offline` visas när nätverk saknas (PWA) |
| QA-015 | P3 | Favicon, titel och meta-beskrivning är rimliga på huvudsidor |

---

## C. Registrering och inloggning — vuxna (QA-016 – QA-035)

| ID | P | Kontrollpunkt |
|----|---|---------------|
| QA-016 | P0 | Ny registrering med e-post + lösenord skapar `parent` + `family` |
| QA-017 | P0 | Verifieringsmail skickas (eller loggas i testmiljö) |
| QA-018 | P0 | `/verify-email` med giltig token verifierar kontot |
| QA-019 | P0 | Overifierat konto kan inte nå skyddade sidor |
| QA-020 | P0 | Inloggning med korrekt e-post/lösenord sätter session (cookie) |
| QA-021 | P0 | Felaktigt lösenord ger tydligt fel utan att avslöja om e-post finns |
| QA-022 | P1 | `/forgot-password` skickar återställningslänk |
| QA-023 | P0 | `/reset-password` med giltig token sätter nytt lösenord |
| QA-024 | P1 | Utgången återställningslänk ger felmeddelande |
| QA-025 | P0 | 🍎 Apple Sign In — ny användare skapar konto och familj |
| QA-026 | P0 | 🍎 Apple Sign In — befintlig användare loggas in till rätt familj |
| QA-027 | P1 | 🍎 Apple ID redan kopplat till annat konto → fel, ingen datasläpp |
| QA-028 | P1 | Utloggning rensar session och redirect till `/login` |
| QA-029 | P0 | `/login` redirectar inloggad användare till dashboard |
| QA-030 | P1 | Rate limit på inloggning ger 429 utan att krascha UI |
| QA-031 | P2 | “Kom ihåg mig” / lång session — stäng flik, öppna igen inom TTL |
| QA-032 | P1 | CSRF-token hämtas och skickas på muterande `/api`-anrop |
| QA-033 | P0 | Muterande API utan CSRF returnerar 403 |
| QA-034 | P1 | Barn-JWT kan inte anropa vuxen-endpoints (`/api/family/*` m.fl.) |
| QA-035 | P1 | Vuxen kan inte använda barn-only endpoints utan barn-session |

---

## D. Session, refresh och säkerhet (QA-036 – QA-050)

| ID | P | Kontrollpunkt |
|----|---|---------------|
| QA-036 | P0 | Access token förnyas via `/api/auth/refresh` innan utgång |
| QA-037 | P0 | Utgången access token → refresh → fortsatt arbete utan omdirigering |
| QA-038 | P0 | Ogiltig refresh token → redirect till login |
| QA-039 | P1 | Samtidiga flikar delar session korrekt |
| QA-040 | P1 | `httpOnly` cookies används (ej läsbara via `document.cookie` för auth) |
| QA-041 | P0 | `parent_child` med `revoked_at` ger inte åtkomst till barnets data |
| QA-042 | P0 | Direkt API-anrop med annat `child_id` än länkat → 403 |
| QA-043 | P1 | XSS: användarnamn med `<script>` renderas escaped i UI |
| QA-044 | P1 | Security headers (CSP/HSTS där aktuellt) returneras på HTML |
| QA-045 | P2 | Maintenance mode visar underhållssida för icke-admin |
| QA-046 | P1 | Admin under impersonation kan inte skriva (blockImpersonationWrites) |
| QA-047 | P2 | Request-ID finns i felrespons för felsökning |
| QA-048 | P1 | Global rate limiter träffar inte statiska `.js`/`.css` i onödan |
| QA-049 | P1 | `/api/admin/*` och `/api/auth/refresh` undantas från aggressiv global limit |
| QA-050 | P2 | Barn-PIN hash lagras inte i klartext i API-svar |

---

## E. Onboarding och wizards (QA-051 – QA-065)

| ID | P | Kontrollpunkt |
|----|---|---------------|
| QA-051 | P0 | Ny familj: onboarding steg 1–6 kan slutföras utan JS-krasch |
| QA-052 | P0 | Steg 1: barn + standardschema (förskola/skola) sparas |
| QA-053 | P1 | Steg 2: barnvy-förhandsvisning visas |
| QA-054 | P1 | Steg 3: schemaförhandsgranskning matchar val |
| QA-055 | P1 | Steg 4: tre belöningar skapas |
| QA-056 | P0 | Steg 5: barn-PIN sätts (4 siffror) |
| QA-057 | P1 | Steg 6: medförälder-inbjudan kan skickas eller hoppas över |
| QA-058 | P0 | Efter onboarding: `onboarding_completed` → redirect till dashboard |
| QA-059 | P0 | `/onboarding?flow=add-child` fungerar för befintlig familj |
| QA-060 | P1 | Emoji-rutnät laddas (ingen evig “Laddar scheman…”) |
| QA-061 | P1 | Mallgrupper för aktiviteter laddas i onboarding |
| QA-062 | P2 | Progressindikator uppdateras per steg på mobil |
| QA-063 | P2 | Tillbaka-knapp behåller ifylld data inom samma session |
| QA-064 | P1 | Avbruten onboarding mitt i flöde → kan återupptas eller börja om |
| QA-065 | P2 | `child-wizard` / `assign-schedule` länkar fungerar från dashboard-CTA |

---

## F. Dashboard och navigation — förälder (QA-066 – QA-080)

| ID | P | Kontrollpunkt |
|----|---|---------------|
| QA-066 | P0 | `/dashboard` laddar barnlista för inloggad förälder |
| QA-067 | P0 | Endast barn med aktiv `parent_child`-länk visas |
| QA-068 | P1 | Barnkort visar namn, emoji och ev. avatar |
| QA-069 | P1 | Streak-indikator visas när streak finns |
| QA-070 | P1 | Hamburger-/sidomeny: Scheman, Belöningar, Rapporter, Inställningar |
| QA-071 | P1 | 📱 Mobil: meny öppnas/stängs utan att blockera innehåll |
| QA-072 | P1 | “Byt till barnvy” finns per barn |
| QA-073 | P1 | “Lägg till barn” navigerar till onboarding/add-child |
| QA-074 | P2 | Systemmeddelanden (admin) visas och kan markeras lästa |
| QA-075 | P2 | Enkät-popup respekterar snooze (3 dagar) |
| QA-076 | P1 | Pedagog-only konto: begränsad navigation (ingen familjeadmin) |
| QA-077 | P1 | `preferred_view_mode` pedagog → pedagog-översikt där applicerbart |
| QA-078 | P2 | `/v2/dashboard` (om feature-flag) laddar utan regression mot v1 |
| QA-079 | P2 | Notifikationsikon visar olästa från `notification_log` |
| QA-080 | P3 | Dashboard CTA för medförälder-inbjudan visas när relevant |

---

## G. Barnhantering — förälder (QA-081 – QA-095)

| ID | P | Kontrollpunkt |
|----|---|---------------|
| QA-081 | P0 | Skapa barn: namn + emoji obligatoriskt |
| QA-082 | P1 | Redigera barn: namn, emoji, födelsedatum |
| QA-083 | P1 | Ladda upp barn-avatar (R2/Polsia) — bild visas i UI |
| QA-084 | P2 | Avatar-fallback: bild → emoji → ⭐-placeholder |
| QA-085 | P1 | `/child-settings` sparar `child_view_config` |
| QA-086 | P1 | Synlighetselement i barnvy styrs av config |
| QA-087 | P0 | Radera barn (soft delete) kräver bekräftelse |
| QA-088 | P0 | Endast `primary` kan radera barn (shared/pedagog nekas) |
| QA-089 | P1 | PIN-ändring från inställningar kräver nuvarande PIN |
| QA-090 | P1 | Ny PIN måste bekräftas (match) |
| QA-091 | P2 | Barn med `view_type` / användarnamn för child-login |
| QA-092 | P1 | Flera barn: väljare byter aktivt barn på schema/daglogg |
| QA-093 | P2 | `family-week` visar vecka för vald familj/barn |
| QA-094 | P2 | Kalender `/calendar` visar schemahändelser |
| QA-095 | P3 | Barns ålder/ födelsedag visas korrekt med familjens tidszon |

---

## H. Barnlogin och barnvy (QA-096 – QA-115)

| ID | P | Kontrollpunkt |
|----|---|---------------|
| QA-096 | P0 | `/child-login` utan föräldersession: manuellt namn + PIN fungerar |
| QA-097 | P0 | Med föräldersession: barnlista visas, välj barn → PIN |
| QA-098 | P0 | Korrekt PIN → `/child-dashboard` eller motsvarande barnvy |
| QA-099 | P0 | Fel PIN → felmeddelande, ingen inloggning |
| QA-100 | P0 | 3 fel PIN → 30 s låsning (`pin_lockout`) |
| QA-101 | P1 | Efter låsning: inloggning fungerar igen |
| QA-102 | P1 | Förälder får e-post vid upprepade PIN-fel (cooldown respekteras) |
| QA-103 | P0 | Barnvy visar dagens schema med sektioner (fm/em/kväll) |
| QA-104 | P0 | Avklara aktivitet → stjärna ökar i barnvy |
| QA-105 | P1 | Avmarkera aktivitet (om tillåtet) → stjärna minskar |
| QA-106 | P1 | “Byt tillbaka till förälder” kräver PIN eller parental gate |
| QA-107 | P1 | Barn kan inte nå `/settings`, `/family`, admin |
| QA-108 | P2 | Barn selfie/profilbild i barnläge (om aktiverat) |
| QA-109 | P1 | `/skattkammaren` (barn) visar belöningar och saldo |
| QA-110 | P1 | Lös in belöning i barnvy med tillräckligt saldo |
| QA-111 | P0 | Otillräckligt saldo → tydligt fel, ingen debitering |
| QA-112 | P2 | `/v2/child` parity med v1 barnvy (om flaggad) |
| QA-113 | P1 | Device mode / sparad föräldersession: “Jag är vuxen” → gate |
| QA-114 | P2 | Barn logout rensar barn-session men kan behålla device-läge |
| QA-115 | P3 | Barnvy animationer/feedback vid stjärna (ingen layout shift) |

---

## I. PIN, audit och parental gate (QA-116 – QA-125)

| ID | P | Kontrollpunkt |
|----|---|---------------|
| QA-116 | P1 | `pin_audit_log` får poster vid försök/låsning |
| QA-117 | P1 | Förälder kan låsa upp barn-PIN från inställningar (primary) |
| QA-118 | P2 | Parental gate: biometri på native (om konfigurerat) |
| QA-119 | P1 | Parental gate: app-lås-PIN på enhet |
| QA-120 | P1 | Parental gate fallback: full re-auth |
| QA-121 | P2 | Håll inne 3 sek på dörr-ikon → gate (om implementerat) |
| QA-122 | P1 | Barn-PIN ≠ förälder app-lås-PIN |
| QA-123 | P2 | PIN-notifikation skickas max en gång per cooldown-period |
| QA-124 | P3 | PIN-input maskerar siffror |
| QA-125 | P2 | Låst barn kan inte bypassa via direkt URL till barn-dashboard |

---

## J. Scheman och aktiviteter (QA-126 – QA-150)

| ID | P | Kontrollpunkt |
|----|---|---------------|
| QA-126 | P0 | `/schedule` laddar veckoschema för valt barn |
| QA-127 | P0 | Sju veckodagar visas med aktiviteter och tider |
| QA-128 | P0 | Lägg till aktivitet från familjebibliotek |
| QA-129 | P1 | Lägg till aktivitet från standardbibliotek (admin-mallar) |
| QA-130 | P1 | Skapa egen aktivitet (`activity_template`, source=user) |
| QA-131 | P1 | Redigera aktivitet: namn, tid, ikon, sub_steps |
| QA-132 | P0 | Ta bort aktivitet från dag — “bara denna dag” (`schedule_date_exclusion`) |
| QA-133 | P1 | Ta bort aktivitet från hela veckan |
| QA-134 | P1 | Dra-och-släpp ändrar ordning (desktop) |
| QA-135 | P2 | 📱 Touch: ändra ordning utan att trigga scroll-fel |
| QA-136 | P1 | Namngivet veckomall sparas och kan appliceras |
| QA-137 | P1 | Kopiera schema till annan veckodag |
| QA-138 | P1 | Särskild dag (`special_day_schedule`) för valt datum |
| QA-139 | P1 | Särskild dag överstyr vanligt schema den dagen |
| QA-140 | P1 | Dagen efter särskild dag → återgår till veckoschema |
| QA-141 | P1 | `fill-week` / bulk-fyllning fungerar |
| QA-142 | P2 | `/activities` bibliotek: lista, sök, filtrera |
| QA-143 | P2 | `/library` standardaktiviteter och belöningar |
| QA-144 | P1 | Kategorier för aktiviteter visas korrekt |
| QA-145 | P2 | Retroaktivt schema: ändring påverkar inte felaktigt gamla loggar |
| QA-146 | P1 | Familjens tidszon påverkar “dagens” gräns korrekt |
| QA-147 | P2 | Sektionstider (fm/em/kväll) följer `family`-inställningar |
| QA-148 | P1 | Pedagog kan se schema för tilldelat barn |
| QA-149 | P1 | Pedagog kan inte redigera schema om policy säger nej |
| QA-150 | P2 | Schema-API returnerar 402 om prenumeration krävs (betalfamilj) |

---

## K. Daglogg och stjärnor (QA-151 – QA-165)

| ID | P | Kontrollpunkt |
|----|---|---------------|
| QA-151 | P0 | `/daily-log` visar dagens poster för valt barn |
| QA-152 | P0 | Markera aktivitet klar i daglogg → `daily_log_item` + stjärnor |
| QA-153 | P1 | `completed_date` stödjer retroaktiv inmatning |
| QA-154 | P1 | Manuell stjärna (extra) kan ges av förälder |
| QA-155 | P1 | Ta bort manuell stjärna |
| QA-156 | P1 | Bilduppladdning vid manuell stjärna (om UI finns) |
| QA-157 | P0 | Stjärnsaldo i daglogg matchar barnvy |
| QA-158 | P1 | Toast vid API-fel visar HTTP-status + meddelande |
| QA-159 | P1 | Daglogg för pedagog-only: endast tilldelade barn |
| QA-160 | P2 | Streak uppdateras vid tillräcklig aktivitet |
| QA-161 | P2 | Streak bryts enligt affärsregler |
| QA-162 | P1 | Sub_steps på aktivitet kan bockas individuellt |
| QA-163 | P2 | Filter: idag / annat datum |
| QA-164 | P2 | Export till rapport från daglogg |
| QA-165 | P3 | Tom daglogg visar tom-state, inte evig spinner |

---

## L. Belöningar — Skattkammaren (QA-166 – QA-180)

| ID | P | Kontrollpunkt |
|----|---|---------------|
| QA-166 | P0 | `/skattkammaren-parent` listar familjens belöningar |
| QA-167 | P0 | Skapa belöning: namn, stjärnkostnad, emoji |
| QA-168 | P1 | Redigera belöning |
| QA-169 | P1 | Ta bort belöning med bekräftelse |
| QA-170 | P1 | Importera från `default_reward` bibliotek |
| QA-171 | P0 | Inlösen drar av stjärnor atomiskt |
| QA-172 | P1 | Inlösenhistorik visas för förälder |
| QA-173 | P1 | Barn kan inte skapa/redigera belöningar |
| QA-174 | P2 | Filtrera: tillgängliga / inlösta |
| QA-175 | P2 | Belöning med kostnad 0 (om tillåtet) fungerar |
| QA-176 | P1 | Samtidig inlösen (dubbelklick) ger inte dubbel debitering |
| QA-177 | P2 | Push vid ny belöning (om konfigurerat) |
| QA-178 | P2 | Belöningssida fungerar offline med tydlig begränsning |
| QA-179 | P3 | Emoji/ikon renderas konsekvent parent vs barn |
| QA-180 | P2 | Admin-bibliotek (`default_reward`) synkas till familj vid val |

---

## M. Rapporter och observationer (QA-181 – QA-195)

| ID | P | Kontrollpunkt |
|----|---|---------------|
| QA-181 | P1 | `/reports` laddar utan JS-fel |
| QA-182 | P1 | Aktivitetsflik: completion över datumintervall |
| QA-183 | P1 | Allmän observation (`child_observation`) per sektion |
| QA-184 | P1 | Familjenivå `general_observations` — skapa, arkivera, återställ |
| QA-185 | P1 | Pedagoganteckning `/pedagog-note` sparas per datum |
| QA-186 | P1 | Pedagoganteckning: humör, sömn, måltider (structured JSON) |
| QA-187 | P2 | Utkast (`is_draft`) vs publicerad pedagoganteckning |
| QA-188 | P1 | Professionell delningslänk: skapa med PIN och fältval |
| QA-189 | P0 | Delningslänk utan PIN ger inte data |
| QA-190 | P1 | Utgången länk (7d) nekas |
| QA-191 | P1 | Återkallad länk (`revoked_at`) nekas |
| QA-192 | P2 | `view_count` ökar vid visning |
| QA-193 | P2 | PDF/export (om finns) innehåller valda fält |
| QA-194 | P2 | Datumfilter from/to respekteras |
| QA-195 | P3 | Viktig-markering (`is_important`) syns i lista |

---

## N. Familj, inbjudan och medförälder (QA-196 – QA-207)

| ID | P | Kontrollpunkt |
|----|---|---------------|
| QA-196 | P0 | `/family` visar familjemedlemmar och inbjudningar |
| QA-197 | P0 | Skicka `family_invite` till e-post |
| QA-198 | P1 | Inbjudan med `childIds[]` — endast valda barn länkas |
| QA-199 | P0 | `/accept-invite` — befintlig användare accepterar |
| QA-200 | P0 | `/accept-invite` — ny användare skapar eget konto |
| QA-201 | P1 | Utgången inbjudan nekas |
| QA-202 | P1 | Primary kan ta bort shared-förälder / revoka länk |
| QA-203 | P2 | Familjenamn och tidszon redigeras (primary) |
| QA-204 | P1 | Shared kan inte bjuda in pedagog |
| QA-205 | P1 | `DELETE /api/family/delete-account` — GDPR-radering |
| QA-206 | P1 | Export data (`/api/account/export-data`) laddar ner JSON |
| QA-207 | P2 | Två föräldrar på olika adresser ser olika barnmängder korrekt |

---

## O. Pedagog och professionell (QA-208 – QA-219)

| ID | P | Kontrollpunkt |
|----|---|---------------|
| QA-208 | P0 | Primary skickar `pedagog_invite` med barn + e-post |
| QA-209 | P0 | `/pedagog-invite` accept skapar `parent_child` role=pedagog |
| QA-210 | P1 | Pedagog ser endast inbjudna barn i dashboard |
| QA-211 | P1 | `/pedagog-oversikt` lista och navigation |
| QA-212 | P1 | `requireNotPedagogOnly` blockerar familjeskapande för pedagog |
| QA-213 | P2 | Pedagog kan skriva observation, inte ändra barn-PIN |
| QA-214 | P2 | `connected_at` visas för pedagog-länk |
| QA-215 | P1 | Revokera pedagog → omedelbart ingen API-åtkomst |
| QA-216 | P2 | `account_type` educator/dual byter vy |
| QA-217 | P2 | Professionell rapport PIN — 5 försök rate limit |
| QA-218 | P3 | Pedagoger-landning CTA matchar inbjudningsflöde |
| QA-219 | P2 | Dual-account: växla parent/pedagog vy |

---

## P. Push och notifikationer (QA-220 – QA-231)

| ID | P | Kontrollpunkt |
|----|---|---------------|
| QA-220 | P1 | Web push: prenumeration registreras (`push_subscriptions`) |
| QA-221 | P1 | 🍎 Native push: token sparas med `platform=ios` |
| QA-222 | P1 | 🤖 Native push: token sparas med `platform=android` |
| QA-223 | P1 | Ogiltig APNs-token tas bort automatiskt |
| QA-224 | P1 | `/notifications` visar arkiv (7 dagar) |
| QA-225 | P2 | Markera notis som läst |
| QA-226 | P1 | Klick på push öppnar rätt URL i appen |
| QA-227 | P2 | Admin push till familj (`system_messages`) |
| QA-228 | P2 | Påminnelser (`reminders`) vid schemalagd tid |
| QA-229 | P2 | `admin_push_enabled` respekteras per förälder |
| QA-230 | P3 | Notis-badge rensas när alla lästa |
| QA-231 | P2 | Push avstängd — inga notiser men appen fungerar |

---

## Q. PWA, offline och native skal (QA-232 – QA-243)

| ID | P | Kontrollpunkt |
|----|---|---------------|
| QA-232 | P1 | Service worker registreras och cachar shell |
| QA-233 | P1 | Ny deploy: SW-version bump → användare får uppdatering |
| QA-234 | P2 | Offline: cached sidor visas, API visar fel |
| QA-235 | P1 | `platform-theme.js` injiceras i HTML |
| QA-236 | P2 | `platform-native.css` på native wrapper |
| QA-237 | P1 | 🍎 Safe area / notch — inget klippt innehåll |
| QA-238 | P2 | 🤖 Android back-knapp beteende konsekvent |
| QA-239 | P2 | Deep link till `/child-login` från hemskärm |
| QA-240 | P2 | Installera PWA (Add to Home Screen) |
| QA-241 | P1 | Capacitor Google Auth (Android) om konfigurerat |
| QA-242 | P2 | Ingen dubbel statusbar på iOS |
| QA-243 | P3 | Haptik vid stjärna (native, om aktiverat) |

---

## R. Prenumeration och betalning (QA-244 – QA-251)

| ID | P | Kontrollpunkt |
|----|---|---------------|
| QA-244 | P0 | `is_lifetime_free=true` familj blockeras inte av paywall |
| QA-245 | P0 | `requireActiveSubscription` använder `familyId` (camelCase) |
| QA-246 | P1 | Trial-familj: tillgång till trial_expires_at |
| QA-247 | P1 | Utgången trial → 402 eller upgrade-CTA |
| QA-248 | P1 | Stripe checkout skapar session |
| QA-249 | P1 | `/payment-success` och `/upgrade-success` efter köp |
| QA-250 | P2 | RevenueCat / IAP webhook (iOS) uppdaterar status |
| QA-251 | P2 | `/upgrade` sida visar korrekt pris och komponenter |

---

## S. Inställningar och konto (QA-252 – QA-261)

| ID | P | Kontrollpunkt |
|----|---|---------------|
| QA-252 | P1 | `/settings` alla sektioner laddar |
| QA-253 | P1 | Byta visningsnamn |
| QA-254 | P1 | Byta e-post: `/verify-email-change` flöde |
| QA-255 | P2 | Push-inställningar per typ |
| QA-256 | P1 | Nyhetsbrev opt-in/out (`email_subscriptions`) |
| QA-257 | P2 | `/tyck` feedback skickas |
| QA-258 | P1 | Samtycke `/consent` GDPR |
| QA-259 | P2 | Feature flags per familj (`family_features`) |
| QA-260 | P2 | Språk/landing — svenska standard |
| QA-261 | P3 | Logotyp och familjeavatar i header |

---

## T. Admin-panel (QA-262 – QA-286)

| ID | P | Kontrollpunkt |
|----|---|---------------|
| QA-262 | P0 | Admin-login separat från vanlig användare |
| QA-263 | P0 | Icke-admin får 403 på `/api/admin/*` |
| QA-264 | P1 | Familjer: lista, sök, paginering laddar |
| QA-265 | P1 | Familj: impersonation start/stop loggas i audit |
| QA-266 | P1 | Meddelanden till familj: skicka och lässtatus |
| QA-267 | P1 | Aktivitetsbibliotek (admin): CRUD på mallar |
| QA-268 | P1 | Belöningsbibliotek admin |
| QA-269 | P1 | Standardscheman admin |
| QA-270 | P2 | Dagens nyhet: draft → scheduled → published |
| QA-271 | P2 | Nyhetsbrev dispatch |
| QA-272 | P2 | E-postmallar (välkomst, win-back, undersökning) |
| QA-273 | P2 | Win-back: pending_approval → sent |
| QA-274 | P1 | Analytics dashboard laddar snapshots |
| QA-275 | P2 | Feature flags (`features`) CRUD |
| QA-276 | P2 | Per-familj feature enable |
| QA-277 | P2 | Waitlist (EN) export |
| QA-278 | P2 | Professional interest lista |
| QA-279 | P2 | Subscription settings / Stripe setup |
| QA-280 | P2 | Development-sidor (feature dev) |
| QA-281 | P1 | 📱 Admin mobil: ingen redirect-loop vid 429 |
| QA-282 | P1 | Admin JS laddar utan SyntaxError (t.ex. regex) |
| QA-283 | P2 | Bilduppladdning admin |
| QA-284 | P2 | User stats |
| QA-285 | P3 | Email log visar skickade mail |
| QA-286 | P2 | Landing news admin |

---

## U. Enkäter, nyheter och e-post (QA-287 – QA-296)

| ID | P | Kontrollpunkt |
|----|---|---------------|
| QA-287 | P2 | Aktiv enkät: svar sparas partial (`in_progress`) |
| QA-288 | P2 | Enkät: submit kräver GDPR-consent |
| QA-289 | P2 | Villkorlig fråga visas/döljs korrekt |
| QA-290 | P2 | Duplicate detection (cookie/fingerprint) |
| QA-291 | P2 | Contest entry vid tävling |
| QA-292 | P2 | Dagens nyhet push + e-post räknare |
| QA-293 | P2 | Facebook cross-post (om token satt) |
| QA-294 | P2 | Välkomstmail vid registrering (template id=1) |
| QA-295 | P2 | `EMAIL_ENABLED=false` — inget mail, inget 500 |
| QA-296 | P3 | Avregistrering nyhetsbrev via unsubscribe-token |

---

## V. Tillgänglighet, UX och prestanda (QA-297 – QA-300)

| ID | P | Kontrollpunkt |
|----|---|---------------|
| QA-297 | P2 | Fokusindikator synlig vid tangentbordsnavigering |
| QA-298 | P2 | Touch targets ≥44px på mobil huvudknappar |
| QA-299 | P1 | Kritisk väg (login → dashboard) <3s på 4G |
| QA-300 | P1 | Inga uncaught ReferenceError på onboarding, dashboard, schedule, admin |

---

## Resultatsammanfattning (fyll i efter körning)

| Metrik | Värde |
|--------|--------|
| Totalt antal punkter | 300 |
| Godkända `[x]` | |
| Underkända `[!]` | |
| Ej körda `[ ]` | |
| P0 öppna | |
| P1 öppna | |
| **Beslut** | ☐ Godkänd release · ☐ Villkorad · ☐ Stoppad |

### Logg underkända (mall)

| QA-ID | Prioritet | Plattform | Kort beskrivning | Ticket |
|-------|-----------|-----------|------------------|--------|
| | | | | |

---

## Bilaga: Rekommenderad testdata

| Roll | E-post (exempel) | Anteckning |
|------|------------------|------------|
| Primary | `qa-primary+test@mystarday.se` | Skapar familj, 2 barn |
| Shared | `qa-shared+test@mystarday.se` | Inbjuden till 1 av 2 barn |
| Pedagog | `qa-pedagog+test@mystarday.se` | Pedagog_invite |
| Barn PIN | `1234` / `4455` | Dokumentera per miljö |
| Admin | Separat admin-konto | Endast staging |

---

## Körordning (förslag — när QA startas)

1. A → C → D (miljö + auth + session)  
2. E → F → G (onboarding + dashboard + barn)  
3. H → I (barnvy + PIN)  
4. J → K → L (schema + daglogg + belöningar)  
5. M → N → O (rapporter + familj + pedagog)  
6. P → Q → R (push + PWA + betalning)  
7. S → T → U → V (inställningar + admin + övrigt + A11y)

**Obs:** Denna fil startar ingen automatisk körning. Initiera manuellt eller via separat testagent med **Kör-ID** ovan.
