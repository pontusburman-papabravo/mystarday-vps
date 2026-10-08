'use strict';

/**
 * sk-SK copy for journey_experience_registry rows (shared by migration + JSON fallback).
 * Keys match experience_key in config/journey-experience-registry.json.
 * Values: [headline, body, cta] — body may be null for empty body.
 */
module.exports = {
  handoff_to_child: ['Nechaj dieťa vyskúšať rutinu', 'Otvorte detský režim spolu — dieťa hneď vidí, čo má robiť.', 'Vyskúšať detský režim'],
  parent_ack_completion: ['Dieťa dokončilo aktivitu!', 'Potvrď to, aby ste prvý úspech mohli osláviť spolu.', 'Pozrieť'],
  celebrate_first_success: ['Prvá hviezda je hotová!', 'Dieťa dokončilo prvú aktivitu — a ty to vidíš. To je skutočný míľnik.', 'Krása!'],
  fw_day1_morning: ['Dobré ráno', 'Plán je pripravený. Nechaj dieťa prihlásiť sa a začať deň vlastným tempom.', 'Ukázať dieťaťu'],
  fw_day1_evening: ['Pokojný večer', 'Jednoduchá večerná rutina uľahčí zajtrajšok. Pozrite spolu, čo príde.', 'Na večer'],
  fw_day2_quiet: ['Dieťa si nachádza rytmus', 'Teraz nemusíš robiť veľa — nechaj dieťa viesť.', 'Pozrieť detský pohľad'],
  fw_day3_new_day: ['Zajtra je nový deň', 'Včera to nešlo podľa plánu — to je v poriadku. Rutina je tu, keď budete pripravení.', 'OK'],
  fw_day4_discovery: ['Niečo nové vo svete', 'Dieťa samo našlo niečo nové v svete hviezd.', 'Pozrieť, čo sa stalo'],
  fw_week_reflection: ['Týždeň spolu', '', 'Zavrieť'],
  coach_consistency: ['Buduj návyk', 'Dieťa je na ceste — nechaj rutinu tento týždeň ľahkú a hravú.', 'Ukázať tipy'],
  coach_evening: ['Večerná rutina?', 'Rodiny, ktoré pridajú jednoduchú večernú rutinu, mávajú pokojnejšie dni.', 'Preskúmať'],
  sj_day1_child_preview: ['Rutina je pripravená', 'Plán je na mieste. Pozri deň dieťaťa, keď sa to hodí — dnes večer nemusíš stihnúť všetko.', 'Pozrieť deň dieťaťa'],
  sj_day2_try_routine: ['Vyskúšaj rutinu v bežnom dni', 'Stačí chvíľu pozerať spolu. Bez ponáhľania.', 'Otvoriť plán'],
  sj_day3_child_try: ['Čas nechať dieťa vyskúšať to', 'Ukáž PIN a nechaj dieťa prihlásiť sa do vlastného pohľadu.', 'Ukázať kód dieťaťa'],
  sj_celebrate_star: ['Hviezda!', 'Dieťa dokončilo aktivitu — oslávte to spolu.', 'Krása!'],
  sj_introduce_stars: ['Ako fungujú hviezdy', 'Každá odškrtnutá aktivita prinesie hviezdu. Hviezdy sa dajú vymeniť za odmeny v Pokladnici.', 'Pozrieť Pokladnicu'],
  sj_welcome_child_login: ['Dieťa je dnu!', 'Dobrý začiatok — nechaj dieťa ísť vlastným tempom.', 'Krása!'],
  sj_help_get_started: ['Treba malé postrčenie?', 'Rutina čaká. Pozri deň dieťaťa — trvá to minútu.', 'Pozrieť deň dieťaťa'],
  sj_day7_reflection: ['Týždeň spolu', '', 'Zavrieť'],
  coach_expand: ['Si v rytme', 'Rutina sa drží. Preskúmaj nové odmeny alebo pozvi druhého rodiča.', 'Pokračovať'],
};
