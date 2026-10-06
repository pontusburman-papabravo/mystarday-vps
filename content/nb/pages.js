'use strict';

/**
 * Norwegian Bokmål public pages. Written in Norwegian Bokmål.
 * Legal text translates the verified baseline. It adds no Norwegian statute.
 */

const { composeLocale, faq } = require('../compose-pages');

const pageFor = composeLocale('nb', {
  marker: /barn/i,
  market: {
    title: (name) => `My Starday i ${name} — visuelle dagsplaner for barn`,
    description: (name) => `Markedssiden for ${name}. Visuelle dagsplaner på norsk. Dette er en markedsside, ikke et eget språksite.`,
    h1: (name) => `Visuelle dagsplaner for familier i ${name}`,
    lead: (name) => `Dette er siden for ${name}. Det norskspråklige nettstedet forblir et språksite.`,
    registrationOpen: (name) => `Nye kontoer i ${name} følger den eksisterende registreringen. Standardinnstillingen er åpen.`,
    registrationClosed: (name) => `Nye kontoer i ${name} er som standard ikke åpne. Det følger den eksisterende registreringen, ikke denne siden. Standardinnstillingen er stengt.`,
    complimentary: (name) => `For ${name} gjelder den eksisterende gratisperioden. Den blir ikke av seg selv til et abonnement. Denne siden setter ingen pris.`,
    introYear: (name) => `${name} beholder tilbudet som allerede står på det svenske nettstedet. Denne siden setter ingen pris. På dette markedet er det ingen gratisperiode frem til 31. desember 2026.`,
    trial: (name, days) => `Hvis en konto her senere blir mulig, gjelder den eksisterende regelen utenfor Sverige, Irland og Canada: en prøveperiode på ${days} dager. Betaling må være tilgjengelig først. På dette markedet er det ingen gratisperiode frem til 31. desember 2026, og ingenting blir av seg selv til et abonnement. Denne siden setter ingen pris.`,
    notTreatment: (name) => `Knappen åpner den vanlige App Store-siden, ikke en oppdiktet produktside for ${name}. My Starday er en visuell dagsplan. Det er ikke behandling og lover ikke et medisinsk resultat.`,
    register: 'Opprett konto',
    registerNote: 'Skjemaet spør hvor familien bor. Denne lenken setter selv verken land eller pris.',
    how: 'Slik virker det',
    playSoon: 'Google Play er ikke åpnet som en egen side her.',
  },
  home: {
    title: 'Visuell dagsplan for barn – rutiner, belønninger og piktogrammer | My Starday',
    description: 'Visuelle dagsplaner og rutiner som viser et barn hva som skjer nå, og hva som kommer etterpå. Piktogrammer, en egen barnevisning og stjerner for ferdige steg.',
    h1: 'Visuelle dagsplaner og rutiner som viser et barn hva som skjer nå, og hva som kommer etterpå.',
    ogTitle: 'Visuell dagsplan for barn',
    faqs: [
      faq('Hva er My Starday?', 'En visuell dagsplan for familier. Barnet ser neste steg. Den voksne beholder innstillingene.'),
      faq('Kan man kjøpe stjerner?', 'Nei. Stjerner gis for et ferdig steg. De kan ikke kjøpes.'),
      faq('Er det behandling?', 'Nei. My Starday er hjelp i hverdagen og lover ikke et medisinsk resultat.'),
    ],
    lead: 'Et barn roer seg når neste steg er synlig. My Starday viser dagen i bilder: nå, etterpå, ferdig.',
    hSee: 'Hva barnet ser',
    see: 'Barnevisningen viser ett steg om gangen. Den voksne lager planen. Barnet krysser av. Flere barn kan dele samme husholdning, hvert med sin egen plan.',
    hStars: 'Stjerner',
    stars: 'Et ferdig steg kan gi en stjerne. Stjerner kan ikke kjøpes. De erstatter ikke en avtale dere har gjort på forhånd. Mer står i',
    starsLink: 'belønningssystemet',
    hTreat: 'Ingen behandling',
    treat: 'Planen kan hjelpe et barn som trenger mer oversikt, også ved ADHD eller autisme, og like gjerne familier uten diagnose. My Starday er ikke behandling og lover ikke et bestemt resultat.',
    marketsIntro: 'Det norskspråklige nettstedet forklarer produktet. Landet er noe annet. En egen side finnes for',
    linkHow: 'Slik virker det',
    linkVisual: 'Visuell dagsplan',
    linkMorning: 'Morgenrutine',
  },
  howItWorks: {
    title: 'Slik virker My Starday | Visuell dagsplan',
    description: 'Den voksne legger dagen. Barnet ser neste steg og krysser det av. Stjerner gis for ferdige steg, ikke for å kjøpe.',
    h1: 'Slik virker My Starday',
    ogTitle: 'Slik virker det',
    faqs: [
      faq('Hvem setter planen?', 'En voksen. Barnet ser barnevisningen og krysser av steg.'),
      faq('Trenger barnet en e-post?', 'Nei. Barnet logger inn med et navn og en PIN.'),
    ],
    lead: 'Tre ting bærer morgenen: en synlig plan, et barn som selv krysser av, og en voksen som beholder innstillingene.',
    hPlan: '1. Planen',
    plan: 'Dere legger aktivitetene i den rekkefølgen morgenen faktisk har. Bilder hjelper når barnet ennå ikke leser.',
    planLink: 'Den visuelle dagsplanen viser nå og etterpå',
    hChild: '2. Barnevisningen',
    child: 'Barnet ser neste steg, ikke familiens innstillinger. Der er det ingen reklame og ikke noe sosialt nettverk.',
    hStar: '3. Stjernen',
    star: 'Et avsluttet steg kan gi en stjerne. Stjernen kan ikke kjøpes. Avtalen står fast på forhånd, ikke midt i oppstyret.',
    closing: 'My Starday er hjelp i hverdagen. Det er ikke behandling og erstatter ikke råd fra lege, terapeut eller skole.',
  },
  visualSchedule: {
    title: 'Visuell dagsplan for barn | My Starday',
    description: 'En visuell dagsplan viser et barn hva som skjer nå, og hva som kommer etterpå. Få steg, kjente bilder, en tydelig rekkefølge.',
    h1: 'Visuell dagsplan for barn',
    ogTitle: 'Visuell dagsplan',
    faqs: [
      faq('Hvor mange steg?', 'Ofte holder fire eller fem. En lengre liste går når rekkefølgen allerede er kjent.'),
      faq('Foto eller symboler?', 'Bilder barnet allerede kjenner. Foto hjemmefra virker godt.'),
    ],
    lead: 'En visuell dagsplan gjør rekkefølgen synlig. Barnet skal ikke gjette hva som kommer etterpå.',
    hNow: 'Nå og etterpå',
    now: 'Vis bare det gjeldende steget og det neste. En lang liste på veggen hjelper mindre enn et tydelig neste grep.',
    hStuck: 'Når et steg stopper',
    stuck1: 'Del steget. «Kle på seg» blir sokker, bukse, genser.',
    stuck2: 'Ett om gangen.',
    stuck3: 'Vis i stedet for å gjenta.',
    bridge: 'Om morgenen står',
    morningLink: 'morgenrutinen',
    weekLink: 'Ukeplanen viser hvilken dag det er',
    closing: 'My Starday er ikke behandling og lover ikke et medisinsk resultat.',
  },
  morningRoutine: {
    title: 'Morgenrutine for barn | My Starday',
    description: 'En morgenrutine med bilder senker antallet muntlige påminnelser. Samme rekkefølge, dag etter dag.',
    h1: 'Morgenrutine for barn',
    ogTitle: 'Morgenrutine',
    faqs: [
      faq('Hva hører til om morgenen?', 'Bare det som virkelig skjer før dere går ut. Stå opp, kle på, spise, tenner, jakke.'),
      faq('Hva hvis tiden er knapp?', 'Kort ned listen i stedet for å snakke fortere. En kortere plan er en ekte plan.'),
    ],
    lead: 'Den samme rekkefølgen gjør en liste til en vane. I stedet for å si «puss tennene» en gang til, ser dere på neste bilde.',
    hExample: 'Eksempel',
    steps: [
      'Stå opp',
      'Toalett og vaske hender',
      'Kle på seg',
      'Frokost',
      'Pusse tenner',
      'Jakke, sko, sekk',
    ],
    age: 'Mange barn i barnehagealder klarer seg bedre med fire eller fem steg.',
    bridge: 'Familier som søker mer støtte ved overganger, kan lese',
    bridgeLink: 'guiden om oversikt',
    closing: 'My Starday er støtte i dagen, ikke behandling.',
  },
  weeklySchedule: {
    title: 'Ukeplan med piktogrammer for barn | My Starday',
    description: 'En ukeplan med piktogrammer viser hvilken dag det er, ikke bare hva som skjer akkurat nå.',
    h1: 'Ukeplan med piktogrammer',
    ogTitle: 'Ukeplan med piktogrammer',
    faqs: [
      faq('Hva er forskjellen fra dagsplanen?', 'Dagsplanen er stegene i dag. Ukeplanen viser hvordan dagene skiller seg.'),
      faq('Fra hvilken alder?', 'Ofte rundt skolestart, når uken skifter mer. Et yngre barn trenger først dagen i dag.'),
    ],
    lead: 'En ukeplan hjelper når hverdag og helg er ulike, eller når «hva er det i morgen?» trenger et svar før leggetid.',
    mid: 'Mandag med idrett, onsdag hos den andre forelderen, fredag med en film. Bilder gjør det synlig før et barn kan lese en kalender.',
    dayLink: 'Dagsplanen',
    dayRest: 'er stegene i dag. Ukeplanen sier hvilken dag det er.',
    closing: 'My Starday lover ikke et medisinsk resultat.',
  },
  neurodiverseRoutines: {
    title: 'Rutiner for nevromangfoldige barn | My Starday',
    description: 'Mer oversikt i dagen for et barn som trenger tydelige overganger. My Starday er hverdagshjelp, ikke behandling og ikke en diagnose.',
    h1: 'Rutiner for nevromangfoldige barn',
    ogTitle: 'Rutiner for nevromangfoldige barn',
    faqs: [
      faq('Er det bare for en diagnose?', 'Nei. Planen hjelper der det trengs mer oversikt. En diagnose er ikke et krav.'),
      faq('Erstatter det terapi?', 'Nei. Det er ikke behandling og erstatter ikke råd fra fagfolk.'),
    ],
    lead: 'Noen barn trenger at neste steg er synlig, ikke forklart høyere. Det gjelder med og uten diagnose.',
    hAdhd: 'ADHD: komme i gang og bli ved steget',
    adhd: 'Skiftet stopper ofte fordi neste steg ikke er å se. En plan med hake gir straks beskjed: dette steget er ferdig.',
    hAutism: 'Autisme: forutsigbarhet',
    autism: 'En annen rekkefølge kan fylle mye. En',
    weekLink: 'ukeplan',
    autismRest: 'viser på forhånd hvilken dag som kommer. Et strøket steg skal endres synlig, ikke forsvinne i stillhet.',
    closing: 'My Starday er hjelp i hverdagen. Det er ikke medisinsk behandling og erstatter ikke råd fra lege, ergoterapeut, logoped eller skole. Kort i betydningen først, så og ferdig finnes ennå ikke som norsk PDF. Slike kort er inspirert, ikke en offisiell metode og ikke en sertifisering.',
  },
  rewardSystem: {
    title: 'Belønningssystem for barn | My Starday',
    description: 'En belønning dere avtaler på forhånd, er noe annet enn en handel i øyeblikket. Barnet gjør seg fortjent til stjerner. De kan ikke kjøpes.',
    h1: 'Belønningssystem for barn, uten å gjøre det til en handel',
    ogTitle: 'Belønningssystem for barn',
    faqs: [
      faq('Er et stjernekort bestikkelse?', 'Ikke når belønningen står fast på forhånd og henger på noe barnet kan gjøre. En handel tilbys i øyeblikket for å stoppe noe.'),
      faq('Hvor mange stjerner?', 'Begynn med én stjerne per ferdig steg. Stjerner kan ikke kjøpes.'),
    ],
    lead: '«Er ikke dette bare bestikkelse?» avhenger av når dere gjør avtalen. Avtalt på forhånd kan et kort støtte en vane. Midt i sinnet blir det til forhandling.',
    planLink: 'Den visuelle dagsplanen',
    chain: 'har en enkel kjede: se steget, gjøre det, krysse av, få en stjerne.',
    steps: [
      'Vær konkrete. Belønn «pusser tennene uten påminnelse», ikke «er snill».',
      'Vis fremgangen.',
      'Tell forsøket, ikke bare den perfekte morgenen.',
      'La barnet være med og tenke på belønningen.',
      'Tynn ut stjernene når vanen sitter.',
    ],
    closing: 'Stjerner kan ikke kjøpes. My Starday lover ikke et medisinsk resultat.',
  },
  resources: {
    title: 'Materiell til visuelle rutiner | My Starday',
    description: 'Hva som allerede finnes på norsk, og hva som ennå ikke finnes som PDF. Appen og et trykt ark er to forskjellige ting.',
    h1: 'Materiell',
    ogTitle: 'Materiell',
    faqs: [
      faq('Finnes det norske PDF-filer?', 'Ikke ennå. Denne siden selger ikke svenske ark som en norsk oversettelse.'),
    ],
    lead: 'Appen viser dagen på skjermen. Et trykt ark er noe annet. Norske PDF-filer finnes ikke her ennå.',
    app: 'I appen legger dere',
    dayLink: 'dagsplanen',
    morningLink: 'morgenrutinen',
    weekLink: 'ukeplanen',
    appRest: 'Barnet ser den samme rekkefølgen i barnevisningen.',
    nolink: 'Vi lenker ikke til et bibliotek på et annet språk som om det var norsk. Når norske ark kommer, står de på denne siden.',
  },
  faq: {
    title: 'Ofte stilte spørsmål | My Starday',
    description: 'Korte svar om dagsplan, stjerner, barnevisning, prislogikk og om hva My Starday ikke er.',
    h1: 'Ofte stilte spørsmål',
    ogTitle: 'Ofte stilte spørsmål',
    faqs: [
      faq('Hvem er nettstedet for?', 'Det norskspråklige nettstedet forklarer produktet. Norge har sin egen markedsside. Språket forblir norsk.'),
      faq('Kan jeg kjøpe stjerner?', 'Nei.'),
      faq('Er det en terapi-app?', 'Nei. Ingen behandling, ikke noe lovet medisinsk resultat.'),
      faq('Hvor oppretter jeg en konto?', 'Via det eksisterende skjemaet. Det spør hvor familien bor. En markedsside setter ikke landet selv.'),
    ],
    lead: 'De korte svarene. Lengre tekster står i guidene.',
    hLang: 'Språk og land',
    lang: 'Dette nettstedet er på norsk. Landet velger dere for seg. En markedsside endrer ikke språket og oppretter ikke en konto.',
    hChild: 'Barnet',
    child: 'Barnet ser planen og krysser av. Innstillinger, invitasjoner og kontoen blir hos den voksne. Mer står under',
    howLink: 'Slik virker det',
    hStars: 'Stjerner',
    stars: 'Stjerner gis for ferdige steg. De kan ikke kjøpes. Les',
    starsLink: 'belønningssystemet',
  },
  privacy: {
    title: 'Personvernerklæring — My Starday',
    description: 'Hvilke data My Starday behandler, hva vi ikke samler inn, og hvilke rettigheter GDPR gir.',
    h1: 'Personvernerklæring for My Starday',
    ogTitle: 'Personvernerklæring',
    body: `
      <p class="updated">Sist oppdatert: oktober 2026</p>
      <p>Vi passer på personvernet ditt. My Starday samler inn så lite som mulig: bare det appen trenger for å virke. Vi selger ikke dataene dine og bruker dem ikke til målrettet reklame. Videreformidling utenfor tjenesten skjer bare når du selv velger det, eller når det er nødvendig for at databehandlerne våre kan drive tjenesten.</p>
      <p><strong>Behandlingsansvarlig:</strong> Papa Bravo AB er ansvarlig for behandlingen av personopplysningene dine. Du når oss via <a href="/en/contact">kontaktskjemaet</a>.</p>
      <h2>Hva vi samler inn</h2>
      <p>Vi behandler data på grunnlag av avtalen, slik at vi kan levere appen og funksjonene du melder deg på. Om voksne og familier samler vi inn:</p>
      <ul>
        <li><strong>E-postadresse</strong> — til innlogging og meldinger om kontoen</li>
        <li><strong>For- og etternavn</strong> — for å kjenne igjen kontoen</li>
        <li><strong>Aktivitetslogg</strong> — hvilke aktiviteter som ble ferdige, og når</li>
        <li><strong>Stjerner</strong> — opptjente og innløste stjerner</li>
        <li><strong>Planer og aktiviteter</strong> — det du selv oppretter</li>
      </ul>
      <p><strong>Et barns personvern:</strong> et barn kjennes bare på et fornavn eller et kallenavn og en valgt emoji. Vi samler ikke inn etternavn, personnummer eller kontaktopplysninger for et barn.</p>
      <h2>Hva vi ikke samler inn</h2>
      <ul>
        <li>Ingen etternavn på barn</li>
        <li>Ingen personnumre, verken for voksne eller barn</li>
        <li>Ingen opplysninger om et barns helse, diagnose eller funksjonsnedsettelse</li>
        <li>Ingen betalingsdata. Kjøp skjer via App Store eller Google Play</li>
        <li>Ingen stedsdata</li>
      </ul>
      <h2>Hva vi bruker data til</h2>
      <ul>
        <li>Vise barnet dagsplanen</li>
        <li>Lagre fremgang og stjerner</li>
        <li>Sende bekreftelses-e-post og kontomeldinger</li>
        <li>Svare på meldinger du sender oss</li>
      </ul>
      <h2>Videreformidling</h2>
      <p>Vi gir ikke dataene dine videre til reklameformål. Disse databehandlerne driver tjenesten. De behandler bare etter vårt oppdrag og etter GDPR:</p>
      <ul>
        <li><strong>Neon (database)</strong> — konto, planer, aktiviteter og familiedata</li>
        <li><strong>Egen hosting (VPS i EU/EØS)</strong> — webappen og API-et</li>
        <li><strong>Resend (e-post)</strong> — transaksjonspost, for eksempel bekreftelse, passord og velkomstpost</li>
        <li><strong>Cloudflare R2</strong> — opplastede profilbilder når du bruker funksjonen</li>
        <li><strong>Apple og Google</strong> — innlogging og push-varsler via APNs og FCM når du bruker funksjonene</li>
      </ul>
      <h2>Rapport til en samtale</h2>
      <p>Når du som foresatt lager en tidsbegrenset lenke til et utdrag av utvalgte aktivitets- og belønningstall, kan du dele den, for eksempel med en lærer eller en behandler. Det skjer bare fordi du velger det. Du bestemmer innholdet og kan tilbakekalle lenken. Mottakeren trenger ingen konto.</p>
      <p>Beskytter du en lenke med en kode, så del ikke koden i samme melding som lenken.</p>
      <h2>Innlogging via Apple eller Google</h2>
      <ul>
        <li><strong>Innlogging med Apple:</strong> vi behandler navn og e-postadresse. Velger du å skjule e-posten, lagrer vi den unike videresendingsadressen Apple oppretter, slik at vi kan sende kontomeldinger.</li>
        <li><strong>Innlogging med Google:</strong> vi mottar og lagrer e-postadressen og navnet på Google-kontoen for å opprette profilen.</li>
      </ul>
      <p>Apples og Googles egen behandling følger deres egne personvernerklæringer.</p>
      <h2>Push-varsler og enhetstoken</h2>
      <p>Slår du på push-varsler, lagrer vi på grunnlag av samtykket ditt et unikt enhetstoken (APNs eller FCM), slik at varselet når riktig enhet. Tokenet henger på kontoen din.</p>
      <p>Token utløper ved utlogging, eller når plattformen melder tokenet ugyldig. Vi lagrer ikke et enhetskjennetegn uten et aktivt push-abonnement. Du slår det av i appens innstillinger eller på enheten.</p>
      <h2>Lagringstid</h2>
      <p>Vi lagrer data så lenge kontoen er aktiv. Sletter du kontoen, slettes alle data straks og varig.</p>
      <h2>Slett konto</h2>
      <p>Du sletter kontoen i appen via innstillingene. Du bekrefter med passordet ditt eller via tredjepartsinnloggingen.</p>
      <p>Det kan ikke angres. Borte er da foreldrekontoen, barneprofilene, planer, dagslogger, vurderinger, belønninger og invitasjoner.</p>
      <h2>Lagring og sikkerhet</h2>
      <p>Vi tilstreber å lagre kjernedata i EU/EØS der det gjelder. Noen leverandører kan behandle utenfor EØS. Overføring og garantier står i denne teksten og gjennomgås løpende. Tilkoblinger er kryptert (HTTPS). Passord står ikke i klartekst. Vi bruker bcrypt.</p>
      <h2>Informasjonskapsler</h2>
      <ul>
        <li><strong>Strengt nødvendige informasjonskapsler</strong> — alltid på. Økt og CSRF-vern for en sikker innlogging.</li>
        <li><strong>Innstillinger</strong> — lagret lokalt, for eksempel et tema.</li>
        <li><strong>Statistikk og markedsføring</strong> — Google Analytics 4, Meta Pixel og Google Ads. Som standard av, til du samtykker via meldingen om informasjonskapsler.</li>
      </ul>
      <p>Valget ditt lagrer vi i høyst ett år. Du kan endre det via meldingen eller innstillingene. Rutinedata om et barn sendes ikke til reklameplattformer.</p>
      <h2>Dine rettigheter (GDPR)</h2>
      <ul>
        <li>Rett til å slette kontoen og dataene</li>
        <li>Rett til innsyn</li>
        <li>Rett til å få uriktige data rettet</li>
        <li>Rett til å protestere eller begrense</li>
        <li>Rett til å klage til det svenske tilsynet Integritetsskyddsmyndigheten (IMY) hvis du mener at vi bryter GDPR</li>
      </ul>
      <h2>Kontakt</h2>
      <p>Spørsmål om denne behandlingen? Bruk <a href="/en/contact">kontaktskjemaet</a>.</p>
    `,
  },
  terms: {
    title: 'Vilkår for bruk — My Starday',
    description: 'Vilkårene for å bruke My Starday: konto, barn, pris og ansvar.',
    h1: 'Vilkår for bruk',
    ogTitle: 'Vilkår for bruk',
    body: `
      <p class="updated">Sist oppdatert: oktober 2026</p>
      <p>Takk for at du bruker My Starday. Disse vilkårene skal være tydelige og ærlige. Spørsmål stiller du via <a href="/en/contact">kontaktskjemaet</a>.</p>
      <h2>1. Om tjenesten</h2>
      <p>My Starday er en digital tjeneste for familier som vil ha en strukturert dagsplan, markere et barns fremgang med stjerner og la barnet følge aktiviteter i en egen visning. Tjenesten er for foreldre og verger og barna deres. En familie har minst én voksen med en konto. Et barn logger inn med en PIN i barnevisningen.</p>
      <h2>2. Konto og sikkerhet</h2>
      <ul>
        <li>Velg et sterkt passord, og del det ikke</li>
        <li>Beskytt e-postadressen din. Med den får du tilgangen tilbake</li>
        <li>PIN-koden til barnevisningen er bare for barnet og vergene</li>
        <li>Ikke bruk appen på en måte som strider mot svensk rett</li>
      </ul>
      <p>Du er ansvarlig for alt som skjer under kontoen din, også når noen andre bruker den. Mistenker du misbruk, ta straks kontakt.</p>
      <h2>3. Barn og personopplysninger</h2>
      <p>My Starday behandler opplysninger om barn. Vi følger GDPR og prinsippet om dataminimering:</p>
      <ul>
        <li>Et barn gjenkjennes på et fornavn og en valgt emoji. Ikke etternavn, ikke personnummer, ingen kontaktopplysninger</li>
        <li>Foreldre eller verger legger inn opplysningene og samtykker til deling</li>
        <li>Vi bruker ikke data om barn til reklame og ikke til noe annet enn tjenesten</li>
        <li>Rapporter og planer deles bare når en voksen selv deler en tidsbegrenset lenke</li>
      </ul>
      <h2>4. Innhold du oppretter</h2>
      <p>Planer, belønninger, aktiviteter og observasjoner du legger til, tilhører deg eller familien din. Du gir oss rett til å lagre og vise dette innholdet så lenge kontoen er aktiv. Vi kopierer det ikke til reklame, selger det ikke og bruker det ikke i markedsføring.</p>
      <h2>5. Bruk</h2>
      <p>Tjenesten er til personlig bruk i familien din. Ikke tillatt er:</p>
      <ul>
        <li>Ervervsmessig bruk uten avtale med Papa Bravo AB</li>
        <li>Å manipulere planer, stjerner eller belønninger utenfor appens vanlige forløp</li>
        <li>Automatiserte midler, skrapere eller boter mot tjenesten</li>
        <li>Å offentliggjøre innhold som er ulovlig, krenkende eller skadelig</li>
      </ul>
      <h2>6. Opphør og sletting</h2>
      <p>Du kan når som helst slette kontoen varig via innstillingene i appen, bekreftet med passordet ditt.</p>
      <p>Slettingen fjerner straks og varig foreldrekontoen, alle barn, planer, aktivitetslogger, stjerner, belønninger og eventuelle observasjoner.</p>
      <p>Vi kan sperre en konto som bryter disse vilkårene eller svensk rett.</p>
      <h2>7. Pris</h2>
      <p>Familier i Irland og Canada kan bruke My Starday gratis til og med 31. desember 2026. I den perioden trengs ingen betaling. Gratisperioden blir ikke automatisk til et abonnement. Fra 1. januar 2027 kan du velge et abonnement i App Store eller på Google Play. På denne siden er det ingen nettkasse. I andre land gjelder prisen og tilgangen appen viser for det landet. Svenske familier som starter fra 3. oktober 2026, kan prøve appen i 14 dager og deretter velge 59 svenske kroner i måneden eller 590 svenske kroner i året i appen. Familier som allerede har en konto, beholder det eksisterende tilbudet sitt.</p>
      <h2>8. Endringer</h2>
      <p>Vi kan tilpasse disse vilkårene, for eksempel etter en lovendring, en ny funksjon eller en presisering. Er en endring vesentlig, forteller vi det på e-post eller med en melding i appen.</p>
      <p>Bruker du tjenesten videre etter det, gjelder det som aksept av de nye vilkårene.</p>
      <h2>9. Ansvar</h2>
      <p>My Starday leveres som det er. Vi gjør vårt beste for å holde tjenesten stabil og sikker, men kan ikke garantere at den alltid er tilgjengelig uten avbrudd.</p>
      <p>Papa Bravo AB svarer ikke for:</p>
      <ul>
        <li>Tap av data ved force majeure</li>
        <li>Skade fordi du deler en PIN eller innloggingsopplysninger med noen som ikke skal ha dem</li>
        <li>Indirekte skade, tapt sjanse eller tapte data, med mindre svensk rett krever noe annet</li>
      </ul>
      <p>Du er ansvarlig for bruk etter disse vilkårene og etter svensk rett.</p>
      <h2>10. Kontakt</h2>
      <p>Spørsmål om disse vilkårene eller om tjenesten? Bruk <a href="/en/contact">kontaktskjemaet</a>.</p>
    `,
  },
});

module.exports = { pageFor };
