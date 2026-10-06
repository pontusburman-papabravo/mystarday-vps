'use strict';

/**
 * Danish public pages. Written in Danish.
 * Legal text translates the verified baseline. It adds no Danish statute.
 */

const { composeLocale, faq } = require('../compose-pages');

const pageFor = composeLocale('da', {
  marker: /barn/i,
  market: {
    title: (name) => `My Starday i ${name} — visuelle dagsplaner for børn`,
    description: (name) => `Markedsiden for ${name}. Visuelle dagsplaner på dansk. Det er en markedsside, ikke et eget sprogsite.`,
    h1: (name) => `Visuelle dagsplaner for familier i ${name}`,
    lead: (name) => `Dette er siden for ${name}. Det dansksprogede site forbliver et sprogsite.`,
    registrationOpen: (name) => `Nye konti i ${name} følger den eksisterende registrering. Standardindstillingen er åben.`,
    registrationClosed: (name) => `Nye konti i ${name} er som standard ikke åbne. Det følger den eksisterende registrering, ikke denne side. Standardindstillingen er lukket.`,
    complimentary: (name) => `For ${name} gælder den eksisterende gratis periode. Den bliver ikke af sig selv til et abonnement. Denne side sætter ingen pris.`,
    introYear: (name) => `${name} beholder det tilbud, der allerede står på det svenske site. Denne side sætter ingen pris. På dette marked er der ingen gratis periode frem til den 31. december 2026.`,
    trial: (name, days) => `Hvis en konto her senere bliver mulig, gælder den eksisterende regel uden for Sverige, Irland og Canada: en prøveperiode på ${days} dage. Betaling skal være tilgængelig først. På dette marked er der ingen gratis periode frem til den 31. december 2026, og intet bliver af sig selv til et abonnement. Denne side sætter ingen pris.`,
    notTreatment: (name) => `Knappen åbner den almindelige App Store-side, ikke en opfundet produktside for ${name}. My Starday er en visuel dagsplan. Det er ikke en behandling og lover ikke et medicinsk resultat.`,
    register: 'Opret konto',
    registerNote: 'Formularen spørger, hvor familien bor. Dette link sætter selv intet land og ingen pris.',
    how: 'Sådan virker det',
    playSoon: 'Google Play er ikke åbnet som en egen side her.',
  },
  home: {
    title: 'Visuel dagsplan for børn – rutiner, belønninger og piktogrammer | My Starday',
    description: 'Visuelle dagsplaner og rutiner, der viser et barn, hvad der sker nu, og hvad der kommer bagefter. Piktogrammer, en egen børnevisning og stjerner for færdige skridt.',
    h1: 'Visuelle dagsplaner og rutiner, der viser et barn, hvad der sker nu, og hvad der kommer bagefter.',
    ogTitle: 'Visuel dagsplan for børn',
    faqs: [
      faq('Hvad er My Starday?', 'En visuel dagsplan for familier. Barnet ser næste skridt. Den voksne beholder indstillingerne.'),
      faq('Kan man købe stjerner?', 'Nej. Stjerner gives for et færdigt skridt. De kan ikke købes.'),
      faq('Er det en behandling?', 'Nej. My Starday er hjælp i hverdagen og lover ikke et medicinsk resultat.'),
    ],
    lead: 'Et barn falder til ro, når næste skridt er synligt. My Starday viser dagen i billeder: nu, bagefter, færdig.',
    hSee: 'Hvad barnet ser',
    see: 'Børnevisningen viser ét skridt ad gangen. Den voksne lægger planen. Barnet krydser af. Flere børn kan dele samme husstand, hver med sin egen plan.',
    hStars: 'Stjerner',
    stars: 'Et færdigt skridt kan give en stjerne. Stjerner kan ikke købes. De erstatter ikke en aftale, I har truffet på forhånd. Mere står i',
    starsLink: 'belønningssystemet',
    hTreat: 'Ingen behandling',
    treat: 'Planen kan hjælpe et barn, der har brug for mere overblik, også ved ADHD eller autisme, og lige så familier uden en diagnose. My Starday er ikke en behandling og lover ikke et bestemt resultat.',
    marketsIntro: 'Det dansksprogede site forklarer produktet. Landet er noget andet. En egen side findes for',
    linkHow: 'Sådan virker det',
    linkVisual: 'Visuel dagsplan',
    linkMorning: 'Morgenrutine',
  },
  howItWorks: {
    title: 'Sådan virker My Starday | Visuel dagsplan',
    description: 'Den voksne lægger dagen. Barnet ser næste skridt og krydser det af. Stjerner gives for færdige skridt, ikke til at købe.',
    h1: 'Sådan virker My Starday',
    ogTitle: 'Sådan virker det',
    faqs: [
      faq('Hvem sætter planen?', 'En voksen. Barnet ser børnevisningen og krydser skridt af.'),
      faq('Skal barnet have en e-mail?', 'Nej. Barnet logger ind med et navn og en PIN.'),
    ],
    lead: 'Tre ting bærer morgenen: en synlig plan, et barn der selv krydser af, og en voksen der beholder indstillingerne.',
    hPlan: '1. Planen',
    plan: 'I lægger aktiviteterne i den rækkefølge, morgenen faktisk har. Billeder hjælper, når barnet endnu ikke læser.',
    planLink: 'Den visuelle dagsplan viser nu og bagefter',
    hChild: '2. Børnevisningen',
    child: 'Barnet ser næste skridt, ikke familiens indstillinger. Der er ingen reklame og intet socialt netværk.',
    hStar: '3. Stjernen',
    star: 'Et afsluttet skridt kan give en stjerne. Stjernen kan ikke købes. Aftalen står fast på forhånd, ikke midt i opstandelsen.',
    closing: 'My Starday er hjælp i hverdagen. Det er ikke en behandling og erstatter ikke råd fra læge, terapeut eller skole.',
  },
  visualSchedule: {
    title: 'Visuel dagsplan for børn | My Starday',
    description: 'En visuel dagsplan viser et barn, hvad der sker nu, og hvad der kommer bagefter. Få skridt, kendte billeder, en tydelig rækkefølge.',
    h1: 'Visuel dagsplan for børn',
    ogTitle: 'Visuel dagsplan',
    faqs: [
      faq('Hvor mange skridt?', 'Ofte er fire eller fem nok. En længere liste dur, når rækkefølgen allerede er kendt.'),
      faq('Fotos eller symboler?', 'Billeder, barnet allerede kender. Fotos hjemmefra virker godt.'),
    ],
    lead: 'En visuel dagsplan gør rækkefølgen synlig. Barnet skal ikke gætte, hvad der kommer bagefter.',
    hNow: 'Nu og bagefter',
    now: 'Vis kun det aktuelle skridt og det næste. En lang liste på væggen hjælper mindre end et tydeligt næste greb.',
    hStuck: 'Når et skridt går i stå',
    stuck1: 'Del skridtet. „Tage tøj på“ bliver sokker, bukser, trøje.',
    stuck2: 'Ét ad gangen.',
    stuck3: 'Vis i stedet for at gentage.',
    bridge: 'Om morgenen står',
    morningLink: 'morgenrutinen',
    weekLink: 'Ugeplanen viser, hvilken dag det er',
    closing: 'My Starday er ikke en behandling og lover ikke et medicinsk resultat.',
  },
  morningRoutine: {
    title: 'Morgenrutine for børn | My Starday',
    description: 'En morgenrutine med billeder sænker antallet af mundtlige påmindelser. Samme rækkefølge, dag efter dag.',
    h1: 'Morgenrutine for børn',
    ogTitle: 'Morgenrutine',
    faqs: [
      faq('Hvad hører til om morgenen?', 'Kun det, der virkelig sker, før I går ud. Stå op, tage tøj på, spise, tænder, jakke.'),
      faq('Hvad hvis tiden er knap?', 'Kort listen i stedet for at tale hurtigere. En kortere plan er en rigtig plan.'),
    ],
    lead: 'Den samme rækkefølge gør en liste til en vane. I stedet for at sige „børst tænder“ endnu en gang kigger I på næste billede.',
    hExample: 'Eksempel',
    steps: [
      'Stå op',
      'Toilet og vaske hænder',
      'Tage tøj på',
      'Morgenmad',
      'Børste tænder',
      'Jakke, sko, taske',
    ],
    age: 'Et barn i børnehavealderen klarer sig ofte bedre med fire eller fem skridt.',
    bridge: 'Familier, der søger mere hold ved overgange, kan læse',
    bridgeLink: 'guiden om overblik',
    closing: 'My Starday er støtte i dagen, ikke en behandling.',
  },
  weeklySchedule: {
    title: 'Ugeplan med piktogrammer for børn | My Starday',
    description: 'En ugeplan med piktogrammer viser, hvilken dag det er, ikke kun hvad der sker lige nu.',
    h1: 'Ugeplan med piktogrammer',
    ogTitle: 'Ugeplan med piktogrammer',
    faqs: [
      faq('Hvad er forskellen på dagsplanen?', 'Dagsplanen er dagens skridt. Ugeplanen viser, hvordan dagene adskiller sig.'),
      faq('Fra hvilken alder?', 'Ofte omkring skolestart, når ugen skifter mere. Et yngre barn har først brug for dagen i dag.'),
    ],
    lead: 'En ugeplan hjælper, når hverdag og weekend er forskellige, eller når „hvad er der i morgen?“ skal have et svar før sengetid.',
    mid: 'Mandag med sport, onsdag hos den anden forælder, fredag med en film. Billeder gør det synligt, før et barn kan læse en kalender.',
    dayLink: 'Dagsplanen',
    dayRest: 'bliver dagens skridt. Ugeplanen siger, hvilken dag det er.',
    closing: 'My Starday lover ikke et medicinsk resultat.',
  },
  neurodiverseRoutines: {
    title: 'Rutiner for neurodiverse børn | My Starday',
    description: 'Mere overblik i dagen for et barn, der har brug for tydelige overgange. My Starday er hverdagshjælp, ikke behandling og ikke en diagnose.',
    h1: 'Rutiner for neurodiverse børn',
    ogTitle: 'Rutiner for neurodiverse børn',
    faqs: [
      faq('Er det kun til en diagnose?', 'Nej. Planen hjælper, hvor der er brug for mere overblik. En diagnose er ikke et krav.'),
      faq('Erstatter det terapi?', 'Nej. Det er ikke en behandling og erstatter ikke råd fra fagfolk.'),
    ],
    lead: 'Et barn kan have brug for, at næste skridt er synligt, ikke forklaret højere. Det gælder med og uden diagnose.',
    hAdhd: 'ADHD: komme i gang og blive ved skridtet',
    adhd: 'Skiftet går ofte i stå, fordi næste skridt ikke er til at se. En plan med flueben giver straks besked: dette skridt er færdigt.',
    hAutism: 'Autisme: forudsigelighed',
    autism: 'En anden rækkefølge kan fylde meget. En',
    weekLink: 'ugeplan',
    autismRest: 'viser på forhånd, hvilken dag der kommer. Et streget skridt skal ændres synligt, ikke forsvinde i stilhed.',
    closing: 'My Starday er hjælp til hverdagen. Det er ikke medicinsk behandling og erstatter ikke råd fra læge, ergoterapeut, logopæd eller skole. Kort i betydningen først, så og færdig findes endnu ikke som dansk PDF. Sådanne kort er inspireret, ikke en officiel metode og ikke en certificering.',
  },
  rewardSystem: {
    title: 'Belønningssystem for børn | My Starday',
    description: 'En belønning, I aftaler på forhånd, er noget andet end en handel i øjeblikket. Barnet gør sig fortjent til stjerner. De kan ikke købes.',
    h1: 'Belønningssystem for børn, uden at gøre det til en handel',
    ogTitle: 'Belønningssystem for børn',
    faqs: [
      faq('Er et stjernekort bestikkelse?', 'Ikke når belønningen står fast på forhånd og hænger på noget, barnet kan gøre. En handel tilbydes i øjeblikket for at stoppe noget.'),
      faq('Hvor mange stjerner?', 'Begynd med én stjerne pr. færdigt skridt. Stjerner kan ikke købes.'),
    ],
    lead: '„Er det ikke bare bestikkelse?“ afhænger af, hvornår I laver aftalen. Aftalt på forhånd kan et kort støtte en vane. Midt i vreden bliver det til forhandling.',
    planLink: 'Den visuelle dagsplan',
    chain: 'har en enkel kæde: se skridtet, gøre det, krydse af, få en stjerne.',
    steps: [
      'Vær konkrete. Beløn „børster tænder uden påmindelse“, ikke „er sød“.',
      'Vis fremskridtet.',
      'Tæl forsøget, ikke kun den perfekte morgen.',
      'Lad barnet være med til at tænke over belønningen.',
      'Tynd stjernerne ud, når vanen sidder.',
    ],
    closing: 'Stjerner kan ikke købes. My Starday lover ikke et medicinsk resultat.',
  },
  resources: {
    title: 'Materialer til visuelle rutiner | My Starday',
    description: 'Hvad der allerede findes på dansk, og hvad der endnu ikke findes som PDF. Appen og et trykt ark er to forskellige ting.',
    h1: 'Materialer',
    ogTitle: 'Materialer',
    faqs: [
      faq('Findes der danske PDF-filer?', 'Ikke endnu. Denne side sælger ikke svenske ark som en dansk oversættelse.'),
    ],
    lead: 'Appen viser dagen på skærmen. Et trykt ark er noget andet. Danske PDF-filer findes ikke her endnu.',
    app: 'I appen lægger I',
    dayLink: 'dagsplanen',
    morningLink: 'morgenrutinen',
    weekLink: 'ugeplanen',
    appRest: 'Barnet ser den samme rækkefølge i børnevisningen.',
    nolink: 'Vi linker ikke til et bibliotek på et andet sprog, som om det var dansk. Når danske ark kommer til, står de på denne side.',
  },
  faq: {
    title: 'Ofte stillede spørgsmål | My Starday',
    description: 'Korte svar om dagsplan, stjerner, børnevisning, prislogik og om, hvad My Starday ikke er.',
    h1: 'Ofte stillede spørgsmål',
    ogTitle: 'Ofte stillede spørgsmål',
    faqs: [
      faq('Hvem er sitet til?', 'Det dansksprogede site forklarer produktet. Danmark har sin egen markedsside. Sproget forbliver dansk.'),
      faq('Kan jeg købe stjerner?', 'Nej.'),
      faq('Er det en terapi-app?', 'Nej. Ingen behandling, intet lovet medicinsk resultat.'),
      faq('Hvor opretter jeg en konto?', 'Via den eksisterende formular. Den spørger, hvor familien bor. En markedsside sætter ikke selv landet.'),
    ],
    lead: 'De korte svar. Længere tekster står i guiderne.',
    hLang: 'Sprog og land',
    lang: 'Dette site er på dansk. Landet vælger I for sig. En markedsside ændrer ikke sproget og opretter ikke en konto.',
    hChild: 'Barnet',
    child: 'Barnet ser planen og krydser af. Indstillinger, invitationer og kontoen bliver hos den voksne. Mere står under',
    howLink: 'Sådan virker det',
    hStars: 'Stjerner',
    stars: 'Stjerner gives for færdige skridt. De kan ikke købes. Læs',
    starsLink: 'belønningssystemet',
  },
  privacy: {
    title: 'Privatlivspolitik — My Starday',
    description: 'Hvilke data My Starday behandler, hvad vi ikke indsamler, og hvilke rettigheder GDPR giver.',
    h1: 'Privatlivspolitik for My Starday',
    ogTitle: 'Privatlivspolitik',
    body: `
      <p class="updated">Sidst opdateret: oktober 2026</p>
      <p>Vi passer på dit privatliv. My Starday indsamler så lidt som muligt: kun det, appen skal bruge for at virke. Vi sælger ikke dine data og bruger dem ikke til målrettet reklame. Videregivelse uden for tjenesten sker kun, når du selv vælger det, eller når det er nødvendigt, for at vores databehandlere kan drive tjenesten.</p>
      <p><strong>Dataansvarlig:</strong> Papa Bravo AB er ansvarlig for behandlingen af dine personoplysninger. Du når os via <a href="/en/contact">kontaktformularen</a>.</p>
      <h2>Hvad vi indsamler</h2>
      <p>Vi behandler data på grundlag af aftalen, så vi kan levere appen og de funktioner, du tilmelder dig. Om voksne og familier indsamler vi:</p>
      <ul>
        <li><strong>E-mailadresse</strong> — til login og beskeder om kontoen</li>
        <li><strong>For- og efternavn</strong> — for at genkende kontoen</li>
        <li><strong>Aktivitetslog</strong> — hvilke aktiviteter der blev færdige, og hvornår</li>
        <li><strong>Stjerner</strong> — optjente og indløste stjerner</li>
        <li><strong>Planer og aktiviteter</strong> — det, du selv opretter</li>
      </ul>
      <p><strong>Et barns privatliv:</strong> et barn kendes kun på et fornavn eller et kaldenavn og en valgt emoji. Vi indsamler ikke efternavn, personnummer eller kontaktoplysninger for et barn.</p>
      <h2>Hvad vi ikke indsamler</h2>
      <ul>
        <li>Ingen efternavne på børn</li>
        <li>Ingen personnumre, hverken for voksne eller børn</li>
        <li>Ingen oplysninger om et barns helbred, diagnose eller funktionsnedsættelse</li>
        <li>Ingen betalingsdata. Køb sker via App Store eller Google Play</li>
        <li>Ingen lokalitetsdata</li>
      </ul>
      <h2>Hvad vi bruger data til</h2>
      <ul>
        <li>Vise barnet dagsplanen</li>
        <li>Gemme fremskridt og stjerner</li>
        <li>Sende bekræftelsesmail og kontobeskeder</li>
        <li>Svare på beskeder, du sender os</li>
      </ul>
      <h2>Videregivelse</h2>
      <p>Vi giver ikke dine data videre til reklameformål. Disse databehandlere driver tjenesten. De behandler kun efter vores instruks og efter GDPR:</p>
      <ul>
        <li><strong>Neon (database)</strong> — konto, planer, aktiviteter og familiedata</li>
        <li><strong>Egen hosting (VPS i EU/EØS)</strong> — webappen og API'et</li>
        <li><strong>Resend (e-mail)</strong> — transaktionsmail, for eksempel bekræftelse, adgangskode og velkomstmail</li>
        <li><strong>Cloudflare R2</strong> — uploadede profilbilleder, når du bruger den funktion</li>
        <li><strong>Apple og Google</strong> — login og push-beskeder via APNs og FCM, når du bruger de funktioner</li>
      </ul>
      <h2>Rapport til en samtale</h2>
      <p>Når du som forælder opretter et tidsbegrænset link til et uddrag af udvalgte aktivitets- og belønningstal, kan du dele det, for eksempel med en lærer eller en behandler. Det sker kun, fordi du vælger det. Du bestemmer indholdet og kan tilbagekalde linket. Modtageren behøver ingen konto.</p>
      <p>Beskytter du et link med en kode, så del ikke koden i samme besked som linket.</p>
      <h2>Login via Apple eller Google</h2>
      <ul>
        <li><strong>Login med Apple:</strong> vi behandler navn og e-mailadresse. Vælger du at skjule e-mailen, gemmer vi den unikke videresendelsesadresse, Apple opretter, så vi kan sende kontobeskeder.</li>
        <li><strong>Login med Google:</strong> vi modtager og gemmer e-mailadressen og navnet på Google-kontoen for at oprette profilen.</li>
      </ul>
      <p>Apples og Googles egen behandling følger deres egne privatlivspolitikker.</p>
      <h2>Push-beskeder og enhedstoken</h2>
      <p>Slår du push-beskeder til, gemmer vi på grundlag af dit samtykke et unikt enhedstoken (APNs eller FCM), så beskeden når den rigtige enhed. Tokenet hænger på din konto.</p>
      <p>Token udløber ved logout, eller når platformen melder tokenet ugyldigt. Vi gemmer ikke et enhedskendetegn uden et aktivt push-abonnement. Du slår det fra i appens indstillinger eller på enheden.</p>
      <h2>Opbevaring</h2>
      <p>Vi gemmer data, så længe kontoen er aktiv. Sletter du kontoen, slettes alle data straks og varigt.</p>
      <h2>Slet konto</h2>
      <p>Du sletter kontoen i appen via indstillingerne. Du bekræfter med din adgangskode eller via tredjepartsloginnet.</p>
      <p>Det kan ikke fortrydes. Væk er så forældrekontoen, børneprofilerne, planer, dagslog, vurderinger, belønninger og invitationer.</p>
      <h2>Opbevaring og sikkerhed</h2>
      <p>Vi tilstræber at opbevare kernedata i EU/EØS, hvor det gælder. Nogle leverandører kan behandle uden for EØS. Overførsel og garantier står i denne tekst og gennemgås løbende. Forbindelser er krypterede (HTTPS). Adgangskoder står ikke i klartekst. Vi bruger bcrypt.</p>
      <h2>Cookies</h2>
      <ul>
        <li><strong>Strengt nødvendige cookies</strong> — altid slået til. Session og CSRF-beskyttelse til et sikkert login.</li>
        <li><strong>Indstillinger</strong> — gemt lokalt, for eksempel et tema.</li>
        <li><strong>Statistik og markedsføring</strong> — Google Analytics 4, Meta Pixel og Google Ads. Som standard slået fra, indtil du samtykker via cookie-beskeden.</li>
      </ul>
      <p>Dit valg gemmer vi højst ét år. Du kan ændre det via beskeden eller indstillingerne. Rutinedata om et barn sendes ikke til reklameplatforme.</p>
      <h2>Dine rettigheder (GDPR)</h2>
      <ul>
        <li>Ret til at slette din konto og data</li>
        <li>Ret til indsigt</li>
        <li>Ret til at få urigtige data rettet</li>
        <li>Ret til indsigelse eller begrænsning</li>
        <li>Ret til at klage til den svenske tilsynsmyndighed Integritetsskyddsmyndigheten (IMY), hvis du mener, at vi overtræder GDPR</li>
      </ul>
      <h2>Kontakt</h2>
      <p>Spørgsmål til denne behandling? Brug <a href="/en/contact">kontaktformularen</a>.</p>
    `,
  },
  terms: {
    title: 'Vilkår for brug — My Starday',
    description: 'Vilkårene for at bruge My Starday: konto, børn, pris og ansvar.',
    h1: 'Vilkår for brug',
    ogTitle: 'Vilkår for brug',
    body: `
      <p class="updated">Sidst opdateret: oktober 2026</p>
      <p>Tak, fordi du bruger My Starday. Disse vilkår skal være tydelige og ærlige. Spørgsmål stiller du via <a href="/en/contact">kontaktformularen</a>.</p>
      <h2>1. Om tjenesten</h2>
      <p>My Starday er en digital tjeneste til familier, der vil have en struktureret dagsplan, markere et barns fremskridt med stjerner og lade barnet følge aktiviteter i en egen visning. Tjenesten er til forældre og værger og deres børn. En familie har mindst én voksen med en konto. Et barn logger ind med en PIN i børnevisningen.</p>
      <h2>2. Konto og sikkerhed</h2>
      <ul>
        <li>Vælg en stærk adgangskode, og del den ikke</li>
        <li>Beskyt din e-mailadresse. Med den får du adgangen tilbage</li>
        <li>PIN-koden til børnevisningen er kun til barnet og værgerne</li>
        <li>Brug ikke appen på en måde, der strider mod svensk ret</li>
      </ul>
      <p>Du er ansvarlig for alt, der sker under din konto, også når en anden bruger den. Mistænker du misbrug, så tag straks kontakt.</p>
      <h2>3. Børn og personoplysninger</h2>
      <p>My Starday behandler oplysninger om børn. Vi følger GDPR og princippet om dataminimering:</p>
      <ul>
        <li>Et barn genkendes på et fornavn og en valgt emoji. Intet efternavn, intet personnummer, ingen kontaktoplysninger</li>
        <li>Forældre eller værger indtaster oplysningerne og samtykker til deling</li>
        <li>Vi bruger ikke data om børn til reklame og ikke til andet end tjenesten</li>
        <li>Rapporter og planer deles kun, når en voksen selv deler et tidsbegrænset link</li>
      </ul>
      <h2>4. Indhold, du opretter</h2>
      <p>Planer, belønninger, aktiviteter og observationer, du tilføjer, tilhører dig eller din familie. Du giver os ret til at gemme og vise det indhold, så længe kontoen er aktiv. Vi kopierer det ikke til reklame, sælger det ikke og bruger det ikke i markedsføring.</p>
      <h2>5. Brug</h2>
      <p>Tjenesten er til personlig brug i din familie. Ikke tilladt er:</p>
      <ul>
        <li>Erhvervsmæssig brug uden aftale med Papa Bravo AB</li>
        <li>At manipulere planer, stjerner eller belønninger uden for appens almindelige forløb</li>
        <li>Automatiserede midler, scrapere eller bots mod tjenesten</li>
        <li>At offentliggøre indhold, der er ulovligt, krænkende eller skadeligt</li>
      </ul>
      <h2>6. Ophør og sletning</h2>
      <p>Du kan når som helst slette kontoen varigt via indstillingerne i appen, bekræftet med din adgangskode.</p>
      <p>Sletningen fjerner straks og varigt forældrekontoen, alle børn, planer, aktivitetslogge, stjerner, belønninger og eventuelle observationer.</p>
      <p>Vi kan spærre en konto, der overtræder disse vilkår eller svensk ret.</p>
      <h2>7. Pris</h2>
      <p>Familier i Irland og Canada kan bruge My Starday gratis til og med den 31. december 2026. I den periode er ingen betaling nødvendig. Den gratis periode bliver ikke automatisk til et abonnement. Fra den 1. januar 2027 kan du vælge et abonnement i App Store eller på Google Play. På denne side er der ingen webkasse. I andre lande gælder den pris og den adgang, appen viser for det land. Svenske familier, der starter fra den 3. oktober 2026, kan prøve appen i 14 dage og derefter vælge 59 svenske kroner om måneden eller 590 svenske kroner om året i appen. Familier, der allerede har en konto, beholder deres eksisterende tilbud.</p>
      <h2>8. Ændringer</h2>
      <p>Vi kan tilpasse disse vilkår, for eksempel efter en lovændring, en ny funktion eller en præcisering. Er en ændring væsentlig, fortæller vi det på e-mail eller med en besked i appen.</p>
      <p>Bruger du tjenesten videre derefter, gælder det som accept af de nye vilkår.</p>
      <h2>9. Ansvar</h2>
      <p>My Starday leveres, som det er. Vi gør vores bedste for at holde tjenesten stabil og sikker, men kan ikke garantere, at den altid er tilgængelig uden afbrydelse.</p>
      <p>Papa Bravo AB hæfter ikke for:</p>
      <ul>
        <li>Datatab ved force majeure</li>
        <li>Skade, fordi du deler en PIN eller loginoplysninger med nogen, der ikke skal have dem</li>
        <li>Indirekte skade, tabt chance eller tabte data, medmindre svensk ret kræver andet</li>
      </ul>
      <p>Du er ansvarlig for en brug efter disse vilkår og efter svensk ret.</p>
      <h2>10. Kontakt</h2>
      <p>Spørgsmål til disse vilkår eller til tjenesten? Brug <a href="/en/contact">kontaktformularen</a>.</p>
    `,
  },
});

module.exports = { pageFor };
