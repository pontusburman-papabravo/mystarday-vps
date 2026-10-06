'use strict';

/**
 * it-IT copy for journey_experience_registry rows (shared by migration + JSON fallback).
 * Keys match experience_key in config/journey-experience-registry.json.
 * Values: [headline, body, cta] — body may be empty string when English body is empty.
 */
module.exports = {
  handoff_to_child: ['Lascia che il tuo bambino provi la routine', 'Apri insieme la vista del bambino — vede subito cosa fare.', 'Prova la vista del bambino'],
  parent_ack_completion: ['Il tuo bambino ha finito un\'attività!', 'Conferma, così festeggi insieme questo primo successo.', 'Vedi'],
  celebrate_first_success: ['Prima stella!', 'Il tuo bambino ha completato la prima attività — e tu c\'eri. È un vero traguardo.', 'Che bello!'],
  fw_day1_morning: ['Buongiorno', 'Il piano è pronto. Lascia che il tuo bambino acceda e inizi la giornata con i suoi tempi.', 'Mostralo al tuo bambino'],
  fw_day1_evening: ['Una sera tranquilla', 'Una routine della sera semplice rende più facile il domani. Guarda insieme cosa arriva.', 'Alla sera'],
  fw_day2_quiet: ['Il tuo bambino trova il ritmo', 'Ora non devi fare molto — lascia che sia il tuo bambino a guidare.', 'Vedi la vista del bambino'],
  fw_day3_new_day: ['Domani è un nuovo giorno', 'Ieri non è andata come previsto — va bene così. La routine è qui quando ti va.', 'OK'],
  fw_day4_discovery: ['Qualcosa di nuovo nel mondo', 'Il tuo bambino ha trovato qualcosa di nuovo nel mondo delle stelle — da solo.', 'Vedi cos\'è successo'],
  fw_week_reflection: ['Una settimana insieme', '', 'Chiudi'],
  coach_consistency: ['Far diventare la routine un\'abitudine', 'Il tuo bambino è partito — tieni la routine leggera e allegra questa settimana.', 'Vedi i consigli'],
  coach_evening: ['Una routine della sera?', 'Le famiglie che aggiungono una routine della sera semplice hanno spesso giornate più stabili.', 'Esplora'],
  sj_day1_child_preview: ['La tua routine è pronta', 'Il piano c\'è. Guarda la giornata del tuo bambino quando ti va — non serve fare tutto stasera.', 'Vedi la giornata'],
  sj_day2_try_routine: ['Prova la routine nella vita di tutti i giorni', 'Basta guardare insieme per un po\'. Senza fretta.', 'Apri il piano'],
  sj_day3_child_try: ['È il momento di lasciare provare il tuo bambino', 'Mostra il PIN e lascia che il tuo bambino acceda alla sua vista.', 'Mostra il codice del bambino'],
  sj_celebrate_star: ['Una stella!', 'Il tuo bambino ha finito un\'attività — festeggia insieme.', 'Che bello!'],
  sj_introduce_stars: ['Come funzionano le stelle', 'Ogni attività spuntata fa guadagnare una stella. Le stelle si scambiano con ricompense nello scrigno delle stelle.', 'Vedi lo scrigno delle stelle'],
  sj_welcome_child_login: ['Il tuo bambino è entrato!', 'Bel inizio — lascia che vada al suo ritmo.', 'Che bello!'],
  sj_help_get_started: ['Ti serve un piccolo aiuto?', 'La tua routine aspetta. Guarda la giornata del tuo bambino — ci vuole un minuto.', 'Vedi la giornata'],
  sj_day7_reflection: ['Una settimana insieme', '', 'Chiudi'],
  coach_expand: ['Hai trovato il ritmo', 'La routine sta attecchendo. Esplora nuove ricompense o invita l\'altro genitore.', 'Continua'],
};
