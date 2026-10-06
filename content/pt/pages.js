'use strict';

/**
 * Portuguese public pages. Written in European Portuguese.
 * Legal text translates the verified baseline. It adds no Portuguese statute.
 */

const { composeLocale, faq } = require('../compose-pages');

const pageFor = composeLocale('pt', {
  marker: /crianç/i,
  market: {
    title: (name) => `My Starday em ${name} — horários visuais para crianças`,
    description: (name) => `A página de mercado para ${name}. Horários visuais em português. É uma página de mercado, não um site de língua à parte.`,
    h1: (name) => `Horários visuais para famílias. Mercado: ${name}`,
    lead: (name) => `Esta é a página para ${name}. O site em português continua a ser um site de língua.`,
    registrationOpen: (name) => `Novas contas em ${name} seguem o registo que já existe. A predefinição é aberta.`,
    registrationClosed: (name) => `Novas contas em ${name} não estão abertas por predefinição. Isso segue o registo que já existe, não esta página. A predefinição é fechada.`,
    complimentary: (name) => `Para ${name} vale o período gratuito que já existe. Não passa sozinho a uma subscrição. Esta página não fixa um preço.`,
    introYear: (name) => `${name} mantém a oferta que já está no site sueco. Esta página não fixa um preço. Neste mercado não há período gratuito até 31 de dezembro de 2026.`,
    trial: (name, days) => `Se uma conta aqui for possível mais tarde, vale a regra que já existe fora da Suécia, da Irlanda e do Canadá: um período experimental de ${days} dias. O pagamento tem de estar disponível primeiro. Neste mercado não há período gratuito até 31 de dezembro de 2026, e nada passa sozinho a uma subscrição. Esta página não fixa um preço.`,
    notTreatment: (name) => `O botão abre a página geral da App Store, não uma página de produto inventada para ${name}. O My Starday é um horário visual. Não é um tratamento e não promete um resultado médico.`,
    register: 'Criar conta',
    registerNote: 'O formulário pergunta onde a família vive. Esta ligação não define país nem preço.',
    how: 'Como funciona',
    playSoon: 'O Google Play não está aberto aqui como página própria.',
  },
  home: {
    title: 'Horário visual para crianças – rotinas, recompensas e pictogramas | My Starday',
    description: 'Horários visuais e rotinas que mostram a uma criança o que acontece agora e o que vem a seguir. Pictogramas, uma vista da criança e estrelas por passos feitos.',
    h1: 'Horários visuais e rotinas que mostram a uma criança o que acontece agora e o que vem a seguir.',
    ogTitle: 'Horário visual para crianças',
    faqs: [
      faq('O que é o My Starday?', 'Um horário visual para famílias. A criança vê o passo seguinte. O adulto fica com as definições.'),
      faq('As estrelas compram-se?', 'Não. A estrela é de um passo feito. Não se compra.'),
      faq('Isto é um tratamento?', 'Não. O My Starday é ajuda no dia a dia e não promete um resultado médico.'),
    ],
    lead: 'Uma criança acalma quando o passo seguinte está à vista. O My Starday mostra o dia em imagens: agora, a seguir, feito.',
    hSee: 'O que a criança vê',
    see: 'A vista da criança mostra um passo de cada vez. O adulto faz o plano. A criança marca. Várias crianças podem partilhar a mesma casa, cada uma com o seu plano.',
    hStars: 'Estrelas',
    stars: 'Um passo feito pode dar uma estrela. As estrelas não se compram. Não substituem um acordo feito antes. Há mais no',
    starsLink: 'sistema de recompensas',
    hTreat: 'Não é um tratamento',
    treat: 'O plano pode ajudar uma criança que precisa de mais clareza, também com PHDA ou autismo, e igualmente famílias sem diagnóstico. O My Starday não é um tratamento e não promete um resultado certo.',
    marketsIntro: 'O site em português explica o produto. O país é outra coisa. Há uma página própria para',
    linkHow: 'Como funciona',
    linkVisual: 'Horário visual',
    linkMorning: 'Rotina da manhã',
  },
  howItWorks: {
    title: 'Como funciona o My Starday | Horário visual',
    description: 'O adulto prepara o dia. A criança vê o passo seguinte e marca-o. As estrelas são de passos feitos, não para comprar.',
    h1: 'Como funciona o My Starday',
    ogTitle: 'Como funciona',
    faqs: [
      faq('Quem faz o plano?', 'Um adulto. A criança vê a vista da criança e marca os passos.'),
      faq('A criança precisa de e-mail?', 'Não. A criança entra com um nome e um PIN.'),
    ],
    lead: 'Três coisas seguram a manhã: um plano visível, uma criança que marca sozinha, e um adulto que fica com as definições.',
    hPlan: '1. O plano',
    plan: 'Põem as atividades na ordem que a manhã tem mesmo. As imagens ajudam quando a criança ainda não lê.',
    planLink: 'O horário visual mostra o agora e o a seguir',
    hChild: '2. A vista da criança',
    child: 'A criança vê o passo seguinte, não as definições da família. Não há publicidade nem rede social.',
    hStar: '3. A estrela',
    star: 'Um passo concluído pode dar uma estrela. A estrela não se compra. O acordo fica feito antes, não a meio da pressa.',
    closing: 'O My Starday é ajuda no dia a dia. Não é um tratamento e não substitui o conselho de um médico, terapeuta ou da escola.',
  },
  visualSchedule: {
    title: 'Horário visual para crianças | My Starday',
    description: 'Um horário visual mostra a uma criança o que acontece agora e o que vem a seguir. Poucos passos, imagens conhecidas, uma ordem clara.',
    h1: 'Horário visual para crianças',
    ogTitle: 'Horário visual',
    faqs: [
      faq('Quantos passos?', 'Muitas vezes chegam quatro ou cinco. Uma lista mais longa serve quando a ordem já é conhecida.'),
      faq('Fotos ou símbolos?', 'Imagens que a criança já conhece. Fotos de casa resultam bem.'),
    ],
    lead: 'Um horário visual torna a ordem visível. A criança não tem de adivinhar o que vem a seguir.',
    hNow: 'Agora e a seguir',
    now: 'Mostra só o passo atual e o seguinte. Uma lista longa na parede ajuda menos do que o próximo gesto claro.',
    hStuck: 'Quando um passo pára',
    stuck1: 'Divide o passo. «Vestir» passa a meias, calças, camisola.',
    stuck2: 'Um de cada vez.',
    stuck3: 'Mostra em vez de repetir.',
    bridge: 'De manhã está',
    morningLink: 'a rotina da manhã',
    weekLink: 'O plano semanal mostra que dia é',
    closing: 'O My Starday não é um tratamento e não promete um resultado médico.',
  },
  morningRoutine: {
    title: 'Rotina da manhã para crianças | My Starday',
    description: 'Uma rotina da manhã com imagens baixa o número de lembretes falados. A mesma ordem, dia após dia.',
    h1: 'Rotina da manhã para crianças',
    ogTitle: 'Rotina da manhã',
    faqs: [
      faq('O que entra na manhã?', 'Só o que acontece mesmo antes de saírem. Levantar, vestir, comer, dentes, casaco.'),
      faq('E se o tempo aperta?', 'Encurta a lista em vez de falar mais depressa. Um plano mais curto é um plano a sério.'),
    ],
    lead: 'A mesma ordem faz de uma lista um hábito. Em vez de dizer «lava os dentes» outra vez, olham para a imagem seguinte.',
    hExample: 'Exemplo',
    steps: [
      'Levantar',
      'Casa de banho e lavar as mãos',
      'Vestir',
      'Pequeno-almoço',
      'Lavar os dentes',
      'Casaco, sapatos, mochila',
    ],
    age: 'Uma criança em idade de jardim de infância gere-se muitas vezes melhor com quatro ou cinco passos.',
    bridge: 'Famílias que procuram mais apoio nas transições podem ler',
    bridgeLink: 'o guia sobre clareza',
    closing: 'O My Starday é apoio no dia, não um tratamento.',
  },
  weeklySchedule: {
    title: 'Plano semanal com pictogramas para crianças | My Starday',
    description: 'Um plano semanal com pictogramas mostra que dia é, não só o que está a acontecer agora.',
    h1: 'Plano semanal com pictogramas',
    ogTitle: 'Plano semanal com pictogramas',
    faqs: [
      faq('Qual é a diferença para o horário do dia?', 'O horário do dia são os passos de hoje. O plano semanal mostra como os dias diferem.'),
      faq('A partir de que idade?', 'Muitas vezes perto da escola, quando a semana muda mais. Uma criança mais nova precisa primeiro do dia de hoje.'),
    ],
    lead: 'Um plano semanal ajuda quando o dia de semana e o fim de semana são diferentes, ou quando «o que é amanhã?» precisa de resposta antes de dormir.',
    mid: 'Segunda com desporto, quarta com o outro progenitor, sexta com um filme. As imagens tornam isso visível antes de uma criança ler um calendário.',
    dayLink: 'O horário do dia',
    dayRest: 'são os passos de hoje. O plano semanal diz que dia é.',
    closing: 'O My Starday não promete um resultado médico.',
  },
  neurodiverseRoutines: {
    title: 'Rotinas para crianças neurodivergentes | My Starday',
    description: 'Mais clareza no dia para uma criança que precisa de transições nítidas. O My Starday é ajuda no dia a dia, não um tratamento e não um diagnóstico.',
    h1: 'Rotinas para crianças neurodivergentes',
    ogTitle: 'Rotinas para crianças neurodivergentes',
    faqs: [
      faq('Isto é só para um diagnóstico?', 'Não. O plano ajuda onde faz falta mais clareza. Um diagnóstico não é condição.'),
      faq('Substitui a terapia?', 'Não. Não é um tratamento e não substitui o conselho de profissionais.'),
    ],
    lead: 'Há criança que precisa de ver o passo seguinte, não de uma explicação mais alta. Vale com diagnóstico e sem ele.',
    hAdhd: 'PHDA: começar e ficar no passo',
    adhd: 'A mudança pára muitas vezes porque o passo seguinte não se vê. Um plano com visto diz logo: este passo está feito.',
    hAutism: 'Autismo: previsibilidade',
    autism: 'Outra ordem pode parecer grande. Um',
    weekLink: 'plano semanal',
    autismRest: 'mostra antes que dia vem. Um passo riscado deve mudar à vista, não desaparecer em silêncio.',
    closing: 'O My Starday é ajuda no dia a dia. Não é tratamento médico e não substitui o conselho de um médico, terapeuta ocupacional, terapeuta da fala ou da escola. Cartões no sentido de primeiro, depois e feito ainda não existem em PDF em português. Esses cartões são uma inspiração, não um método oficial e não uma certificação.',
  },
  rewardSystem: {
    title: 'Sistema de recompensas para crianças | My Starday',
    description: 'Uma recompensa combinada antes é diferente de um negócio no momento. A criança ganha as estrelas. Não se compram.',
    h1: 'Sistema de recompensas para crianças, sem o transformar num negócio',
    ogTitle: 'Sistema de recompensas para crianças',
    faqs: [
      faq('Um cartão de estrelas é suborno?', 'Não, quando a recompensa está combinada antes e depende de algo que a criança consegue fazer. Um negócio oferece-se no momento para parar alguma coisa.'),
      faq('Quantas estrelas?', 'Começa com uma estrela por passo feito. As estrelas não se compram.'),
    ],
    lead: '«Isto não é só suborno?» depende de quando combinam. Combinado antes, um cartão pode apoiar um hábito. A meio da zanga torna-se negociação.',
    planLink: 'No horário visual',
    chain: 'a cadeia é simples: ver o passo, fazer, marcar, receber uma estrela.',
    steps: [
      'Sejam concretos. Recompensem «lava os dentes sem lembrete», não «porta-se bem».',
      'Mostrem o progresso.',
      'Contem a tentativa, não só a manhã perfeita.',
      'Deixem a criança pensar na recompensa.',
      'Espacem as estrelas quando o hábito já está.',
    ],
    closing: 'As estrelas não se compram. O My Starday não promete um resultado médico.',
  },
  resources: {
    title: 'Materiais para rotinas visuais | My Starday',
    description: 'O que já existe em português, e o que ainda não existe em PDF. A aplicação e uma folha impressa são duas coisas diferentes.',
    h1: 'Materiais',
    ogTitle: 'Materiais',
    faqs: [
      faq('Há PDF em português?', 'Ainda não. Esta página não vende folhas suecas como se fossem uma tradução portuguesa.'),
    ],
    lead: 'A aplicação mostra o dia no ecrã. Uma folha impressa é outra coisa. Ainda não há PDF em português aqui.',
    app: 'Na aplicação fazem',
    dayLink: 'o horário do dia',
    morningLink: 'a rotina da manhã',
    weekLink: 'o plano semanal',
    appRest: 'A criança vê a mesma ordem na vista da criança.',
    nolink: 'Não ligamos uma biblioteca noutra língua como se fosse em português. Quando houver folhas em português, ficam nesta página.',
  },
  faq: {
    title: 'Perguntas frequentes | My Starday',
    description: 'Respostas curtas sobre o horário, as estrelas, a vista da criança, o preço e o que o My Starday não é.',
    h1: 'Perguntas frequentes',
    ogTitle: 'Perguntas frequentes',
    faqs: [
      faq('Para quem é o site?', 'O site em português explica o produto. Portugal tem a sua página de mercado. A língua continua a ser o português.'),
      faq('Posso comprar estrelas?', 'Não.'),
      faq('É uma aplicação de terapia?', 'Não. Nenhum tratamento, nenhum resultado médico prometido.'),
      faq('Onde crio uma conta?', 'No formulário que já existe. Pergunta onde a família vive. Uma página de mercado não define o país sozinha.'),
    ],
    lead: 'As respostas curtas. Os textos mais longos estão nos guias.',
    hLang: 'Língua e país',
    lang: 'Este site está em português. O país escolhem-no à parte. Uma página de mercado não muda a língua nem cria uma conta.',
    hChild: 'A criança',
    child: 'A criança vê o plano e marca. Definições, convites e a conta ficam com o adulto. Há mais em',
    howLink: 'Como funciona',
    hStars: 'Estrelas',
    stars: 'As estrelas são de passos feitos. Não se compram. Lê',
    starsLink: 'o sistema de recompensas',
  },
  privacy: {
    title: 'Política de privacidade — My Starday',
    description: 'Que dados o My Starday trata, o que não recolhemos, e que direitos o RGPD dá.',
    h1: 'Política de privacidade do My Starday',
    ogTitle: 'Política de privacidade',
    body: `
      <p class="updated">Última atualização: outubro de 2026</p>
      <p>Tratamos a tua privacidade com cuidado. O My Starday recolhe o mínimo possível: só o que a aplicação precisa para funcionar. Não vendemos os teus dados e não os usamos para publicidade dirigida. Uma partilha fora do serviço só acontece quando a escolhes, ou quando é precisa para os nossos subcontratantes manterem o serviço.</p>
      <p><strong>Responsável:</strong> a Papa Bravo AB é responsável pelo tratamento dos teus dados pessoais. Contactas-nos pelo <a href="/en/contact">formulário de contacto</a>.</p>
      <h2>O que recolhemos</h2>
      <p>Tratamos dados com base no contrato, para podermos disponibilizar a aplicação e as funções em que te inscreves. Sobre adultos e famílias recolhemos:</p>
      <ul>
        <li><strong>Endereço de e-mail</strong> — para o início de sessão e mensagens da conta</li>
        <li><strong>Nome e apelido</strong> — para reconhecer a conta</li>
        <li><strong>Registo de atividades</strong> — que atividades ficaram feitas, e quando</li>
        <li><strong>Estrelas</strong> — estrelas ganhas e usadas</li>
        <li><strong>Planos e atividades</strong> — o que tu próprio crias</li>
      </ul>
      <p><strong>Privacidade de uma criança:</strong> uma criança só se reconhece por um nome próprio ou alcunha e um emoji escolhido. Não recolhemos apelido, número de identificação nem contactos de uma criança.</p>
      <h2>O que não recolhemos</h2>
      <ul>
        <li>Nenhuns apelidos de crianças</li>
        <li>Nenhuns números de identificação, nem de adultos nem de crianças</li>
        <li>Nenhuma informação sobre saúde, diagnóstico ou deficiência de uma criança</li>
        <li>Nenhuns dados de pagamento. As compras passam pela App Store ou pelo Google Play</li>
        <li>Nenhuns dados de localização</li>
      </ul>
      <h2>Para que usamos os dados</h2>
      <ul>
        <li>Mostrar o horário do dia à criança</li>
        <li>Guardar o progresso e as estrelas</li>
        <li>Enviar o e-mail de confirmação e mensagens da conta</li>
        <li>Responder a mensagens que nos envias</li>
      </ul>
      <h2>Partilha</h2>
      <p>Não partilhamos os teus dados para publicidade. Estes subcontratantes mantêm o serviço. Só tratam por nossa conta e segundo o RGPD:</p>
      <ul>
        <li><strong>Neon (base de dados)</strong> — conta, planos, atividades e dados da família</li>
        <li><strong>Alojamento próprio (VPS na UE/EEE)</strong> — a aplicação web e a API</li>
        <li><strong>Resend (e-mail)</strong> — e-mail transacional, por exemplo confirmação, palavra-passe e boas-vindas</li>
        <li><strong>Cloudflare R2</strong> — fotografias de perfil carregadas, quando usas essa função</li>
        <li><strong>Apple e Google</strong> — início de sessão e notificações push por APNs e FCM, quando usas essas funções</li>
      </ul>
      <h2>Relatório para uma conversa</h2>
      <p>Quando, como titular das responsabilidades parentais, crias uma ligação por tempo limitado a um resumo de números escolhidos de atividades e recompensas, podes partilhá-la, por exemplo com um professor ou um terapeuta. Isso só acontece porque o escolhes. Tu decides o conteúdo e podes revogar a ligação. Quem recebe não precisa de conta.</p>
      <p>Se proteges uma ligação com um código, não partilhes o código na mesma mensagem que a ligação.</p>
      <h2>Início de sessão com a Apple ou a Google</h2>
      <ul>
        <li><strong>Início de sessão com a Apple:</strong> tratamos o nome e o e-mail. Se escolheres ocultar o e-mail, guardamos o endereço único de reencaminhamento que a Apple cria, para podermos enviar mensagens da conta.</li>
        <li><strong>Início de sessão com a Google:</strong> recebemos e guardamos o e-mail e o nome da conta Google para criar o perfil.</li>
      </ul>
      <p>O tratamento feito pela própria Apple e pela própria Google segue as políticas delas.</p>
      <h2>Notificações push e token do dispositivo</h2>
      <p>Se ativares notificações push, guardamos, com base no teu consentimento, um token único do dispositivo (APNs ou FCM), para a mensagem chegar ao dispositivo certo. O token fica ligado à tua conta.</p>
      <p>O token expira ao terminar a sessão, ou quando a plataforma o declara inválido. Não guardamos uma característica do dispositivo sem uma subscrição push ativa. Desligas nas definições da aplicação ou no dispositivo.</p>
      <h2>Prazo de conservação</h2>
      <p>Conservamos os dados enquanto a conta estiver ativa. Se apagares a conta, todos os dados são apagados de imediato e de forma permanente.</p>
      <h2>Apagar a conta</h2>
      <p>Apagas a conta na aplicação, nas definições. Confirmas com a palavra-passe ou com o início de sessão de terceiros.</p>
      <p>Isto não se desfaz. Desaparecem a conta do adulto, os perfis das crianças, os planos, os registos do dia, as avaliações, as recompensas e os convites.</p>
      <h2>Conservação e segurança</h2>
      <p>Procuramos conservar os dados nucleares na UE/EEE, quando isso se aplica. Alguns fornecedores podem tratar fora do EEE. A transferência e as garantias estão neste texto e são revistas de forma contínua. As ligações são cifradas (HTTPS). As palavras-passe não ficam em claro. Usamos bcrypt.</p>
      <h2>Cookies</h2>
      <ul>
        <li><strong>Cookies estritamente necessários</strong> — sempre ligados. Sessão e proteção CSRF para um início de sessão seguro.</li>
        <li><strong>Preferências</strong> — guardadas localmente, por exemplo um tema.</li>
        <li><strong>Estatística e marketing</strong> — Google Analytics 4, Meta Pixel e Google Ads. Desligados por predefinição, até dares consentimento no aviso de cookies.</li>
      </ul>
      <p>A tua escolha fica guardada no máximo um ano. Podes mudá-la no aviso ou nas definições. Dados de rotina de uma criança não vão para plataformas de publicidade.</p>
      <h2>Os teus direitos (RGPD)</h2>
      <ul>
        <li>Direito de apagar a conta e os dados</li>
        <li>Direito de acesso</li>
        <li>Direito de retificar dados inexatos</li>
        <li>Direito de oposição ou limitação</li>
        <li>Direito de apresentar queixa à autoridade sueca Integritetsskyddsmyndigheten (IMY), se considerares que violamos o RGPD</li>
      </ul>
      <h2>Contacto</h2>
      <p>Perguntas sobre este tratamento? Usa o <a href="/en/contact">formulário de contacto</a>.</p>
    `,
  },
  terms: {
    title: 'Termos de utilização — My Starday',
    description: 'Os termos de utilização do My Starday: conta, crianças, preço e responsabilidade.',
    h1: 'Termos de utilização',
    ogTitle: 'Termos de utilização',
    body: `
      <p class="updated">Última atualização: outubro de 2026</p>
      <p>Obrigado por usares o My Starday. Estes termos devem ser claros e honestos. As perguntas vão pelo <a href="/en/contact">formulário de contacto</a>.</p>
      <h2>1. Sobre o serviço</h2>
      <p>O My Starday é um serviço digital para famílias que querem um horário do dia estruturado, marcar o progresso de uma criança com estrelas e deixar a criança seguir as atividades numa vista própria. O serviço é para pais e titulares das responsabilidades parentais e para as suas crianças. Uma família tem pelo menos um adulto com conta. Uma criança entra com um PIN na vista da criança.</p>
      <h2>2. Conta e segurança</h2>
      <ul>
        <li>Escolhe uma palavra-passe forte e não a partilhes</li>
        <li>Protege o teu e-mail. É com ele que recuperas o acesso</li>
        <li>O PIN da vista da criança é só para a criança e para os titulares das responsabilidades parentais</li>
        <li>Não uses a aplicação de forma contrária à lei sueca</li>
      </ul>
      <p>És responsável por tudo o que acontece na tua conta, mesmo que outra pessoa a use. Se suspeitares de uso indevido, contacta-nos de imediato.</p>
      <h2>3. Crianças e dados pessoais</h2>
      <p>O My Starday trata dados sobre crianças. Seguimos o RGPD e o princípio da minimização:</p>
      <ul>
        <li>Uma criança reconhece-se por um nome próprio e um emoji escolhido. Sem apelido, sem número de identificação, sem contactos</li>
        <li>Os pais ou titulares das responsabilidades parentais introduzem os dados e consentem a partilha</li>
        <li>Não usamos dados de crianças para publicidade nem para nada além do serviço</li>
        <li>Relatórios e planos só se partilham quando um adulto partilha ele próprio uma ligação por tempo limitado</li>
      </ul>
      <h2>4. Conteúdo que crias</h2>
      <p>Planos, recompensas, atividades e observações que acrescentas pertencem-te a ti ou à tua família. Dás-nos o direito de guardar e mostrar esse conteúdo enquanto a conta estiver ativa. Não o copiamos para publicidade, não o vendemos e não o usamos em marketing.</p>
      <h2>5. Utilização</h2>
      <p>O serviço é para uso pessoal na tua família. Não é permitido:</p>
      <ul>
        <li>Uso comercial sem acordo com a Papa Bravo AB</li>
        <li>Manipular planos, estrelas ou recompensas fora do funcionamento normal da aplicação</li>
        <li>Meios automatizados, scrapers ou bots contra o serviço</li>
        <li>Publicar conteúdo ilegal, ofensivo ou prejudicial</li>
      </ul>
      <h2>6. Cessação e apagamento</h2>
      <p>Podes apagar a conta de forma permanente a qualquer momento nas definições da aplicação, confirmado com a tua palavra-passe.</p>
      <p>O apagamento remove de imediato e de forma permanente a conta do adulto, todas as crianças, os planos, os registos de atividade, as estrelas, as recompensas e eventuais observações.</p>
      <p>Podemos suspender uma conta que viole estes termos ou a lei sueca.</p>
      <h2>7. Preço</h2>
      <p>As famílias na Irlanda e no Canadá podem usar o My Starday sem custo até 31 de dezembro de 2026, inclusive. Nesse período não é preciso pagamento. O período gratuito não passa automaticamente a uma subscrição. A partir de 1 de janeiro de 2027 podes escolher uma subscrição na App Store ou no Google Play. Nesta página não há caixa web. Noutros países valem o preço e o acesso que a aplicação mostra para esse país. As famílias suecas que começam a partir de 3 de outubro de 2026 podem experimentar a aplicação durante 14 dias e depois escolher 59 coroas suecas por mês ou 590 coroas suecas por ano na aplicação. As famílias que já têm conta mantêm a oferta que já têm.</p>
      <h2>8. Alterações</h2>
      <p>Podemos ajustar estes termos, por exemplo depois de uma alteração legal, de uma função nova ou de um esclarecimento. Se a alteração for relevante, dizemos por e-mail ou com um aviso na aplicação.</p>
      <p>Se continuares a usar o serviço depois disso, isso vale como aceitação dos novos termos.</p>
      <h2>9. Responsabilidade</h2>
      <p>O My Starday é disponibilizado tal como está. Fazemos o possível para manter o serviço estável e seguro, mas não podemos garantir que esteja sempre disponível sem interrupção.</p>
      <p>A Papa Bravo AB não responde por:</p>
      <ul>
        <li>Perda de dados por força maior</li>
        <li>Dano por partilhares um PIN ou dados de acesso com alguém que não os devia ter</li>
        <li>Dano indireto, oportunidade perdida ou dados perdidos, salvo se a lei sueca exigir outra coisa</li>
      </ul>
      <p>És responsável por um uso conforme estes termos e a lei sueca.</p>
      <h2>10. Contacto</h2>
      <p>Perguntas sobre estes termos ou sobre o serviço? Usa o <a href="/en/contact">formulário de contacto</a>.</p>
    `,
  },
});

module.exports = { pageFor };
