'use strict';

/**
 * Dutch pilot copy. Written in Dutch from the verified English pages.
 * No Swedish resource long-tails and no English sentences in the body.
 */

const { pathFor } = require('../../config/web-content-keys');
const { marketCommercialFacts, playUrlForMarket, marketByCode } = require('../../config/web-markets');

function href(key) {
  return pathFor(key, 'nl');
}

const PAGES = Object.freeze({
  home: Object.freeze({
    title: 'Visueel schema voor kinderen – routines, beloningen en pictogrammen | My Starday',
    description: 'Visuele schema’s en routines die een kind laten zien wat er nu gebeurt en wat daarna komt. Pictogrammen, een eigen kindweergave en sterren voor afgeronde stappen.',
    h1: 'Visuele schema’s en routines die een kind laten zien wat er nu gebeurt en wat daarna komt.',
    ogTitle: 'Visueel schema voor kinderen',
    faqs: Object.freeze([
      { q: 'Wat is een visueel schema?', a: 'Een visueel schema toont de dag als plaatjes op volgorde. Het kind ziet wat er nu gebeurt en wat daarna komt, zonder de hele dag te hoeven onthouden.' },
      { q: 'Is dit een behandeling?', a: 'Nee. My Starday is een hulpmiddel voor de dag. Het behandelt ADHD of autisme niet en belooft geen medisch resultaat.' },
    ]),
    body: `
      <p class="lead">Elke stap is een plaatje. Het kind ziet wat nu aan de beurt is en wat daarna komt. Sterren horen bij een afgeronde stap. Ze zijn niet te koop.</p>
      <p><a class="btn-primary" href="${href('howItWorks')}">Zo werkt het</a></p>
      <h2>Wat het kind ziet</h2>
      <ul>
        <li><strong>Visueel schema.</strong> De dag staat in plaatjes, niet in een alinea uitleg.</li>
        <li><strong>Routines.</strong> Ochtend, middag en avond kunnen elk hun eigen volgorde hebben.</li>
        <li><strong>Pictogrammen.</strong> Een kind hoeft niet te kunnen lezen om de volgende stap te zien.</li>
        <li><strong>Kindweergave.</strong> Het kind vinkt zelf af. De volwassene houdt de instellingen.</li>
        <li><strong>Sterren.</strong> Een afgeronde stap kan een ster geven, voor een beloning die jullie vooraf afspreken.</li>
      </ul>
      <h2>Voor kinderen die meer duidelijkheid nodig hebben</h2>
      <p>Sommige kinderen hebben baat bij een vaste volgorde, omdat “maak je klaar” te vaag is. Een plaatje per stap maakt de overgang zichtbaar. Dat kan helpen bij ADHD of autisme, en ook in een gewoon gezin. My Starday behandelt geen van beide en belooft geen uitkomst.</p>
      <p><a href="${href('neurodiverseRoutines')}">Routines voor kinderen die meer duidelijkheid nodig hebben</a></p>
      <h2>Nu beschikbaar op een paar markten</h2>
      <p>De Nederlandstalige site legt het product uit. Een land is iets anders dan de taal. De pagina voor Nederland staat apart, zodat deze site niet één land wordt.</p>
      <p><a href="/nl/nl">Nederland</a></p>
      <h2>Gidsen</h2>
      <ul>
        <li><a href="${href('visualSchedule')}">Visueel schema</a></li>
        <li><a href="${href('morningRoutine')}">Ochtendroutine</a></li>
        <li><a href="${href('weeklySchedule')}">Weekplanning met pictogrammen</a></li>
        <li><a href="${href('rewardSystem')}">Beloningssysteem</a></li>
        <li><a href="${href('resources')}">Bronnen</a></li>
        <li><a href="${href('faq')}">Veelgestelde vragen</a></li>
      </ul>
    `,
  }),
  howItWorks: Object.freeze({
    title: 'Zo werkt My Starday — visuele routines voor kinderen',
    description: 'Zo helpt My Starday een gezin: een visueel schema, een kindweergave, sterren en beloningen die jullie zelf kiezen.',
    h1: 'Zo werkt het',
    ogTitle: 'Zo werkt My Starday',
    body: `
      <ol>
        <li><strong>Kies de stappen.</strong> Ochtend, school of avond, met een plaatje per stap.</li>
        <li><strong>Het kind ziet nu en daarna.</strong> In de kindweergave vinkt het kind de stap af.</li>
        <li><strong>Sterren horen bij de stap.</strong> Een beloning spreek je vooraf af. Sterren koop je niet.</li>
        <li><strong>De volwassene houdt het overzicht.</strong> Tijden, beloningen en wie mag meekijken stel je zelf in.</li>
      </ol>
      <p><a href="${href('visualSchedule')}">Lees de gids over het visuele schema</a></p>
    `,
  }),
  visualSchedule: Object.freeze({
    title: 'Visueel schema voor kinderen | My Starday',
    description: 'Een visueel schema laat de dag zien als plaatjes op volgorde. Het kind ziet wat er nu gebeurt en wat daarna komt.',
    h1: 'Visueel schema voor kinderen',
    ogTitle: 'Visueel schema voor kinderen',
    faqs: Object.freeze([
      { q: 'Wat is een visueel schema?', a: 'Plaatjes van de activiteiten, op volgorde, zodat een kind nu en daarna kan zien zonder een alinea te lezen.' },
      { q: 'Moet het kind kunnen lezen?', a: 'Nee. De plaatjes dragen de routine. Tekst kan ernaast staan voor volwassenen.' },
      { q: 'Is een visueel schema alleen voor ADHD of autisme?', a: 'Nee. Veel gezinnen gebruiken het als gewone routine. Het kan ook steun zijn als een kind meer duidelijkheid nodig heeft. Het is geen behandeling.' },
    ]),
    body: `
      <p class="lead">Een visueel schema maakt de dag begrijpelijk. Elk moment is een plaatje. Het kind ziet wat nu gebeurt en wat daarna komt.</p>
      <h2>Wat het is</h2>
      <p>Een visueel schema toont activiteiten als plaatjes, symbolen of foto’s, in plaats van een lap tekst. Het kind ziet wat er nu gebeurt en wat daarna komt, en kan elke stap afvinken. Voor veel kinderen is dat het verschil tussen wachten tot iemand het zegt en zelf weten wat komt.</p>
      <p>Een dagschema is vandaag. Een <a href="${href('weeklySchedule')}">weekplanning met pictogrammen</a> laat zien hoe de dagen van elkaar verschillen. De kindweergave blijft visueel. Woorden mogen ernaast staan voor volwassenen.</p>
      <h2>Waarom plaatjes helpen</h2>
      <p>“Maak je klaar” is vaag. Een plaatje per stap niet. Een zichtbare lijst ontlast het geheugen: het kind kijkt naar het volgende plaatje in plaats van tien ochtendtaken te onthouden. Dezelfde plaatjes, in dezelfde volgorde, maken van een lijst een gewoonte.</p>
      <p>Afvinken is een klein, concreet “dit heb ik gedaan”. Het is geen behandeling en het past niet bij elk kind op dezelfde manier.</p>
      <h2>Voor wie</h2>
      <ul>
        <li>Jonge kinderen die nog niet vlot lezen en het toch zelf willen doen.</li>
        <li>Ochtenden waarin iedereen de volgende stap vergeet.</li>
        <li>Kinderen die de draad kwijtraken en een duidelijk “deze nu” nodig hebben.</li>
        <li>Broers en zussen met elk een eigen schema.</li>
      </ul>
      <p>Een visueel schema is niet alleen voor een diagnose. Gezinnen die <a href="${href('neurodiverseRoutines')}">meer duidelijkheid</a> zoeken, gebruiken het vaak omdat voorspelbaarheid helpt. My Starday behandelt ADHD of autisme niet.</p>
      <h2>Voorbeeld van een ochtend</h2>
      <ol>
        <li>Wakker worden en uit bed</li>
        <li>Naar het toilet en handen wassen</li>
        <li>Aankleden</li>
        <li>Ontbijt</li>
        <li>Tanden poetsen</li>
        <li>Tas, jas, schoenen</li>
      </ol>
      <p>Begin korter als de ochtend te groot voelt. Drie stappen die gebeuren, zijn beter dan tien die blijven liggen. Meer detail staat in de <a href="${href('morningRoutine')}">ochtendroutine</a>.</p>
      <h2>Papier of app</h2>
      <p>Papier is sterk als het plan in één kamer blijft. Afdrukbare PDF’s zijn er nog niet in het Nederlands. In de app hoef je niet opnieuw te printen als zwemmen van dinsdag naar woensdag schuift, en de <a href="${href('rewardSystem')}">sterren hangen aan de stappen</a>. Sterren verdien je in de routine. Je koopt ze niet.</p>
    `,
  }),
  morningRoutine: Object.freeze({
    title: 'Ochtendroutine voor kinderen | My Starday',
    description: 'Een korte ochtendroutine in plaatjes maakt de start van de dag voorspelbaar. Het kind ziet de volgende stap zonder een reeks mondelinge herinneringen.',
    h1: 'Ochtendroutine voor kinderen',
    ogTitle: 'Ochtendroutine voor kinderen',
    faqs: Object.freeze([
      { q: 'Hoeveel stappen heeft een ochtend nodig?', a: 'Vier tot zes is een rustige start. Meer stappen voeg je toe als die volgorde al blijft hangen.' },
      { q: 'Wat als een stap vastloopt?', a: 'Splits de stap, leg kleren de avond ervoor klaar, en laat het schema leiden in plaats van je stem.' },
    ]),
    body: `
      <p class="lead">De gehaaste ochtend is voor veel gezinnen herkenbaar. Wat vaak ontbreekt, is een volgorde die het kind kan zien. Een kort <a href="${href('visualSchedule')}">visueel schema</a> maakt de ochtend voorspelbaar.</p>
      <h2>Waarom een vaste ochtend helpt</h2>
      <p>Kinderen komen tot rust als ze weten wat daarna komt. Dezelfde volgorde, dag na dag, maakt van een lijst een gewoonte. Een zichtbare routine haalt ook het aantal gesproken herinneringen omlaag. In plaats van nog eens “tanden poetsen” te zeggen, kijken jullie naar het volgende plaatje.</p>
      <h2>Voorbeeld</h2>
      <ol>
        <li>Opstaan</li>
        <li>Toilet en handen wassen</li>
        <li>Aankleden</li>
        <li>Ontbijt</li>
        <li>Tanden poetsen</li>
        <li>Jas, schoenen, tas</li>
      </ol>
      <p>Veel kleuters doen het beter met vier of vijf stappen. Een langer lijstje kan als de volgorde bekend is.</p>
      <h2>Pictogrammen in de ochtend</h2>
      <ul>
        <li>Gebruik plaatjes die het kind al herkent. Foto’s van thuis werken goed.</li>
        <li>Houd de lijst kort.</li>
        <li>Leg het schema waar het kind het ziet bij het wakker worden.</li>
      </ul>
      <h2>Als een stap vastloopt</h2>
      <ul>
        <li><strong>Splits de stap.</strong> “Aankleden” wordt sokken, broek, shirt.</li>
        <li><strong>Eén tegelijk.</strong> De app kan op nu en daarna blijven.</li>
        <li><strong>Wijs, in plaats van te herhalen.</strong></li>
        <li><strong>Tel de poging.</strong> Een ster voor het proberen, niet alleen voor een perfecte uitvoering.</li>
      </ul>
      <p>Gezinnen die meer houvast zoeken bij aandacht of overgangen, kunnen de <a href="${href('neurodiverseRoutines')}">gids over duidelijkheid</a> lezen. My Starday is steun in de dag, geen behandeling, en belooft geen bepaald resultaat.</p>
    `,
  }),
  weeklySchedule: Object.freeze({
    title: 'Weekplanning met pictogrammen voor kinderen | My Starday',
    description: 'Een weekplanning met pictogrammen laat een kind zien wat voor dag het is, niet alleen wat er nu gebeurt.',
    h1: 'Weekplanning met pictogrammen',
    ogTitle: 'Weekplanning met pictogrammen',
    faqs: Object.freeze([
      { q: 'Wat is het verschil met een dagschema?', a: 'Een dagschema is de stappen van vandaag. Een weekplanning laat zien hoe de dagen van elkaar verschillen. Veel gezinnen willen allebei.' },
      { q: 'Vanaf welke leeftijd?', a: 'Het wordt vaak belangrijk rond de schoolleeftijd, als de week meer wisselt. Jongere kinderen hebben meestal eerst genoeg aan vandaag.' },
    ]),
    body: `
      <p class="lead">Een weekplanning helpt een kind zien wat voor dag het is, niet alleen wat er deze minuut gebeurt. Handig als doordeweeks en weekend verschillen, of als “wat gebeurt er morgen?” een antwoord nodig heeft voor het slapen.</p>
      <h2>Dag en week</h2>
      <p>Een dagschema toont vandaag, stap voor stap. Een weekplanning toont hoe de dagen verschillen: maandag met voetbal, woensdag bij de andere ouder, vrijdag met een film. Plaatjes maken dat zichtbaar voor kinderen die nog geen kalender lezen.</p>
      <p>In My Starday kunnen beide naast elkaar: de week als overzicht, de dag voor ochtend en avond. Begin bij de <a href="${href('visualSchedule')}">gids over het visuele schema</a> als het idee nieuw is.</p>
      <h2>Wanneer een weekoverzicht helpt</h2>
      <ul>
        <li>School en naschoolse opvang, met andere activiteiten per dag.</li>
        <li>Twee huizen. Het kind ziet bij welk huis een dag hoort.</li>
        <li>Broers en zussen met een ander rooster.</li>
        <li>“Wat gebeurt er morgen?” De week antwoordt vooraf.</li>
      </ul>
      <h2>Zo bouw je hem</h2>
      <ol>
        <li>Noteer wat er echt wisselt.</li>
        <li>Kies één plaatje per soort dag of per belangrijke activiteit.</li>
        <li>Hang een dagroutine aan elke weekdag.</li>
        <li>Kijk er samen naar, bijvoorbeeld zondagavond.</li>
      </ol>
      <p>De week zegt welke dag het is. Een <a href="${href('rewardSystem')}">beloningssysteem</a> steunt het kind om de stappen ook te doen. De <a href="${href('morningRoutine')}">ochtendroutine</a> is de dagelijkse helft.</p>
      <p>Een afdrukbare weekplanning is er nog niet in het Nederlands. De app is de levende versie: een verplaatste zwemles betekent niet de hele week opnieuw printen.</p>
    `,
  }),
  neurodiverseRoutines: Object.freeze({
    title: 'Routines voor kinderen die meer duidelijkheid nodig hebben | My Starday',
    description: 'Visuele routines kunnen de volgende stap zichtbaar maken voor kinderen met ADHD of autisme. My Starday is een hulpmiddel voor de dag, geen behandeling.',
    h1: 'Routines voor kinderen die meer duidelijkheid nodig hebben',
    ogTitle: 'Routines en visuele schema’s',
    faqs: Object.freeze([
      { q: 'Kan een visueel schema helpen bij ADHD?', a: 'Het kan de volgende stap zichtbaar maken. Veel gezinnen vinden dat helpend om te beginnen. Het is geen behandeling.' },
      { q: 'Kan een visueel schema helpen bij autisme?', a: 'Een voorspelbare volgorde kan onzekerheid bij overgangen kleiner maken. Het vervangt geen professionele hulp.' },
      { q: 'Vervangt de app professionele zorg?', a: 'Nee. Het is steun in de dag, naast professionele hulp, niet in plaats daarvan.' },
    ]),
    body: `
      <p class="lead">Ochtenden vol herinneringen, lastige overgangen en spanning als iets verandert, zijn in veel huizen bekend. Voor kinderen met ADHD of autisme maakt het vaak uit of ze kunnen zien wat er nu gebeurt en wat daarna komt. Een <a href="${href('visualSchedule')}">visueel schema</a> kan een deel van die last van jullie allebei afhalen. Het is een praktisch hulpmiddel, geen therapie en geen belofte van een bepaalde uitkomst.</p>
      <h2>Waarom voorspelbare routines helpen</h2>
      <p>Plannen, beginnen, meerdere stappen onthouden en wisselen van activiteit kost sommige kinderen meer moeite. Dat is geen onwil. Een reeks plaatjes buiten het hoofd geeft de volgorde een plek.</p>
      <p>Als het kind ziet wat er nu gebeurt en wat daarna komt, zijn er minder verrassingen. Minder verrassingen betekent vaak minder ontploffingen op de naad tussen activiteiten. Dat is steun, geen medisch resultaat dat we kunnen garanderen.</p>
      <h2>Wat vaak helpt</h2>
      <ul>
        <li><strong>Laat het zien.</strong> Plaatjes landen makkelijker dan een gesproken lijst.</li>
        <li><strong>Bereid overgangen voor.</strong> De naad tussen activiteiten is vaak het moeilijke stuk.</li>
        <li><strong>Splits grote stappen.</strong> “Klaarmaken” wordt sokken, dan broek, dan shirt.</li>
        <li><strong>Houd de volgorde stabiel.</strong></li>
        <li><strong>Maak inzet zichtbaar.</strong> Een <a href="${href('rewardSystem')}">sterrenkaart</a> toont voortgang zonder de routine ter plekke tot een onderhandeling te maken.</li>
      </ul>
      <p>My Starday is educatieve steun voor het dagelijks leven. Het is geen medische behandeling en het vervangt geen advies van een arts, ergotherapeut, logopedist of schoolteam.</p>
      <h2>ADHD: beginnen en bij de stap blijven</h2>
      <p>Kinderen met ADHD blijven vaak hangen tussen activiteiten omdat de volgende stap niet zichtbaar is, niet omdat het hun niet kan schelen. Een schema met een vinkje geeft meteen terugkoppeling: deze stap is klaar.</p>
      <h2>Autisme: voorspelbaarheid en overgangen</h2>
      <p>Veel autistische kinderen doen het beter als de dag kenbaar is. Een andere volgorde of een geschrapte stap kan groot voelen. Een <a href="${href('weeklySchedule')}">weekplanning</a> laat vooraf zien wat voor dag het wordt.</p>
      <h2>Afdrukken</h2>
      <p>De app bevat geen volledig TEACCH-werksysteem. TEACCH-geïnspireerde kaarten voor eerst, dan en klaar zijn nog niet als Nederlandse PDF beschikbaar. Zulke kaarten zijn geïnspireerd op die aanpak. Ze zijn geen officiële methode en geen certificering.</p>
    `,
  }),
  rewardSystem: Object.freeze({
    title: 'Beloningssysteem voor kinderen | My Starday',
    description: 'Een beloning die je vooraf afspreekt, is iets anders dan een omkoping op het moment zelf. Sterren in My Starday verdient het kind. Ze zijn niet te koop.',
    h1: 'Beloningssysteem voor kinderen, zonder er een omkoping van te maken',
    ogTitle: 'Beloningssysteem voor kinderen',
    faqs: Object.freeze([
      { q: 'Is een beloningskaart hetzelfde als omkopen?', a: 'Niet als de beloning vooraf is afgesproken en vastzit aan iets wat het kind kan doen. Omkopen bied je op het moment zelf aan om iets te stoppen.' },
      { q: 'Hoeveel sterren?', a: 'Begin met één ster per afgeronde stap. Sterren zijn niet te koop.' },
      { q: 'Wanneer stoppen we?', a: 'Als de gewoonte staat, kun je de sterren uitdunnen. Het doel is dat de routine zichzelf draagt.' },
    ]),
    body: `
      <p class="lead">“Is dat niet gewoon omkopen?” is de gewone vraag bij een beloningskaart. Het hangt ervan af hoe je hem gebruikt. Vooraf afgesproken kan een kaart een gewoonte steunen. Aangeboden midden in de boosheid wordt het een onderhandeling. Sterren verdien je. Ze zijn niet te koop.</p>
      <h2>Beloning en omkoping</h2>
      <p>Een omkoping bied je op het moment zelf aan om iets te stoppen. Een beloning spreek je vooraf af en koppel je aan duidelijk gedrag: “Elke ochtend dat je jezelf aankleedt, verdien je een ster.” Het kind kent de afspraak en ziet de voortgang.</p>
      <h2>Waarom een zichtbare kaart helpt</h2>
      <p>Kinderen moeten vaak zien dat inzet meetelt, zeker als een routine saai is. Sterren geven meteen terugkoppeling: deze stap is klaar. Op een <a href="${href('visualSchedule')}">visueel schema</a> is de keten eenvoudig: zie de stap, doe hem, vink hem af, verdien de ster.</p>
      <h2>Een systeem dat blijft staan</h2>
      <ol>
        <li>Wees specifiek. Beloon “poetst tanden zonder herinnering”, niet “is lief”.</li>
        <li>Laat voortgang zien.</li>
        <li>Tel de inzet. Dan blijft een moeilijke stap de moeite van het proberen waard.</li>
        <li>Laat het kind meedenken over beloningen.</li>
        <li>Bouw het af als de gewoonte staat.</li>
      </ol>
      <h2>Veelgemaakte fouten</h2>
      <ul>
        <li>Enorme beloningen voor kleine stappen.</li>
        <li>Alleen de perfecte ochtend telt, en elke poging daartussen verdwijnt.</li>
        <li>Een beloning aanbieden terwijl iedereen overstuur is.</li>
        <li>De regels wijzigen zonder het te zeggen.</li>
        <li>Sterren afpakken. Een gemiste stap haalt niet weg wat al verdiend was.</li>
      </ul>
      <p>In My Starday hangen de sterren aan het schema van het kind. Je koopt geen sterren. Het kind verdient ze door de routine te doen. Koppel ze aan een echte routine via de <a href="${href('morningRoutine')}">ochtendroutine</a>.</p>
    `,
  }),
  resources: Object.freeze({
    title: 'Bronnen: visuele steun voor kinderen | My Starday',
    description: 'Nederlandstalige uitleg over visuele schema’s, ochtendroutines, weekplanning en beloningen. Afdrukbare PDF’s zijn er nog niet in het Nederlands.',
    h1: 'Bronnen voor visuele steun',
    ogTitle: 'Bronnen voor visuele steun',
    body: `
      <p class="lead">Dit is de Nederlandstalige ingang. De gidsen hieronder leggen uit hoe een schema, een ochtend, een week en een beloning werken. Afdrukbare PDF’s zijn er nog niet in het Nederlands. We vullen deze pagina niet met vertaalde lange rijen van losse activiteiten.</p>
      <h2>Gidsen</h2>
      <ul>
        <li><a href="${href('visualSchedule')}"><strong>Visueel schema</strong></a> — wat het is en hoe je er een bouwt.</li>
        <li><a href="${href('morningRoutine')}"><strong>Ochtendroutine</strong></a> — een korte, zichtbare start van de dag.</li>
        <li><a href="${href('weeklySchedule')}"><strong>Weekplanning met pictogrammen</strong></a> — hoe de dagen van elkaar verschillen.</li>
        <li><a href="${href('neurodiverseRoutines')}"><strong>Meer duidelijkheid</strong></a> — routines zonder medische belofte.</li>
        <li><a href="${href('rewardSystem')}"><strong>Beloningssysteem</strong></a> — sterren die het kind verdient.</li>
      </ul>
      <h2>Papier of app</h2>
      <p>Papier werkt als je iets aan de muur wilt. De app is voor gezinnen die niet opnieuw willen printen elke keer dat de week verandert. Het kind ziet wat nu gebeurt en wat daarna komt.</p>
    `,
  }),
  faq: Object.freeze({
    title: 'Veelgestelde vragen — My Starday',
    description: 'Antwoorden over visuele schema’s, de kindweergave, sterren, ADHD en autisme, en wat er wel en niet gratis is.',
    h1: 'Veelgestelde vragen',
    ogTitle: 'Veelgestelde vragen',
    faqs: Object.freeze([
      { q: 'Wat is My Starday?', a: 'Een visueel dagschema voor kinderen, met sterren als beloning, zodat routines rustiger en duidelijker worden.' },
      { q: 'Is My Starday gratis?', a: 'Gezinnen in Ierland en Canada kunnen My Starday gratis gebruiken tot en met 31 december 2026. In die periode is geen betaling nodig en het aanbod wordt niet automatisch een abonnement. Nederland heeft die gratisperiode niet. Nieuwe accounts buiten die landen volgen de bestaande proefregel van 14 dagen, en registratie in Nederland staat standaard niet open.' },
      { q: 'Voor welke leeftijd is het?', a: 'Vanaf de kleuterleeftijd. Kinderen die baat hebben bij duidelijke plaatjes en stappen hebben er vaak het meest aan.' },
      { q: 'Hoe logt mijn kind in?', a: 'Je maakt een kindprofiel in het ouderdeel. Het kind logt in met een naam en een pincode, in een eigen weergave.' },
      { q: 'Wat gebeurt er met sterren als we een dag overslaan?', a: 'Niets negatiefs. Sterren blijven staan. My Starday is gebouwd op motivatie, niet op straf.' },
      { q: 'Hoe werken de sterren?', a: 'Het kind vinkt activiteiten af en verdient sterren. Sterren wissel je in voor beloningen die jullie samen bepalen. Je koopt geen sterren.' },
      { q: 'Kan mijn kind de app zelf gebruiken?', a: 'Ja. Het kind heeft een eigen weergave. De volwassene houdt de instellingen.' },
      { q: 'Kan het voor meerdere kinderen?', a: 'Ja. Elk kind kan een eigen schema hebben.' },
      { q: 'Is het veilig voor mijn kind?', a: 'Geen advertenties in de kindweergave, geen sociaal netwerk, en geen gezondheidsgegevens. De volwassene bepaalt wat er gedeeld wordt.' },
      { q: 'Behandelt de app ADHD of autisme?', a: 'Nee. Het kan de volgende stap zichtbaar maken. Het is geen behandeling en het belooft geen medisch resultaat.' },
    ]),
    body: `
      <p class="lead">Korte antwoorden op vragen die gezinnen vaak stellen. De uitgebreide gidsen staan bij de bronnen.</p>
      <p><a href="${href('resources')}">Naar de bronnen</a></p>
    `,
  }),
});

