'use strict';

/**
 * is-IS copy for journey_experience_registry rows (shared by migration + JSON fallback).
 * Keys match experience_key in config/journey-experience-registry.json.
 * Values: [headline, body, cta] — body may be null for empty body.
 */
module.exports = {
  handoff_to_child: ['Láttu barnið prófa rútínuna sína', 'Opnið barnasýnina saman — barnið sér strax hvað á að gera.', 'Prófa barnasýn núna'],
  parent_ack_completion: ['Barnið kláraði athöfn!', 'Staðfestu svo þið getið fagnað fyrsta árangrinum saman.', 'Skoða'],
  celebrate_first_success: ['Fyrsta stjarnan komin!', 'Barnið kláraði fyrstu athöfnina — og þú sást það. Þetta er raunverulegur áfangi.', 'Yndislegt!'],
  fw_day1_morning: ['Góðan morgun', 'Vikuáætlunin er tilbúin. Láttu barnið skrá sig inn og byrja daginn á sínum hraða.', 'Sýna barninu'],
  fw_day1_evening: ['Rólegt kvöld', 'Einföld kvöldrútína gerir morgundaginn léttari. Skoðið saman hvað er fram undan.', 'Í kvöldið'],
  fw_day2_quiet: ['Barnið er að finna taktinn', 'Þú þarft ekki að gera mikið núna — láttu barnið leiða.', 'Skoða barnasýn'],
  fw_day3_new_day: ['Á morgun er nýr dagur', 'Í gær gekk ekki eins og lagt var upp með — það er í lagi. Rútínan er hér þegar þið eruð tilbúin.', 'Allt í lagi'],
  fw_day4_discovery: ['Eitthvað nýtt í heiminum', 'Barnið fann eitthvað nýtt í stjörnuheiminum — alveg sjálft.', 'Sjá hvað gerðist'],
  fw_week_reflection: ['Vika saman', '', 'Loka'],
  coach_consistency: ['Byggja venjuna', 'Barnið er komið af stað — haltu rútínunni léttri og skemmtilegri í þessari viku.', 'Sýna ráð'],
  coach_evening: ['Kvöldrútína?', 'Fjölskyldur sem bæta við einfaldri kvöldrútínu fá oft stöðugri daga.', 'Skoða'],
  sj_day1_child_preview: ['Rútínan er tilbúin', 'Vikuáætlunin er komin. Skoðaðu dag barnsins þegar það hentar — engin þörf á að gera allt í kvöld.', 'Skoða dag barnsins'],
  sj_day2_try_routine: ['Prófaðu rútínuna í hversdeginum', 'Það nægir að skoða saman um stund. Engin flýti.', 'Opna vikuáætlun'],
  sj_day3_child_try: ['Tími til að láta barnið prófa', 'Sýndu PIN-númerið og láttu barnið skrá sig inn í sína sýn.', 'Sýna kóða barns'],
  sj_celebrate_star: ['Stjarna!', 'Barnið kláraði athöfn — fagniði saman.', 'Yndislegt!'],
  sj_introduce_stars: ['Svona virka stjörnur', 'Hver hökuð athöfn gefur stjörnu. Stjörnum má skipta í verðlaun í Fjársjóðskistunni.', 'Skoða Fjársjóðskistuna'],
  sj_welcome_child_login: ['Barnið er komið inn!', 'Góð byrjun — láttu barnið leiða á sínum hraða.', 'Yndislegt!'],
  sj_help_get_started: ['Þarftu smá hvata?', 'Rútínan bíður. Skoðaðu dag barnsins — það tekur eina mínútu.', 'Skoða dag barnsins'],
  sj_day7_reflection: ['Vika saman', '', 'Loka'],
  coach_expand: ['Þið eruð komin í flæði', 'Rútínan festist. Skoðaðu ný verðlaun eða bjóddu meðforeldri.', 'Halda áfram'],
};
