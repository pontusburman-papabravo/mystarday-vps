'use strict';

/**
 * hr-HR copy for journey_experience_registry rows (shared by migration + JSON fallback).
 * Keys match experience_key in config/journey-experience-registry.json.
 * Values: [headline, body, cta] — body may be null for empty body.
 */
module.exports = {
  handoff_to_child: ['Neka dijete isproba svoju rutinu', 'Otvori dječji način zajedno — dijete odmah vidi što treba napraviti.', 'Isprobaj dječji način'],
  parent_ack_completion: ['Dijete je završilo aktivnost!', 'Potvrdi da zajedno proslavite prvi uspjeh.', 'Pogledaj'],
  celebrate_first_success: ['Prva zvjezdica je tu!', 'Dijete je završilo prvu aktivnost — pred tvojim očima. To je pravi trenutak.', 'Lijepo!'],
  fw_day1_morning: ['Dobro jutro', 'Raspored je spreman. Neka se dijete prijavi i krene dan svojim tempom.', 'Pokaži djetetu'],
  fw_day1_evening: ['Mirna večer', 'Jednostavna večernja rutina olakšava sutra. Pogledaj zajedno što dolazi.', 'Na večer'],
  fw_day2_quiet: ['Dijete hvata ritam', 'Sad ne trebaš puno — neka dijete vodi.', 'Pogledaj dječji prikaz'],
  fw_day3_new_day: ['Sutra je novi dan', 'Jučer nije išlo po planu — i to je u redu. Rutina je tu kad bude vrijeme.', 'U redu'],
  fw_day4_discovery: ['Nešto novo u svijetu', 'Dijete je samo pronašlo nešto novo u svijetu zvjezdica.', 'Vidi što se dogodilo'],
  fw_week_reflection: ['Tjedan zajedno', '', 'Zatvori'],
  coach_consistency: ['Gradi naviku', 'Dijete je krenulo — neka rutina ovaj tjedan ostane lagana i zabavna.', 'Pokaži savjete'],
  coach_evening: ['Večernja rutina?', 'Obitelji koje dodaju jednostavnu večernju rutinu često imaju mirnije dane.', 'Istraži'],
  sj_day1_child_preview: ['Rutina je spremna', 'Raspored je na mjestu. Pogledaj dan djeteta kad ti odgovara — ne moraš sve večeras.', 'Pogledaj dan djeteta'],
  sj_day2_try_routine: ['Isprobaj rutinu u svakodnevici', 'Dovoljno je da malo pogledate zajedno. Bez žurbe.', 'Otvori raspored'],
  sj_day3_child_try: ['Vrijeme je da dijete pokuša', 'Pokaži PIN i neka se dijete prijavi u svoj prikaz.', 'Pokaži kod djeteta'],
  sj_celebrate_star: ['Zvjezdica!', 'Dijete je završilo aktivnost — proslavite zajedno.', 'Lijepo!'],
  sj_introduce_stars: ['Kako rade zvjezdice', 'Svaka označena aktivnost donosi zvjezdicu. Zvjezdice se mijenjaju za nagrade u Škrinji s blagom.', 'Otvori Škrinju s blagom'],
  sj_welcome_child_login: ['Dijete je unutra!', 'Dobar početak — neka dijete vodi svojim tempom.', 'Lijepo!'],
  sj_help_get_started: ['Trebaš mali poticaj?', 'Rutina čeka. Pogledaj dan djeteta — traje minutu.', 'Pogledaj dan djeteta'],
  sj_day7_reflection: ['Tjedan zajedno', '', 'Zatvori'],
  coach_expand: ['U dobrom si ritmu', 'Rutina se drži. Istraži nove nagrade ili pozovi drugog roditelja.', 'Nastavi'],
};