function nlMarketPage() {
  const facts = marketCommercialFacts('NL');
  const market = marketByCode('NL');
  const play = playUrlForMarket(market);
  const gateDefault = facts.registrationOpenByDefault;
  const registration = gateDefault
    ? 'Nieuwe registratie in Nederland volgt de bestaande marktpoort.'
    : 'Nieuwe accounts in Nederland staan standaard niet open. Dat volgt de bestaande EU-marktpoort, niet deze pagina.';
  const commercial = facts.complimentary
    ? 'Voor dit land geldt de bestaande gratisperiode.'
    : `Als een account hier later mogelijk wordt, geldt de bestaande regel voor landen buiten Zweden, Ierland en Canada: een proefperiode van ${facts.trialDays} dagen. Betalen moet beschikbaar zijn voordat een account kan worden aangemaakt. Er is geen gratisperiode tot en met 31 december 2026, en er wordt niets automatisch een abonnement.`;
  const playHtml = play
    ? `<a href="${String(play).replace(/&/g, '&amp;')}" data-track="play_store_click" data-store-cta="play" data-market="NL" data-store-placement="hero">Google Play</a>`
    : '<span role="status">Google Play — nog niet als aparte Nederlandse pagina</span>';
  return Object.freeze({
    title: 'My Starday in Nederland — visuele schema’s voor kinderen',
    description: 'De Nederland-pagina van My Starday. Visuele schema’s in het Nederlands. Registratie staat standaard niet open. Geen aparte winkelcampagne.',
    h1: 'Visuele schema’s voor gezinnen in Nederland',
    ogTitle: 'My Starday in Nederland',
    marketCode: 'NL',
    body: `
      <p class="lead">Dit is de pagina voor Nederland. De Nederlandstalige site zelf blijft een taalsite, niet een landingspagina voor één land.</p>
      <p>${registration} De standaard is ${gateDefault ? 'open' : 'dicht'}.</p>
      <p>${commercial}</p>
      <p>De App Store-knop opent de algemene vermelding, niet een verzonnen Nederlandse productpagina. Google Play opent de bestaande vermelding. Er is nog geen aparte Nederlandse winkelcampagne, en deze pagina wordt niet geadverteerd als lancering.</p>
      <p>
        <a href="${market.appleUrl}" data-track="app_store_click" data-market="NL" data-store-placement="hero">App Store</a>
        ${playHtml}
      </p>
      <p><a href="/en/register" data-market="NL">Account aanmaken</a></p>
      <p>Het formulier vraagt waar het gezin woont. Deze link zet zelf geen land en geen prijs.</p>
      <p><a href="${href('howItWorks')}">Zo werkt het</a></p>
      <h2>Beschikbaarheid</h2>
      <p>Taal en land zijn twee dingen. Deze URL zet de markt op Nederland. Hij legt geen account vast en hij verandert de betalingsregels niet.</p>
    `,
  });
}

