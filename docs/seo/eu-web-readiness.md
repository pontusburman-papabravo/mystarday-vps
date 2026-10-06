# Public web readiness — EU27 + Norway + Iceland

Language is the indexable layer. Market is a separate noindex campaign layer.
Canada remains the existing English campaign and is not one of the 29.
Paths below are pathnames. A path with no language prefix belongs on the Swedish public host. /en, /nl and later language prefixes belong on the app host.

## Markets

| market | supported locales | default locale | webAvailable | marketingActive | market URLs |
| --- | --- | --- | --- | --- | --- |
| AT | de en | de | true | false | /de/at /en/at |
| BE | nl fr de en | nl | true | false | /nl/be /fr/be /de/be /en/be |
| BG | bg en | bg | true | false | /en/bg |
| HR | hr en | hr | true | false | /en/hr |
| CY | el en | el | true | false | /en/cy |
| CZ | cs en | cs | true | false | /en/cz |
| DK | da en | da | true | false | /da/dk /en/dk |
| EE | et en | et | true | false | /en/ee |
| FI | fi sv en | fi | true | false | /fi/fi /en/fi |
| FR | fr en | fr | true | false | /fr/fr /en/fr |
| DE | de en | de | true | false | /de/de /en/de |
| GR | el en | el | true | false | /en/gr |
| HU | hu en | hu | true | false | /en/hu |
| IE | en ga | en | true | true | /en/ie |
| IT | it en | it | true | false | /it/it /en/it |
| LV | lv en | lv | true | false | /en/lv |
| LT | lt en | lt | true | false | /en/lt |
| LU | fr de en | fr | true | false | /fr/lu /de/lu /en/lu |
| MT | mt en | mt | true | false | /en/mt |
| NL | nl en | nl | true | false | /nl/nl /en/nl |
| PL | pl en | pl | true | false | /pl/pl /en/pl |
| PT | pt en | pt | true | false | /pt/pt /en/pt |
| RO | ro en | ro | true | false | /en/ro |
| SK | sk en | sk | true | false | /en/sk |
| SI | sl en | sl | true | false | /en/si |
| ES | es en | es | true | false | /es/es /en/es |
| SE | sv en | sv | true | false | / /en/se |
| NO | nb en | nb | true | false | /nb/no /en/no |
| IS | is en | is | true | false | /is/is /en/is |

## Locale readiness

| locale | complete | seoEnabled | URL count | blocking issue |
| --- | --- | --- | --- | --- |
| bg | false | false | 0 | LOCALE_BLOCKED chrome path.home path.howItWorks path.visualSchedule path.morningRoutine path.weeklySchedule path.neurodiverseRoutines path.rewardSystem path.resources path.faq path.privacy path.terms |
| hr | false | false | 0 | LOCALE_BLOCKED chrome path.home path.howItWorks path.visualSchedule path.morningRoutine path.weeklySchedule path.neurodiverseRoutines path.rewardSystem path.resources path.faq path.privacy path.terms |
| cs | false | false | 0 | LOCALE_BLOCKED chrome path.home path.howItWorks path.visualSchedule path.morningRoutine path.weeklySchedule path.neurodiverseRoutines path.rewardSystem path.resources path.faq path.privacy path.terms |
| da | true | true | 11 |  |
| nl | true | true | 11 |  |
| en | true | true | 41 |  |
| et | false | false | 0 | LOCALE_BLOCKED chrome path.home path.howItWorks path.visualSchedule path.morningRoutine path.weeklySchedule path.neurodiverseRoutines path.rewardSystem path.resources path.faq path.privacy path.terms |
| fi | true | true | 11 |  |
| fr | true | true | 11 |  |
| de | true | true | 11 |  |
| el | false | false | 0 | LOCALE_BLOCKED chrome path.home path.howItWorks path.visualSchedule path.morningRoutine path.weeklySchedule path.neurodiverseRoutines path.rewardSystem path.resources path.faq path.privacy path.terms |
| hu | false | false | 0 | LOCALE_BLOCKED chrome path.home path.howItWorks path.visualSchedule path.morningRoutine path.weeklySchedule path.neurodiverseRoutines path.rewardSystem path.resources path.faq path.privacy path.terms |
| ga | false | false | 0 | LOCALE_BLOCKED chrome path.home path.howItWorks path.visualSchedule path.morningRoutine path.weeklySchedule path.neurodiverseRoutines path.rewardSystem path.resources path.faq path.privacy path.terms |
| it | true | true | 11 |  |
| lv | false | false | 0 | LOCALE_BLOCKED chrome path.home path.howItWorks path.visualSchedule path.morningRoutine path.weeklySchedule path.neurodiverseRoutines path.rewardSystem path.resources path.faq path.privacy path.terms |
| lt | false | false | 0 | LOCALE_BLOCKED chrome path.home path.howItWorks path.visualSchedule path.morningRoutine path.weeklySchedule path.neurodiverseRoutines path.rewardSystem path.resources path.faq path.privacy path.terms |
| mt | false | false | 0 | LOCALE_BLOCKED chrome path.home path.howItWorks path.visualSchedule path.morningRoutine path.weeklySchedule path.neurodiverseRoutines path.rewardSystem path.resources path.faq path.privacy path.terms |
| pl | true | true | 11 |  |
| pt | true | true | 11 |  |
| ro | false | false | 0 | LOCALE_BLOCKED chrome path.home path.howItWorks path.visualSchedule path.morningRoutine path.weeklySchedule path.neurodiverseRoutines path.rewardSystem path.resources path.faq path.privacy path.terms |
| sk | false | false | 0 | LOCALE_BLOCKED chrome path.home path.howItWorks path.visualSchedule path.morningRoutine path.weeklySchedule path.neurodiverseRoutines path.rewardSystem path.resources path.faq path.privacy path.terms |
| sl | false | false | 0 | LOCALE_BLOCKED chrome path.home path.howItWorks path.visualSchedule path.morningRoutine path.weeklySchedule path.neurodiverseRoutines path.rewardSystem path.resources path.faq path.privacy path.terms |
| es | true | true | 11 |  |
| sv | true | true | 33 |  |
| nb | true | true | 11 |  |
| is | true | true | 11 |  |

