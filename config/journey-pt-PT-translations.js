'use strict';

/**
 * pt-PT copy for journey_experience_registry rows (shared by migration + JSON fallback).
 * Keys match experience_key in config/journey-experience-registry.json.
 * Values: [headline, body, cta]
 */
module.exports = {
  handoff_to_child: ['Deixa a criança experimentar a rotina', 'Abre a vista da criança em conjunto — a criança vê logo o que fazer.', 'Experimentar a vista da criança'],
  parent_ack_completion: ['A criança terminou uma atividade!', 'Confirma, para festejarem juntos este primeiro passo.', 'Ver'],
  celebrate_first_success: ['Primeira estrela!', 'A criança terminou a primeira atividade — e tu viste. É um passo a sério.', 'Que bom!'],
  fw_day1_morning: ['Bom dia', 'O horário está pronto. Deixa a criança iniciar sessão e começar o dia ao seu ritmo.', 'Mostrar à criança'],
  fw_day1_evening: ['Uma tarde calma', 'Uma rotina da tarde simples torna o dia seguinte mais fácil. Vejam juntos o que vem a seguir.', 'Para a tarde'],
  fw_day2_quiet: ['A criança está a encontrar o ritmo', 'Não precisas de fazer muito agora — deixa a criança ir à frente.', 'Ver a vista da criança'],
  fw_day3_new_day: ['Amanhã é um dia novo', 'Ontem não correu como estava previsto — não faz mal. A rotina fica aqui quando estiverem prontos.', 'OK'],
  fw_day4_discovery: ['Há algo de novo no mundo', 'A criança encontrou algo de novo no mundo das estrelas — sozinha.', 'Ver o que aconteceu'],
  fw_week_reflection: ['Uma semana juntos', 'Uma semana de rotina, ao vosso ritmo.', 'Fechar'],
  coach_consistency: ['Fixar o hábito', 'A criança já arrancou — mantém a rotina leve e alegre esta semana.', 'Ver as dicas'],
  coach_evening: ['Uma rotina da tarde?', 'As famílias que acrescentam uma rotina da tarde simples costumam ter dias mais estáveis.', 'Explorar'],
  sj_day1_child_preview: ['A rotina está pronta', 'O horário está no lugar. Vê o dia da criança quando te der jeito — não é preciso fazer tudo hoje à noite.', 'Ver o dia'],
  sj_day2_try_routine: ['Experimentar a rotina no dia a dia', 'Basta olharem juntos um momento. Sem pressa.', 'Abrir o horário'],
  sj_day3_child_try: ['Está na hora de deixar a criança experimentar', 'Mostra o código e deixa a criança iniciar sessão na vista dela.', 'Mostrar o código da criança'],
  sj_celebrate_star: ['Uma estrela!', 'A criança terminou uma atividade — festejem juntos.', 'Que bom!'],
  sj_introduce_stars: ['Como funcionam as estrelas', 'Cada atividade marcada dá uma estrela. As estrelas trocam-se por recompensas no cofre das estrelas.', 'Ver o cofre das estrelas'],
  sj_welcome_child_login: ['A criança entrou!', 'Bom começo — deixa a criança avançar ao seu ritmo.', 'Que bom!'],
  sj_help_get_started: ['Um pequeno empurrão?', 'A rotina está à espera. Vê o dia da criança — leva um minuto.', 'Ver o dia'],
  sj_day7_reflection: ['Uma semana juntos', 'Uma semana de rotina, ao vosso ritmo.', 'Fechar'],
  coach_expand: ['Já apanharam o ritmo', 'A rotina está a pegar. Explora recompensas novas ou convida o outro adulto.', 'Continuar'],
};