function legalPages() {
  const privacy = `
    <p class="updated">Laatst bijgewerkt: oktober 2026</p>
    <p>We gaan zorgvuldig met je privacy om. My Starday verzamelt zo min mogelijk gegevens: alleen wat de app nodig heeft om te werken. We verkopen je gegevens niet en we gebruiken ze niet voor gerichte advertenties. Delen buiten de dienst gebeurt alleen als je daar zelf voor kiest, of als het nodig is om de dienst te laten draaien via onze verwerkers.</p>
    <p><strong>Verwerkingsverantwoordelijke:</strong> Papa Bravo AB is verantwoordelijk voor de verwerking van je persoonsgegevens. Je bereikt ons via het <a href="/en/contact">contactformulier</a>.</p>
    <h2>Wat we verzamelen</h2>
    <p>We verwerken gegevens op basis van de overeenkomst, zodat we de app en de functies kunnen leveren waarvoor je je aanmeldt. Over ouders en gezinnen verzamelen we:</p>
    <ul>
      <li><strong>E-mailadres</strong> — voor aanmelden en berichten over het account</li>
      <li><strong>Voor- en achternaam</strong> — om het account te herkennen</li>
      <li><strong>Activiteitenlog</strong> — welke activiteiten zijn afgerond, en wanneer</li>
      <li><strong>Sterren</strong> — verdiende en ingewisselde sterren</li>
      <li><strong>Schema’s en activiteiten</strong> — wat je zelf aanmaakt</li>
    </ul>
    <p><strong>Privacy van kinderen:</strong> een kind is alleen herkenbaar aan een voornaam of bijnaam en een gekozen emoji. We verzamelen geen achternaam, persoonsnummer of contactgegevens van een kind.</p>
    <h2>Wat we niet verzamelen</h2>
    <ul>
      <li>Geen achternamen van kinderen</li>
      <li>Geen persoonsnummers, van volwassenen noch van kinderen</li>
      <li>Geen gegevens over gezondheid, diagnose of beperking van een kind</li>
      <li>Geen betaalgegevens. Aankopen lopen via de App Store of Google Play</li>
      <li>Geen locatiegegevens</li>
    </ul>
    <h2>Waar we de gegevens voor gebruiken</h2>
    <ul>
      <li>Het dagschema aan het kind laten zien</li>
      <li>Voortgang en sterren bewaren</li>
      <li>Verificatiemail en accountberichten sturen</li>
      <li>Antwoorden op berichten die je ons stuurt</li>
    </ul>
    <h2>Delen met anderen</h2>
    <p>We delen je gegevens niet met derden voor marketing. Deze verwerkers draaien de dienst. Ze verwerken alleen in onze opdracht en volgens de AVG:</p>
    <ul>
      <li><strong>Neon (database)</strong> — account, schema’s, activiteiten en gezinsgegevens</li>
      <li><strong>Eigen hosting (VPS in de EU/EER)</strong> — de webapp en de API</li>
      <li><strong>Resend (e-mail)</strong> — transactiemail, zoals verificatie, wachtwoord en welkomstmail</li>
      <li><strong>Cloudflare R2</strong> — geüploade profielfoto’s als je die functie gebruikt</li>
      <li><strong>Apple en Google</strong> — aanmelden en pushberichten via APNs en FCM als je die functies gebruikt</li>
    </ul>
    <h2>Verslag voor een gesprek</h2>
    <p>Als je als verzorger een tijdelijke link maakt naar een samenvatting van gekozen activiteit- en beloningscijfers, kun je die delen met bijvoorbeeld een leerkracht of therapeut. Dat gebeurt alleen omdat jij het kiest. Jij bepaalt wat erin staat en je kunt de link intrekken. De ontvanger heeft geen account nodig.</p>
    <p>Bescherm je een link met een code, deel die code dan niet in hetzelfde bericht als de link.</p>
    <h2>Aanmelden via Apple of Google</h2>
    <ul>
      <li><strong>Aanmelden met Apple:</strong> we verwerken naam en e-mailadres. Kies je “Verberg mijn e-mail”, dan bewaren we het unieke relay-adres dat Apple aanmaakt, zodat we accountberichten kunnen sturen.</li>
      <li><strong>Aanmelden met Google:</strong> we ontvangen en bewaren het e-mailadres en de naam van het Google-account om het profiel aan te maken.</li>
    </ul>
    <p>Voor de verwerking door Apple en Google zelf gelden hun eigen privacyverklaringen.</p>
    <h2>Pushberichten en apparaattokens</h2>
    <p>Zet je pushberichten aan, dan bewaren we een uniek apparaattoken (APNs of FCM) op basis van je toestemming, zodat het bericht op het juiste apparaat aankomt. Het token hangt aan je account.</p>
    <p>Tokens vervallen bij uitloggen, of als het platform het token ongeldig meldt. We bewaren geen apparaatkenmerk zonder een actief pushabonnement. Uitzetten doe je via instellingen in de app of via het apparaat.</p>
    <h2>Bewaartermijn</h2>
    <p>We bewaren gegevens zolang het account actief is. Verwijder je het account, dan worden alle gegevens meteen en blijvend gewist.</p>
    <h2>Account verwijderen</h2>
    <p>Je verwijdert het account in de app via instellingen. Je bevestigt met je wachtwoord, of via de aanmelding van derden.</p>
    <p>Dit kan niet ongedaan worden gemaakt. Weg zijn dan het ouderaccount, de kindprofielen, schema’s, daglogs, beoordelingen, beloningen en uitnodigingen.</p>
    <h2>Opslag en beveiliging</h2>
    <p>We streven ernaar kerngegevens in de EU/EER op te slaan waar dat geldt. Sommige leveranciers kunnen buiten de EER verwerken. Doorgifte en waarborgen staan in deze verklaring en worden lopend bekeken. Verbindingen zijn versleuteld (HTTPS). Wachtwoorden staan niet in leesbare tekst. We gebruiken bcrypt.</p>
    <h2>Cookies</h2>
    <ul>
      <li><strong>Strikt noodzakelijke cookies</strong> — altijd aan. Sessie en CSRF-bescherming voor veilig aanmelden.</li>
      <li><strong>Voorkeuren</strong> — lokaal opgeslagen, bijvoorbeeld een thema.</li>
      <li><strong>Statistiek en marketing</strong> — Google Analytics 4, Meta Pixel en Google Ads. Standaard uit, tot je toestemt via de cookiebanner.</li>
    </ul>
    <p>Je keuze bewaren we maximaal een jaar. Je kunt hem wijzigen via de banner of via instellingen. Routinegegevens van kinderen gaan niet naar advertentieplatformen.</p>
    <h2>Je rechten (AVG)</h2>
    <ul>
      <li>Recht om je account en de gegevens te wissen</li>
      <li>Recht op inzage</li>
      <li>Recht om onjuiste gegevens te laten verbeteren</li>
      <li>Recht van bezwaar of op beperking</li>
      <li>Recht om een klacht in te dienen bij de Zweedse toezichthouder Integritetsskyddsmyndigheten (IMY) als je vindt dat we de AVG schenden</li>
    </ul>
    <h2>Contact</h2>
    <p>Vragen over deze verwerking? Gebruik het <a href="/en/contact">contactformulier</a>.</p>
  `;
  const terms = `
    <p class="updated">Laatst bijgewerkt: oktober 2026</p>
    <p>Bedankt dat je My Starday gebruikt. Deze voorwaarden zijn bedoeld om helder en eerlijk te zijn. Vragen stel je via het <a href="/en/contact">contactformulier</a>.</p>
    <h2>1. Over de dienst</h2>
    <p>My Starday is een digitale dienst voor gezinnen die een gestructureerd dagschema willen, de voortgang van een kind met sterren willen markeren, en het kind activiteiten willen laten volgen in een eigen weergave. De dienst is voor ouders en verzorgers en hun kinderen. Een gezin heeft minstens één volwassene met een account. Kinderen melden zich aan met een pincode in de kindweergave.</p>
    <h2>2. Account en veiligheid</h2>
    <ul>
      <li>Kies een sterk wachtwoord en deel het niet</li>
      <li>Bescherm je e-mailadres. Daarmee herstel je de toegang</li>
      <li>De pincode van de kindweergave is alleen voor het kind en de verzorgers</li>
      <li>Gebruik de app niet op een manier die de Zweedse wet overtreedt</li>
    </ul>
    <p>Je bent verantwoordelijk voor alles wat er onder je account gebeurt, ook als iemand anders hem gebruikt. Vermoed je misbruik, neem dan meteen contact op.</p>
    <h2>3. Kinderen en persoonsgegevens</h2>
    <p>My Starday verwerkt gegevens over kinderen. We volgen de AVG en het beginsel van dataminimalisatie:</p>
    <ul>
      <li>Kinderen zijn herkenbaar aan een voornaam en een gekozen emoji. Geen achternaam, persoonsnummer of contactgegevens</li>
      <li>Ouders of verzorgers registreren de gegevens en keuren delen goed</li>
      <li>We gebruiken gegevens van kinderen niet voor marketing, en niet voor iets anders dan de dienst</li>
      <li>Verslagen en schema’s worden alleen gedeeld als een ouder zelf een tijdelijke link deelt</li>
    </ul>
    <h2>4. Inhoud die je aanmaakt</h2>
    <p>Schema’s, beloningen, activiteiten en observaties die je toevoegt, zijn van jou of je gezin. Je geeft ons het recht die inhoud op te slaan en te tonen zolang het account actief is. We kopiëren hem niet, verkopen hem niet en gebruiken hem niet in marketing.</p>
    <h2>5. Gebruik</h2>
    <p>De dienst is voor persoonlijk gebruik in je gezin. Niet toegestaan is:</p>
    <ul>
      <li>Commercieel gebruik zonder afspraak met Papa Bravo AB</li>
      <li>Schema’s, sterren of beloningen manipuleren buiten de gewone stromen van de app</li>
      <li>Geautomatiseerde middelen, scrapers of bots tegen de dienst</li>
      <li>Inhoud publiceren die illegaal, beledigend of schadelijk is</li>
    </ul>
    <h2>6. Beëindigen en wissen</h2>
    <p>Je kunt het account op elk moment blijvend wissen via instellingen in de app, bevestigd met je wachtwoord.</p>
    <p>Wissen verwijdert meteen en blijvend het ouderaccount, alle kinderen, schema’s, activiteitenlogs, sterren, beloningen en eventuele observaties.</p>
    <p>We kunnen een account schorsen dat deze voorwaarden of de Zweedse wet overtreedt.</p>
    <h2>7. Prijs</h2>
    <p>Gezinnen in Ierland en Canada kunnen My Starday gratis gebruiken tot en met 31 december 2026. In die periode is geen betaling nodig. De gratisperiode wordt niet automatisch een abonnement. Vanaf 1 januari 2027 kun je een abonnement kiezen in de App Store of Google Play. Op deze pagina is geen webkassa. In andere landen geldt de prijs en de toegang die de app voor dat land toont. Zweedse gezinnen die starten vanaf 3 oktober 2026 kunnen de app 14 dagen proberen en daarna kiezen voor 59 Zweedse kronen per maand of 590 Zweedse kronen per jaar in de app. Gezinnen die al een account hebben, houden hun bestaande aanbod.</p>
    <h2>8. Wijzigingen</h2>
    <p>We kunnen deze voorwaarden aanpassen, bijvoorbeeld na een wetswijziging, een nieuwe functie of een verduidelijking. Is een wijziging wezenlijk, dan laten we dat weten per e-mail of met een melding in de app.</p>
    <p>Blijf je de dienst daarna gebruiken, dan geldt dat als aanvaarding van de nieuwe voorwaarden.</p>
    <h2>9. Aansprakelijkheid</h2>
    <p>My Starday wordt geleverd zoals hij is. We doen ons best om de dienst stabiel en veilig te houden, maar we kunnen niet garanderen dat hij altijd zonder onderbreking beschikbaar is.</p>
    <p>Papa Bravo AB is niet aansprakelijk voor:</p>
    <ul>
      <li>Gegevensverlies door overmacht</li>
      <li>Schade doordat je een pincode of aanmeldgegevens deelt met iemand die ze niet hoort te hebben</li>
      <li>Indirecte schade, gemiste kans of verloren gegevens, tenzij de Zweedse wet iets anders eist</li>
    </ul>
    <p>Je bent verantwoordelijk voor gebruik volgens deze voorwaarden en de Zweedse wet.</p>
    <h2>10. Contact</h2>
    <p>Vragen over deze voorwaarden of de dienst? Gebruik het <a href="/en/contact">contactformulier</a>.</p>
  `;
  return {
    privacy: {
      title: 'Privacyverklaring — My Starday',
      description: 'Welke gegevens My Starday verwerkt, wat we niet verzamelen, en welke rechten je hebt onder de AVG.',
      h1: 'Privacyverklaring voor My Starday',
      ogTitle: 'Privacyverklaring',
      body: privacy,
    },
    terms: {
      title: 'Voorwaarden — My Starday',
      description: 'De voorwaarden voor het gebruik van My Starday: account, kinderen, prijs en aansprakelijkheid.',
      h1: 'Voorwaarden',
      ogTitle: 'Voorwaarden',
      body: terms,
    },
  };
}

