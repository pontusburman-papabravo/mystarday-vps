'use strict';

/**
 * Hungarian public pages. Written in Hungarian.
 * Legal text translates the verified baseline. It adds no Hungarian statute.
 */

const { composeLocale, faq } = require('../compose-pages');

const pageFor = composeLocale('hu', {
  marker: /gyerek/i,
  market: {
    title: (name) => `My Starday — ${name}. Képi napirend gyerekeknek`,
    description: (name) => `Piaci oldal: ${name}. Képi napirend magyarul. Ez piaci oldal, nem külön nyelvi webhely.`,
    h1: (name) => `Képi napirend családoknak. Piac: ${name}`,
    lead: (name) => `Ez az oldal ehhez tartozik: ${name}. A magyar webhely nyelvi webhely marad.`,
    registrationOpen: (name) => `Az új fiókok itt: ${name}, a meglévő regisztrációt követik. Az alapállapot nyitott.`,
    registrationClosed: (name) => `Az új fiókok itt: ${name}, alapból nincsenek nyitva. Ez a meglévő regisztrációt követi, nem ezt az oldalt. Az alapállapot zárt.`,
    complimentary: (name) => `${name} esetében a meglévő díjmentes időszak érvényes. Magától nem lesz előfizetés. Ez az oldal nem szab árat.`,
    introYear: (name) => `${name} megtartja az ajánlatot, amely már a svéd webhelyen szerepel. Ez az oldal nem szab árat. Ezen a piacon nincs díjmentes időszak 2026. december 31-ig.`,
    trial: (name, days) => `Ha később itt lehetséges lesz fiók, a Svédországon, Írországon és Kanadán kívüli meglévő szabály érvényes: ${days} napos próba. A fizetésnek előbb elérhetőnek kell lennie. Ezen a piacon nincs díjmentes időszak 2026. december 31-ig, és semmi nem lesz magától előfizetés. Ez az oldal nem szab árat.`,
    notTreatment: (name) => `A gomb a szokásos App Store-oldalt nyitja, nem kitalált termékoldalt ehhez: ${name}. A My Starday képi napirend. Nem kezelés, és nem ígér orvosi eredményt.`,
    register: 'Fiók létrehozása',
    registerNote: 'Az űrlap megkérdezi, hol lakik a család. Ez a link maga nem állít országot és nem szab árat.',
    how: 'Így működik',
    playSoon: 'A Google Play itt nincs külön oldalként megnyitva.',
  },
  home: {
    title: 'Képi napirend gyerekeknek – rutinok, jutalmak és piktogramok | My Starday',
    description: 'Képi napirend és rutinok, amelyek megmutatják a gyereknek, mi történik most, és mi jön utána. Piktogramok, saját gyerek nézet és csillagok a kész lépésekért.',
    h1: 'Képi napirend és rutinok, amelyek megmutatják a gyereknek, mi történik most, és mi jön utána.',
    ogTitle: 'Képi napirend gyerekeknek',
    faqs: [
      faq('Mi a My Starday?', 'Képi napirend családoknak. A gyerek látja a következő lépést. A felnőtt tartja a beállításokat.'),
      faq('Megvehetők a csillagok?', 'Nem. A csillag egy kész lépésért jár. Nem lehet megvenni.'),
      faq('Ez kezelés?', 'Nem. A My Starday segítség a hétköznapban, és nem ígér orvosi eredményt.'),
    ],
    lead: 'A gyerek megnyugszik, ha a következő lépés látszik. A My Starday képekben mutatja a napot: most, utána, kész.',
    hSee: 'Amit a gyerek lát',
    see: 'A gyerek nézet egy lépést mutat egyszerre. A felnőtt rakja össze a tervet. A gyerek pipál. Több gyerek osztozhat egy háztartáson, mindegyik a saját tervével.',
    hStars: 'Csillagok',
    stars: 'Egy kész lépés adhat egy csillagot. A csillagokat nem lehet megvenni. Nem helyettesítik a megállapodást, amit előre kötöttetek. Erről több van itt:',
    starsLink: 'jutalomrendszer',
    hTreat: 'Nem kezelés',
    treat: 'A terv segíthet annak a gyereknek, akinek több áttekintés kell, ADHD vagy autizmus mellett is, és ugyanígy a diagnózis nélküli családoknak. A My Starday nem kezelés, és nem ígér meghatározott eredményt.',
    marketsIntro: 'A magyar webhely a terméket magyarázza. Az ország külön dolog. Saját oldal van ehhez:',
    linkHow: 'Így működik',
    linkVisual: 'Képi napirend',
    linkMorning: 'Reggeli rutin',
  },
  howItWorks: {
    title: 'Így működik a My Starday | Képi napirend',
    description: 'A felnőtt rakja össze a napot. A gyerek látja a következő lépést, és pipálja. A csillagok kész lépésekért járnak, nem vásárlásért.',
    h1: 'Így működik a My Starday',
    ogTitle: 'Így működik',
    faqs: [
      faq('Ki állítja be a tervet?', 'Egy felnőtt. A gyerek a gyerek nézetet látja, és pipálja a lépéseket.'),
      faq('Kell a gyereknek e-mail?', 'Nem. A gyerek névvel és PIN-kóddal jelentkezik be.'),
    ],
    lead: 'A reggelt három dolog viszi: látható terv, gyerek, aki maga pipál, és felnőtt, aki tartja a beállításokat.',
    hPlan: '1. A terv',
    plan: 'A tevékenységeket abba a sorrendbe teszitek, ami a reggelben tényleg van. A képek segítenek, ha a gyerek még nem olvas.',
    planLink: 'A képi napirend mutatja a mostot és az utánt',
    hChild: '2. A gyerek nézet',
    child: 'A gyerek a következő lépést látja, nem a család beállításait. Nincs reklám és nincs közösségi háló.',
    hStar: '3. A csillag',
    star: 'Egy befejezett lépés adhat egy csillagot. A csillagot nem lehet megvenni. A megállapodás előre áll, nem a kapkodás közepén.',
    closing: 'A My Starday segítség a hétköznapban. Nem kezelés, és nem helyettesíti az orvos, a terapeuta vagy az iskola tanácsát.',
  },
  visualSchedule: {
    title: 'Képi napirend gyerekeknek | My Starday',
    description: 'A képi napirend megmutatja a gyereknek, mi történik most, és mi jön utána. Kevés lépés, ismert képek, tiszta sorrend.',
    h1: 'Képi napirend gyerekeknek',
    ogTitle: 'Képi napirend',
    faqs: [
      faq('Hány lépés?', 'Gyakran négy vagy öt elég. Hosszabb lista megy, ha a sorrend már ismert.'),
      faq('Fotók vagy jelek?', 'Képek, amelyeket a gyerek már ismer. Az otthoni fotók jól működnek.'),
    ],
    lead: 'A képi napirend láthatóvá teszi a sorrendet. A gyereknek nem kell találgatnia, mi jön utána.',
    hNow: 'Most és utána',
    now: 'Csak az aktuális lépést és a következőt mutassátok. A falon lévő hosszú lista kevesebbet segít, mint egy tiszta következő mozdulat.',
    hStuck: 'Ha egy lépés elakad',
    stuck1: 'Osszátok a lépést. Az „öltözés” zokni, nadrág, póló.',
    stuck2: 'Egyenként.',
    stuck3: 'Mutassátok, ahelyett hogy ismételnétek.',
    bridge: 'Reggel a középpontban van',
    morningLink: 'a reggeli rutin',
    weekLink: 'A heti terv megmutatja, melyik nap van',
    closing: 'A My Starday nem kezelés, és nem ígér orvosi eredményt.',
  },
  morningRoutine: {
    title: 'Reggeli rutin gyerekeknek | My Starday',
    description: 'A képekkel kísért reggeli rutin csökkenti a kimondott emlékeztetőket. Ugyanaz a sorrend, napról napra.',
    h1: 'Reggeli rutin gyerekeknek',
    ogTitle: 'Reggeli rutin',
    faqs: [
      faq('Mi tartozik a reggelhez?', 'Csak az, ami tényleg megtörténik az ajtó előtt. Felkelni, öltözni, enni, fogak, kabát.'),
      faq('Mi van, ha szűk az idő?', 'Rövidítsétek a listát, ahelyett hogy gyorsabban beszélnétek. A rövidebb terv igazi terv.'),
    ],
    lead: 'Ugyanaz a sorrend szokássá teszi a listát. Ahelyett hogy még egyszer azt mondanátok, „mosd meg a fogad”, a következő képre néztek.',
    hExample: 'Példa',
    steps: ['Felkelni', 'Mosdó és kézmosás', 'Öltözés', 'Reggeli', 'Fogmosás', 'Kabát, cipő, táska'],
    age: 'Egy óvodás gyerek gyakran négy vagy öt lépéssel boldogul jobban.',
    bridge: 'Azok a családok, akik az átmeneteknél több támaszt keresnek, elolvashatják',
    bridgeLink: 'az áttekintésről szóló útmutatót',
    closing: 'A My Starday támasz a napban, nem kezelés.',
  },
  weeklySchedule: {
    title: 'Heti terv piktogramokkal gyerekeknek | My Starday',
    description: 'A piktogramos heti terv megmutatja, melyik nap van, nem csak azt, ami éppen történik.',
    h1: 'Heti terv piktogramokkal',
    ogTitle: 'Heti terv piktogramokkal',
    faqs: [
      faq('Miben más, mint a napirend?', 'A napirend a mai lépések. A heti terv megmutatja, miben térnek el a napok.'),
      faq('Milyen kortól?', 'Gyakran az iskola kezdete körül, amikor a hét jobban vált. Egy fiatalabb gyereknek először a mai nap kell.'),
    ],
    lead: 'A heti terv segít, ha a hétköznap és a hétvége más, vagy ha a „mi lesz holnap?” kérdésre alvás előtt kell válasz.',
    mid: 'Hétfőn sport, szerdán a másik szülőnél, pénteken film. A képek ezt láthatóvá teszik, mielőtt a gyerek naptárt olvas.',
    dayLink: 'A napirend',
    dayRest: 'a mai lépések. A heti terv megmondja, melyik nap van.',
    closing: 'A My Starday nem ígér orvosi eredményt.',
  },
  neurodiverseRoutines: {
    title: 'Rutinok neurodivergens gyerekeknek | My Starday',
    description: 'Több áttekintés a napban annak a gyereknek, akinek tiszta átmenetek kellenek. A My Starday segítség a hétköznapban, nem kezelés és nem diagnózis.',
    h1: 'Rutinok neurodivergens gyerekeknek',
    ogTitle: 'Rutinok neurodivergens gyerekeknek',
    faqs: [
      faq('Ez csak diagnózisra való?', 'Nem. A terv ott segít, ahol több áttekintés kell. A diagnózis nem feltétel.'),
      faq('Helyettesíti a terápiát?', 'Nem. Nem kezelés, és nem helyettesíti a szakember tanácsát.'),
    ],
    lead: 'Van gyerek, akinek a következő lépést látnia kell, nem hangosabban hallania. Ez diagnózissal és anélkül is igaz.',
    hAdhd: 'ADHD: elindulni és a lépésnél maradni',
    adhd: 'A váltás gyakran megáll, mert a következő lépés nem látszik. A pipás terv azonnal jelzi: ez a lépés kész.',
    hAutism: 'Autizmus: kiszámíthatóság',
    autism: 'Más sorrend nagy lehet.',
    weekLink: 'A heti terv',
    autismRest: 'előre megmutatja, melyik nap jön. A kihúzott lépésnek láthatóan kell változnia, nem csendben eltűnnie.',
    closing: 'A My Starday segítség a hétköznapban. Nem orvosi kezelés, és nem helyettesíti az orvos, a gyógytornász, a logopédus vagy az iskola tanácsát. Az először, aztán és kész értelmű kártyák még nincsenek magyar PDF-ként. Az ilyen kártyák ihletet adnak, nem hivatalos módszer és nem tanúsítvány.',
  },
  rewardSystem: {
    title: 'Jutalomrendszer gyerekeknek | My Starday',
    description: 'Az előre megbeszélt jutalom más, mint az alkudozás a pillanatban. A gyerek a csillagokat kiérdemli. Nem lehet megvenni őket.',
    h1: 'Jutalomrendszer gyerekeknek, anélkül hogy alkuvá válna',
    ogTitle: 'Jutalomrendszer gyerekeknek',
    faqs: [
      faq('A csillagos kártya megvesztegetés?', 'Nem, ha a jutalom előre áll, és olyasmihez kötődik, amit a gyerek meg tud tenni. Az alkut a pillanatban ajánlják, hogy valami abbamaradjon.'),
      faq('Hány csillag?', 'Kezdjétek egy csillaggal kész lépésenként. A csillagokat nem lehet megvenni.'),
    ],
    lead: '„Ez nem csak megvesztegetés?” attól függ, mikor egyeztek meg. Az előre kötött megállapodás szokást támaszthat. A düh közepén alkuvá válik.',
    planLink: 'A képi napirendben',
    chain: 'a lánc egyszerű: látni a lépést, megtenni, pipálni, csillagot kapni.',
    steps: [
      'Legyetek konkrétak. Azt jutalmazzátok, hogy „fogat mos emlékeztető nélkül”, ne azt, hogy „jó”.',
      'Mutassátok a haladást.',
      'A próbálkozást számoljátok, ne csak a tökéletes reggelt.',
      'A gyerek gondolkodjon együtt a jutalomról.',
      'Ritkítsátok a csillagokat, ha a szokás megvan.',
    ],
    closing: 'A csillagokat nem lehet megvenni. A My Starday nem ígér orvosi eredményt.',
  },
  resources: {
    title: 'Anyagok a képi rutinokhoz | My Starday',
    description: 'Ami magyarul már megvan, és ami még nincs PDF-ként. Az alkalmazás és a nyomtatott lap két különböző dolog.',
    h1: 'Anyagok',
    ogTitle: 'Anyagok',
    faqs: [faq('Vannak magyar PDF-ek?', 'Még nincsenek. Ez az oldal nem árul svéd lapokat magyar fordításként.')],
    lead: 'Az alkalmazás a képernyőn mutatja a napot. A nyomtatott lap más. Magyar PDF még nincs itt.',
    app: 'Az alkalmazásban összerakjátok',
    dayLink: 'a napirendet',
    morningLink: 'a reggeli rutint',
    weekLink: 'a heti tervet',
    appRest: 'A gyerek ugyanazt a sorrendet látja a gyerek nézetben.',
    nolink: 'Nem linkelünk más nyelvű gyűjteményt úgy, mintha magyar lenne. Ha a magyar lapok megjönnek, ezen az oldalon lesznek.',
  },
  faq: {
    title: 'Gyakori kérdések | My Starday',
    description: 'Rövid válaszok a napirendről, a csillagokról, a gyerek nézetről, az árról, és arról, mi nem a My Starday.',
    h1: 'Gyakori kérdések',
    ogTitle: 'Gyakori kérdések',
    faqs: [
      faq('Kinek szól a webhely?', 'A magyar webhely a terméket magyarázza. Magyarországnak saját piaci oldala van. A nyelv magyar marad.'),
      faq('Vehetek csillagokat?', 'Nem.'),
      faq('Ez terápiás alkalmazás?', 'Nem. Nincs kezelés, nincs ígért orvosi eredmény.'),
      faq('Hol hozok létre fiókot?', 'A meglévő űrlapon. Megkérdezi, hol lakik a család. A piaci oldal maga nem állítja be az országot.'),
    ],
    lead: 'A rövid válaszok. A hosszabb szövegek az útmutatókban vannak.',
    hLang: 'Nyelv és ország',
    lang: 'Ez a webhely magyarul van. Az országot külön választjátok. A piaci oldal nem vált nyelvet, és nem hoz létre fiókot.',
    hChild: 'A gyerek',
    child: 'A gyerek látja a tervet, és pipál. A beállítások, a meghívók és a fiók a felnőttnél marad. Erről több van itt:',
    howLink: 'Így működik',
    hStars: 'Csillagok',
    stars: 'A csillagok kész lépésekért járnak. Nem lehet megvenni őket. Olvasd el',
    starsLink: 'a jutalomrendszert',
  },
  privacy: {
    title: 'Adatvédelmi tájékoztató — My Starday',
    description: 'Milyen adatot kezel a My Starday, mit nem gyűjtünk, és milyen jogokat ad a GDPR.',
    h1: 'Adatvédelmi tájékoztató a My Stardayhoz',
    ogTitle: 'Adatvédelmi tájékoztató',
    body: `
      <p class="updated">Utolsó frissítés: 2026. október</p>
      <p>A magánszféráddal gondosan bánunk. A My Starday a lehető legkevesebbet gyűjti: csak azt, amire az alkalmazásnak a működéshez szüksége van. Az adataidat nem adjuk el, és nem használjuk célzott reklámra. A szolgáltatáson kívüli továbbítás csak akkor történik, ha te választod, vagy ha kell ahhoz, hogy az adatfeldolgozóink a szolgáltatást működtessék.</p>
      <p><strong>Adatkezelő:</strong> a Papa Bravo AB felel a személyes adataid kezeléséért. A <a href="/en/contact">kapcsolati űrlapon</a> érsz el minket.</p>
      <h2>Mit gyűjtünk</h2>
      <p>Az adatokat a szerződés alapján kezeljük, hogy az alkalmazást és azokat a funkciókat adjuk, amelyekre feliratkozol. Felnőttekről és családokról ezeket gyűjtjük:</p>
      <ul>
        <li><strong>E-mail-cím</strong> — a belépéshez és a fióküzenetekhez</li>
        <li><strong>Vezeték- és utónév</strong> — hogy a fiókot felismerjük</li>
        <li><strong>Tevékenységnapló</strong> — mely tevékenységek készültek el, és mikor</li>
        <li><strong>Csillagok</strong> — megszerzett és beváltott csillagok</li>
        <li><strong>Tervek és tevékenységek</strong> — amit te magad hozol létre</li>
      </ul>
      <p><strong>A gyerek magánszférája:</strong> a gyereket csak utónév vagy becenév és egy választott emoji azonosítja. Nem gyűjtünk vezetéknevet, azonosító számot és a gyerek elérhetőségét.</p>
      <h2>Mit nem gyűjtünk</h2>
      <ul>
        <li>Gyerekek vezetéknevét nem</li>
        <li>Azonosító számot nem, sem felnőttét, sem gyerekét</li>
        <li>A gyerek egészségéről, diagnózisáról vagy fogyatékosságáról szóló adatot nem</li>
        <li>Fizetési adatot nem. A vásárlás az App Store-on vagy a Google Playen megy</li>
        <li>Helyadatot nem</li>
      </ul>
      <h2>Mire használjuk az adatot</h2>
      <ul>
        <li>Megmutatni a gyereknek a napirendet</li>
        <li>Elmenteni a haladást és a csillagokat</li>
        <li>Megerősítő e-mailt és fióküzenetet küldeni</li>
        <li>Válaszolni az üzenetekre, amelyeket nekünk küldesz</li>
      </ul>
      <h2>Továbbítás</h2>
      <p>Az adataidat reklámcélra nem adjuk tovább. Ezek az adatfeldolgozók működtetik a szolgáltatást. Csak a megbízásunk szerint és a GDPR szerint kezelnek:</p>
      <ul>
        <li><strong>Neon (adatbázis)</strong> — fiók, tervek, tevékenységek és családi adatok</li>
        <li><strong>Saját tárhely (VPS az EU-ban vagy az EGT-ben)</strong> — a webes alkalmazás és az API</li>
        <li><strong>Resend (e-mail)</strong> — tranzakciós levél, például megerősítés, jelszó és üdvözlő levél</li>
        <li><strong>Cloudflare R2</strong> — feltöltött profilképek, ha a funkciót használod</li>
        <li><strong>Apple és Google</strong> — belépés és push-üzenet APNs-en és FCM-en, ha a funkciókat használod</li>
      </ul>
      <h2>Jelentés egy beszélgetéshez</h2>
      <p>Ha gondviselőként időben korlátozott linket készítesz kiválasztott tevékenység- és jutalomszámokról, megoszthatod például egy tanárral vagy terapeutával. Ez csak azért történik, mert te választod. A tartalmat te határozod meg, és a linket visszavonhatod. A címzettnek nincs szüksége fiókra.</p>
      <p>Ha a linket kóddal véded, a kódot ne ugyanabban az üzenetben oszd meg, mint a linket.</p>
      <h2>Belépés Apple-lel vagy Google-lel</h2>
      <ul>
        <li><strong>Belépés Apple-lel:</strong> a nevet és az e-mail-címet kezeljük. Ha az e-mail elrejtését választod, azt az egyedi továbbító címet mentjük, amelyet az Apple létrehoz, hogy fióküzenetet küldhessünk.</li>
        <li><strong>Belépés Google-lel:</strong> megkapjuk és mentjük a Google-fiók e-mail-címét és nevét, hogy a profilt létrehozzuk.</li>
      </ul>
      <p>Az Apple és a Google saját kezelésére a saját tájékoztatójuk vonatkozik.</p>
      <h2>Push-üzenetek és eszköz-token</h2>
      <p>Ha bekapcsolod a push-üzeneteket, a hozzájárulásod alapján egyedi eszköz-tokent mentünk (APNs vagy FCM), hogy az üzenet a megfelelő eszközre érjen. A token a fiókodhoz kötődik.</p>
      <p>A token kijelentkezéskor lejár, vagy amikor a platform érvénytelennek jelzi. Eszközjellemzőt aktív push-előfizetés nélkül nem mentünk. A kikapcsolás az alkalmazás beállításaiban vagy az eszközön van.</p>
      <h2>Megőrzési idő</h2>
      <p>Az adatot addig őrizzük, amíg a fiók aktív. Ha törlöd a fiókot, minden adat azonnal és véglegesen törlődik.</p>
      <h2>Fiók törlése</h2>
      <p>A fiókot az alkalmazásban, a beállításokban törlöd. Jelszóval vagy harmadik fél belépésével erősíted meg.</p>
      <p>Ez nem vonható vissza. Eltűnik a felnőtt fiókja, a gyerekprofilok, a tervek, a napi naplók, az értékelések, a jutalmak és a meghívók.</p>
      <h2>Tárolás és biztonság</h2>
      <p>Arra törekszünk, hogy az alapadatot az EU-ban vagy az EGT-ben tároljuk, ahol ez érvényes. Egyes szolgáltatók az EGT-n kívül is kezelhetnek. Az adattovábbítás és a garanciák ebben a szövegben vannak, és folyamatosan ellenőrizzük őket. A kapcsolatok titkosítottak (HTTPS). A jelszavak nem olvasható formában vannak. Bcryptet használunk.</p>
      <h2>Sütik</h2>
      <ul>
        <li><strong>Szükséges sütik</strong> — mindig bekapcsolva. Munkamenet és CSRF-védelem a biztonságos belépéshez.</li>
        <li><strong>Beállítások</strong> — helyben tárolva, például egy téma.</li>
        <li><strong>Statisztika és marketing</strong> — Google Analytics 4, Meta Pixel és Google Ads. Alapból kikapcsolva, amíg a sütiértesítésben nem járulsz hozzá.</li>
      </ul>
      <p>A választásodat legfeljebb egy évig őrizzük. Az értesítésben vagy a beállításokban módosíthatod. A gyerek rutinjának adata nem megy reklámplatformra.</p>
      <h2>A jogaid (GDPR)</h2>
      <ul>
        <li>Jog a fiók és az adat törlésére</li>
        <li>Hozzáférési jog</li>
        <li>Jog a pontatlan adat helyesbítésére</li>
        <li>Tiltakozási vagy korlátozási jog</li>
        <li>Jog panaszt tenni a svéd felügyeletnél, az Integritetsskyddsmyndighetennél (IMY), ha úgy látod, hogy megsértjük a GDPR-t</li>
      </ul>
      <h2>Kapcsolat</h2>
      <p>Kérdésed van erről a kezelésről? Használd a <a href="/en/contact">kapcsolati űrlapot</a>.</p>
    `,
  },
  terms: {
    title: 'Felhasználási feltételek — My Starday',
    description: 'A My Starday használatának feltételei: fiók, gyerekek, ár és felelősség.',
    h1: 'Felhasználási feltételek',
    ogTitle: 'Felhasználási feltételek',
    body: `
      <p class="updated">Utolsó frissítés: 2026. október</p>
      <p>Köszönjük, hogy a My Stardayt használod. Ezeknek a feltételeknek világosnak és őszintének kell lenniük. A kérdéseket a <a href="/en/contact">kapcsolati űrlapon</a> küldöd.</p>
      <h2>1. A szolgáltatásról</h2>
      <p>A My Starday digitális szolgáltatás azoknak a családoknak, amelyek rendezett napirendet akarnak, a gyerek haladását csillaggal jelölik, és a gyereknek saját nézetben hagyják követni a tevékenységeket. A szolgáltatás szülőknek és gondviselőknek és a gyerekeiknek szól. Egy családban legalább egy felnőttnek van fiókja. A gyerek PIN-kóddal lép be a gyerek nézetbe.</p>
      <h2>2. Fiók és biztonság</h2>
      <ul>
        <li>Válassz erős jelszót, és ne oszd meg</li>
        <li>Védd az e-mail-címedet. Ezzel kapod vissza a hozzáférést</li>
        <li>A gyerek nézet PIN-kódja csak a gyereké és a gondviselőké</li>
        <li>Ne használd az alkalmazást a svéd joggal ellentétes módon</li>
      </ul>
      <p>Felelsz mindenért, ami a fiókod alatt történik, akkor is, ha más használja. Ha visszaélést gyanítasz, azonnal jelezd.</p>
      <h2>3. Gyerekek és személyes adat</h2>
      <p>A My Starday gyerekekről szóló adatot kezel. A GDPR-t és az adatminimalizálás elvét követjük:</p>
      <ul>
        <li>A gyereket utónév és választott emoji azonosítja. Vezetéknév, azonosító szám és elérhetőség nélkül</li>
        <li>A szülők vagy gondviselők viszik be az adatot, és hozzájárulnak a megosztáshoz</li>
        <li>A gyerekek adatát nem használjuk reklámra, és semmi másra, csak a szolgáltatásra</li>
        <li>Jelentést és tervet csak akkor osztunk meg, ha egy felnőtt maga oszt meg egy időben korlátozott linket</li>
      </ul>
      <h2>4. A tartalom, amit létrehozol</h2>
      <p>A tervek, jutalmak, tevékenységek és megfigyelések, amelyeket hozzáadsz, a tieid vagy a családodé. Jogot adsz nekünk, hogy ezt a tartalmat tároljuk és megjelenítsük, amíg a fiók aktív. Nem másoljuk reklámba, nem adjuk el, és nem használjuk marketingben.</p>
      <h2>5. Használat</h2>
      <p>A szolgáltatás a családod személyes használatára való. Nem megengedett:</p>
      <ul>
        <li>Kereskedelmi használat megállapodás nélkül a Papa Bravo AB-vel</li>
        <li>Tervek, csillagok vagy jutalmak módosítása az alkalmazás szokásos menetén kívül</li>
        <li>Automatizált eszköz, scraper vagy bot a szolgáltatás ellen</li>
        <li>Jogellenes, sértő vagy káros tartalom közzététele</li>
      </ul>
      <h2>6. Megszüntetés és törlés</h2>
      <p>A fiókot bármikor véglegesen törölheted az alkalmazás beállításaiban, jelszóval megerősítve.</p>
      <p>A törlés azonnal és véglegesen eltávolítja a felnőtt fiókját, az összes gyereket, a terveket, a tevékenységnaplókat, a csillagokat, a jutalmakat és az esetleges megfigyeléseket.</p>
      <p>Felfüggeszthetünk egy fiókot, amely ezeket a feltételeket vagy a svéd jogot sérti.</p>
      <h2>7. Ár</h2>
      <p>Az írországi és kanadai családok 2026. december 31-ig bezárólag díjmentesen használhatják a My Stardayt. Ebben az időszakban nem kell fizetni. A díjmentes időszak nem válik automatikusan előfizetéssé. 2027. január 1-jétől előfizetést választhatsz az App Store-ban vagy a Google Playen. Ezen az oldalon nincs webes pénztár. Más országokban az az ár és hozzáférés érvényes, amelyet az alkalmazás az adott országra mutat. Azok a svéd családok, amelyek 2026. október 3-tól kezdenek, 14 napig próbálhatják az alkalmazást, majd az alkalmazásban választhatnak havi 59 svéd koronát vagy évi 590 svéd koronát. Azok a családok, amelyeknek már van fiókjuk, megtartják a meglévő ajánlatukat.</p>
      <h2>8. Változások</h2>
      <p>Ezeket a feltételeket módosíthatjuk, például jogszabályváltozás, új funkció vagy pontosítás után. Ha a változás lényeges, e-mailben vagy az alkalmazásban szóló értesítéssel mondjuk el.</p>
      <p>Ha utána tovább használod a szolgáltatást, az az új feltételek elfogadása.</p>
      <h2>9. Felelősség</h2>
      <p>A My Stardayt úgy adjuk, ahogy van. Megtesszük, amit tudunk, hogy a szolgáltatás stabil és biztonságos legyen, de nem garantálhatjuk, hogy mindig megszakítás nélkül elérhető.</p>
      <p>A Papa Bravo AB nem felel:</p>
      <ul>
        <li>Adatvesztésért vis maior miatt</li>
        <li>Kárért, mert PIN-kódot vagy belépési adatot olyannal osztasz meg, akinek nem kellene megkapnia</li>
        <li>Közvetett kárért, elszalasztott lehetőségért vagy elveszett adatért, kivéve ha a svéd jog mást követel</li>
      </ul>
      <p>Felelsz a használatért e feltételek és a svéd jog szerint.</p>
      <h2>10. Kapcsolat</h2>
      <p>Kérdésed van ezekről a feltételekről vagy a szolgáltatásról? Használd a <a href="/en/contact">kapcsolati űrlapot</a>.</p>
    `,
  },
});

module.exports = { pageFor };