## Sitemap

- App host sitemap: /sitemap.xml
- Swedish host sitemap: /sitemap.xml
- Indexable URLs in this plan: 195
- Per locale: da=11, de=11, en=41, es=11, fi=11, fr=11, is=11, it=11, nb=11, nl=11, pl=11, pt=11, sv=33
- Market rows are noindex and absent from the sitemap.
- One sitemap per host. A sitemap index is not needed at this size.

## Hreflang

Language tags come from contentKey. x-default is the English URL of that content. Market pages are outside the clusters. Swedish uses sv-SE.

## High priority for URL Inspection

- sv home /
- en home /en
- nl home /nl
- de home /de
- fr home /fr
- es home /es
- it home /it
- pl home /pl
- da home /da
- fi home /fi
- nb home /nb
- is home /is
- pt home /pt
- sv visualSchedule /bildschema-app
- en visualSchedule /en/visual-schedule-app
- nl visualSchedule /nl/visueel-schema
- de visualSchedule /de/visueller-tagesplan
- fr visualSchedule /fr/emploi-du-temps-visuel
- es visualSchedule /es/horario-visual
- it visualSchedule /it/schema-visivo
- pl visualSchedule /pl/plan-dnia-obrazkowy
- da visualSchedule /da/visuel-dagsplan
- fi visualSchedule /fi/kuvallinen-paivasuunnitelma
- nb visualSchedule /nb/visuell-dagsplan
- is visualSchedule /is/sjonraen-dagskra
- pt visualSchedule /pt/horario-visual
- sv morningRoutine /morgonrutin-barn
- en morningRoutine /en/morning-routine-children
- nl morningRoutine /nl/ochtendroutine-kinderen
- de morningRoutine /de/morgenroutine-kinder
- fr morningRoutine /fr/routine-du-matin
- es morningRoutine /es/rutina-matinal
- it morningRoutine /it/routine-del-mattino
- pl morningRoutine /pl/poranna-rutyna
- da morningRoutine /da/morgenrutine
- fi morningRoutine /fi/aamurutiini
- nb morningRoutine /nb/morgenrutine
- is morningRoutine /is/morgunvenja
- pt morningRoutine /pt/rotina-da-manha
- sv weeklySchedule /veckoschema-bildstod
- en weeklySchedule /en/weekly-schedule-visual-support
- nl weeklySchedule /nl/weekplanning-met-pictogrammen
- de weeklySchedule /de/wochenplan-piktogramme
- fr weeklySchedule /fr/planning-hebdomadaire
- es weeklySchedule /es/plan-semanal
- it weeklySchedule /it/piano-settimanale
- pl weeklySchedule /pl/plan-tygodnia
- da weeklySchedule /da/ugeplan-piktogrammer
- fi weeklySchedule /fi/viikkosuunnitelma
- nb weeklySchedule /nb/ukeplan
- is weeklySchedule /is/vikuaaetlun
- pt weeklySchedule /pt/plano-semanal
- sv neurodiverseRoutines /rutiner-npf-barn
- en neurodiverseRoutines /en/routines-neurodiverse-children
- nl neurodiverseRoutines /nl/routines-neurodiverse-kinderen
- de neurodiverseRoutines /de/routinen-neurodiverse-kinder
- fr neurodiverseRoutines /fr/routines-enfants-neurodivergents
- es neurodiverseRoutines /es/rutinas-ninos-neurodivergentes
- it neurodiverseRoutines /it/routine-bambini-neurodivergenti
- pl neurodiverseRoutines /pl/rutyny-dzieci-neuroroznorodnych
- da neurodiverseRoutines /da/rutiner-neurodiverse-boern
- fi neurodiverseRoutines /fi/rutiinit-neurokirjo
- nb neurodiverseRoutines /nb/rutiner-nevromangfoldige-barn
- is neurodiverseRoutines /is/venjur-taugafraedileg-born
- pt neurodiverseRoutines /pt/rotinas-criancas-neurodivergentes

