'use strict';

/**
 * de-DE copy for journey_experience_registry rows (shared by migration + JSON fallback).
 * Keys match experience_key in config/journey-experience-registry.json.
 * Values: [headline, body, cta] — body may be null for empty body.
 */
module.exports = {
  handoff_to_child: ['Lass dein Kind die Routine ausprobieren', 'Öffnet gemeinsam den Kinderbereich — dein Kind sieht sofort, was als Nächstes dran ist.', 'Kinderbereich jetzt testen'],
  parent_ack_completion: ['Dein Kind hat eine Aktivität geschafft!', 'Bestätige es, damit ihr den ersten Erfolg gemeinsam feiern könnt.', 'Ansehen'],
  celebrate_first_success: ['Erster Stern geschafft!', 'Dein Kind hat die erste Aktivität erledigt — und du hast es gesehen. Das ist ein echter Meilenstein.', 'Wie schön!'],
  fw_day1_morning: ['Guten Morgen', 'Der Tagesplan ist bereit. Lass dein Kind sich anmelden und den Tag in seinem eigenen Tempo beginnen.', 'Zeig es deinem Kind'],
  fw_day1_evening: ['Ein ruhiger Abend', 'Eine einfache Abendroutine macht den morgigen Tag leichter. Schaut gemeinsam, was kommt.', 'Zum Abend'],
  fw_day2_quiet: ['Dein Kind findet den Rhythmus', 'Du musst jetzt nicht viel tun — lass dein Kind führen.', 'Kinderbereich ansehen'],
  fw_day3_new_day: ['Morgen ist ein neuer Tag', 'Gestern lief nicht wie geplant — das ist in Ordnung. Die Routine ist da, wenn ihr bereit seid.', 'OK'],
  fw_day4_discovery: ['Etwas Neues in der Welt', 'Dein Kind hat etwas Neues in der Sternenwelt entdeckt — ganz von selbst.', 'Schau, was passiert ist'],
  fw_week_reflection: ['Eine Woche zusammen', '', 'Schließen'],
  coach_consistency: ['Gewohnheit aufbauen', 'Dein Kind ist unterwegs — halt die Routine diese Woche leicht und fröhlich.', 'Tipps anzeigen'],
  coach_evening: ['Abendroutine?', 'Familien mit einer einfachen Abendroutine haben oft ruhigere Tage.', 'Entdecken'],
  sj_day1_child_preview: ['Eure Routine ist bereit', 'Der Plan steht. Schau auf den Tag deines Kindes, wenn es passt — heute Abend muss nicht alles erledigt sein.', 'Tag des Kindes ansehen'],
  sj_day2_try_routine: ['Routine im Alltag ausprobieren', 'Es reicht, eine Weile gemeinsam hinzuschauen. Kein Stress.', 'Plan öffnen'],
  sj_day3_child_try: ['Zeit, dass dein Kind es probiert', 'Zeig die PIN und lass dein Kind in die eigene Ansicht einloggen.', 'Kindercode zeigen'],
  sj_celebrate_star: ['Ein Stern!', 'Dein Kind hat eine Aktivität geschafft — feiert es gemeinsam.', 'Wie schön!'],
  sj_introduce_stars: ['So funktionieren Sterne', 'Jede erledigte Aktivität bringt einen Stern. Sterne kann man in der Schatzkammer gegen Belohnungen eintauschen.', 'Schatzkammer ansehen'],
  sj_welcome_child_login: ['Dein Kind ist drin!', 'Guter Start — lass dein Kind in seinem eigenen Tempo führen.', 'Wie schön!'],
  sj_help_get_started: ['Brauchst du einen Anstoß?', 'Eure Routine wartet. Schau auf den Tag deines Kindes — das dauert eine Minute.', 'Tag des Kindes ansehen'],
  sj_day7_reflection: ['Eine Woche zusammen', '', 'Schließen'],
  coach_expand: ['Ihr seid im Flow', 'Die Routine sitzt. Entdeckt neue Belohnungen oder ladet ein Elternteil ein.', 'Weiter'],
};