function nlOpenMarketPage(code) {
  if (code === 'NL') return nlMarketPage();
  const facts = marketCommercialFacts(code);
  const market = marketByCode(code);
  const label = (market.labels && market.labels.nl) || market.nativeName;
  const play = playUrlForMarket(market);
  const gateDefault = facts.registrationOpenByDefault;
  const registration = gateDefault
    ? `Nieuwe registratie in ${label} volgt de bestaande marktpoort.`
    : `Nieuwe accounts in ${label} staan standaard niet open. Dat volgt de bestaande EU-marktpoort, niet deze pagina.`;
  const commercial = facts.complimentary
    ? 'Voor dit land geldt de bestaande gratisperiode.'
    : `Als een account hier later mogelijk wordt, geldt de bestaande regel voor landen buiten Zweden, Ierland en Canada: een proefperiode van ${facts.trialDays} dagen. Betalen moet beschikbaar zijn voordat een account kan worden aangemaakt. Er is geen gratisperiode tot en met 31 december 2026, en er wordt niets automatisch een abonnement.`;
  const playHtml = play
    ? `<a href="${String(play).replace(/&/g, '&amp;')}" data-track="play_store_click" data-store-cta="play" data-market="${market.code}" data-store-placement="hero">Google Play</a>`
    : '<span role="status">Google Play is hier niet als aparte landingspagina geopend.</span>';
  return Object.freeze({
    title: `My Starday in ${label} — visuele schema’s voor kinderen`,
    description: `De pagina voor ${label}. Visuele schema’s in het Nederlands. Dit is een marktpagina, niet een aparte taalsite.`,
    h1: `Visuele schema’s voor gezinnen in ${label}`,
    ogTitle: `My Starday in ${label}`,
    marketCode: market.code,
    body: `
      <p class="lead">Dit is de pagina voor ${label}. De Nederlandstalige site zelf blijft een taalsite.</p>
      <p>${registration} De standaard is ${gateDefault ? 'open' : 'dicht'}.</p>
      <p>${commercial}</p>
      <p>De App Store-knop opent de algemene vermelding, niet een verzonnen productpagina voor ${label}. My Starday is een visueel schema voor de dag. Het is geen behandeling en het belooft geen medisch resultaat.</p>
      <p>
        <a href="${market.appleUrl}" data-track="app_store_click" data-market="${market.code}" data-store-placement="hero">App Store</a>
        ${playHtml}
      </p>
      <p><a href="/en/register" data-market="${market.code}">Account aanmaken</a></p>
      <p>Het formulier vraagt waar het gezin woont. Deze link zet zelf geen land en geen prijs.</p>
      <p><a href="${href('howItWorks')}">Zo werkt het</a></p>
    `,
  });
}

function pageFor(key) {
  if (key === 'privacy' || key === 'terms') return legalPages()[key];
  if (key === 'market-nl') return nlMarketPage();
  if (key && key.startsWith('market-')) {
    const segment = key.slice('market-'.length);
    const market = marketByCode(segment);
    if (market && market.campaignLocales.includes('nl')) return nlOpenMarketPage(market.code);
  }
  return PAGES[key] || null;
}

module.exports = {
  PAGES,
  pageFor,
  nlMarketPage,
  nlOpenMarketPage,
  legalPages,
};