## LOCALE_BLOCKED

These locales are registered and routed as not available. They are not in the sitemap.

- bg: LOCALE_BLOCKED chrome path.home path.howItWorks path.visualSchedule path.morningRoutine path.weeklySchedule path.neurodiverseRoutines path.rewardSystem path.resources path.faq path.privacy path.terms
- hr: LOCALE_BLOCKED chrome path.home path.howItWorks path.visualSchedule path.morningRoutine path.weeklySchedule path.neurodiverseRoutines path.rewardSystem path.resources path.faq path.privacy path.terms
- cs: LOCALE_BLOCKED chrome path.home path.howItWorks path.visualSchedule path.morningRoutine path.weeklySchedule path.neurodiverseRoutines path.rewardSystem path.resources path.faq path.privacy path.terms
- et: LOCALE_BLOCKED chrome path.home path.howItWorks path.visualSchedule path.morningRoutine path.weeklySchedule path.neurodiverseRoutines path.rewardSystem path.resources path.faq path.privacy path.terms
- el: LOCALE_BLOCKED chrome path.home path.howItWorks path.visualSchedule path.morningRoutine path.weeklySchedule path.neurodiverseRoutines path.rewardSystem path.resources path.faq path.privacy path.terms
- hu: LOCALE_BLOCKED chrome path.home path.howItWorks path.visualSchedule path.morningRoutine path.weeklySchedule path.neurodiverseRoutines path.rewardSystem path.resources path.faq path.privacy path.terms
- ga: LOCALE_BLOCKED chrome path.home path.howItWorks path.visualSchedule path.morningRoutine path.weeklySchedule path.neurodiverseRoutines path.rewardSystem path.resources path.faq path.privacy path.terms
- lv: LOCALE_BLOCKED chrome path.home path.howItWorks path.visualSchedule path.morningRoutine path.weeklySchedule path.neurodiverseRoutines path.rewardSystem path.resources path.faq path.privacy path.terms
- lt: LOCALE_BLOCKED chrome path.home path.howItWorks path.visualSchedule path.morningRoutine path.weeklySchedule path.neurodiverseRoutines path.rewardSystem path.resources path.faq path.privacy path.terms
- mt: LOCALE_BLOCKED chrome path.home path.howItWorks path.visualSchedule path.morningRoutine path.weeklySchedule path.neurodiverseRoutines path.rewardSystem path.resources path.faq path.privacy path.terms
- ro: LOCALE_BLOCKED chrome path.home path.howItWorks path.visualSchedule path.morningRoutine path.weeklySchedule path.neurodiverseRoutines path.rewardSystem path.resources path.faq path.privacy path.terms
- sk: LOCALE_BLOCKED chrome path.home path.howItWorks path.visualSchedule path.morningRoutine path.weeklySchedule path.neurodiverseRoutines path.rewardSystem path.resources path.faq path.privacy path.terms
- sl: LOCALE_BLOCKED chrome path.home path.howItWorks path.visualSchedule path.morningRoutine path.weeklySchedule path.neurodiverseRoutines path.rewardSystem path.resources path.faq path.privacy path.terms

## LEGAL_CONTENT_GAP

No new country-specific legal rules were written. Privacy and terms for a published locale are a translation of the existing English and Dutch baseline. Unpublished locales stay out of the index until that translation exists.

Published so far: da, nl, en, fi, fr, de, it, pl, pt, es, sv, nb, is. Their legal pages name Papa Bravo AB, the Swedish authority Integritetsskyddsmyndigheten (IMY), and the verified price facts. They do not add a local statute.

## APP_INTEGRATION_GAP

- market: all 29 web markets
- locale: the market page locale where that language is a campaign locale
- current web behavior: the CTA links to the existing /en/register form and sets data-market for public analytics. The form already asks for country_code and the country list already contains these codes.
- what the app agent needs to solve: registration does not read a market or locale from the URL. The family still chooses the country in the form. Do not add a new query contract from this web change.
