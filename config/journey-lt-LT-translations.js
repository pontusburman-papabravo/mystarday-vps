'use strict';

/**
 * lt-LT copy for journey_experience_registry rows (shared by migration + JSON fallback).
 * Keys match experience_key in config/journey-experience-registry.json.
 * Values: [headline, body, cta] — body may be null for empty body.
 */
module.exports = {
  handoff_to_child: ['Leisk vaikui išbandyti savo rutiną', 'Atidaryk vaiko vaizdą kartu — vaikas iškart mato, ką daryti.', 'Išbandyk vaiko vaizdą'],
  parent_ack_completion: ['Vaikas atliko veiklą!', 'Patvirtink, kad kartu pasidžiaugtumėte pirmąja sėkme.', 'Žiūrėti'],
  celebrate_first_success: ['Pirma žvaigždė yra!', 'Vaikas atliko pirmą veiklą — ir tu tai matei. Tai tikras etapas.', 'Gražu!'],
  fw_day1_morning: ['Labas rytas', 'Planas paruoštas. Leisk vaikui prisijungti ir pradėti dieną savo tempu.', 'Parodyk vaikui'],
  fw_day1_evening: ['Ramus vakaras', 'Paprasta vakaro rutina palengvina rytojų. Pažiūrėkite kartu, kas laukia.', 'Į vakarą'],
  fw_day2_quiet: ['Vaikas pagauna ritmą', 'Dabar daug daryti nereikia — leisk vaikui vesti.', 'Žiūrėti vaiko vaizdą'],
  fw_day3_new_day: ['Rytoj nauja diena', 'Vakar ne viskas ėjo pagal planą — ir tai gerai. Rutina čia, kai būsite pasiruošę.', 'Gerai'],
  fw_day4_discovery: ['Kažkas naujo pasaulyje', 'Vaikas pats rado kažką naujo žvaigždžių pasaulyje.', 'Pažiūrėk, kas nutiko'],
  fw_week_reflection: ['Savaitė kartu', '', 'Uždaryti'],
  coach_consistency: ['Kurk įprotį', 'Vaikas jau pradėjo — šią savaitę laikyk rutiną lengvą ir smagią.', 'Rodyti patarimus'],
  coach_evening: ['Vakaro rutina?', 'Šeimos, kurios prideda paprastą vakaro rutiną, dažnai turi ramesnes dienas.', 'Tyrinėti'],
  sj_day1_child_preview: ['Rutina paruošta', 'Planas savo vietoje. Pažiūrėk vaiko dieną, kai tau tinka — šįvakar visko daryti nereikia.', 'Žiūrėti vaiko dieną'],
  sj_day2_try_routine: ['Išbandyk rutiną kasdienybėje', 'Užtenka kurį laiką pažiūrėti kartu. Be skubos.', 'Atidaryti planą'],
  sj_day3_child_try: ['Laikas leisti vaikui pabandyti', 'Parodyk PIN ir leisk vaikui prisijungti prie savo vaizdo.', 'Rodyti vaiko kodą'],
  sj_celebrate_star: ['Žvaigždė!', 'Vaikas atliko veiklą — pasidžiaukite kartu.', 'Gražu!'],
  sj_introduce_stars: ['Kaip veikia žvaigždės', 'Kiekviena pažymėta veikla duoda žvaigždę. Žvaigždes galima iškeisti į apdovanojimus Lobių skrynioje.', 'Atidaryti Lobių skrynią'],
  sj_welcome_child_login: ['Vaikas viduje!', 'Gera pradžia — leisk vaikui vesti savo tempu.', 'Gražu!'],
  sj_help_get_started: ['Reikia mažo stumtelėjimo?', 'Rutina laukia. Pažiūrėk vaiko dieną — tai trunka minutę.', 'Žiūrėti vaiko dieną'],
  sj_day7_reflection: ['Savaitė kartu', '', 'Uždaryti'],
  coach_expand: ['Esi ritme', 'Rutina laikosi. Pažiūrėk naujus apdovanojimus arba pakviesk kitą tėvą.', 'Tęsti'],
};
