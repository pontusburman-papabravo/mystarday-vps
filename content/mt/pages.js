'use strict';

/**
 * Maltese public pages. Written in Maltese.
 * Legal text translates the verified baseline. It adds no Maltese statute.
 */

const { composeLocale, faq } = require('../compose-pages');

const pageFor = composeLocale('mt', {
  marker: /tfal/i,
  market: {
    title: (name) => `My Starday — ${name}. Skeda viżwali għat-tfal`,
    description: (name) => `Paġna tas-suq għal ${name}. Skeda viżwali bil-Malti. Din hija paġna tas-suq, mhux sit tal-lingwa separat.`,
    h1: (name) => `Skeda viżwali għall-familji. Suq: ${name}`,
    lead: (name) => `Din hija l-paġna għal ${name}. Is-sit bil-Malti jibqa sit tal-lingwa.`,
    registrationOpen: (name) => `Kontijiet ġodda għal ${name} isegwu r-reġistrazzjoni li diġà teżisti. Il-pożizzjoni awtomatika hija miftuħa.`,
    registrationClosed: (name) => `Kontijiet ġodda għal ${name} mhumiex miftuħa awtomatikament. Dan isegwi r-reġistrazzjoni li diġà teżisti, mhux din il-paġna. Il-pożizzjoni awtomatika hija magħluqa.`,
    complimentary: (name) => `Għal ${name} jgħodd il-perjodu bla ħlas li diġà jeżisti. Ma jsirx abbonament waħdu. Din il-paġna ma tiffissax prezz.`,
    introYear: (name) => `${name} iżomm l-offerta li diġà tinsab fuq is-sit Żvediż. Din il-paġna ma tiffissax prezz. F'dan is-suq m'hemmx perjodu bla ħlas sal-31 ta' Diċembru 2026.`,
    trial: (name, days) => `Jekk kont isir possibbli hawn aktar tard, tgħodd ir-regola li diġà teżisti barra l-Iżvezja, l-Irlanda u l-Kanada: prova ta' ${days} jum. Il-ħlas irid ikun disponibbli l-ewwel. F'dan is-suq m'hemmx perjodu bla ħlas sal-31 ta' Diċembru 2026, u xejn ma jsir abbonament waħdu. Din il-paġna ma tiffissax prezz.`,
    notTreatment: (name) => `Il-buttuna tiftaħ il-paġna tas-soltu fl-App Store, mhux paġna ta' prodott ivvintata għal ${name}. My Starday hija skeda viżwali. Mhix kura u ma twegħidx riżultat mediku.`,
    register: 'Oħloq kont',
    registerNote: 'Il-formola tistaqsi fejn tgħix il-familja. Din il-ħolqa waħedha ma tiffissax pajjiż u ma tiffissax prezz.',
    how: 'Kif jaħdem',
    playSoon: 'Google Play hawn mhux miftuħ bħala paġna għaliha.',
  },
  home: {
    title: 'Skeda viżwali għat-tfal – rutini, premjijiet u pittogrammi | My Starday',
    description: 'Skedi viżwali u rutini li juru lit-tfal x’qed jiġri issa u x’jiġi wara. Pittogrammi, dehra tat-tfal, u stilel għall-passi lesti.',
    h1: 'Skeda viżwali u rutini li juru lit-tfal x’qed jiġri issa u x’jiġi wara.',
    ogTitle: 'Skeda viżwali għat-tfal',
    faqs: [
      faq('X’inhu My Starday?', 'Skeda viżwali għall-familji. It-tfal jaraw il-pass li jmiss. L-adult iżomm is-settings.'),
      faq('L-istilel jistgħu jinxtraw?', 'Le. Stilla tingħata għal pass lest. Ma tistax tinxtara.'),
      faq('Din kura?', 'Le. My Starday huwa għajnuna fil-ġurnata u ma jwegħidx riżultat mediku.'),
    ],
    lead: 'It-tfal jikkalmaw meta l-pass li jmiss jidher. My Starday juri l-ġurnata fi stampi: issa, imbagħad, lest.',
    hSee: 'X’jaraw it-tfal',
    see: 'Id-dehra tat-tfal turi pass wieħed kull darba. L-adult jagħmel il-pjan. It-tfal jimmarkaw. Aktar minn wild wieħed jistgħu jaqsmu dar waħda, kull wieħed bil-pjan tiegħu.',
    hStars: 'Stilel',
    stars: 'Pass lest jista jagħti stilla. L-istilel ma jistgħux jinxtraw. Ma jieħdux post il-ftehim li għamiltu minn qabel. Aktar hawn:',
    starsLink: 'sistema ta premjijiet',
    hTreat: 'Mhix kura',
    treat: 'Il-pjan jista jgħin tfal li jeħtieġu aktar ċarezza, ukoll bl-ADHD jew bl-awtiżmu, u l-istess familji mingħajr dijanjożi. My Starday mhix kura u ma twegħidx riżultat partikolari.',
    marketsIntro: 'Is-sit bil-Malti jispjega l-prodott. Il-pajjiż huwa ħaġa oħra. Hemm paġna għaliha għal:',
    linkHow: 'Kif jaħdem',
    linkVisual: 'Skeda viżwali',
    linkMorning: 'Rutina ta filgħodu',
  },
  howItWorks: {
    title: 'Kif jaħdem My Starday | Skeda viżwali',
    description: 'L-adult jagħmel il-ġurnata. It-tfal jaraw il-pass li jmiss u jimmarkawh. L-istilel huma għal passi lesti, mhux għal xiri.',
    h1: 'Kif jaħdem My Starday',
    ogTitle: 'Kif jaħdem',
    faqs: [
      faq('Min isettja l-pjan?', 'Adult. It-tfal jaraw id-dehra tagħhom u jimmarkaw il-passi.'),
      faq('It-tfal għandhom bżonn email?', 'Le. Wild jidħol b’isem u PIN.'),
    ],
    lead: 'Il-filgħodu jżommuh tliet affarijiet: pjan li jidher, tfal li jimmarkaw waħedhom, u adult li jżomm is-settings.',
    hPlan: '1. Il-pjan',
    plan: 'Poġġu l-attivitajiet fl-ordni li l-filgħodu tassew għandu. L-istampi jgħinu meta t-tfal għadhom ma jaqrawx.',
    planLink: 'L-iskeda viżwali turi issa u wara',
    hChild: '2. Id-dehra tat-tfal',
    child: 'It-tfal jaraw il-pass li jmiss, mhux is-settings tal-familja. M’hemmx reklami u m’hemmx netwerk soċjali.',
    hStar: '3. L-istilla',
    star: 'Pass mitmum jista jagħti stilla. L-istilla ma tistax tinxtara. Il-ftehim joqgħod minn qabel, mhux f’nofs l-għaġġla.',
    closing: 'My Starday huwa għajnuna fil-ġurnata. Mhix kura u ma tieħux post il-parir ta tabib, terapista jew skola.',
  },
  visualSchedule: {
    title: 'Skeda viżwali għat-tfal | My Starday',
    description: 'Skeda viżwali turi lit-tfal x’qed jiġri issa u x’jiġi wara. Ftit passi, stampi magħrufa, ordni ċara.',
    h1: 'Skeda viżwali għat-tfal',
    ogTitle: 'Skeda viżwali',
    faqs: [
      faq('Kemm passi?', 'Spiss erbgħa jew ħamsa jkunu biżżejjed. Lista itwal taħdem meta l-ordni diġà magħrufa.'),
      faq('Ritratti jew sinjali?', 'Stampi li t-tfal diġà jafu. Ir-ritratti tad-dar jaħdmu tajjeb.'),
    ],
    lead: 'L-iskeda viżwali tagħmel l-ordni tidher. It-tfal m’għandhomx għalfejn jaqtgħu x’jiġi wara.',
    hNow: 'Issa u wara',
    now: 'Urew biss il-pass ta issa u li jmiss. Lista twila mal-ħajt tgħin inqas minn moviment ċar wieħed.',
    hStuck: 'Jekk pass jeħel',
    stuck1: 'Aqsam il-pass. “Ilbies” isir kalzetti, qalziet, flokk.',
    stuck2: 'Wieħed wieħed.',
    stuck3: 'Uri, minflok tirrepeti.',
    bridge: 'Il-filgħodu huwa fiċ-ċentru',
    morningLink: 'ir-rutina ta filgħodu',
    weekLink: 'Il-pjan tal-ġimgħa juri liema jum hu',
    closing: 'My Starday mhix kura u ma twegħidx riżultat mediku.',
  },
  morningRoutine: {
    title: 'Rutina ta filgħodu għat-tfal | My Starday',
    description: 'Rutina ta filgħodu bl-istampi tnaqqas it-tfakkiriet mitkellma. L-istess ordni, jum wara jum.',
    h1: 'Rutina ta filgħodu għat-tfal',
    ogTitle: 'Rutina ta filgħodu',
    faqs: [
      faq('X’jidħol fil-filgħodu?', 'Dak biss li tassew jiġri qabel il-bieb. Tqum, tilbes, tiekol, snien, ġakketta.'),
      faq('Jekk il-ħin huwa ftit?', 'Qassar il-lista, minflok titkellem aktar malajr. Pjan iqsar huwa pjan veru.'),
    ],
    lead: 'L-istess ordni tagħmel il-lista drawwa. Minflok tgħid darb’oħra “aħsel snienek”, tħarsu lejn l-istampa li jmiss.',
    hExample: 'Eżempju',
    steps: ['Tqum', 'Tojlit u ħasil tal-idejn', 'Ilbies', 'Kolazzjon', 'Ħasil tas-snien', 'Ġakketta, żraben, borża'],
    age: 'Tfal tal-kindergarten spiss imorru aħjar b’erba jew ħames passi.',
    bridge: 'Familji li jfittxu aktar sapport fil-bidliet jistgħu jaqraw',
    bridgeLink: 'il-gwida dwar iċ-ċarezza',
    closing: 'My Starday huwa sapport fil-ġurnata, mhux kura.',
  },
  weeklySchedule: {
    title: 'Pjan tal-ġimgħa b’pittogrammi għat-tfal | My Starday',
    description: 'Pjan tal-ġimgħa b’pittogrammi juri liema jum hu, mhux biss dak li qed jiġri issa.',
    h1: 'Pjan tal-ġimgħa b’pittogrammi',
    ogTitle: 'Pjan tal-ġimgħa b’pittogrammi',
    faqs: [
      faq('X’inhi d-differenza mill-iskeda tal-ġurnata?', 'L-iskeda tal-ġurnata hija l-passi tal-lum. Il-pjan tal-ġimgħa juri kif il-jiem ivarjaw.'),
      faq('Minn liema età?', 'Spiss madwar il-bidu tal-iskola, meta l-ġimgħa tinbidel aktar. Tfal iżgħar l-ewwel jeħtieġu l-ġurnata tal-lum.'),
    ],
    lead: 'Il-pjan tal-ġimgħa jgħin meta l-ġimgħa tax-xogħol u t-tmiem tal-ġimgħa huma differenti, jew meta qabel l-irqad hemm bżonn tweġiba għal “x’jiġri għada?”.',
    mid: 'It-Tnejn sport, l-Erbgħa għand il-ġenitur l-ieħor, il-Ġimgħa film. L-istampi jagħmlu dan jidher qabel ma t-tfal jaqraw kalendarju.',
    dayLink: 'L-iskeda tal-ġurnata',
    dayRest: 'hija l-passi tal-lum. Il-pjan tal-ġimgħa jgħid liema jum hu.',
    closing: 'My Starday ma jwegħidx riżultat mediku.',
  },
  neurodiverseRoutines: {
    title: 'Rutini għal tfal newrodiversi | My Starday',
    description: 'Aktar ċarezza fil-ġurnata għal tfal li jeħtieġu bidliet ċari. My Starday huwa għajnuna fil-ġurnata, mhux kura u mhux dijanjożi.',
    h1: 'Rutini għal tfal newrodiversi',
    ogTitle: 'Rutini għal tfal newrodiversi',
    faqs: [
      faq('Dan għad-dijanjożi biss?', 'Le. Il-pjan jgħin fejn hemm bżonn aktar ċarezza. Id-dijanjożi mhix kundizzjoni.'),
      faq('Jieħu post it-terapija?', 'Le. Mhix kura u ma tieħux post il-parir ta speċjalista.'),
    ],
    lead: 'Xi tfal għandhom bżonn jaraw il-pass li jmiss, mhux jisimgħuh aktar qawwi. Dan huwa minn b’dijanjożi u mingħajrha.',
    hAdhd: 'ADHD: tibda u tibqa mal-pass',
    adhd: 'Il-bidla spiss tieqaf għax il-pass li jmiss ma jidhirx. Pjan b’marka juri minnufih: dan il-pass lest.',
    hAutism: 'Awtiżmu: prevedibbiltà',
    autism: 'Ordni oħra tista tkun kbira.',
    weekLink: 'Il-pjan tal-ġimgħa',
    autismRest: 'juri minn qabel liema jum ġej. Pass imneħħi għandu jinbidel b’mod li jidher, mhux jisparixxi fis-skiet.',
    closing: 'My Starday huwa għajnuna fil-ġurnata. Mhix kura medika u ma tieħux post il-parir ta tabib, fiżjoterapista, logopedista jew skola. Karti bit-tifsira l-ewwel, imbagħad u lest għadhom mhumiex PDF bil-Malti. Karti bħal dawn jagħtu idea, mhux metodu uffiċjali u mhux ċertifikat.',
  },
  rewardSystem: {
    title: 'Sistema ta premjijiet għat-tfal | My Starday',
    description: 'Premju miftiehem minn qabel huwa ħaġa oħra mill-ftehim tal-mument. It-tfal jaqilgħu l-istilel. Ma jistgħux jinxtraw.',
    h1: 'Sistema ta premjijiet għat-tfal, mingħajr ma ssir negozju',
    ogTitle: 'Sistema ta premjijiet għat-tfal',
    faqs: [
      faq('Karta tal-istilel hija tixħim?', 'Le, meta l-premju joqgħod minn qabel u jorbot ma xi ħaġa li t-tfal jistgħu jagħmlu. Negozju jingħata fil-mument biex xi ħaġa tieqaf.'),
      faq('Kemm stilel?', 'Ibdew b’stilla waħda għal kull pass lest. L-istilel ma jistgħux jinxtraw.'),
    ],
    lead: '“Dan mhux sempliċi tixħim?” jiddependi meta ftehimtu. Ftehim magħmul minn qabel jista jżomm drawwa. F’nofs ir-rabja jsir negozju.',
    planLink: 'Fl-iskeda viżwali',
    chain: 'il-katina hija sempliċi: tara l-pass, tagħmlu, timmarkah, tieħu stilla.',
    steps: [
      'Kunu konkreti. Ippremjaw “jaħsel snienu mingħajr tfakkira”, mhux “tajjeb”.',
      'Urew il-progress.',
      'Għoddu t-tentattiv, mhux biss filgħodu perfett.',
      'Ħallu lit-tfal jaħsbu flimkien dwar il-premju.',
      'Naqqsu l-istilel meta d-drawwa tkun hemm.',
    ],
    closing: 'L-istilel ma jistgħux jinxtraw. My Starday ma jwegħidx riżultat mediku.',
  },
  resources: {
    title: 'Materjal għar-rutini viżwali | My Starday',
    description: 'X’diġà hemm bil-Malti u x’għadu m’hemmx bħala PDF. L-app u l-folja stampata huma żewġ affarijiet differenti.',
    h1: 'Materjal',
    ogTitle: 'Materjal',
    faqs: [faq('Hemm PDF bil-Malti?', 'Għadhom m’hemmx. Din il-paġna ma tbigħx folji Żvediżi bħallikieku traduzzjoni bil-Malti.')],
    lead: 'L-app turi l-ġurnata fuq l-iskrin. Folja stampata hija oħra. PDF bil-Malti għat-tfal għadu m’hemmx hawn.',
    app: 'Fl-app tagħmlu',
    dayLink: 'l-iskeda tal-ġurnata',
    morningLink: 'ir-rutina ta filgħodu',
    weekLink: 'il-pjan tal-ġimgħa',
    appRest: 'It-tfal jaraw l-istess ordni fid-dehra tagħhom.',
    nolink: 'Ma norbtux ġabra b’lingwa oħra bħallikieku bil-Malti. Meta jaslu l-folji bil-Malti, ikunu fuq din il-paġna.',
  },
  faq: {
    title: 'Mistoqsijiet komuni | My Starday',
    description: 'Tweġibiet qosra dwar l-iskeda, l-istilel, id-dehra tat-tfal, il-prezz, u dwar x’mhux My Starday.',
    h1: 'Mistoqsijiet komuni',
    ogTitle: 'Mistoqsijiet komuni',
    faqs: [
      faq('Għal min hu s-sit?', 'Is-sit bil-Malti jispjega l-prodott. Malta għandha l-paġna tas-suq tagħha. Il-lingwa tibqa l-Malti.'),
      faq('Nista nixtri stilel?', 'Le.'),
      faq('Din app ta terapija?', 'Le. M’hemmx kura u m’hemmx riżultat mediku mwiegħed.'),
      faq('Fejn noħloq kont?', 'Fil-formola li diġà teżisti. Tistaqsi fejn tgħix il-familja. Il-paġna tas-suq waħedha ma tiffissax il-pajjiż.'),
    ],
    lead: 'It-tweġibiet qosra. It-testi itwal qegħdin fil-gwidi.',
    hLang: 'Lingwa u pajjiż',
    lang: 'Dan is-sit huwa bil-Malti. Il-pajjiż jintgħażel għalih. Il-paġna tas-suq ma tbiddilx il-lingwa u ma toħloqx kont.',
    hChild: 'It-tfal',
    child: 'It-tfal jaraw il-pjan u jimmarkaw. Is-settings, l-istediniet u l-kont jibqgħu għand l-adult. Aktar hawn:',
    howLink: 'Kif jaħdem',
    hStars: 'Stilel',
    stars: 'L-istilel huma għal passi lesti. Ma jistgħux jinxtraw. Aqra',
    starsLink: 'is-sistema ta premjijiet',
  },
  privacy: {
    title: 'Avviż ta privatezza — My Starday',
    description: 'Liema data jipproċessa My Starday, x’ma niġbrux, u liema drittijiet jagħti l-GDPR.',
    h1: 'Avviż ta privatezza ta My Starday',
    ogTitle: 'Avviż ta privatezza',
    body: `
      <p class="updated">Aġġornat l-aħħar: Ottubru 2026</p>
      <p>Il-privatezza nittrattawha b’attenzjoni. My Starday jiġbor l-inqas possibbli: biss dak li l-app teħtieġ biex taħdem. Ma nbiegħux id-data tiegħek u ma nużawhiex għal reklamar immirat. Trasferiment barra mis-servizz isir biss meta tagħżlu int, jew meta jkun meħtieġ biex il-proċessuri jżommu s-servizz.</p>
      <p><strong>Kontrollur:</strong> Papa Bravo AB hija responsabbli għall-ipproċessar tad-data personali tiegħek. Tikteb lilna permezz tal-<a href="/en/contact">formola ta kuntatt</a>.</p>
      <h2>X’niġbru</h2>
      <p>Nipproċessaw data fuq il-bażi tal-kuntratt, biex nagħtu l-app u l-funzjonijiet li tirreġistra għalihom. Dwar adulti u familji niġbru:</p>
      <ul>
        <li><strong>Email</strong> — għad-dħul u messaġġi tal-kont</li>
        <li><strong>Isem u kunjom</strong> — biex nagħrfu l-kont</li>
        <li><strong>Ġurnal tal-attivitajiet</strong> — liema attivitajiet saru lesti u meta</li>
        <li><strong>Stilel</strong> — stilel maqlugħa u użati</li>
        <li><strong>Pjanijiet u attivitajiet</strong> — dak li toħloq int</li>
      </ul>
      <p><strong>Privatezza tat-tfal:</strong> wild jintgħaraf biss b’isem jew laqam u emoji magħżul. Ma niġbrux kunjom, numru ta identifikazzjoni, jew dettalji ta kuntatt tat-tfal.</p>
      <h2>X’ma niġbrux</h2>
      <ul>
        <li>Kunjomijiet tat-tfal</li>
        <li>Numru ta identifikazzjoni, la ta adult u lanqas ta wild</li>
        <li>Informazzjoni dwar is-saħħa, id-dijanjożi jew id-diżabilità ta wild</li>
        <li>Data tal-ħlas. Ix-xiri jgħaddi mill-App Store jew minn Google Play</li>
        <li>Data tal-post</li>
      </ul>
      <h2>Għal xiex nużaw id-data</h2>
      <ul>
        <li>Nuru l-iskeda lit-tfal</li>
        <li>Nissejvjaw il-progress u l-istilel</li>
        <li>Nibgħatu email ta konferma u messaġġi tal-kont</li>
        <li>Inwieġbu messaġġi li tibgħat lilna</li>
      </ul>
      <h2>Trasferiment</h2>
      <p>Ma nittrasferixxux id-data tiegħek għar-reklamar. Dawn il-proċessuri jżommu s-servizz. Jipproċessaw biss fuq l-istruzzjoni tagħna u skont il-GDPR:</p>
      <ul>
        <li><strong>Neon (database)</strong> — kont, pjanijiet, attivitajiet u data tal-familja</li>
        <li><strong>Hosting tagħna (VPS fl-UE jew fiż-ŻEE)</strong> — l-app tal-web u l-API</li>
        <li><strong>Resend (email)</strong> — posta transazzjonali, bħal konferma, password u ittra ta merħba</li>
        <li><strong>Cloudflare R2</strong> — ritratti tal-profil imtella, jekk tuża l-funzjoni</li>
        <li><strong>Apple u Google</strong> — dħul u messaġġi push permezz ta APNs u FCM, jekk tuża l-funzjonijiet</li>
      </ul>
      <h2>Rapport għal konversazzjoni</h2>
      <p>Jekk bħala persuna li tieħu ħsieb tagħmel ħolqa limitata fiż-żmien b’numri magħżula ta attivitajiet u premjijiet, tista taqsamha pereżempju ma għalliem jew terapista. Dan isir biss għax tagħżlu int. Int tiddetermina l-kontenut u tista tirtira l-ħolqa. Min jirċievi m’għandux bżonn kont.</p>
      <p>Jekk tipproteġi l-ħolqa b’kodiċi, taqsamx il-kodiċi fl-istess messaġġ tal-ħolqa.</p>
      <h2>Dħul b’Apple jew Google</h2>
      <ul>
        <li><strong>Dħul b’Apple:</strong> nipproċessaw l-isem u l-email. Jekk taħbi l-email, inżommu l-indirizz uniku ta trażmissjoni li toħloq Apple, biex nistgħu nibgħatu messaġġi tal-kont.</li>
        <li><strong>Dħul b’Google:</strong> nirċievu u nżommu l-email u l-isem tal-kont Google, biex noħolqu l-profil.</li>
      </ul>
      <p>L-ipproċessar ta Apple u Google stess huwa kopert mill-avviżi tagħhom.</p>
      <h2>Messaġġi push u token tal-apparat</h2>
      <p>Jekk tixgħel il-messaġġi push, fuq il-bażi tal-kunsens tiegħek inżommu token uniku tal-apparat (APNs jew FCM), biex il-messaġġ jasal fl-apparat it-tajjeb. It-token huwa marbut mal-kont tiegħek.</p>
      <p>It-token jiskadi meta toħroġ, jew meta l-pjattaforma timmarkah bħala invalidu. Ma nżommux karatteristiċi tal-apparat mingħajr abbonament push attiv. It-tifi jinsab fis-settings tal-app jew fl-apparat.</p>
      <h2>Żmien ta żamma</h2>
      <p>Inżommu d-data sakemm il-kont ikun attiv. Jekk tħassar il-kont, id-data kollha titħassar minnufih u b’mod permanenti.</p>
      <h2>Tħassir tal-kont</h2>
      <p>Il-kont tħassru fl-app, fis-settings. Tikkonferma b’password jew b’dħul ta parti terza.</p>
      <p>Dan ma jistax jitneħħa lura. Jisparixxu l-kont tal-adult, il-profili tat-tfal, il-pjanijiet, il-ġurnali, il-valutazzjonijiet, il-premjijiet u l-istediniet.</p>
      <h2>Ħażna u sigurtà</h2>
      <p>Nippruvaw inżommu d-data ewlenija fl-UE jew fiż-ŻEE, fejn dan jgħodd. Xi fornituri jistgħu jipproċessaw ukoll barra miż-ŻEE. It-trasferimenti u l-garanziji jinsabu f’dan it-test u nirreveduhom kontinwament. Il-konnessjonijiet huma kriptati (HTTPS). Il-passwords ma jinżammux f’forma li tinqara. Nużaw bcrypt.</p>
      <h2>Cookies</h2>
      <ul>
        <li><strong>Cookies meħtieġa</strong> — dejjem mixgħula. Sessjoni u protezzjoni CSRF għal dħul sigur.</li>
        <li><strong>Preferenzi</strong> — jinżammu lokalment, pereżempju tema.</li>
        <li><strong>Statistika u marketing</strong> — Google Analytics 4, Meta Pixel u Google Ads. Mitfija awtomatikament sakemm tagħti l-kunsens fl-avviż tal-cookies.</li>
      </ul>
      <p>L-għażla tiegħek inżommuha mhux aktar minn sena. Tista tbiddilha fl-avviż jew fis-settings. Id-data tar-rutina tat-tfal ma tmurx lejn pjattaformi tar-reklamar.</p>
      <h2>Id-drittijiet tiegħek (GDPR)</h2>
      <ul>
        <li>Dritt li tħassar il-kont u d-data</li>
        <li>Dritt ta aċċess</li>
        <li>Dritt li tikkoreġi data mhux eżatta</li>
        <li>Dritt ta oġġezzjoni jew restrizzjoni</li>
        <li>Dritt li tressaq ilment lis-superviżur Żvediż, Integritetsskyddsmyndigheten (IMY), jekk taħseb li niksru l-GDPR</li>
      </ul>
      <h2>Kuntatt</h2>
      <p>Għandek mistoqsija dwar dan l-ipproċessar? Uża l-<a href="/en/contact">formola ta kuntatt</a>.</p>
    `,
  },
  terms: {
    title: 'Termini ta użu — My Starday',
    description: 'Termini ta użu ta My Starday: kont, tfal, prezz u responsabbiltà.',
    h1: 'Termini ta użu',
    ogTitle: 'Termini ta użu',
    body: `
      <p class="updated">Aġġornat l-aħħar: Ottubru 2026</p>
      <p>Grazzi li tuża My Starday. Dawn it-termini għandhom ikunu ċari u onesti. Il-mistoqsijiet tibgħathom permezz tal-<a href="/en/contact">formola ta kuntatt</a>.</p>
      <h2>1. Dwar is-servizz</h2>
      <p>My Starday huwa servizz diġitali għal familji li jridu skeda tal-ġurnata rranġata, li jimmarkaw il-progress tat-tfal b’istilel, u li jħallu lit-tfal isegwu l-attivitajiet f’dehra tagħhom. Is-servizz huwa għall-ġenituri u l-kustodji u għat-tfal tagħhom. Familja għandha mill-inqas adult wieħed b’kont. Wild jidħol b’PIN fid-dehra tat-tfal.</p>
      <h2>2. Kont u sigurtà</h2>
      <ul>
        <li>Agħżel password b’saħħitha u taqsamhiex</li>
        <li>Ipproteġi l-email tiegħek. Bih terġa tieħu l-aċċess</li>
        <li>Il-PIN tad-dehra tat-tfal huwa biss għat-tfal u għall-kustodji</li>
        <li>Tużax l-app b’mod li jmur kontra l-liġi Żvediża</li>
      </ul>
      <p>Inti responsabbli għal dak kollu li jiġri taħt il-kont tiegħek, anki jekk jużah ħaddieħor. Jekk tissuspetta abbuż, għid mill-ewwel.</p>
      <h2>3. Tfal u data personali</h2>
      <p>My Starday jipproċessa data dwar it-tfal. Nisegwu l-GDPR u l-prinċipju tat-tnaqqis tad-data:</p>
      <ul>
        <li>Wild jintgħaraf b’isem u emoji magħżul. Mingħajr kunjom, mingħajr numru ta identifikazzjoni, mingħajr dettalji ta kuntatt</li>
        <li>Il-ġenituri jew il-kustodji jdaħħlu d-data u jagħtu l-kunsens għall-qsim</li>
        <li>Id-data tat-tfal ma tintużax għar-reklamar, u għal xejn ieħor ħlief is-servizz</li>
        <li>Rapport u pjan jinqasmu biss meta adult stess jaqsam ħolqa limitata fiż-żmien</li>
      </ul>
      <h2>4. Il-kontenut li toħloq</h2>
      <p>Il-pjanijiet, il-premjijiet, l-attivitajiet u l-osservazzjonijiet li żżid huma tiegħek jew tal-familja. Tagħtina dritt li nżommu u nuru dan il-kontenut sakemm il-kont ikun attiv. Ma nikkupjawhx fir-reklamar, ma nbiegħuhx, u ma nużawhx fil-marketing.</p>
      <h2>5. Użu</h2>
      <p>Is-servizz huwa għall-użu personali tal-familja. Mhux permess:</p>
      <ul>
        <li>Użu kummerċjali mingħajr ftehim ma Papa Bravo AB</li>
        <li>Tibdil ta pjanijiet, stilel jew premjijiet barra mill-mixja tas-soltu tal-app</li>
        <li>Għodda awtomatika, scraper jew bot kontra s-servizz</li>
        <li>Pubblikazzjoni ta kontenut illegali, offensiv jew ta’ ħsara</li>
      </ul>
      <h2>6. Tmiem u tħassir</h2>
      <p>Il-kont tista tħassru b’mod permanenti fi kwalunkwe ħin fis-settings tal-app, b’konferma tal-password.</p>
      <p>It-tħassir ineħħi minnufih u b’mod permanenti l-kont tal-adult, it-tfal kollha, il-pjanijiet, il-ġurnali tal-attivitajiet, l-istilel, il-premjijiet u l-osservazzjonijiet eventwali.</p>
      <p>Nistgħu nissospendu kont li jikser dawn it-termini jew il-liġi Żvediża.</p>
      <h2>7. Prezz</h2>
      <p>Il-familji fl-Irlanda u fil-Kanada jistgħu jużaw My Starday bla ħlas sal-31 ta' Diċembru 2026 inkluż. F'dan il-perjodu m'hemmx ħlas. Il-perjodu bla ħlas ma jsirx abbonament awtomatikament. Mill-1 ta' Jannar 2027 tista tagħżel abbonament fl-App Store jew fuq Google Play. Fuq din il-paġna m'hemmx kaxxa tal-web. F'pajjiżi oħra jgħoddu l-prezz u l-aċċess li l-app turi għal dak il-pajjiż. Il-familji Żvediżi li jibdew mit-3 ta' Ottubru 2026 jistgħu jipprovaw l-app għal 14-il jum u mbagħad jagħżlu fl-app 59 krona Żvediża fix-xahar jew 590 krona Żvediża fis-sena. Il-familji li diġà għandhom kont iżommu l-offerta eżistenti tagħhom.</p>
      <h2>8. Bidliet</h2>
      <p>Nistgħu nbiddlu dawn it-termini, pereżempju wara bidla fil-liġi, funzjoni ġdida jew kjarifika. Jekk il-bidla hija sostanzjali, ngħiduha b’email jew b’avviż fl-app.</p>
      <p>Jekk wara tibqa tuża s-servizz, dan huwa aċċettazzjoni tat-termini l-ġodda.</p>
      <h2>9. Responsabbiltà</h2>
      <p>My Starday jingħata kif inhu. Nagħmlu dak li nistgħu biex is-servizz ikun stabbli u sigur, imma ma nistgħux niggarantixxu li dejjem ikun disponibbli mingħajr interruzzjoni.</p>
      <p>Papa Bravo AB mhix responsabbli għal:</p>
      <ul>
        <li>Telf ta data minħabba forza maġġuri</li>
        <li>Ħsara għax taqsam PIN jew dettalji tad-dħul ma xi ħadd li m’għandux jirċevihom</li>
        <li>Ħsara indiretta, opportunità mitlufa jew data mitlufa, sakemm il-liġi Żvediża ma titlobx mod ieħor</li>
      </ul>
      <p>Inti responsabbli għall-użu skont dawn it-termini u l-liġi Żvediża.</p>
      <h2>10. Kuntatt</h2>
      <p>Għandek mistoqsija dwar dawn it-termini jew dwar is-servizz? Uża l-<a href="/en/contact">formola ta kuntatt</a>.</p>
    `,
  },
});

module.exports = { pageFor };
