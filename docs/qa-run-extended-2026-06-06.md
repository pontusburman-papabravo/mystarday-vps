# Extended Live QA — QA-EXT-2026-06-06-mq2s6832

| Base | https://188.66.60.93 | Host | mystarday.se |

| ✅ | 46 | ⚠️ | 50 | ❌ | 0 | ⏭ | 110 |

| ID | Status | Anteckning |
|----|--------|------------|
| QA-007 | ✅ pass | / HTML |
| QA-008 | ⚠️ partial | /en → 302 |
| QA-009 | ⚠️ partial | /en-thank-you → 302 |
| QA-010 | ⚠️ partial | /pedagoger-och-terapeuter → 302 |
| QA-012 | ✅ pass | /privacy HTML |
| QA-014 | ⚠️ partial | /offline → 302 |
| QA-019 | ⚠️ partial | grace period — inloggad utan verify |
| QA-022 | ✅ pass | /forgot-password HTML |
| QA-023 | ✅ pass | /reset-password HTML |
| QA-025 | ⏭ skip | Apple IdP |
| QA-026 | ⏭ skip | Apple IdP |
| QA-027 | ⚠️ partial | isAppleSignInAvailable — kod OK, Android ej testad här |
| QA-030 | ⏭ skip | load test |
| QA-031 | ⚠️ partial | 30d cookie TTL — kräver browser |
| QA-034 | ✅ pass | barn → family 403 |
| QA-035 | ✅ pass | barn /api/me/rewards OK |
| QA-037 | ⚠️ partial | refresh körd i full suite |
| QA-039 | ⏭ skip | multi-tab browser |
| QA-040 | ✅ pass | httpOnly cookies |
| QA-043 | ⚠️ partial | XSS — npm test lokalt |
| QA-044 | ⚠️ partial | security headers — kräver header-inspektion |
| QA-045 | ⏭ skip | maintenance mode |
| QA-046 | ⏭ skip | admin impersonation |
| QA-047 | ⚠️ partial | request-id i fel |
| QA-048 | ⚠️ partial | static exempt — kod |
| QA-049 | ⚠️ partial | admin refresh exempt — kod |
| QA-050 | ✅ pass | PIN hash ej i API-svar |
| QA-059 | ✅ pass | /onboarding HTML |
| QA-060 | ✅ pass | /onboarding HTML |
| QA-065 | ✅ pass | /assign-schedule HTML |
| QA-068 | ✅ pass | barnkort data |
| QA-070 | ✅ pass | /dashboard HTML |
| QA-071 | ✅ pass | /dashboard HTML |
| QA-072 | ✅ pass | /child-login HTML |
| QA-073 | ✅ pass | /onboarding?flow=add-child HTML |
| QA-074 | ✅ pass | systemmeddelanden unread |
| QA-079 | ✅ pass | unread count |
| QA-082 | ✅ pass | redigera barn → 200 |
| QA-083 | ⏭ skip | R2 upload kräver fil |
| QA-084 | ⚠️ partial | avatar fallback — manuell UI |
| QA-085 | ✅ pass | view-config |
| QA-087 | ⏭ skip | radera barn — destruktivt |
| QA-088 | ⚠️ partial | primary-only delete — kod |
| QA-089 | ⏭ skip | PIN-ändring destruktiv |
| QA-091 | ✅ pass | username för child-login finns |
| QA-092 | ✅ pass | 2 barn i lista |
| QA-093 | ⚠️ partial | /family-week → 301 |
| QA-094 | ✅ pass | /calendar HTML |
| QA-095 | ⚠️ partial | födelsedag/tidszon UI |
| QA-106 | ⏭ skip | PG browser |
| QA-108 | ⏭ skip | barn selfie |
| QA-110 | ⏭ skip | barn inlösen — kräver barnsession + saldo |
| QA-111 | ⏭ skip | barn saldo |
| QA-112 | ⏭ skip | v2 child |
| QA-113 | ⏭ skip | device mode browser |
| QA-114 | ⚠️ partial | barn logout |
| QA-115 | ⏭ skip | animationer browser |
| QA-116 | ✅ pass | pin-status |
| QA-117 | ⏭ skip | unlock PIN primary |
| QA-118 | ⏭ skip | biometri |
| QA-119 | ⚠️ partial | parent-pin API finns |
| QA-120 | ⏭ skip | PG re-auth |
| QA-121 | ⏭ skip | dörr-ikon |
| QA-122 | ⚠️ partial | barn-PIN ≠ parent-PIN — separata |
| QA-123 | ⏭ skip | PIN email cooldown |
| QA-124 | ⚠️ partial | PIN maskering UI |
| QA-125 | ⚠️ partial | låst barn URL — delvis |
| QA-127 | ✅ pass | 7-dagars schema data |
| QA-128 | ⚠️ partial | bibliotek — via onboarding redan |
| QA-129 | ⚠️ partial | standardbibliotek |
| QA-130 | ✅ pass | egen aktivitet → 201 |
| QA-132 | ⏭ skip | schedule item delete — destruktivt |
| QA-133 | ⏭ skip | destruktivt |
| QA-134 | ⏭ skip | DnD browser |
| QA-135 | ⏭ skip | touch browser |
| QA-136 | ✅ pass | veckomall finns |
| QA-137 | ⏭ skip | manuell schedule edit |
| QA-138 | ⏭ skip | särskild dag — manuell |
| QA-141 | ⏭ skip | fill-week manuell |
| QA-142 | ✅ pass | aktivitetsbibliotek API |
| QA-143 | ⚠️ partial | library API |
| QA-144 | ✅ pass | kategorier |
| QA-145 | ⏭ skip | retroaktiv logg |
| QA-146 | ⚠️ partial | tidszon — Europe/Stockholm default |
| QA-147 | ⚠️ partial | sektionstider family settings |
| QA-148 | ⏭ skip | pedagog roll |
| QA-149 | ⏭ skip | subscription paywall test |
| QA-150 | ⏭ skip | bulk edit |
| QA-151 | ✅ pass | daily-logs range |
| QA-171 | ✅ pass | belöningar CRUD lista |
| QA-172 | ✅ pass | skapa belöning |
| QA-173 | ⚠️ partial | redigera belöning — skip write |
| QA-174 | ⏭ skip | destruktiv |
| QA-175 | ✅ pass | redemptions lista |
| QA-176 | ⏭ skip | barnvy inlösen |
| QA-177 | ⏭ skip | push redemption |
| QA-178 | ⏭ skip | admin default rewards |
| QA-179 | ⏭ skip | Skattkammaren UI browser |
| QA-180 | ✅ pass | /reports HTML |
| QA-186 | ⚠️ partial | observations → 400 |
| QA-188 | ⚠️ partial | reports → 500 |
| QA-189 | ⏭ skip | PDF export |
| QA-190 | ⏭ skip | share link create |
| QA-191 | ⏭ skip | pedagog notes |
| QA-192 | ⏭ skip | view_count |
| QA-193 | ⏭ skip | PDF |
| QA-194 | ⏭ skip | date filter UI |
| QA-195 | ✅ pass | general observations |
| QA-198 | ⚠️ partial | childIds invite — kräver e-post token |
| QA-199 | ✅ pass | /accept-invite HTML |
| QA-201 | ⏭ skip | expired invite token |
| QA-202 | ✅ pass | pending invites i API |
| QA-203 | ✅ pass | familj: QA Primarys familj |
| QA-204 | ⚠️ partial | shared pedagog — kod requirePrimaryParent |
| QA-205 | ⏭ skip | delete-account destruktivt |
| QA-208 | ⏭ skip | pedagog invite — kräver setup |
| QA-209 | ⏭ skip | pedagog accept |
| QA-210 | ⏭ skip | pedagog dashboard |
| QA-211 | ⚠️ partial | /pedagog-oversikt → 302 |
| QA-212 | ⏭ skip | pedagog-only konto |
| QA-213 | ⏭ skip | pedagog observation |
| QA-215 | ⏭ skip | revoke pedagog |
| QA-216 | ⏭ skip | account_type |
| QA-217 | ⏭ skip | professionell rapport PIN |
| QA-218 | ⚠️ partial | pedagog landning HTML testad |
| QA-219 | ⏭ skip | dual account |
| QA-220 | ⏭ skip | web push browser |
| QA-221 | ⏭ skip | APNs |
| QA-222 | ⏭ skip | FCM |
| QA-223 | ⏭ skip | APNs cleanup |
| QA-224 | ✅ pass | notification_log API |
| QA-225 | ⚠️ partial | markera läst — skip mutation |
| QA-226 | ⏭ skip | push tap device |
| QA-227 | ⏭ skip | admin push |
| QA-228 | ⚠️ partial | reminders scheduler — kod |
| QA-229 | ⚠️ partial | admin_push_enabled |
| QA-230 | ⚠️ partial | badge UI |
| QA-231 | ⚠️ partial | push av |
| QA-232 | ✅ pass | /dashboard HTML |
| QA-233 | ⚠️ partial | SW version — kod |
| QA-234 | ⏭ skip | offline sync browser |
| QA-235 | ⚠️ partial | platform-theme inject |
| QA-236 | ⏭ skip | native CSS |
| QA-237 | ⏭ skip | safe area native |
| QA-238 | ⏭ skip | Android back |
| QA-239 | ⏭ skip | deep link device |
| QA-240 | ⏭ skip | PWA install |
| QA-241 | ⏭ skip | Google auth |
| QA-242 | ⏭ skip | iOS statusbar |
| QA-243 | ⏭ skip | haptik |
| QA-244 | ⚠️ partial | subscription status |
| QA-245 | ✅ pass | familyId subscription |
| QA-246 | ⚠️ partial | trial info i status |
| QA-247 | ⚠️ partial | trial expired — ej testbar |
| QA-248 | ⏭ skip | Stripe checkout live |
| QA-249 | ⚠️ partial | payment-success HTML finns |
| QA-250 | ⏭ skip | IAP webhook |
| QA-251 | ✅ pass | /upgrade HTML |
| QA-253 | ⚠️ partial | visningsnamn: ? |
| QA-254 | ✅ pass | accountAuth i /me |
| QA-255 | ✅ pass | push prefs API |
| QA-256 | ⏭ skip | newsletter mutation |
| QA-257 | ⚠️ partial | tyck HTML — POST kräver feature flag |
| QA-258 | ✅ pass | consent GET |
| QA-259 | ⏭ skip | family_features admin |
| QA-260 | ✅ pass | svenska default |
| QA-261 | ⚠️ partial | header UI browser |
| QA-262 | ⏭ skip | admin — inga credentials |
| QA-263 | ⏭ skip | admin panel |
| QA-264 | ⏭ skip | admin panel |
| QA-265 | ⏭ skip | admin panel |
| QA-266 | ⏭ skip | admin panel |
| QA-267 | ⏭ skip | admin panel |
| QA-268 | ⏭ skip | admin panel |
| QA-269 | ⏭ skip | admin panel |
| QA-270 | ⏭ skip | admin panel |
| QA-271 | ⏭ skip | admin panel |
| QA-272 | ⏭ skip | admin panel |
| QA-273 | ⏭ skip | admin panel |
| QA-274 | ⏭ skip | admin panel |
| QA-275 | ⏭ skip | admin panel |
| QA-276 | ⏭ skip | admin panel |
| QA-277 | ⏭ skip | admin panel |
| QA-278 | ⏭ skip | admin panel |
| QA-279 | ⏭ skip | admin panel |
| QA-280 | ⏭ skip | admin panel |
| QA-281 | ⏭ skip | admin panel |
| QA-282 | ⏭ skip | admin panel |
| QA-283 | ⏭ skip | admin panel |
| QA-284 | ⏭ skip | admin panel |
| QA-285 | ⏭ skip | admin panel |
| QA-286 | ⏭ skip | admin panel |
| QA-287 | ⏭ skip | surveys live |
| QA-288 | ⏭ skip | surveys |
| QA-289 | ⏭ skip | surveys |
| QA-290 | ⏭ skip | surveys |
| QA-291 | ⏭ skip | contest |
| QA-292 | ⏭ skip | dagens_nyhet admin |
| QA-293 | ⏭ skip | newsletter admin |
| QA-294 | ⚠️ partial | välkomstmail — registrering körd |
| QA-295 | ⏭ skip | EMAIL_ENABLED env |
| QA-296 | ⏭ skip | unsubscribe token |
| QA-297 | ⏭ skip | a11y keyboard browser |
| QA-298 | ⏭ skip | touch targets browser |
| QA-299 | ⏭ skip | perf 4G browser |
| QA-300 | ⚠️ partial | JS parse — qa-local-run |