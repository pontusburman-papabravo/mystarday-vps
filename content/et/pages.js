'use strict';

/**
 * Estonian public pages. Written in Estonian.
 * Legal text translates the verified baseline. It adds no Estonian statute.
 */

const { composeLocale, faq } = require('../compose-pages');

const pageFor = composeLocale('et', {
  marker: /laps/i,
  market: {
    title: (name) => `My Starday — ${name}. Visuaalne päevakava lastele`,
    description: (name) => `Turuleht: ${name}. Visuaalne päevakava eesti keeles. See on turuleht, mitte eraldi keeleline veebileht.`,
    h1: (name) => `Visuaalne päevakava peredele. Turg: ${name}`,
    lead: (name) => `See on leht: ${name}. Eestikeelne veeb jääb keeleliseks veebiks.`,
    registrationOpen: (name) => `Uued kontod siin: ${name}, järgivad olemasolevat registreerimist. Vaikimisi on avatud.`,
    registrationClosed: (name) => `Uued kontod siin: ${name}, ei ole vaikimisi avatud. See järgib olemasolevat registreerimist, mitte seda lehte. Vaikimisi on suletud.`,
    complimentary: (name) => `${name} puhul kehtib olemasolev tasuta periood. See ei muutu ise tellimuseks. See leht ei määra hinda.`,
    introYear: (name) => `${name} jätab alles pakkumise, mis on juba Rootsi veebis. See leht ei määra hinda. Sellel turul ei ole tasuta perioodi kuni 31. detsembrini 2026.`,
    trial: (name, days) => `Kui konto siin hiljem võimalikuks saab, kehtib olemasolev reegel väljaspool Rootsit, Iirimaad ja Kanadat: ${days} päeva prooviperiood. Makse peab enne saadaval olema. Sellel turul ei ole tasuta perioodi kuni 31. detsembrini 2026 ja miski ei muutu ise tellimuseks. See leht ei määra hinda.`,
    notTreatment: (name) => `Nupp avab tavalise App Store’i lehe, mitte väljamõeldud tootelehe selle jaoks: ${name}. My Starday on visuaalne päevakava. See ei ole ravi ega luba meditsiinilist tulemust.`,
    register: 'Loo konto',
    registerNote: 'Vorm küsib, kus pere elab. See link ise ei sea riiki ega määra hinda.',
    how: 'Kuidas see töötab',
    playSoon: 'Google Play ei avane siin omaette lehena.',
  },
  home: {
    title: 'Visuaalne päevakava lastele – rutiinid, preemiad ja piktogrammid | My Starday',
    description: 'Visuaalsed päevakavad ja rutiinid, mis näitavad lapsele, mis toimub praegu ja mis tuleb järgmisena. Piktogrammid, lapse vaade ja tähed valmis sammude eest.',
    h1: 'Visuaalne päevakava ja rutiinid, mis näitavad lapsele, mis toimub praegu ja mis tuleb järgmisena.',
    ogTitle: 'Visuaalne päevakava lastele',
    faqs: [
      faq('Mis on My Starday?', 'Visuaalne päevakava peredele. Laps näeb järgmist sammu. Täiskasvanu hoiab seadeid.'),
      faq('Kas tähti saab osta?', 'Ei. Täht on valmis sammu eest. Seda ei saa osta.'),
      faq('Kas see on ravi?', 'Ei. My Starday on abi argipäevas ega luba meditsiinilist tulemust.'),
    ],
    lead: 'Laps rahuneb, kui järgmine samm on näha. My Starday näitab päeva piltidena: praegu, siis, valmis.',
    hSee: 'Mida laps näeb',
    see: 'Lapse vaade näitab ühte sammu korraga. Täiskasvanu paneb kava kokku. Laps märgib. Mitu last võivad jagada üht kodu, igaüks oma kavaga.',
    hStars: 'Tähed',
    stars: 'Valmis samm võib anda tähe. Tähti ei saa osta. Need ei asenda kokkulepet, mille te ette tegite. Sellest on rohkem siin:',
    starsLink: 'preemiasüsteem',
    hTreat: 'Ei ole ravi',
    treat: 'Kava võib aidata last, kes vajab rohkem selgust, ka ADHD või autismi korral, ja samamoodi peresid ilma diagnoosita. My Starday ei ole ravi ega luba kindlat tulemust.',
    marketsIntro: 'Eestikeelne veeb selgitab toodet. Riik on eraldi asi. Oma leht on selle jaoks:',
    linkHow: 'Kuidas see töötab',
    linkVisual: 'Visuaalne päevakava',
    linkMorning: 'Hommikurutiin',
  },
  howItWorks: {
    title: 'Kuidas My Starday töötab | Visuaalne päevakava',
    description: 'Täiskasvanu paneb päeva kokku. Laps näeb järgmist sammu ja märgib selle. Tähed on valmis sammude eest, mitte ostu eest.',
    h1: 'Kuidas My Starday töötab',
    ogTitle: 'Kuidas see töötab',
    faqs: [
      faq('Kes seab kava paika?', 'Täiskasvanu. Laps näeb lapse vaadet ja märgib sammud.'),
      faq('Kas laps vajab e-posti?', 'Ei. Laps logib sisse nime ja PIN-koodiga.'),
    ],
    lead: 'Hommikut hoiavad kolm asja: nähtav kava, laps, kes märgib ise, ja täiskasvanu, kes hoiab seadeid.',
    hPlan: '1. Kava',
    plan: 'Pange tegevused sellesse järjekorda, mis hommikul päriselt on. Pildid aitavad, kui laps veel ei loe.',
    planLink: 'Visuaalne päevakava näitab praegust ja järgmist',
    hChild: '2. Lapse vaade',
    child: 'Laps näeb järgmist sammu, mitte pere seadeid. Reklaami ei ole ja suhtlusvõrku ei ole.',
    hStar: '3. Täht',
    star: 'Lõpetatud samm võib anda tähe. Tähte ei saa osta. Kokkulepe seisab ees, mitte kiirustamise keskel.',
    closing: 'My Starday on abi argipäevas. See ei ole ravi ega asenda arsti, terapeudi ega kooli nõuannet.',
  },
  visualSchedule: {
    title: 'Visuaalne päevakava lastele | My Starday',
    description: 'Visuaalne päevakava näitab lapsele, mis toimub praegu ja mis tuleb järgmisena. Vähe samme, tuttavad pildid, selge järjekord.',
    h1: 'Visuaalne päevakava lastele',
    ogTitle: 'Visuaalne päevakava',
    faqs: [
      faq('Mitu sammu?', 'Sageli piisab neljast või viiest. Pikem nimekiri sobib, kui järjekord on juba tuttav.'),
      faq('Fotod või märgid?', 'Pildid, mida laps juba tunneb. Kodused fotod töötavad hästi.'),
    ],
    lead: 'Visuaalne päevakava teeb järjekorra nähtavaks. Laps ei pea arvama, mis järgmisena tuleb.',
    hNow: 'Praegu ja siis',
    now: 'Näidake ainult praegust sammu ja järgmist. Pikk nimekiri seinal aitab vähem kui üks selge järgmine liigutus.',
    hStuck: 'Kui üks samm takerdub',
    stuck1: 'Jagage samm. „Riietumine“ on sokid, püksid, särk.',
    stuck2: 'Ükshaaval.',
    stuck3: 'Näidake, selle asemel et korrata.',
    bridge: 'Hommik on keskel',
    morningLink: 'hommikurutiin',
    weekLink: 'Nädala kava näitab, mis päev on',
    closing: 'My Starday ei ole ravi ega luba meditsiinilist tulemust.',
  },
  morningRoutine: {
    title: 'Hommikurutiin lastele | My Starday',
    description: 'Piltidega hommikurutiin vähendab öeldud meeldetuletusi. Sama järjekord, päevast päeva.',
    h1: 'Hommikurutiin lastele',
    ogTitle: 'Hommikurutiin',
    faqs: [
      faq('Mis kuulub hommikusse?', 'Ainult see, mis enne ust päriselt juhtub. Tõusmine, riietumine, söömine, hambad, jope.'),
      faq('Kui aega on vähe?', 'Lühendage nimekirja, selle asemel et rääkida kiiremini. Lühem kava on päris kava.'),
    ],
    lead: 'Sama järjekord teeb nimekirjast harjumuse. Selle asemel et öelda veel kord „pese hambaid“, vaatate järgmist pilti.',
    hExample: 'Näide',
    steps: ['Tõusmine', 'Tualett ja kätepesu', 'Riietumine', 'Hommikusöök', 'Hammaste pesemine', 'Jope, kingad, kott'],
    age: 'Lasteaiaealine laps saab sageli paremini hakkama nelja või viie sammuga.',
    bridge: 'Pered, kes otsivad üleminekutel rohkem tuge, võivad lugeda',
    bridgeLink: 'selguse juhendit',
    closing: 'My Starday on tugi päevas, mitte ravi.',
  },
  weeklySchedule: {
    title: 'Nädala kava piktogrammidega lastele | My Starday',
    description: 'Piktogrammidega nädala kava näitab, mis päev on, mitte ainult seda, mis parasjagu toimub.',
    h1: 'Nädala kava piktogrammidega',
    ogTitle: 'Nädala kava piktogrammidega',
    faqs: [
      faq('Mille poolest erineb päevakavast?', 'Päevakava on tänased sammud. Nädala kava näitab, mille poolest päevad erinevad.'),
      faq('Mis vanusest?', 'Sageli kooli alguse paiku, kui nädal vahetub rohkem. Noorem laps vajab esmalt tänast päeva.'),
    ],
    lead: 'Nädala kava aitab, kui argipäev ja nädalavahetus on erinevad või kui enne und on vaja vastust küsimusele „mis homme tuleb?“.',
    mid: 'Esmaspäeval sport, kolmapäeval teise vanema juures, reedel film. Pildid teevad selle nähtavaks enne, kui laps kalendrit loeb.',
    dayLink: 'Päevakava',
    dayRest: 'on tänased sammud. Nädala kava ütleb, mis päev on.',
    closing: 'My Starday ei luba meditsiinilist tulemust.',
  },
  neurodiverseRoutines: {
    title: 'Rutiinid neurodivergentsetele lastele | My Starday',
    description: 'Rohkem selgust päevas lapsele, kes vajab selgeid üleminekuid. My Starday on abi argipäevas, mitte ravi ega diagnoos.',
    h1: 'Rutiinid neurodivergentsetele lastele',
    ogTitle: 'Rutiinid neurodivergentsetele lastele',
    faqs: [
      faq('Kas see on ainult diagnoosi jaoks?', 'Ei. Kava aitab seal, kus on vaja rohkem selgust. Diagnoos ei ole tingimus.'),
      faq('Kas see asendab teraapiat?', 'Ei. See ei ole ravi ega asenda spetsialisti nõuannet.'),
    ],
    lead: 'Mõni laps peab järgmist sammu nägema, mitte valjemini kuulma. See kehtib diagnoosiga ja ilma.',
    hAdhd: 'ADHD: liikuma saada ja sammu juurde jääda',
    adhd: 'Vahetus jääb sageli seisma, sest järgmist sammu ei ole näha. Märgitav kava näitab kohe: see samm on valmis.',
    hAutism: 'Autism: etteaimatavus',
    autism: 'Teine järjekord võib olla suur.',
    weekLink: 'Nädala kava',
    autismRest: 'näitab ette, mis päev tuleb. Välja jäetud samm peab muutuma nähtavalt, mitte vaikselt kaduma.',
    closing: 'My Starday on abi argipäevas. See ei ole meditsiiniline ravi ega asenda arsti, füsioterapeudi, logopeedi ega kooli nõuannet. Kaarte tähendusega kõigepealt, siis ja valmis ei ole veel eesti PDF-ina. Sellised kaardid annavad mõtte, mitte ametliku meetodi ega tunnistuse.',
  },
  rewardSystem: {
    title: 'Preemiasüsteem lastele | My Starday',
    description: 'Ette kokku lepitud preemia on midagi muud kui kauplemine hetkes. Laps teenib tähed. Neid ei saa osta.',
    h1: 'Preemiasüsteem lastele, ilma et sellest saaks kauplemine',
    ogTitle: 'Preemiasüsteem lastele',
    faqs: [
      faq('Kas tähekaart on altkäemaks?', 'Ei, kui preemia seisab ees ja on seotud millegagi, mida laps suudab teha. Kauplemist pakutakse hetkes, et miski lakkaks.'),
      faq('Mitu tähte?', 'Alustage ühe tähega valmis sammu kohta. Tähti ei saa osta.'),
    ],
    lead: '„Kas see ei ole lihtsalt altkäemaks?“ oleneb sellest, millal te kokku leppisite. Ette tehtud kokkulepe võib harjumust toetada. Viha keskel saab sellest kauplemine.',
    planLink: 'Visuaalses päevakavas',
    chain: 'ahel on lihtne: näha sammu, teha see, märkida, saada täht.',
    steps: [
      'Olge konkreetsed. Premeerige „peseb hambaid ilma meeldetuletuseta“, mitte „hästi“.',
      'Näidake edenemist.',
      'Lugege katset, mitte ainult täiuslikku hommikut.',
      'Laske lapsel preemia üle kaasa mõelda.',
      'Harvendage tähti, kui harjumus on olemas.',
    ],
    closing: 'Tähti ei saa osta. My Starday ei luba meditsiinilist tulemust.',
  },
  resources: {
    title: 'Materjalid visuaalsete rutiinide jaoks | My Starday',
    description: 'Mis on eesti keeles juba olemas ja mis ei ole veel PDF-ina. Rakendus ja trükitud leht on kaks eri asja.',
    h1: 'Materjalid',
    ogTitle: 'Materjalid',
    faqs: [faq('Kas eesti PDF-e on?', 'Veel ei ole. See leht ei müü rootsi lehti eesti tõlkena.')],
    lead: 'Rakendus näitab päeva ekraanil. Trükitud leht on midagi muud. Eesti PDF-i lapse jaoks siin veel ei ole.',
    app: 'Rakenduses panete kokku',
    dayLink: 'päevakava',
    morningLink: 'hommikurutiini',
    weekLink: 'nädala kava',
    appRest: 'Laps näeb sama järjekorda lapse vaates.',
    nolink: 'Me ei lingi teise keele kogu nii, nagu see oleks eesti keel. Kui eesti lehed tulevad, on need sellel lehel.',
  },
  faq: {
    title: 'Korduvad küsimused | My Starday',
    description: 'Lühikesed vastused päevakava, tähtede, lapse vaate, hinna ja selle kohta, mis My Starday ei ole.',
    h1: 'Korduvad küsimused',
    ogTitle: 'Korduvad küsimused',
    faqs: [
      faq('Kellele on see veeb?', 'Eestikeelne veeb selgitab toodet. Eestil on oma turuleht. Keel jääb eesti keeleks.'),
      faq('Kas ma saan tähti osta?', 'Ei.'),
      faq('Kas see on teraapiarakendus?', 'Ei. Ravi ei ole ja lubatud meditsiinilist tulemust ei ole.'),
      faq('Kus ma konto loon?', 'Olemasoleval vormil. See küsib, kus pere elab. Turuleht ise riiki ei sea.'),
    ],
    lead: 'Lühikesed vastused. Pikemad tekstid on juhendites.',
    hLang: 'Keel ja riik',
    lang: 'See veeb on eesti keeles. Riik valitakse eraldi. Turuleht ei vaheta keelt ega loo kontot.',
    hChild: 'Laps',
    child: 'Laps näeb kava ja märgib. Seaded, kutsed ja konto jäävad täiskasvanule. Rohkem on siin:',
    howLink: 'Kuidas see töötab',
    hStars: 'Tähed',
    stars: 'Tähed on valmis sammude eest. Neid ei saa osta. Loe',
    starsLink: 'preemiasüsteemi',
  },
  privacy: {
    title: 'Privaatsusteade — My Starday',
    description: 'Milliseid andmeid My Starday töötleb, mida me ei kogu ja milliseid õigusi GDPR annab.',
    h1: 'My Starday privaatsusteade',
    ogTitle: 'Privaatsusteade',
    body: `
      <p class="updated">Viimati uuendatud: oktoober 2026</p>
      <p>Privaatsusega käime hoolikalt ümber. My Starday kogub nii vähe kui võimalik: ainult seda, mida rakendus tööks vajab. Me ei müü sinu andmeid ega kasuta neid suunatud reklaamiks. Edastamine väljaspool teenust toimub ainult siis, kui sina valid, või kui see on vajalik, et volitatud töötlejad saaksid teenust pidada.</p>
      <p><strong>Vastutav töötleja:</strong> Papa Bravo AB vastutab sinu isikuandmete töötlemise eest. Kirjutad meile <a href="/en/contact">kontaktivormi</a> kaudu.</p>
      <h2>Mida kogume</h2>
      <p>Töötleme andmeid lepingu alusel, et anda rakendus ja funktsioonid, millele sa registreerud. Täiskasvanute ja perede kohta kogume:</p>
      <ul>
        <li><strong>E-post</strong> — sisselogimiseks ja kontosõnumiteks</li>
        <li><strong>Ees- ja perekonnanimi</strong> — et kontot ära tunda</li>
        <li><strong>Tegevuste logi</strong> — millised tegevused said valmis ja millal</li>
        <li><strong>Tähed</strong> — teenitud ja kasutatud tähed</li>
        <li><strong>Kavad ja tegevused</strong> — mida sa ise lood</li>
      </ul>
      <p><strong>Lapse privaatsus:</strong> last tuntakse ainult eesnime või hüüdnime ja valitud emoji järgi. Me ei kogu perekonnanime, isikukoodi ega lapse kontaktandmeid.</p>
      <h2>Mida me ei kogu</h2>
      <ul>
        <li>Laste perekonnanimesid</li>
        <li>Isikukoodi, ei täiskasvanu ega lapse oma</li>
        <li>Teavet lapse tervise, diagnoosi või puude kohta</li>
        <li>Makseandmeid. Ost käib App Store’i või Google Play kaudu</li>
        <li>Asukohaandmeid</li>
      </ul>
      <h2>Milleks andmeid kasutame</h2>
      <ul>
        <li>Näidata lapsele päevakava</li>
        <li>Salvestada edenemist ja tähti</li>
        <li>Saata kinnitusmeil ja kontosõnumeid</li>
        <li>Vastata sõnumitele, mille sa meile saadad</li>
      </ul>
      <h2>Edastamine</h2>
      <p>Me ei edasta sinu andmeid reklaamiks. Need volitatud töötlejad peavad teenust. Nad töötlevad ainult meie ülesandel ja GDPR-i järgi:</p>
      <ul>
        <li><strong>Neon (andmebaas)</strong> — konto, kavad, tegevused ja pere andmed</li>
        <li><strong>Oma majutus (VPS ELis või EMP-s)</strong> — veebirakendus ja API</li>
        <li><strong>Resend (e-post)</strong> — tehingukiri, näiteks kinnitus, parool ja tervituskiri</li>
        <li><strong>Cloudflare R2</strong> — üles laaditud profiilipildid, kui sa funktsiooni kasutad</li>
        <li><strong>Apple ja Google</strong> — sisselogimine ja push-sõnumid APNs-i ja FCM-i kaudu, kui sa funktsioone kasutad</li>
      </ul>
      <h2>Aruanne vestluseks</h2>
      <p>Kui hooldajana teed ajaliselt piiratud lingi valitud tegevus- ja preemianumbritega, võid seda jagada näiteks õpetaja või terapeudiga. See juhtub ainult sellepärast, et sina valid. Sisu määrad sina ja lingi saad tagasi võtta. Saaja ei vaja kontot.</p>
      <p>Kui kaitse lingi koodiga, ära jaga koodi samas sõnumis kui linki.</p>
      <h2>Sisselogimine Apple’i või Google’iga</h2>
      <ul>
        <li><strong>Sisselogimine Apple’iga:</strong> töötleme nime ja e-posti. Kui peidad e-posti, salvestame unikaalse edastusaadressi, mille Apple loob, et saaksime kontosõnumeid saata.</li>
        <li><strong>Sisselogimine Google’iga:</strong> saame ja salvestame Google’i konto e-posti ja nime, et profiil luua.</li>
      </ul>
      <p>Apple’i ja Google’i enda töötlemist katavad nende enda teated.</p>
      <h2>Push-sõnumid ja seadme tunnus</h2>
      <p>Kui lülitad push-sõnumid sisse, salvestame sinu nõusoleku alusel unikaalse seadme tunnuse (APNs või FCM), et sõnum jõuaks õigesse seadmesse. Tunnus on seotud sinu kontoga.</p>
      <p>Tunnus aegub väljalogimisel või kui platvorm märgib selle kehtetuks. Seadme omadusi me aktiivse push-tellimuseta ei salvesta. Väljalülitamine on rakenduse seadetes või seadmes.</p>
      <h2>Säilitamise aeg</h2>
      <p>Andmeid hoiame seni, kuni konto on aktiivne. Kui konto kustutad, kustutatakse kõik andmed kohe ja lõplikult.</p>
      <h2>Konto kustutamine</h2>
      <p>Konto kustutad rakenduses, seadetes. Kinnitad parooli või kolmanda osapoole sisselogimisega.</p>
      <p>Seda ei saa tagasi võtta. Kaovad täiskasvanu konto, laste profiilid, kavad, päevikud, hinnangud, preemiad ja kutsed.</p>
      <h2>Hoidmine ja turvalisus</h2>
      <p>Püüame hoida põhiandmeid ELis või EMP-s, kus see kehtib. Mõni teenusepakkuja võib töödelda ka väljaspool EMP-d. Edastused ja tagatised on selles tekstis ja me vaatame neid pidevalt üle. Ühendused on krüpteeritud (HTTPS). Paroole ei hoita loetaval kujul. Kasutame bcrypti.</p>
      <h2>Küpsised</h2>
      <ul>
        <li><strong>Vajalikud küpsised</strong> — alati sees. Seanss ja CSRF-kaitse turvaliseks sisselogimiseks.</li>
        <li><strong>Eelistused</strong> — hoitakse kohapeal, näiteks teema.</li>
        <li><strong>Statistika ja turundus</strong> — Google Analytics 4, Meta Pixel ja Google Ads. Vaikimisi väljas, kuni annad küpsisteates nõusoleku.</li>
      </ul>
      <p>Sinu valikut hoiame kõige rohkem ühe aasta. Saad seda muuta teates või seadetes. Lapse rutiini andmed ei lähe reklaamiplatvormidele.</p>
      <h2>Sinu õigused (GDPR)</h2>
      <ul>
        <li>Õigus konto ja andmed kustutada</li>
        <li>Juurdepääsuõigus</li>
        <li>Õigus parandada ebatäpseid andmeid</li>
        <li>Vastuväite või piiramise õigus</li>
        <li>Õigus esitada kaebus Rootsi järelevalvele, Integritetsskyddsmyndighetenile (IMY), kui arvad, et rikume GDPR-i</li>
      </ul>
      <h2>Kontakt</h2>
      <p>On küsimus selle töötlemise kohta? Kasuta <a href="/en/contact">kontaktivormi</a>.</p>
    `,
  },
  terms: {
    title: 'Kasutustingimused — My Starday',
    description: 'My Starday kasutamise tingimused: konto, lapsed, hind ja vastutus.',
    h1: 'Kasutustingimused',
    ogTitle: 'Kasutustingimused',
    body: `
      <p class="updated">Viimati uuendatud: oktoober 2026</p>
      <p>Täname, et kasutad My Starday’d. Need tingimused peavad olema selged ja ausad. Küsimused saadad <a href="/en/contact">kontaktivormi</a> kaudu.</p>
      <h2>1. Teenusest</h2>
      <p>My Starday on digiteenus peredele, kes tahavad korrastatud päevakava, märkida lapse edenemist tähtedega ja lasta lapsel tegevusi oma vaates jälgida. Teenus on vanematele ja hooldajatele ning nende lastele. Peres on vähemalt üks täiskasvanu kontoga. Laps siseneb PIN-koodiga lapse vaatesse.</p>
      <h2>2. Konto ja turvalisus</h2>
      <ul>
        <li>Vali tugev parool ja ära jaga seda</li>
        <li>Kaitse oma e-posti. Sellega saad juurdepääsu tagasi</li>
        <li>Lapse vaate PIN on ainult lapsele ja hooldajatele</li>
        <li>Ära kasuta rakendust viisil, mis on vastuolus Rootsi õigusega</li>
      </ul>
      <p>Vastutad kõige eest, mis sinu konto all juhtub, ka siis, kui keegi teine seda kasutab. Kui kahtlustad väärkasutust, ütle kohe.</p>
      <h2>3. Lapsed ja isikuandmed</h2>
      <p>My Starday töötleb andmeid laste kohta. Järgime GDPR-i ja andmete minimeerimise põhimõtet:</p>
      <ul>
        <li>Last tuntakse eesnime ja valitud emoji järgi. Ilma perekonnanimeta, ilma isikukoodita, ilma kontaktandmeteta</li>
        <li>Vanemad või hooldajad sisestavad andmed ja annavad jagamiseks nõusoleku</li>
        <li>Laste andmeid ei kasutata reklaamiks ega millekski muuks peale teenuse</li>
        <li>Aruannet ja kava jagatakse ainult siis, kui täiskasvanu ise jagab ajaliselt piiratud linki</li>
      </ul>
      <h2>4. Sisu, mille lood</h2>
      <p>Kavad, preemiad, tegevused ja tähelepanekud, mille lisad, on sinu või sinu pere omad. Annad meile õiguse seda sisu hoida ja näidata, kuni konto on aktiivne. Me ei kopeeri seda reklaami, ei müü seda ega kasuta seda turunduses.</p>
      <h2>5. Kasutamine</h2>
      <p>Teenus on sinu pere isiklikuks kasutamiseks. Lubatud ei ole:</p>
      <ul>
        <li>Äriline kasutamine ilma kokkuleppeta Papa Bravo AB-ga</li>
        <li>Kavade, tähtede või preemiate muutmine väljaspool rakenduse tavapärast käiku</li>
        <li>Automatiseeritud tööriist, skreeper või bot teenuse vastu</li>
        <li>Ebaseadusliku, solvava või kahjuliku sisu avaldamine</li>
      </ul>
      <h2>6. Lõpetamine ja kustutamine</h2>
      <p>Konto saad igal ajal jäädavalt kustutada rakenduse seadetes, parooliga kinnitades.</p>
      <p>Kustutamine eemaldab kohe ja jäädavalt täiskasvanu konto, kõik lapsed, kavad, tegevuste logid, tähed, preemiad ja võimalikud tähelepanekud.</p>
      <p>Võime peatada konto, mis rikub neid tingimusi või Rootsi õigust.</p>
      <h2>7. Hind</h2>
      <p>Iirimaa ja Kanada pered võivad My Starday’d kasutada tasuta kuni 31. detsembrini 2026 (kaasa arvatud). Sellel perioodil ei ole makset vaja. Tasuta periood ei muutu automaatselt tellimuseks. Alates 1. jaanuarist 2027 saad valida tellimuse App Store’is või Google Plays. Sellel lehel ei ole veebikassat. Teistes riikides kehtivad hind ja juurdepääs, mida rakendus selle riigi jaoks näitab. Rootsi pered, kes alustavad alates 3. oktoobrist 2026, võivad rakendust proovida 14 päeva ja seejärel valida rakenduses 59 Rootsi krooni kuus või 590 Rootsi krooni aastas. Pered, kellel on juba konto, jätavad alles oma olemasoleva pakkumise.</p>
      <h2>8. Muudatused</h2>
      <p>Võime neid tingimusi muuta, näiteks pärast seaduse muutust, uut funktsiooni või täpsustust. Kui muudatus on oluline, ütleme seda e-posti või rakenduse teatega.</p>
      <p>Kui sa pärast seda teenust edasi kasutad, on see uute tingimuste vastuvõtt.</p>
      <h2>9. Vastutus</h2>
      <p>My Starday antakse sellisena, nagu see on. Teeme, mida saame, et teenus oleks stabiilne ja turvaline, aga ei saa tagada, et see on alati katkestusteta kättesaadav.</p>
      <p>Papa Bravo AB ei vastuta:</p>
      <ul>
        <li>Andmete kao eest vääramatu jõu tõttu</li>
        <li>Kahju eest, sest jagad PIN-koodi või sisselogimisandmeid kellegagi, kes ei peaks neid saama</li>
        <li>Kaudse kahju, kasutamata jäänud võimaluse või kaotatud andmete eest, kui Rootsi õigus ei nõua teisiti</li>
      </ul>
      <p>Vastutad kasutamise eest nende tingimuste ja Rootsi õiguse järgi.</p>
      <h2>10. Kontakt</h2>
      <p>On küsimus nende tingimuste või teenuse kohta? Kasuta <a href="/en/contact">kontaktivormi</a>.</p>
    `,
  },
});

module.exports = { pageFor };
