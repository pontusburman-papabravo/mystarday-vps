'use strict';

/**
 * Lithuanian public pages. Written in Lithuanian.
 * Legal text translates the verified baseline. It adds no Lithuanian statute.
 */

const { composeLocale, faq } = require('../compose-pages');

const pageFor = composeLocale('lt', {
  marker: /vaik/i,
  market: {
    title: (name) => `My Starday — ${name}. Vaizdinis dienos planas vaikams`,
    description: (name) => `Rinkos puslapis: ${name}. Vaizdinis dienos planas lietuviškai. Tai rinkos puslapis, ne atskira kalbos svetainė.`,
    h1: (name) => `Vaizdinis dienos planas šeimoms. Rinka: ${name}`,
    lead: (name) => `Tai puslapis: ${name}. Lietuviška svetainė lieka kalbos svetaine.`,
    registrationOpen: (name) => `Naujos paskyros čia: ${name}, seka esamą registraciją. Numatyta būsena yra atvira.`,
    registrationClosed: (name) => `Naujos paskyros čia: ${name}, numatytuoju atveju nėra atviros. Tai seka esamą registraciją, ne šį puslapį. Numatyta būsena yra uždara.`,
    complimentary: (name) => `${name} galioja esamas nemokamas laikotarpis. Jis pats netampa prenumerata. Šis puslapis nenustato kainos.`,
    introYear: (name) => `${name} išlaiko pasiūlymą, kuris jau yra švedų svetainėje. Šis puslapis nenustato kainos. Šioje rinkoje nėra nemokamo laikotarpio iki 2026 m. gruodžio 31 d.`,
    trial: (name, days) => `Jei paskyra čia vėliau taps įmanoma, galioja esama taisyklė už Švedijos, Airijos ir Kanados ribų: ${days} dienų bandomasis laikotarpis. Mokėjimas pirmiausia turi būti prieinamas. Šioje rinkoje nėra nemokamo laikotarpio iki 2026 m. gruodžio 31 d., ir niekas pats netampa prenumerata. Šis puslapis nenustato kainos.`,
    notTreatment: (name) => `Mygtukas atidaro įprastą App Store puslapį, ne sugalvotą produkto puslapį šiam: ${name}. My Starday yra vaizdinis dienos planas. Tai nėra gydymas ir nežada medicininio rezultato.`,
    register: 'Sukurti paskyrą',
    registerNote: 'Forma klausia, kur gyvena šeima. Ši nuoroda pati nenustato šalies ir nenustato kainos.',
    how: 'Kaip tai veikia',
    playSoon: 'Google Play čia neatidaromas kaip atskiras puslapis.',
  },
  home: {
    title: 'Vaizdinis dienos planas vaikams – rutinos, atlygiai ir piktogramos | My Starday',
    description: 'Vaizdiniai dienos planai ir rutinos, kurie vaikui parodo, kas vyksta dabar ir kas bus toliau. Piktogramos, vaiko vaizdas ir žvaigždės už atliktus žingsnius.',
    h1: 'Vaizdinis dienos planas ir rutinos, kurie vaikui parodo, kas vyksta dabar ir kas bus toliau.',
    ogTitle: 'Vaizdinis dienos planas vaikams',
    faqs: [
      faq('Kas yra My Starday?', 'Vaizdinis dienos planas šeimoms. Vaikas mato kitą žingsnį. Suaugęs laiko nustatymus.'),
      faq('Ar žvaigždes galima nusipirkti?', 'Ne. Žvaigždė yra už atliktą žingsnį. Jos nusipirkti negalima.'),
      faq('Ar tai gydymas?', 'Ne. My Starday yra pagalba kasdienybėje ir nežada medicininio rezultato.'),
    ],
    lead: 'Vaikas nurimsta, kai kitas žingsnis matosi. My Starday dieną rodo paveikslais: dabar, paskui, atlikta.',
    hSee: 'Ką vaikas mato',
    see: 'Vaiko vaizdas rodo vieną žingsnį vienu metu. Suaugęs sudeda planą. Vaikas pažymi. Keli vaikai gali dalytis vienais namais, kiekvienas su savo planu.',
    hStars: 'Žvaigždės',
    stars: 'Atliktas žingsnis gali duoti žvaigždę. Žvaigždžių nusipirkti negalima. Jos nepakeičia susitarimo, kurį sudarėte iš anksto. Daugiau apie tai čia:',
    starsLink: 'atlygio sistema',
    hTreat: 'Ne gydymas',
    treat: 'Planas gali padėti vaikui, kuriam reikia daugiau aiškumo, ir esant ADHD ar autizmui, ir taip pat šeimoms be diagnozės. My Starday nėra gydymas ir nežada konkretaus rezultato.',
    marketsIntro: 'Lietuviška svetainė aiškina produktą. Šalis yra atskiras dalykas. Savas puslapis yra šiam:',
    linkHow: 'Kaip tai veikia',
    linkVisual: 'Vaizdinis dienos planas',
    linkMorning: 'Ryto rutina',
  },
  howItWorks: {
    title: 'Kaip veikia My Starday | Vaizdinis dienos planas',
    description: 'Suaugęs sudeda dieną. Vaikas mato kitą žingsnį ir jį pažymi. Žvaigždės yra už atliktus žingsnius, ne už pirkimą.',
    h1: 'Kaip veikia My Starday',
    ogTitle: 'Kaip tai veikia',
    faqs: [
      faq('Kas nustato planą?', 'Suaugęs. Vaikas mato vaiko vaizdą ir pažymi žingsnius.'),
      faq('Ar vaikui reikia el. pašto?', 'Ne. Vaikas prisijungia vardu ir PIN.'),
    ],
    lead: 'Rytą laiko trys dalykai: matomas planas, vaikas, kuris pažymi pats, ir suaugęs, kuris laiko nustatymus.',
    hPlan: '1. Planas',
    plan: 'Dėkite veiklas ta tvarka, kurią rytas iš tikrųjų turi. Paveikslai padeda, kai vaikas dar neskaito.',
    planLink: 'Vaizdinis dienos planas rodo dabar ir paskui',
    hChild: '2. Vaiko vaizdas',
    child: 'Vaikas mato kitą žingsnį, ne šeimos nustatymus. Nėra reklamų ir nėra socialinio tinklo.',
    hStar: '3. Žvaigždė',
    star: 'Baigtas žingsnis gali duoti žvaigždę. Žvaigždės nusipirkti negalima. Susitarimas stovi iš anksto, ne skubos viduryje.',
    closing: 'My Starday yra pagalba kasdienybėje. Tai nėra gydymas ir nepakeičia gydytojo, terapeuto ar mokyklos patarimo.',
  },
  visualSchedule: {
    title: 'Vaizdinis dienos planas vaikams | My Starday',
    description: 'Vaizdinis dienos planas vaikui parodo, kas vyksta dabar ir kas bus toliau. Mažai žingsnių, pažįstami paveikslai, aiški tvarka.',
    h1: 'Vaizdinis dienos planas vaikams',
    ogTitle: 'Vaizdinis dienos planas',
    faqs: [
      faq('Kiek žingsnių?', 'Dažnai užtenka keturių ar penkių. Ilgesnis sąrašas tinka, kai tvarka jau pažįstama.'),
      faq('Nuotraukos ar ženklai?', 'Paveikslai, kuriuos vaikas jau pažįsta. Namų nuotraukos veikia gerai.'),
    ],
    lead: 'Vaizdinis dienos planas padaro tvarką matomą. Vaikui nereikia spėlioti, kas bus toliau.',
    hNow: 'Dabar ir paskui',
    now: 'Rodykite tik dabartinį žingsnį ir kitą. Ilgas sąrašas ant sienos padeda mažiau nei vienas aiškus kitas judesys.',
    hStuck: 'Jei vienas žingsnis stringa',
    stuck1: 'Padalykite žingsnį. „Rengimasis“ tampa kojinės, kelnės, marškinėliai.',
    stuck2: 'Po vieną.',
    stuck3: 'Parodykite, užuot kartoję.',
    bridge: 'Rytas yra centre',
    morningLink: 'ryto rutina',
    weekLink: 'Savaitės planas parodo, kuri diena yra',
    closing: 'My Starday nėra gydymas ir nežada medicininio rezultato.',
  },
  morningRoutine: {
    title: 'Ryto rutina vaikams | My Starday',
    description: 'Ryto rutina su paveikslais sumažina sakomus priminimus. Ta pati tvarka, dieną po dienos.',
    h1: 'Ryto rutina vaikams',
    ogTitle: 'Ryto rutina',
    faqs: [
      faq('Kas priklauso rytui?', 'Tik tai, kas prieš duris iš tikrųjų vyksta. Kelimasis, rengimasis, valgymas, dantys, striukė.'),
      faq('Jei laiko mažai?', 'Trumpinkite sąrašą, užuot kalbėję greičiau. Trumpesnis planas yra tikras planas.'),
    ],
    lead: 'Ta pati tvarka paverčia sąrašą įpročiu. Užuot dar kartą sakę „išsivalyk dantis“, žiūrite į kitą paveikslą.',
    hExample: 'Pavyzdys',
    steps: ['Kelimasis', 'Tualetas ir rankų plovimas', 'Rengimasis', 'Pusryčiai', 'Dantų valymas', 'Striukė, batai, kuprinė'],
    age: 'Darželinio amžiaus vaikas dažnai geriau susitvarko su keturiais ar penkiais žingsniais.',
    bridge: 'Šeimos, kurios perėjimuose ieško daugiau atramos, gali perskaityti',
    bridgeLink: 'aiškumo gidą',
    closing: 'My Starday yra atrama dienoje, ne gydymas.',
  },
  weeklySchedule: {
    title: 'Savaitės planas su piktogramomis vaikams | My Starday',
    description: 'Savaitės planas su piktogramomis parodo, kuri diena yra, ne tik tai, kas vyksta dabar.',
    h1: 'Savaitės planas su piktogramomis',
    ogTitle: 'Savaitės planas su piktogramomis',
    faqs: [
      faq('Kuo jis skiriasi nuo dienos plano?', 'Dienos planas yra šiandienos žingsniai. Savaitės planas parodo, kuo dienos skiriasi.'),
      faq('Nuo kokio amžiaus?', 'Dažnai apie mokyklos pradžią, kai savaitė labiau keičiasi. Mažesniam vaikui pirmiausia reikia šiandienos.'),
    ],
    lead: 'Savaitės planas padeda, kai šiokiadienis ir savaitgalis skiriasi arba kai prieš miegą reikia atsakymo į „kas bus rytoj?“.',
    mid: 'Pirmadienį sportas, trečiadienį pas kitą tėvą, penktadienį filmas. Paveikslai tai padaro matoma, kol vaikas neskaito kalendoriaus.',
    dayLink: 'Dienos planas',
    dayRest: 'yra šiandienos žingsniai. Savaitės planas pasako, kuri diena yra.',
    closing: 'My Starday nežada medicininio rezultato.',
  },
  neurodiverseRoutines: {
    title: 'Rutinos neuroįvairiems vaikams | My Starday',
    description: 'Daugiau aiškumo dienoje vaikui, kuriam reikia aiškių perėjimų. My Starday yra pagalba kasdienybėje, ne gydymas ir ne diagnozė.',
    h1: 'Rutinos neuroįvairiems vaikams',
    ogTitle: 'Rutinos neuroįvairiems vaikams',
    faqs: [
      faq('Ar tai tik diagnozei?', 'Ne. Planas padeda ten, kur reikia daugiau aiškumo. Diagnozė nėra sąlyga.'),
      faq('Ar tai pakeičia terapiją?', 'Ne. Tai nėra gydymas ir nepakeičia specialisto patarimo.'),
    ],
    lead: 'Kai kuriam vaikui kitą žingsnį reikia pamatyti, ne išgirsti garsiau. Tai tiesa ir su diagnoze, ir be jos.',
    hAdhd: 'ADHD: pajudėti ir likti prie žingsnio',
    adhd: 'Keitimas dažnai sustoja, nes kito žingsnio nematyti. Planas su žyma iškart rodo: šis žingsnis atliktas.',
    hAutism: 'Autizmas: nuspėjamumas',
    autism: 'Kita tvarka gali būti didelė.',
    weekLink: 'Savaitės planas',
    autismRest: 'iš anksto parodo, kuri diena ateina. Išimtas žingsnis turi pasikeisti matomai, ne tyliai dingti.',
    closing: 'My Starday yra pagalba kasdienybėje. Tai nėra medicininis gydymas ir nepakeičia gydytojo, kineziterapeuto, logopedo ar mokyklos patarimo. Kortelių su prasme pirma, paskui ir atlikta dar nėra lietuvišku PDF. Tokios kortelės duoda mintį, ne oficialų metodą ir ne sertifikatą.',
  },
  rewardSystem: {
    title: 'Atlygio sistema vaikams | My Starday',
    description: 'Iš anksto sutartas atlygis yra kas kita nei derėjimasis akimirkoje. Vaikas žvaigždes užsidirba. Jų nusipirkti negalima.',
    h1: 'Atlygio sistema vaikams, netampant derėjimusi',
    ogTitle: 'Atlygio sistema vaikams',
    faqs: [
      faq('Ar žvaigždžių kortelė yra papirkimas?', 'Ne, jei atlygis stovi iš anksto ir yra susietas su tuo, ką vaikas gali padaryti. Derėjimą siūlo akimirkoje, kad kas nors liautųsi.'),
      faq('Kiek žvaigždžių?', 'Pradėkite nuo vienos žvaigždės už atliktą žingsnį. Žvaigždžių nusipirkti negalima.'),
    ],
    lead: '„Ar tai ne šiaip papirkimas?“ priklauso nuo to, kada sutarėte. Išankstinis susitarimas gali paremti įprotį. Pykčio viduryje jis tampa derėjimusi.',
    planLink: 'Vaizdiniame dienos plane',
    chain: 'grandinė paprasta: pamatyti žingsnį, padaryti, pažymėti, gauti žvaigždę.',
    steps: [
      'Būkite konkretūs. Atlyginkite „valo dantis be priminimo“, ne „gerai“.',
      'Rodykite pažangą.',
      'Skaičiuokite bandymą, ne tik tobulą rytą.',
      'Leiskite vaikui kartu galvoti apie atlygį.',
      'Retinkite žvaigždes, kai įprotis jau yra.',
    ],
    closing: 'Žvaigždžių nusipirkti negalima. My Starday nežada medicininio rezultato.',
  },
  resources: {
    title: 'Medžiaga vaizdinėms rutinoms | My Starday',
    description: 'Kas lietuviškai jau yra ir ko dar nėra kaip PDF. Programa ir atspausdintas lapas yra du skirtingi dalykai.',
    h1: 'Medžiaga',
    ogTitle: 'Medžiaga',
    faqs: [faq('Ar yra lietuviškų PDF?', 'Dar nėra. Šis puslapis neparduoda švediškų lapų kaip lietuviško vertimo.')],
    lead: 'Programa dieną rodo ekrane. Atspausdintas lapas yra kas kita. Lietuviško PDF vaikui čia dar nėra.',
    app: 'Programoje sudedate',
    dayLink: 'dienos planą',
    morningLink: 'ryto rutiną',
    weekLink: 'savaitės planą',
    appRest: 'Vaikas tą pačią tvarką mato vaiko vaizde.',
    nolink: 'Nesiejame kitos kalbos rinkinio taip, lyg jis būtų lietuviškas. Kai lietuviški lapai atsiras, jie bus šiame puslapyje.',
  },
  faq: {
    title: 'Dažni klausimai | My Starday',
    description: 'Trumpi atsakymai apie dienos planą, žvaigždes, vaiko vaizdą, kainą ir apie tai, kuo My Starday nėra.',
    h1: 'Dažni klausimai',
    ogTitle: 'Dažni klausimai',
    faqs: [
      faq('Kam skirta svetainė?', 'Lietuviška svetainė aiškina produktą. Lietuva turi savo rinkos puslapį. Kalba lieka lietuvių.'),
      faq('Ar galiu nusipirkti žvaigždžių?', 'Ne.'),
      faq('Ar tai terapijos programa?', 'Ne. Gydymo nėra ir pažadėto medicininio rezultato nėra.'),
      faq('Kur sukuriu paskyrą?', 'Esamoje formoje. Ji klausia, kur gyvena šeima. Rinkos puslapis pats šalies nenustato.'),
    ],
    lead: 'Trumpi atsakymai. Ilgesni tekstai yra giduose.',
    hLang: 'Kalba ir šalis',
    lang: 'Ši svetainė yra lietuviškai. Šalis pasirenkama atskirai. Rinkos puslapis nekeičia kalbos ir nesukuria paskyros.',
    hChild: 'Vaikas',
    child: 'Vaikas mato planą ir pažymi. Nustatymai, kvietimai ir paskyra lieka suaugusiam. Daugiau yra čia:',
    howLink: 'Kaip tai veikia',
    hStars: 'Žvaigždės',
    stars: 'Žvaigždės yra už atliktus žingsnius. Jų nusipirkti negalima. Skaityk',
    starsLink: 'atlygio sistemą',
  },
  privacy: {
    title: 'Privatumo pranešimas — My Starday',
    description: 'Kokius duomenis My Starday tvarko, ko nerenkame ir kokias teises duoda GDPR.',
    h1: 'My Starday privatumo pranešimas',
    ogTitle: 'Privatumo pranešimas',
    body: `
      <p class="updated">Paskutinį kartą atnaujinta: 2026 m. spalis</p>
      <p>Su privatumu elgiamės rūpestingai. My Starday renka kiek įmanoma mažiau: tik tai, ko programai reikia, kad veiktų. Tavo duomenų neparduodame ir nenaudojame jų tikslinei reklamai. Perdavimas už paslaugos ribų vyksta tik tada, kai tu pasirenki, arba kai to reikia, kad tvarkytojai galėtų laikyti paslaugą.</p>
      <p><strong>Duomenų valdytojas:</strong> Papa Bravo AB atsako už tavo asmens duomenų tvarkymą. Rašai mums per <a href="/en/contact">kontaktų formą</a>.</p>
      <h2>Ką renkame</h2>
      <p>Duomenis tvarkome sutarties pagrindu, kad duotume programą ir funkcijas, kurioms registruojiesi. Apie suaugusius ir šeimas renkame:</p>
      <ul>
        <li><strong>El. paštas</strong> — prisijungimui ir paskyros žinutėms</li>
        <li><strong>Vardas ir pavardė</strong> — kad paskyrą atpažintume</li>
        <li><strong>Veiklų žurnalas</strong> — kurios veiklos atliktos ir kada</li>
        <li><strong>Žvaigždės</strong> — uždirbtos ir panaudotos žvaigždės</li>
        <li><strong>Planai ir veiklos</strong> — ką sukuri pats</li>
      </ul>
      <p><strong>Vaiko privatumas:</strong> vaikas pažįstamas tik vardu arba pravarde ir pasirinktu emoji. Nerenkame pavardės, asmens kodo ar vaiko kontaktų.</p>
      <h2>Ko nerenkame</h2>
      <ul>
        <li>Vaikų pavardžių</li>
        <li>Asmens kodo, nei suaugusio, nei vaiko</li>
        <li>Informacijos apie vaiko sveikatą, diagnozę ar negalią</li>
        <li>Mokėjimo duomenų. Pirkimas eina per App Store arba Google Play</li>
        <li>Vietos duomenų</li>
      </ul>
      <h2>Kam duomenis naudojame</h2>
      <ul>
        <li>Parodyti vaikui dienos planą</li>
        <li>Išsaugoti pažangą ir žvaigždes</li>
        <li>Siųsti patvirtinimo laišką ir paskyros žinutes</li>
        <li>Atsakyti į žinutes, kurias mums siunti</li>
      </ul>
      <h2>Perdavimas</h2>
      <p>Tavo duomenų reklamai neperduodame. Šie tvarkytojai laiko paslaugą. Jie tvarko tik mūsų pavedimu ir pagal GDPR:</p>
      <ul>
        <li><strong>Neon (duomenų bazė)</strong> — paskyra, planai, veiklos ir šeimos duomenys</li>
        <li><strong>Sava talpinimas (VPS ES arba EEE)</strong> — žiniatinklio programa ir API</li>
        <li><strong>Resend (el. paštas)</strong> — sandorio laiškas, pavyzdžiui patvirtinimas, slaptažodis ir pasveikinimo laiškas</li>
        <li><strong>Cloudflare R2</strong> — įkeltos profilio nuotraukos, jei funkciją naudoji</li>
        <li><strong>Apple ir Google</strong> — prisijungimas ir push žinutės per APNs ir FCM, jei funkcijas naudoji</li>
      </ul>
      <h2>Ataskaita pokalbiui</h2>
      <p>Jei kaip globėjas sukuri laike ribotą nuorodą su pasirinktais veiklos ir atlygio skaičiais, gali ja pasidalyti, pavyzdžiui, su mokytoju ar terapeutu. Tai vyksta tik todėl, kad tu pasirenki. Turinį nustatai tu ir nuorodą gali atšaukti. Gavėjui paskyros nereikia.</p>
      <p>Jei nuorodą saugai kodu, nesidalyk kodu toje pačioje žinutėje kaip nuoroda.</p>
      <h2>Prisijungimas su Apple arba Google</h2>
      <ul>
        <li><strong>Prisijungimas su Apple:</strong> tvarkome vardą ir el. paštą. Jei el. paštą paslepi, saugome unikalų persiuntimo adresą, kurį sukuria Apple, kad galėtume siųsti paskyros žinutes.</li>
        <li><strong>Prisijungimas su Google:</strong> gauname ir saugome Google paskyros el. paštą ir vardą, kad sukurtume profilį.</li>
      </ul>
      <p>Apple ir Google pačių tvarkymą dengia jų pačių pranešimai.</p>
      <h2>Push žinutės ir įrenginio žetonas</h2>
      <p>Jei įjungi push žinutes, tavo sutikimo pagrindu saugome unikalų įrenginio žetoną (APNs arba FCM), kad žinutė pasiektų tinkamą įrenginį. Žetonas susietas su tavo paskyra.</p>
      <p>Žetonas baigiasi atsijungus arba kai platforma jį pažymi negaliojančiu. Įrenginio savybių be aktyvios push prenumeratos nesaugome. Išjungimas yra programos nustatymuose arba įrenginyje.</p>
      <h2>Saugojimo laikas</h2>
      <p>Duomenis saugome, kol paskyra aktyvi. Jei paskyrą ištrini, visi duomenys ištrinami iškart ir visam laikui.</p>
      <h2>Paskyros ištrynimas</h2>
      <p>Paskyrą ištrini programoje, nustatymuose. Patvirtini slaptažodžiu arba trečiosios šalies prisijungimu.</p>
      <p>To negalima atšaukti. Dingsta suaugusiojo paskyra, vaikų profiliai, planai, dienoraščiai, vertinimai, atlygiai ir kvietimai.</p>
      <h2>Saugojimas ir saugumas</h2>
      <p>Siekiame, kad pagrindiniai duomenys būtų saugomi ES arba EEE, kur tai galioja. Kai kurie teikėjai gali tvarkyti ir už EEE ribų. Perdavimai ir garantijos yra šiame tekste, ir mes juos nuolat peržiūrime. Ryšiai šifruoti (HTTPS). Slaptažodžiai nesaugomi skaitoma forma. Naudojame bcrypt.</p>
      <h2>Slapukai</h2>
      <ul>
        <li><strong>Būtini slapukai</strong> — visada įjungti. Seansas ir CSRF apsauga saugiam prisijungimui.</li>
        <li><strong>Nuostatos</strong> — saugomos vietoje, pavyzdžiui tema.</li>
        <li><strong>Statistika ir rinkodara</strong> — Google Analytics 4, Meta Pixel ir Google Ads. Numatytuoju atveju išjungta, kol slapukų pranešime nesutinki.</li>
      </ul>
      <p>Tavo pasirinkimą saugome ne ilgiau kaip metus. Gali jį pakeisti pranešime arba nustatymuose. Vaiko rutinos duomenys neina į reklamos platformas.</p>
      <h2>Tavo teisės (GDPR)</h2>
      <ul>
        <li>Teisė ištrinti paskyrą ir duomenis</li>
        <li>Teisė susipažinti</li>
        <li>Teisė ištaisyti netikslius duomenis</li>
        <li>Teisė nesutikti arba apriboti</li>
        <li>Teisė skųstis Švedijos priežiūros institucijai Integritetsskyddsmyndigheten (IMY), jei manai, kad pažeidžiame GDPR</li>
      </ul>
      <h2>Kontaktas</h2>
      <p>Turi klausimą apie šį tvarkymą? Naudok <a href="/en/contact">kontaktų formą</a>.</p>
    `,
  },
  terms: {
    title: 'Naudojimo sąlygos — My Starday',
    description: 'My Starday naudojimo sąlygos: paskyra, vaikai, kaina ir atsakomybė.',
    h1: 'Naudojimo sąlygos',
    ogTitle: 'Naudojimo sąlygos',
    body: `
      <p class="updated">Paskutinį kartą atnaujinta: 2026 m. spalis</p>
      <p>Ačiū, kad naudoji My Starday. Šios sąlygos turi būti aiškios ir sąžiningos. Klausimus siunti per <a href="/en/contact">kontaktų formą</a>.</p>
      <h2>1. Apie paslaugą</h2>
      <p>My Starday yra skaitmeninė paslauga šeimoms, kurios nori sutvarkyto dienos plano, vaiko pažangą žymėti žvaigždėmis ir leisti vaikui veiklas sekti savo vaizde. Paslauga skirta tėvams ir globėjams bei jų vaikams. Šeimoje yra bent vienas suaugęs su paskyra. Vaikas į vaiko vaizdą įeina su PIN.</p>
      <h2>2. Paskyra ir saugumas</h2>
      <ul>
        <li>Pasirink stiprų slaptažodį ir juo nesidalyk</li>
        <li>Saugok savo el. paštą. Su juo atgauni prieigą</li>
        <li>Vaiko vaizdo PIN yra tik vaikui ir globėjams</li>
        <li>Nenaudok programos būdu, kuris prieštarauja Švedijos teisei</li>
      </ul>
      <p>Atsakai už viską, kas vyksta po tavo paskyra, net jei ja naudojasi kitas. Jei įtari piktnaudžiavimą, pasakyk iškart.</p>
      <h2>3. Vaikai ir asmens duomenys</h2>
      <p>My Starday tvarko duomenis apie vaikus. Laikomės GDPR ir duomenų mažinimo principo:</p>
      <ul>
        <li>Vaikas pažįstamas vardu ir pasirinktu emoji. Be pavardės, be asmens kodo, be kontaktų</li>
        <li>Tėvai arba globėjai įveda duomenis ir sutinka dalytis</li>
        <li>Vaikų duomenys nenaudojami reklamai ir niekam kitam, tik paslaugai</li>
        <li>Ataskaita ir planas dalijami tik tada, kai suaugęs pats pasidalija laike ribota nuoroda</li>
      </ul>
      <h2>4. Turinys, kurį sukuri</h2>
      <p>Planai, atlygiai, veiklos ir stebėjimai, kuriuos pridedi, yra tavo arba tavo šeimos. Duodi mums teisę šį turinį saugoti ir rodyti, kol paskyra aktyvi. Jo nekopijuojame į reklamą, neparduodame ir nenaudojame rinkodaroje.</p>
      <h2>5. Naudojimas</h2>
      <p>Paslauga skirta tavo šeimos asmeniniam naudojimui. Neleidžiama:</p>
      <ul>
        <li>Komercinis naudojimas be susitarimo su Papa Bravo AB</li>
        <li>Planų, žvaigždžių ar atlygių keitimas už įprastos programos eigos ribų</li>
        <li>Automatizuotas įrankis, skreperis ar botas prieš paslaugą</li>
        <li>Neteisėto, įžeidžiančio ar žalingo turinio skelbimas</li>
      </ul>
      <h2>6. Nutraukimas ir ištrynimas</h2>
      <p>Paskyrą gali visam laikui ištrinti bet kada programos nustatymuose, patvirtindamas slaptažodžiu.</p>
      <p>Ištrynimas iškart ir visam laikui pašalina suaugusiojo paskyrą, visus vaikus, planus, veiklų žurnalus, žvaigždes, atlygius ir galimus stebėjimus.</p>
      <p>Galime sustabdyti paskyrą, kuri pažeidžia šias sąlygas arba Švedijos teisę.</p>
      <h2>7. Kaina</h2>
      <p>Šeimos Airijoje ir Kanadoje gali naudoti My Starday nemokamai iki 2026 m. gruodžio 31 d. imtinai. Tuo laikotarpiu mokėti nereikia. Nemokamas laikotarpis automatiškai netampa prenumerata. Nuo 2027 m. sausio 1 d. gali pasirinkti prenumeratą App Store arba Google Play. Šiame puslapyje nėra internetinės kasos. Kitose šalyse galioja kaina ir prieiga, kurią programa rodo tai šaliai. Švedijos šeimos, kurios pradeda nuo 2026 m. spalio 3 d., gali programą bandyti 14 dienų ir paskui programoje pasirinkti 59 Švedijos kronas per mėnesį arba 590 Švedijos kronų per metus. Šeimos, kurios jau turi paskyrą, išlaiko esamą pasiūlymą.</p>
      <h2>8. Pakeitimai</h2>
      <p>Šias sąlygas galime keisti, pavyzdžiui po teisės pakeitimo, naujos funkcijos ar patikslinimo. Jei pakeitimas esminis, pasakome el. paštu arba pranešimu programoje.</p>
      <p>Jei po to toliau naudoji paslaugą, tai yra naujų sąlygų priėmimas.</p>
      <h2>9. Atsakomybė</h2>
      <p>My Starday duodamas toks, koks yra. Darome, ką galime, kad paslauga būtų stabili ir saugi, bet negalime garantuoti, kad ji visada prieinama be pertrūkio.</p>
      <p>Papa Bravo AB neatsako už:</p>
      <ul>
        <li>Duomenų praradimą dėl nenugalimos jėgos</li>
        <li>Žalą, nes dalijiesi PIN arba prisijungimo duomenimis su kuo nors, kas neturėtų jų gauti</li>
        <li>Netiesioginę žalą, praleistą galimybę ar prarastus duomenis, nebent Švedijos teisė reikalauja kitaip</li>
      </ul>
      <p>Atsakai už naudojimą pagal šias sąlygas ir Švedijos teisę.</p>
      <h2>10. Kontaktas</h2>
      <p>Turi klausimą apie šias sąlygas ar paslaugą? Naudok <a href="/en/contact">kontaktų formą</a>.</p>
    `,
  },
});

module.exports = { pageFor };
