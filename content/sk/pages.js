'use strict';

/**
 * Slovak public pages. Written in Slovak.
 * Legal text translates the verified baseline. It adds no Slovak statute.
 */

const { composeLocale, faq } = require('../compose-pages');

const pageFor = composeLocale('sk', {
  marker: /dieť|deti/i,
  market: {
    title: (name) => `My Starday — ${name}. Vizuálne denné plány pre deti`,
    description: (name) => `Trhová stránka pre ${name}. Vizuálne denné plány po slovensky. Je to trhová stránka, nie samostatný jazykový web.`,
    h1: (name) => `Vizuálne denné plány pre rodiny. Trh: ${name}`,
    lead: (name) => `Toto je stránka pre ${name}. Slovenský web ostáva jazykovým webom.`,
    registrationOpen: (name) => `Nové účty v krajine ${name} sa riadia existujúcou registráciou. Predvolený stav je otvorený.`,
    registrationClosed: (name) => `Nové účty v krajine ${name} nie sú predvolene otvorené. Riadi sa to existujúcou registráciou, nie touto stránkou. Predvolený stav je zatvorený.`,
    complimentary: (name) => `Pre ${name} platí existujúce bezplatné obdobie. Samo sa nestane predplatným. Táto stránka nestanovuje cenu.`,
    introYear: (name) => `${name} si necháva ponuku, ktorá už je na švédskom webe. Táto stránka nestanovuje cenu. Na tomto trhu nie je bezplatné obdobie do 31. decembra 2026.`,
    trial: (name, days) => `Ak tu účet neskôr bude možný, platí existujúce pravidlo mimo Švédska, Írska a Kanady: skúšobná doba ${days} dní. Platba musí byť najprv dostupná. Na tomto trhu nie je bezplatné obdobie do 31. decembra 2026 a nič sa samo nestane predplatným. Táto stránka nestanovuje cenu.`,
    notTreatment: (name) => `Tlačidlo otvorí bežnú stránku App Store, nie vymyslenú produktovú stránku pre ${name}. My Starday je vizuálny denný plán. Nie je to liečba a nesľubuje lekársky výsledok.`,
    register: 'Vytvoriť účet',
    registerNote: 'Formulár sa pýta, kde rodina býva. Tento odkaz sám nenastavuje krajinu ani cenu.',
    how: 'Ako to funguje',
    playSoon: 'Google Play tu nie je otvorený ako samostatná stránka.',
  },
  home: {
    title: 'Vizuálny denný plán pre deti – rutiny, odmeny a piktogramy | My Starday',
    description: 'Vizuálne denné plány a rutiny, ktoré dieťaťu ukážu, čo sa deje teraz a čo príde potom. Piktogramy, vlastný detský pohľad a hviezdy za hotové kroky.',
    h1: 'Vizuálne denné plány a rutiny, ktoré dieťaťu ukážu, čo sa deje teraz a čo príde potom.',
    ogTitle: 'Vizuálny denný plán pre deti',
    faqs: [
      faq('Čo je My Starday?', 'Vizuálny denný plán pre rodiny. Dieťa vidí ďalší krok. Dospelý si necháva nastavenia.'),
      faq('Dajú sa hviezdy kúpiť?', 'Nie. Hviezda je za hotový krok. Kúpiť sa nedá.'),
      faq('Je to liečba?', 'Nie. My Starday je pomoc v bežnom dni a nesľubuje lekársky výsledok.'),
    ],
    lead: 'Dieťa sa upokojí, keď je ďalší krok vidieť. My Starday ukazuje deň v obrázkoch: teraz, potom, hotovo.',
    hSee: 'Čo dieťa vidí',
    see: 'Detský pohľad ukazuje jeden krok po druhom. Dospelý plán zostaví. Dieťa odškrtáva. Viac detí môže zdieľať jednu domácnosť, každé so svojím plánom.',
    hStars: 'Hviezdy',
    stars: 'Hotový krok môže dať hviezdu. Hviezdy sa nekupujú. Nenahrádzajú dohodu, ktorú ste urobili vopred. Viac je v',
    starsLink: 'systéme odmien',
    hTreat: 'Žiadna liečba',
    treat: 'Plán môže pomôcť dieťaťu, ktoré potrebuje viac prehľadu, aj pri ADHD alebo autizme, a rovnako rodinám bez diagnózy. My Starday nie je liečba a nesľubuje určitý výsledok.',
    marketsIntro: 'Slovenský web vysvetľuje produkt. Krajina je niečo iné. Vlastná stránka je pre',
    linkHow: 'Ako to funguje',
    linkVisual: 'Vizuálny denný plán',
    linkMorning: 'Ranná rutina',
  },
  howItWorks: {
    title: 'Ako funguje My Starday | Vizuálny denný plán',
    description: 'Dospelý zostaví deň. Dieťa vidí ďalší krok a odškrtne ho. Hviezdy sú za hotové kroky, nie na predaj.',
    h1: 'Ako funguje My Starday',
    ogTitle: 'Ako to funguje',
    faqs: [
      faq('Kto nastavuje plán?', 'Dospelý. Dieťa vidí detský pohľad a odškrtáva kroky.'),
      faq('Potrebuje dieťa e-mail?', 'Nie. Dieťa sa prihlási menom a PINom.'),
    ],
    lead: 'Ráno nesú tri veci: viditeľný plán, dieťa, ktoré si samo odškrtáva, a dospelý, ktorý drží nastavenia.',
    hPlan: '1. Plán',
    plan: 'Aktivity dáte do poradia, ktoré ráno naozaj má. Obrázky pomôžu, keď dieťa ešte nečíta.',
    planLink: 'Vizuálny denný plán ukazuje teraz a potom',
    hChild: '2. Detský pohľad',
    child: 'Dieťa vidí ďalší krok, nie nastavenia rodiny. Nie je tam reklama ani sociálna sieť.',
    hStar: '3. Hviezda',
    star: 'Dokončený krok môže dať hviezdu. Hviezda sa nekupuje. Dohoda stojí vopred, nie uprostred zhonu.',
    closing: 'My Starday je pomoc v bežnom dni. Nie je to liečba a nenahrádza radu lekára, terapeuta alebo školy.',
  },
  visualSchedule: {
    title: 'Vizuálny denný plán pre deti | My Starday',
    description: 'Vizuálny denný plán ukáže dieťaťu, čo sa deje teraz a čo príde potom. Málo krokov, známe obrázky, jasné poradie.',
    h1: 'Vizuálny denný plán pre deti',
    ogTitle: 'Vizuálny denný plán',
    faqs: [
      faq('Koľko krokov?', 'Často stačia štyri alebo päť. Dlhší zoznam ide, keď je poradie už známe.'),
      faq('Fotky alebo symboly?', 'Obrázky, ktoré dieťa už pozná. Fotky z domu fungujú dobre.'),
    ],
    lead: 'Vizuálny denný plán urobí poradie viditeľným. Dieťa nemusí hádať, čo príde potom.',
    hNow: 'Teraz a potom',
    now: 'Ukážte len aktuálny krok a ten ďalší. Dlhý zoznam na stene pomôže menej než jasný ďalší pohyb.',
    hStuck: 'Keď sa krok zasekne',
    stuck1: 'Rozdeľte krok. „Obleč sa“ sú ponožky, nohavice, tričko.',
    stuck2: 'Jeden po druhom.',
    stuck3: 'Ukážte, namiesto toho, aby ste opakovali.',
    bridge: 'Ráno je v strede',
    morningLink: 'ranná rutina',
    weekLink: 'Týždenný plán ukáže, ktorý je deň',
    closing: 'My Starday nie je liečba a nesľubuje lekársky výsledok.',
  },
  morningRoutine: {
    title: 'Ranná rutina pre deti | My Starday',
    description: 'Ranná rutina s obrázkami znižuje počet slovných pripomienok. Rovnaké poradie, deň čo deň.',
    h1: 'Ranná rutina pre deti',
    ogTitle: 'Ranná rutina',
    faqs: [
      faq('Čo patrí do rána?', 'Len to, čo sa naozaj stane pred odchodom. Vstať, obliecť sa, jesť, zuby, bunda.'),
      faq('Čo keď je málo času?', 'Skráťte zoznam, namiesto toho, aby ste hovorili rýchlejšie. Kratší plán je skutočný plán.'),
    ],
    lead: 'Rovnaké poradie urobí zo zoznamu zvyk. Namiesto ďalšieho „vyčisti si zuby“ sa pozriete na ďalší obrázok.',
    hExample: 'Príklad',
    steps: ['Vstať', 'Záchod a umyť ruky', 'Obliecť sa', 'Raňajky', 'Vyčistiť zuby', 'Bunda, topánky, taška'],
    age: 'Dieťa v materskej škole často zvládne lepšie štyri alebo päť krokov.',
    bridge: 'Rodiny, ktoré chcú viac opory pri prechodoch, si môžu prečítať',
    bridgeLink: 'sprievodcu prehľadom',
    closing: 'My Starday je opora v dni, nie liečba.',
  },
  weeklySchedule: {
    title: 'Týždenný plán s piktogramami pre deti | My Starday',
    description: 'Týždenný plán s piktogramami ukáže, ktorý je deň, nie len to, čo sa deje práve teraz.',
    h1: 'Týždenný plán s piktogramami',
    ogTitle: 'Týždenný plán s piktogramami',
    faqs: [
      faq('Čím sa líši od denného plánu?', 'Denný plán sú dnešné kroky. Týždenný plán ukáže, ako sa dni líšia.'),
      faq('Od akého veku?', 'Často okolo nástupu do školy, keď sa týždeň viac mení. Mladšie dieťa najprv potrebuje dnešok.'),
    ],
    lead: 'Týždenný plán pomôže, keď sa všedný deň a víkend líšia, alebo keď „čo bude zajtra?“ potrebuje odpoveď pred spaním.',
    mid: 'Pondelok so športom, streda u druhého rodiča, piatok s filmom. Obrázky to ukážu skôr, než dieťa číta kalendár.',
    dayLink: 'Denný plán',
    dayRest: 'sú dnešné kroky. Týždenný plán povie, ktorý je deň.',
    closing: 'My Starday nesľubuje lekársky výsledok.',
  },
  neurodiverseRoutines: {
    title: 'Rutiny pre neurodivergentné deti | My Starday',
    description: 'Viac prehľadu v dni pre dieťa, ktoré potrebuje jasné prechody. My Starday je pomoc v bežnom dni, nie liečba a nie diagnóza.',
    h1: 'Rutiny pre neurodivergentné deti',
    ogTitle: 'Rutiny pre neurodivergentné deti',
    faqs: [
      faq('Je to len pre diagnózu?', 'Nie. Plán pomôže tam, kde treba viac prehľadu. Diagnóza nie je podmienka.'),
      faq('Nahrádza to terapiu?', 'Nie. Nie je to liečba a nenahrádza radu odborníkov.'),
    ],
    lead: 'Niektoré dieťa potrebuje ďalší krok vidieť, nie počuť hlasnejšie. Platí to s diagnózou aj bez nej.',
    hAdhd: 'ADHD: začať a pri kroku ostať',
    adhd: 'Prechod sa často zasekne, pretože ďalší krok nie je vidieť. Plán s odškrtnutím hneď povie: tento krok je hotový.',
    hAutism: 'Autizmus: predvídateľnosť',
    autism: 'Iné poradie môže byť veľké.',
    weekLink: 'Týždenný plán',
    autismRest: 'ukáže vopred, ktorý deň príde. Škrtnutý krok sa má zmeniť viditeľne, nie ticho zmiznúť.',
    closing: 'My Starday je pomoc v bežnom dni. Nie je to lekárska liečba a nenahrádza radu lekára, ergoterapeuta, logopéda alebo školy. Karty v zmysle najprv, potom a hotovo ešte nie sú ako slovenské PDF. Také karty sú inšpirácia, nie oficiálna metóda a nie certifikácia.',
  },
  rewardSystem: {
    title: 'Systém odmien pre deti | My Starday',
    description: 'Odmena, na ktorej sa dohodnete vopred, je niečo iné než obchod v tej chvíli. Dieťa si hviezdy zaslúži. Nekupujú sa.',
    h1: 'Systém odmien pre deti, bez toho, aby sa z toho stal obchod',
    ogTitle: 'Systém odmien pre deti',
    faqs: [
      faq('Je kartička s hviezdami úplatok?', 'Nie, keď odmena stojí vopred a viaže sa na niečo, čo dieťa zvládne. Obchod sa ponúka v tej chvíli, aby niečo prestalo.'),
      faq('Koľko hviezd?', 'Začnite jednou hviezdou za hotový krok. Hviezdy sa nekupujú.'),
    ],
    lead: '„Nie je to len úplatok?“ záleží na tom, kedy sa dohodnete. Dohoda vopred môže kartu oprieť o zvyk. Uprostred hnevu sa z nej stane zjednávanie.',
    planLink: 'Vo vizuálnom dennom pláne',
    chain: 'je reťaz jednoduchý: vidieť krok, urobiť ho, odškrtnúť, dostať hviezdu.',
    steps: [
      'Buďte konkrétni. Odmeňte „čistí zuby bez pripomienky“, nie „je dobré“.',
      'Ukážte postup.',
      'Počítajte pokus, nie len dokonalé ráno.',
      'Nechajte dieťa myslieť na odmenu s vami.',
      'Hviezdy zrieďte, keď zvyk sedí.',
    ],
    closing: 'Hviezdy sa nekupujú. My Starday nesľubuje lekársky výsledok.',
  },
  resources: {
    title: 'Materiály k vizuálnym rutinám | My Starday',
    description: 'Čo už po slovensky je a čo ešte nie je ako PDF. Aplikácia a vytlačený list sú dve rozdielne veci.',
    h1: 'Materiály',
    ogTitle: 'Materiály',
    faqs: [faq('Sú slovenské PDF?', 'Ešte nie. Táto stránka nepredáva švédske listy ako slovenský preklad.')],
    lead: 'Aplikácia ukazuje deň na obrazovke. Vytlačený list je niečo iné. Slovenské PDF tu ešte nie sú.',
    app: 'V aplikácii zostavíte',
    dayLink: 'denný plán',
    morningLink: 'rannú rutinu',
    weekLink: 'týždenný plán',
    appRest: 'Dieťa vidí rovnaké poradie v detskom pohľade.',
    nolink: 'Neodkazujeme na knižnicu v inom jazyku, ako by bola slovenská. Keď slovenské listy pribudnú, budú na tejto stránke.',
  },
  faq: {
    title: 'Časté otázky | My Starday',
    description: 'Krátke odpovede o dennom pláne, hviezdach, detskom pohľade, cene a o tom, čo My Starday nie je.',
    h1: 'Časté otázky',
    ogTitle: 'Časté otázky',
    faqs: [
      faq('Pre koho je web?', 'Slovenský web vysvetľuje produkt. Slovensko má vlastnú trhovú stránku. Jazyk ostáva slovenčina.'),
      faq('Môžem kúpiť hviezdy?', 'Nie.'),
      faq('Je to terapeutická aplikácia?', 'Nie. Žiadna liečba, žiadny sľúbený lekársky výsledok.'),
      faq('Kde založím účet?', 'V existujúcom formulári. Pýta sa, kde rodina býva. Trhová stránka krajinu sama nenastaví.'),
    ],
    lead: 'Krátke odpovede. Dlhšie texty sú v sprievodcoch.',
    hLang: 'Jazyk a krajina',
    lang: 'Tento web je po slovensky. Krajinu volíte osobitne. Trhová stránka jazyk nemení a účet nezakladá.',
    hChild: 'Dieťa',
    child: 'Dieťa vidí plán a odškrtáva. Nastavenia, pozvánky a účet ostávajú u dospelého. Viac je v',
    howLink: 'Ako to funguje',
    hStars: 'Hviezdy',
    stars: 'Hviezdy sú za hotové kroky. Nekupujú sa. Prečítajte si',
    starsLink: 'systém odmien',
  },
  privacy: {
    title: 'Zásady ochrany súkromia — My Starday',
    description: 'Aké údaje My Starday spracúva, čo nezbierame a aké práva dáva GDPR.',
    h1: 'Zásady ochrany súkromia pre My Starday',
    ogTitle: 'Zásady ochrany súkromia',
    body: `
      <p class="updated">Naposledy aktualizované: október 2026</p>
      <p>So súkromím zaobchádzame opatrne. My Starday zbiera čo najmenej: len to, čo aplikácia potrebuje, aby fungovala. Tvoje údaje nepredávame a nepoužívame ich na cielenú reklamu. Odovzdanie mimo služby sa stane len vtedy, keď si ho zvolíš sám, alebo keď je potrebné, aby naši sprostredkovatelia službu prevádzkovali.</p>
      <p><strong>Prevádzkovateľ:</strong> Papa Bravo AB zodpovedá za spracúvanie tvojich osobných údajov. Ozveš sa nám cez <a href="/en/contact">kontaktný formulár</a>.</p>
      <h2>Čo zbierame</h2>
      <p>Údaje spracúvame na základe zmluvy, aby sme mohli poskytnúť aplikáciu a funkcie, ku ktorým sa prihlásiš. O dospelých a rodinách zbierame:</p>
      <ul>
        <li><strong>E-mail</strong> — na prihlásenie a správy o účte</li>
        <li><strong>Meno a priezvisko</strong> — aby sme účet spoznali</li>
        <li><strong>Záznam aktivít</strong> — ktoré aktivity boli hotové a kedy</li>
        <li><strong>Hviezdy</strong> — získané a uplatnené hviezdy</li>
        <li><strong>Plány a aktivity</strong> — to, čo sám vytvoríš</li>
      </ul>
      <p><strong>Súkromie dieťaťa:</strong> dieťa spoznáme len podľa krstného mena alebo prezývky a zvoleného emoji. Nezbierame priezvisko, rodné číslo ani kontakt dieťaťa.</p>
      <h2>Čo nezbierame</h2>
      <ul>
        <li>Žiadne priezviská detí</li>
        <li>Žiadne rodné čísla, ani dospelých, ani detí</li>
        <li>Žiadne údaje o zdraví, diagnóze alebo postihnutí dieťaťa</li>
        <li>Žiadne platobné údaje. Nákupy idú cez App Store alebo Google Play</li>
        <li>Žiadne údaje o polohe</li>
      </ul>
      <h2>Na čo údaje používame</h2>
      <ul>
        <li>Ukázať dieťaťu denný plán</li>
        <li>Uložiť postup a hviezdy</li>
        <li>Poslať potvrdzujúci e-mail a správy o účte</li>
        <li>Odpovedať na správy, ktoré nám pošleš</li>
      </ul>
      <h2>Odovzdanie</h2>
      <p>Tvoje údaje neodovzdávame na reklamu. Títo sprostredkovatelia službu prevádzkujú. Spracúvajú len podľa nášho pokynu a podľa GDPR:</p>
      <ul>
        <li><strong>Neon (databáza)</strong> — účet, plány, aktivity a údaje rodiny</li>
        <li><strong>Vlastný hosting (VPS v EÚ/EHP)</strong> — webová aplikácia a API</li>
        <li><strong>Resend (e-mail)</strong> — transakčná pošta, napríklad potvrdenie, heslo a uvítací e-mail</li>
        <li><strong>Cloudflare R2</strong> — nahraté profilové fotky, keď funkciu použiješ</li>
        <li><strong>Apple a Google</strong> — prihlásenie a push správy cez APNs a FCM, keď funkcie použiješ</li>
      </ul>
      <h2>Správa k rozhovoru</h2>
      <p>Keď ako zákonný zástupca vytvoríš časovo obmedzený odkaz na výber čísel o aktivitách a odmenách, môžeš ho zdieľať, napríklad s učiteľom alebo terapeutom. Stane sa to len preto, že si to zvolíš. Obsah určuješ ty a odkaz môžeš odvolať. Príjemca účet nepotrebuje.</p>
      <p>Ak odkaz chrániš kódom, nezdieľaj kód v tej istej správe ako odkaz.</p>
      <h2>Prihlásenie cez Apple alebo Google</h2>
      <ul>
        <li><strong>Prihlásenie Apple:</strong> spracúvame meno a e-mail. Ak zvolíš skryť e-mail, uložíme jedinečnú preposielaciu adresu, ktorú Apple vytvorí, aby sme mohli posielať správy o účte.</li>
        <li><strong>Prihlásenie Google:</strong> dostaneme a uložíme e-mail a meno účtu Google, aby sme vytvorili profil.</li>
      </ul>
      <p>Vlastné spracúvanie Apple a Google sa riadi ich zásadami.</p>
      <h2>Push správy a token zariadenia</h2>
      <p>Ak zapneš push správy, uložíme na základe tvojho súhlasu jedinečný token zariadenia (APNs alebo FCM), aby správa prišla na správne zariadenie. Token je viazaný na tvoj účet.</p>
      <p>Token vyprší pri odhlásení, alebo keď platforma token označí za neplatný. Neukladáme znak zariadenia bez aktívneho push odberu. Vypnutie je v nastaveniach aplikácie alebo na zariadení.</p>
      <h2>Doba uloženia</h2>
      <p>Údaje držíme, kým je účet aktívny. Ak účet zmažeš, všetky dáta sa hneď a trvalo zmažú.</p>
      <h2>Zmazanie účtu</h2>
      <p>Účet zmažeš v aplikácii v nastaveniach. Potvrdíš heslom alebo prihlásením tretej strany.</p>
      <p>Nedá sa to vrátiť. Zmizne účet dospelého, profily detí, plány, denné záznamy, hodnotenia, odmeny a pozvánky.</p>
      <h2>Uloženie a zabezpečenie</h2>
      <p>Snažíme sa držať hlavné dáta v EÚ/EHP, kde to platí. Niektorí dodávatelia môžu spracúvať mimo EHP. Odovzdanie a záruky sú v tomto texte a priebežne ich kontrolujeme. Spojenia sú šifrované (HTTPS). Heslá nie sú v čitateľnej podobe. Používame bcrypt.</p>
      <h2>Cookies</h2>
      <ul>
        <li><strong>Nevyhnutné cookies</strong> — vždy zapnuté. Relácia a ochrana CSRF pre bezpečné prihlásenie.</li>
        <li><strong>Predvoľby</strong> — uložené miestne, napríklad motív.</li>
        <li><strong>Štatistika a marketing</strong> — Google Analytics 4, Meta Pixel a Google Ads. Predvolene vypnuté, kým nesúhlasíš v oznámení o cookies.</li>
      </ul>
      <p>Tvoju voľbu držíme najviac jeden rok. Môžeš ju zmeniť v oznámení alebo v nastaveniach. Údaje o rutine dieťaťa nejdú na reklamné platformy.</p>
      <h2>Tvoje práva (GDPR)</h2>
      <ul>
        <li>Právo zmazať účet a dáta</li>
        <li>Právo na prístup</li>
        <li>Právo na opravu nesprávnych údajov</li>
        <li>Právo namietať alebo žiadať obmedzenie</li>
        <li>Právo podať sťažnosť švédskemu dozoru Integritetsskyddsmyndigheten (IMY), ak sa domnievaš, že porušujeme GDPR</li>
      </ul>
      <h2>Kontakt</h2>
      <p>Otázky k tomuto spracúvaniu? Použi <a href="/en/contact">kontaktný formulár</a>.</p>
    `,
  },
  terms: {
    title: 'Podmienky používania — My Starday',
    description: 'Podmienky používania My Starday: účet, deti, cena a zodpovednosť.',
    h1: 'Podmienky používania',
    ogTitle: 'Podmienky používania',
    body: `
      <p class="updated">Naposledy aktualizované: október 2026</p>
      <p>Ďakujeme, že používaš My Starday. Tieto podmienky majú byť jasné a úprimné. Otázky pošli cez <a href="/en/contact">kontaktný formulár</a>.</p>
      <h2>1. O službe</h2>
      <p>My Starday je digitálna služba pre rodiny, ktoré chcú štruktúrovaný denný plán, označiť postup dieťaťa hviezdami a nechať dieťa sledovať aktivity vo vlastnom pohľade. Služba je pre rodičov a zákonných zástupcov a ich deti. Rodina má aspoň jedného dospelého s účtom. Dieťa sa prihlási PINom v detskom pohľade.</p>
      <h2>2. Účet a zabezpečenie</h2>
      <ul>
        <li>Zvoľ silné heslo a nezdieľaj ho</li>
        <li>Chráň svoj e-mail. Tým získaš prístup späť</li>
        <li>PIN detského pohľadu je len pre dieťa a zákonných zástupcov</li>
        <li>Nepoužívaj aplikáciu spôsobom, ktorý je v rozpore so švédskym právom</li>
      </ul>
      <p>Zodpovedáš za všetko, čo sa stane pod tvojím účtom, aj keď ho použije niekto iný. Pri podozrení zo zneužitia sa hneď ozvi.</p>
      <h2>3. Deti a osobné údaje</h2>
      <p>My Starday spracúva údaje o deťoch. Riadime sa GDPR a zásadou minimalizácie údajov:</p>
      <ul>
        <li>Dieťa spoznáme podľa krstného mena a zvoleného emoji. Bez priezviska, bez rodného čísla, bez kontaktu</li>
        <li>Rodičia alebo zákonní zástupcovia údaje zadávajú a súhlasia so zdieľaním</li>
        <li>Údaje detí nepoužívame na reklamu ani na nič iné než službu</li>
        <li>Správy a plány sa zdieľajú len vtedy, keď dospelý sám zdieľa časovo obmedzený odkaz</li>
      </ul>
      <h2>4. Obsah, ktorý vytvoríš</h2>
      <p>Plány, odmeny, aktivity a pozorovania, ktoré pridáš, patria tebe alebo tvojej rodine. Dávaš nám právo ten obsah ukladať a zobrazovať, kým je účet aktívny. Nekopírujeme ho do reklamy, nepredávame ho a nepoužívame ho v marketingu.</p>
      <h2>5. Používanie</h2>
      <p>Služba je na osobné použitie v tvojej rodine. Nie je dovolené:</p>
      <ul>
        <li>Komerčné použitie bez dohody s Papa Bravo AB</li>
        <li>Meniť plány, hviezdy alebo odmeny mimo bežného chodu aplikácie</li>
        <li>Automatizované prostriedky, scrapery alebo boty proti službe</li>
        <li>Zverejňovať obsah, ktorý je protiprávny, urážlivý alebo škodlivý</li>
      </ul>
      <h2>6. Ukončenie a zmazanie</h2>
      <p>Účet môžeš kedykoľvek trvalo zmazať v nastaveniach aplikácie, potvrdené heslom.</p>
      <p>Zmazanie hneď a trvalo odstráni účet dospelého, všetky deti, plány, záznamy aktivít, hviezdy, odmeny a prípadné pozorovania.</p>
      <p>Môžeme zablokovať účet, ktorý poruší tieto podmienky alebo švédske právo.</p>
      <h2>7. Cena</h2>
      <p>Rodiny v Írsku a Kanade môžu My Starday používať zadarmo do 31. decembra 2026 vrátane. V tom období nie je platba potrebná. Bezplatné obdobie sa samo nestane predplatným. Od 1. januára 2027 si môžeš zvoliť predplatné v App Store alebo na Google Play. Na tejto stránke nie je webová pokladňa. V iných krajinách platí cena a prístup, ktoré aplikácia pre tú krajinu ukáže. Švédske rodiny, ktoré začnú od 3. októbra 2026, môžu aplikáciu skúšať 14 dní a potom v aplikácii zvoliť 59 švédskych korún mesačne alebo 590 švédskych korún ročne. Rodiny, ktoré už účet majú, si nechávajú existujúcu ponuku.</p>
      <h2>8. Zmeny</h2>
      <p>Tieto podmienky môžeme upraviť, napríklad po zmene zákona, novej funkcii alebo spresnení. Ak je zmena podstatná, povieme to e-mailom alebo oznámením v aplikácii.</p>
      <p>Ak službu používaš ďalej, platí to ako prijatie nových podmienok.</p>
      <h2>9. Zodpovednosť</h2>
      <p>My Starday sa poskytuje tak, ako je. Robíme, čo môžeme, aby služba bola stabilná a bezpečná, ale nemôžeme zaručiť, že bude vždy dostupná bez prerušenia.</p>
      <p>Papa Bravo AB nezodpovedá za:</p>
      <ul>
        <li>Stratu dát vyššou mocou</li>
        <li>Škodu preto, že PIN alebo prihlasovacie údaje zdieľaš s niekým, kto ich mať nemá</li>
        <li>Nepriamu škodu, stratenú príležitosť alebo stratené dáta, ak švédske právo nevyžaduje niečo iné</li>
      </ul>
      <p>Zodpovedáš za použitie podľa týchto podmienok a podľa švédskeho práva.</p>
      <h2>10. Kontakt</h2>
      <p>Otázky k týmto podmienkam alebo k službe? Použi <a href="/en/contact">kontaktný formulár</a>.</p>
    `,
  },
});

module.exports = { pageFor };
