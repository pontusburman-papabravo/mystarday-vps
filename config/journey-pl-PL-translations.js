'use strict';

/**
 * pl-PL copy for journey_experience_registry rows (shared by migration + JSON fallback).
 * Keys match experience_key in config/journey-experience-registry.json.
 * Values: [headline, body, cta] — body may be empty string when English body is empty.
 */
module.exports = {
  handoff_to_child: ['Pozwól dziecku spróbować swojej rutyny', 'Otwórzcie razem widok dziecka — od razu widać, co robić.', 'Wypróbuj widok dziecka'],
  parent_ack_completion: ['Dziecko ukończyło czynność!', 'Potwierdź, żeby razem ucieszyć się z pierwszego sukcesu.', 'Zobacz'],
  celebrate_first_success: ['Pierwsza gwiazdka!', 'Dziecko ukończyło pierwszą czynność — i ty to widzisz. To prawdziwy krok.', 'Pięknie!'],
  fw_day1_morning: ['Dzień dobry', 'Plan jest gotowy. Niech dziecko się zaloguje i zacznie dzień we własnym tempie.', 'Pokaż dziecku'],
  fw_day1_evening: ['Spokojny wieczór', 'Prosta wieczorna rutyna ułatwia jutro. Zobaczcie razem, co nadchodzi.', 'Do wieczoru'],
  fw_day2_quiet: ['Dziecko łapie rytm', 'Teraz nie musisz robić wiele — niech dziecko prowadzi.', 'Zobacz widok dziecka'],
  fw_day3_new_day: ['Jutro jest nowy dzień', 'Wczoraj nie poszło zgodnie z planem — i to nic. Rutyna jest tu, kiedy będziecie gotowi.', 'OK'],
  fw_day4_discovery: ['Coś nowego w świecie', 'Dziecko samo znalazło coś nowego w świecie gwiazdek.', 'Zobacz, co się stało'],
  fw_week_reflection: ['Tydzień razem', 'Spokojnie spojrzyjcie na tydzień, który macie za sobą.', 'Zamknij'],
  coach_consistency: ['Utrwal nawyk', 'Dziecko już ruszyło — w tym tygodniu trzymaj rutynę lekko i radośnie.', 'Pokaż wskazówki'],
  coach_evening: ['Wieczorna rutyna?', 'Rodziny, które dodają prostą wieczorną rutynę, często mają spokojniejsze dni.', 'Odkryj'],
  sj_day1_child_preview: ['Rutyna jest gotowa', 'Plan jest na miejscu. Zajrzyj do dnia dziecka, kiedy ci pasuje — nie musisz robić wszystkiego dziś wieczorem.', 'Zobacz dzień dziecka'],
  sj_day2_try_routine: ['Wypróbuj rutynę na co dzień', 'Wystarczy, że przez chwilę spojrzycie razem. Bez pośpiechu.', 'Otwórz plan'],
  sj_day3_child_try: ['Czas, żeby dziecko spróbowało', 'Pokaż PIN i pozwól dziecku zalogować się do własnego widoku.', 'Pokaż kod dziecka'],
  sj_celebrate_star: ['Gwiazdka!', 'Dziecko ukończyło czynność — ucieszcie się razem.', 'Pięknie!'],
  sj_introduce_stars: ['Jak działają gwiazdki', 'Każda odhaczona czynność daje gwiazdkę. Gwiazdki wymieniasz na nagrody w skrzyni gwiazdek.', 'Zobacz skrzynię gwiazdek'],
  sj_welcome_child_login: ['Dziecko jest w środku!', 'Dobry początek — niech dziecko idzie we własnym tempie.', 'Pięknie!'],
  sj_help_get_started: ['Małe szturchnięcie?', 'Rutyna czeka. Zajrzyj do dnia dziecka — to minuta.', 'Zobacz dzień dziecka'],
  sj_day7_reflection: ['Tydzień razem', 'Spokojnie spojrzyjcie na tydzień, który macie za sobą.', 'Zamknij'],
  coach_expand: ['Jesteś w rytmie', 'Rutyna się trzyma. Odkryj nowe nagrody albo zaproś drugiego rodzica.', 'Dalej'],
};
