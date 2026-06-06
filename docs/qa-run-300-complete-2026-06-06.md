# QA 300 — komplett sammanfogad rapport

| Kör-ID | QA-300-MERGE-2026-06-06-mq2s6o5m |
| Datum | 2026-06-06 |

Prioritet: **extended live** > **full live** > **static local**

## Sammanfattning

| ✅ pass | 156 |
| ⚠️ partial | 135 |
| ❌ fail | 0 |
| ⏭ skip | 9 |
| **Totalt** | **300** |

Källor: extended=65, full=1, local=234, none=0

| ID | Status | Källa | Anteckning |
|----|--------|-------|------------|
| QA-001 | ✅ pass | local |  QA-2026-06-04-LOCAL-002  |
| QA-002 | ⏭ skip | local |  Ingen DATABASE_URL i miljö  |
| QA-003 | ⏭ skip | local |  Ingen DATABASE_URL  |
| QA-004 | ⏭ skip | local |  Ingen DATABASE_URL  |
| QA-005 | ⏭ skip | local |  Kräver ren browser-profil  |
| QA-006 | ✅ pass | local |  9+ sidor  |
| QA-007 | ✅ pass | extended | / HTML |
| QA-008 | ✅ pass | local |    |
| QA-009 | ✅ pass | local |    |
| QA-010 | ✅ pass | local |    |
| QA-011 | ⚠️ partial | local |  Kräver POST mot API  |
| QA-012 | ✅ pass | extended | /privacy HTML |
| QA-013 | ⚠️ partial | local |  Kräver admin publicerad nyhet  |
| QA-014 | ✅ pass | local |    |
| QA-015 | ⚠️ partial | local |  Manuell meta-granskning  |
| QA-016 | ✅ pass | local |    |
| QA-017 | ✅ pass | local |    |
| QA-018 | ✅ pass | local |    |
| QA-019 | ✅ pass | local |    |
| QA-020 | ✅ pass | local |    |
| QA-021 | ⚠️ partial | local |  Kräver API  |
| QA-022 | ✅ pass | extended | /forgot-password HTML |
| QA-023 | ✅ pass | extended | /reset-password HTML |
| QA-024 | ⚠️ partial | local |  Kräver token  |
| QA-025 | ✅ pass | local |    |
| QA-026 | ⚠️ partial | local |  Kräver Apple IdP  |
| QA-027 | ✅ pass | local |    |
| QA-028 | ✅ pass | local |    |
| QA-029 | ✅ pass | local |    |
| QA-030 | ⚠️ partial | local |  Kräver load test  |
| QA-031 | ⚠️ partial | extended | 30d cookie TTL — kräver browser |
| QA-032 | ✅ pass | local |    |
| QA-033 | ✅ pass | local |  csrfProtect monterad på /api  |
| QA-034 | ✅ pass | extended | barn → family 403 |
| QA-035 | ✅ pass | extended | barn /api/me/rewards OK |
| QA-036 | ✅ pass | local |    |
| QA-037 | ⚠️ partial | extended | refresh körd i full suite |
| QA-038 | ⚠️ partial | local |  Kräver live session  |
| QA-039 | ⚠️ partial | local |  Kräver browser  |
| QA-040 | ✅ pass | extended | httpOnly cookies |
| QA-041 | ✅ pass | local |    |
| QA-042 | ✅ pass | local |    |
| QA-043 | ✅ pass | local |  npm test 159/159 gröna (inkl xss)  |
| QA-044 | ✅ pass | local |    |
| QA-045 | ✅ pass | local |    |
| QA-046 | ✅ pass | local |    |
| QA-047 | ✅ pass | local |    |
| QA-048 | ✅ pass | local |    |
| QA-049 | ✅ pass | local |    |
| QA-050 | ✅ pass | extended | PIN hash ej i API-svar |
| QA-051 | ✅ pass | local |    |
| QA-052 | ✅ pass | local |    |
| QA-053 | ⚠️ partial | local |  UI — manuell  |
| QA-054 | ⚠️ partial | local |  UI — manuell  |
| QA-055 | ⚠️ partial | local |  Kräver wizard körning  |
| QA-056 | ⚠️ partial | local |  Kräver wizard  |
| QA-057 | ⚠️ partial | local |  invite step i onboarding  |
| QA-058 | ✅ pass | local |    |
| QA-059 | ✅ pass | extended | /onboarding HTML |
| QA-060 | ✅ pass | extended | /onboarding HTML |
| QA-061 | ✅ pass | local |    |
| QA-062 | ⚠️ partial | local |  UI  |
| QA-063 | ⚠️ partial | local |  UI  |
| QA-064 | ⚠️ partial | local |  UI  |
| QA-065 | ✅ pass | extended | /assign-schedule HTML |
| QA-066 | ✅ pass | local |    |
| QA-067 | ✅ pass | local |    |
| QA-068 | ✅ pass | extended | barnkort data |
| QA-069 | ⚠️ partial | local |  Kräver data  |
| QA-070 | ✅ pass | extended | /dashboard HTML |
| QA-071 | ✅ pass | extended | /dashboard HTML |
| QA-072 | ✅ pass | extended | /child-login HTML |
| QA-073 | ✅ pass | extended | /onboarding?flow=add-child HTML |
| QA-074 | ✅ pass | extended | systemmeddelanden unread |
| QA-075 | ⚠️ partial | local |  Kräver survey flag  |
| QA-076 | ✅ pass | local |    |
| QA-077 | ⚠️ partial | local |  preferred_view_mode  |
| QA-078 | ✅ pass | local |    |
| QA-079 | ✅ pass | extended | unread count |
| QA-080 | ⚠️ partial | local |  UI  |
| QA-081 | ✅ pass | full | QA Barn B mq2r49hw via onboarding/child |
| QA-082 | ✅ pass | extended | redigera barn → 200 |
| QA-083 | ✅ pass | local |    |
| QA-084 | ✅ pass | local |  avatar fallback utils  |
| QA-085 | ✅ pass | extended | view-config |
| QA-086 | ✅ pass | local |    |
| QA-087 | ✅ pass | local |    |
| QA-088 | ✅ pass | local |    |
| QA-089 | ⚠️ partial | local |  UI settings  |
| QA-090 | ⚠️ partial | local |  UI  |
| QA-091 | ✅ pass | extended | username för child-login finns |
| QA-092 | ✅ pass | extended | 2 barn i lista |
| QA-093 | ✅ pass | local |    |
| QA-094 | ✅ pass | extended | /calendar HTML |
| QA-095 | ⚠️ partial | extended | födelsedag/tidszon UI |
| QA-096 | ✅ pass | local |    |
| QA-097 | ✅ pass | local |    |
| QA-098 | ✅ pass | local |    |
| QA-099 | ⚠️ partial | local |  Kräver API  |
| QA-100 | ✅ pass | local |  3 försök + 30s lockout (exponential backoff)  |
| QA-101 | ⚠️ partial | local |  Kräver API  |
| QA-102 | ✅ pass | local |  PIN notify kod  |
| QA-103 | ✅ pass | local |    |
| QA-104 | ⚠️ partial | local |  Kräver API  |
| QA-105 | ⚠️ partial | local |  Kräver API  |
| QA-106 | ⚠️ partial | local |  PG finns men sessionRestored-bypass dokumenterad  |
| QA-107 | ⚠️ partial | local |  Kräver child session test  |
| QA-108 | ⚠️ partial | local |  Barn selfie v1.2  |
| QA-109 | ✅ pass | local |    |
| QA-110 | ⚠️ partial | local |  Kräver API  |
| QA-111 | ⚠️ partial | local |  Kräver API  |
| QA-112 | ✅ pass | local |    |
| QA-113 | ⚠️ partial | local |  sessionRestored + DeviceMode — PG gap möjlig  |
| QA-114 | ⚠️ partial | extended | barn logout |
| QA-115 | ⚠️ partial | local |  UI  |
| QA-116 | ✅ pass | extended | pin-status |
| QA-117 | ⚠️ partial | local |  UI unlock  |
| QA-118 | ⚠️ partial | local |  Biometri native  |
| QA-119 | ✅ pass | local |    |
| QA-120 | ⚠️ partial | local |  re-auth fallback  |
| QA-121 | ⚠️ partial | local |  3s hold  |
| QA-122 | ✅ pass | local |  Separata PIN-system i kod/kommentar  |
| QA-123 | ⚠️ partial | local |  cooldown  |
| QA-124 | ⚠️ partial | extended | PIN maskering UI |
| QA-125 | ⚠️ partial | extended | låst barn URL — delvis |
| QA-126 | ✅ pass | local |    |
| QA-127 | ✅ pass | extended | 7-dagars schema data |
| QA-128 | ✅ pass | local |    |
| QA-129 | ✅ pass | local |    |
| QA-130 | ✅ pass | extended | egen aktivitet → 201 |
| QA-131 | ⚠️ partial | local |  CRUD routes  |
| QA-132 | ✅ pass | local |    |
| QA-133 | ⚠️ partial | local |  UI  |
| QA-134 | ⚠️ partial | local |  DnD UI  |
| QA-135 | ⚠️ partial | local |  touch  |
| QA-136 | ✅ pass | extended | veckomall finns |
| QA-137 | ⚠️ partial | local |  copy day  |
| QA-138 | ✅ pass | local |    |
| QA-139 | ✅ pass | local |  special_day i generator  |
| QA-140 | ⚠️ partial | local |  Kräver data  |
| QA-141 | ✅ pass | local |  fill-week route  |
| QA-142 | ✅ pass | extended | aktivitetsbibliotek API |
| QA-143 | ✅ pass | local |    |
| QA-144 | ✅ pass | extended | kategorier |
| QA-145 | ⚠️ partial | local |  logik  |
| QA-146 | ⚠️ partial | extended | tidszon — Europe/Stockholm default |
| QA-147 | ⚠️ partial | extended | sektionstider family settings |
| QA-148 | ⚠️ partial | local |  pedagog  |
| QA-149 | ⚠️ partial | local |  pedagog edit policy  |
| QA-150 | ✅ pass | local |    |
| QA-151 | ✅ pass | extended | daily-logs range |
| QA-152 | ✅ pass | local |    |
| QA-153 | ✅ pass | local |    |
| QA-154 | ⏭ skip | local |  Ej utvärderad i lokal körning  |
| QA-155 | ⚠️ partial | local |  UI  |
| QA-156 | ⚠️ partial | local |  upload  |
| QA-157 | ⚠️ partial | local |  Kräver sync test  |
| QA-158 | ✅ pass | local |    |
| QA-159 | ⚠️ partial | local |  pedagog  |
| QA-160 | ⏭ skip | local |  Ej utvärderad i lokal körning  |
| QA-161 | ⚠️ partial | local |  streak rules  |
| QA-162 | ⚠️ partial | local |  sub_steps UI  |
| QA-163 | ⚠️ partial | local |  filter UI  |
| QA-164 | ⚠️ partial | local |  export  |
| QA-165 | ⚠️ partial | local |  empty state UI  |
| QA-166 | ✅ pass | local |    |
| QA-167 | ✅ pass | local |    |
| QA-168 | ⚠️ partial | local |  QA-169 UI  |
| QA-169 | ⏭ skip | local |  Ej utvärderad i lokal körning  |
| QA-170 | ✅ pass | local |    |
| QA-171 | ✅ pass | extended | belöningar CRUD lista |
| QA-172 | ✅ pass | extended | skapa belöning |
| QA-173 | ✅ pass | local |  child routes separata  |
| QA-174 | ⚠️ partial | local |  UI filter  |
| QA-175 | ✅ pass | extended | redemptions lista |
| QA-176 | ⚠️ partial | local |  concurrency  |
| QA-177 | ⚠️ partial | local |  push  |
| QA-178 | ✅ pass | local |    |
| QA-179 | ⚠️ partial | local |  UI  |
| QA-180 | ✅ pass | extended | /reports HTML |
| QA-181 | ✅ pass | local |    |
| QA-182 | ⚠️ partial | local |  UI  |
| QA-183 | ✅ pass | local |    |
| QA-184 | ✅ pass | local |    |
| QA-185 | ✅ pass | local |    |
| QA-186 | ✅ pass | local |    |
| QA-187 | ⏭ skip | local |  Ej utvärderad i lokal körning  |
| QA-188 | ✅ pass | local |    |
| QA-189 | ⚠️ partial | local |  Kräver API  |
| QA-190 | ⚠️ partial | local |  Kräver API  |
| QA-191 | ⚠️ partial | local |  Kräver API  |
| QA-192 | ⚠️ partial | local |  view_count  |
| QA-193 | ⚠️ partial | local |  PDF  |
| QA-194 | ⚠️ partial | local |  date filter  |
| QA-195 | ✅ pass | extended | general observations |
| QA-196 | ⚠️ partial | local |  Mina barn + Dela åtkomst ✅; egen Pedagoger-rubrik saknas  |
| QA-197 | ✅ pass | local |    |
| QA-198 | ✅ pass | local |  childIds i family.js  |
| QA-199 | ✅ pass | extended | /accept-invite HTML |
| QA-200 | ✅ pass | local |    |
| QA-201 | ⚠️ partial | local |  expired token  |
| QA-202 | ✅ pass | extended | pending invites i API |
| QA-203 | ✅ pass | extended | familj: QA Primarys familj |
| QA-204 | ⚠️ partial | extended | shared pedagog — kod requirePrimaryParent |
| QA-205 | ✅ pass | local |    |
| QA-206 | ✅ pass | local |    |
| QA-207 | ✅ pass | local |  parent_child modell i kod  |
| QA-208 | ✅ pass | local |    |
| QA-209 | ✅ pass | local |    |
| QA-210 | ✅ pass | local |    |
| QA-211 | ✅ pass | local |    |
| QA-212 | ✅ pass | local |    |
| QA-213 | ⚠️ partial | local |  observations  |
| QA-214 | ⚠️ partial | local |  connected_at  |
| QA-215 | ⚠️ partial | local |  revoke  |
| QA-216 | ✅ pass | local |    |
| QA-217 | ⚠️ partial | local |  rate limit share  |
| QA-218 | ⚠️ partial | extended | pedagog landning HTML testad |
| QA-219 | ⚠️ partial | local |  dual view  |
| QA-220 | ✅ pass | local |    |
| QA-221 | ✅ pass | local |  APNs lib/docs  |
| QA-222 | ⚠️ partial | local |  FCM  |
| QA-223 | ⏭ skip | extended | APNs cleanup |
| QA-224 | ✅ pass | extended | notification_log API |
| QA-225 | ⚠️ partial | extended | markera läst — skip mutation |
| QA-226 | ⚠️ partial | local |  device  |
| QA-227 | ⚠️ partial | local |  admin message  |
| QA-228 | ✅ pass | local |    |
| QA-229 | ⚠️ partial | extended | admin_push_enabled |
| QA-230 | ⚠️ partial | extended | badge UI |
| QA-231 | ⚠️ partial | extended | push av |
| QA-232 | ✅ pass | extended | /dashboard HTML |
| QA-233 | ✅ pass | local |    |
| QA-234 | ✅ pass | local |  kö finns — banner 📋  |
| QA-235 | ✅ pass | local |    |
| QA-236 | ✅ pass | local |    |
| QA-237 | ⚠️ partial | local |  native CSS  |
| QA-238 | ⚠️ partial | local |  Android  |
| QA-239 | ⚠️ partial | local |  deep link  |
| QA-240 | ⚠️ partial | local |  PWA install  |
| QA-241 | ⚠️ partial | local |  Google auth  |
| QA-242 | ⚠️ partial | local |  iOS UI  |
| QA-243 | ⚠️ partial | local |  haptics  |
| QA-244 | ✅ pass | local |    |
| QA-245 | ✅ pass | extended | familyId subscription |
| QA-246 | ✅ pass | local |    |
| QA-247 | ⚠️ partial | extended | trial expired — ej testbar |
| QA-248 | ✅ pass | local |    |
| QA-249 | ✅ pass | local |    |
| QA-250 | ✅ pass | local |    |
| QA-251 | ✅ pass | extended | /upgrade HTML |
| QA-252 | ✅ pass | local |    |
| QA-253 | ⚠️ partial | extended | visningsnamn: ? |
| QA-254 | ✅ pass | extended | accountAuth i /me |
| QA-255 | ✅ pass | extended | push prefs API |
| QA-256 | ✅ pass | local |    |
| QA-257 | ✅ pass | local |    |
| QA-258 | ✅ pass | extended | consent GET |
| QA-259 | ✅ pass | local |    |
| QA-260 | ✅ pass | extended | svenska default |
| QA-261 | ⚠️ partial | extended | header UI browser |
| QA-262 | ✅ pass | local |  admin routes  |
| QA-263 | ⚠️ partial | local |  Kräver API  |
| QA-264 | ✅ pass | local |    |
| QA-265 | ⚠️ partial | local |  impersonation  |
| QA-266 | ⚠️ partial | local |  QA-267-286 admin features — filer finns  |
| QA-267 | ⚠️ partial | local |  admin bundle — ej individuellt testad  |
| QA-268 | ⚠️ partial | local |  admin bundle — ej individuellt testad  |
| QA-269 | ⚠️ partial | local |  admin bundle — ej individuellt testad  |
| QA-270 | ⚠️ partial | local |  admin bundle — ej individuellt testad  |
| QA-271 | ⚠️ partial | local |  admin bundle — ej individuellt testad  |
| QA-272 | ⚠️ partial | local |  admin bundle — ej individuellt testad  |
| QA-273 | ⚠️ partial | local |  admin bundle — ej individuellt testad  |
| QA-274 | ⚠️ partial | local |  admin bundle — ej individuellt testad  |
| QA-275 | ⚠️ partial | local |  admin bundle — ej individuellt testad  |
| QA-276 | ⚠️ partial | local |  admin bundle — ej individuellt testad  |
| QA-277 | ⚠️ partial | local |  admin bundle — ej individuellt testad  |
| QA-278 | ⚠️ partial | local |  admin bundle — ej individuellt testad  |
| QA-279 | ⚠️ partial | local |  admin bundle — ej individuellt testad  |
| QA-280 | ⚠️ partial | local |  admin bundle — ej individuellt testad  |
| QA-281 | ⚠️ partial | local |  admin bundle — ej individuellt testad  |
| QA-282 | ✅ pass | local |    |
| QA-283 | ⚠️ partial | local |  admin bundle — ej individuellt testad  |
| QA-284 | ⚠️ partial | local |  admin bundle — ej individuellt testad  |
| QA-285 | ⚠️ partial | local |  admin bundle — ej individuellt testad  |
| QA-286 | ⚠️ partial | local |  admin bundle — ej individuellt testad  |
| QA-287 | ⚠️ partial | local |  surveys  |
| QA-288 | ⚠️ partial | local |  GDPR survey  |
| QA-289 | ⚠️ partial | local |  conditional  |
| QA-290 | ⚠️ partial | local |  fingerprint  |
| QA-291 | ⚠️ partial | local |  contest  |
| QA-292 | ✅ pass | local |  dagens_nyhet route  |
| QA-293 | ✅ pass | local |  newsletter  |
| QA-294 | ⚠️ partial | extended | välkomstmail — registrering körd |
| QA-295 | ✅ pass | local |    |
| QA-296 | ⚠️ partial | local |  unsubscribe  |
| QA-297 | ⚠️ partial | local |  a11y audit  |
| QA-298 | ⚠️ partial | local |  touch targets  |
| QA-299 | ⚠️ partial | local |  perf — kräver browser  |
| QA-300 | ✅ pass | local |  Parse OK kritiska JS  |