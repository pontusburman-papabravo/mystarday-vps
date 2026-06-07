# QA 300 — komplett sammanfogad rapport

| Kör-ID | QA-300-MERGE-2026-06-07-mq3hl9ve |
| Datum | 2026-06-07 |

Prioritet: **destructive/admin/email/browser** > **extended live** > **full live** > **static local**

## Sammanfattning

| ✅ pass | 99 |
| ⚠️ partial | 82 |
| ❌ fail | 1 |
| ⏭ skip | 118 |
| **Totalt** | **300** |

Källor: extended=201, full=34, local=56, none=0

| ID | Status | Källa | Anteckning |
|----|--------|-------|------------|
| QA-001 | ✅ pass | full | QA-VPS-2026-06-06-mq2r49hw |
| QA-002 | ⏭ skip | local | Ingen DATABASE_URL i miljö |
| QA-003 | ⏭ skip | local | Ingen DATABASE_URL |
| QA-004 | ⏭ skip | local | Ingen DATABASE_URL |
| QA-005 | ⏭ skip | local | Kräver ren browser-profil |
| QA-006 | ✅ pass | full | / 200 |
| QA-007 | ✅ pass | extended | / HTML |
| QA-008 | ⚠️ partial | extended | /en → 302 |
| QA-009 | ⚠️ partial | extended | /en-thank-you → 302 |
| QA-010 | ⚠️ partial | extended | /pedagoger-och-terapeuter → 302 |
| QA-011 | ⚠️ partial | local | Kräver POST mot API |
| QA-012 | ✅ pass | extended | /privacy HTML |
| QA-013 | ⚠️ partial | local | Kräver admin publicerad nyhet |
| QA-014 | ⚠️ partial | extended | /offline → 302 |
| QA-015 | ⚠️ partial | local | Manuell meta-granskning |
| QA-016 | ✅ pass | email | register |
| QA-017 | ✅ pass | email | verification mail triggad |
| QA-018 | ⚠️ partial | email | ingen token — QA_MODE saknas |
| QA-019 | ✅ pass | email | inloggning efter verify/grace |
| QA-020 | ✅ pass | full | primary qa.primary+mq2r49hw@test.mystarday.se |
| QA-021 | ✅ pass | full | fel lösenord |
| QA-022 | ✅ pass | email | forgot-password |
| QA-023 | ✅ pass | extended | /reset-password HTML |
| QA-024 | ⚠️ partial | local | Kräver token |
| QA-025 | ⏭ skip | extended | Apple IdP |
| QA-026 | ⏭ skip | extended | Apple IdP |
| QA-027 | ⚠️ partial | extended | isAppleSignInAvailable — kod OK, Android ej testad här |
| QA-028 | ✅ pass | full | logout |
| QA-029 | ✅ pass | full | auth/me |
| QA-030 | ⏭ skip | extended | load test |
| QA-031 | ⚠️ partial | extended | 30d cookie TTL — kräver browser |
| QA-032 | ✅ pass | full | CSRF efter login |
| QA-033 | ✅ pass | full | utan CSRF → 403 |
| QA-034 | ✅ pass | extended | barn → family 403 |
| QA-035 | ✅ pass | extended | barn /api/me/rewards OK |
| QA-036 | ✅ pass | full | refresh token |
| QA-037 | ⚠️ partial | extended | refresh körd i full suite |
| QA-038 | ✅ pass | full | me efter logout |
| QA-039 | ⏭ skip | extended | multi-tab browser |
| QA-040 | ✅ pass | extended | httpOnly cookies |
| QA-041 | ✅ pass | local |  |
| QA-042 | ✅ pass | local |  |
| QA-043 | ⚠️ partial | extended | XSS — npm test lokalt |
| QA-044 | ⚠️ partial | extended | security headers — kräver header-inspektion |
| QA-045 | ⏭ skip | extended | maintenance mode |
| QA-046 | ⏭ skip | extended | admin impersonation |
| QA-047 | ⚠️ partial | extended | request-id i fel |
| QA-048 | ⚠️ partial | extended | static exempt — kod |
| QA-049 | ⚠️ partial | extended | admin refresh exempt — kod |
| QA-050 | ✅ pass | extended | PIN hash ej i API-svar |
| QA-051 | ✅ pass | full | onboarding child 1 |
| QA-052 | ✅ pass | full | schedule forskola barn 1 |
| QA-053 | ⚠️ partial | local | UI — manuell |
| QA-054 | ⚠️ partial | local | UI — manuell |
| QA-055 | ✅ pass | full | reward |
| QA-056 | ✅ pass | full | PIN 4455 |
| QA-057 | ⚠️ partial | local | invite step i onboarding |
| QA-058 | ✅ pass | full | onboarding complete |
| QA-059 | ✅ pass | extended | /onboarding HTML |
| QA-060 | ✅ pass | extended | /onboarding HTML |
| QA-061 | ✅ pass | local |  |
| QA-062 | ⚠️ partial | local | UI |
| QA-063 | ⚠️ partial | local | UI |
| QA-064 | ⚠️ partial | local | UI |
| QA-065 | ✅ pass | extended | /assign-schedule HTML |
| QA-066 | ✅ pass | full | 2 barn |
| QA-067 | ✅ pass | full | parent_child filter |
| QA-068 | ✅ pass | extended | barnkort data |
| QA-069 | ⚠️ partial | local | Kräver data |
| QA-070 | ✅ pass | extended | /dashboard HTML |
| QA-071 | ✅ pass | extended | /dashboard HTML |
| QA-072 | ✅ pass | extended | /child-login HTML |
| QA-073 | ✅ pass | extended | /onboarding?flow=add-child HTML |
| QA-074 | ✅ pass | extended | systemmeddelanden unread |
| QA-075 | ⚠️ partial | local | Kräver survey flag |
| QA-076 | ✅ pass | full | shared /family |
| QA-077 | ⚠️ partial | local | preferred_view_mode |
| QA-078 | ✅ pass | local |  |
| QA-079 | ✅ pass | extended | unread count |
| QA-080 | ⚠️ partial | local | UI |
| QA-081 | ✅ pass | full | QA Barn A mq2r49hw |
| QA-082 | ✅ pass | extended | redigera barn → 200 |
| QA-083 | ⏭ skip | extended | R2 upload kräver fil |
| QA-084 | ⚠️ partial | extended | avatar fallback — manuell UI |
| QA-085 | ✅ pass | extended | view-config |
| QA-086 | ✅ pass | local |  |
| QA-087 | ✅ pass | destructive | delete barn → 200 |
| QA-088 | ✅ pass | destructive | primary delete |
| QA-089 | ⏭ skip | extended | PIN-ändring destruktiv |
| QA-090 | ⚠️ partial | local | UI |
| QA-091 | ✅ pass | extended | username för child-login finns |
| QA-092 | ✅ pass | extended | 2 barn i lista |
| QA-093 | ⚠️ partial | extended | /family-week → 301 |
| QA-094 | ✅ pass | extended | /calendar HTML |
| QA-095 | ⚠️ partial | extended | födelsedag/tidszon UI |
| QA-096 | ✅ pass | full | /child-login 200 |
| QA-097 | ✅ pass | local |  |
| QA-098 | ✅ pass | full | barn-login QA Barn B mq2r49hw |
| QA-099 | ⚠️ partial | local | Kräver API |
| QA-100 | ⏭ skip | full | QA_SKIP_LOCKOUT (IP rate limit på VPS) |
| QA-101 | ⏭ skip | full | lockout hoppad |
| QA-102 | ✅ pass | local | PIN notify kod |
| QA-103 | ✅ pass | full | daily-log |
| QA-104 | ⚠️ partial | full | inga oschemalagda items idag |
| QA-105 | ⚠️ partial | local | Kräver API |
| QA-106 | ⏭ skip | extended | PG browser |
| QA-107 | ✅ pass | full | barn → family 403 |
| QA-108 | ⏭ skip | extended | barn selfie |
| QA-109 | ✅ pass | full | skattkammaren API |
| QA-110 | ⏭ skip | extended | barn inlösen — kräver barnsession + saldo |
| QA-111 | ⏭ skip | extended | barn saldo |
| QA-112 | ⏭ skip | extended | v2 child |
| QA-113 | ⏭ skip | extended | device mode browser |
| QA-114 | ⚠️ partial | extended | barn logout |
| QA-115 | ⏭ skip | extended | animationer browser |
| QA-116 | ✅ pass | extended | pin-status |
| QA-117 | ⏭ skip | extended | unlock PIN primary |
| QA-118 | ⏭ skip | extended | biometri |
| QA-119 | ⚠️ partial | extended | parent-pin API finns |
| QA-120 | ⏭ skip | extended | PG re-auth |
| QA-121 | ⏭ skip | extended | dörr-ikon |
| QA-122 | ⚠️ partial | extended | barn-PIN ≠ parent-PIN — separata |
| QA-123 | ⏭ skip | extended | PIN email cooldown |
| QA-124 | ⚠️ partial | extended | PIN maskering UI |
| QA-125 | ⚠️ partial | extended | låst barn URL — delvis |
| QA-126 | ✅ pass | full | veckoschema API |
| QA-127 | ✅ pass | extended | 7-dagars schema data |
| QA-128 | ⚠️ partial | extended | bibliotek — via onboarding redan |
| QA-129 | ⚠️ partial | extended | standardbibliotek |
| QA-130 | ✅ pass | extended | egen aktivitet → 201 |
| QA-131 | ⚠️ partial | local | CRUD routes |
| QA-132 | ⏭ skip | extended | schedule item delete — destruktivt |
| QA-133 | ⏭ skip | extended | destruktivt |
| QA-134 | ⏭ skip | extended | DnD browser |
| QA-135 | ⏭ skip | extended | touch browser |
| QA-136 | ✅ pass | extended | veckomall finns |
| QA-137 | ⏭ skip | extended | manuell schedule edit |
| QA-138 | ⏭ skip | extended | särskild dag — manuell |
| QA-139 | ✅ pass | local | special_day i generator |
| QA-140 | ⚠️ partial | local | Kräver data |
| QA-141 | ⏭ skip | extended | fill-week manuell |
| QA-142 | ✅ pass | extended | aktivitetsbibliotek API |
| QA-143 | ⚠️ partial | extended | library API |
| QA-144 | ✅ pass | extended | kategorier |
| QA-145 | ⏭ skip | extended | retroaktiv logg |
| QA-146 | ⚠️ partial | extended | tidszon — Europe/Stockholm default |
| QA-147 | ⚠️ partial | extended | sektionstider family settings |
| QA-148 | ⏭ skip | extended | pedagog roll |
| QA-149 | ⏭ skip | extended | subscription paywall test |
| QA-150 | ⏭ skip | extended | bulk edit |
| QA-151 | ✅ pass | extended | daily-logs range |
| QA-152 | ✅ pass | local |  |
| QA-153 | ✅ pass | local |  |
| QA-154 | ⏭ skip | local | Ej utvärderad i lokal körning |
| QA-155 | ⚠️ partial | local | UI |
| QA-156 | ⚠️ partial | local | upload |
| QA-157 | ⚠️ partial | local | Kräver sync test |
| QA-158 | ✅ pass | local |  |
| QA-159 | ⚠️ partial | local | pedagog |
| QA-160 | ⏭ skip | local | Ej utvärderad i lokal körning |
| QA-161 | ⚠️ partial | local | streak rules |
| QA-162 | ⚠️ partial | local | sub_steps UI |
| QA-163 | ⚠️ partial | local | filter UI |
| QA-164 | ⚠️ partial | local | export |
| QA-165 | ⚠️ partial | local | empty state UI |
| QA-166 | ✅ pass | local |  |
| QA-167 | ✅ pass | local |  |
| QA-168 | ⚠️ partial | local | QA-169 UI |
| QA-169 | ⏭ skip | local | Ej utvärderad i lokal körning |
| QA-170 | ✅ pass | full | belöningar lista |
| QA-171 | ✅ pass | extended | belöningar CRUD lista |
| QA-172 | ✅ pass | extended | skapa belöning |
| QA-173 | ⚠️ partial | extended | redigera belöning — skip write |
| QA-174 | ⏭ skip | extended | destruktiv |
| QA-175 | ✅ pass | extended | redemptions lista |
| QA-176 | ⏭ skip | extended | barnvy inlösen |
| QA-177 | ⏭ skip | extended | push redemption |
| QA-178 | ⏭ skip | extended | admin default rewards |
| QA-179 | ⏭ skip | extended | Skattkammaren UI browser |
| QA-180 | ✅ pass | extended | /reports HTML |
| QA-181 | ✅ pass | local |  |
| QA-182 | ⚠️ partial | local | UI |
| QA-183 | ✅ pass | local |  |
| QA-184 | ✅ pass | local |  |
| QA-185 | ✅ pass | local |  |
| QA-186 | ⚠️ partial | extended | observations → 400 |
| QA-187 | ⏭ skip | local | Ej utvärderad i lokal körning |
| QA-188 | ⚠️ partial | extended | reports → 500 |
| QA-189 | ⏭ skip | extended | PDF export |
| QA-190 | ⏭ skip | extended | share link create |
| QA-191 | ⏭ skip | extended | pedagog notes |
| QA-192 | ⏭ skip | extended | view_count |
| QA-193 | ⏭ skip | extended | PDF |
| QA-194 | ⏭ skip | extended | date filter UI |
| QA-195 | ✅ pass | extended | general observations |
| QA-196 | ✅ pass | full | /family 200 |
| QA-197 | ✅ pass | email | invite → 201 |
| QA-198 | ⚠️ partial | extended | childIds invite — kräver e-post token |
| QA-199 | ✅ pass | extended | /accept-invite HTML |
| QA-200 | ✅ pass | full | add-parent shared vuxen |
| QA-201 | ⏭ skip | extended | expired invite token |
| QA-202 | ✅ pass | extended | pending invites i API |
| QA-203 | ✅ pass | extended | familj: QA Primarys familj |
| QA-204 | ⚠️ partial | extended | shared pedagog — kod requirePrimaryParent |
| QA-205 | ⚠️ partial | destructive | delete-account → 500 |
| QA-206 | ❌ fail | full | 500 |
| QA-207 | ✅ pass | full | familjestruktur |
| QA-208 | ⏭ skip | extended | pedagog invite — kräver setup |
| QA-209 | ⏭ skip | extended | pedagog accept |
| QA-210 | ⏭ skip | extended | pedagog dashboard |
| QA-211 | ⚠️ partial | extended | /pedagog-oversikt → 302 |
| QA-212 | ⏭ skip | extended | pedagog-only konto |
| QA-213 | ⏭ skip | extended | pedagog observation |
| QA-214 | ⚠️ partial | local | connected_at |
| QA-215 | ⏭ skip | extended | revoke pedagog |
| QA-216 | ⏭ skip | extended | account_type |
| QA-217 | ⏭ skip | extended | professionell rapport PIN |
| QA-218 | ⚠️ partial | extended | pedagog landning HTML testad |
| QA-219 | ⏭ skip | extended | dual account |
| QA-220 | ⏭ skip | extended | web push browser |
| QA-221 | ⏭ skip | extended | APNs |
| QA-222 | ⏭ skip | extended | FCM |
| QA-223 | ⏭ skip | extended | APNs cleanup |
| QA-224 | ✅ pass | extended | notification_log API |
| QA-225 | ⚠️ partial | extended | markera läst — skip mutation |
| QA-226 | ⏭ skip | extended | push tap device |
| QA-227 | ⏭ skip | extended | admin push |
| QA-228 | ⚠️ partial | extended | reminders scheduler — kod |
| QA-229 | ⚠️ partial | extended | admin_push_enabled |
| QA-230 | ⚠️ partial | extended | badge UI |
| QA-231 | ⚠️ partial | extended | push av |
| QA-232 | ✅ pass | extended | /dashboard HTML |
| QA-233 | ⚠️ partial | extended | SW version — kod |
| QA-234 | ⏭ skip | extended | offline sync browser |
| QA-235 | ⚠️ partial | extended | platform-theme inject |
| QA-236 | ⏭ skip | extended | native CSS |
| QA-237 | ⏭ skip | extended | safe area native |
| QA-238 | ⏭ skip | extended | Android back |
| QA-239 | ⏭ skip | extended | deep link device |
| QA-240 | ⏭ skip | extended | PWA install |
| QA-241 | ⏭ skip | extended | Google auth |
| QA-242 | ⏭ skip | extended | iOS statusbar |
| QA-243 | ⏭ skip | extended | haptik |
| QA-244 | ⚠️ partial | extended | subscription status |
| QA-245 | ✅ pass | extended | familyId subscription |
| QA-246 | ⚠️ partial | extended | trial info i status |
| QA-247 | ⚠️ partial | extended | trial expired — ej testbar |
| QA-248 | ⏭ skip | extended | Stripe checkout live |
| QA-249 | ⚠️ partial | extended | payment-success HTML finns |
| QA-250 | ⏭ skip | extended | IAP webhook |
| QA-251 | ✅ pass | extended | /upgrade HTML |
| QA-252 | ✅ pass | full | account status |
| QA-253 | ⚠️ partial | extended | visningsnamn: ? |
| QA-254 | ✅ pass | extended | accountAuth i /me |
| QA-255 | ✅ pass | extended | push prefs API |
| QA-256 | ⏭ skip | extended | newsletter mutation |
| QA-257 | ⚠️ partial | extended | tyck HTML — POST kräver feature flag |
| QA-258 | ✅ pass | extended | consent GET |
| QA-259 | ⏭ skip | extended | family_features admin |
| QA-260 | ✅ pass | extended | svenska default |
| QA-261 | ⚠️ partial | extended | header UI browser |
| QA-262 | ⏭ skip | extended | admin — inga credentials |
| QA-263 | ⏭ skip | extended | admin panel |
| QA-264 | ⏭ skip | extended | admin panel |
| QA-265 | ⏭ skip | extended | admin panel |
| QA-266 | ⏭ skip | extended | admin panel |
| QA-267 | ⏭ skip | extended | admin panel |
| QA-268 | ⏭ skip | extended | admin panel |
| QA-269 | ⏭ skip | extended | admin panel |
| QA-270 | ⏭ skip | extended | admin panel |
| QA-271 | ⏭ skip | extended | admin panel |
| QA-272 | ⏭ skip | extended | admin panel |
| QA-273 | ⏭ skip | extended | admin panel |
| QA-274 | ⏭ skip | extended | admin panel |
| QA-275 | ⏭ skip | extended | admin panel |
| QA-276 | ⏭ skip | extended | admin panel |
| QA-277 | ⏭ skip | extended | admin panel |
| QA-278 | ⏭ skip | extended | admin panel |
| QA-279 | ⏭ skip | extended | admin panel |
| QA-280 | ⏭ skip | extended | admin panel |
| QA-281 | ⏭ skip | extended | admin panel |
| QA-282 | ⏭ skip | extended | admin panel |
| QA-283 | ⏭ skip | extended | admin panel |
| QA-284 | ⏭ skip | extended | admin panel |
| QA-285 | ⏭ skip | extended | admin panel |
| QA-286 | ⏭ skip | extended | admin panel |
| QA-287 | ⏭ skip | extended | surveys live |
| QA-288 | ⏭ skip | extended | surveys |
| QA-289 | ⏭ skip | extended | surveys |
| QA-290 | ⏭ skip | extended | surveys |
| QA-291 | ⏭ skip | extended | contest |
| QA-292 | ⏭ skip | extended | dagens_nyhet admin |
| QA-293 | ⏭ skip | extended | newsletter admin |
| QA-294 | ⚠️ partial | extended | välkomstmail — registrering körd |
| QA-295 | ⏭ skip | extended | EMAIL_ENABLED env |
| QA-296 | ⏭ skip | extended | unsubscribe token |
| QA-297 | ⏭ skip | extended | a11y keyboard browser |
| QA-298 | ⏭ skip | extended | touch targets browser |
| QA-299 | ⏭ skip | extended | perf 4G browser |
| QA-300 | ⚠️ partial | extended | JS parse — qa-local-run |