# QA-körning — QA-2026-06-01-LOCAL-001

| Fält | Värde |
|------|--------|
| Datum | 2026-06-01 |
| Miljö | local (kod + npm test, ingen DATABASE_URL) |
| Branch | cursor/full-qa-300-checkpoints-49c0 |
| npm test | 159/159 pass |

## Sammanfattning

| Status | Antal |
|--------|------|
| ✅ pass | 141 |
| ⚠️ partial | 149 |
| ❌ fail | 0 |
| ⏭ skip | 10 |
| **Totalt** | **300** |

## Resultat per punkt

| ID | Status | Anteckning |
|----|--------|------------|
| QA-001 | ✅ pass | QA-2026-06-01-LOCAL-001 |
| QA-002 | ⏭ skip | Ingen DATABASE_URL i miljö |
| QA-003 | ⏭ skip | Ingen DATABASE_URL |
| QA-004 | ⏭ skip | Ingen DATABASE_URL |
| QA-005 | ⏭ skip | Kräver ren browser-profil |
| QA-006 | ✅ pass | 9+ sidor |
| QA-007 | ✅ pass |  |
| QA-008 | ✅ pass |  |
| QA-009 | ✅ pass |  |
| QA-010 | ✅ pass |  |
| QA-011 | ⚠️ partial | Kräver POST mot API |
| QA-012 | ✅ pass |  |
| QA-013 | ⚠️ partial | Kräver admin publicerad nyhet |
| QA-014 | ✅ pass |  |
| QA-015 | ⚠️ partial | Manuell meta-granskning |
| QA-016 | ✅ pass |  |
| QA-017 | ✅ pass |  |
| QA-018 | ✅ pass |  |
| QA-019 | ✅ pass |  |
| QA-020 | ✅ pass |  |
| QA-021 | ⚠️ partial | Kräver API |
| QA-022 | ✅ pass |  |
| QA-023 | ✅ pass |  |
| QA-024 | ⚠️ partial | Kräver token |
| QA-025 | ✅ pass |  |
| QA-026 | ⚠️ partial | Kräver Apple IdP |
| QA-027 | ✅ pass |  |
| QA-028 | ✅ pass |  |
| QA-029 | ✅ pass |  |
| QA-030 | ⚠️ partial | Kräver load test |
| QA-031 | ⚠️ partial | Kräver browser |
| QA-032 | ✅ pass |  |
| QA-033 | ✅ pass | csrfProtect monterad på /api |
| QA-034 | ✅ pass | childParentApiBlock / role checks |
| QA-035 | ✅ pass | JWT role middleware |
| QA-036 | ✅ pass |  |
| QA-037 | ⚠️ partial | Kräver live session |
| QA-038 | ⚠️ partial | Kräver live session |
| QA-039 | ⚠️ partial | Kräver browser |
| QA-040 | ✅ pass |  |
| QA-041 | ✅ pass |  |
| QA-042 | ✅ pass |  |
| QA-043 | ✅ pass | npm test 159/159 gröna (inkl xss) |
| QA-044 | ✅ pass |  |
| QA-045 | ✅ pass |  |
| QA-046 | ✅ pass |  |
| QA-047 | ✅ pass |  |
| QA-048 | ✅ pass |  |
| QA-049 | ✅ pass |  |
| QA-050 | ⚠️ partial | Kräver API response inspection |
| QA-051 | ✅ pass |  |
| QA-052 | ✅ pass |  |
| QA-053 | ⚠️ partial | UI — manuell |
| QA-054 | ⚠️ partial | UI — manuell |
| QA-055 | ⚠️ partial | Kräver wizard körning |
| QA-056 | ⚠️ partial | Kräver wizard |
| QA-057 | ⚠️ partial | invite step i onboarding |
| QA-058 | ✅ pass |  |
| QA-059 | ✅ pass |  |
| QA-060 | ✅ pass |  |
| QA-061 | ✅ pass |  |
| QA-062 | ⚠️ partial | UI |
| QA-063 | ⚠️ partial | UI |
| QA-064 | ⚠️ partial | UI |
| QA-065 | ✅ pass |  |
| QA-066 | ✅ pass |  |
| QA-067 | ✅ pass |  |
| QA-068 | ⚠️ partial | UI |
| QA-069 | ⚠️ partial | Kräver data |
| QA-070 | ✅ pass | nav finns |
| QA-071 | ⚠️ partial | Mobil UI |
| QA-072 | ⚠️ partial | UI |
| QA-073 | ✅ pass |  |
| QA-074 | ⚠️ partial | Kräver admin message |
| QA-075 | ⚠️ partial | Kräver survey flag |
| QA-076 | ✅ pass |  |
| QA-077 | ⚠️ partial | preferred_view_mode |
| QA-078 | ✅ pass |  |
| QA-079 | ⚠️ partial | Kräver data |
| QA-080 | ⚠️ partial | UI |
| QA-081 | ✅ pass |  |
| QA-082 | ⚠️ partial | PUT child |
| QA-083 | ✅ pass |  |
| QA-084 | ✅ pass | avatar fallback utils |
| QA-085 | ✅ pass |  |
| QA-086 | ✅ pass |  |
| QA-087 | ✅ pass |  |
| QA-088 | ✅ pass |  |
| QA-089 | ⚠️ partial | UI settings |
| QA-090 | ⚠️ partial | UI |
| QA-091 | ✅ pass |  |
| QA-092 | ⚠️ partial | UI |
| QA-093 | ✅ pass |  |
| QA-094 | ✅ pass |  |
| QA-095 | ⚠️ partial | timezone |
| QA-096 | ✅ pass |  |
| QA-097 | ✅ pass |  |
| QA-098 | ✅ pass |  |
| QA-099 | ⚠️ partial | Kräver API |
| QA-100 | ✅ pass | 3 försök + 30s lockout (exponential backoff) |
| QA-101 | ⚠️ partial | Kräver API |
| QA-102 | ✅ pass | PIN notify kod |
| QA-103 | ✅ pass |  |
| QA-104 | ⚠️ partial | Kräver API |
| QA-105 | ⚠️ partial | Kräver API |
| QA-106 | ⚠️ partial | PG finns men sessionRestored-bypass dokumenterad |
| QA-107 | ⚠️ partial | Kräver child session test |
| QA-108 | ⚠️ partial | Barn selfie v1.2 |
| QA-109 | ✅ pass |  |
| QA-110 | ⚠️ partial | Kräver API |
| QA-111 | ⚠️ partial | Kräver API |
| QA-112 | ✅ pass |  |
| QA-113 | ⚠️ partial | sessionRestored + DeviceMode — PG gap möjlig |
| QA-114 | ⚠️ partial | UI |
| QA-115 | ⚠️ partial | UI |
| QA-116 | ✅ pass |  |
| QA-117 | ⚠️ partial | UI unlock |
| QA-118 | ⚠️ partial | Biometri native |
| QA-119 | ✅ pass |  |
| QA-120 | ⚠️ partial | re-auth fallback |
| QA-121 | ⚠️ partial | 3s hold |
| QA-122 | ✅ pass | Separata PIN-system i kod/kommentar |
| QA-123 | ⚠️ partial | cooldown |
| QA-124 | ⚠️ partial | UI |
| QA-125 | ⚠️ partial | Direkt URL — kräver browser |
| QA-126 | ✅ pass |  |
| QA-127 | ⚠️ partial | UI |
| QA-128 | ✅ pass |  |
| QA-129 | ✅ pass |  |
| QA-130 | ⏭ skip | Ej utvärderad i lokal körning |
| QA-131 | ⚠️ partial | CRUD routes |
| QA-132 | ✅ pass |  |
| QA-133 | ⚠️ partial | UI |
| QA-134 | ⚠️ partial | DnD UI |
| QA-135 | ⚠️ partial | touch |
| QA-136 | ⚠️ partial | templates |
| QA-137 | ⚠️ partial | copy day |
| QA-138 | ✅ pass |  |
| QA-139 | ✅ pass | special_day i generator |
| QA-140 | ⚠️ partial | Kräver data |
| QA-141 | ✅ pass | fill-week route |
| QA-142 | ✅ pass |  |
| QA-143 | ✅ pass |  |
| QA-144 | ✅ pass |  |
| QA-145 | ⚠️ partial | logik |
| QA-146 | ⚠️ partial | timezone |
| QA-147 | ⚠️ partial | section times |
| QA-148 | ⚠️ partial | pedagog |
| QA-149 | ⚠️ partial | pedagog edit policy |
| QA-150 | ✅ pass |  |
| QA-151 | ✅ pass |  |
| QA-152 | ✅ pass |  |
| QA-153 | ✅ pass |  |
| QA-154 | ⏭ skip | Ej utvärderad i lokal körning |
| QA-155 | ⚠️ partial | UI |
| QA-156 | ⚠️ partial | upload |
| QA-157 | ⚠️ partial | Kräver sync test |
| QA-158 | ✅ pass |  |
| QA-159 | ⚠️ partial | pedagog |
| QA-160 | ⏭ skip | Ej utvärderad i lokal körning |
| QA-161 | ⚠️ partial | streak rules |
| QA-162 | ⚠️ partial | sub_steps UI |
| QA-163 | ⚠️ partial | filter UI |
| QA-164 | ⚠️ partial | export |
| QA-165 | ⚠️ partial | empty state UI |
| QA-166 | ✅ pass |  |
| QA-167 | ✅ pass |  |
| QA-168 | ⚠️ partial | QA-169 UI |
| QA-169 | ⏭ skip | Ej utvärderad i lokal körning |
| QA-170 | ✅ pass |  |
| QA-171 | ✅ pass |  |
| QA-172 | ⚠️ partial | history |
| QA-173 | ✅ pass | child routes separata |
| QA-174 | ⚠️ partial | UI filter |
| QA-175 | ⚠️ partial | edge |
| QA-176 | ⚠️ partial | concurrency |
| QA-177 | ⚠️ partial | push |
| QA-178 | ✅ pass |  |
| QA-179 | ⚠️ partial | UI |
| QA-180 | ✅ pass |  |
| QA-181 | ✅ pass |  |
| QA-182 | ⚠️ partial | UI |
| QA-183 | ✅ pass |  |
| QA-184 | ✅ pass |  |
| QA-185 | ✅ pass |  |
| QA-186 | ✅ pass |  |
| QA-187 | ⏭ skip | Ej utvärderad i lokal körning |
| QA-188 | ✅ pass |  |
| QA-189 | ⚠️ partial | Kräver API |
| QA-190 | ⚠️ partial | Kräver API |
| QA-191 | ⚠️ partial | Kräver API |
| QA-192 | ⚠️ partial | view_count |
| QA-193 | ⚠️ partial | PDF |
| QA-194 | ⚠️ partial | date filter |
| QA-195 | ⚠️ partial | is_important UI |
| QA-196 | ✅ pass |  |
| QA-197 | ✅ pass |  |
| QA-198 | ✅ pass | childIds i family.js |
| QA-199 | ✅ pass |  |
| QA-200 | ✅ pass |  |
| QA-201 | ⚠️ partial | expired token |
| QA-202 | ✅ pass |  |
| QA-203 | ⚠️ partial | timezone UI |
| QA-204 | ⚠️ partial | pedagog invite restriction |
| QA-205 | ✅ pass |  |
| QA-206 | ✅ pass |  |
| QA-207 | ✅ pass | parent_child modell i kod |
| QA-208 | ✅ pass |  |
| QA-209 | ✅ pass |  |
| QA-210 | ✅ pass |  |
| QA-211 | ✅ pass |  |
| QA-212 | ✅ pass |  |
| QA-213 | ⚠️ partial | observations |
| QA-214 | ⚠️ partial | connected_at |
| QA-215 | ⚠️ partial | revoke |
| QA-216 | ✅ pass |  |
| QA-217 | ⚠️ partial | rate limit share |
| QA-218 | ⚠️ partial | landing |
| QA-219 | ⚠️ partial | dual view |
| QA-220 | ✅ pass |  |
| QA-221 | ✅ pass | APNs lib/docs |
| QA-222 | ⚠️ partial | FCM |
| QA-223 | ⏭ skip | Ej utvärderad i lokal körning |
| QA-224 | ✅ pass |  |
| QA-225 | ⚠️ partial | UI |
| QA-226 | ⚠️ partial | device |
| QA-227 | ⚠️ partial | admin message |
| QA-228 | ✅ pass |  |
| QA-229 | ⚠️ partial | preferences |
| QA-230 | ⚠️ partial | badge |
| QA-231 | ⚠️ partial | disabled |
| QA-232 | ✅ pass |  |
| QA-233 | ✅ pass |  |
| QA-234 | ✅ pass | kö finns — banner 📋 |
| QA-235 | ✅ pass |  |
| QA-236 | ✅ pass |  |
| QA-237 | ⚠️ partial | native CSS |
| QA-238 | ⚠️ partial | Android |
| QA-239 | ⚠️ partial | deep link |
| QA-240 | ⚠️ partial | PWA install |
| QA-241 | ⚠️ partial | Google auth |
| QA-242 | ⚠️ partial | iOS UI |
| QA-243 | ⚠️ partial | haptics |
| QA-244 | ✅ pass |  |
| QA-245 | ✅ pass | familyId i subscription middleware |
| QA-246 | ✅ pass |  |
| QA-247 | ⚠️ partial | trial expired |
| QA-248 | ✅ pass |  |
| QA-249 | ✅ pass |  |
| QA-250 | ✅ pass |  |
| QA-251 | ✅ pass |  |
| QA-252 | ✅ pass |  |
| QA-253 | ⚠️ partial | display name |
| QA-254 | ✅ pass | API + settings-account.js |
| QA-255 | ✅ pass |  |
| QA-256 | ✅ pass |  |
| QA-257 | ✅ pass |  |
| QA-258 | ✅ pass |  |
| QA-259 | ✅ pass |  |
| QA-260 | ⚠️ partial | sv default |
| QA-261 | ⚠️ partial | header UI |
| QA-262 | ✅ pass | admin routes |
| QA-263 | ⚠️ partial | Kräver API |
| QA-264 | ✅ pass |  |
| QA-265 | ⚠️ partial | impersonation |
| QA-266 | ⚠️ partial | QA-267-286 admin features — filer finns |
| QA-267 | ⚠️ partial | admin bundle — ej individuellt testad |
| QA-268 | ⚠️ partial | admin bundle — ej individuellt testad |
| QA-269 | ⚠️ partial | admin bundle — ej individuellt testad |
| QA-270 | ⚠️ partial | admin bundle — ej individuellt testad |
| QA-271 | ⚠️ partial | admin bundle — ej individuellt testad |
| QA-272 | ⚠️ partial | admin bundle — ej individuellt testad |
| QA-273 | ⚠️ partial | admin bundle — ej individuellt testad |
| QA-274 | ⚠️ partial | admin bundle — ej individuellt testad |
| QA-275 | ⚠️ partial | admin bundle — ej individuellt testad |
| QA-276 | ⚠️ partial | admin bundle — ej individuellt testad |
| QA-277 | ⚠️ partial | admin bundle — ej individuellt testad |
| QA-278 | ⚠️ partial | admin bundle — ej individuellt testad |
| QA-279 | ⚠️ partial | admin bundle — ej individuellt testad |
| QA-280 | ⚠️ partial | admin bundle — ej individuellt testad |
| QA-281 | ⚠️ partial | admin bundle — ej individuellt testad |
| QA-282 | ✅ pass |  |
| QA-283 | ⚠️ partial | admin bundle — ej individuellt testad |
| QA-284 | ⚠️ partial | admin bundle — ej individuellt testad |
| QA-285 | ⚠️ partial | admin bundle — ej individuellt testad |
| QA-286 | ⚠️ partial | admin bundle — ej individuellt testad |
| QA-287 | ⚠️ partial | surveys |
| QA-288 | ⚠️ partial | GDPR survey |
| QA-289 | ⚠️ partial | conditional |
| QA-290 | ⚠️ partial | fingerprint |
| QA-291 | ⚠️ partial | contest |
| QA-292 | ✅ pass | dagens_nyhet route |
| QA-293 | ✅ pass | newsletter |
| QA-294 | ⚠️ partial | welcome template |
| QA-295 | ✅ pass |  |
| QA-296 | ⚠️ partial | unsubscribe |
| QA-297 | ⚠️ partial | a11y audit |
| QA-298 | ⚠️ partial | touch targets |
| QA-299 | ⚠️ partial | perf — kräver browser |
| QA-300 | ✅ pass | Parse OK kritiska JS |