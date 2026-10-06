'use strict';

/**
 * Finnish public pages. Written in Finnish.
 * Legal text translates the verified baseline. It adds no Finnish statute.
 */

const { composeLocale, faq } = require('../compose-pages');

const pageFor = composeLocale('fi', {
  marker: /laps/i,
  market: {
    title: (name) => `My Starday, ${name} — kuvalliset päiväsuunnitelmat lapsille`,
    description: (name) => `Markkinasivu maalle ${name}. Kuvalliset päiväsuunnitelmat suomeksi. Tämä on markkinasivu, ei oma kielisivusto.`,
    h1: (name) => `Kuvalliset päiväsuunnitelmat perheille. Markkina: ${name}`,
    lead: (name) => `Tämä on sivu maalle ${name}. Suomenkielinen sivusto pysyy kielisivustona.`,
    registrationOpen: (name) => `Uudet tilit maassa ${name} seuraavat nykyistä rekisteröintiä. Oletus on auki.`,
    registrationClosed: (name) => `Uudet tilit maassa ${name} eivät ole oletuksena auki. Se seuraa nykyistä rekisteröintiä, ei tätä sivua. Oletus on kiinni.`,
    complimentary: (name) => `Maalle ${name} pätee nykyinen maksuton jakso. Siitä ei tule tilausta itsestään. Tämä sivu ei aseta hintaa.`,
    introYear: (name) => `${name} säilyttää tarjouksen, joka on jo ruotsinkielisellä sivustolla. Tämä sivu ei aseta hintaa. Tällä markkinalla ei ole maksutonta jaksoa 31. joulukuuta 2026 asti.`,
    trial: (name, days) => `Jos tili täällä myöhemmin on mahdollinen, pätee nykyinen sääntö Ruotsin, Irlannin ja Kanadan ulkopuolella: ${days} päivän kokeilu. Maksun on oltava ensin saatavilla. Tällä markkinalla ei ole maksutonta jaksoa 31. joulukuuta 2026 asti, eikä mikään muutu tilaukseksi itsestään. Tämä sivu ei aseta hintaa.`,
    notTreatment: (name) => `Painike avaa yleisen App Store -sivun, ei keksittyä tuotesivua maalle ${name}. My Starday on kuvallinen päiväsuunnitelma. Se ei ole hoito eikä lupaa lääketieteellistä tulosta.`,
    register: 'Luo tili',
    registerNote: 'Lomake kysyy, missä perhe asuu. Tämä linkki ei itse aseta maata eikä hintaa.',
    how: 'Näin se toimii',
    playSoon: 'Google Play ei ole avattu täällä omana sivunaan.',
  },
  home: {
    title: 'Kuvallinen päiväsuunnitelma lapsille – rutiinit, palkinnot ja kuvat | My Starday',
    description: 'Kuvalliset päiväsuunnitelmat ja rutiinit, jotka näyttävät lapselle, mitä tapahtuu nyt ja mitä tulee sen jälkeen. Kuvat, oma lapsinäkymä ja tähdet valmiista askelista.',
    h1: 'Kuvalliset päiväsuunnitelmat ja rutiinit, jotka näyttävät lapselle, mitä tapahtuu nyt ja mitä tulee sen jälkeen.',
    ogTitle: 'Kuvallinen päiväsuunnitelma lapsille',
    faqs: [
      faq('Mikä My Starday on?', 'Kuvallinen päiväsuunnitelma perheille. Lapsi näkee seuraavan askeleen. Aikuinen pitää asetukset.'),
      faq('Voiko tähtiä ostaa?', 'Ei. Tähti tulee valmiista askeleesta. Sitä ei voi ostaa.'),
      faq('Onko tämä hoitoa?', 'Ei. My Starday on arjen apu eikä lupaa lääketieteellistä tulosta.'),
    ],
    lead: 'Lapsi rauhoittuu, kun seuraava askel on näkyvissä. My Starday näyttää päivän kuvina: nyt, sen jälkeen, valmis.',
    hSee: 'Mitä lapsi näkee',
    see: 'Lapsinäkymä näyttää yhden askeleen kerrallaan. Aikuinen tekee suunnitelman. Lapsi rastittaa. Useampi lapsi voi jakaa saman kodin, kullakin oma suunnitelma.',
    hStars: 'Tähdet',
    stars: 'Valmis askel voi antaa tähden. Tähtiä ei voi ostaa. Ne eivät korvaa sopimusta, jonka teitte etukäteen. Lisää on',
    starsLink: 'palkitsemisessa',
    hTreat: 'Ei hoitoa',
    treat: 'Suunnitelma voi auttaa lasta, joka tarvitsee enemmän selkeyttä, myös ADHD:n tai autismin kanssa, ja yhtä lailla perheitä ilman diagnoosia. My Starday ei ole hoito eikä lupaa tiettyä tulosta.',
    marketsIntro: 'Suomenkielinen sivusto selittää tuotteen. Maa on eri asia. Oma sivu on maalle',
    linkHow: 'Näin se toimii',
    linkVisual: 'Kuvallinen päiväsuunnitelma',
    linkMorning: 'Aamurutiini',
  },
  howItWorks: {
    title: 'Näin My Starday toimii | Kuvallinen päiväsuunnitelma',
    description: 'Aikuinen rakentaa päivän. Lapsi näkee seuraavan askeleen ja rastittaa sen. Tähdet tulevat valmiista askelista, ei ostamalla.',
    h1: 'Näin My Starday toimii',
    ogTitle: 'Näin se toimii',
    faqs: [
      faq('Kuka tekee suunnitelman?', 'Aikuinen. Lapsi näkee lapsinäkymän ja rastittaa askeleet.'),
      faq('Tarvitseeko lapsi sähköpostin?', 'Ei. Lapsi kirjautuu nimellä ja PIN-koodilla.'),
    ],
    lead: 'Kolme asiaa kantaa aamun: näkyvä suunnitelma, lapsi joka rastittaa itse, ja aikuinen joka pitää asetukset.',
    hPlan: '1. Suunnitelma',
    plan: 'Laitatte tekemiset siihen järjestykseen, joka aamulla oikeasti on. Kuvat auttavat, kun lapsi ei vielä lue.',
    planLink: 'Kuvallinen päiväsuunnitelma näyttää nyt ja sen jälkeen',
    hChild: '2. Lapsinäkymä',
    child: 'Lapsi näkee seuraavan askeleen, ei perheen asetuksia. Siellä ei ole mainoksia eikä sosiaalista verkostoa.',
    hStar: '3. Tähti',
    star: 'Valmis askel voi antaa tähden. Tähteä ei voi ostaa. Sopimus on tehty etukäteen, ei kesken kiireen.',
    closing: 'My Starday on arjen apu. Se ei ole hoito eikä korvaa lääkärin, terapeutin tai koulun neuvoa.',
  },
  visualSchedule: {
    title: 'Kuvallinen päiväsuunnitelma lapsille | My Starday',
    description: 'Kuvallinen päiväsuunnitelma näyttää lapselle, mitä tapahtuu nyt ja mitä tulee sen jälkeen. Vähän askelia, tuttuja kuvia, selkeä järjestys.',
    h1: 'Kuvallinen päiväsuunnitelma lapsille',
    ogTitle: 'Kuvallinen päiväsuunnitelma',
    faqs: [
      faq('Kuinka monta askelta?', 'Usein neljä tai viisi riittää. Pidempi lista toimii, kun järjestys on jo tuttu.'),
      faq('Valokuvia vai merkkejä?', 'Kuvia, jotka lapsi jo tuntee. Kodin valokuvat toimivat hyvin.'),
    ],
    lead: 'Kuvallinen päiväsuunnitelma tekee järjestyksen näkyväksi. Lapsen ei tarvitse arvata, mitä tulee seuraavaksi.',
    hNow: 'Nyt ja sen jälkeen',
    now: 'Näytä vain nykyinen askel ja seuraava. Pitkä lista seinällä auttaa vähemmän kuin selkeä seuraava ote.',
    hStuck: 'Kun askel pysähtyy',
    stuck1: 'Jaa askel. „Pukeutuminen“ on sukat, housut, paita.',
    stuck2: 'Yksi kerrallaan.',
    stuck3: 'Näytä, älä toista.',
    bridge: 'Aamulla keskiössä on',
    morningLink: 'aamurutiini',
    weekLink: 'Viikkosuunnitelma näyttää, mikä päivä on',
    closing: 'My Starday ei ole hoito eikä lupaa lääketieteellistä tulosta.',
  },
  morningRoutine: {
    title: 'Aamurutiini lapsille | My Starday',
    description: 'Kuvallinen aamurutiini vähentää puhuttuja muistutuksia. Sama järjestys, päivästä toiseen.',
    h1: 'Aamurutiini lapsille',
    ogTitle: 'Aamurutiini',
    faqs: [
      faq('Mitä aamuun kuuluu?', 'Vain se, mikä oikeasti tapahtuu ennen ovea. Ylös, vaatteet, ruoka, hampaat, takki.'),
      faq('Entä jos aika loppuu?', 'Lyhennä listaa sen sijaan, että puhut nopeammin. Lyhyempi suunnitelma on oikea suunnitelma.'),
    ],
    lead: 'Sama järjestys tekee listasta tavan. Sen sijaan että sanotte „harjaa hampaat“ vielä kerran, katsotte seuraavaa kuvaa.',
    hExample: 'Esimerkki',
    steps: [
      'Ylös sängystä',
      'Vessa ja käsien pesu',
      'Pukeutuminen',
      'Aamupala',
      'Hampaiden harjaus',
      'Takki, kengät, laukku',
    ],
    age: 'Moni esikouluikäinen lapsi pärjää paremmin neljällä tai viidellä askeleella.',
    bridge: 'Perheet, jotka kaipaavat lisää tukea siirtymiin, voivat lukea',
    bridgeLink: 'oppaan selkeydestä',
    closing: 'My Starday on tuki päivään, ei hoito.',
  },
  weeklySchedule: {
    title: 'Viikkosuunnitelma kuvilla lapsille | My Starday',
    description: 'Kuvallinen viikkosuunnitelma näyttää, mikä päivä on, ei vain mitä juuri tapahtuu.',
    h1: 'Viikkosuunnitelma kuvilla',
    ogTitle: 'Viikkosuunnitelma kuvilla',
    faqs: [
      faq('Miten se eroaa päiväsuunnitelmasta?', 'Päiväsuunnitelma on tämän päivän askeleet. Viikkosuunnitelma näyttää, miten päivät eroavat.'),
      faq('Mistä iästä?', 'Usein koulun alun tienoilla, kun viikko vaihtelee enemmän. Nuorempi lapsi tarvitsee ensin tämän päivän.'),
    ],
    lead: 'Viikkosuunnitelma auttaa, kun arki ja viikonloppu eroavat, tai kun „mitä huomenna on?“ tarvitsee vastauksen ennen nukkumaanmenoa.',
    mid: 'Maanantaina liikuntaa, keskiviikkona toisen vanhemman luona, perjantaina elokuva. Kuvat tekevät sen näkyväksi, ennen kuin lapsi lukee kalenteria.',
    dayLink: 'Päiväsuunnitelma',
    dayRest: 'on tämän päivän askeleet. Viikkosuunnitelma sanoo, mikä päivä on.',
    closing: 'My Starday ei lupaa lääketieteellistä tulosta.',
  },
  neurodiverseRoutines: {
    title: 'Rutiinit neurokirjoon kuuluville lapsille | My Starday',
    description: 'Enemmän selkeyttä päivään lapselle, joka tarvitsee selvät siirtymät. My Starday on arjen apu, ei hoito eikä diagnoosi.',
    h1: 'Rutiinit neurokirjoon kuuluville lapsille',
    ogTitle: 'Rutiinit neurokirjoon kuuluville lapsille',
    faqs: [
      faq('Onko tämä vain diagnoosia varten?', 'Ei. Suunnitelma auttaa siellä, missä tarvitaan enemmän selkeyttä. Diagnoosi ei ole ehto.'),
      faq('Korvaako tämä terapian?', 'Ei. Se ei ole hoito eikä korvaa ammattilaisen neuvoa.'),
    ],
    lead: 'Joku lapsi tarvitsee seuraavan askeleen näkyviin, ei kovempaa selitystä. Tämä pätee diagnoosilla ja ilman.',
    hAdhd: 'ADHD: alkuun pääsy ja askeleessa pysyminen',
    adhd: 'Vaihto pysähtyy usein, koska seuraavaa askelta ei näy. Suunnitelma rastilla kertoo heti: tämä askel on valmis.',
    hAutism: 'Autismi: ennakoitavuus',
    autism: 'Toinen järjestys voi tuntua suurelta.',
    weekLink: 'Viikkosuunnitelma',
    autismRest: 'näyttää etukäteen, mikä päivä tulee. Yliviivattu askel pitää muuttaa näkyvästi, ei kadota hiljaa.',
    closing: 'My Starday on arjen tuki. Se ei ole lääketieteellinen hoito eikä korvaa lääkärin, toimintaterapeutin, puheterapeutin tai koulun neuvoa. Kortteja merkityksessä ensin, sitten ja valmis ei ole vielä suomenkielisenä PDF-tiedostona. Sellaiset kortit ovat inspiraatio, eivät virallinen menetelmä eivätkä sertifikaatti.',
  },
  rewardSystem: {
    title: 'Palkitsemisjärjestelmä lapsille | My Starday',
    description: 'Palkinto, josta sovitte etukäteen, on eri asia kuin kauppa hetkessä. Lapsi ansaitsee tähdet. Niitä ei voi ostaa.',
    h1: 'Palkitsemisjärjestelmä lapsille, ilman että siitä tulee kauppaa',
    ogTitle: 'Palkitsemisjärjestelmä lapsille',
    faqs: [
      faq('Onko tähtikortti lahjontaa?', 'Ei, kun palkinto on sovittu etukäteen ja liittyy asiaan, jonka lapsi voi tehdä. Kauppaa tarjotaan hetkessä, jotta jokin loppuisi.'),
      faq('Kuinka monta tähteä?', 'Aloittakaa yhdellä tähdellä valmista askelta kohti. Tähtiä ei voi ostaa.'),
    ],
    lead: '„Eikö tämä ole vain lahjontaa?“ riippuu siitä, milloin sovitte. Etukäteen sovittu kortti voi tukea tapaa. Keskellä kiukkua siitä tulee neuvottelu.',
    planLink: 'Kuvallisessa päiväsuunnitelmassa',
    chain: 'ketju on yksinkertainen: näe askel, tee, rastita, saa tähti.',
    steps: [
      'Olkaa konkreettisia. Palkitkaa „harjaa hampaat ilman muistutusta“, älkää „on kiltti“.',
      'Näyttäkää edistyminen.',
      'Laskekaa yritys, ei vain täydellinen aamu.',
      'Antakaa lapsen olla mukana miettimässä palkintoa.',
      'Harventakaa tähtiä, kun tapa on jo paikallaan.',
    ],
    closing: 'Tähtiä ei voi ostaa. My Starday ei lupaa lääketieteellistä tulosta.',
  },
  resources: {
    title: 'Materiaalit kuvallisiin rutiineihin | My Starday',
    description: 'Mitä suomeksi jo on, ja mitä ei vielä ole PDF-tiedostona. Sovellus ja painettu arkki ovat kaksi eri asiaa.',
    h1: 'Materiaalit',
    ogTitle: 'Materiaalit',
    faqs: [
      faq('Onko suomenkielisiä PDF-tiedostoja?', 'Ei vielä. Tämä sivu ei myy ruotsinkielisiä arkkeja suomennoksena.'),
    ],
    lead: 'Sovellus näyttää päivän näytöllä. Painettu arkki on eri asia. Suomenkielisiä PDF-tiedostoja ei täällä vielä ole.',
    app: 'Sovelluksessa teette',
    dayLink: 'päiväsuunnitelman',
    morningLink: 'aamurutiinin',
    weekLink: 'viikkosuunnitelman',
    appRest: 'Lapsi näkee saman järjestyksen lapsinäkymässä.',
    nolink: 'Emme linkitä toisen kielen kirjastoon ikään kuin se olisi suomeksi. Kun suomenkieliset arkit tulevat, ne ovat tällä sivulla.',
  },
  faq: {
    title: 'Usein kysyttyä | My Starday',
    description: 'Lyhyet vastaukset päiväsuunnitelmasta, tähdistä, lapsinäkymästä, hinnasta ja siitä, mitä My Starday ei ole.',
    h1: 'Usein kysyttyä',
    ogTitle: 'Usein kysyttyä',
    faqs: [
      faq('Kenelle sivusto on?', 'Suomenkielinen sivusto selittää tuotteen. Suomella on oma markkinasivu. Kieli pysyy suomena.'),
      faq('Voinko ostaa tähtiä?', 'Et.'),
      faq('Onko tämä terapia-sovellus?', 'Ei. Ei hoitoa, ei luvattua lääketieteellistä tulosta.'),
      faq('Mistä luon tilin?', 'Nykyisellä lomakkeella. Se kysyy, missä perhe asuu. Markkinasivu ei aseta maata itse.'),
    ],
    lead: 'Lyhyet vastaukset. Pidempi teksti on oppaissa.',
    hLang: 'Kieli ja maa',
    lang: 'Tämä sivusto on suomeksi. Maan valitsette erikseen. Markkinasivu ei vaihda kieltä eikä luo tiliä.',
    hChild: 'Lapsi',
    child: 'Lapsi näkee suunnitelman ja rastittaa. Asetukset, kutsut ja tili pysyvät aikuisella. Lisää on kohdassa',
    howLink: 'Näin se toimii',
    hStars: 'Tähdet',
    stars: 'Tähdet tulevat valmiista askelista. Niitä ei voi ostaa. Lue',
    starsLink: 'palkitsemisjärjestelmä',
  },
  privacy: {
    title: 'Tietosuojaseloste — My Starday',
    description: 'Mitä tietoja My Starday käsittelee, mitä emme kerää, ja mitä oikeuksia GDPR antaa.',
    h1: 'My Stardayn tietosuojaseloste',
    ogTitle: 'Tietosuojaseloste',
    body: `
      <p class="updated">Päivitetty viimeksi: lokakuu 2026</p>
      <p>Pidämme yksityisyyttäsi huolellisesti. My Starday kerää niin vähän kuin mahdollista: vain sen, mitä sovellus tarvitsee toimiakseen. Emme myy tietojasi emmekä käytä niitä kohdennettuun mainontaan. Luovutus palvelun ulkopuolelle tapahtuu vain, kun valitset sen itse, tai kun se on tarpeen, jotta käsittelijämme voivat pyörittää palvelua.</p>
      <p><strong>Rekisterinpitäjä:</strong> Papa Bravo AB vastaa henkilötietojesi käsittelystä. Tavoitat meidät <a href="/en/contact">yhteydenottolomakkeella</a>.</p>
      <h2>Mitä keräämme</h2>
      <p>Käsittelemme tietoja sopimuksen perusteella, jotta voimme tarjota sovelluksen ja toiminnot, joihin kirjaudut. Aikuisista ja perheistä keräämme:</p>
      <ul>
        <li><strong>Sähköpostiosoite</strong> — kirjautumiseen ja tiliviesteihin</li>
        <li><strong>Etu- ja sukunimi</strong> — tilin tunnistamiseen</li>
        <li><strong>Aktiviteettiloki</strong> — mitkä tekemiset valmistuivat ja milloin</li>
        <li><strong>Tähdet</strong> — ansaitut ja käytetyt tähdet</li>
        <li><strong>Suunnitelmat ja aktiviteetit</strong> — se, minkä itse luot</li>
      </ul>
      <p><strong>Lapsen yksityisyys:</strong> lapsi tunnistetaan vain etunimestä tai lempinimestä ja valitusta emojista. Emme kerää lapsen sukunimeä, henkilötunnusta emmekä yhteystietoja.</p>
      <h2>Mitä emme kerää</h2>
      <ul>
        <li>Ei lasten sukunimiä</li>
        <li>Ei henkilötunnuksia, ei aikuisilta eikä lapsilta</li>
        <li>Ei tietoja lapsen terveydestä, diagnoosista tai vammasta</li>
        <li>Ei maksutietoja. Ostot kulkevat App Storen tai Google Playn kautta</li>
        <li>Ei sijaintitietoja</li>
      </ul>
      <h2>Mihin käytämme tietoja</h2>
      <ul>
        <li>Näyttää lapselle päiväsuunnitelman</li>
        <li>Tallentaa etenemisen ja tähdet</li>
        <li>Lähettää vahvistusviestin ja tiliviestit</li>
        <li>Vastata viesteihin, jotka lähetät meille</li>
      </ul>
      <h2>Luovutus</h2>
      <p>Emme luovuta tietojasi mainostarkoituksiin. Nämä käsittelijät pyörittävät palvelua. He käsittelevät vain toimeksiannostamme ja GDPR:n mukaan:</p>
      <ul>
        <li><strong>Neon (tietokanta)</strong> — tili, suunnitelmat, aktiviteetit ja perheen tiedot</li>
        <li><strong>Oma hosting (VPS EU:ssa tai ETA:ssa)</strong> — verkkosovellus ja API</li>
        <li><strong>Resend (sähköposti)</strong> — asiointiviestit, kuten vahvistus, salasana ja tervetuloviesti</li>
        <li><strong>Cloudflare R2</strong> — ladatut profiilikuvat, jos käytät toimintoa</li>
        <li><strong>Apple ja Google</strong> — kirjautuminen ja push-viestit APNs:n ja FCM:n kautta, jos käytät toimintoja</li>
      </ul>
      <h2>Raportti keskustelua varten</h2>
      <p>Kun huoltajana luot määräaikaisen linkin valittuihin aktiviteetti- ja palkintolukuihin, voit jakaa sen esimerkiksi opettajalle tai terapeutille. Se tapahtuu vain, koska valitset niin. Päätät sisällön ja voit perua linkin. Vastaanottaja ei tarvitse tiliä.</p>
      <p>Jos suojaat linkin koodilla, älä lähetä koodia samassa viestissä kuin linkkiä.</p>
      <h2>Kirjautuminen Applella tai Googlella</h2>
      <ul>
        <li><strong>Kirjautuminen Applella:</strong> käsittelemme nimen ja sähköpostiosoitteen. Jos valitset sähköpostin piilotuksen, tallennamme Applen luoman yksilöllisen välitysosoitteen, jotta voimme lähettää tiliviestejä.</li>
        <li><strong>Kirjautuminen Googlella:</strong> saamme ja tallennamme Google-tilin sähköpostiosoitteen ja nimen profiilin luomista varten.</li>
      </ul>
      <p>Applen ja Googlen omaan käsittelyyn pätevät niiden omat tietosuojaselosteet.</p>
      <h2>Push-viestit ja laitetunniste</h2>
      <p>Kun otat push-viestit käyttöön, tallennamme suostumuksesi perusteella yksilöllisen laitetunnisteen (APNs tai FCM), jotta viesti tulee oikeaan laitteeseen. Tunniste liittyy tiliisi.</p>
      <p>Tunniste vanhenee uloskirjautuessa tai kun alusta ilmoittaa sen mitättömäksi. Emme tallenna laitteen tunnistetta ilman aktiivista push-tilausta. Sammutus onnistuu sovelluksen asetuksissa tai laitteessa.</p>
      <h2>Säilytysaika</h2>
      <p>Säilytämme tiedot niin kauan kuin tili on aktiivinen. Kun poistat tilin, kaikki tiedot poistetaan heti ja pysyvästi.</p>
      <h2>Tilin poisto</h2>
      <p>Poistat tilin sovelluksessa asetuksista. Vahvistat salasanalla tai kolmannen osapuolen kirjautumisella.</p>
      <p>Tätä ei voi perua. Silloin poistuvat vanhemman tili, lapsiprofiilit, suunnitelmat, päivälokit, arviot, palkinnot ja kutsut.</p>
      <h2>Tallennus ja turvallisuus</h2>
      <p>Pyrimme säilyttämään ydintiedot EU:ssa tai ETA:ssa, kun se pätee. Jotkin toimittajat voivat käsitellä ETA:n ulkopuolella. Siirto ja takeet ovat tässä selosteessa ja niitä tarkistetaan jatkuvasti. Yhteydet on salattu (HTTPS). Salasanoja ei tallenneta selväkielisenä. Käytämme bcryptiä.</p>
      <h2>Evästeet</h2>
      <ul>
        <li><strong>Välttämättömät evästeet</strong> — aina päällä. Istunto ja CSRF-suoja turvalliseen kirjautumiseen.</li>
        <li><strong>Asetukset</strong> — tallennetaan paikallisesti, esimerkiksi teema.</li>
        <li><strong>Tilastot ja markkinointi</strong> — Google Analytics 4, Meta Pixel ja Google Ads. Oletuksena pois, kunnes suostut evästeilmoituksessa.</li>
      </ul>
      <p>Valintasi säilytämme enintään vuoden. Voit muuttaa sitä ilmoituksesta tai asetuksista. Lapsen rutiinitietoja ei lähetetä mainosalustoille.</p>
      <h2>Oikeutesi (GDPR)</h2>
      <ul>
        <li>Oikeus poistaa tili ja tiedot</li>
        <li>Oikeus saada pääsy tietoihin</li>
        <li>Oikeus oikaista virheelliset tiedot</li>
        <li>Oikeus vastustaa tai rajoittaa käsittelyä</li>
        <li>Oikeus valittaa Ruotsin valvontaviranomaiselle Integritetsskyddsmyndigheten (IMY), jos katsot meidän rikkovan GDPR:ää</li>
      </ul>
      <h2>Yhteys</h2>
      <p>Kysymyksiä tästä käsittelystä? Käytä <a href="/en/contact">yhteydenottolomaketta</a>.</p>
    `,
  },
  terms: {
    title: 'Käyttöehdot — My Starday',
    description: 'Ehdot My Stardayn käytölle: tili, lapset, hinta ja vastuu.',
    h1: 'Käyttöehdot',
    ogTitle: 'Käyttöehdot',
    body: `
      <p class="updated">Päivitetty viimeksi: lokakuu 2026</p>
      <p>Kiitos, että käytät My Stardayta. Näiden ehtojen on oltava selvät ja rehelliset. Kysymykset lähetät <a href="/en/contact">yhteydenottolomakkeella</a>.</p>
      <h2>1. Palvelusta</h2>
      <p>My Starday on digitaalinen palvelu perheille, jotka haluavat jäsennellyn päiväsuunnitelman, merkitä lapsen etenemisen tähdillä ja antaa lapsen seurata tekemisiä omassa näkymässä. Palvelu on vanhemmille ja huoltajille ja heidän lapsilleen. Perheessä on vähintään yksi aikuinen, jolla on tili. Lapsi kirjautuu PIN-koodilla lapsinäkymään.</p>
      <h2>2. Tili ja turvallisuus</h2>
      <ul>
        <li>Valitse vahva salasana äläkä jaa sitä</li>
        <li>Suojaa sähköpostiosoitteesi. Sillä saat pääsyn takaisin</li>
        <li>Lapsinäkymän PIN on vain lapselle ja huoltajille</li>
        <li>Älä käytä sovellusta tavalla, joka on Ruotsin lain vastaista</li>
      </ul>
      <p>Vastaat kaikesta, mitä tililläsi tapahtuu, myös jos joku muu käyttää sitä. Jos epäilet väärinkäyttöä, ota heti yhteyttä.</p>
      <h2>3. Lapset ja henkilötiedot</h2>
      <p>My Starday käsittelee tietoja lapsista. Noudatamme GDPR:ää ja tietojen minimoinnin periaatetta:</p>
      <ul>
        <li>Lapsi tunnistetaan etunimestä ja valitusta emojista. Ei sukunimeä, ei henkilötunnusta, ei yhteystietoja</li>
        <li>Vanhemmat tai huoltajat syöttävät tiedot ja suostuvat jakamiseen</li>
        <li>Emme käytä lasten tietoja mainontaan emmekä muuhun kuin palveluun</li>
        <li>Raportit ja suunnitelmat jaetaan vain, kun aikuinen itse jakaa määräaikaisen linkin</li>
      </ul>
      <h2>4. Sisältö, jonka luot</h2>
      <p>Suunnitelmat, palkinnot, aktiviteetit ja havainnot, jotka lisäät, kuuluvat sinulle tai perheellesi. Annat meille oikeuden tallentaa ja näyttää tätä sisältöä niin kauan kuin tili on aktiivinen. Emme kopioi sitä mainontaan, emme myy sitä emmekä käytä sitä markkinoinnissa.</p>
      <h2>5. Käyttö</h2>
      <p>Palvelu on henkilökohtaiseen käyttöön perheessäsi. Ei ole sallittua:</p>
      <ul>
        <li>Kaupallinen käyttö ilman sopimusta Papa Bravo AB:n kanssa</li>
        <li>Suunnitelmien, tähtien tai palkintojen manipulointi sovelluksen tavanomaisten kulkujen ulkopuolella</li>
        <li>Automaattiset välineet, scraperit tai botit palvelua vastaan</li>
        <li>Sisällön julkaiseminen, joka on laitonta, loukkaavaa tai vahingollista</li>
      </ul>
      <h2>6. Päättäminen ja poisto</h2>
      <p>Voit milloin tahansa poistaa tilin pysyvästi sovelluksen asetuksista, vahvistettuna salasanallasi.</p>
      <p>Poisto poistaa heti ja pysyvästi vanhemman tilin, kaikki lapset, suunnitelmat, aktiviteettilokit, tähdet, palkinnot ja mahdolliset havainnot.</p>
      <p>Voimme sulkea tilin, joka rikkoo näitä ehtoja tai Ruotsin lakia.</p>
      <h2>7. Hinta</h2>
      <p>Perheet Irlannissa ja Kanadassa voivat käyttää My Stardayta maksutta 31. joulukuuta 2026 asti. Tuona aikana maksua ei tarvita. Maksuton jakso ei muutu tilaukseksi automaattisesti. 1. tammikuuta 2027 alkaen voit valita tilauksen App Storessa tai Google Playssa. Tällä sivulla ei ole verkkomaksua. Muissa maissa pätee hinta ja pääsy, jonka sovellus näyttää kyseiselle maalle. Ruotsalaiset perheet, jotka aloittavat 3. lokakuuta 2026 tai sen jälkeen, voivat kokeilla sovellusta 14 päivää ja sen jälkeen valita sovelluksessa 59 Ruotsin kruunua kuukaudessa tai 590 Ruotsin kruunua vuodessa. Perheet, joilla jo on tili, pitävät nykyisen tarjouksensa.</p>
      <h2>8. Muutokset</h2>
      <p>Voimme muuttaa näitä ehtoja, esimerkiksi lakimuutoksen, uuden toiminnon tai täsmennyksen jälkeen. Jos muutos on olennainen, kerromme siitä sähköpostilla tai ilmoituksella sovelluksessa.</p>
      <p>Jos käytät palvelua sen jälkeen, se on uusien ehtojen hyväksyminen.</p>
      <h2>9. Vastuu</h2>
      <p>My Starday tarjotaan sellaisena kuin se on. Teemme parhaamme pitääksemme palvelun vakaana ja turvallisena, mutta emme voi taata, että se on aina saatavilla keskeytyksettä.</p>
      <p>Papa Bravo AB ei vastaa:</p>
      <ul>
        <li>Tietojen menetyksestä ylivoimaisen esteen vuoksi</li>
        <li>Vahingosta, koska jaat PIN-koodin tai kirjautumistiedot jollekulle, jolle ne eivät kuulu</li>
        <li>Välillisestä vahingosta, menetystä mahdollisuudesta tai menetetyistä tiedoista, ellei Ruotsin laki vaadi muuta</li>
      </ul>
      <p>Vastaat käytöstä näiden ehtojen ja Ruotsin lain mukaan.</p>
      <h2>10. Yhteys</h2>
      <p>Kysymyksiä näistä ehdoista tai palvelusta? Käytä <a href="/en/contact">yhteydenottolomaketta</a>.</p>
    `,
  },
});

module.exports = { pageFor };
