'use strict';

/**
 * fr-FR copy for journey_experience_registry rows (shared by migration + JSON fallback).
 * Keys match experience_key in config/journey-experience-registry.json.
 * Values: [headline, body, cta] — body may be empty string when English body is empty.
 */
module.exports = {
  handoff_to_child: ['Laissez votre enfant essayer sa routine', 'Ouvrez ensemble la vue enfant — votre enfant voit tout de suite quoi faire.', 'Essayer la vue enfant'],
  parent_ack_completion: ['Votre enfant a terminé une activité !', 'Confirmez, pour fêter ensemble cette première réussite.', 'Voir'],
  celebrate_first_success: ['Première étoile !', 'Votre enfant a terminé sa première activité — et vous étiez là. C’est une vraie étape.', 'Super !'],
  fw_day1_morning: ['Bonjour', 'Le planning est prêt. Laissez votre enfant se connecter et commencer la journée à son rythme.', 'Montrer à votre enfant'],
  fw_day1_evening: ['Un soir au calme', 'Une routine du soir simple rend demain plus facile. Regardez ensemble ce qui arrive.', 'Vers le soir'],
  fw_day2_quiet: ['Votre enfant trouve son rythme', 'Vous n’avez pas grand-chose à faire maintenant — laissez votre enfant mener.', 'Voir la vue enfant'],
  fw_day3_new_day: ['Demain est un nouveau jour', 'Hier ne s’est pas passé comme prévu — ce n’est pas grave. La routine est là quand vous êtes prêts.', 'OK'],
  fw_day4_discovery: ['Du nouveau dans le monde', 'Votre enfant a trouvé quelque chose de nouveau dans le monde des étoiles — tout seul.', 'Voir ce qui s’est passé'],
  fw_week_reflection: ['Une semaine ensemble', '', 'Fermer'],
  coach_consistency: ['Ancrer l’habitude', 'Votre enfant est lancé — gardez la routine légère et joyeuse cette semaine.', 'Voir les conseils'],
  coach_evening: ['Une routine du soir ?', 'Les familles qui ajoutent une routine du soir simple ont souvent des journées plus stables.', 'Explorer'],
  sj_day1_child_preview: ['Votre routine est prête', 'Le planning est en place. Regardez la journée de votre enfant quand vous voulez — pas besoin de tout faire ce soir.', 'Voir la journée'],
  sj_day2_try_routine: ['Essayer la routine au quotidien', 'Il suffit de regarder ensemble un moment. Sans se presser.', 'Ouvrir le planning'],
  sj_day3_child_try: ['C’est le moment de laisser votre enfant essayer', 'Montrez le code et laissez votre enfant se connecter à sa propre vue.', 'Montrer le code enfant'],
  sj_celebrate_star: ['Une étoile !', 'Votre enfant a terminé une activité — fêtez ça ensemble.', 'Super !'],
  sj_introduce_stars: ['Comment fonctionnent les étoiles', 'Chaque activité cochée rapporte une étoile. Les étoiles s’échangent contre des récompenses dans le coffre aux étoiles.', 'Voir le coffre aux étoiles'],
  sj_welcome_child_login: ['Votre enfant est connecté !', 'Bon début — laissez votre enfant avancer à son rythme.', 'Super !'],
  sj_help_get_started: ['Un petit coup de pouce ?', 'Votre routine attend. Regardez la journée de votre enfant — cela prend une minute.', 'Voir la journée'],
  sj_day7_reflection: ['Une semaine ensemble', '', 'Fermer'],
  coach_expand: ['Vous avez pris le rythme', 'La routine tient. Explorez de nouvelles récompenses ou invitez l’autre parent.', 'Continuer'],
};
