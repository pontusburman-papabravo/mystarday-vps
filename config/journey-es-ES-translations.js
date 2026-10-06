'use strict';

/**
 * es-ES copy for journey_experience_registry rows (shared by migration + JSON fallback).
 * Keys match experience_key in config/journey-experience-registry.json.
 * Values: [headline, body, cta] — body may be empty string when English body is empty.
 */
module.exports = {
  handoff_to_child: ['Deja que tu niño pruebe su rutina', 'Abre juntos la vista del niño: ve enseguida qué hacer.', 'Probar la vista del niño'],
  parent_ack_completion: ['¡Tu niño ha terminado una actividad!', 'Confírmalo para celebrar juntos este primer logro.', 'Ver'],
  celebrate_first_success: ['¡Primera estrella!', 'Tu niño ha terminado su primera actividad, y tú estabas ahí. Es un paso de verdad.', '¡Qué bien!'],
  fw_day1_morning: ['Buenos días', 'El horario está listo. Deja que tu niño entre y empiece el día a su ritmo.', 'Enseñárselo a tu niño'],
  fw_day1_evening: ['Una tarde tranquila', 'Una rutina de la tarde sencilla hace el día de mañana más fácil. Mirad juntos lo que viene.', 'A la tarde'],
  fw_day2_quiet: ['Tu niño encuentra su ritmo', 'Ahora no tienes que hacer mucho: deja que tu niño lleve la iniciativa.', 'Ver la vista del niño'],
  fw_day3_new_day: ['Mañana es un día nuevo', 'Ayer no salió como esperabas, y no pasa nada. La rutina está aquí cuando estéis listos.', 'Vale'],
  fw_day4_discovery: ['Algo nuevo en el mundo', 'Tu niño ha encontrado algo nuevo en el mundo de las estrellas, él solo.', 'Ver qué ha pasado'],
  fw_week_reflection: ['Una semana juntos', 'Una semana de rutina, a vuestro ritmo.', 'Cerrar'],
  coach_consistency: ['Afianzar el hábito', 'Tu niño ya está en marcha: mantén la rutina ligera y alegre esta semana.', 'Ver los consejos'],
  coach_evening: ['¿Una rutina de la tarde?', 'Las familias que añaden una rutina de la tarde sencilla suelen tener días más estables.', 'Explorar'],
  sj_day1_child_preview: ['Tu rutina está lista', 'El horario ya está. Mira el día de tu niño cuando te venga bien: no hace falta hacerlo todo esta noche.', 'Ver el día'],
  sj_day2_try_routine: ['Probar la rutina en el día a día', 'Basta con mirarla juntos un rato. Sin prisa.', 'Abrir el horario'],
  sj_day3_child_try: ['Es el momento de dejar que tu niño lo pruebe', 'Enséñale el código y deja que entre en su propia vista.', 'Enseñar el código del niño'],
  sj_celebrate_star: ['¡Una estrella!', 'Tu niño ha terminado una actividad: celebradlo juntos.', '¡Qué bien!'],
  sj_introduce_stars: ['Cómo funcionan las estrellas', 'Cada actividad marcada da una estrella. Las estrellas se cambian por recompensas en el cofre de estrellas.', 'Ver el cofre de estrellas'],
  sj_welcome_child_login: ['¡Tu niño ha entrado!', 'Buen comienzo: deja que avance a su ritmo.', '¡Qué bien!'],
  sj_help_get_started: ['¿Un pequeño empujón?', 'Tu rutina espera. Mira el día de tu niño: lleva un minuto.', 'Ver el día'],
  sj_day7_reflection: ['Una semana juntos', 'Una semana de rutina, a vuestro ritmo.', 'Cerrar'],
  coach_expand: ['Ya le habéis pillado el ritmo', 'La rutina se sostiene. Explora recompensas nuevas o invita al otro adulto.', 'Continuar'],
};
