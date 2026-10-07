'use strict';

/**
 * mt-MT copy for journey_experience_registry rows (shared by migration + JSON fallback).
 * Keys match experience_key in config/journey-experience-registry.json.
 * Values: [headline, body, cta] — body may be empty string when English body is empty.
 */
module.exports = {
  handoff_to_child: ['Ħalli lit-tifel tiegħek jipprova r-rutina', 'Iftaħ il-vista tat-tifel flimkien — jara minnufih x\'għandu jagħmel.', 'Ipprova l-vista tat-tifel issa'],
  parent_ack_completion: ['It-tifel tiegħek lesta attività!', 'Ikkonferma biex tiċċelebra l-ewwel suċċess miegħu.', 'Ara'],
  celebrate_first_success: ['L-ewwel stilla lesta!', 'It-tifel tiegħek lesta l-ewwel attività — u int rajt. Dan pass tassew importanti.', 'Sabih!'],
  fw_day1_morning: ['Bonġu', 'Il-pjan tal-ġimgħa lest. Ħalli lit-tifel jidħol u jibda l-jum bil-pass tiegħu.', 'Uri lit-tifel'],
  fw_day1_evening: ['Filgħaxija kalma', 'Rutina sempliċi ta\' filgħaxija tagħmel għada eħfef. Ara flimkien x\'hemm ġej.', 'Lejn il-filgħaxija'],
  fw_day2_quiet: ['It-tifel qed isib ir-ritmu', 'Issa m\'għandekx għalfejn tagħmel ħafna — ħallih imexxi.', 'Ara l-vista tat-tifel'],
  fw_day3_new_day: ['Għada jum ġdid', 'Ilbieraħ ma mexiex kif ippjanajt — u tajjeb hekk. Ir-rutina hawn meta tkun lest.', 'OK'],
  fw_day4_discovery: ['Xi ħaġa ġdida fid-dinja', 'It-tifel sab xi ħaġa ġdida fid-dinja tal-istilel — waħdu.', 'Ara x’ġara'],
  fw_week_reflection: ['Ġimgħa flimkien', '', 'Agħlaq'],
  coach_consistency: ['Ibni d-drawwa', 'It-tifel miexi — żomm ir-rutina ħafifa u pjaċevoli din il-ġimgħa.', 'Uri pariri'],
  coach_evening: ['Rutina ta\' filgħaxija?', 'Familji li jżidu rutina sempliċi ta\' filgħaxija sikwit ikollhom jiem aktar stabbli.', 'Esplora'],
  sj_day1_child_preview: ['Ir-rutina tiegħek lesta', 'Il-pjan tal-ġimgħa f\'postu. Ara l-jum tat-tifel meta jaqbillek — m\'hemmx għalfejn tagħmel kollox illejla.', 'Ara l-jum tat-tifel'],
  sj_day2_try_routine: ['Ipprova r-rutina fil-ħajja ta\' kuljum', 'Biżżejjed li tħares flimkien għal ftit. Bla għaġġla.', 'Iftaħ il-pjan tal-ġimgħa'],
  sj_day3_child_try: ['Wasal iż-żmien li t-tifel jipprova', 'Uri l-PIN u ħallih jidħol fil-vista tiegħu.', 'Uri l-kodiċi tat-tifel'],
  sj_celebrate_star: ['Stilla!', 'It-tifel lesta attività — iċċelebra miegħu.', 'Sabih!'],
  sj_introduce_stars: ['Kif jaħdmu l-istilel', 'Kull attività mmarkata tagħti stilla. L-istilel jistgħu jinbidlu ma\' premjijiet f\'It-teżor.', 'Ara It-teżor'],
  sj_welcome_child_login: ['It-tifel daħal!', 'Bidu tajjeb — ħallih imexxi bil-pass tiegħu.', 'Sabih!'],
  sj_help_get_started: ['Trid ftit spinta?', 'Ir-rutina tiegħek qed tistenna. Ara l-jum tat-tifel — tieħu minuta.', 'Ara l-jum tat-tifel'],
  sj_day7_reflection: ['Ġimgħa flimkien', '', 'Agħlaq'],
  coach_expand: ['Qed timxi tajjeb', 'Ir-rutina qed iżżomm. Esplora premjijiet ġodda jew stieden ġenitur ieħor.', 'Kompli'],
};
