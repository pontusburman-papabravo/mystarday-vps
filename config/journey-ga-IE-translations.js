'use strict';

/**
 * ga-IE copy for journey_experience_registry rows (shared by migration + JSON fallback).
 * Keys match experience_key in config/journey-experience-registry.json.
 * Values: [headline, body, cta] — body may be null for empty body.
 */
module.exports = {
  handoff_to_child: ['Lig do do pháiste triail a bhaint as an ngnátham', 'Oscail mód an pháiste libh beirt — feiceann do pháiste láithreach cad atá le déanamh.', 'Bain triail as mód an pháiste anois'],
  parent_ack_completion: ['Chríochnaigh do pháiste gníomhaíocht!', 'Deimhnigh é ionas gur féidir libh an chéad rath a cheiliúradh le chéile.', 'Féach'],
  celebrate_first_success: ['An chéad réalta déanta!', 'Chríochnaigh do pháiste an chéad ghníomhaíocht — agus chonaic tú é. Cloch mhíle dáiríre atá ann.', 'Álainn!'],
  fw_day1_morning: ['Maidin mhaith', 'Tá an plean réidh. Lig do do pháiste logáil isteach agus an lá a thosú ar a luas féin.', 'Taispeáin do do pháiste'],
  fw_day1_evening: ['Tráthnóna ciúin', 'Déanann gnátham tráthnóna simplí an lá amárach níos éasca. Breathnaigh le chéile ar a bhfuil ag teacht.', 'Go dtí an tráthnóna'],
  fw_day2_quiet: ['Tá do pháiste ag teacht ar an rithim', 'Ní gá mórán a dhéanamh anois — lig do do pháiste an treo a ghlacadh.', 'Féach ar thaithí an pháiste'],
  fw_day3_new_day: ['Lá nua amárach', 'Níor éirigh leis inné mar a bhí beartaithe — sin ceart go leor. Beidh an gnátham anseo nuair a bheidh sibh réidh.', 'Ceart go leor'],
  fw_day4_discovery: ['Rud nua sa domhan', 'D’aimsigh do pháiste rud nua i ndomhan na réaltaí — as féin.', 'Féach cad a tharla'],
  fw_week_reflection: ['Seachtain le chéile', '', 'Dún'],
  coach_consistency: ['Tóg an nós', 'Tá do pháiste ar an mbealach — coinnigh an gnátham éadrom agus spraíúil an tseachtain seo.', 'Taispeáin leideanna'],
  coach_evening: ['Gnátham tráthnóna?', 'Is minic a bhíonn laethanta níos seasmhaí ag teaghlaigh a chuireann gnátham tráthnóna simplí leis.', 'Féach timpeall'],
  sj_day1_child_preview: ['Tá do ghnátham réidh', 'Tá an plean ina áit. Breathnaigh ar lá do pháiste nuair a oireann sé — ní gá gach rud a dhéanamh anocht.', 'Féach ar lá an pháiste'],
  sj_day2_try_routine: ['Bain triail as an ngnátham sa ghnáthshaol', 'Is leor breathnú le chéile ar feadh tamaill. Gan deifir.', 'Oscail an plean'],
  sj_day3_child_try: ['Tá sé in am ligean do do pháiste triail a bhaint as', 'Taispeáin an PIN agus lig do do pháiste logáil isteach ina amharc féin.', 'Taispeáin cód an pháiste'],
  sj_celebrate_star: ['Réalta!', 'Chríochnaigh do pháiste gníomhaíocht — ceiliúraigh le chéile.', 'Álainn!'],
  sj_introduce_stars: ['Conas a oibríonn réaltaí', 'Tuilleann gach gníomhaíocht ticte réalta. Is féidir réaltaí a mhalartú ar dhuaiseanna sa chiste.', 'Féach ar an gciste'],
  sj_welcome_child_login: ['Tá do pháiste istigh!', 'Tús maith — lig do do pháiste an treo a ghlacadh ar a luas féin.', 'Álainn!'],
  sj_help_get_started: ['An dteastaíonn brú beag uait?', 'Tá do ghnátham ag fanacht. Breathnaigh ar lá do pháiste — ní thógann sé ach nóiméad.', 'Féach ar lá an pháiste'],
  sj_day7_reflection: ['Seachtain le chéile', '', 'Dún'],
  coach_expand: ['Tá sibh san abhainn', 'Tá an gnátham ag teacht. Féach ar dhuaiseanna nua nó tabhair cuireadh do thuismitheoir eile.', 'Lean ar aghaidh'],
};
