'use strict';

/**
 * Icelandic public pages. Written in Icelandic.
 * Legal text translates the verified baseline. It adds no Icelandic statute.
 */

const { composeLocale, faq } = require('../compose-pages');

const pageFor = composeLocale('is', {
  marker: /barn/i,
  market: {
    title: (name) => `My Starday á ${name} — sjónrænar dagskrár fyrir börn`,
    description: (name) => `Markaðssíðan fyrir ${name}. Sjónrænar dagskrár á íslensku. Þetta er markaðssíða, ekki sérstök tungumálasíða.`,
    h1: (name) => `Sjónrænar dagskrár fyrir fjölskyldur. Markaður: ${name}`,
    lead: (name) => `Þetta er síðan fyrir ${name}. Íslenska vefsíðan er tungumálasíða.`,
    registrationOpen: (name) => `Nýir reikningar á ${name} fylgja skráningunni sem þegar er til. Sjálfgefið er opið.`,
    registrationClosed: (name) => `Nýir reikningar á ${name} eru sjálfgefið ekki opnir. Það fylgir skráningunni sem þegar er til, ekki þessari síðu. Sjálfgefið er lokað.`,
    complimentary: (name) => `Fyrir ${name} gildir gjaldfrjálsa tímabilið sem þegar er til. Það verður ekki áskrift af sjálfu sér. Þessi síða setur ekkert verð.`,
    introYear: (name) => `${name} heldur tilboðinu sem þegar stendur á sænsku vefsíðunni. Þessi síða setur ekkert verð. Á þessum markaði er ekkert gjaldfrjálst tímabil til 31. desember 2026.`,
    trial: (name, days) => `Ef reikningur hér verður mögulegur síðar, gildir reglan sem þegar er til utan Svíþjóðar, Írlands og Kanada: prufutímabil í ${days} daga. Greiðsla verður að vera til staðar fyrst. Á þessum markaði er ekkert gjaldfrjálst tímabil til 31. desember 2026, og ekkert verður áskrift af sjálfu sér. Þessi síða setur ekkert verð.`,
    notTreatment: (name) => `Hnappurinn opnar venjulega App Store-síðu, ekki uppdiktaða vörusíðu fyrir ${name}. My Starday er sjónræn dagskrá. Það er ekki meðferð og lofar ekki læknisfræðilegri niðurstöðu.`,
    register: 'Stofna reikning',
    registerNote: 'Eyðublaðið spyr hvar fjölskyldan býr. Þessi tengill setur hvorki land né verð.',
    how: 'Svona virkar það',
    playSoon: 'Google Play er ekki opnað hér sem sérstök síða.',
  },
  home: {
    title: 'Sjónræn dagskrá fyrir börn – venjur, umbun og myndir | My Starday',
    description: 'Sjónrænar dagskrár og venjur sem sýna barni hvað gerist núna og hvað kemur næst. Myndir, eigið barnasýn og stjörnur fyrir lokin skref.',
    h1: 'Sjónrænar dagskrár og venjur sem sýna barni hvað gerist núna og hvað kemur næst.',
    ogTitle: 'Sjónræn dagskrá fyrir börn',
    faqs: [
      faq('Hvað er My Starday?', 'Sjónræn dagskrá fyrir fjölskyldur. Barnið sér næsta skref. Fullorðni aðilinn heldur stillingunum.'),
      faq('Er hægt að kaupa stjörnur?', 'Nei. Stjarna fæst fyrir lokið skref. Hana er ekki hægt að kaupa.'),
      faq('Er þetta meðferð?', 'Nei. My Starday er hjálp í daglegu lífi og lofar ekki læknisfræðilegri niðurstöðu.'),
    ],
    lead: 'Barn róast þegar næsta skref sést. My Starday sýnir daginn í myndum: núna, næst, búið.',
    hSee: 'Það sem barnið sér',
    see: 'Barnasýnin sýnir eitt skref í einu. Fullorðni aðilinn býr til áætlunina. Barnið hakar við. Fleiri börn geta deilt sama heimili, hvert með sína áætlun.',
    hStars: 'Stjörnur',
    stars: 'Lokið skref getur gefið stjörnu. Stjörnur er ekki hægt að kaupa. Þær koma ekki í stað samkomulags sem þið gerðuð fyrir fram. Meira er í',
    starsLink: 'umbunarkerfinu',
    hTreat: 'Engin meðferð',
    treat: 'Áætlunin getur hjálpað barni sem þarf meiri yfirsýn, líka við ADHD eða einhverfu, og jafnt fjölskyldum án greiningar. My Starday er ekki meðferð og lofar ekki ákveðinni niðurstöðu.',
    marketsIntro: 'Íslenska vefsíðan útskýrir vöruna. Landið er annað. Sérstök síða er fyrir',
    linkHow: 'Svona virkar það',
    linkVisual: 'Sjónræn dagskrá',
    linkMorning: 'Morgunvenja',
  },
  howItWorks: {
    title: 'Svona virkar My Starday | Sjónræn dagskrá',
    description: 'Fullorðni aðilinn leggur daginn. Barnið sér næsta skref og hakar við það. Stjörnur fást fyrir lokin skref, ekki til kaups.',
    h1: 'Svona virkar My Starday',
    ogTitle: 'Svona virkar það',
    faqs: [
      faq('Hver setur áætlunina?', 'Fullorðinn aðili. Barnið sér barnasýnina og hakar við skref.'),
      faq('Þarf barnið netfang?', 'Nei. Barnið skráir sig inn með nafni og PIN-númeri.'),
    ],
    lead: 'Þrennt ber morguninn: sýnileg áætlun, barn sem hakar sjálft við, og fullorðinn aðili sem heldur stillingunum.',
    hPlan: '1. Áætlunin',
    plan: 'Þið raðið athöfnum í þeirri röð sem morgunninn raunverulega hefur. Myndir hjálpa þegar barnið les ekki enn.',
    planLink: 'Sjónræna dagskráin sýnir núna og næst',
    hChild: '2. Barnasýnin',
    child: 'Barnið sér næsta skref, ekki stillingar fjölskyldunnar. Þar eru engar auglýsingar og ekkert samfélagsnet.',
    hStar: '3. Stjarnan',
    star: 'Lokið skref getur gefið stjörnu. Stjörnuna er ekki hægt að kaupa. Samkomulagið stendur fyrir fram, ekki mitt í uppþotinu.',
    closing: 'My Starday er hjálp í daglegu lífi. Það er ekki meðferð og kemur ekki í stað ráðs frá lækni, meðferðaraðila eða skóla.',
  },
  visualSchedule: {
    title: 'Sjónræn dagskrá fyrir börn | My Starday',
    description: 'Sjónræn dagskrá sýnir barni hvað gerist núna og hvað kemur næst. Fá skref, kunnar myndir, skýr röð.',
    h1: 'Sjónræn dagskrá fyrir börn',
    ogTitle: 'Sjónræn dagskrá',
    faqs: [
      faq('Hversu mörg skref?', 'Oft duga fjögur eða fimm. Lengri listi gengur þegar röðin er þegar kunn.'),
      faq('Ljósmyndir eða tákn?', 'Myndir sem barnið þekkir. Ljósmyndir að heiman virka vel.'),
    ],
    lead: 'Sjónræn dagskrá gerir röðina sýnilega. Barnið þarf ekki að giska á hvað kemur næst.',
    hNow: 'Núna og næst',
    now: 'Sýndu aðeins skrefið sem er í gangi og það næsta. Langur listi á vegg hjálpar minna en skýrt næsta handtak.',
    hStuck: 'Þegar skref stöðvast',
    stuck1: 'Skiptu skrefinu. „Klæðast“ verður sokkar, buxur, bolur.',
    stuck2: 'Eitt í einu.',
    stuck3: 'Sýndu í stað þess að endurtaka.',
    bridge: 'Að morgni er',
    morningLink: 'morgunvenjan',
    weekLink: 'Vikuáætlunin sýnir hvaða dagur er',
    closing: 'My Starday er ekki meðferð og lofar ekki læknisfræðilegri niðurstöðu.',
  },
  morningRoutine: {
    title: 'Morgunvenja fyrir börn | My Starday',
    description: 'Morgunvenja með myndum fækkar töluðum áminningum. Sama röð, dag eftir dag.',
    h1: 'Morgunvenja fyrir börn',
    ogTitle: 'Morgunvenja',
    faqs: [
      faq('Hvað á heima að morgni?', 'Aðeins það sem raunverulega gerist áður en þið farið út. Vakna, klæðast, borða, tennur, jakki.'),
      faq('Hvað ef tíminn er naumur?', 'Styttu listann í stað þess að tala hraðar. Styttri áætlun er alvöru áætlun.'),
    ],
    lead: 'Sama röð gerir lista að venju. Í stað þess að segja „burstu tennurnar“ einu sinni enn horfið þið á næstu mynd.',
    hExample: 'Dæmi',
    steps: [
      'Vakna',
      'Klósett og handþvottur',
      'Klæðast',
      'Morgunmatur',
      'Bursta tennur',
      'Jakki, skór, taska',
    ],
    age: 'Barn á leikskólaaldri ræður oft betur við fjögur eða fimm skref.',
    bridge: 'Fjölskyldur sem vilja meiri stuðning við tilfærslur geta lesið',
    bridgeLink: 'leiðbeiningarnar um yfirsýn',
    closing: 'My Starday er stuðningur í deginum, ekki meðferð.',
  },
  weeklySchedule: {
    title: 'Vikuáætlun með myndum fyrir börn | My Starday',
    description: 'Vikuáætlun með myndum sýnir hvaða dagur er, ekki aðeins hvað er að gerast núna.',
    h1: 'Vikuáætlun með myndum',
    ogTitle: 'Vikuáætlun með myndum',
    faqs: [
      faq('Hver er munurinn á dagskránni?', 'Dagskráin eru skref dagsins. Vikuáætlunin sýnir hvernig dagarnir eru ólíkir.'),
      faq('Frá hvaða aldri?', 'Oft í kringum skólabyrjun, þegar vikan skiptist meira. Yngra barn þarf fyrst daginn í dag.'),
    ],
    lead: 'Vikuáætlun hjálpar þegar virkir dagar og helgi eru ólík, eða þegar „hvað er á morgun?“ þarf svar fyrir svefn.',
    mid: 'Mánudagur með íþrótt, miðvikudagur hjá hinu foreldrinu, föstudagur með mynd. Myndir gera þetta sýnilegt áður en barn les dagatal.',
    dayLink: 'Dagskráin',
    dayRest: 'eru skref dagsins. Vikuáætlunin segir hvaða dagur er.',
    closing: 'My Starday lofar ekki læknisfræðilegri niðurstöðu.',
  },
  neurodiverseRoutines: {
    title: 'Venjur fyrir taugafræðilega fjölbreytt börn | My Starday',
    description: 'Meiri yfirsýn í deginum fyrir barn sem þarf skýrar tilfærslur. My Starday er hjálp í daglegu lífi, ekki meðferð og ekki greining.',
    h1: 'Venjur fyrir taugafræðilega fjölbreytt börn',
    ogTitle: 'Venjur fyrir taugafræðilega fjölbreytt börn',
    faqs: [
      faq('Er þetta aðeins fyrir greiningu?', 'Nei. Áætlunin hjálpar þar sem meiri yfirsýn vantar. Greining er ekki skilyrði.'),
      faq('Kemur þetta í stað meðferðar?', 'Nei. Þetta er ekki meðferð og kemur ekki í stað ráðs frá fagaðilum.'),
    ],
    lead: 'Eitthvert barn þarf að næsta skref sjáist, ekki að því sé útskýrt hærra. Þetta gildir með greiningu og án.',
    hAdhd: 'ADHD: að byrja og vera við skrefið',
    adhd: 'Skiptin stöðvast oft vegna þess að næsta skref sést ekki. Áætlun með haki segir strax: þetta skref er búið.',
    hAutism: 'Einhverfa: fyrirsjáanleiki',
    autism: 'Önnur röð getur verið stór. ',
    weekLink: 'Vikuáætlun',
    autismRest: 'sýnir fyrir fram hvaða dagur kemur. Yfirstrikað skref á að breytast sýnilega, ekki hverfa í þögn.',
    closing: 'My Starday er hjálp í daglegu lífi. Það er ekki læknisfræðileg meðferð og kemur ekki í stað ráðs frá lækni, iðjuþjálfa, talmeinafræðingi eða skóla. Spjöld í merkingu fyrst, svo og búið eru ekki enn til sem íslenskt PDF. Slík spjöld eru innblástur, ekki opinber aðferð og ekki vottun.',
  },
  rewardSystem: {
    title: 'Umbunarkerfi fyrir börn | My Starday',
    description: 'Umbun sem þið semjið um fyrir fram er annað en samningur á augabragði. Barnið ávinnur sér stjörnur. Þær er ekki hægt að kaupa.',
    h1: 'Umbunarkerfi fyrir börn, án þess að gera það að samningi',
    ogTitle: 'Umbunarkerfi fyrir börn',
    faqs: [
      faq('Er stjörnukort mútur?', 'Ekki þegar umbunin stendur fyrir fram og tengist einhverju sem barnið getur gert. Samningur er boðinn á augabragði til að stöðva eitthvað.'),
      faq('Hversu margar stjörnur?', 'Byrjið á einni stjörnu fyrir hvert lokið skref. Stjörnur er ekki hægt að kaupa.'),
    ],
    lead: '„Er þetta ekki bara mútur?“ fer eftir því hvenær þið semjið. Samningur fyrir fram getur stutt venju. Mitt í reiðinni verður hann að þrætubóki.',
    planLink: 'Sjónræna dagskráin',
    chain: 'hefur einfalda keðju: sjá skrefið, gera það, haka við, fá stjörnu.',
    steps: [
      'Verið nákvæm. Umbunið „burstir tennur án áminningar“, ekki „er þægt“.',
      'Sýnið framvinduna.',
      'Teljið tilraunina, ekki aðeins fullkominn morgun.',
      'Leyfið barninu að hugsa með um umbunina.',
      'Þynnið stjörnurnar þegar venjan situr.',
    ],
    closing: 'Stjörnur er ekki hægt að kaupa. My Starday lofar ekki læknisfræðilegri niðurstöðu.',
  },
  resources: {
    title: 'Efni fyrir sjónrænar venjur | My Starday',
    description: 'Hvað er þegar til á íslensku, og hvað er ekki enn til sem PDF. Appið og prentað blað eru tvennt ólíkt.',
    h1: 'Efni',
    ogTitle: 'Efni',
    faqs: [
      faq('Eru til íslensk PDF-skjöl?', 'Ekki enn. Þessi síða selur ekki sænska bæklinga sem íslenska þýðingu.'),
    ],
    lead: 'Appið sýnir daginn á skjánum. Prentað blað er annað. Íslensk PDF-skjöl eru ekki hér enn.',
    app: 'Í appinu búið þið til',
    dayLink: 'dagskrána',
    morningLink: 'morgunvenjuna',
    weekLink: 'vikuáætlunina',
    appRest: 'Barnið sér sömu röð í barnasýninni.',
    nolink: 'Við tengjum ekki safn á öðru tungumáli eins og það væri á íslensku. Þegar íslensk blöð bætast við, standa þau á þessari síðu.',
  },
  faq: {
    title: 'Algengar spurningar | My Starday',
    description: 'Stutt svör um dagskrá, stjörnur, barnasýn, verð og hvað My Starday er ekki.',
    h1: 'Algengar spurningar',
    ogTitle: 'Algengar spurningar',
    faqs: [
      faq('Fyrir hvern er vefsíðan?', 'Íslenska vefsíðan útskýrir vöruna. Ísland hefur sína markaðssíðu. Tungumálið er íslenska.'),
      faq('Get ég keypt stjörnur?', 'Nei.'),
      faq('Er þetta meðferðarapp?', 'Nei. Engin meðferð, engin heitið læknisfræðileg niðurstaða.'),
      faq('Hvar stofna ég reikning?', 'Á eyðublaðinu sem þegar er til. Það spyr hvar fjölskyldan býr. Markaðssíða setur ekki landið sjálf.'),
    ],
    lead: 'Stuttu svörin. Lengri textar eru í leiðbeiningunum.',
    hLang: 'Tungumál og land',
    lang: 'Þessi vefsíða er á íslensku. Landið veljið þið sér. Markaðssíða breytir ekki tungumálinu og stofnar ekki reikning.',
    hChild: 'Barnið',
    child: 'Barnið sér áætlunina og hakar við. Stillingar, boð og reikningurinn eru hjá fullorðna aðilanum. Meira er undir',
    howLink: 'Svona virkar það',
    hStars: 'Stjörnur',
    stars: 'Stjörnur fást fyrir lokin skref. Þær er ekki hægt að kaupa. Lestu',
    starsLink: 'umbunarkerfið',
  },
  privacy: {
    title: 'Persónuvernd — My Starday',
    description: 'Hvaða gögn My Starday vinnur, hvað við söfnum ekki, og hvaða réttindi GDPR veitir.',
    h1: 'Persónuvernd fyrir My Starday',
    ogTitle: 'Persónuvernd',
    body: `
      <p class="updated">Síðast uppfært: október 2026</p>
      <p>Við göngum vel um friðhelgi þína. My Starday safnar eins litlu og hægt er: aðeins því sem appið þarf til að virka. Við seljum ekki gögnin þín og notum þau ekki í markaðsmiðaðar auglýsingar. Miðlun utan þjónustunnar gerist aðeins þegar þú velur hana sjálf, eða þegar hún er nauðsynleg til að vinnsluaðilar okkar geti rekið þjónustuna.</p>
      <p><strong>Ábyrgðaraðili:</strong> Papa Bravo AB ber ábyrgð á vinnslu persónuupplýsinga þinna. Þú nærð í okkur í <a href="/en/contact">sambandseyðublaðinu</a>.</p>
      <h2>Hvað við söfnum</h2>
      <p>Við vinnum gögn á grundvelli samnings svo við getum veitt appið og aðgerðirnar sem þú skráir þig í. Um fullorðna og fjölskyldur söfnum við:</p>
      <ul>
        <li><strong>Netfang</strong> — til innskráningar og skilaboða um reikninginn</li>
        <li><strong>Fornafn og eftirnafn</strong> — til að þekkja reikninginn</li>
        <li><strong>Athafnaskrá</strong> — hvaða athafnir kláruðust, og hvenær</li>
        <li><strong>Stjörnur</strong> — unnar og innleystar stjörnur</li>
        <li><strong>Áætlanir og athafnir</strong> — það sem þú býrð sjálf til</li>
      </ul>
      <p><strong>Friðhelgi barns:</strong> barn þekkist aðeins á fornafni eða gælunafni og völdu emoji. Við söfnum ekki eftirnafni, kennitölu eða samskiptaupplýsingum barns.</p>
      <h2>Hvað við söfnum ekki</h2>
      <ul>
        <li>Engin eftirnöfn barna</li>
        <li>Engar kennitölur, hvorki fullorðinna né barna</li>
        <li>Engar upplýsingar um heilsu, greiningu eða fötlun barns</li>
        <li>Engin greiðslugögn. Kaup fara í gegnum App Store eða Google Play</li>
        <li>Engin staðsetningargögn</li>
      </ul>
      <h2>Til hvers við notum gögnin</h2>
      <ul>
        <li>Sýna barninu dagskrána</li>
        <li>Vista framvindu og stjörnur</li>
        <li>Senda staðfestingarpóst og skilaboð um reikning</li>
        <li>Svara skilaboðum sem þú sendir okkur</li>
      </ul>
      <h2>Miðlun</h2>
      <p>Við miðlum ekki gögnum þínum í auglýsingaskyni. Þessir vinnsluaðilar reka þjónustuna. Þeir vinna aðeins samkvæmt fyrirmælum okkar og samkvæmt GDPR:</p>
      <ul>
        <li><strong>Neon (gagnagrunnur)</strong> — reikningur, áætlanir, athafnir og fjölskyldugögn</li>
        <li><strong>Eigin hýsing (VPS í ESB/EES)</strong> — vefappið og API</li>
        <li><strong>Resend (tölvupóstur)</strong> — færslupóstur, til dæmis staðfesting, lykilorð og velkominpóstur</li>
        <li><strong>Cloudflare R2</strong> — upphlaðnar prófílmyndir þegar þú notar aðgerðina</li>
        <li><strong>Apple og Google</strong> — innskráning og ýtitilkynningar í gegnum APNs og FCM þegar þú notar aðgerðirnar</li>
      </ul>
      <h2>Skýrsla fyrir samtal</h2>
      <p>Þegar þú sem forsjáraðili býrð til tímabundinn tengil á úrval af völdum tölum um athafnir og umbun, geturðu deilt honum, til dæmis með kennara eða meðferðaraðila. Það gerist aðeins vegna þess að þú velur það. Þú ákveður innihaldið og getur afturkallað tengilinn. Viðtakandi þarf engan reikning.</p>
      <p>Ef þú verndar tengil með kóða, deildu ekki kóðanum í sama skilaboði og tenglinum.</p>
      <h2>Innskráning með Apple eða Google</h2>
      <ul>
        <li><strong>Innskráning með Apple:</strong> við vinnum nafn og netfang. Ef þú velur að fela netfangið, vistum við einstaka áframsendingarslóð sem Apple býr til, svo við getum sent skilaboð um reikning.</li>
        <li><strong>Innskráning með Google:</strong> við fáum og vistum netfang og nafn Google-reikningsins til að búa til prófílinn.</li>
      </ul>
      <p>Eigin vinnsla Apple og Google fylgir þeirra eigin persónuverndartextum.</p>
      <h2>Ýtitilkynningar og tækistákn</h2>
      <p>Þegar þú kveikir á ýtitilkynningum, vistum við á grundvelli samþykkis þíns einstakt tækistákn (APNs eða FCM) svo tilkynningin komi í rétta tækið. Táknið tengist reikningnum þínum.</p>
      <p>Tákn rennur út við útskráningu eða þegar vettvangurinn tilkynnir það ógilt. Við vistum ekki einkenni tækis án virkrar áskriftar að ýtitilkynningum. Slökkt er í stillingum appsins eða á tækinu.</p>
      <h2>Geymslutími</h2>
      <p>Við geymum gögn á meðan reikningurinn er virkur. Þegar þú eyðir reikningnum, eyðast öll gögn strax og varanlega.</p>
      <h2>Eyða reikningi</h2>
      <p>Þú eyðir reikningnum í appinu í stillingunum. Þú staðfestir með lykilorði eða innskráningu þriðja aðila.</p>
      <p>Þetta er ekki hægt að afturkalla. Þá hverfa foreldrareikningurinn, barnaprófílarnir, áætlanir, dagskrár, mat, umbun og boð.</p>
      <h2>Geymsla og öryggi</h2>
      <p>Við stefnum að því að geyma kjarnagögn í ESB/EES þar sem það á við. Sumir birgjar geta unnið utan EES. Flutningur og tryggingar standa í þessum texta og eru yfirfarin jafnóðum. Tengingar eru dulkóðaðar (HTTPS). Lykilorð standa ekki í læsilegu formi. Við notum bcrypt.</p>
      <h2>Vefkökur</h2>
      <ul>
        <li><strong>Nauðsynlegar vefkökur</strong> — alltaf á. Setu og CSRF-vörn fyrir örugga innskráningu.</li>
        <li><strong>Stillingar</strong> — vistaðar staðbundið, til dæmis þema.</li>
        <li><strong>Tölfræði og markaðssetning</strong> — Google Analytics 4, Meta Pixel og Google Ads. Sjálfgefið af, þar til þú samþykkir í vefkökutilkynningunni.</li>
      </ul>
      <p>Val þitt geymum við í mesta lagi eitt ár. Þú getur breytt því í tilkynningunni eða stillingunum. Venjugögn um barn fara ekki á auglýsingavettvang.</p>
      <h2>Réttindi þín (GDPR)</h2>
      <ul>
        <li>Réttur til að eyða reikningi og gögnum</li>
        <li>Réttur til aðgangs</li>
        <li>Réttur til að láta leiðrétta röng gögn</li>
        <li>Réttur til að andmæla eða takmarka</li>
        <li>Réttur til að kvarta til sænska eftirlitsins Integritetsskyddsmyndigheten (IMY) ef þú telur að við brjótum GDPR</li>
      </ul>
      <h2>Samband</h2>
      <p>Spurningar um þessa vinnslu? Notaðu <a href="/en/contact">sambandseyðublaðið</a>.</p>
    `,
  },
  terms: {
    title: 'Skilmálar — My Starday',
    description: 'Skilmálarnir fyrir notkun My Starday: reikningur, börn, verð og ábyrgð.',
    h1: 'Skilmálar',
    ogTitle: 'Skilmálar',
    body: `
      <p class="updated">Síðast uppfært: október 2026</p>
      <p>Takk fyrir að nota My Starday. Þessir skilmálar eiga að vera skýrir og heiðarlegir. Spurningar sendir þú í <a href="/en/contact">sambandseyðublaðinu</a>.</p>
      <h2>1. Um þjónustuna</h2>
      <p>My Starday er stafræn þjónusta fyrir fjölskyldur sem vilja skipulagða dagskrá, merkja framvindu barns með stjörnum og láta barnið fylgjast með athöfnum í eigin sýn. Þjónustan er fyrir foreldra og forsjáraðila og börn þeirra. Fjölskylda hefur að minnsta kosti einn fullorðinn með reikning. Barn skráir sig inn með PIN í barnasýninni.</p>
      <h2>2. Reikningur og öryggi</h2>
      <ul>
        <li>Veldu sterkt lykilorð og deildu því ekki</li>
        <li>Verndaðu netfangið þitt. Með því færðu aðganginn aftur</li>
        <li>PIN barnasýnarinnar er aðeins fyrir barnið og forsjáraðila</li>
        <li>Notaðu ekki appið á hátt sem brýtur sænsk lög</li>
      </ul>
      <p>Þú berð ábyrgð á öllu sem gerist á reikningnum þínum, líka þegar einhver annar notar hann. Ef þú grunar misnotkun, hafðu strax samband.</p>
      <h2>3. Börn og persónuupplýsingar</h2>
      <p>My Starday vinnur upplýsingar um börn. Við fylgjum GDPR og meginreglunni um lágmörkun gagna:</p>
      <ul>
        <li>Barn þekkist á fornafni og völdu emoji. Ekkert eftirnafn, engin kennitala, engar samskiptaupplýsingar</li>
        <li>Foreldrar eða forsjáraðilar skrá upplýsingarnar og samþykkja miðlun</li>
        <li>Við notum ekki gögn um börn í auglýsingar og ekki í neitt annað en þjónustuna</li>
        <li>Skýrslum og áætlunum er aðeins deilt þegar fullorðinn aðili deilir sjálfur tímabundnum tengli</li>
      </ul>
      <h2>4. Efni sem þú býrð til</h2>
      <p>Áætlanir, umbun, athafnir og athuganir sem þú bætir við tilheyra þér eða fjölskyldu þinni. Þú veitir okkur rétt til að vista og sýna þetta efni á meðan reikningurinn er virkur. Við afritum það ekki í auglýsingar, seljum það ekki og notum það ekki í markaðssetningu.</p>
      <h2>5. Notkun</h2>
      <p>Þjónustan er til einkanota í fjölskyldunni þinni. Ekki er leyft:</p>
      <ul>
        <li>Viðskiptaleg notkun án samkomulags við Papa Bravo AB</li>
        <li>Að eiga við áætlanir, stjörnur eða umbun utan venjulegs ferlis appsins</li>
        <li>Sjálfvirk tæki, skraparar eða þjarkar gegn þjónustunni</li>
        <li>Að birta efni sem er ólöglegt, meiðandi eða skaðlegt</li>
      </ul>
      <h2>6. Lokun og eyðing</h2>
      <p>Þú getur hvenær sem er eytt reikningnum varanlega í stillingum appsins, staðfest með lykilorðinu þínu.</p>
      <p>Eyðingin fjarlægir strax og varanlega foreldrareikninginn, öll börn, áætlanir, athafnaskrár, stjörnur, umbun og hugsanlegar athuganir.</p>
      <p>Við getum lokað reikningi sem brýtur þessa skilmála eða sænsk lög.</p>
      <h2>7. Verð</h2>
      <p>Fjölskyldur á Írlandi og í Kanada geta notað My Starday gjaldfrjálst til og með 31. desember 2026. Á því tímabili þarf enga greiðslu. Gjaldfrjálsa tímabilið verður ekki sjálfkrafa áskrift. Frá 1. janúar 2027 geturðu valið áskrift í App Store eða á Google Play. Á þessari síðu er engin vefgreiðsla. Í öðrum löndum gildir verðið og aðgangurinn sem appið sýnir fyrir það land. Sænskar fjölskyldur sem byrja frá 3. október 2026 geta prófað appið í 14 daga og síðan valið 59 sænskar krónur á mánuði eða 590 sænskar krónur á ári í appinu. Fjölskyldur sem þegar eiga reikning halda núverandi tilboði sínu.</p>
      <h2>8. Breytingar</h2>
      <p>Við getum aðlagað þessa skilmála, til dæmis eftir lagabreytingu, nýja aðgerð eða skýringu. Ef breyting er veruleg, segjum við frá henni í tölvupósti eða með tilkynningu í appinu.</p>
      <p>Ef þú heldur áfram að nota þjónustuna eftir það, telst það samþykki á nýju skilmálunum.</p>
      <h2>9. Ábyrgð</h2>
      <p>My Starday er veitt eins og það er. Við gerum okkar besta til að halda þjónustunni stöðugri og öruggri, en getum ekki ábyrgst að hún sé alltaf tiltæk án rofs.</p>
      <p>Papa Bravo AB ber ekki ábyrgð á:</p>
      <ul>
        <li>Gagnatapi vegna óviðráðanlegra aðstæðna</li>
        <li>Tjóni vegna þess að þú deilir PIN eða innskráningarupplýsingum með einhverjum sem á ekki að hafa þær</li>
        <li>Óbeinu tjóni, glötuðu tækifæri eða glötuðum gögnum, nema sænsk lög krefjist annars</li>
      </ul>
      <p>Þú berð ábyrgð á notkun samkvæmt þessum skilmálum og sænskum lögum.</p>
      <h2>10. Samband</h2>
      <p>Spurningar um þessa skilmála eða þjónustuna? Notaðu <a href="/en/contact">sambandseyðublaðið</a>.</p>
    `,
  },
});

module.exports = { pageFor };
