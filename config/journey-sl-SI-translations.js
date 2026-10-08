'use strict';

/**
 * sl-SI copy for journey_experience_registry rows (shared by migration + JSON fallback).
 * Keys match experience_key in config/journey-experience-registry.json.
 * Values: [headline, body, cta] — body may be null for empty body.
 */
module.exports = {
  handoff_to_child: ['Naj otrok preizkusi svojo rutino', 'Skupaj odprita otroški način — otrok takoj vidi, kaj narediti.', 'Preizkusi otroški način'],
  parent_ack_completion: ['Otrok je končal dejavnost!', 'Potrdi, da lahko skupaj praznujeta prvi uspeh.', 'Poglej'],
  celebrate_first_success: ['Prva zvezdica je tu!', 'Otrok je končal prvo dejavnost — in ti si to videl. To je pravi mejnik.', 'Kako lepo!'],
  fw_day1_morning: ['Dobro jutro', 'Urnik je pripravljen. Naj se otrok prijavi in začne dan v svojem tempu.', 'Pokaži otroku'],
  fw_day1_evening: ['Miren večer', 'Preprosta večerna rutina olajša jutri. Skupaj poglejta, kaj prihaja.', 'Na večer'],
  fw_day2_quiet: ['Otrok išče svoj ritem', 'Zdaj ti ni treba veliko narediti — naj vodi otrok.', 'Poglej otroško izkušnjo'],
  fw_day3_new_day: ['Jutri je nov dan', 'Včeraj ni šlo po načrtu — v redu je. Rutina je tukaj, ko si pripravljen.', 'V redu'],
  fw_day4_discovery: ['Nekaj novega v svetu', 'Otrok je v zvezdnem svetu sam našel nekaj novega.', 'Poglej, kaj se je zgodilo'],
  fw_week_reflection: ['Teden skupaj', '', 'Zapri'],
  coach_consistency: ['Gradi navado', 'Otrok je na poti — ta teden naj rutina ostane lahka in prijetna.', 'Pokaži nasvete'],
  coach_evening: ['Večerna rutina?', 'Družine, ki dodajo preprosto večerno rutino, pogosto dobijo mirnejše dni.', 'Razišči'],
  sj_day1_child_preview: ['Tvoja rutina je pripravljena', 'Urnik je na mestu. Otrokov dan poglej, ko ti ustreza — nocoj ni treba narediti vsega.', 'Poglej otrokov dan'],
  sj_day2_try_routine: ['Preizkusi rutino v vsakdanu', 'Dovolj je, da jo za nekaj časa pogledata skupaj. Brez hitenja.', 'Odpri urnik'],
  sj_day3_child_try: ['Čas je, da otrok poskusi', 'Pokaži PIN in naj se otrok prijavi v svoj pogled.', 'Pokaži otroško kodo'],
  sj_celebrate_star: ['Zvezdica!', 'Otrok je končal dejavnost — praznujta skupaj.', 'Kako lepo!'],
  sj_introduce_stars: ['Kako delujejo zvezdice', 'Vsaka označena dejavnost prinese zvezdico. Zvezdice lahko zamenjaš za nagrade v Zakladnici.', 'Poglej Zakladnico'],
  sj_welcome_child_login: ['Otrok je notri!', 'Dober začetek — naj otrok vodi v svojem tempu.', 'Kako lepo!'],
  sj_help_get_started: ['Potrebuješ rahel sunek?', 'Tvoja rutina čaka. Poglej otrokov dan — traja minuto.', 'Poglej otrokov dan'],
  sj_day7_reflection: ['Teden skupaj', '', 'Zapri'],
  coach_expand: ['Si v toku', 'Rutina se drži. Razišči nove nagrade ali povabi sostarša.', 'Naprej'],
};
