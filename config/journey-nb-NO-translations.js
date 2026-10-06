'use strict';

/**
 * nb-NO copy for journey_experience_registry rows (shared by migration + JSON fallback).
 * Keys match experience_key in config/journey-experience-registry.json.
 * Values: [headline, body, cta] — body may be null for empty body.
 */
module.exports = {
  handoff_to_child: ['La barnet prøve rutinen sin', 'Åpne barnemodus sammen — barnet ser med en gang hva som skal gjøres.', 'Prøv barnemodus nå'],
  parent_ack_completion: ['Barnet ble ferdig med en aktivitet!', 'Bekreft, så dere kan feire den første suksessen sammen.', 'Se'],
  celebrate_first_success: ['Første stjerne er i boks!', 'Barnet fullførte den første aktiviteten — og du så det. Det er en ekte milepæl.', 'Så fint!'],
  fw_day1_morning: ['God morgen', 'Planen er klar. La barnet logge inn og starte dagen i sitt eget tempo.', 'Vis barnet'],
  fw_day1_evening: ['En rolig kveld', 'En enkel kveldsrutine gjør morgendagen lettere. Se sammen på det som kommer.', 'Til kvelden'],
  fw_day2_quiet: ['Barnet finner rytmen', 'Du trenger ikke gjøre så mye nå — la barnet lede.', 'Se barneopplevelsen'],
  fw_day3_new_day: ['I morgen er en ny dag', 'I går gikk det ikke som planlagt — det er greit. Rutinen er her når dere er klare.', 'OK'],
  fw_day4_discovery: ['Noe nytt i verden', 'Barnet fant noe nytt i stjerneverdenen — helt selv.', 'Se hva som skjedde'],
  fw_week_reflection: ['En uke sammen', '', 'Lukk'],
  coach_consistency: ['Bygg vanen', 'Barnet er i gang — hold rutinen lett og gøy denne uken.', 'Vis tips'],
  coach_evening: ['Kveldsrutine?', 'Familier som legger til en enkel kveldsrutine, får ofte roligere dager.', 'Utforsk'],
  sj_day1_child_preview: ['Rutinen er klar', 'Planen er på plass. Se på barnets dag når det passer — du trenger ikke gjøre alt i kveld.', 'Se barnets dag'],
  sj_day2_try_routine: ['Prøv rutinen i hverdagen', 'Det holder å se sammen en liten stund. Ingen hast.', 'Åpne plan'],
  sj_day3_child_try: ['På tide å la barnet prøve', 'Vis PIN-koden og la barnet logge inn i sin egen visning.', 'Vis barnekode'],
  sj_celebrate_star: ['En stjerne!', 'Barnet ble ferdig med en aktivitet — feir sammen.', 'Så fint!'],
  sj_introduce_stars: ['Slik virker stjerner', 'Hver avkrysset aktivitet gir en stjerne. Stjerner kan byttes mot belønninger i stjernekisten.', 'Se stjernekisten'],
  sj_welcome_child_login: ['Barnet er inne!', 'God start — la barnet lede i sitt eget tempo.', 'Så fint!'],
  sj_help_get_started: ['Trenger du et lite puff?', 'Rutinen venter. Se på barnets dag — det tar ett minutt.', 'Se barnets dag'],
  sj_day7_reflection: ['En uke sammen', '', 'Lukk'],
  coach_expand: ['Dere er i flyten', 'Rutinen sitter. Utforsk nye belønninger, eller inviter en medforelder.', 'Fortsett'],
};
