'use strict';

/**
 * ro-RO copy for journey_experience_registry rows (shared by migration + JSON fallback).
 * Keys match experience_key in config/journey-experience-registry.json.
 * Values: [headline, body, cta] — body may be null for empty body.
 */
module.exports = {
  handoff_to_child: ['Lasă copilul să încerce rutina', 'Deschide modul copil împreună — copilul vede imediat ce are de făcut.', 'Încearcă modul copil'],
  parent_ack_completion: ['Copilul a terminat o activitate!', 'Confirmă, ca să sărbătoriți împreună primul succes.', 'Vezi'],
  celebrate_first_success: ['Prima stea e gata!', 'Copilul a terminat prima activitate — și tu ai văzut. E un pas adevărat.', 'Ce frumos!'],
  fw_day1_morning: ['Bună dimineața', 'Programul e gata. Lasă copilul să intre și să înceapă ziua în ritmul lui.', 'Arată copilului'],
  fw_day1_evening: ['O seară liniștită', 'O rutină simplă de seară face ziua de mâine mai ușoară. Uitați-vă împreună la ce urmează.', 'Spre seară'],
  fw_day2_quiet: ['Copilul își găsește ritmul', 'Nu trebuie să faci mult acum — lasă copilul să conducă.', 'Vezi experiența copilului'],
  fw_day3_new_day: ['Mâine e o zi nouă', 'Ieri nu a mers cum plănuiai — e în regulă. Rutina e aici când sunteți gata.', 'OK'],
  fw_day4_discovery: ['Ceva nou în lume', 'Copilul a găsit ceva nou în lumea stelelor — singur.', 'Vezi ce s-a întâmplat'],
  fw_week_reflection: ['O săptămână împreună', '', 'Închide'],
  coach_consistency: ['Construiește obiceiul', 'Copilul e pe drum — ține rutina ușoară și plăcută săptămâna asta.', 'Arată sfaturi'],
  coach_evening: ['Rutină de seară?', 'Familiile care adaugă o rutină simplă de seară au adesea zile mai stabile.', 'Explorează'],
  sj_day1_child_preview: ['Rutina e gata', 'Programul e pus. Uită-te la ziua copilului când îți vine bine — nu trebuie să faci totul diseară.', 'Vezi ziua copilului'],
  sj_day2_try_routine: ['Încearcă rutina în viața de zi cu zi', 'Ajunge să vă uitați împreună o vreme. Fără grabă.', 'Deschide programul'],
  sj_day3_child_try: ['E timpul să încerce copilul', 'Arată PIN-ul și lasă copilul să intre în vederea lui.', 'Arată codul copilului'],
  sj_celebrate_star: ['O stea!', 'Copilul a terminat o activitate — sărbătoriți împreună.', 'Ce frumos!'],
  sj_introduce_stars: ['Cum merg stelele', 'Fiecare activitate bifată aduce o stea. Stelele se pot schimba pe recompense în Cufărul cu comori.', 'Vezi Cufărul cu comori'],
  sj_welcome_child_login: ['Copilul a intrat!', 'Început bun — lasă copilul să conducă în ritmul lui.', 'Ce frumos!'],
  sj_help_get_started: ['Vrei un mic imbold?', 'Rutina te așteaptă. Uită-te la ziua copilului — durează un minut.', 'Vezi ziua copilului'],
  sj_day7_reflection: ['O săptămână împreună', '', 'Închide'],
  coach_expand: ['Ești în ritm', 'Rutina prinde. Explorează recompense noi sau invită celălalt părinte.', 'Continuă'],
};
