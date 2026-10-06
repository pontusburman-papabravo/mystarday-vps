'use strict';

/**
 * lv-LV copy for journey_experience_registry rows (shared by migration + JSON fallback).
 * Keys match experience_key in config/journey-experience-registry.json.
 * Values: [headline, body, cta] — body may be null for empty body.
 */
module.exports = {
  handoff_to_child: ['Ļauj bērnam pamēģināt savu rutīnu', 'Atver bērna skatu kopā — bērns uzreiz redz, ko darīt.', 'Pamēģināt bērna skatu'],
  parent_ack_completion: ['Bērns pabeidza aktivitāti!', 'Apstiprini, lai varat kopā atzīmēt pirmo izdošanos.', 'Skatīt'],
  celebrate_first_success: ['Pirmā zvaigzne ir!', 'Bērns pabeidza savu pirmo aktivitāti — un tu to redzēji. Tas ir īsts solis.', 'Cik jauki!'],
  fw_day1_morning: ['Labrīt', 'Plāns ir gatavs. Ļauj bērnam pieslēgties un sākt dienu savā tempā.', 'Parādīt bērnam'],
  fw_day1_evening: ['Mierīgs vakars', 'Vienkārša vakara rutīna atvieglo rītdienu. Paskaties kopā, kas būs.', 'Uz vakaru'],
  fw_day2_quiet: ['Bērns atrod ritmu', 'Tagad tev nav daudz jādara — ļauj bērnam vadīt.', 'Skatīt bērna skatu'],
  fw_day3_new_day: ['Rīt ir jauna diena', 'Vakar neizdevās, kā plānots — tas nekas. Rutīna ir šeit, kad gribi turpināt.', 'Labi'],
  fw_day4_discovery: ['Kaut kas jauns pasaulē', 'Bērns zvaigžņu pasaulē atrada kaut ko jaunu — pats.', 'Redzēt, kas notika'],
  fw_week_reflection: ['Nedēļa kopā', '', 'Aizvērt'],
  coach_consistency: ['Veido ieradumu', 'Bērns ir sācis — šonedēļ turi rutīnu vieglu un jautru.', 'Rādīt padomus'],
  coach_evening: ['Vakara rutīna?', 'Ģimenēm, kas pievieno vienkāršu vakara rutīnu, dienas bieži kļūst mierīgākas.', 'Apskatīt'],
  sj_day1_child_preview: ['Rutīna ir gatava', 'Plāns ir vietā. Paskaties uz bērna dienu, kad tev der — šovakar nav jāizdara viss.', 'Skatīt bērna dienu'],
  sj_day2_try_routine: ['Izmēģini rutīnu ikdienā', 'Pietiek uz brīdi paskatīties kopā. Nav jāsteidzas.', 'Atvērt plānu'],
  sj_day3_child_try: ['Laiks ļaut bērnam pamēģināt', 'Parādi PIN un ļauj bērnam pieslēgties savam skatam.', 'Rādīt bērna kodu'],
  sj_celebrate_star: ['Zvaigzne!', 'Bērns pabeidza aktivitāti — atzīmē to kopā.', 'Cik jauki!'],
  sj_introduce_stars: ['Kā darbojas zvaigznes', 'Katra atzīmēta aktivitāte dod zvaigzni. Zvaigznes var apmainīt pret balvām Dārgumu lādē.', 'Skatīt Dārgumu lādi'],
  sj_welcome_child_login: ['Bērns ir iekšā!', 'Labs sākums — ļauj bērnam vadīt savā tempā.', 'Cik jauki!'],
  sj_help_get_started: ['Vajag mazu pamudinājumu?', 'Rutīna gaida. Paskaties uz bērna dienu — tas aizņem minūti.', 'Skatīt bērna dienu'],
  sj_day7_reflection: ['Nedēļa kopā', '', 'Aizvērt'],
  coach_expand: ['Ritms turas', 'Rutīna turas. Apskati jaunas balvas vai uzaicini otru vecāku.', 'Turpināt'],
};
