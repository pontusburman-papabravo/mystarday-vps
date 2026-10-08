'use strict';

/**
 * fi-FI copy for journey_experience_registry rows (shared by migration + JSON fallback).
 * Keys match experience_key in config/journey-experience-registry.json.
 * Values: [headline, body, cta] — body may be null for empty body.
 */
module.exports = {
  handoff_to_child: ['Anna lapsen kokeilla rutiinia', 'Avaa lapsen näkymä yhdessä — lapsi näkee heti, mitä tehdä.', 'Kokeile lapsen näkymää'],
  parent_ack_completion: ['Lapsesi sai aktiviteetin valmiiksi!', 'Vahvista se, niin ensimmäistä onnistumista voi juhlia yhdessä.', 'Katso'],
  celebrate_first_success: ['Ensimmäinen tähti on valmis!', 'Lapsesi teki ensimmäisen aktiviteetin — ja sinä näit sen. Se on oikea merkkipaalu.', 'Ihanaa!'],
  fw_day1_morning: ['Hyvää huomenta', 'Aikataulu on valmis. Anna lapsen kirjautua ja aloittaa päivä omassa tahdissa.', 'Näytä lapselle'],
  fw_day1_evening: ['Rauhallinen ilta', 'Yksinkertainen iltarutiini helpottaa huomista. Katso yhdessä, mitä on tulossa.', 'Iltaan'],
  fw_day2_quiet: ['Lapsesi löytää rytmin', 'Sinun ei tarvitse tehdä nyt paljon — anna lapsen johtaa.', 'Katso lapsen näkymä'],
  fw_day3_new_day: ['Huomenna on uusi päivä', 'Eilen ei mennyt suunnitelman mukaan — se ei haittaa. Rutiini on täällä, kun olet valmis.', 'OK'],
  fw_day4_discovery: ['Jotain uutta maailmassa', 'Lapsesi löysi jotain uutta tähtimaailmasta — ihan itse.', 'Katso, mitä tapahtui'],
  fw_week_reflection: ['Viikko yhdessä', '', 'Sulje'],
  coach_consistency: ['Rakenna tapa', 'Lapsesi on jo matkalla — pidä rutiini tällä viikolla kevyenä ja iloisena.', 'Näytä vinkit'],
  coach_evening: ['Iltarutiini?', 'Perheet, joilla on yksinkertainen iltarutiini, saavat usein tasaisempia päiviä.', 'Tutustu'],
  sj_day1_child_preview: ['Rutiinisi on valmis', 'Aikataulu on paikallaan. Katso lapsesi päivää, kun sinulle sopii — kaikkea ei tarvitse tehdä tänä iltana.', 'Katso lapsen päivä'],
  sj_day2_try_routine: ['Kokeile rutiinia arjessa', 'Riittää, että katsot hetken yhdessä. Ei kiirettä.', 'Avaa aikataulu'],
  sj_day3_child_try: ['Aika antaa lapsen kokeilla', 'Näytä PIN-koodi ja anna lapsen kirjautua omaan näkymään.', 'Näytä lapsen koodi'],
  sj_celebrate_star: ['Tähti!', 'Lapsesi sai aktiviteetin valmiiksi — juhli yhdessä.', 'Ihanaa!'],
  sj_introduce_stars: ['Näin tähdet toimivat', 'Jokaisesta tehdystä aktiviteetista saa tähden. Tähdet voi vaihtaa palkintoihin tähtiaarteessa.', 'Katso tähtiaarre'],
  sj_welcome_child_login: ['Lapsesi on sisällä!', 'Hyvä alku — anna lapsen johtaa omassa tahdissa.', 'Ihanaa!'],
  sj_help_get_started: ['Tarvitsetko pienen sysäyksen?', 'Rutiinisi odottaa. Katso lapsesi päivää — se vie minuutin.', 'Katso lapsen päivä'],
  sj_day7_reflection: ['Viikko yhdessä', '', 'Sulje'],
  coach_expand: ['Olet hyvässä rytmissä', 'Rutiini pysyy. Tutustu uusiin palkintoihin tai kutsu toinen vanhempi.', 'Jatka'],
};
