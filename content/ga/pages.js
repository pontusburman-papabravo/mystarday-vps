'use strict';

/**
 * Irish public pages. Written in Irish.
 * Legal text translates the verified baseline. It adds no Irish statute.
 * Ireland market copy uses the existing commercial facts. It does not add a price.
 */

const { composeLocale, faq } = require('../compose-pages');

const pageFor = composeLocale('ga', {
  marker: /páist/i,
  market: {
    title: (name) => `My Starday — ${name}. Sceideal amhairc do pháistí`,
    description: (name) => `Leathanach margaidh do ${name}. Sceideal amhairc as Gaeilge. Is leathanach margaidh é seo, ní suíomh teanga ar leith.`,
    h1: (name) => `Sceideal amhairc do theaghlaigh. Margadh: ${name}`,
    lead: (name) => `Seo é an leathanach do ${name}. Fanann an suíomh Gaeilge ina shuíomh teanga.`,
    registrationOpen: (name) => `Leanann cuntais nua do ${name} an chlárúchán atá ann cheana. Tá sé oscailte de réir réamhshocraithe.`,
    registrationClosed: (name) => `Níl cuntais nua do ${name} oscailte de réir réamhshocraithe. Leanann sé sin an chlárúchán atá ann cheana, ní an leathanach seo. Tá sé dúnta de réir réamhshocraithe.`,
    complimentary: (name) => `Baineann an tréimhse shaor in aisce atá ann cheana le ${name}. Ní bhíonn sí ina síntiús aisti féin. Ní shocraíonn an leathanach seo praghas.`,
    introYear: (name) => `Coinníonn ${name} an tairiscint atá ar an suíomh Sualannach cheana. Ní shocraíonn an leathanach seo praghas. Níl tréimhse shaor in aisce ar an margadh seo go dtí an 31 Nollaig 2026.`,
    trial: (name, days) => `Má bhíonn cuntas indéanta anseo níos déanaí, baineann an riail atá ann cheana lasmuigh den tSualainn, d’Éirinn agus de Cheanada: triail ${days} lá. Caithfidh íocaíocht a bheith ar fáil ar dtús. Níl tréimhse shaor in aisce ar an margadh seo go dtí an 31 Nollaig 2026, agus ní bhíonn aon ní ina shíntiús as féin. Ní shocraíonn an leathanach seo praghas.`,
    notTreatment: (name) => `Osclaíonn an cnaipe an leathanach gnách san App Store, ní leathanach táirge cumtha do ${name}. Is sceideal amhairc é My Starday. Ní cóireáil é agus ní gheallann sé toradh míochaine.`,
    register: 'Cruthaigh cuntas',
    registerNote: 'Fiafraíonn an fhoirm cá bhfuil cónaí ar an teaghlach. Ní shocraíonn an nasc seo tír leis féin agus ní shocraíonn sé praghas.',
    how: 'Conas a oibríonn sé',
    playSoon: 'Ní osclaítear Google Play anseo mar leathanach dá chuid féin.',
  },
  home: {
    title: 'Sceideal amhairc do pháistí – gnáthaimh, duaiseanna agus picteagraim | My Starday',
    description: 'Sceidil amhairc agus gnáthaimh a thaispeánann do pháiste cad atá ag tarlú anois agus cad atá le teacht. Picteagraim, amharc an pháiste, agus réaltaí do chéimeanna déanta.',
    h1: 'Sceideal amhairc agus gnáthaimh a thaispeánann do pháiste cad atá ag tarlú anois agus cad atá le teacht.',
    ogTitle: 'Sceideal amhairc do pháistí',
    faqs: [
      faq('Cad é My Starday?', 'Sceideal amhairc do theaghlaigh. Feiceann an páiste an chéad chéim eile. Coinníonn an duine fásta na socruithe.'),
      faq('An féidir réaltaí a cheannach?', 'Ní féidir. Tugtar réalta do chéim atá déanta. Ní féidir í a cheannach.'),
      faq('An cóireáil é seo?', 'Ní cóireáil. Is cúnamh sa ghnáthlá é My Starday agus ní gheallann sé toradh míochaine.'),
    ],
    lead: 'Socraíonn páiste nuair a fheictear an chéad chéim eile. Taispeánann My Starday an lá i bpictiúir: anois, ansin, déanta.',
    hSee: 'Cad a fheiceann an páiste',
    see: 'Taispeánann amharc an pháiste céim amháin ag an am. Cuireann an duine fásta an plean le chéile. Marcálann an páiste. Is féidir le níos mó ná páiste amháin teach a roinnt, gach duine lena phlean féin.',
    hStars: 'Réaltaí',
    stars: 'Is féidir le céim déanta réalta a thabhairt. Ní féidir na réaltaí a cheannach. Ní ghlacann siad áit an mhargaidh a rinne sibh roimh ré. Tá tuilleadh anseo:',
    starsLink: 'córas duaiseanna',
    hTreat: 'Ní cóireáil',
    treat: 'Is féidir leis an bplean cabhrú le páiste a dteastaíonn níos mó soiléireachta uaidh, le ADHD nó le huathachas freisin, agus leis na teaghlaigh gan diagnóis ar an gcaoi chéanna. Ní cóireáil é My Starday agus ní gheallann sé toradh áirithe.',
    marketsIntro: 'Míníonn an suíomh Gaeilge an táirge. Is rud ar leith í an tír. Tá leathanach dá cuid féin ann do:',
    linkHow: 'Conas a oibríonn sé',
    linkVisual: 'Sceideal amhairc',
    linkMorning: 'Gnás na maidine',
  },
  howItWorks: {
    title: 'Conas a oibríonn My Starday | Sceideal amhairc',
    description: 'Cuireann an duine fásta an lá le chéile. Feiceann an páiste an chéad chéim eile agus marcálann sé í. Is do chéimeanna déanta na réaltaí, ní don cheannach.',
    h1: 'Conas a oibríonn My Starday',
    ogTitle: 'Conas a oibríonn sé',
    faqs: [
      faq('Cé a shocraíonn an plean?', 'Duine fásta. Feiceann an páiste a amharc féin agus marcálann sé na céimeanna.'),
      faq('An bhfuil ríomhphost de dhíth ar an bpáiste?', 'Níl. Logálann páiste isteach le hainm agus le PIN.'),
    ],
    lead: 'Coinníonn trí rud an mhaidin: plean infheicthe, páiste a mharcálann é féin, agus duine fásta a choinníonn na socruithe.',
    hPlan: '1. An plean',
    plan: 'Cuir na gníomhaíochtaí san ord atá ag an maidin i ndáiríre. Cabhraíonn na pictiúir nuair nach bhfuil an páiste ag léamh fós.',
    planLink: 'Taispeánann an sceideal amhairc anois agus ansin',
    hChild: '2. Amharc an pháiste',
    child: 'Feiceann an páiste an chéad chéim eile, ní socruithe an teaghlaigh. Níl fógraí ann agus níl líonra sóisialta ann.',
    hStar: '3. An réalta',
    star: 'Is féidir le céim críochnaithe réalta a thabhairt. Ní féidir an réalta a cheannach. Seasann an margadh roimh ré, ní i lár an deabhaidh.',
    closing: 'Is cúnamh sa ghnáthlá é My Starday. Ní cóireáil é agus ní ghlacann sé áit chomhairle dochtúra, teiripeora ná scoile.',
  },
  visualSchedule: {
    title: 'Sceideal amhairc do pháistí | My Starday',
    description: 'Taispeánann sceideal amhairc do pháiste cad atá ag tarlú anois agus cad atá le teacht. Beagán céimeanna, pictiúir aitheanta, ord soiléir.',
    h1: 'Sceideal amhairc do pháistí',
    ogTitle: 'Sceideal amhairc',
    faqs: [
      faq('Cé mhéad céim?', 'Is leor ceithre nó cúig cinn go minic. Oibríonn liosta níos faide nuair atá an t-ord aitheanta cheana.'),
      faq('Grianghraif nó comharthaí?', 'Pictiúir a aithníonn an páiste cheana. Oibríonn grianghraif an bhaile go maith.'),
    ],
    lead: 'Déanann an sceideal amhairc an t-ord infheicthe. Ní gá don pháiste buille faoi thuairim a thabhairt faoi cad atá le teacht. Feiceann páiste an chéad chéim eile.',
    hNow: 'Anois agus ansin',
    now: 'Taispeáin an chéim reatha agus an chéad cheann eile amháin. Is lú an chabhair a thugann liosta fada ar an mballa ná gluaiseacht shoiléir amháin.',
    hStuck: 'Má stadann céim',
    stuck1: 'Roinn an chéim. Bíonn “gléasadh” ina stocaí, ina bhríste, ina léine.',
    stuck2: 'Ceann ar cheann.',
    stuck3: 'Taispeáin, in ionad a athrá.',
    bridge: 'Tá an mhaidin i lár báire',
    morningLink: 'gnás na maidine',
    weekLink: 'Taispeánann plean na seachtaine cén lá atá ann',
    closing: 'Ní cóireáil é My Starday agus ní gheallann sé toradh míochaine.',
  },
  morningRoutine: {
    title: 'Gnás na maidine do pháistí | My Starday',
    description: 'Laghdaíonn gnás maidine le pictiúir na meabhrúcháin labhartha. An t-ord céanna, lá i ndiaidh lae.',
    h1: 'Gnás na maidine do pháistí',
    ogTitle: 'Gnás na maidine',
    faqs: [
      faq('Cad a bhaineann leis an maidin?', 'An méid a tharlaíonn i ndáiríre roimh an doras. Éirí, gléasadh, ithe, fiacla, seaicéad.'),
      faq('Cad a dhéantar má tá an t-am gann?', 'Giorraigh an liosta, in ionad labhairt níos tapúla. Is fíorphlean é plean níos giorra.'),
    ],
    lead: 'Déanann an t-ord céanna nós den liosta. In ionad “nigh do fhiacla” a rá arís, féachann sibh ar an gcéad phictiúr eile. Feiceann an páiste an chéim.',
    hExample: 'Sampla',
    steps: ['Éirí', 'Leithreas agus lámha a ní', 'Gléasadh', 'Bricfeasta', 'Fiacla a ghlanadh', 'Seaicéad, bróga, mála'],
    age: 'Is fearr a éiríonn le páiste réamhscoile go minic le ceithre nó cúig chéim.',
    bridge: 'Is féidir le teaghlaigh atá ag lorg níos mó tacaíochta ag na haistrithe',
    bridgeLink: 'an treoir faoin soiléireacht a léamh',
    closing: 'Is tacaíocht sa lá é My Starday, ní cóireáil.',
  },
  weeklySchedule: {
    title: 'Plean seachtaine le picteagraim do pháistí | My Starday',
    description: 'Taispeánann plean seachtaine le picteagraim cén lá atá ann, ní hamháin an méid atá ag tarlú anois.',
    h1: 'Plean seachtaine le picteagraim',
    ogTitle: 'Plean seachtaine le picteagraim',
    faqs: [
      faq('Cén difríocht atá idir é agus sceideal an lae?', 'Is iad céimeanna an lae inniu atá i sceideal an lae. Taispeánann plean na seachtaine conas atá na laethanta difriúil.'),
      faq('Cén aois?', 'Go minic thart ar thús na scoile, nuair a athraíonn an tseachtain níos mó. Teastaíonn lá an lae inniu ar dtús ó pháiste níos óige.'),
    ],
    lead: 'Cabhraíonn plean na seachtaine nuair atá an lá oibre agus an deireadh seachtaine difriúil, nó nuair a theastaíonn freagra ar “cad a tharlóidh amárach?” roimh chodladh. Feiceann an páiste an lá.',
    mid: 'Luan spórt, Céadaoin ag an tuismitheoir eile, Aoine scannán. Déanann na pictiúir é sin infheicthe sula léann páiste féilire.',
    dayLink: 'Sceideal an lae',
    dayRest: 'sin iad céimeanna an lae inniu. Insíonn plean na seachtaine cén lá atá ann.',
    closing: 'Ní gheallann My Starday toradh míochaine.',
  },
  neurodiverseRoutines: {
    title: 'Gnáthaimh do pháistí néara-éagsúla | My Starday',
    description: 'Níos mó soiléireachta sa lá do pháiste a dteastaíonn aistrithe soiléire uaidh. Is cúnamh sa ghnáthlá é My Starday, ní cóireáil agus ní diagnóis.',
    h1: 'Gnáthaimh do pháistí néara-éagsúla',
    ogTitle: 'Gnáthaimh do pháistí néara-éagsúla',
    faqs: [
      faq('An diagnóis amháin é seo?', 'Ní hea. Cabhraíonn an plean san áit a dteastaíonn níos mó soiléireachta. Ní coinníoll í an diagnóis.'),
      faq('An nglacann sé áit na teiripe?', 'Ní ghlacann. Ní cóireáil é agus ní ghlacann sé áit chomhairle speisialtóra.'),
    ],
    lead: 'Teastaíonn ó pháiste áirithe an chéad chéim eile a fheiceáil, ní í a chloisteáil níos airde. Is fíor é sin le diagnóis agus gan í. Is páiste é atá ag féachaint, ní ag éisteacht níos airde.',
    hAdhd: 'ADHD: tosú agus fanacht leis an gcéim',
    adhd: 'Stadann an t-aistriú go minic toisc nach bhfeictear an chéad chéim eile. Taispeánann plean le marc láithreach: tá an chéim seo déanta.',
    hAutism: 'Uathachas: intuarthacht',
    autism: 'Is féidir le hord eile a bheith mór.',
    weekLink: 'Plean na seachtaine',
    autismRest: 'taispeánann sé roimh ré cén lá atá ag teacht. Caithfidh céim a bhaintear amach athrú go infheicthe, ní imeacht go ciúin.',
    closing: 'Is cúnamh sa ghnáthlá é My Starday. Ní cóireáil mhíochaine é agus ní ghlacann sé áit chomhairle dochtúra, fisiteiripeora, teiripeora urlabhra ná scoile. Níl cártaí le brí ar dtús, ansin agus déanta ar fáil fós mar PDF Gaeilge do pháiste. Tugann cártaí mar sin smaoineamh, ní modh oifigiúil agus ní deimhniú.',
  },
  rewardSystem: {
    title: 'Córas duaiseanna do pháistí | My Starday',
    description: 'Is rud eile duaise a comhaontaíodh roimh ré ná an margántacht san nóiméad. Tuilleann an páiste na réaltaí. Ní féidir iad a cheannach.',
    h1: 'Córas duaiseanna do pháistí, gan é a bheith ina mhargántacht',
    ogTitle: 'Córas duaiseanna do pháistí',
    faqs: [
      faq('An breab í cárta réaltaí?', 'Ní breab, nuair a sheasann an duais roimh ré agus nuair a bhaineann sí le rud is féidir leis an bpáiste a dhéanamh. Tairgtear margántacht san nóiméad chun rud a stopadh.'),
      faq('Cé mhéad réalta?', 'Tosaigh le réalta amháin in aghaidh céime déanta. Ní féidir na réaltaí a cheannach.'),
    ],
    lead: '“Nach breab amháin é seo?” braitheann sé ar an uair a chomhaontaigh sibh. Is féidir le margadh a rinneadh roimh ré nós a thacú. I lár an fheirge bíonn sé ina mhargántacht. Feiceann an páiste an dul chun cinn.',
    planLink: 'Sa sceideal amhairc',
    chain: 'tá an slabhra simplí: an chéim a fheiceáil, í a dhéanamh, í a mharcáil, réalta a fháil.',
    steps: [
      'Bígí sonrach. Bronnaigí “níonn sé a fhiacla gan meabhrúchán”, ní “maith”.',
      'Taispeánaigí an dul chun cinn.',
      'Comhairigí an iarracht, ní hamháin an mhaidin fhoirfe.',
      'Lig don pháiste smaoineamh ar an duais libh. Is páiste é atá ag foghlaim.',
      'Laghdaígí na réaltaí nuair atá an nós ann.',
    ],
    closing: 'Ní féidir na réaltaí a cheannach. Ní gheallann My Starday toradh míochaine.',
  },
  resources: {
    title: 'Acmhainní do ghnáthaimh amhairc | My Starday',
    description: 'Cad atá ar fáil cheana as Gaeilge agus cad nach bhfuil fós mar PDF. Is dhá rud éagsúla iad an aip agus an bhileog chlóite.',
    h1: 'Acmhainní',
    ogTitle: 'Acmhainní',
    faqs: [faq('An bhfuil PDFanna Gaeilge ann?', 'Níl fós. Ní dhíolann an leathanach seo bileoga Sualannacha mar aistriúchán Gaeilge.')],
    lead: 'Taispeánann an aip an lá ar an scáileán. Is rud eile í bileog chlóite. Níl PDF Gaeilge do pháiste anseo fós.',
    app: 'San aip cuireann sibh le chéile',
    dayLink: 'sceideal an lae',
    morningLink: 'gnás na maidine',
    weekLink: 'plean na seachtaine',
    appRest: 'Feiceann an páiste an t-ord céanna in amharc an pháiste.',
    nolink: 'Ní nasctar bailiúchán teanga eile amhail is dá mba Ghaeilge é. Nuair a thiocfaidh na bileoga Gaeilge, beidh siad ar an leathanach seo.',
  },
  faq: {
    title: 'Ceisteanna coitianta | My Starday',
    description: 'Freagraí gearra faoin sceideal, na réaltaí, amharc an pháiste, an praghas, agus faoi cad nach é My Starday.',
    h1: 'Ceisteanna coitianta',
    ogTitle: 'Ceisteanna coitianta',
    faqs: [
      faq('Cé dó an suíomh?', 'Míníonn an suíomh Gaeilge an táirge. Tá a leathanach margaidh féin ag Éirinn. Fanann an teanga ina Gaeilge.'),
      faq('An féidir liom réaltaí a cheannach?', 'Ní féidir.'),
      faq('An aip teiripe í seo?', 'Ní hea. Níl cóireáil ann agus níl toradh míochaine geallta ann.'),
      faq('Cá gcruthaím cuntas?', 'Ar an bhfoirm atá ann cheana. Fiafraíonn sí cá bhfuil cónaí ar an teaghlach. Ní shocraíonn an leathanach margaidh an tír leis féin.'),
    ],
    lead: 'Na freagraí gearra. Tá na téacsanna níos faide sna treoracha. Baineann siad le páiste agus le duine fásta.',
    hLang: 'Teanga agus tír',
    lang: 'Tá an suíomh seo as Gaeilge. Roghnaítear an tír ar leith. Ní athraíonn an leathanach margaidh an teanga agus ní chruthaíonn sé cuntas.',
    hChild: 'An páiste',
    child: 'Feiceann an páiste an plean agus marcálann sé é. Fanann na socruithe, na cuirí agus an cuntas ag an duine fásta. Tá tuilleadh anseo:',
    howLink: 'Conas a oibríonn sé',
    hStars: 'Réaltaí',
    stars: 'Is do chéimeanna déanta na réaltaí. Ní féidir iad a cheannach. Léigh',
    starsLink: 'an córas duaiseanna',
  },
  privacy: {
    title: 'Fógra príobháideachais — My Starday',
    description: 'Cén sonra a phróiseálann My Starday, cad nach mbailímid, agus cé na cearta a thugann an GDPR.',
    h1: 'Fógra príobháideachais My Starday',
    ogTitle: 'Fógra príobháideachais',
    body: `
      <p class="updated">Nuashonraithe go deireanach: Deireadh Fómhair 2026</p>
      <p>Láimhseálaimid an príobháideachas go cúramach. Bailíonn My Starday chomh beag agus is féidir: an méid a theastaíonn ón aip chun oibriú, sin an méid. Ní dhíolaimid do shonraí agus ní úsáidimid iad le haghaidh fógraíochta spriocdhírithe. Ní tharlaíonn aistriú lasmuigh den tseirbhís ach nuair a roghnaíonn tú é, nó nuair a theastaíonn sé chun go gcoimeádfadh ár bpróiseálaithe an tseirbhís.</p>
      <p><strong>Rialaitheoir:</strong> tá Papa Bravo AB freagrach as próiseáil do shonraí pearsanta. Scríobh chugainn tríd an <a href="/en/contact">bhfoirm teagmhála</a>.</p>
      <h2>Cad a bhailímid</h2>
      <p>Próiseálaimid sonraí ar bhonn an chonartha, chun an aip agus na feidhmeanna a gcláraíonn tú dóibh a thabhairt. Maidir le daoine fásta agus teaghlaigh bailímid:</p>
      <ul>
        <li><strong>Ríomhphost</strong> — le logáil isteach agus teachtaireachtaí cuntais</li>
        <li><strong>Ainm agus sloinne</strong> — chun an cuntas a aithint</li>
        <li><strong>Dialann gníomhaíochtaí</strong> — cé na gníomhaíochtaí a bhí déanta agus cathain</li>
        <li><strong>Réaltaí</strong> — réaltaí a tuilleadh agus a úsáideadh</li>
        <li><strong>Pleananna agus gníomhaíochtaí</strong> — an méid a chruthaíonn tú féin</li>
      </ul>
      <p><strong>Príobháideachas an pháiste:</strong> aithnítear páiste le céadainm nó le leasainm agus le emoji roghnaithe amháin. Ní bhailímid sloinne, uimhir aitheantais, ná sonraí teagmhála an pháiste.</p>
      <h2>Cad nach mbailímid</h2>
      <ul>
        <li>Sloinnte páistí</li>
        <li>Uimhir aitheantais, ní do dhuine fásta ná do pháiste</li>
        <li>Eolas faoi shláinte, faoi dhiagnóis nó faoi mhíchumas páiste</li>
        <li>Sonraí íocaíochta. Téann ceannach tríd an App Store nó trí Google Play</li>
        <li>Sonraí suímh</li>
      </ul>
      <h2>Cén úsáid a bhaintear as na sonraí</h2>
      <ul>
        <li>Sceideal an lae a thaispeáint don pháiste</li>
        <li>An dul chun cinn agus na réaltaí a shábháil</li>
        <li>Ríomhphost deimhnithe agus teachtaireachtaí cuntais a sheoladh</li>
        <li>Freagra a thabhairt ar theachtaireachtaí a sheolann tú chugainn</li>
      </ul>
      <h2>Aistriú</h2>
      <p>Ní aistrímid do shonraí le haghaidh fógraíochta. Coinníonn na próiseálaithe seo an tseirbhís. Ní phróiseálann siad ach de réir ár dtreorach agus de réir an GDPR:</p>
      <ul>
        <li><strong>Neon (bunachar sonraí)</strong> — cuntas, pleananna, gníomhaíochtaí agus sonraí teaghlaigh</li>
        <li><strong>Ár n-óstáil féin (VPS san AE nó sa LEE)</strong> — an aip ghréasáin agus an API</li>
        <li><strong>Resend (ríomhphost)</strong> — post idirbhirt, mar shampla deimhniú, pasfhocal agus litir fáilte</li>
        <li><strong>Cloudflare R2</strong> — pictiúir phróifíle uaslódáilte, má úsáideann tú an fheidhm</li>
        <li><strong>Apple agus Google</strong> — logáil isteach agus teachtaireachtaí brú trí APNs agus FCM, má úsáideann tú na feidhmeanna</li>
      </ul>
      <h2>Tuairisc do chomhrá</h2>
      <p>Má chruthaíonn tú, mar chúramóir, nasc teoranta ó thaobh ama de le figiúirí roghnaithe gníomhaíochta agus duaise, is féidir leat é a roinnt mar shampla le múinteoir nó le teiripeoir. Ní tharlaíonn sé sin ach toisc gur roghnaigh tú é. Socraíonn tú an t-ábhar agus is féidir leat an nasc a chúlghairm. Ní theastaíonn cuntas ón bhfaighteoir.</p>
      <p>Má chosnaíonn tú an nasc le cód, ná roinn an cód sa teachtaireacht chéanna leis an nasc.</p>
      <h2>Logáil isteach le Apple nó le Google</h2>
      <ul>
        <li><strong>Logáil isteach le Apple:</strong> próiseálaimid an t-ainm agus an ríomhphost. Má cheiltíonn tú an ríomhphost, coimeádaimid an seoladh uathúil seolta a chruthaíonn Apple, ionas gur féidir linn teachtaireachtaí cuntais a sheoladh.</li>
        <li><strong>Logáil isteach le Google:</strong> faighimid agus coimeádaimid ríomhphost agus ainm an chuntais Google, chun an phróifíl a chruthú.</li>
      </ul>
      <p>Clúdaíonn fógraí Apple agus Google féin a bpróiseáil féin.</p>
      <h2>Teachtaireachtaí brú agus comhartha gléis</h2>
      <p>Má chasann tú teachtaireachtaí brú air, coimeádaimid comhartha uathúil gléis (APNs nó FCM) ar bhonn do thoilithe, ionas go sroichfidh an teachtaireacht an gléas ceart. Tá an comhartha ceangailte le do chuntas.</p>
      <p>Éagann an comhartha nuair a logálann tú amach, nó nuair a mharcálann an t-ardán é mar neamhbhailí. Ní choimeádaimid tréithe gléis gan síntiús brú gníomhach. Tá an múchadh i socruithe na haipe nó ar an ngléas.</p>
      <h2>Tréimhse choinneála</h2>
      <p>Coimeádaimid na sonraí fad is atá an cuntas gníomhach. Má scriosann tú an cuntas, scriostar na sonraí go léir láithreach agus go buan.</p>
      <h2>Cuntas a scriosadh</h2>
      <p>Scriosann tú an cuntas san aip, sna socruithe. Deimhníonn tú le pasfhocal nó le logáil isteach tríú páirtí.</p>
      <p>Ní féidir é sin a chur ar ceal. Imeoidh cuntas an duine fhásta, próifílí an pháiste, na pleananna, na dialanna, na measúnuithe, na duaiseanna agus na cuirí.</p>
      <h2>Stóráil agus slándáil</h2>
      <p>Déanaimid ár ndícheall na príomhshonraí a stóráil san AE nó sa LEE, san áit a mbaineann sé sin. Féadfaidh soláthraithe áirithe próiseáil lasmuigh den LEE freisin. Tá na haistrithe agus na coimircí sa téacs seo agus déanaimid athbhreithniú leanúnach orthu. Tá na naisc criptithe (HTTPS). Ní choimeádtar pasfhocail i bhfoirm inléite. Úsáidimid bcrypt.</p>
      <h2>Fianáin</h2>
      <ul>
        <li><strong>Fianáin riachtanacha</strong> — ar siúl i gcónaí. Seisiún agus cosaint CSRF le haghaidh logála isteach slán.</li>
        <li><strong>Roghanna</strong> — stóráilte go háitiúil, mar shampla téama.</li>
        <li><strong>Staitisticí agus margaíocht</strong> — Google Analytics 4, Meta Pixel agus Google Ads. Múchta de réir réamhshocraithe go dtí go dtoilíonn tú san fhógra fianán.</li>
      </ul>
      <p>Coimeádaimid do rogha ar feadh bliana ar a mhéad. Is féidir leat í a athrú san fhógra nó sna socruithe. Ní théann sonraí gnáis an pháiste chuig ardáin fógraíochta.</p>
      <h2>Do chearta (GDPR)</h2>
      <ul>
        <li>Ceart an cuntas agus na sonraí a scriosadh</li>
        <li>Ceart rochtana</li>
        <li>Ceart sonraí míchruinne a cheartú</li>
        <li>Ceart agóide nó srianaithe</li>
        <li>Ceart gearán a dhéanamh leis an údarás Sualannach, Integritetsskyddsmyndigheten (IMY), má cheapann tú go sáraímid an GDPR</li>
      </ul>
      <h2>Teagmháil</h2>
      <p>An bhfuil ceist agat faoin bpróiseáil seo? Úsáid an <a href="/en/contact">fhoirm teagmhála</a>.</p>
    `,
  },
  terms: {
    title: 'Téarmaí úsáide — My Starday',
    description: 'Téarmaí úsáide My Starday: cuntas, páistí, praghas agus dliteanas.',
    h1: 'Téarmaí úsáide',
    ogTitle: 'Téarmaí úsáide',
    body: `
      <p class="updated">Nuashonraithe go deireanach: Deireadh Fómhair 2026</p>
      <p>Go raibh maith agat as My Starday a úsáid. Ba cheart do na téarmaí seo a bheith soiléir agus macánta. Seolann tú ceisteanna tríd an <a href="/en/contact">bhfoirm teagmhála</a>.</p>
      <h2>1. Maidir leis an tseirbhís</h2>
      <p>Is seirbhís dhigiteach é My Starday do theaghlaigh ar mian leo sceideal lae eagraithe, dul chun cinn páiste a mharcáil le réaltaí, agus ligean don pháiste gníomhaíochtaí a leanúint ina amharc féin. Is do thuismitheoirí agus do chaomhnóirí agus dá bpáistí an tseirbhís. Tá duine fásta amháin ar a laghad le cuntas i dteaghlach. Téann páiste isteach le PIN in amharc an pháiste.</p>
      <h2>2. Cuntas agus slándáil</h2>
      <ul>
        <li>Roghnaigh pasfhocal láidir agus ná roinn é</li>
        <li>Cosain do ríomhphost. Sin mar a fhaigheann tú rochtain ar ais</li>
        <li>Ní bhaineann PIN amharc an pháiste ach leis an bpáiste agus leis na caomhnóirí</li>
        <li>Ná húsáid an aip ar bhealach a théann in aghaidh dhlí na Sualainne</li>
      </ul>
      <p>Tá tú freagrach as gach rud a tharlaíonn faoi do chuntas, fiú má úsáideann duine eile é. Má tá amhras ort faoi mhí-úsáid, abair é láithreach.</p>
      <h2>3. Páistí agus sonraí pearsanta</h2>
      <p>Próiseálann My Starday sonraí faoi pháistí. Leanaimid an GDPR agus prionsabal an íoslaghdaithe sonraí:</p>
      <ul>
        <li>Aithnítear páiste le céadainm agus le emoji roghnaithe. Gan sloinne, gan uimhir aitheantais, gan sonraí teagmhála</li>
        <li>Cuireann tuismitheoirí nó caomhnóirí na sonraí isteach agus toilíonn siad leis an roinnt</li>
        <li>Ní úsáidtear sonraí páistí le haghaidh fógraíochta, ná le haghaidh aon ní eile seachas an tseirbhís</li>
        <li>Ní roinntear tuairisc ná plean ach nuair a roinneann duine fásta féin nasc teoranta ó thaobh ama de</li>
      </ul>
      <h2>4. An t-ábhar a chruthaíonn tú</h2>
      <p>Is leatsa nó le do theaghlach na pleananna, na duaiseanna, na gníomhaíochtaí agus na breathnóireachtaí a chuireann tú leis. Tugann tú ceart dúinn an t-ábhar sin a stóráil agus a thaispeáint fad is atá an cuntas gníomhach. Ní chóipeálaimid isteach i bhfógraíocht é, ní dhíolaimid é, agus ní úsáidimid é sa mhargaíocht.</p>
      <h2>5. Úsáid</h2>
      <p>Is le haghaidh úsáid phearsanta do theaghlaigh an tseirbhís. Ní cheadaítear:</p>
      <ul>
        <li>Úsáid thráchtála gan comhaontú le Papa Bravo AB</li>
        <li>Pleananna, réaltaí nó duaiseanna a athrú lasmuigh de ghnáthshreabhadh na haipe</li>
        <li>Uirlis uathoibrithe, scraper nó bot in aghaidh na seirbhíse</li>
        <li>Ábhar neamhdhleathach, maslach nó dochrach a fhoilsiú</li>
      </ul>
      <h2>6. Foircinn agus scriosadh</h2>
      <p>Is féidir leat an cuntas a scriosadh go buan am ar bith i socruithe na haipe, le deimhniú pasfhocail.</p>
      <p>Baineann an scriosadh láithreach agus go buan cuntas an duine fhásta, na páistí go léir, na pleananna, dialanna na ngníomhaíochtaí, na réaltaí, na duaiseanna agus aon bhreathnóireachtaí.</p>
      <p>Féadfaimid cuntas a chuireann na téarmaí seo nó dlí na Sualainne ó mhaith a chur ar fionraí.</p>
      <h2>7. Praghas</h2>
      <p>Is féidir le teaghlaigh in Éirinn agus i gCeanada My Starday a úsáid saor in aisce go dtí an 31 Nollaig 2026 san áireamh. Ní gá íocaíocht a dhéanamh sa tréimhse sin. Ní bhíonn an tréimhse shaor in aisce ina síntiús go huathoibríoch. Ón 1 Eanáir 2027 is féidir leat síntiús a roghnú san App Store nó ar Google Play. Níl seic amach gréasáin ar an leathanach seo. I dtíortha eile baineann an praghas agus an rochtain a thaispeánann an aip don tír sin. Is féidir le teaghlaigh na Sualainne a thosaíonn ón 3 Deireadh Fómhair 2026 an aip a thriail ar feadh 14 lá agus ansin 59 coróin na Sualainne in aghaidh na míosa nó 590 coróin na Sualainne in aghaidh na bliana a roghnú san aip. Coinníonn teaghlaigh a bhfuil cuntas acu cheana a dtairiscint reatha.</p>
      <h2>8. Athruithe</h2>
      <p>Féadfaimid na téarmaí seo a athrú, mar shampla tar éis athraithe dlí, feidhm nua, nó soiléiriú. Má tá an t-athrú ábhartha, deirimid é le ríomhphost nó le fógra san aip.</p>
      <p>Má leanann tú den tseirbhís a úsáid ina dhiaidh sin, is glacadh leis na téarmaí nua é sin.</p>
      <h2>9. Dliteanas</h2>
      <p>Tugtar My Starday mar atá. Déanaimid ár ndícheall an tseirbhís a choinneáil cobhsaí agus slán, ach ní féidir linn a ráthú go mbeidh sí ar fáil i gcónaí gan bhriseadh.</p>
      <p>Níl Papa Bravo AB faoi dhliteanas i leith:</p>
      <ul>
        <li>Caillteanas sonraí de bharr force majeure</li>
        <li>Damáiste toisc go roinneann tú PIN nó sonraí logála isteach le duine nár cheart dóibh iad a fháil</li>
        <li>Damáiste indíreach, deis caillte, nó sonraí caillte, mura n-éilíonn dlí na Sualainne a mhalairt</li>
      </ul>
      <p>Tá tú freagrach as an úsáid de réir na dtéarmaí seo agus de réir dhlí na Sualainne.</p>
      <h2>10. Teagmháil</h2>
      <p>An bhfuil ceist agat faoi na téarmaí seo nó faoin tseirbhís? Úsáid an <a href="/en/contact">fhoirm teagmhála</a>.</p>
    `,
  },
});

module.exports = { pageFor };
