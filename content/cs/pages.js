'use strict';

/**
 * Czech public pages. Written in Czech.
 * Legal text translates the verified baseline. It adds no Czech statute.
 */

const { composeLocale, faq } = require('../compose-pages');

const pageFor = composeLocale('cs', {
  marker: /dít|dět/i,
  market: {
    title: (name) => `My Starday — ${name}. Vizuální denní plány pro děti`,
    description: (name) => `Tržní stránka pro ${name}. Vizuální denní plány v češtině. Je to tržní stránka, ne samostatný jazykový web.`,
    h1: (name) => `Vizuální denní plány pro rodiny. Trh: ${name}`,
    lead: (name) => `Tohle je stránka pro ${name}. Český web zůstává jazykovým webem.`,
    registrationOpen: (name) => `Nové účty v zemi ${name} se řídí stávající registrací. Výchozí stav je otevřený.`,
    registrationClosed: (name) => `Nové účty v zemi ${name} nejsou ve výchozím stavu otevřené. Řídí se to stávající registrací, ne touto stránkou. Výchozí stav je zavřený.`,
    complimentary: (name) => `Pro ${name} platí stávající bezplatné období. Samo se nestane předplatným. Tahle stránka nestanovuje cenu.`,
    introYear: (name) => `${name} si nechává nabídku, která už je na švédském webu. Tahle stránka nestanovuje cenu. Na tomhle trhu není bezplatné období do 31. prosince 2026.`,
    trial: (name, days) => `Pokud tu účet později bude možný, platí stávající pravidlo mimo Švédsko, Irsko a Kanadu: zkušební doba ${days} dní. Platba musí být nejdřív dostupná. Na tomhle trhu není bezplatné období do 31. prosince 2026 a nic se samo nestane předplatným. Tahle stránka nestanovuje cenu.`,
    notTreatment: (name) => `Tlačítko otevře běžnou stránku App Store, ne vymyšlenou produktovou stránku pro ${name}. My Starday je vizuální denní plán. Není to léčba a neslibuje lékařský výsledek.`,
    register: 'Vytvořit účet',
    registerNote: 'Formulář se ptá, kde rodina bydlí. Tenhle odkaz sám nenastavuje zemi ani cenu.',
    how: 'Jak to funguje',
    playSoon: 'Google Play tu není otevřený jako samostatná stránka.',
  },
  home: {
    title: 'Vizuální denní plán pro děti – rutiny, odměny a piktogramy | My Starday',
    description: 'Vizuální denní plány a rutiny, které dítěti ukážou, co se děje teď a co přijde potom. Piktogramy, vlastní dětský pohled a hvězdy za hotové kroky.',
    h1: 'Vizuální denní plány a rutiny, které dítěti ukážou, co se děje teď a co přijde potom.',
    ogTitle: 'Vizuální denní plán pro děti',
    faqs: [
      faq('Co je My Starday?', 'Vizuální denní plán pro rodiny. Dítě vidí další krok. Dospělý si nechává nastavení.'),
      faq('Dají se hvězdy koupit?', 'Ne. Hvězda je za hotový krok. Koupit ji nejde.'),
      faq('Je to léčba?', 'Ne. My Starday je pomoc v běžném dni a neslibuje lékařský výsledek.'),
    ],
    lead: 'Dítě se zklidní, když je další krok vidět. My Starday ukazuje den v obrázcích: teď, potom, hotovo.',
    hSee: 'Co dítě vidí',
    see: 'Dětský pohled ukazuje jeden krok po druhém. Dospělý plán sestaví. Dítě odškrtává. Víc dětí může sdílet jednu domácnost, každé se svým plánem.',
    hStars: 'Hvězdy',
    stars: 'Hotový krok může dát hvězdu. Hvězdy se nekupují. Nenahrazují dohodu, kterou jste udělali předem. Víc je v',
    starsLink: 'systému odměn',
    hTreat: 'Žádná léčba',
    treat: 'Plán může pomoci dítěti, které potřebuje víc přehledu, i u ADHD nebo autismu, a stejně tak rodinám bez diagnózy. My Starday není léčba a neslibuje určitý výsledek.',
    marketsIntro: 'Český web vysvětluje produkt. Země je něco jiného. Vlastní stránka je pro',
    linkHow: 'Jak to funguje',
    linkVisual: 'Vizuální denní plán',
    linkMorning: 'Ranní rutina',
  },
  howItWorks: {
    title: 'Jak funguje My Starday | Vizuální denní plán',
    description: 'Dospělý sestaví den. Dítě vidí další krok a odškrtne ho. Hvězdy jsou za hotové kroky, ne na prodej.',
    h1: 'Jak funguje My Starday',
    ogTitle: 'Jak to funguje',
    faqs: [
      faq('Kdo nastavuje plán?', 'Dospělý. Dítě vidí dětský pohled a odškrtává kroky.'),
      faq('Potřebuje dítě e-mail?', 'Ne. Dítě se přihlásí jménem a PINem.'),
    ],
    lead: 'Ráno nesou tři věci: viditelný plán, dítě, které si samo odškrtává, a dospělý, který drží nastavení.',
    hPlan: '1. Plán',
    plan: 'Aktivity dáte do pořadí, které ráno opravdu má. Obrázky pomůžou, když dítě ještě nečte.',
    planLink: 'Vizuální denní plán ukazuje teď a potom',
    hChild: '2. Dětský pohled',
    child: 'Dítě vidí další krok, ne nastavení rodiny. Není tam reklama ani sociální síť.',
    hStar: '3. Hvězda',
    star: 'Dokončený krok může dát hvězdu. Hvězda se nekupuje. Dohoda stojí předem, ne uprostřed spěchu.',
    closing: 'My Starday je pomoc v běžném dni. Není to léčba a nenahrazuje radu lékaře, terapeuta nebo školy.',
  },
  visualSchedule: {
    title: 'Vizuální denní plán pro děti | My Starday',
    description: 'Vizuální denní plán ukáže dítěti, co se děje teď a co přijde potom. Málo kroků, známé obrázky, jasné pořadí.',
    h1: 'Vizuální denní plán pro děti',
    ogTitle: 'Vizuální denní plán',
    faqs: [
      faq('Kolik kroků?', 'Často stačí čtyři nebo pět. Delší seznam jde, když je pořadí už známé.'),
      faq('Fotky, nebo symboly?', 'Obrázky, které dítě už zná. Fotky z domova fungují dobře.'),
    ],
    lead: 'Vizuální denní plán udělá pořadí viditelné. Dítě nemusí hádat, co přijde potom.',
    hNow: 'Teď a potom',
    now: 'Ukažte jen aktuální krok a ten další. Dlouhý seznam na zdi pomůže míň než jasný další pohyb.',
    hStuck: 'Když se krok zasekne',
    stuck1: 'Rozdělte krok. „Obléct se“ jsou ponožky, kalhoty, tričko.',
    stuck2: 'Jeden po druhém.',
    stuck3: 'Ukažte, místo abyste opakovali.',
    bridge: 'Ráno je v centru',
    morningLink: 'ranní rutina',
    weekLink: 'Týdenní plán ukáže, který je den',
    closing: 'My Starday není léčba a neslibuje lékařský výsledek.',
  },
  morningRoutine: {
    title: 'Ranní rutina pro děti | My Starday',
    description: 'Ranní rutina s obrázky snižuje počet slovních připomínek. Stejné pořadí, den co den.',
    h1: 'Ranní rutina pro děti',
    ogTitle: 'Ranní rutina',
    faqs: [
      faq('Co patří do rána?', 'Jen to, co se opravdu stane před odchodem. Vstát, obléct se, jíst, zuby, bunda.'),
      faq('Co když je málo času?', 'Zkraťte seznam, místo abyste mluvili rychleji. Kratší plán je skutečný plán.'),
    ],
    lead: 'Stejné pořadí udělá ze seznamu zvyk. Místo dalšího „vyčisti si zuby“ se podíváte na další obrázek.',
    hExample: 'Příklad',
    steps: ['Vstát', 'Záchod a umýt ruce', 'Obléct se', 'Snídaně', 'Vyčistit zuby', 'Bunda, boty, taška'],
    age: 'Dítě v mateřské škole často zvládne líp čtyři nebo pět kroků.',
    bridge: 'Rodiny, které chtějí víc opory u přechodů, si můžou přečíst',
    bridgeLink: 'průvodce přehledem',
    closing: 'My Starday je opora ve dni, ne léčba.',
  },
  weeklySchedule: {
    title: 'Týdenní plán s piktogramy pro děti | My Starday',
    description: 'Týdenní plán s piktogramy ukáže, který je den, ne jen co se děje právě teď.',
    h1: 'Týdenní plán s piktogramy',
    ogTitle: 'Týdenní plán s piktogramy',
    faqs: [
      faq('Čím se liší od denního plánu?', 'Denní plán jsou dnešní kroky. Týdenní plán ukáže, jak se dny liší.'),
      faq('Od jakého věku?', 'Často kolem nástupu do školy, když se týden víc mění. Mladší dítě nejdřív potřebuje dnešek.'),
    ],
    lead: 'Týdenní plán pomůže, když se všední den a víkend liší, nebo když „co bude zítra?“ potřebuje odpověď před spaním.',
    mid: 'Pondělí se sportem, středa u druhého rodiče, pátek s filmem. Obrázky to ukážou dřív, než dítě čte kalendář.',
    dayLink: 'Denní plán',
    dayRest: 'jsou dnešní kroky. Týdenní plán řekne, který je den.',
    closing: 'My Starday neslibuje lékařský výsledek.',
  },
  neurodiverseRoutines: {
    title: 'Rutiny pro neurodivergentní děti | My Starday',
    description: 'Víc přehledu ve dni pro dítě, které potřebuje jasné přechody. My Starday je pomoc v běžném dni, ne léčba a ne diagnóza.',
    h1: 'Rutiny pro neurodivergentní děti',
    ogTitle: 'Rutiny pro neurodivergentní děti',
    faqs: [
      faq('Je to jen pro diagnózu?', 'Ne. Plán pomůže tam, kde je potřeba víc přehledu. Diagnóza není podmínka.'),
      faq('Nahrazuje to terapii?', 'Ne. Není to léčba a nenahrazuje radu odborníků.'),
    ],
    lead: 'Některé dítě potřebuje další krok vidět, ne slyšet hlasitěji. Platí to s diagnózou i bez ní.',
    hAdhd: 'ADHD: začít a u kroku zůstat',
    adhd: 'Přechod se často zasekne, protože další krok není vidět. Plán s odškrtnutím hned řekne: tenhle krok je hotový.',
    hAutism: 'Autismus: předvídatelnost',
    autism: 'Jiné pořadí může být velké.',
    weekLink: 'Týdenní plán',
    autismRest: 'ukáže předem, který den přijde. Škrtnutý krok se má změnit viditelně, ne tiše zmizet.',
    closing: 'My Starday je pomoc v běžném dni. Není to lékařská léčba a nenahrazuje radu lékaře, ergoterapeuta, logopeda nebo školy. Karty ve smyslu nejdřív, potom a hotovo ještě nejsou jako české PDF. Takové karty jsou inspirace, ne oficiální metoda a ne certifikace.',
  },
  rewardSystem: {
    title: 'Systém odměn pro děti | My Starday',
    description: 'Odměna, na které se dohodnete předem, je něco jiného než obchod v tu chvíli. Dítě si hvězdy zaslouží. Nekupují se.',
    h1: 'Systém odměn pro děti, aniž by se z toho stal obchod',
    ogTitle: 'Systém odměn pro děti',
    faqs: [
      faq('Je kartička s hvězdami úplatek?', 'Ne, když odměna stojí předem a váže se na něco, co dítě zvládne. Obchod se nabízí v tu chvíli, aby něco přestalo.'),
      faq('Kolik hvězd?', 'Začněte jednou hvězdou za hotový krok. Hvězdy se nekupují.'),
    ],
    lead: '„Není to jen úplatek?“ záleží na tom, kdy se dohodnete. Dohoda předem může kartu opřít o zvyk. Uprostřed zlosti se z ní stane smlouvání.',
    planLink: 'Ve vizuálním denním plánu',
    chain: 'je řetěz jednoduchý: vidět krok, udělat ho, odškrtnout, dostat hvězdu.',
    steps: [
      'Buďte konkrétní. Odměňte „čistí zuby bez připomínky“, ne „je hodné“.',
      'Ukažte postup.',
      'Počítejte pokus, ne jen dokonalé ráno.',
      'Nechte dítě myslet na odměně s vámi.',
      'Hvězdy zřeďte, když zvyk sedí.',
    ],
    closing: 'Hvězdy se nekupují. My Starday neslibuje lékařský výsledek.',
  },
  resources: {
    title: 'Materiály k vizuálním rutinám | My Starday',
    description: 'Co už v češtině je a co ještě není jako PDF. Aplikace a tištěný list jsou dvě různé věci.',
    h1: 'Materiály',
    ogTitle: 'Materiály',
    faqs: [faq('Jsou česká PDF?', 'Ještě ne. Tahle stránka neprodává švédské listy jako český překlad.')],
    lead: 'Aplikace ukazuje den na obrazovce. Tištěný list je něco jiného. Česká PDF tu ještě nejsou.',
    app: 'V aplikaci sestavíte',
    dayLink: 'denní plán',
    morningLink: 'ranní rutinu',
    weekLink: 'týdenní plán',
    appRest: 'Dítě vidí stejné pořadí v dětském pohledu.',
    nolink: 'Neodkazujeme na knihovnu v jiném jazyce, jako by byla česká. Až české listy přibudou, budou na téhle stránce.',
  },
  faq: {
    title: 'Časté otázky | My Starday',
    description: 'Krátké odpovědi o denním plánu, hvězdách, dětském pohledu, ceně a o tom, co My Starday není.',
    h1: 'Časté otázky',
    ogTitle: 'Časté otázky',
    faqs: [
      faq('Pro koho je web?', 'Český web vysvětluje produkt. Česko má vlastní tržní stránku. Jazyk zůstává čeština.'),
      faq('Můžu koupit hvězdy?', 'Ne.'),
      faq('Je to terapeutická aplikace?', 'Ne. Žádná léčba, žádný slíbený lékařský výsledek.'),
      faq('Kde založím účet?', 'Ve stávajícím formuláři. Ptá se, kde rodina bydlí. Tržní stránka zemi sama nenastaví.'),
    ],
    lead: 'Krátké odpovědi. Delší texty jsou v průvodcích.',
    hLang: 'Jazyk a země',
    lang: 'Tenhle web je v češtině. Zemi volíte zvlášť. Tržní stránka jazyk nemění a účet nezakládá.',
    hChild: 'Dítě',
    child: 'Dítě vidí plán a odškrtává. Nastavení, pozvánky a účet zůstávají u dospělého. Víc je v',
    howLink: 'Jak to funguje',
    hStars: 'Hvězdy',
    stars: 'Hvězdy jsou za hotové kroky. Nekupují se. Přečtěte si',
    starsLink: 'systém odměn',
  },
  privacy: {
    title: 'Zásady ochrany soukromí — My Starday',
    description: 'Jaká data My Starday zpracovává, co nesbíráme a jaká práva dává GDPR.',
    h1: 'Zásady ochrany soukromí pro My Starday',
    ogTitle: 'Zásady ochrany soukromí',
    body: `
      <p class="updated">Naposledy aktualizováno: říjen 2026</p>
      <p>Se soukromím zacházíme opatrně. My Starday sbírá co nejméně: jen to, co aplikace potřebuje, aby fungovala. Tvoje data neprodáváme a nepoužíváme je na cílenou reklamu. Předání mimo službu se stane jen tehdy, když si ho zvolíš sám, nebo když je potřeba, aby naši zpracovatelé službu provozovali.</p>
      <p><strong>Správce:</strong> Papa Bravo AB odpovídá za zpracování tvých osobních údajů. Ozveš se nám přes <a href="/en/contact">kontaktní formulář</a>.</p>
      <h2>Co sbíráme</h2>
      <p>Údaje zpracováváme na základě smlouvy, abychom mohli poskytnout aplikaci a funkce, ke kterým se přihlásíš. O dospělých a rodinách sbíráme:</p>
      <ul>
        <li><strong>E-mail</strong> — k přihlášení a zprávám o účtu</li>
        <li><strong>Jméno a příjmení</strong> — abychom účet poznali</li>
        <li><strong>Záznam aktivit</strong> — které aktivity byly hotové a kdy</li>
        <li><strong>Hvězdy</strong> — získané a uplatněné hvězdy</li>
        <li><strong>Plány a aktivity</strong> — to, co sám vytvoříš</li>
      </ul>
      <p><strong>Soukromí dítěte:</strong> dítě poznáme jen podle křestního jména nebo přezdívky a zvoleného emoji. Nesbíráme příjmení, rodné číslo ani kontakt dítěte.</p>
      <h2>Co nesbíráme</h2>
      <ul>
        <li>Žádná příjmení dětí</li>
        <li>Žádná rodná čísla, ani dospělých, ani dětí</li>
        <li>Žádné údaje o zdraví, diagnóze nebo postižení dítěte</li>
        <li>Žádné platební údaje. Nákupy jdou přes App Store nebo Google Play</li>
        <li>Žádné údaje o poloze</li>
      </ul>
      <h2>K čemu údaje používáme</h2>
      <ul>
        <li>Ukázat dítěti denní plán</li>
        <li>Uložit postup a hvězdy</li>
        <li>Poslat potvrzovací e-mail a zprávy o účtu</li>
        <li>Odpovědět na zprávy, které nám pošleš</li>
      </ul>
      <h2>Předání</h2>
      <p>Tvoje údaje nepředáváme pro reklamu. Tihle zpracovatelé službu provozují. Zpracovávají jen podle našeho pokynu a podle GDPR:</p>
      <ul>
        <li><strong>Neon (databáze)</strong> — účet, plány, aktivity a údaje rodiny</li>
        <li><strong>Vlastní hosting (VPS v EU/EHP)</strong> — webová aplikace a API</li>
        <li><strong>Resend (e-mail)</strong> — transakční pošta, například potvrzení, heslo a uvítací e-mail</li>
        <li><strong>Cloudflare R2</strong> — nahrané profilové fotky, když funkci použiješ</li>
        <li><strong>Apple a Google</strong> — přihlášení a push zprávy přes APNs a FCM, když funkce použiješ</li>
      </ul>
      <h2>Zpráva ke schůzce</h2>
      <p>Když jako zákonný zástupce vytvoříš časově omezený odkaz na výběr čísel o aktivitách a odměnách, můžeš ho sdílet, třeba s učitelem nebo terapeutem. Stane se to jen proto, že si to zvolíš. Obsah určuješ ty a odkaz můžeš odvolat. Příjemce účet nepotřebuje.</p>
      <p>Chráníš-li odkaz kódem, nesdílej kód ve stejné zprávě jako odkaz.</p>
      <h2>Přihlášení přes Apple nebo Google</h2>
      <ul>
        <li><strong>Přihlášení Apple:</strong> zpracováváme jméno a e-mail. Zvolíš-li skrýt e-mail, uložíme jedinečnou přeposílací adresu, kterou Apple vytvoří, abychom mohli posílat zprávy o účtu.</li>
        <li><strong>Přihlášení Google:</strong> dostaneme a uložíme e-mail a jméno účtu Google, abychom vytvořili profil.</li>
      </ul>
      <p>Vlastní zpracování Apple a Google se řídí jejich zásadami.</p>
      <h2>Push zprávy a token zařízení</h2>
      <p>Zapneš-li push zprávy, uložíme na základě tvého souhlasu jedinečný token zařízení (APNs nebo FCM), aby zpráva přišla na správné zařízení. Token je vázaný na tvůj účet.</p>
      <p>Token vyprší při odhlášení, nebo když platforma token označí za neplatný. Neukládáme znak zařízení bez aktivního push odběru. Vypnutí je v nastavení aplikace nebo na zařízení.</p>
      <h2>Doba uložení</h2>
      <p>Údaje držíme, dokud je účet aktivní. Smažeš-li účet, všechna data se hned a trvale smažou.</p>
      <h2>Smazání účtu</h2>
      <p>Účet smažeš v aplikaci v nastavení. Potvrdíš heslem nebo přihlášením třetí strany.</p>
      <p>Nejde to vrátit. Zmizí účet dospělého, profily dětí, plány, denní záznamy, hodnocení, odměny a pozvánky.</p>
      <h2>Uložení a zabezpečení</h2>
      <p>Snažíme se držet hlavní data v EU/EHP, kde to platí. Někteří dodavatelé mohou zpracovávat mimo EHP. Předání a záruky jsou v tomhle textu a průběžně je kontrolujeme. Spojení jsou šifrovaná (HTTPS). Hesla nejsou v čitelné podobě. Používáme bcrypt.</p>
      <h2>Cookies</h2>
      <ul>
        <li><strong>Nezbytné cookies</strong> — vždy zapnuté. Relace a ochrana CSRF pro bezpečné přihlášení.</li>
        <li><strong>Předvolby</strong> — uložené místně, třeba motiv.</li>
        <li><strong>Statistika a marketing</strong> — Google Analytics 4, Meta Pixel a Google Ads. Ve výchozím stavu vypnuté, dokud nesouhlasíš v oznámení o cookies.</li>
      </ul>
      <p>Tvoji volbu držíme nejvýš jeden rok. Můžeš ji změnit v oznámení nebo v nastavení. Údaje o rutině dítěte nejdou na reklamní platformy.</p>
      <h2>Tvá práva (GDPR)</h2>
      <ul>
        <li>Právo smazat účet a data</li>
        <li>Právo na přístup</li>
        <li>Právo na opravu nesprávných údajů</li>
        <li>Právo vznést námitku nebo žádat omezení</li>
        <li>Právo podat stížnost švédskému dohledu Integritetsskyddsmyndigheten (IMY), pokud se domníváš, že porušujeme GDPR</li>
      </ul>
      <h2>Kontakt</h2>
      <p>Otázky k tomuhle zpracování? Použij <a href="/en/contact">kontaktní formulář</a>.</p>
    `,
  },
  terms: {
    title: 'Podmínky použití — My Starday',
    description: 'Podmínky používání My Starday: účet, děti, cena a odpovědnost.',
    h1: 'Podmínky použití',
    ogTitle: 'Podmínky použití',
    body: `
      <p class="updated">Naposledy aktualizováno: říjen 2026</p>
      <p>Díky, že používáš My Starday. Tyhle podmínky mají být jasné a poctivé. Otázky pošli přes <a href="/en/contact">kontaktní formulář</a>.</p>
      <h2>1. O službě</h2>
      <p>My Starday je digitální služba pro rodiny, které chtějí strukturovaný denní plán, označit postup dítěte hvězdami a nechat dítě sledovat aktivity ve vlastním pohledu. Služba je pro rodiče a zákonné zástupce a jejich děti. Rodina má aspoň jednoho dospělého s účtem. Dítě se přihlásí PINem v dětském pohledu.</p>
      <h2>2. Účet a zabezpečení</h2>
      <ul>
        <li>Zvol silné heslo a nesdílej ho</li>
        <li>Chraň svůj e-mail. Tím získáš přístup zpět</li>
        <li>PIN dětského pohledu je jen pro dítě a zákonné zástupce</li>
        <li>Nepoužívej aplikaci způsobem, který je v rozporu se švédským právem</li>
      </ul>
      <p>Odpovídáš za vše, co se stane pod tvým účtem, i když ho použije někdo jiný. Při podezření na zneužití se hned ozvi.</p>
      <h2>3. Děti a osobní údaje</h2>
      <p>My Starday zpracovává údaje o dětech. Řídíme se GDPR a zásadou minimalizace dat:</p>
      <ul>
        <li>Dítě poznáme podle křestního jména a zvoleného emoji. Bez příjmení, bez rodného čísla, bez kontaktu</li>
        <li>Rodiče nebo zákonní zástupci údaje zadávají a souhlasí se sdílením</li>
        <li>Údaje dětí nepoužíváme na reklamu ani na nic jiného než službu</li>
        <li>Zprávy a plány se sdílejí jen tehdy, když dospělý sám sdílí časově omezený odkaz</li>
      </ul>
      <h2>4. Obsah, který vytvoříš</h2>
      <p>Plány, odměny, aktivity a pozorování, které přidáš, patří tobě nebo tvé rodině. Dáváš nám právo ten obsah ukládat a zobrazovat, dokud je účet aktivní. Nekopírujeme ho do reklamy, neprodáváme ho a nepoužíváme ho v marketingu.</p>
      <h2>5. Používání</h2>
      <p>Služba je pro osobní použití v tvé rodině. Není dovoleno:</p>
      <ul>
        <li>Komerční použití bez dohody s Papa Bravo AB</li>
        <li>Měnit plány, hvězdy nebo odměny mimo běžný chod aplikace</li>
        <li>Automatizované prostředky, scrapery nebo boty proti službě</li>
        <li>Zveřejňovat obsah, který je protiprávní, urážlivý nebo škodlivý</li>
      </ul>
      <h2>6. Ukončení a smazání</h2>
      <p>Účet můžeš kdykoli trvale smazat v nastavení aplikace, potvrzené heslem.</p>
      <p>Smazání hned a trvale odstraní účet dospělého, všechny děti, plány, záznamy aktivit, hvězdy, odměny a případná pozorování.</p>
      <p>Můžeme zablokovat účet, který poruší tyhle podmínky nebo švédské právo.</p>
      <h2>7. Cena</h2>
      <p>Rodiny v Irsku a Kanadě mohou My Starday používat zdarma do 31. prosince 2026 včetně. V tom období není platba potřeba. Bezplatné období se samo nestane předplatným. Od 1. ledna 2027 si můžeš zvolit předplatné v App Store nebo na Google Play. Na téhle stránce není webová pokladna. V jiných zemích platí cena a přístup, které aplikace pro tu zemi ukáže. Švédské rodiny, které začnou od 3. října 2026, mohou aplikaci zkoušet 14 dní a potom v aplikaci zvolit 59 švédských korun měsíčně nebo 590 švédských korun ročně. Rodiny, které už účet mají, si nechávají stávající nabídku.</p>
      <h2>8. Změny</h2>
      <p>Tyhle podmínky můžeme upravit, třeba po změně zákona, nové funkci nebo upřesnění. Je-li změna podstatná, řekneme to e-mailem nebo oznámením v aplikaci.</p>
      <p>Používáš-li službu dál, platí to jako přijetí nových podmínek.</p>
      <h2>9. Odpovědnost</h2>
      <p>My Starday se poskytuje, jak stojí a leží. Děláme, co můžeme, aby služba byla stabilní a bezpečná, ale nemůžeme zaručit, že bude vždy dostupná bez přerušení.</p>
      <p>Papa Bravo AB neodpovídá za:</p>
      <ul>
        <li>Ztrátu dat vyšší mocí</li>
        <li>Škodu proto, že PIN nebo přihlašovací údaje sdílíš s někým, kdo je mít nemá</li>
        <li>Nepřímou škodu, ztracenou příležitost nebo ztracená data, pokud švédské právo nevyžaduje něco jiného</li>
      </ul>
      <p>Odpovídáš za použití podle těchto podmínek a podle švédského práva.</p>
      <h2>10. Kontakt</h2>
      <p>Otázky k těmhle podmínkám nebo ke službě? Použij <a href="/en/contact">kontaktní formulář</a>.</p>
    `,
  },
});

module.exports = { pageFor };
