'use strict';

/**
 * nl-NL copy for journey_experience_registry rows (shared by migration + JSON fallback).
 * Keys match experience_key in config/journey-experience-registry.json.
 * Values: [headline, body, cta] — body may be null for empty body.
 */
module.exports = {
  handoff_to_child: ['Laat je kind de routine proberen', 'Open samen de kindweergave — je kind ziet meteen wat er te doen is.', 'Kindweergave nu proberen'],
  parent_ack_completion: ['Je kind heeft een activiteit afgerond!', 'Bevestig het, zodat jullie het eerste succes samen kunnen vieren.', 'Bekijken'],
  celebrate_first_success: ['Eerste ster binnen!', 'Je kind heeft de eerste activiteit gedaan — en jij hebt het gezien. Dat is een echte mijlpaal.', 'Wat fijn!'],
  fw_day1_morning: ['Goedemorgen', 'Het schema staat klaar. Laat je kind inloggen en de dag in eigen tempo beginnen.', 'Laat het je kind zien'],
  fw_day1_evening: ['Een rustige avond', 'Een eenvoudige avondroutine maakt morgen makkelijker. Kijk samen wat er komt.', 'Naar de avond'],
  fw_day2_quiet: ['Je kind vindt het ritme', 'Je hoeft nu niet veel te doen — laat je kind de leiding nemen.', 'Kindweergave bekijken'],
  fw_day3_new_day: ['Morgen is een nieuwe dag', 'Gisteren liep het niet zoals gepland — dat is oké. De routine is er als jullie er klaar voor zijn.', 'OK'],
  fw_day4_discovery: ['Iets nieuws in de wereld', 'Je kind heeft iets nieuws gevonden in de sterrenwereld — helemaal zelf.', 'Kijk wat er gebeurde'],
  fw_week_reflection: ['Een week samen', '', 'Sluiten'],
  coach_consistency: ['Bouw de gewoonte op', 'Je kind is op weg — houd de routine deze week licht en leuk.', 'Tips tonen'],
  coach_evening: ['Avondroutine?', 'Gezinnen met een eenvoudige avondroutine hebben vaak rustigere dagen.', 'Ontdekken'],
  sj_day1_child_preview: ['Jullie routine staat klaar', 'Het schema staat. Kijk naar de dag van je kind wanneer het uitkomt — vanavond hoeft niet alles af.', 'Dag van je kind bekijken'],
  sj_day2_try_routine: ['Probeer de routine in het dagelijks leven', 'Het is genoeg om een tijdje samen te kijken. Geen haast.', 'Schema openen'],
  sj_day3_child_try: ['Tijd om je kind het te laten proberen', 'Laat de pincode zien en laat je kind inloggen in de eigen weergave.', 'Kindcode tonen'],
  sj_celebrate_star: ['Een ster!', 'Je kind heeft een activiteit afgerond — vier het samen.', 'Wat fijn!'],
  sj_introduce_stars: ['Zo werken sterren', 'Elke afgevinkte activiteit levert een ster op. Sterren kun je in de sterrenkist inwisselen voor beloningen.', 'Sterrenkist bekijken'],
  sj_welcome_child_login: ['Je kind is binnen!', 'Goede start — laat je kind in eigen tempo de leiding nemen.', 'Wat fijn!'],
  sj_help_get_started: ['Een duwtje nodig?', 'Jullie routine wacht. Kijk naar de dag van je kind — dat duurt een minuut.', 'Dag van je kind bekijken'],
  sj_day7_reflection: ['Een week samen', '', 'Sluiten'],
  coach_expand: ['Jullie zitten in de flow', 'De routine blijft hangen. Ontdek nieuwe beloningen of nodig een andere ouder uit.', 'Verder'],
};
