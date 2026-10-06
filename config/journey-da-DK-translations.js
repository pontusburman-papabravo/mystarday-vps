'use strict';

/**
 * da-DK copy for journey_experience_registry rows (shared by migration + JSON fallback).
 * Keys match experience_key in config/journey-experience-registry.json.
 * Values: [headline, body, cta] — body may be null for empty body.
 */
module.exports = {
  handoff_to_child: ['Lad dit barn prøve sin rutine', 'Åbn barnets visning sammen — dit barn ser med det samme, hvad det skal gøre.', 'Prøv barnets visning nu'],
  parent_ack_completion: ['Dit barn blev færdig med en aktivitet!', 'Bekræft, så I kan fejre den første succes sammen.', 'Se'],
  celebrate_first_success: ['Første stjerne er i hus!', 'Dit barn gennemførte sin første aktivitet — og du så det. Det er en rigtig milepæl.', 'Hvor fint!'],
  fw_day1_morning: ['Godmorgen', 'Skemaet er klar. Lad dit barn logge ind og starte dagen i sit eget tempo.', 'Vis det til dit barn'],
  fw_day1_evening: ['En rolig aften', 'En enkel aftenrutine gør dagen i morgen lettere. Se sammen på, hvad der kommer.', 'Til aftenen'],
  fw_day2_quiet: ['Dit barn finder rytmen', 'Du behøver ikke gøre meget nu — lad dit barn føre an.', 'Se barnets visning'],
  fw_day3_new_day: ['I morgen er en ny dag', 'I går gik det ikke som planlagt — det er helt fint. Rutinen er her, når I er klar.', 'OK'],
  fw_day4_discovery: ['Noget nyt i verden', 'Dit barn fandt noget nyt i stjerneverdenen — helt selv.', 'Se, hvad der skete'],
  fw_week_reflection: ['En uge sammen', '', 'Luk'],
  coach_consistency: ['Byg vanen', 'Dit barn er i gang — hold rutinen let og sjov i denne uge.', 'Vis tips'],
  coach_evening: ['Aftenrutine?', 'Familier med en enkel aftenrutine får ofte roligere dage.', 'Udforsk'],
  sj_day1_child_preview: ['Jeres rutine er klar', 'Skemaet er på plads. Se på dit barns dag, når det passer — I behøver ikke nå det hele i aften.', 'Se barnets dag'],
  sj_day2_try_routine: ['Prøv rutinen i hverdagen', 'Det er nok at kigge sammen et øjeblik. Ingen hast.', 'Åbn skema'],
  sj_day3_child_try: ['Tid til at lade dit barn prøve', 'Vis PIN-koden, og lad dit barn logge ind i sin egen visning.', 'Vis barnets kode'],
  sj_celebrate_star: ['En stjerne!', 'Dit barn blev færdig med en aktivitet — fejr det sammen.', 'Hvor fint!'],
  sj_introduce_stars: ['Sådan virker stjerner', 'Hver afkrydset aktivitet giver en stjerne. Stjerner kan byttes til belønninger i stjernekisten.', 'Se stjernekisten'],
  sj_welcome_child_login: ['Dit barn er inde!', 'God start — lad dit barn føre an i sit eget tempo.', 'Hvor fint!'],
  sj_help_get_started: ['Brug for et skub?', 'Jeres rutine venter. Se på dit barns dag — det tager et minut.', 'Se barnets dag'],
  sj_day7_reflection: ['En uge sammen', '', 'Luk'],
  coach_expand: ['I er i gang', 'Rutinen er ved at sidde. Udforsk nye belønninger, eller inviter en medforælder.', 'Fortsæt'],
};
