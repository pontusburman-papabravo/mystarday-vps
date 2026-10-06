'use strict';

/**
 * Latvian public pages. Written in Latvian.
 * Legal text translates the verified baseline. It adds no Latvian statute.
 */

const { composeLocale, faq } = require('../compose-pages');

const pageFor = composeLocale('lv', {
  marker: /bērn/i,
  market: {
    title: (name) => `My Starday — ${name}. Vizuāla dienas karte bērniem`,
    description: (name) => `Tirgus lapa: ${name}. Vizuāla dienas karte latviski. Tā ir tirgus lapa, nevis atsevišķa valodas vietne.`,
    h1: (name) => `Vizuāla dienas karte ģimenēm. Tirgus: ${name}`,
    lead: (name) => `Šī ir lapa: ${name}. Vietne latviešu valodā paliek valodas vietne.`,
    registrationOpen: (name) => `Jaunie konti šeit: ${name}, seko esošajai reģistrācijai. Noklusējums ir atvērts.`,
    registrationClosed: (name) => `Jaunie konti šeit: ${name}, pēc noklusējuma nav atvērti. Tas seko esošajai reģistrācijai, nevis šai lapai. Noklusējums ir slēgts.`,
    complimentary: (name) => `${name} gadījumā ir spēkā esošais bezmaksas periods. Tas pats nekļūst par abonementu. Šī lapa nenosaka cenu.`,
    introYear: (name) => `${name} patur piedāvājumu, kas jau ir zviedru vietnē. Šī lapa nenosaka cenu. Šajā tirgū nav bezmaksas perioda līdz 2026. gada 31. decembrim.`,
    trial: (name, days) => `Ja konts šeit vēlāk būs iespējams, ir spēkā esošais noteikums ārpus Zviedrijas, Īrijas un Kanādas: ${days} dienu izmēģinājums. Maksājumam vispirms jābūt pieejamam. Šajā tirgū nav bezmaksas perioda līdz 2026. gada 31. decembrim, un nekas pats nekļūst par abonementu. Šī lapa nenosaka cenu.`,
    notTreatment: (name) => `Poga atver parasto App Store lapu, nevis izdomātu produkta lapu šim: ${name}. My Starday ir vizuāla dienas karte. Tā nav ārstēšana un nesola medicīnisku iznākumu.`,
    register: 'Izveidot kontu',
    registerNote: 'Veidlapa jautā, kur ģimene dzīvo. Šī saite pati nenosaka valsti un nenosaka cenu.',
    how: 'Kā tas strādā',
    playSoon: 'Google Play šeit netiek atvērts kā atsevišķa lapa.',
  },
  home: {
    title: 'Vizuāla dienas karte bērniem – rutīnas, balvas un piktogrammas | My Starday',
    description: 'Vizuālas dienas kartes un rutīnas, kas bērnam parāda, kas notiek tagad un kas nāk pēc tam. Piktogrammas, bērna skats un zvaigznes par gataviem soļiem.',
    h1: 'Vizuāla dienas karte un rutīnas, kas bērnam parāda, kas notiek tagad un kas nāk pēc tam.',
    ogTitle: 'Vizuāla dienas karte bērniem',
    faqs: [
      faq('Kas ir My Starday?', 'Vizuāla dienas karte ģimenēm. Bērns redz nākamo soli. Pieaugušais tur iestatījumus.'),
      faq('Vai zvaigznes var nopirkt?', 'Nē. Zvaigzne ir par gatavu soli. To nevar nopirkt.'),
      faq('Vai tā ir ārstēšana?', 'Nē. My Starday ir palīgs ikdienā un nesola medicīnisku iznākumu.'),
    ],
    lead: 'Bērns nomierinās, kad nākamais solis ir redzams. My Starday rāda dienu bildēs: tagad, pēc tam, gatavs.',
    hSee: 'Ko bērns redz',
    see: 'Bērna skats rāda vienu soli vienlaikus. Pieaugušais saliek plānu. Bērns atzīmē. Vairāki bērni var dalīt vienu māju, katrs ar savu plānu.',
    hStars: 'Zvaigznes',
    stars: 'Gatavs solis var dot zvaigzni. Zvaigznes nevar nopirkt. Tās neaizstāj vienošanos, ko noslēdzāt iepriekš. Vairāk par to ir šeit:',
    starsLink: 'atalgojuma sistēma',
    hTreat: 'Nav ārstēšana',
    treat: 'Plāns var palīdzēt bērnam, kam vajag vairāk skaidrības, arī pie ADHD vai autisma, un tāpat ģimenēm bez diagnozes. My Starday nav ārstēšana un nesola noteiktu iznākumu.',
    marketsIntro: 'Vietne latviešu valodā skaidro produktu. Valsts ir atsevišķa lieta. Sava lapa ir šim:',
    linkHow: 'Kā tas strādā',
    linkVisual: 'Vizuāla dienas karte',
    linkMorning: 'Rīta rutīna',
  },
  howItWorks: {
    title: 'Kā strādā My Starday | Vizuāla dienas karte',
    description: 'Pieaugušais saliek dienu. Bērns redz nākamo soli un to atzīmē. Zvaigznes ir par gataviem soļiem, nevis par pirkumu.',
    h1: 'Kā strādā My Starday',
    ogTitle: 'Kā tas strādā',
    faqs: [
      faq('Kas iestata plānu?', 'Pieaugušais. Bērns redz bērna skatu un atzīmē soļus.'),
      faq('Vai bērnam vajag e-pastu?', 'Nē. Bērns ienāk ar vārdu un PIN.'),
    ],
    lead: 'Rītu tur trīs lietas: redzams plāns, bērns, kurš atzīmē pats, un pieaugušais, kurš tur iestatījumus.',
    hPlan: '1. Plāns',
    plan: 'Lieciet darbības tajā secībā, kāda rītam tiešām ir. Bildes palīdz, kad bērns vēl nelasa.',
    planLink: 'Vizuālā dienas karte rāda tagad un pēc tam',
    hChild: '2. Bērna skats',
    child: 'Bērns redz nākamo soli, nevis ģimenes iestatījumus. Nav reklāmu un nav sociālā tīkla.',
    hStar: '3. Zvaigzne',
    star: 'Pabeigts solis var dot zvaigzni. Zvaigzni nevar nopirkt. Vienošanās stāv iepriekš, nevis steigas vidū.',
    closing: 'My Starday ir palīgs ikdienā. Tā nav ārstēšana un neaizstāj ārsta, terapeita vai skolas padomu.',
  },
  visualSchedule: {
    title: 'Vizuāla dienas karte bērniem | My Starday',
    description: 'Vizuāla dienas karte bērnam parāda, kas notiek tagad un kas nāk pēc tam. Maz soļu, pazīstamas bildes, skaidra secība.',
    h1: 'Vizuāla dienas karte bērniem',
    ogTitle: 'Vizuāla dienas karte',
    faqs: [
      faq('Cik soļu?', 'Bieži pietiek ar četriem vai pieciem. Garāks saraksts der, kad secība jau ir pazīstama.'),
      faq('Foto vai zīmes?', 'Bildes, ko bērns jau pazīst. Mājas foto strādā labi.'),
    ],
    lead: 'Vizuāla dienas karte padara secību redzamu. Bērnam nav jāmin, kas nāk pēc tam.',
    hNow: 'Tagad un pēc tam',
    now: 'Rādiet tikai pašreizējo soli un nākamo. Garš saraksts pie sienas palīdz mazāk nekā viena skaidra nākamā kustība.',
    hStuck: 'Ja viens solis iestrēgst',
    stuck1: 'Sadaliet soli. „Ģērbšanās“ ir zeķes, bikses, krekls.',
    stuck2: 'Pa vienam.',
    stuck3: 'Parādiet, nevis atkārtojiet.',
    bridge: 'Rīts ir centrā',
    morningLink: 'rīta rutīna',
    weekLink: 'Nedēļas plāns parāda, kura diena ir',
    closing: 'My Starday nav ārstēšana un nesola medicīnisku iznākumu.',
  },
  morningRoutine: {
    title: 'Rīta rutīna bērniem | My Starday',
    description: 'Rīta rutīna ar bildēm samazina skaļos atgādinājumus. Tā pati secība, dienu no dienas.',
    h1: 'Rīta rutīna bērniem',
    ogTitle: 'Rīta rutīna',
    faqs: [
      faq('Kas pieder rītam?', 'Tikai tas, kas pirms durvīm tiešām notiek. Celšanās, ģērbšanās, ēšana, zobi, jaka.'),
      faq('Ja laika ir maz?', 'Saīsiniet sarakstu, nevis runājiet ātrāk. Īsāks plāns ir īsts plāns.'),
    ],
    lead: 'Tā pati secība padara sarakstu par ieradumu. Tā vietā, lai vēlreiz teiktu „tīri zobus“, skatāties nākamo bildi.',
    hExample: 'Piemērs',
    steps: ['Celšanās', 'Tualete un roku mazgāšana', 'Ģērbšanās', 'Brokastis', 'Zobu tīrīšana', 'Jaka, kurpes, soma'],
    age: 'Bērnudārza vecuma bērns bieži tiek galā labāk ar četriem vai pieciem soļiem.',
    bridge: 'Ģimenes, kas pārejās meklē vairāk atbalsta, var izlasīt',
    bridgeLink: 'skaidrības ceļvedi',
    closing: 'My Starday ir atbalsts dienā, nevis ārstēšana.',
  },
  weeklySchedule: {
    title: 'Nedēļas plāns ar piktogrammām bērniem | My Starday',
    description: 'Nedēļas plāns ar piktogrammām parāda, kura diena ir, ne tikai to, kas notiek šobrīd.',
    h1: 'Nedēļas plāns ar piktogrammām',
    ogTitle: 'Nedēļas plāns ar piktogrammām',
    faqs: [
      faq('Ar ko tas atšķiras no dienas kartes?', 'Dienas karte ir šodienas soļi. Nedēļas plāns parāda, ar ko dienas atšķiras.'),
      faq('No kāda vecuma?', 'Bieži ap skolas sākumu, kad nedēļa mainās vairāk. Mazākam bērnam vispirms vajag šodienu.'),
    ],
    lead: 'Nedēļas plāns palīdz, kad darbdiena un nedēļas nogale atšķiras vai kad pirms miega vajag atbildi uz „kas būs rīt?“.',
    mid: 'Pirmdien sports, trešdien pie otra vecāka, piektdien filma. Bildes to padara redzamu, pirms bērns lasa kalendāru.',
    dayLink: 'Dienas karte',
    dayRest: 'ir šodienas soļi. Nedēļas plāns pasaka, kura diena ir.',
    closing: 'My Starday nesola medicīnisku iznākumu.',
  },
  neurodiverseRoutines: {
    title: 'Rutīnas neirodiversiem bērniem | My Starday',
    description: 'Vairāk skaidrības dienā bērnam, kam vajag skaidras pārejas. My Starday ir palīgs ikdienā, nevis ārstēšana un nevis diagnoze.',
    h1: 'Rutīnas neirodiversiem bērniem',
    ogTitle: 'Rutīnas neirodiversiem bērniem',
    faqs: [
      faq('Vai tas ir tikai diagnozei?', 'Nē. Plāns palīdz tur, kur vajag vairāk skaidrības. Diagnoze nav nosacījums.'),
      faq('Vai tas aizstāj terapiju?', 'Nē. Tā nav ārstēšana un neaizstāj speciālista padomu.'),
    ],
    lead: 'Kādam bērnam nākamais solis jāredz, nevis jādzird skaļāk. Tas ir tiesa ar diagnozi un bez tās.',
    hAdhd: 'ADHD: sākt un palikt pie soļa',
    adhd: 'Maiņa bieži apstājas, jo nākamais solis nav redzams. Plāns ar atzīmi uzreiz rāda: šis solis ir gatavs.',
    hAutism: 'Autisms: paredzamība',
    autism: 'Cita secība var būt liela.',
    weekLink: 'Nedēļas plāns',
    autismRest: 'iepriekš parāda, kura diena nāk. Izņemtam solim jāmainās redzami, nevis klusi jāpazūd.',
    closing: 'My Starday ir palīgs ikdienā. Tā nav medicīniska ārstēšana un neaizstāj ārsta, fizioterapeita, logopēda vai skolas padomu. Kartīšu ar nozīmi vispirms, pēc tam un gatavs vēl nav latviešu PDF. Šādas kartītes dod ideju, nevis oficiālu metodi un nevis sertifikātu.',
  },
  rewardSystem: {
    title: 'Atalgojuma sistēma bērniem | My Starday',
    description: 'Iepriekš norunāta balva ir kas cits nekā kaulēšanās brīdī. Bērns zvaigznes nopelna. Tās nevar nopirkt.',
    h1: 'Atalgojuma sistēma bērniem, nekļūstot par kaulēšanos',
    ogTitle: 'Atalgojuma sistēma bērniem',
    faqs: [
      faq('Vai zvaigžņu kartīte ir kukulis?', 'Nē, ja balva stāv iepriekš un ir saistīta ar ko, ko bērns spēj izdarīt. Kaulēšanos piedāvā brīdī, lai kaut kas beigtos.'),
      faq('Cik zvaigžņu?', 'Sāciet ar vienu zvaigzni par gatavu soli. Zvaigznes nevar nopirkt.'),
    ],
    lead: '„Vai tas nav vienkārši kukulis?“ atkarīgs no tā, kad vienojāties. Iepriekš noslēgta vienošanās var atbalstīt ieradumu. Dusmu vidū tā kļūst par kaulēšanos.',
    planLink: 'Vizuālajā dienas kartē',
    chain: 'ķēde ir vienkārša: ieraudzīt soli, izdarīt, atzīmēt, saņemt zvaigzni.',
    steps: [
      'Esiet konkrēti. Atalgojiet „tīra zobus bez atgādinājuma“, nevis „labi“.',
      'Rādiet progresu.',
      'Skaitiet mēģinājumu, ne tikai nevainojamu rītu.',
      'Ļaujiet bērnam domāt līdzi par balvu.',
      'Retiniet zvaigznes, kad ieradums ir klāt.',
    ],
    closing: 'Zvaigznes nevar nopirkt. My Starday nesola medicīnisku iznākumu.',
  },
  resources: {
    title: 'Materiāli vizuālām rutīnām | My Starday',
    description: 'Kas latviski jau ir un kā vēl nav PDF. Lietotne un drukāta lapa ir divas dažādas lietas.',
    h1: 'Materiāli',
    ogTitle: 'Materiāli',
    faqs: [faq('Vai ir latviešu PDF?', 'Vēl nav. Šī lapa nepārdod zviedru lapas kā latviešu tulkojumu.')],
    lead: 'Lietotne rāda dienu ekrānā. Drukāta lapa ir kas cits. Latviešu PDF bērnam šeit vēl nav.',
    app: 'Lietotnē saliekat',
    dayLink: 'dienas karti',
    morningLink: 'rīta rutīnu',
    weekLink: 'nedēļas plānu',
    appRest: 'Bērns redz to pašu secību bērna skatā.',
    nolink: 'Mēs nelinkojam citas valodas krājumu tā, it kā tas būtu latviski. Kad latviešu lapas būs, tās būs šajā lapā.',
  },
  faq: {
    title: 'Bieži jautājumi | My Starday',
    description: 'Īsas atbildes par dienas karti, zvaigznēm, bērna skatu, cenu un par to, kas My Starday nav.',
    h1: 'Bieži jautājumi',
    ogTitle: 'Bieži jautājumi',
    faqs: [
      faq('Kam šī vietne ir?', 'Vietne latviešu valodā skaidro produktu. Latvijai ir sava tirgus lapa. Valoda paliek latviešu.'),
      faq('Vai varu nopirkt zvaigznes?', 'Nē.'),
      faq('Vai tā ir terapijas lietotne?', 'Nē. Nav ārstēšanas un nav solīta medicīniska iznākuma.'),
      faq('Kur izveidoju kontu?', 'Esošajā veidlapā. Tā jautā, kur ģimene dzīvo. Tirgus lapa pati valsti nenosaka.'),
    ],
    lead: 'Īsās atbildes. Garākie teksti ir ceļvežos.',
    hLang: 'Valoda un valsts',
    lang: 'Šī vietne ir latviešu valodā. Valsti izvēlas atsevišķi. Tirgus lapa nemaina valodu un neveido kontu.',
    hChild: 'Bērns',
    child: 'Bērns redz plānu un atzīmē. Iestatījumi, ielūgumi un konts paliek pieaugušajam. Vairāk ir šeit:',
    howLink: 'Kā tas strādā',
    hStars: 'Zvaigznes',
    stars: 'Zvaigznes ir par gataviem soļiem. Tās nevar nopirkt. Izlasi',
    starsLink: 'atalgojuma sistēmu',
  },
  privacy: {
    title: 'Privātuma paziņojums — My Starday',
    description: 'Kādus datus My Starday apstrādā, ko mēs nevācam un kādas tiesības dod GDPR.',
    h1: 'My Starday privātuma paziņojums',
    ogTitle: 'Privātuma paziņojums',
    body: `
      <p class="updated">Pēdējoreiz atjaunināts: 2026. gada oktobris</p>
      <p>Ar privātumu apejamies rūpīgi. My Starday vāc tik maz, cik iespējams: tikai to, kas lietotnei vajadzīgs, lai strādātu. Mēs nepārdodam tavus datus un nelietojam tos mērķētai reklāmai. Nodošana ārpus pakalpojuma notiek tikai tad, kad tu to izvēlies, vai kad tā vajadzīga, lai apstrādātāji varētu turēt pakalpojumu.</p>
      <p><strong>Pārzinis:</strong> Papa Bravo AB atbild par tavu personas datu apstrādi. Raksti mums caur <a href="/en/contact">kontakta veidlapu</a>.</p>
      <h2>Ko mēs vācam</h2>
      <p>Datus apstrādājam uz līguma pamata, lai dotu lietotni un funkcijas, kurām tu piesakies. Par pieaugušajiem un ģimenēm vācam:</p>
      <ul>
        <li><strong>E-pasts</strong> — ienākšanai un konta ziņām</li>
        <li><strong>Vārds un uzvārds</strong> — lai kontu pazītu</li>
        <li><strong>Darbību žurnāls</strong> — kuras darbības bija gatavas un kad</li>
        <li><strong>Zvaigznes</strong> — nopelnītās un izmantotās zvaigznes</li>
        <li><strong>Plāni un darbības</strong> — ko tu pats veido</li>
      </ul>
      <p><strong>Bērna privātums:</strong> bērnu pazīst tikai pēc vārda vai iesaukas un izvēlēta emoji. Mēs nevācam uzvārdu, personas kodu vai bērna kontaktus.</p>
      <h2>Ko mēs nevācam</h2>
      <ul>
        <li>Bērnu uzvārdus</li>
        <li>Personas kodu, ne pieaugušajam, ne bērnam</li>
        <li>Informāciju par bērna veselību, diagnozi vai invaliditāti</li>
        <li>Maksājuma datus. Pirkums iet caur App Store vai Google Play</li>
        <li>Atrašanās vietas datus</li>
      </ul>
      <h2>Kam datus lietojam</h2>
      <ul>
        <li>Parādīt bērnam dienas karti</li>
        <li>Saglabāt progresu un zvaigznes</li>
        <li>Sūtīt apstiprinājuma e-pastu un konta ziņas</li>
        <li>Atbildēt uz ziņām, ko tu mums sūti</li>
      </ul>
      <h2>Nodošana</h2>
      <p>Tavus datus reklāmai nenododam. Šie apstrādātāji tur pakalpojumu. Viņi apstrādā tikai pēc mūsu uzdevuma un saskaņā ar GDPR:</p>
      <ul>
        <li><strong>Neon (datubāze)</strong> — konts, plāni, darbības un ģimenes dati</li>
        <li><strong>Pašu mitināšana (VPS ES vai EEZ)</strong> — tīmekļa lietotne un API</li>
        <li><strong>Resend (e-pasts)</strong> — darījuma vēstule, piemēram apstiprinājums, parole un sveiciena vēstule</li>
        <li><strong>Cloudflare R2</strong> — augšupielādēti profila attēli, ja funkciju lieto</li>
        <li><strong>Apple un Google</strong> — ienākšana un push ziņas caur APNs un FCM, ja funkcijas lieto</li>
      </ul>
      <h2>Pārskats sarunai</h2>
      <p>Ja kā aprūpētājs izveido laikā ierobežotu saiti ar izvēlētiem darbību un balvu skaitļiem, vari to dalīt, piemēram, ar skolotāju vai terapeitu. Tas notiek tikai tāpēc, ka tu izvēlies. Saturu nosaki tu, un saiti vari atsaukt. Saņēmējam konts nav vajadzīgs.</p>
      <p>Ja saiti sargā ar kodu, nedalies ar kodu tajā pašā ziņā, kur ir saite.</p>
      <h2>Ienākšana ar Apple vai Google</h2>
      <ul>
        <li><strong>Ienākšana ar Apple:</strong> apstrādājam vārdu un e-pastu. Ja e-pastu slēpj, glabājam unikālo pārsūtīšanas adresi, ko Apple izveido, lai varētu sūtīt konta ziņas.</li>
        <li><strong>Ienākšana ar Google:</strong> saņemam un glabājam Google konta e-pastu un vārdu, lai izveidotu profilu.</li>
      </ul>
      <p>Apple un Google pašu apstrādi sedz viņu pašu paziņojumi.</p>
      <h2>Push ziņas un ierīces talons</h2>
      <p>Ja ieslēdz push ziņas, uz tava piekrišanas pamata glabājam unikālu ierīces talonu (APNs vai FCM), lai ziņa nonāktu pareizajā ierīcē. Talons ir piesaistīts tavam kontam.</p>
      <p>Talons beidzas, izrakstoties, vai kad platforma to atzīmē par nederīgu. Ierīces īpašības bez aktīva push abonementa neglabājam. Izslēgšana ir lietotnes iestatījumos vai ierīcē.</p>
      <h2>Glabāšanas laiks</h2>
      <p>Datus glabājam, kamēr konts ir aktīvs. Ja kontu dzēš, visi dati tiek dzēsti uzreiz un neatgriezeniski.</p>
      <h2>Konta dzēšana</h2>
      <p>Kontu dzēš lietotnē, iestatījumos. Apstiprini ar paroli vai trešās puses ienākšanu.</p>
      <p>To nevar atsaukt. Pazūd pieaugušā konts, bērnu profili, plāni, dienasgrāmatas, vērtējumi, balvas un ielūgumi.</p>
      <h2>Glabāšana un drošība</h2>
      <p>Tiekamies uz to, lai pamatdati glabātos ES vai EEZ, kur tas ir spēkā. Daži pakalpojumu sniedzēji var apstrādāt arī ārpus EEZ. Nodošanas un garantijas ir šajā tekstā, un mēs tās nepārtraukti pārskatām. Savienojumi ir šifrēti (HTTPS). Paroles neglabā lasāmā veidā. Lietojam bcrypt.</p>
      <h2>Sīkdatnes</h2>
      <ul>
        <li><strong>Nepieciešamās sīkdatnes</strong> — vienmēr ieslēgtas. Sesija un CSRF aizsardzība drošai ienākšanai.</li>
        <li><strong>Preferences</strong> — glabājas lokāli, piemēram tēma.</li>
        <li><strong>Statistika un mārketings</strong> — Google Analytics 4, Meta Pixel un Google Ads. Pēc noklusējuma izslēgtas, līdz sīkdatņu paziņojumā piekrīti.</li>
      </ul>
      <p>Tavu izvēli glabājam ne ilgāk par vienu gadu. Vari to mainīt paziņojumā vai iestatījumos. Bērna rutīnas dati nenonāk reklāmas platformās.</p>
      <h2>Tavas tiesības (GDPR)</h2>
      <ul>
        <li>Tiesības dzēst kontu un datus</li>
        <li>Piekļuves tiesības</li>
        <li>Tiesības labot neprecīzus datus</li>
        <li>Tiesības iebilst vai ierobežot</li>
        <li>Tiesības sūdzēties zviedru uzraugam Integritetsskyddsmyndigheten (IMY), ja uzskati, ka pārkāpjam GDPR</li>
      </ul>
      <h2>Kontakts</h2>
      <p>Ir jautājums par šo apstrādi? Lieto <a href="/en/contact">kontakta veidlapu</a>.</p>
    `,
  },
  terms: {
    title: 'Lietošanas noteikumi — My Starday',
    description: 'My Starday lietošanas noteikumi: konts, bērni, cena un atbildība.',
    h1: 'Lietošanas noteikumi',
    ogTitle: 'Lietošanas noteikumi',
    body: `
      <p class="updated">Pēdējoreiz atjaunināts: 2026. gada oktobris</p>
      <p>Paldies, ka lieto My Starday. Šiem noteikumiem jābūt skaidriem un godīgiem. Jautājumus sūti caur <a href="/en/contact">kontakta veidlapu</a>.</p>
      <h2>1. Par pakalpojumu</h2>
      <p>My Starday ir digitāls pakalpojums ģimenēm, kas grib sakārtotu dienas karti, atzīmēt bērna progresu ar zvaigznēm un ļaut bērnam sekot darbībām savā skatā. Pakalpojums ir vecākiem un aizbildņiem un viņu bērniem. Ģimenē ir vismaz viens pieaugušais ar kontu. Bērns ienāk ar PIN bērna skatā.</p>
      <h2>2. Konts un drošība</h2>
      <ul>
        <li>Izvēlies stipru paroli un nedalies ar to</li>
        <li>Sargā savu e-pastu. Ar to atgūsti piekļuvi</li>
        <li>Bērna skata PIN ir tikai bērnam un aizbildņiem</li>
        <li>Nelieto lietotni veidā, kas ir pretrunā ar zviedru tiesībām</li>
      </ul>
      <p>Tu atbildi par visu, kas notiek zem tava konta, arī ja to lieto cits. Ja turi ļaunprātību, pasaki uzreiz.</p>
      <h2>3. Bērni un personas dati</h2>
      <p>My Starday apstrādā datus par bērniem. Mēs sekojam GDPR un datu minimizēšanas principam:</p>
      <ul>
        <li>Bērnu pazīst pēc vārda un izvēlēta emoji. Bez uzvārda, bez personas koda, bez kontaktiem</li>
        <li>Vecāki vai aizbildņi ievada datus un piekrīt dalīšanai</li>
        <li>Bērnu datus nelieto reklāmai un nekam citam kā pakalpojumam</li>
        <li>Pārskatu un plānu dala tikai tad, kad pieaugušais pats dala laikā ierobežotu saiti</li>
      </ul>
      <h2>4. Saturs, ko tu veido</h2>
      <p>Plāni, balvas, darbības un novērojumi, ko pievieno, ir tavi vai tavas ģimenes. Tu dod mums tiesības šo saturu glabāt un rādīt, kamēr konts ir aktīvs. Mēs to nekopējam reklāmā, nepārdodam un nelietojam mārketingā.</p>
      <h2>5. Lietošana</h2>
      <p>Pakalpojums ir tavas ģimenes personīgai lietošanai. Nav atļauts:</p>
      <ul>
        <li>Komerciāla lietošana bez vienošanās ar Papa Bravo AB</li>
        <li>Plānu, zvaigžņu vai balvu mainīšana ārpus lietotnes parastās gaitas</li>
        <li>Automatizēts rīks, skrāpis vai bots pret pakalpojumu</li>
        <li>Prettiesiska, aizskaroša vai kaitīga satura publicēšana</li>
      </ul>
      <h2>6. Izbeigšana un dzēšana</h2>
      <p>Kontu vari jebkurā laikā neatgriezeniski dzēst lietotnes iestatījumos, apstiprinot ar paroli.</p>
      <p>Dzēšana uzreiz un neatgriezeniski noņem pieaugušā kontu, visus bērnus, plānus, darbību žurnālus, zvaigznes, balvas un iespējamos novērojumus.</p>
      <p>Mēs varam apturēt kontu, kas pārkāpj šos noteikumus vai zviedru tiesības.</p>
      <h2>7. Cena</h2>
      <p>Ģimenes Īrijā un Kanādā var lietot My Starday bez maksas līdz 2026. gada 31. decembrim ieskaitot. Šajā periodā maksājums nav jāveic. Bezmaksas periods automātiski nekļūst par abonementu. No 2027. gada 1. janvāra vari izvēlēties abonementu App Store vai Google Play. Šajā lapā nav tīmekļa kases. Citās valstīs ir spēkā cena un piekļuve, ko lietotne rāda tai valstij. Zviedrijas ģimenes, kas sāk no 2026. gada 3. oktobra, var lietotni izmēģināt 14 dienas un pēc tam lietotnē izvēlēties 59 zviedru kronas mēnesī vai 590 zviedru kronas gadā. Ģimenes, kurām konts jau ir, patur esošo piedāvājumu.</p>
      <h2>8. Izmaiņas</h2>
      <p>Šos noteikumus varam mainīt, piemēram pēc likuma maiņas, jaunas funkcijas vai precizējuma. Ja maiņa ir būtiska, pasakām ar e-pastu vai paziņojumu lietotnē.</p>
      <p>Ja pēc tam turpini lietot pakalpojumu, tā ir jauno noteikumu pieņemšana.</p>
      <h2>9. Atbildība</h2>
      <p>My Starday tiek dots tāds, kāds tas ir. Darām, ko varam, lai pakalpojums būtu stabils un drošs, bet nevaram garantēt, ka tas vienmēr ir pieejams bez pārtraukuma.</p>
      <p>Papa Bravo AB neatbild par:</p>
      <ul>
        <li>Datu zudumu nepārvaramas varas dēļ</li>
        <li>Kaitējumu, jo dalies ar PIN vai ienākšanas datiem ar kādu, kam tos nevajadzētu saņemt</li>
        <li>Netiešu kaitējumu, neizmantotu iespēju vai zaudētiem datiem, ja vien zviedru tiesības neprasa ko citu</li>
      </ul>
      <p>Tu atbildi par lietošanu saskaņā ar šiem noteikumiem un zviedru tiesībām.</p>
      <h2>10. Kontakts</h2>
      <p>Ir jautājums par šiem noteikumiem vai pakalpojumu? Lieto <a href="/en/contact">kontakta veidlapu</a>.</p>
    `,
  },
});

module.exports = { pageFor };
