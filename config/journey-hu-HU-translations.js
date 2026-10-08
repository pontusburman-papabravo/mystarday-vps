'use strict';

/**
 * hu-HU copy for journey_experience_registry rows (shared by migration + JSON fallback).
 * Keys match experience_key in config/journey-experience-registry.json.
 * Values: [headline, body, cta] — body may be null for empty body.
 */
module.exports = {
  handoff_to_child: ['Hagyd, hogy a gyereked kipróbálja a rutint', 'Nyissátok meg együtt a gyerek módot — a gyereked rögtön látja, mit kell tennie.', 'Gyerek mód kipróbálása'],
  parent_ack_completion: ['A gyereked befejezett egy tevékenységet!', 'Erősítsd meg, hogy együtt ünnepelhessétek az első sikert.', 'Megtekintés'],
  celebrate_first_success: ['Megvan az első csillag!', 'A gyereked befejezte az első tevékenységet — és te is láttad. Ez igazi mérföldkő.', 'De jó!'],
  fw_day1_morning: ['Jó reggelt', 'A napirend kész. Hagyd, hogy a gyereked belépjen, és a saját tempójában kezdje a napot.', 'Mutasd meg a gyereknek'],
  fw_day1_evening: ['Nyugodt este', 'Egy egyszerű esti rutin könnyebbé teszi a holnapot. Nézzétek meg együtt, mi jön.', 'Az estéhez'],
  fw_day2_quiet: ['A gyereked megtalálja a ritmust', 'Most nem kell sokat tenned — hagyd, hogy a gyereked vezessen.', 'Gyerek élmény megtekintése'],
  fw_day3_new_day: ['A holnap új nap', 'A tegnap nem úgy ment, ahogy terveztétek — ez rendben van. A rutin itt van, amikor készen álltok.', 'Rendben'],
  fw_day4_discovery: ['Valami új a világban', 'A gyereked talált valami újat a csillagvilágban — teljesen egyedül.', 'Nézd meg, mi történt'],
  fw_week_reflection: ['Egy hét együtt', '', 'Bezárás'],
  coach_consistency: ['Építsétek a szokást', 'A gyereked elindult — ezen a héten tartsd a rutint könnyűnek és játékosnak.', 'Tippek mutatása'],
  coach_evening: ['Esti rutin?', 'A családok, akik egyszerű esti rutint adnak hozzá, gyakran egyenletesebb napokat kapnak.', 'Felfedezés'],
  sj_day1_child_preview: ['A rutin kész', 'A napirend a helyén van. Nézd meg a gyereked napját, amikor jólesik — ma este nem kell mindent megcsinálni.', 'A gyerek napjának megtekintése'],
  sj_day2_try_routine: ['Próbáljátok ki a rutint a mindennapokban', 'Elég, ha egy darabig együtt nézitek. Nincs sietség.', 'Napirend megnyitása'],
  sj_day3_child_try: ['Itt az idő, hogy a gyereked kipróbálja', 'Mutasd meg a PIN-kódot, és hagyd, hogy a gyereked belépjen a saját nézetébe.', 'Gyerekkód mutatása'],
  sj_celebrate_star: ['Egy csillag!', 'A gyereked befejezett egy tevékenységet — ünnepeljétek meg együtt.', 'De jó!'],
  sj_introduce_stars: ['Hogyan működnek a csillagok', 'Minden kipipált tevékenység egy csillagot ér. A csillagokat a Kincsesládában jutalomra cserélhetitek.', 'Kincsesláda megtekintése'],
  sj_welcome_child_login: ['A gyereked bent van!', 'Jó kezdés — hagyd, hogy a gyereked a saját tempójában vezessen.', 'De jó!'],
  sj_help_get_started: ['Kell egy kis lökés?', 'A rutin vár. Nézd meg a gyereked napját — egy perc az egész.', 'A gyerek napjának megtekintése'],
  sj_day7_reflection: ['Egy hét együtt', '', 'Bezárás'],
  coach_expand: ['Benne vagytok a ritmusban', 'A rutin megmarad. Nézz új jutalmakat, vagy hívj meg egy másik szülőt.', 'Tovább'],
};
