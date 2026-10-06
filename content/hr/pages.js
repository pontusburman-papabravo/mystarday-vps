'use strict';

/**
 * Croatian public pages. Written in Croatian.
 * Legal text translates the verified baseline. It adds no Croatian statute.
 */

const { composeLocale, faq } = require('../compose-pages');

const pageFor = composeLocale('hr', {
  marker: /dijet|djec/i,
  market: {
    title: (name) => `My Starday — ${name}. Vizualni dnevni planovi za djecu`,
    description: (name) => `Tržišna stranica za ${name}. Vizualni dnevni planovi na hrvatskom. To je tržišna stranica, ne zasebna jezična stranica.`,
    h1: (name) => `Vizualni dnevni planovi za obitelji. Tržište: ${name}`,
    lead: (name) => `Ovo je stranica za ${name}. Hrvatska stranica ostaje jezična stranica.`,
    registrationOpen: (name) => `Novi računi u zemlji ${name} slijede postojeću registraciju. Zadano je otvoreno.`,
    registrationClosed: (name) => `Novi računi u zemlji ${name} zadano nisu otvoreni. To slijedi postojeću registraciju, ne ovu stranicu. Zadano je zatvoreno.`,
    complimentary: (name) => `Za ${name} vrijedi postojeće besplatno razdoblje. Samo od sebe ne postaje pretplata. Ova stranica ne određuje cijenu.`,
    introYear: (name) => `${name} zadržava ponudu koja već stoji na švedskoj stranici. Ova stranica ne određuje cijenu. Na ovom tržištu nema besplatnog razdoblja do 31. prosinca 2026.`,
    trial: (name, days) => `Ako račun ovdje kasnije bude moguć, vrijedi postojeće pravilo izvan Švedske, Irske i Kanade: probno razdoblje od ${days} dana. Plaćanje mora prvo biti dostupno. Na ovom tržištu nema besplatnog razdoblja do 31. prosinca 2026. i ništa samo od sebe ne postaje pretplata. Ova stranica ne određuje cijenu.`,
    notTreatment: (name) => `Gumb otvara uobičajenu stranicu App Storea, ne izmišljenu stranicu proizvoda za ${name}. My Starday je vizualni dnevni plan. Nije liječenje i ne obećava medicinski ishod.`,
    register: 'Otvori račun',
    registerNote: 'Obrazac pita gdje obitelj živi. Ova poveznica sama ne postavlja zemlju ni cijenu.',
    how: 'Kako radi',
    playSoon: 'Google Play ovdje nije otvoren kao zasebna stranica.',
  },
  home: {
    title: 'Vizualni dnevni plan za djecu – rutine, nagrade i piktogrami | My Starday',
    description: 'Vizualni dnevni planovi i rutine koji djetetu pokažu što se događa sada i što dolazi poslije. Piktogrami, vlastiti dječji prikaz i zvjezdice za gotove korake.',
    h1: 'Vizualni dnevni planovi i rutine koji djetetu pokažu što se događa sada i što dolazi poslije.',
    ogTitle: 'Vizualni dnevni plan za djecu',
    faqs: [
      faq('Što je My Starday?', 'Vizualni dnevni plan za obitelji. Dijete vidi sljedeći korak. Odrasla osoba zadržava postavke.'),
      faq('Mogu li se zvjezdice kupiti?', 'Ne. Zvjezdica je za gotov korak. Ne može se kupiti.'),
      faq('Je li to liječenje?', 'Ne. My Starday je pomoć u svakodnevici i ne obećava medicinski ishod.'),
    ],
    lead: 'Dijete se smiri kad je sljedeći korak vidljiv. My Starday pokazuje dan u slikama: sada, poslije, gotovo.',
    hSee: 'Što dijete vidi',
    see: 'Dječji prikaz pokazuje jedan korak odjednom. Odrasla osoba složi plan. Dijete označava. Više djece može dijeliti isti dom, svako sa svojim planom.',
    hStars: 'Zvjezdice',
    stars: 'Gotov korak može dati zvjezdicu. Zvjezdice se ne kupuju. Ne zamjenjuju dogovor koji ste sklopili unaprijed. Više je u',
    starsLink: 'sustavu nagrada',
    hTreat: 'Nije liječenje',
    treat: 'Plan može pomoći djetetu kojem treba više pregleda, i kod ADHD-a ili autizma, a jednako i obiteljima bez dijagnoze. My Starday nije liječenje i ne obećava određeni ishod.',
    marketsIntro: 'Hrvatska stranica objašnjava proizvod. Zemlja je nešto drugo. Vlastita stranica postoji za',
    linkHow: 'Kako radi',
    linkVisual: 'Vizualni dnevni plan',
    linkMorning: 'Jutarnja rutina',
  },
  howItWorks: {
    title: 'Kako radi My Starday | Vizualni dnevni plan',
    description: 'Odrasla osoba složi dan. Dijete vidi sljedeći korak i označi ga. Zvjezdice su za gotove korake, ne za kupnju.',
    h1: 'Kako radi My Starday',
    ogTitle: 'Kako radi',
    faqs: [
      faq('Tko postavlja plan?', 'Odrasla osoba. Dijete vidi dječji prikaz i označava korake.'),
      faq('Treba li djetetu e-pošta?', 'Ne. Dijete se prijavljuje imenom i PIN-om.'),
    ],
    lead: 'Jutro nose tri stvari: vidljiv plan, dijete koje samo označava i odrasla osoba koja drži postavke.',
    hPlan: '1. Plan',
    plan: 'Aktivnosti stavite u redoslijed koji jutro stvarno ima. Slike pomažu kad dijete još ne čita.',
    planLink: 'Vizualni dnevni plan pokazuje sada i poslije',
    hChild: '2. Dječji prikaz',
    child: 'Dijete vidi sljedeći korak, ne postavke obitelji. Nema oglasa ni društvene mreže.',
    hStar: '3. Zvjezdica',
    star: 'Dovršen korak može dati zvjezdicu. Zvjezdica se ne kupuje. Dogovor stoji unaprijed, ne usred žurbe.',
    closing: 'My Starday je pomoć u svakodnevici. Nije liječenje i ne zamjenjuje savjet liječnika, terapeuta ili škole.',
  },
  visualSchedule: {
    title: 'Vizualni dnevni plan za djecu | My Starday',
    description: 'Vizualni dnevni plan djetetu pokaže što se događa sada i što dolazi poslije. Malo koraka, poznate slike, jasan redoslijed.',
    h1: 'Vizualni dnevni plan za djecu',
    ogTitle: 'Vizualni dnevni plan',
    faqs: [
      faq('Koliko koraka?', 'Često su dovoljna četiri ili pet. Dulji popis ide kad je redoslijed već poznat.'),
      faq('Fotografije ili simboli?', 'Slike koje dijete već poznaje. Fotografije od kuće dobro rade.'),
    ],
    lead: 'Vizualni dnevni plan čini redoslijed vidljivim. Dijete ne mora pogađati što dolazi poslije.',
    hNow: 'Sada i poslije',
    now: 'Pokažite samo trenutačni korak i sljedeći. Dugačak popis na zidu pomaže manje od jasnog sljedećeg poteza.',
    hStuck: 'Kad se korak zaustavi',
    stuck1: 'Podijelite korak. „Odjenuti se“ postaju čarape, hlače, majica.',
    stuck2: 'Jedan po jedan.',
    stuck3: 'Pokažite umjesto da ponavljate.',
    bridge: 'Ujutro je u središtu',
    morningLink: 'jutarnja rutina',
    weekLink: 'Tjedni plan pokazuje koji je dan',
    closing: 'My Starday nije liječenje i ne obećava medicinski ishod.',
  },
  morningRoutine: {
    title: 'Jutarnja rutina za djecu | My Starday',
    description: 'Jutarnja rutina sa slikama smanjuje broj izgovorenih podsjetnika. Isti redoslijed, dan za danom.',
    h1: 'Jutarnja rutina za djecu',
    ogTitle: 'Jutarnja rutina',
    faqs: [
      faq('Što spada u jutro?', 'Samo ono što se stvarno dogodi prije izlaska. Ustati, odjenuti se, jesti, zubi, jakna.'),
      faq('Što ako je vrijeme kratko?', 'Skratite popis umjesto da govorite brže. Kraći plan je pravi plan.'),
    ],
    lead: 'Isti redoslijed od popisa napravi naviku. Umjesto još jednog „operi zube“ gledate sljedeću sliku.',
    hExample: 'Primjer',
    steps: ['Ustati', 'Zahod i oprati ruke', 'Odjenuti se', 'Doručak', 'Oprati zube', 'Jakna, cipele, torba'],
    age: 'Dijete u vrtiću često bolje ide s četiri ili pet koraka.',
    bridge: 'Obitelji koje traže više oslonca na prijelazima mogu pročitati',
    bridgeLink: 'vodič o pregledu',
    closing: 'My Starday je oslonac u danu, ne liječenje.',
  },
  weeklySchedule: {
    title: 'Tjedni plan s piktogramima za djecu | My Starday',
    description: 'Tjedni plan s piktogramima pokazuje koji je dan, ne samo što se događa upravo sada.',
    h1: 'Tjedni plan s piktogramima',
    ogTitle: 'Tjedni plan s piktogramima',
    faqs: [
      faq('Po čemu se razlikuje od dnevnog plana?', 'Dnevni plan su današnji koraci. Tjedni plan pokazuje kako se dani razlikuju.'),
      faq('Od koje dobi?', 'Često oko polaska u školu, kad se tjedan više mijenja. Mlađe dijete prvo treba današnji dan.'),
    ],
    lead: 'Tjedni plan pomaže kad se radni dan i vikend razlikuju, ili kad „što je sutra?“ treba odgovor prije spavanja.',
    mid: 'Ponedjeljak sa sportom, srijeda kod drugog roditelja, petak s filmom. Slike to pokažu prije nego dijete čita kalendar.',
    dayLink: 'Dnevni plan',
    dayRest: 'su današnji koraci. Tjedni plan kaže koji je dan.',
    closing: 'My Starday ne obećava medicinski ishod.',
  },
  neurodiverseRoutines: {
    title: 'Rutine za neurodivergentnu djecu | My Starday',
    description: 'Više pregleda u danu za dijete kojem trebaju jasni prijelazi. My Starday je pomoć u svakodnevici, ne liječenje i ne dijagnoza.',
    h1: 'Rutine za neurodivergentnu djecu',
    ogTitle: 'Rutine za neurodivergentnu djecu',
    faqs: [
      faq('Je li to samo za dijagnozu?', 'Ne. Plan pomaže ondje gdje treba više pregleda. Dijagnoza nije uvjet.'),
      faq('Zamjenjuje li terapiju?', 'Ne. Nije liječenje i ne zamjenjuje savjet stručnjaka.'),
    ],
    lead: 'Neko dijete treba da sljedeći korak bude vidljiv, a ne objašnjen glasnije. Vrijedi s dijagnozom i bez nje.',
    hAdhd: 'ADHD: krenuti i ostati na koraku',
    adhd: 'Prijelaz često stane jer se sljedeći korak ne vidi. Plan s kvačicom odmah kaže: ovaj korak je gotov.',
    hAutism: 'Autizam: predvidljivost',
    autism: 'Drugi redoslijed može biti velik.',
    weekLink: 'Tjedni plan',
    autismRest: 'unaprijed pokazuje koji dan dolazi. Prekriženi korak treba se promijeniti vidljivo, a ne nestati u tišini.',
    closing: 'My Starday je pomoć u svakodnevici. Nije medicinsko liječenje i ne zamjenjuje savjet liječnika, radnog terapeuta, logopeda ili škole. Kartice u smislu prvo, zatim i gotovo još nisu hrvatski PDF. Takve kartice su nadahnuće, ne službena metoda i ne certifikat.',
  },
  rewardSystem: {
    title: 'Sustav nagrada za djecu | My Starday',
    description: 'Nagrada o kojoj se dogovorite unaprijed nije isto što i pogodba u trenutku. Dijete zvjezdice zasluži. Ne kupuju se.',
    h1: 'Sustav nagrada za djecu, a da to ne postane pogodba',
    ogTitle: 'Sustav nagrada za djecu',
    faqs: [
      faq('Je li kartica sa zvjezdicama podmićivanje?', 'Nije, kad nagrada stoji unaprijed i visi na nečemu što dijete može. Pogodba se nudi u trenutku da bi nešto stalo.'),
      faq('Koliko zvjezdica?', 'Počnite s jednom zvjezdicom po gotovom koraku. Zvjezdice se ne kupuju.'),
    ],
    lead: '„Nije li to samo podmićivanje?“ ovisi o tome kad se dogovorite. Dogovor unaprijed može karticu osloniti na naviku. Usred ljutnje postaje cjenkanje.',
    planLink: 'U vizualnom dnevnom planu',
    chain: 'lanac je jednostavan: vidjeti korak, napraviti ga, označiti, dobiti zvjezdicu.',
    steps: [
      'Budite konkretni. Nagradite „pere zube bez podsjetnika“, ne „je dobar“.',
      'Pokažite napredak.',
      'Brojite pokušaj, ne samo savršeno jutro.',
      'Neka dijete sudjeluje u nagradi.',
      'Prorijedite zvjezdice kad navika sjedne.',
    ],
    closing: 'Zvjezdice se ne kupuju. My Starday ne obećava medicinski ishod.',
  },
  resources: {
    title: 'Materijali za vizualne rutine | My Starday',
    description: 'Što na hrvatskom već postoji i čega još nema kao PDF. Aplikacija i ispisani list su dvije različite stvari.',
    h1: 'Materijali',
    ogTitle: 'Materijali',
    faqs: [faq('Postoje li hrvatski PDF-ovi?', 'Još ne. Ova stranica ne prodaje švedske listove kao hrvatski prijevod.')],
    lead: 'Aplikacija pokazuje dan na zaslonu. Ispisani list je nešto drugo. Hrvatskih PDF-ova ovdje još nema.',
    app: 'U aplikaciji složite',
    dayLink: 'dnevni plan',
    morningLink: 'jutarnju rutinu',
    weekLink: 'tjedni plan',
    appRest: 'Dijete vidi isti redoslijed u dječjem prikazu.',
    nolink: 'Ne povezujemo knjižnicu na drugom jeziku kao da je hrvatska. Kad hrvatski listovi dođu, bit će na ovoj stranici.',
  },
  faq: {
    title: 'Česta pitanja | My Starday',
    description: 'Kratki odgovori o dnevnom planu, zvjezdicama, dječjem prikazu, cijeni i o tome što My Starday nije.',
    h1: 'Česta pitanja',
    ogTitle: 'Česta pitanja',
    faqs: [
      faq('Za koga je stranica?', 'Hrvatska stranica objašnjava proizvod. Hrvatska ima vlastitu tržišnu stranicu. Jezik ostaje hrvatski.'),
      faq('Mogu li kupiti zvjezdice?', 'Ne.'),
      faq('Je li to terapijska aplikacija?', 'Ne. Nema liječenja, nema obećanog medicinskog ishoda.'),
      faq('Gdje otvaram račun?', 'U postojećem obrascu. Pita gdje obitelj živi. Tržišna stranica zemlju ne postavlja sama.'),
    ],
    lead: 'Kratki odgovori. Dulji tekstovi su u vodičima.',
    hLang: 'Jezik i zemlja',
    lang: 'Ova stranica je na hrvatskom. Zemlju birate zasebno. Tržišna stranica ne mijenja jezik i ne otvara račun.',
    hChild: 'Dijete',
    child: 'Dijete vidi plan i označava. Postavke, pozivnice i račun ostaju kod odrasle osobe. Više je u',
    howLink: 'Kako radi',
    hStars: 'Zvjezdice',
    stars: 'Zvjezdice su za gotove korake. Ne kupuju se. Pročitajte',
    starsLink: 'sustav nagrada',
  },
  privacy: {
    title: 'Pravila privatnosti — My Starday',
    description: 'Koje podatke My Starday obrađuje, što ne prikupljamo i koja prava daje GDPR.',
    h1: 'Pravila privatnosti za My Starday',
    ogTitle: 'Pravila privatnosti',
    body: `
      <p class="updated">Zadnje ažurirano: listopad 2026.</p>
      <p>S privatnošću postupamo pažljivo. My Starday prikuplja što manje: samo ono što aplikacija treba da radi. Tvoje podatke ne prodajemo i ne koristimo ih za ciljano oglašavanje. Proslijeđivanje izvan usluge događa se samo kad ga sam odabereš, ili kad je potrebno da naši izvršitelji obrade vode uslugu.</p>
      <p><strong>Voditelj obrade:</strong> Papa Bravo AB odgovoran je za obradu tvojih osobnih podataka. Javljaš nam se preko <a href="/en/contact">obrasca za kontakt</a>.</p>
      <h2>Što prikupljamo</h2>
      <p>Podatke obrađujemo na temelju ugovora da bismo mogli dati aplikaciju i funkcije na koje se prijaviš. O odraslima i obiteljima prikupljamo:</p>
      <ul>
        <li><strong>E-poštu</strong> — za prijavu i poruke o računu</li>
        <li><strong>Ime i prezime</strong> — da prepoznamo račun</li>
        <li><strong>Zapis aktivnosti</strong> — koje su aktivnosti gotove i kada</li>
        <li><strong>Zvjezdice</strong> — zarađene i iskorištene zvjezdice</li>
        <li><strong>Planove i aktivnosti</strong> — ono što sam stvoriš</li>
      </ul>
      <p><strong>Privatnost djeteta:</strong> dijete prepoznajemo samo po imenu ili nadimku i odabranom emojiju. Ne prikupljamo prezime, identifikacijski broj ni kontakt djeteta.</p>
      <h2>Što ne prikupljamo</h2>
      <ul>
        <li>Nikakva prezimena djece</li>
        <li>Nikakve identifikacijske brojeve, ni odraslih ni djece</li>
        <li>Nikakve podatke o zdravlju, dijagnozi ili invaliditetu djeteta</li>
        <li>Nikakve podatke o plaćanju. Kupnje idu preko App Storea ili Google Playa</li>
        <li>Nikakve podatke o lokaciji</li>
      </ul>
      <h2>Za što podatke koristimo</h2>
      <ul>
        <li>Pokazati djetetu dnevni plan</li>
        <li>Spremiti napredak i zvjezdice</li>
        <li>Poslati potvrdnu e-poštu i poruke o računu</li>
        <li>Odgovoriti na poruke koje nam pošalješ</li>
      </ul>
      <h2>Proslijeđivanje</h2>
      <p>Tvoje podatke ne prosljeđujemo za oglašavanje. Ovi izvršitelji vode uslugu. Obrađuju samo po našem nalogu i prema GDPR-u:</p>
      <ul>
        <li><strong>Neon (baza podataka)</strong> — račun, planovi, aktivnosti i podaci obitelji</li>
        <li><strong>Vlastito hostanje (VPS u EU/EGP-u)</strong> — web-aplikacija i API</li>
        <li><strong>Resend (e-pošta)</strong> — transakcijska pošta, na primjer potvrda, lozinka i poruka dobrodošlice</li>
        <li><strong>Cloudflare R2</strong> — učitane profilne fotografije, kad tu funkciju koristiš</li>
        <li><strong>Apple i Google</strong> — prijava i push poruke preko APNs-a i FCM-a, kad te funkcije koristiš</li>
      </ul>
      <h2>Izvještaj za razgovor</h2>
      <p>Kad kao nositelj roditeljske skrbi napraviš vremenski ograničenu poveznicu na odabrane brojke o aktivnostima i nagradama, možeš je podijeliti, na primjer s učiteljem ili terapeutom. To se događa samo zato što tako odabereš. Sadržaj određuješ ti i poveznicu možeš opozvati. Primatelj ne treba račun.</p>
      <p>Ako poveznicu zaštitiš kodom, ne dijeli kod u istoj poruci kao poveznicu.</p>
      <h2>Prijava preko Applea ili Googlea</h2>
      <ul>
        <li><strong>Prijava Appleom:</strong> obrađujemo ime i e-poštu. Ako odabereš sakriti e-poštu, spremamo jedinstvenu adresu za prosljeđivanje koju Apple stvori, da možemo slati poruke o računu.</li>
        <li><strong>Prijava Googleom:</strong> primamo i spremamo e-poštu i ime Google računa da bismo napravili profil.</li>
      </ul>
      <p>Vlastita obrada Applea i Googlea slijedi njihova pravila.</p>
      <h2>Push poruke i token uređaja</h2>
      <p>Ako uključiš push poruke, na temelju tvoje privole spremamo jedinstveni token uređaja (APNs ili FCM) da poruka stigne na pravi uređaj. Token je vezan uz tvoj račun.</p>
      <p>Token istječe pri odjavi ili kad platforma token označi nevažećim. Ne spremamo oznaku uređaja bez aktivne push pretplate. Isključivanje je u postavkama aplikacije ili na uređaju.</p>
      <h2>Rok čuvanja</h2>
      <p>Podatke čuvamo dok je račun aktivan. Ako obrišeš račun, svi se podaci odmah i trajno brišu.</p>
      <h2>Brisanje računa</h2>
      <p>Račun brišeš u aplikaciji u postavkama. Potvrđuješ lozinkom ili prijavom treće strane.</p>
      <p>To se ne može vratiti. Nestaju račun odrasle osobe, profili djece, planovi, dnevni zapisi, ocjene, nagrade i pozivnice.</p>
      <h2>Pohrana i sigurnost</h2>
      <p>Nastojimo čuvati jezgrene podatke u EU/EGP-u, gdje to vrijedi. Neki pružatelji mogu obrađivati izvan EGP-a. Prijenos i jamstva stoje u ovom tekstu i stalno ih pregledavamo. Veze su šifrirane (HTTPS). Lozinke nisu u čitljivom obliku. Koristimo bcrypt.</p>
      <h2>Kolačići</h2>
      <ul>
        <li><strong>Nužni kolačići</strong> — uvijek uključeni. Sesija i CSRF zaštita za sigurnu prijavu.</li>
        <li><strong>Postavke</strong> — spremljene lokalno, na primjer tema.</li>
        <li><strong>Statistika i marketing</strong> — Google Analytics 4, Meta Pixel i Google Ads. Zadano isključeni, dok ne pristaneš u obavijesti o kolačićima.</li>
      </ul>
      <p>Tvoj izbor čuvamo najviše jednu godinu. Možeš ga promijeniti u obavijesti ili postavkama. Podaci o rutini djeteta ne idu na oglašivačke platforme.</p>
      <h2>Tvoja prava (GDPR)</h2>
      <ul>
        <li>Pravo obrisati račun i podatke</li>
        <li>Pravo na pristup</li>
        <li>Pravo na ispravak netočnih podataka</li>
        <li>Pravo na prigovor ili ograničenje</li>
        <li>Pravo uložiti pritužbu švedskom nadzornom tijelu Integritetsskyddsmyndigheten (IMY), ako smatraš da kršimo GDPR</li>
      </ul>
      <h2>Kontakt</h2>
      <p>Pitanja o ovoj obradi? Upotrijebi <a href="/en/contact">obrazac za kontakt</a>.</p>
    `,
  },
  terms: {
    title: 'Uvjeti korištenja — My Starday',
    description: 'Uvjeti korištenja My Stardaya: račun, djeca, cijena i odgovornost.',
    h1: 'Uvjeti korištenja',
    ogTitle: 'Uvjeti korištenja',
    body: `
      <p class="updated">Zadnje ažurirano: listopad 2026.</p>
      <p>Hvala što koristiš My Starday. Ovi uvjeti trebaju biti jasni i iskreni. Pitanja šalješ preko <a href="/en/contact">obrasca za kontakt</a>.</p>
      <h2>1. O usluzi</h2>
      <p>My Starday je digitalna usluga za obitelji koje žele strukturirani dnevni plan, označiti napredak djeteta zvjezdicama i djetetu dati da prati aktivnosti u vlastitom prikazu. Usluga je za roditelje i nositelje roditeljske skrbi i njihovu djecu. Obitelj ima barem jednu odraslu osobu s računom. Dijete se prijavljuje PIN-om u dječjem prikazu.</p>
      <h2>2. Račun i sigurnost</h2>
      <ul>
        <li>Odaberi jaku lozinku i ne dijeli je</li>
        <li>Čuvaj svoju e-poštu. Njome vraćaš pristup</li>
        <li>PIN dječjeg prikaza je samo za dijete i nositelje roditeljske skrbi</li>
        <li>Ne koristi aplikaciju na način koji je protivan švedskom pravu</li>
      </ul>
      <p>Odgovaraš za sve što se dogodi pod tvojim računom, i kad ga koristi netko drugi. Ako sumnjaš na zlouporabu, javi se odmah.</p>
      <h2>3. Djeca i osobni podaci</h2>
      <p>My Starday obrađuje podatke o djeci. Slijedimo GDPR i načelo smanjenja podataka:</p>
      <ul>
        <li>Dijete prepoznajemo po imenu i odabranom emojiju. Bez prezimena, bez identifikacijskog broja, bez kontakta</li>
        <li>Roditelji ili nositelji roditeljske skrbi unose podatke i pristaju na dijeljenje</li>
        <li>Podatke djece ne koristimo za oglašavanje ni za išta osim usluge</li>
        <li>Izvještaji i planovi dijele se samo kad odrasla osoba sama podijeli vremenski ograničenu poveznicu</li>
      </ul>
      <h2>4. Sadržaj koji stvaraš</h2>
      <p>Planovi, nagrade, aktivnosti i zapažanja koja dodaš pripadaju tebi ili tvojoj obitelji. Daješ nam pravo da taj sadržaj spremamo i prikazujemo dok je račun aktivan. Ne kopiramo ga u oglašavanje, ne prodajemo ga i ne koristimo ga u marketingu.</p>
      <h2>5. Korištenje</h2>
      <p>Usluga je za osobnu uporabu u tvojoj obitelji. Nije dopušteno:</p>
      <ul>
        <li>Komercijalna uporaba bez dogovora s Papa Bravo AB</li>
        <li>Mijenjati planove, zvjezdice ili nagrade izvan uobičajenog tijeka aplikacije</li>
        <li>Automatizirana sredstva, strugači ili botovi protiv usluge</li>
        <li>Objavljivati sadržaj koji je protuzakonit, uvredljiv ili štetan</li>
      </ul>
      <h2>6. Prestanak i brisanje</h2>
      <p>Račun možeš u bilo kojem trenutku trajno obrisati u postavkama aplikacije, potvrđeno lozinkom.</p>
      <p>Brisanje odmah i trajno uklanja račun odrasle osobe, svu djecu, planove, zapise aktivnosti, zvjezdice, nagrade i eventualna zapažanja.</p>
      <p>Možemo zatvoriti račun koji krši ove uvjete ili švedsko pravo.</p>
      <h2>7. Cijena</h2>
      <p>Obitelji u Irskoj i Kanadi mogu koristiti My Starday besplatno do 31. prosinca 2026. uključivo. U tom razdoblju plaćanje nije potrebno. Besplatno razdoblje ne postaje automatski pretplata. Od 1. siječnja 2027. možeš odabrati pretplatu u App Storeu ili na Google Playu. Na ovoj stranici nema web-blagajne. U drugim zemljama vrijede cijena i pristup koje aplikacija pokaže za tu zemlju. Švedske obitelji koje počnu od 3. listopada 2026. mogu aplikaciju isprobati 14 dana i zatim u aplikaciji odabrati 59 švedskih kruna mjesečno ili 590 švedskih kruna godišnje. Obitelji koje već imaju račun zadržavaju postojeću ponudu.</p>
      <h2>8. Izmjene</h2>
      <p>Ove uvjete možemo prilagoditi, na primjer nakon izmjene zakona, nove funkcije ili pojašnjenja. Ako je izmjena bitna, kažemo to e-poštom ili obavijesti u aplikaciji.</p>
      <p>Ako uslugu nastaviš koristiti, to vrijedi kao prihvat novih uvjeta.</p>
      <h2>9. Odgovornost</h2>
      <p>My Starday se daje kakav jest. Činimo što možemo da usluga bude stabilna i sigurna, ali ne možemo jamčiti da će uvijek biti dostupna bez prekida.</p>
      <p>Papa Bravo AB ne odgovara za:</p>
      <ul>
        <li>Gubitak podataka zbog više sile</li>
        <li>Štetu jer PIN ili podatke za prijavu dijeliš s nekim tko ih ne bi smio imati</li>
        <li>Neizravnu štetu, propuštenu priliku ili izgubljene podatke, osim ako švedsko pravo ne zahtijeva drugačije</li>
      </ul>
      <p>Odgovaraš za uporabu prema ovim uvjetima i prema švedskom pravu.</p>
      <h2>10. Kontakt</h2>
      <p>Pitanja o ovim uvjetima ili o usluzi? Upotrijebi <a href="/en/contact">obrazac za kontakt</a>.</p>
    `,
  },
});

module.exports = { pageFor };
