'use strict';

/**
 * Romanian public pages. Written in Romanian.
 * Legal text translates the verified baseline. It adds no Romanian statute.
 */

const { composeLocale, faq } = require('../compose-pages');

const pageFor = composeLocale('ro', {
  marker: /copil/i,
  market: {
    title: (name) => `My Starday — ${name}. Planuri vizuale de zi pentru copii`,
    description: (name) => `Pagina de piață pentru ${name}. Planuri vizuale de zi în română. Este o pagină de piață, nu un site de limbă separat.`,
    h1: (name) => `Planuri vizuale de zi pentru familii. Piață: ${name}`,
    lead: (name) => `Aceasta este pagina pentru ${name}. Site-ul în română rămâne un site de limbă.`,
    registrationOpen: (name) => `Conturile noi din ${name} urmează înregistrarea existentă. Implicit este deschis.`,
    registrationClosed: (name) => `Conturile noi din ${name} nu sunt deschise implicit. Asta urmează înregistrarea existentă, nu pagina aceasta. Implicit este închis.`,
    complimentary: (name) => `Pentru ${name} se aplică perioada gratuită existentă. Nu devine abonament de la sine. Pagina aceasta nu fixează un preț.`,
    introYear: (name) => `${name} păstrează oferta care este deja pe site-ul suedez. Pagina aceasta nu fixează un preț. Pe piața aceasta nu există o perioadă gratuită până la 31 decembrie 2026.`,
    trial: (name, days) => `Dacă un cont va fi posibil aici mai târziu, se aplică regula existentă în afara Suediei, Irlandei și Canadei: o perioadă de probă de ${days} de zile. Plata trebuie să fie disponibilă mai întâi. Pe piața aceasta nu există o perioadă gratuită până la 31 decembrie 2026, și nimic nu devine abonament de la sine. Pagina aceasta nu fixează un preț.`,
    notTreatment: (name) => `Butonul deschide pagina obișnuită din App Store, nu o pagină de produs inventată pentru ${name}. My Starday este un plan vizual de zi. Nu este un tratament și nu promite un rezultat medical.`,
    register: 'Creează un cont',
    registerNote: 'Formularul întreabă unde locuiește familia. Legătura aceasta nu setează singură țara și nu fixează un preț.',
    how: 'Cum funcționează',
    playSoon: 'Google Play nu este deschis aici ca pagină proprie.',
  },
  home: {
    title: 'Plan vizual de zi pentru copii – rutine, recompense și pictograme | My Starday',
    description: 'Planuri vizuale de zi și rutine care îi arată unui copil ce se întâmplă acum și ce urmează. Pictograme, o vedere a copilului și stele pentru pașii gata.',
    h1: 'Planuri vizuale de zi și rutine care îi arată unui copil ce se întâmplă acum și ce urmează.',
    ogTitle: 'Plan vizual de zi pentru copii',
    faqs: [
      faq('Ce este My Starday?', 'Un plan vizual de zi pentru familii. Copilul vede pasul următor. Adultul păstrează setările.'),
      faq('Stelele se pot cumpăra?', 'Nu. Steaua este pentru un pas gata. Nu se poate cumpăra.'),
      faq('Este un tratament?', 'Nu. My Starday este ajutor în ziua obișnuită și nu promite un rezultat medical.'),
    ],
    lead: 'Un copil se liniștește când pasul următor se vede. My Starday arată ziua în imagini: acum, apoi, gata.',
    hSee: 'Ce vede copilul',
    see: 'Vederea copilului arată un pas odată. Adultul face planul. Copilul bifează. Mai mulți copii pot împărți aceeași casă, fiecare cu planul lui.',
    hStars: 'Stele',
    stars: 'Un pas gata poate da o stea. Stelele nu se cumpără. Nu înlocuiesc o înțelegere făcută dinainte. Mai mult este în',
    starsLink: 'sistemul de recompense',
    hTreat: 'Nu este tratament',
    treat: 'Planul poate ajuta un copil care are nevoie de mai multă claritate, și la ADHD sau autism, și la fel familiile fără diagnostic. My Starday nu este tratament și nu promite un anumit rezultat.',
    marketsIntro: 'Site-ul în română explică produsul. Țara este altceva. Există o pagină proprie pentru',
    linkHow: 'Cum funcționează',
    linkVisual: 'Plan vizual de zi',
    linkMorning: 'Rutina de dimineață',
  },
  howItWorks: {
    title: 'Cum funcționează My Starday | Plan vizual de zi',
    description: 'Adultul alcătuiește ziua. Copilul vede pasul următor și îl bifează. Stelele sunt pentru pașii gata, nu de cumpărat.',
    h1: 'Cum funcționează My Starday',
    ogTitle: 'Cum funcționează',
    faqs: [
      faq('Cine setează planul?', 'Un adult. Copilul vede vederea copilului și bifează pașii.'),
      faq('Copilul are nevoie de e-mail?', 'Nu. Copilul intră cu un nume și un PIN.'),
    ],
    lead: 'Dimineața o țin trei lucruri: un plan vizibil, un copil care bifează singur și un adult care ține setările.',
    hPlan: '1. Planul',
    plan: 'Puneți activitățile în ordinea pe care dimineața o are cu adevărat. Imaginile ajută când copilul încă nu citește.',
    planLink: 'Planul vizual de zi arată acum și apoi',
    hChild: '2. Vederea copilului',
    child: 'Copilul vede pasul următor, nu setările familiei. Nu este reclamă și nu este rețea socială.',
    hStar: '3. Steaua',
    star: 'Un pas încheiat poate da o stea. Steaua nu se cumpără. Înțelegerea stă dinainte, nu în mijlocul grabei.',
    closing: 'My Starday este ajutor în ziua obișnuită. Nu este tratament și nu înlocuiește sfatul unui medic, terapeut sau al școlii.',
  },
  visualSchedule: {
    title: 'Plan vizual de zi pentru copii | My Starday',
    description: 'Un plan vizual de zi îi arată unui copil ce se întâmplă acum și ce urmează. Puțini pași, imagini cunoscute, o ordine clară.',
    h1: 'Plan vizual de zi pentru copii',
    ogTitle: 'Plan vizual de zi',
    faqs: [
      faq('Câți pași?', 'Adesea ajung patru sau cinci. O listă mai lungă merge când ordinea este deja cunoscută.'),
      faq('Fotografii sau simboluri?', 'Imagini pe care copilul le cunoaște deja. Fotografiile de acasă merg bine.'),
    ],
    lead: 'Un plan vizual de zi face ordinea vizibilă. Copilul nu trebuie să ghicească ce urmează.',
    hNow: 'Acum și apoi',
    now: 'Arătați doar pasul de acum și pe următorul. O listă lungă pe perete ajută mai puțin decât o mișcare următoare clară.',
    hStuck: 'Când un pas se oprește',
    stuck1: 'Împărțiți pasul. „Îmbrăcatul” devine șosete, pantaloni, tricou.',
    stuck2: 'Unul câte unul.',
    stuck3: 'Arătați, în loc să repetați.',
    bridge: 'Dimineața este în centru',
    morningLink: 'rutina de dimineață',
    weekLink: 'Planul săptămânal arată ce zi este',
    closing: 'My Starday nu este tratament și nu promite un rezultat medical.',
  },
  morningRoutine: {
    title: 'Rutina de dimineață pentru copii | My Starday',
    description: 'O rutină de dimineață cu imagini scade numărul amintirilor spuse. Aceeași ordine, zi după zi.',
    h1: 'Rutina de dimineață pentru copii',
    ogTitle: 'Rutina de dimineață',
    faqs: [
      faq('Ce intră în dimineață?', 'Doar ce se întâmplă cu adevărat înainte de ieșire. Trezit, îmbrăcat, mâncat, dinți, geacă.'),
      faq('Ce facem dacă timpul e scurt?', 'Scurtați lista, în loc să vorbiți mai repede. Un plan mai scurt este un plan adevărat.'),
    ],
    lead: 'Aceeași ordine face dintr-o listă un obicei. În loc să spuneți încă o dată „spală-te pe dinți”, vă uitați la imaginea următoare.',
    hExample: 'Exemplu',
    steps: ['Trezitul', 'Toaletă și spălat pe mâini', 'Îmbrăcatul', 'Micul dejun', 'Spălatul pe dinți', 'Geacă, pantofi, ghiozdan'],
    age: 'Un copil de grădiniță merge adesea mai bine cu patru sau cinci pași.',
    bridge: 'Familiile care caută mai mult sprijin la treceri pot citi',
    bridgeLink: 'ghidul despre claritate',
    closing: 'My Starday este sprijin în zi, nu tratament.',
  },
  weeklySchedule: {
    title: 'Plan săptămânal cu pictograme pentru copii | My Starday',
    description: 'Un plan săptămânal cu pictograme arată ce zi este, nu doar ce se întâmplă chiar acum.',
    h1: 'Plan săptămânal cu pictograme',
    ogTitle: 'Plan săptămânal cu pictograme',
    faqs: [
      faq('Cu ce diferă de planul zilei?', 'Planul zilei sunt pașii de azi. Planul săptămânal arată cum diferă zilele.'),
      faq('De la ce vârstă?', 'Adesea pe la începutul școlii, când săptămâna se schimbă mai mult. Un copil mai mic are nevoie întâi de ziua de azi.'),
    ],
    lead: 'Un plan săptămânal ajută când ziua de lucru și weekendul diferă, sau când „ce este mâine?” are nevoie de răspuns înainte de somn.',
    mid: 'Luni cu sport, miercuri la celălalt părinte, vineri cu un film. Imaginile fac asta vizibil înainte ca un copil să citească un calendar.',
    dayLink: 'Planul zilei',
    dayRest: 'sunt pașii de azi. Planul săptămânal spune ce zi este.',
    closing: 'My Starday nu promite un rezultat medical.',
  },
  neurodiverseRoutines: {
    title: 'Rutine pentru copii neurodivergenți | My Starday',
    description: 'Mai multă claritate în zi pentru un copil care are nevoie de treceri limpezi. My Starday este ajutor în ziua obișnuită, nu tratament și nu diagnostic.',
    h1: 'Rutine pentru copii neurodivergenți',
    ogTitle: 'Rutine pentru copii neurodivergenți',
    faqs: [
      faq('Este doar pentru un diagnostic?', 'Nu. Planul ajută acolo unde trebuie mai multă claritate. Un diagnostic nu este o condiție.'),
      faq('Înlocuiește terapia?', 'Nu. Nu este tratament și nu înlocuiește sfatul specialiștilor.'),
    ],
    lead: 'Unui copil îi poate trebui ca pasul următor să se vadă, nu să fie explicat mai tare. Asta este valabil cu diagnostic și fără.',
    hAdhd: 'ADHD: să înceapă și să rămână la pas',
    adhd: 'Trecerea se oprește adesea pentru că pasul următor nu se vede. Un plan cu bifă spune imediat: pasul acesta este gata.',
    hAutism: 'Autism: previzibilitate',
    autism: 'O altă ordine poate părea mare.',
    weekLink: 'Planul săptămânal',
    autismRest: 'arată dinainte ce zi vine. Un pas tăiat trebuie schimbat vizibil, nu să dispară în tăcere.',
    closing: 'My Starday este ajutor în ziua obișnuită. Nu este tratament medical și nu înlocuiește sfatul unui medic, terapeut ocupațional, logoped sau al școlii. Cardurile în sensul întâi, apoi și gata nu există încă ca PDF în română. Astfel de carduri sunt o inspirație, nu o metodă oficială și nu o certificare.',
  },
  rewardSystem: {
    title: 'Sistem de recompense pentru copii | My Starday',
    description: 'O recompensă stabilită dinainte este altceva decât un târg pe moment. Copilul câștigă stelele. Nu se cumpără.',
    h1: 'Sistem de recompense pentru copii, fără să devină un târg',
    ogTitle: 'Sistem de recompense pentru copii',
    faqs: [
      faq('Un carton cu stele este mită?', 'Nu, când recompensa stă dinainte și ține de ceva ce copilul poate face. Un târg se oferă pe moment ca să se oprească ceva.'),
      faq('Câte stele?', 'Începeți cu o stea pentru un pas gata. Stelele nu se cumpără.'),
    ],
    lead: '„Nu este doar mită?” depinde de momentul în care vă înțelegeți. Stabilită dinainte, o fișă poate sprijini un obicei. În mijlocul supărării devine negociere.',
    planLink: 'În planul vizual de zi',
    chain: 'lanțul este simplu: vezi pasul, fă-l, bifează, primești o stea.',
    steps: [
      'Fiți concreți. Recompensați „se spală pe dinți fără amintire”, nu „este cuminte”.',
      'Arătați progresul.',
      'Numărați încercarea, nu doar dimineața perfectă.',
      'Lăsați copilul să se gândească la recompensă.',
      'Răriți stelele când obiceiul stă.',
    ],
    closing: 'Stelele nu se cumpără. My Starday nu promite un rezultat medical.',
  },
  resources: {
    title: 'Materiale pentru rutine vizuale | My Starday',
    description: 'Ce există deja în română și ce nu există încă ca PDF. Aplicația și o foaie tipărită sunt două lucruri diferite.',
    h1: 'Materiale',
    ogTitle: 'Materiale',
    faqs: [faq('Există PDF-uri în română?', 'Încă nu. Pagina aceasta nu vinde foi suedeze ca traducere în română.')],
    lead: 'Aplicația arată ziua pe ecran. O foaie tipărită este altceva. PDF-uri în română nu există încă aici.',
    app: 'În aplicație alcătuiți',
    dayLink: 'planul zilei',
    morningLink: 'rutina de dimineață',
    weekLink: 'planul săptămânal',
    appRest: 'Copilul vede aceeași ordine în vederea copilului.',
    nolink: 'Nu legăm o bibliotecă în altă limbă ca și cum ar fi în română. Când vor exista foi în română, vor sta pe pagina aceasta.',
  },
  faq: {
    title: 'Întrebări frecvente | My Starday',
    description: 'Răspunsuri scurte despre planul zilei, stele, vederea copilului, preț și despre ce nu este My Starday.',
    h1: 'Întrebări frecvente',
    ogTitle: 'Întrebări frecvente',
    faqs: [
      faq('Pentru cine este site-ul?', 'Site-ul în română explică produsul. România are pagina ei de piață. Limba rămâne româna.'),
      faq('Pot cumpăra stele?', 'Nu.'),
      faq('Este o aplicație de terapie?', 'Nu. Niciun tratament, niciun rezultat medical promis.'),
      faq('Unde creez un cont?', 'În formularul existent. Întreabă unde locuiește familia. O pagină de piață nu setează țara singură.'),
    ],
    lead: 'Răspunsurile scurte. Textele mai lungi sunt în ghiduri.',
    hLang: 'Limbă și țară',
    lang: 'Site-ul acesta este în română. Țara o alegeți separat. O pagină de piață nu schimbă limba și nu creează un cont.',
    hChild: 'Copilul',
    child: 'Copilul vede planul și bifează. Setările, invitațiile și contul rămân la adult. Mai mult este la',
    howLink: 'Cum funcționează',
    hStars: 'Stele',
    stars: 'Stelele sunt pentru pașii gata. Nu se cumpără. Citiți',
    starsLink: 'sistemul de recompense',
  },
  privacy: {
    title: 'Politica de confidențialitate — My Starday',
    description: 'Ce date prelucrează My Starday, ce nu colectăm și ce drepturi dă GDPR.',
    h1: 'Politica de confidențialitate pentru My Starday',
    ogTitle: 'Politica de confidențialitate',
    body: `
      <p class="updated">Ultima actualizare: octombrie 2026</p>
      <p>Tratăm confidențialitatea cu grijă. My Starday colectează cât mai puțin: doar ce îi trebuie aplicației ca să funcționeze. Nu îți vindem datele și nu le folosim pentru reclamă țintită. O transmitere în afara serviciului se întâmplă doar când o alegi tu, sau când este necesară ca împuterniciții noștri să poată ține serviciul.</p>
      <p><strong>Operator:</strong> Papa Bravo AB răspunde de prelucrarea datelor tale cu caracter personal. Ne scrii prin <a href="/en/contact">formularul de contact</a>.</p>
      <h2>Ce colectăm</h2>
      <p>Prelucrăm date pe baza contractului, ca să putem oferi aplicația și funcțiile la care te înscrii. Despre adulți și familii colectăm:</p>
      <ul>
        <li><strong>E-mail</strong> — pentru autentificare și mesaje despre cont</li>
        <li><strong>Nume și prenume</strong> — ca să recunoaștem contul</li>
        <li><strong>Jurnal de activități</strong> — ce activități au fost gata și când</li>
        <li><strong>Stele</strong> — stele câștigate și folosite</li>
        <li><strong>Planuri și activități</strong> — ce creezi tu</li>
      </ul>
      <p><strong>Confidențialitatea unui copil:</strong> un copil este cunoscut doar printr-un prenume sau o poreclă și un emoji ales. Nu colectăm nume de familie, număr de identificare sau date de contact ale unui copil.</p>
      <h2>Ce nu colectăm</h2>
      <ul>
        <li>Niciun nume de familie al copiilor</li>
        <li>Niciun număr de identificare, nici al adulților, nici al copiilor</li>
        <li>Nicio informație despre sănătatea, diagnosticul sau dizabilitatea unui copil</li>
        <li>Nicio dată de plată. Cumpărăturile trec prin App Store sau Google Play</li>
        <li>Nicio dată de locație</li>
      </ul>
      <h2>La ce folosim datele</h2>
      <ul>
        <li>Să îi arătăm copilului planul zilei</li>
        <li>Să păstrăm progresul și stelele</li>
        <li>Să trimitem e-mailul de confirmare și mesajele despre cont</li>
        <li>Să răspundem la mesajele pe care ni le trimiți</li>
      </ul>
      <h2>Transmitere</h2>
      <p>Nu transmitem datele tale pentru reclamă. Acești împuterniciți țin serviciul. Prelucrează doar la instrucțiunea noastră și după GDPR:</p>
      <ul>
        <li><strong>Neon (bază de date)</strong> — cont, planuri, activități și datele familiei</li>
        <li><strong>Găzduire proprie (VPS în UE/SEE)</strong> — aplicația web și API-ul</li>
        <li><strong>Resend (e-mail)</strong> — e-mail tranzacțional, de exemplu confirmare, parolă și mesaj de bun venit</li>
        <li><strong>Cloudflare R2</strong> — fotografii de profil încărcate, când folosești funcția</li>
        <li><strong>Apple și Google</strong> — autentificare și mesaje push prin APNs și FCM, când folosești funcțiile</li>
      </ul>
      <h2>Raport pentru o discuție</h2>
      <p>Când, ca părinte, creezi o legătură limitată în timp către un rezumat de cifre alese despre activități și recompense, o poți împărtăși, de exemplu cu un profesor sau un terapeut. Se întâmplă doar pentru că alegi tu. Tu stabilești conținutul și poți revoca legătura. Destinatarul nu are nevoie de cont.</p>
      <p>Dacă protejezi o legătură cu un cod, nu trimite codul în același mesaj cu legătura.</p>
      <h2>Autentificare cu Apple sau Google</h2>
      <ul>
        <li><strong>Autentificare cu Apple:</strong> prelucrăm numele și e-mailul. Dacă alegi să ascunzi e-mailul, păstrăm adresa unică de redirecționare pe care o creează Apple, ca să putem trimite mesaje despre cont.</li>
        <li><strong>Autentificare cu Google:</strong> primim și păstrăm e-mailul și numele contului Google ca să creăm profilul.</li>
      </ul>
      <p>Prelucrarea proprie a Apple și Google urmează politicile lor.</p>
      <h2>Mesaje push și tokenul dispozitivului</h2>
      <p>Dacă activezi mesajele push, păstrăm, pe baza consimțământului tău, un token unic al dispozitivului (APNs sau FCM), ca mesajul să ajungă pe dispozitivul potrivit. Tokenul este legat de contul tău.</p>
      <p>Tokenul expiră la deconectare sau când platforma îl marchează nevalid. Nu păstrăm o caracteristică a dispozitivului fără un abonament push activ. Oprirea este în setările aplicației sau pe dispozitiv.</p>
      <h2>Durata păstrării</h2>
      <p>Păstrăm datele cât timp contul este activ. Dacă ștergi contul, toate datele se șterg imediat și definitiv.</p>
      <h2>Ștergerea contului</h2>
      <p>Ștergi contul în aplicație, din setări. Confirmi cu parola sau cu autentificarea unui terț.</p>
      <p>Nu se poate anula. Dispar contul adultului, profilurile copiilor, planurile, jurnalele zilei, evaluările, recompensele și invitațiile.</p>
      <h2>Păstrare și securitate</h2>
      <p>Urmărim să păstrăm datele de bază în UE/SEE, unde se aplică. Unii furnizori pot prelucra în afara SEE. Transferul și garanțiile sunt în textul acesta și sunt verificate continuu. Conexiunile sunt cifrate (HTTPS). Parolele nu stau în clar. Folosim bcrypt.</p>
      <h2>Cookie-uri</h2>
      <ul>
        <li><strong>Cookie-uri strict necesare</strong> — mereu pornite. Sesiune și protecție CSRF pentru o autentificare sigură.</li>
        <li><strong>Preferințe</strong> — păstrate local, de exemplu o temă.</li>
        <li><strong>Statistică și marketing</strong> — Google Analytics 4, Meta Pixel și Google Ads. Oprite implicit, până consimți în anunțul despre cookie-uri.</li>
      </ul>
      <p>Alegerea ta o păstrăm cel mult un an. O poți schimba în anunț sau în setări. Datele de rutină ale unui copil nu merg către platforme de reclamă.</p>
      <h2>Drepturile tale (GDPR)</h2>
      <ul>
        <li>Dreptul de a șterge contul și datele</li>
        <li>Dreptul de acces</li>
        <li>Dreptul de a rectifica datele inexacte</li>
        <li>Dreptul de opoziție sau de restricționare</li>
        <li>Dreptul de a depune o plângere la autoritatea suedeză Integritetsskyddsmyndigheten (IMY), dacă socotești că încălcăm GDPR</li>
      </ul>
      <h2>Contact</h2>
      <p>Întrebări despre prelucrarea aceasta? Folosește <a href="/en/contact">formularul de contact</a>.</p>
    `,
  },
  terms: {
    title: 'Termeni de utilizare — My Starday',
    description: 'Termenii de utilizare My Starday: cont, copii, preț și răspundere.',
    h1: 'Termeni de utilizare',
    ogTitle: 'Termeni de utilizare',
    body: `
      <p class="updated">Ultima actualizare: octombrie 2026</p>
      <p>Mulțumim că folosești My Starday. Termenii aceștia trebuie să fie limpezi și cinstiți. Întrebările le trimiți prin <a href="/en/contact">formularul de contact</a>.</p>
      <h2>1. Despre serviciu</h2>
      <p>My Starday este un serviciu digital pentru familiile care vor un plan de zi structurat, să marcheze progresul unui copil cu stele și să lase copilul să urmărească activitățile într-o vedere proprie. Serviciul este pentru părinți și titularii răspunderii părintești și pentru copiii lor. O familie are cel puțin un adult cu cont. Un copil intră cu un PIN în vederea copilului.</p>
      <h2>2. Cont și securitate</h2>
      <ul>
        <li>Alege o parolă puternică și nu o împărtăși</li>
        <li>Protejează-ți e-mailul. Cu el îți recapeți accesul</li>
        <li>PIN-ul vederii copilului este doar pentru copil și pentru titularii răspunderii părintești</li>
        <li>Nu folosi aplicația într-un fel care încalcă dreptul suedez</li>
      </ul>
      <p>Răspunzi de tot ce se întâmplă sub contul tău, și când îl folosește altcineva. Dacă bănuiești o folosire abuzivă, scrie imediat.</p>
      <h2>3. Copii și date cu caracter personal</h2>
      <p>My Starday prelucrează date despre copii. Urmăm GDPR și principiul reducerii datelor:</p>
      <ul>
        <li>Un copil este recunoscut printr-un prenume și un emoji ales. Fără nume de familie, fără număr de identificare, fără date de contact</li>
        <li>Părinții sau titularii răspunderii părintești introduc datele și consimt la partajare</li>
        <li>Nu folosim datele copiilor pentru reclamă și pentru nimic altceva decât serviciul</li>
        <li>Rapoartele și planurile se partajează doar când un adult partajează el însuși o legătură limitată în timp</li>
      </ul>
      <h2>4. Conținutul pe care îl creezi</h2>
      <p>Planurile, recompensele, activitățile și observațiile pe care le adaugi îți aparțin ție sau familiei tale. Ne dai dreptul să păstrăm și să afișăm conținutul acesta cât timp contul este activ. Nu îl copiem pentru reclamă, nu îl vindem și nu îl folosim în marketing.</p>
      <h2>5. Utilizare</h2>
      <p>Serviciul este pentru uz personal în familia ta. Nu este permis:</p>
      <ul>
        <li>Uz comercial fără o înțelegere cu Papa Bravo AB</li>
        <li>Să modifici planuri, stele sau recompense în afara mersului obișnuit al aplicației</li>
        <li>Mijloace automate, scrapere sau boți împotriva serviciului</li>
        <li>Să publici conținut ilegal, jignitor sau dăunător</li>
      </ul>
      <h2>6. Încetare și ștergere</h2>
      <p>Poți șterge contul definitiv oricând din setările aplicației, confirmat cu parola.</p>
      <p>Ștergerea îndepărtează imediat și definitiv contul adultului, toți copiii, planurile, jurnalele de activitate, stelele, recompensele și eventualele observații.</p>
      <p>Putem închide un cont care încalcă termenii aceștia sau dreptul suedez.</p>
      <h2>7. Preț</h2>
      <p>Familiile din Irlanda și Canada pot folosi My Starday gratuit până la 31 decembrie 2026 inclusiv. În perioada aceea nu este nevoie de plată. Perioada gratuită nu devine automat un abonament. De la 1 ianuarie 2027 poți alege un abonament în App Store sau pe Google Play. Pe pagina aceasta nu există o casă web. În alte țări se aplică prețul și accesul pe care aplicația le arată pentru țara aceea. Familiile suedeze care încep de la 3 octombrie 2026 pot încerca aplicația 14 zile și apoi pot alege în aplicație 59 de coroane suedeze pe lună sau 590 de coroane suedeze pe an. Familiile care au deja un cont își păstrează oferta existentă.</p>
      <h2>8. Modificări</h2>
      <p>Putem adapta termenii aceștia, de exemplu după o schimbare de lege, o funcție nouă sau o lămurire. Dacă o schimbare este importantă, o spunem prin e-mail sau printr-un anunț în aplicație.</p>
      <p>Dacă folosești serviciul mai departe, asta valorează ca acceptare a noilor termeni.</p>
      <h2>9. Răspundere</h2>
      <p>My Starday este oferit așa cum este. Facem ce putem ca serviciul să fie stabil și sigur, dar nu putem garanta că este mereu disponibil fără întrerupere.</p>
      <p>Papa Bravo AB nu răspunde pentru:</p>
      <ul>
        <li>Pierderea datelor din cauză de forță majoră</li>
        <li>Prejudiciul pentru că împarți un PIN sau date de autentificare cu cineva care nu ar trebui să le aibă</li>
        <li>Prejudiciul indirect, șansa pierdută sau datele pierdute, decât dacă dreptul suedez cere altfel</li>
      </ul>
      <p>Răspunzi de o folosire conform termenilor aceștia și conform dreptului suedez.</p>
      <h2>10. Contact</h2>
      <p>Întrebări despre termenii aceștia sau despre serviciu? Folosește <a href="/en/contact">formularul de contact</a>.</p>
    `,
  },
});

module.exports = { pageFor };
