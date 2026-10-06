'use strict';

/**
 * cs-CZ copy for journey_experience_registry rows (shared by migration + JSON fallback).
 * Keys match experience_key in config/journey-experience-registry.json.
 * Values: [headline, body, cta] — body may be empty string when English body is empty.
 */
module.exports = {
  handoff_to_child: ['Nech dítě zkusit svou rutinu', 'Otevři s dítětem dětský režim — hned uvidí, co má dělat.', 'Vyzkoušet dětský režim'],
  parent_ack_completion: ['Dítě dokončilo aktivitu!', 'Potvrď to a oslav ten první úspěch spolu.', 'Zobrazit'],
  celebrate_first_success: ['První hvězda je hotová!', 'Dítě dokončilo první aktivitu — a ty to vidíš. To je opravdový krok.', 'Krása!'],
  fw_day1_morning: ['Dobré ráno', 'Plán je připravený. Nech dítě přihlásit se a začít den vlastním tempem.', 'Ukázat dítěti'],
  fw_day1_evening: ['Klidný večer', 'Jednoduchá večerní rutina zítra ulehčí. Podívej se s dítětem, co přijde.', 'K večeru'],
  fw_day2_quiet: ['Dítě si nachází rytmus', 'Teď nemusíš dělat moc — nech dítě vést.', 'Zobrazit dětský pohled'],
  fw_day3_new_day: ['Zítra je nový den', 'Včera to nešlo podle plánu — to nevadí. Rutina je tady, až budeš chtít.', 'OK'],
  fw_day4_discovery: ['Něco nového ve světě', 'Dítě samo našlo ve světě hvězd něco nového.', 'Podívat se, co se stalo'],
  fw_week_reflection: ['Týden spolu', '', 'Zavřít'],
  coach_consistency: ['Upevni návyk', 'Dítě už je v tom — tenhle týden nech rutinu lehkou a příjemnou.', 'Ukázat tipy'],
  coach_evening: ['Večerní rutina?', 'Rodiny, které přidají jednoduchou večerní rutinu, mívají klidnější dny.', 'Prozkoumat'],
  sj_day1_child_preview: ['Rutina je připravená', 'Plán je na místě. Do dne dítěte se podívej, až se to hodí — dnes večer nemusíš stihnout všechno.', 'Zobrazit den dítěte'],
  sj_day2_try_routine: ['Vyzkoušej rutinu v běžném dni', 'Stačí se na chvíli podívat spolu. Bez spěchu.', 'Otevřít plán'],
  sj_day3_child_try: ['Čas nechat dítě zkusit to samo', 'Ukaž PIN a nech dítě přihlásit se do vlastního pohledu.', 'Ukázat kód dítěte'],
  sj_celebrate_star: ['Hvězda!', 'Dítě dokončilo aktivitu — raduj se z toho spolu.', 'Krása!'],
  sj_introduce_stars: ['Jak fungují hvězdy', 'Každá odškrtnutá aktivita přinese hvězdu. Hvězdy jde vyměnit za odměny v Pokladnici.', 'Zobrazit Pokladnici'],
  sj_welcome_child_login: ['Dítě je uvnitř!', 'Dobrý začátek — nech dítě jít vlastním tempem.', 'Krása!'],
  sj_help_get_started: ['Malé popostrčení?', 'Rutina čeká. Podívej se na den dítěte — zabere to minutu.', 'Zobrazit den dítěte'],
  sj_day7_reflection: ['Týden spolu', '', 'Zavřít'],
  coach_expand: ['Jsi v rytmu', 'Rutina drží. Prozkoumej nové odměny, nebo pozvi druhého rodiče.', 'Pokračovat'],
};
