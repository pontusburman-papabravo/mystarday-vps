'use strict';

/**
 * et-EE copy for journey_experience_registry rows (shared by migration + JSON fallback).
 * Keys match experience_key in config/journey-experience-registry.json.
 * Values: [headline, body, cta] — body may be null for empty body.
 */
module.exports = {
  handoff_to_child: ['Lase lapsel rutiini proovida', 'Ava lapse vaade koos — laps näeb kohe, mida teha.', 'Proovi lapse vaadet'],
  parent_ack_completion: ['Laps tegi tegevuse ära!', 'Kinnita, et saaksid esimest õnnestumist koos tähistada.', 'Vaata'],
  celebrate_first_success: ['Esimene täht on käes!', 'Laps tegi esimese tegevuse ära — ja sina nägid seda. See on päris verstapost.', 'Tore!'],
  fw_day1_morning: ['Tere hommikust', 'Plaan on valmis. Lase lapsel sisse logida ja alustada päeva omas tempos.', 'Näita lapsele'],
  fw_day1_evening: ['Rahulik õhtu', 'Lihtne õhturutiin teeb homse kergemaks. Vaata koos, mis ees ootab.', 'Õhtusse'],
  fw_day2_quiet: ['Laps leiab rütmi', 'Praegu ei pea palju tegema — lase lapsel juhtida.', 'Vaata lapse vaadet'],
  fw_day3_new_day: ['Homme on uus päev', 'Eile ei läinud plaanipäraselt — see on okei. Rutiin on siin, kui oled valmis.', 'Selge'],
  fw_day4_discovery: ['Midagi uut maailmas', 'Laps leidis tähtede maailmast midagi uut — täiesti ise.', 'Vaata, mis juhtus'],
  fw_week_reflection: ['Nädal koos', '', 'Sulge'],
  coach_consistency: ['Ehita harjumust', 'Laps on hoos — hoia rutiin sel nädalal kerge ja lõbus.', 'Näita nippe'],
  coach_evening: ['Õhturutiin?', 'Pered, kes lisavad lihtsa õhturutiini, saavad sageli rahulikuma päeva.', 'Uuri'],
  sj_day1_child_preview: ['Rutiin on valmis', 'Plaan on paigas. Vaata lapse päeva siis, kui sulle sobib — täna õhtul ei pea kõike ära tegema.', 'Vaata lapse päeva'],
  sj_day2_try_routine: ['Proovi rutiini argipäevas', 'Piisab, kui vaatad hetke koos. Kiiret pole.', 'Ava plaan'],
  sj_day3_child_try: ['Aeg lasta lapsel proovida', 'Näita PIN-koodi ja lase lapsel oma vaatesse sisse logida.', 'Näita lapse koodi'],
  sj_celebrate_star: ['Täht!', 'Laps tegi tegevuse ära — tähista koos.', 'Tore!'],
  sj_introduce_stars: ['Kuidas tähed töötavad', 'Iga märgitud tegevus toob tähe. Tähti saab Aardekirstus auhindade vastu vahetada.', 'Vaata Aardekirstu'],
  sj_welcome_child_login: ['Laps on sees!', 'Hea algus — lase lapsel omas tempos juhtida.', 'Tore!'],
  sj_help_get_started: ['Vajad tõuget?', 'Rutiin ootab. Vaata lapse päeva — see võtab minuti.', 'Vaata lapse päeva'],
  sj_day7_reflection: ['Nädal koos', '', 'Sulge'],
  coach_expand: ['Oled hoos', 'Rutiin jääb püsima. Uuri uusi auhindu või kutsu teine vanem.', 'Jätka'],
};
