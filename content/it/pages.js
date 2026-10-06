'use strict';

/**
 * Italian public pages. Written in Italian.
 * Legal text translates the verified baseline. It adds no Italian statute.
 */

const { defineLocalePages } = require('../locale-pack');

const pageFor = defineLocalePages('it', {
  market: {
    title: (name) => `My Starday in ${name} — schemi visivi per bambini`,
    description: (name) => `La pagina di mercato per ${name}. Schemi visivi in italiano. È una pagina di mercato, non un sito di lingua a parte.`,
    h1: (name) => `Schemi visivi per le famiglie in ${name}`,
    lead: (name) => `Questa è la pagina per ${name}. Il sito in italiano resta un sito di lingua.`,
    registrationOpen: (name) => `I nuovi account in ${name} seguono la registrazione già esistente. L’impostazione predefinita è aperta.`,
    registrationClosed: (name) => `I nuovi account in ${name} non sono aperti per impostazione predefinita. Segue la registrazione già esistente, non questa pagina. L’impostazione predefinita è chiusa.`,
    complimentary: (name) => `In ${name} vale il periodo gratuito già esistente. Non diventa da solo un abbonamento. Questa pagina non fissa un prezzo.`,
    introYear: (name) => `${name} mantiene l’offerta già pubblicata sul sito svedese. Questa pagina non fissa un prezzo. In questo mercato non c’è un periodo gratuito fino al 31 dicembre 2026.`,
    trial: (name, days) => `Se più avanti qui si potrà creare un account, la regola già esistente fuori da Svezia, Irlanda e Canada è una prova di ${days} giorni. Il pagamento deve essere disponibile prima. In questo mercato non c’è un periodo gratuito fino al 31 dicembre 2026, e niente diventa da solo un abbonamento. Questa pagina non fissa un prezzo.`,
    notTreatment: (name) => `Il pulsante apre la scheda generale dell’App Store, non una scheda inventata per ${name}. My Starday è uno schema visivo della giornata. Non è una cura e non promette un esito medico.`,
    register: 'Crea un account',
    registerNote: 'Il modulo chiede dove vive la famiglia. Questo link non imposta né il paese né il prezzo.',
    how: 'Come funziona',
    playSoon: 'Google Play non è aperto qui come pagina distinta.',
  },
  pages: {
    home: {
      title: 'Schema visivo per bambini – routine, ricompense e pittogrammi | My Starday',
      description: 'Schemi visivi che mostrano a un bambino che cosa succede adesso e che cosa viene dopo. Pittogrammi, una vista bambino e stelle per i passi conclusi.',
      h1: 'Schemi visivi che mostrano a un bambino che cosa succede adesso e che cosa viene dopo.',
      ogTitle: 'Schema visivo per bambini',
      faqs: [
        { q: 'Che cos’è My Starday?', a: 'Uno schema visivo per le famiglie. Il bambino vede il passo successivo. L’adulto tiene le impostazioni.' },
        { q: 'Le stelle si comprano?', a: 'No. Una stella arriva da un passo concluso. Non si può comprare.' },
        { q: 'È una cura?', a: 'No. My Starday aiuta nella giornata e non promette un esito medico.' },
      ],
      body(href) {
        return `
          <p class="lead">Un bambino si acquieta quando il passo successivo è visibile. My Starday mostra la giornata in immagini: adesso, dopo, fatto.</p>
          <h2>Che cosa vede il bambino</h2>
          <p>La vista bambino mostra un passo alla volta. L’adulto prepara il piano. Il bambino spunta. Più bambini possono condividere la stessa casa, ognuno con il suo piano.</p>
          <h2>Stelle</h2>
          <p>Un passo concluso può dare una stella. Le stelle non si comprano. Non sostituiscono un accordo preso prima. Il dettaglio è nel <a href="${href('rewardSystem')}">sistema di ricompense</a>.</p>
          <h2>Non è una cura</h2>
          <p>Il piano può aiutare i bambini che hanno bisogno di più chiarezza, anche con ADHD o autismo, e anche le famiglie senza diagnosi. My Starday non è una cura e non promette un risultato preciso.</p>
          <p>Il sito in italiano spiega il prodotto. Il paese è un’altra cosa. C’è una pagina propria per l’<a href="/it/it">Italia</a>.</p>
          <p><a href="${href('howItWorks')}">Come funziona</a> · <a href="${href('visualSchedule')}">Schema visivo</a> · <a href="${href('morningRoutine')}">Routine del mattino</a></p>
        `;
      },
    },
    howItWorks: {
      title: 'Come funziona My Starday | Schema visivo',
      description: 'L’adulto prepara la giornata. Il bambino vede il passo successivo e lo spunta. Le stelle arrivano da un passo fatto, non si comprano.',
      h1: 'Come funziona My Starday',
      ogTitle: 'Come funziona',
      faqs: [
        { q: 'Chi imposta il piano?', a: 'Un adulto. Il bambino vede la vista bambino e spunta i passi.' },
        { q: 'Il bambino ha bisogno di un’e-mail?', a: 'No. Il bambino entra con un nome e un PIN.' },
      ],
      body(href) {
        return `
          <p class="lead">Tre cose reggono il mattino: un piano visibile, un bambino che spunta da solo, e un adulto che tiene le impostazioni.</p>
          <h2>1. Il piano</h2>
          <p>Metti le attività nell’ordine reale del mattino. Le immagini aiutano se il bambino non legge ancora. Lo <a href="${href('visualSchedule')}">schema visivo</a> mostra adesso e dopo.</p>
          <h2>2. La vista bambino</h2>
          <p>Il bambino vede il passo successivo, non le impostazioni della famiglia. In quella vista non ci sono pubblicità né un social network.</p>
          <h2>3. La stella</h2>
          <p>Un passo spuntato può dare una stella. La stella non si compra. L’accordo è preso prima, non nel mezzo del nervoso.</p>
          <p>My Starday aiuta la giornata. Non è una cura e non sostituisce il parere di un medico, di un terapista o della scuola.</p>
        `;
      },
    },
    visualSchedule: {
      title: 'Schema visivo per bambini | My Starday',
      description: 'Uno schema visivo mostra a un bambino che cosa succede adesso e che cosa viene dopo. Pochi passi, immagini note, un ordine chiaro.',
      h1: 'Schema visivo per bambini',
      ogTitle: 'Schema visivo',
      faqs: [
        { q: 'Quanti passi?', a: 'Spesso ne bastano quattro o cinque. Una lista più lunga va se l’ordine è già noto.' },
        { q: 'Foto o simboli?', a: 'Immagini che il bambino già riconosce. Le foto di casa funzionano bene.' },
      ],
      body(href) {
        return `
          <p class="lead">Uno schema visivo rende visibile l’ordine. Il bambino non deve indovinare che cosa viene dopo.</p>
          <h2>Adesso e dopo</h2>
          <p>Mostra solo il passo attuale e il successivo. Una lista lunga sul muro aiuta meno di un gesto chiaro.</p>
          <h2>Se un passo si blocca</h2>
          <ul>
            <li><strong>Dividi il passo.</strong> «Vestirsi» diventa calze, pantaloni, maglietta.</li>
            <li><strong>Uno alla volta.</strong></li>
            <li><strong>Indicare invece di ripetere.</strong></li>
          </ul>
          <p>Al mattino conta la <a href="${href('morningRoutine')}">routine del mattino</a>. Nella settimana, il <a href="${href('weeklySchedule')}">piano settimanale</a> dice che giorno è.</p>
          <p>My Starday non è una cura e non promette un esito medico.</p>
        `;
      },
    },
    morningRoutine: {
      title: 'Routine del mattino per bambini | My Starday',
      description: 'Una routine del mattino con le immagini abbassa il numero di richiami a voce. Lo stesso ordine, giorno dopo giorno.',
      h1: 'Routine del mattino per bambini',
      ogTitle: 'Routine del mattino',
      faqs: [
        { q: 'Che cosa entra nel mattino?', a: 'Solo ciò che succede davvero prima della porta. Alzarsi, vestirsi, mangiare, denti, giacca.' },
        { q: 'E se il tempo manca?', a: 'Accorcia la lista invece di parlare più in fretta. Un piano più corto è un piano vero.' },
      ],
      body(href) {
        return `
          <p class="lead">Lo stesso ordine trasforma una lista in abitudine. Invece di ripetere «lavati i denti», guardate l’immagine successiva.</p>
          <h2>Esempio</h2>
          <ol>
            <li>Alzarsi</li>
            <li>Bagno e mani</li>
            <li>Vestirsi</li>
            <li>Colazione</li>
            <li>Denti</li>
            <li>Giacca, scarpe, zaino</li>
          </ol>
          <p>Molti bambini dell’infanzia vanno meglio con quattro o cinque passi.</p>
          <p>Le famiglie che cercano più appoggio nei passaggi possono leggere la <a href="${href('neurodiverseRoutines')}">guida sulla chiarezza</a>. My Starday sostiene la giornata, non è una cura.</p>
        `;
      },
    },
    weeklySchedule: {
      title: 'Piano settimanale con pittogrammi | My Starday',
      description: 'Un piano settimanale con pittogrammi mostra che giorno è, non solo che cosa sta succedendo adesso.',
      h1: 'Piano settimanale con pittogrammi',
      ogTitle: 'Piano settimanale',
      faqs: [
        { q: 'Che differenza c’è con lo schema del giorno?', a: 'Il giorno sono i passi di oggi. La settimana mostra in che cosa i giorni differiscono.' },
        { q: 'Da che età?', a: 'Spesso verso l’età scolare, quando la settimana cambia di più. I più piccoli hanno prima bisogno di oggi.' },
      ],
      body(href) {
        return `
          <p class="lead">Un piano della settimana aiuta quando il feriale e il fine settimana sono diversi, o quando «che cosa c’è domani?» ha bisogno di una risposta prima di dormire.</p>
          <p>Lunedì con lo sport, mercoledì dall’altro genitore, venerdì con un film. Le immagini lo rendono visibile prima che un bambino legga un calendario.</p>
          <p>Lo <a href="${href('visualSchedule')}">schema visivo</a> resta i passi di oggi. Il piano della settimana dice che giorno è.</p>
          <p>My Starday non promette un esito medico.</p>
        `;
      },
    },
    neurodiverseRoutines: {
      title: 'Routine per bambini neurodivergenti | My Starday',
      description: 'Più chiarezza nella giornata per i bambini che hanno bisogno di passaggi netti. My Starday aiuta il quotidiano, non è una cura né una diagnosi.',
      h1: 'Routine per bambini neurodivergenti',
      ogTitle: 'Routine per bambini neurodivergenti',
      faqs: [
        { q: 'Serve una diagnosi?', a: 'No. Il piano aiuta dove serve più chiarezza. Una diagnosi non è un requisito.' },
        { q: 'Sostituisce una terapia?', a: 'No. Non è una cura e non sostituisce il parere di professionisti.' },
      ],
      body(href) {
        return `
          <p class="lead">Alcuni bambini hanno bisogno di vedere il passo successivo, non di sentirlo più forte. Vale con la diagnosi e senza.</p>
          <h2>ADHD: iniziare e restare sul passo</h2>
          <p>Il passaggio si blocca spesso perché il passo successivo non si vede. Un piano con una casella dà subito un riscontro: questo passo è fatto.</p>
          <h2>Autismo: una giornata prevedibile</h2>
          <p>Un ordine diverso può pesare. Un <a href="${href('weeklySchedule')}">piano settimanale</a> mostra prima quale giorno arriva. Un passo tolto va cambiato in modo visibile, non deve sparire in silenzio.</p>
          <p>My Starday è un aiuto educativo nel quotidiano. Non è una cura medica e non sostituisce il parere di un medico, di un terapista occupazionale, di un logopedista o della scuola. Schede del tipo prima, poi e fatto non sono ancora disponibili come PDF in italiano. Quelle schede si ispirano a quell’approccio: non sono un metodo ufficiale né una certificazione.</p>
        `;
      },
    },
    rewardSystem: {
      title: 'Sistema di ricompense per bambini | My Starday',
      description: 'Una ricompensa concordata prima non è una trattativa sul momento. Il bambino guadagna le stelle. Non si comprano.',
      h1: 'Sistema di ricompense per bambini, senza farne una trattativa',
      ogTitle: 'Sistema di ricompense',
      faqs: [
        { q: 'Una tabella di stelle è un ricatto?', a: 'No, se la ricompensa è fissata prima e legata a qualcosa che il bambino può fare. La trattativa si offre sul momento per far smettere qualcosa.' },
        { q: 'Quante stelle?', a: 'Inizia con una stella per passo concluso. Le stelle non si comprano.' },
      ],
      body(href) {
        return `
          <p class="lead">«Non è un ricatto?» dipende da quando prendete l’accordo. Concordato prima, un tabellone può sostenere un’abitudine. Offerto nel mezzo della rabbia, diventa una negoziazione.</p>
          <p>Su uno <a href="${href('visualSchedule')}">schema visivo</a> la catena è semplice: vedere il passo, farlo, spuntarlo, ricevere la stella.</p>
          <ol>
            <li>Sii concreto. Premia «si lava i denti senza richiamo», non «è buono».</li>
            <li>Mostra l’avanzamento.</li>
            <li>Conta il tentativo, non solo il mattino perfetto.</li>
            <li>Lascia che il bambino pensi con te alla ricompensa.</li>
            <li>Dirada le stelle quando l’abitudine regge da sola.</li>
          </ol>
          <p>Le stelle non si comprano. My Starday non promette un esito medico.</p>
        `;
      },
    },
    resources: {
      title: 'Risorse per le routine visive | My Starday',
      description: 'Che cosa esiste già in italiano e che cosa non è ancora un PDF. L’app e un foglio stampato sono due cose diverse.',
      h1: 'Risorse',
      ogTitle: 'Risorse',
      faqs: [
        { q: 'Ci sono PDF in italiano?', a: 'Non ancora. Questa pagina non vende fogli svedesi come se fossero tradotti.' },
      ],
      body(href) {
        return `
          <p class="lead">L’app mostra la giornata sullo schermo. Un foglio stampato è un’altra cosa. Qui non ci sono ancora PDF in italiano.</p>
          <p>Nell’app prepari lo <a href="${href('visualSchedule')}">schema</a>, la <a href="${href('morningRoutine')}">routine del mattino</a> e il <a href="${href('weeklySchedule')}">piano della settimana</a>. Il bambino vede lo stesso ordine nella vista bambino.</p>
          <p>Non colleghiamo una biblioteca in un’altra lingua come se fosse italiana. Se arrivano fogli in italiano, staranno su questa pagina.</p>
        `;
      },
    },
    faq: {
      title: 'Domande frequenti | My Starday',
      description: 'Risposte brevi su schema, stelle, vista bambino e su che cosa My Starday non è.',
      h1: 'Domande frequenti',
      ogTitle: 'Domande frequenti',
      faqs: [
        { q: 'Per chi è questo sito?', a: 'Il sito in italiano spiega il prodotto. L’Italia ha una pagina di mercato. La lingua resta l’italiano.' },
        { q: 'Posso comprare le stelle?', a: 'No.' },
        { q: 'È un’app di terapia?', a: 'No. Né cura né esito medico promesso.' },
        { q: 'Dove si crea l’account?', a: 'Nel modulo che già esiste. Chiede dove vive la famiglia. Una pagina di mercato non fissa il paese da sola.' },
      ],
      body(href) {
        return `
          <p class="lead">Le risposte brevi. I testi più lunghi sono nelle guide.</p>
          <h2>Lingua e paese</h2>
          <p>Questo sito è in italiano. Il paese si sceglie a parte. Una pagina di mercato non cambia la lingua e non crea un account.</p>
          <h2>Il bambino</h2>
          <p>Il bambino vede il piano e spunta. Impostazioni, inviti e account restano all’adulto. Altro in <a href="${href('howItWorks')}">Come funziona</a>.</p>
          <h2>Stelle</h2>
          <p>Le stelle arrivano dai passi conclusi. Non si comprano. Leggi il <a href="${href('rewardSystem')}">sistema di ricompense</a>.</p>
        `;
      },
    },
    privacy: {
      title: 'Informativa sulla privacy — My Starday',
      description: 'Quali dati tratta My Starday, che cosa non raccogliamo e quali diritti dà il GDPR.',
      h1: 'Informativa sulla privacy di My Starday',
      ogTitle: 'Informativa sulla privacy',
      body: `
        <p class="updated">Ultimo aggiornamento: ottobre 2026</p>
        <p>Trattiamo la tua riservatezza con cura. My Starday raccoglie il minimo: solo ciò che serve all’app per funzionare. Non vendiamo i tuoi dati e non li usiamo per pubblicità mirata. Una condivisione fuori dal servizio avviene solo se la scegli tu, o se serve perché i nostri responsabili del trattamento tengano in piedi il servizio.</p>
        <p><strong>Titolare del trattamento:</strong> Papa Bravo AB è responsabile del trattamento dei tuoi dati personali. Ci scrivi tramite il <a href="/en/contact">modulo di contatto</a>.</p>
        <h2>Che cosa raccogliamo</h2>
        <p>Trattiamo i dati sulla base del contratto, per fornire l’app e le funzioni per cui ti registri. Di adulti e famiglie raccogliamo:</p>
        <ul>
          <li><strong>Indirizzo e-mail</strong> — per l’accesso e i messaggi sull’account</li>
          <li><strong>Nome e cognome</strong> — per riconoscere l’account</li>
          <li><strong>Registro delle attività</strong> — quali attività sono concluse, e quando</li>
          <li><strong>Stelle</strong> — stelle guadagnate e scambiate</li>
          <li><strong>Piani e attività</strong> — ciò che crei</li>
        </ul>
        <p><strong>Riservatezza dei bambini:</strong> un bambino è riconoscibile solo da un nome o un soprannome e da un emoji scelto. Non raccogliamo cognome, numero personale né recapiti di un bambino.</p>
        <h2>Che cosa non raccogliamo</h2>
        <ul>
          <li>Niente cognomi di bambini</li>
          <li>Niente numeri personali, né di adulti né di bambini</li>
          <li>Niente dati su salute, diagnosi o disabilità di un bambino</li>
          <li>Niente dati di pagamento. Gli acquisti passano da App Store o Google Play</li>
          <li>Niente dati di posizione</li>
        </ul>
        <h2>A che cosa servono i dati</h2>
        <ul>
          <li>Mostrare al bambino il piano del giorno</li>
          <li>Conservare l’avanzamento e le stelle</li>
          <li>Inviare l’e-mail di verifica e i messaggi dell’account</li>
          <li>Rispondere ai messaggi che ci mandi</li>
        </ul>
        <h2>Con chi li condividiamo</h2>
        <p>Non condividiamo i tuoi dati con terzi per pubblicità. Questi responsabili tengono in piedi il servizio. Trattano solo per nostro conto e secondo il GDPR:</p>
        <ul>
          <li><strong>Neon (database)</strong> — account, piani, attività e dati della famiglia</li>
          <li><strong>Hosting proprio (VPS nell’UE/SEE)</strong> — l’app web e l’API</li>
          <li><strong>Resend (e-mail)</strong> — e-mail transazionali, come verifica, password e benvenuto</li>
          <li><strong>Cloudflare R2</strong> — foto profilo caricate se usi quella funzione</li>
          <li><strong>Apple e Google</strong> — accesso e notifiche push tramite APNs e FCM se usi quelle funzioni</li>
        </ul>
        <h2>Resoconto per un colloquio</h2>
        <p>Se crei, come adulto responsabile, un link temporaneo a un riepilogo di cifre scelte su attività e ricompense, puoi condividerlo per esempio con un insegnante o un terapista. Succede solo perché lo scegli tu. Decidi tu il contenuto e puoi revocare il link. Chi lo riceve non ha bisogno di un account.</p>
        <p>Se proteggi un link con un codice, non condividere quel codice nello stesso messaggio del link.</p>
        <h2>Accesso con Apple o Google</h2>
        <ul>
          <li><strong>Accesso con Apple:</strong> trattiamo nome ed e-mail. Se scegli «Nascondi la mia e-mail», conserviamo l’indirizzo di inoltro unico che crea Apple, per poter inviare i messaggi dell’account.</li>
          <li><strong>Accesso con Google:</strong> riceviamo e conserviamo l’e-mail e il nome dell’account Google per creare il profilo.</li>
        </ul>
        <p>Il trattamento fatto da Apple e Google per conto proprio segue le loro informative.</p>
        <h2>Notifiche e token del dispositivo</h2>
        <p>Se attivi le notifiche, conserviamo, sulla base del tuo consenso, un token unico del dispositivo (APNs o FCM) perché il messaggio arrivi sull’apparecchio giusto. Il token è legato al tuo account.</p>
        <p>I token scadono alla disconnessione, o se la piattaforma segnala il token come non valido. Non conserviamo una caratteristica del dispositivo senza un abbonamento push attivo. Si disattiva nelle impostazioni dell’app o sull’apparecchio.</p>
        <h2>Conservazione</h2>
        <p>Conserviamo i dati finché l’account è attivo. Se cancelli l’account, tutti i dati vengono eliminati subito e in modo definitivo.</p>
        <h2>Cancellare l’account</h2>
        <p>Cancelli l’account nell’app, dalle impostazioni. Confermi con la password o con l’accesso del terzo.</p>
        <p>Non si può annullare. Spariscono l’account adulto, i profili dei bambini, i piani, i diari, le valutazioni, le ricompense e gli inviti.</p>
        <h2>Archiviazione e sicurezza</h2>
        <p>Cerchiamo di conservare i dati centrali nell’UE/SEE quando vale. Alcuni fornitori possono trattare fuori dal SEE. I trasferimenti e le garanzie sono in questa informativa e vengono rivisti in continuo. Le connessioni sono cifrate (HTTPS). Le password non sono in chiaro. Usiamo bcrypt.</p>
        <h2>Cookie</h2>
        <ul>
          <li><strong>Cookie strettamente necessari</strong> — sempre attivi. Sessione e protezione CSRF per un accesso sicuro.</li>
          <li><strong>Preferenze</strong> — salvate sul dispositivo, per esempio un tema.</li>
          <li><strong>Misurazione e marketing</strong> — Google Analytics 4, Meta Pixel e Google Ads. Spenti per impostazione predefinita, finché non acconsenti nel banner.</li>
        </ul>
        <p>Conserviamo la tua scelta al massimo un anno. Puoi cambiarla dal banner o dalle impostazioni. I dati di routine dei bambini non vanno a piattaforme pubblicitarie.</p>
        <h2>I tuoi diritti (GDPR)</h2>
        <ul>
          <li>Diritto di cancellare account e dati</li>
          <li>Diritto di accesso</li>
          <li>Diritto di far correggere dati inesatti</li>
          <li>Diritto di opposizione o di limitazione</li>
          <li>Diritto di reclamo all’autorità svedese Integritetsskyddsmyndigheten (IMY) se ritieni che violiamo il GDPR</li>
        </ul>
        <h2>Contatto</h2>
        <p>Domande su questo trattamento? Usa il <a href="/en/contact">modulo di contatto</a>.</p>
      `,
    },
    terms: {
      title: 'Condizioni d’uso — My Starday',
      description: 'Le condizioni d’uso di My Starday: account, bambini, prezzo e responsabilità.',
      h1: 'Condizioni d’uso',
      ogTitle: 'Condizioni d’uso',
      body: `
        <p class="updated">Ultimo aggiornamento: ottobre 2026</p>
        <p>Grazie per usare My Starday. Queste condizioni vogliono essere chiare e oneste. Le domande passano dal <a href="/en/contact">modulo di contatto</a>.</p>
        <h2>1. Il servizio</h2>
        <p>My Starday è un servizio digitale per famiglie che vogliono un piano del giorno strutturato, segnare l’avanzamento di un bambino con le stelle e lasciare che il bambino segua le attività in una vista propria. Il servizio è per genitori e adulti responsabili e i loro bambini. Una famiglia ha almeno un adulto con account. I bambini entrano con un PIN nella vista bambino.</p>
        <h2>2. Account e sicurezza</h2>
        <ul>
          <li>Scegli una password robusta e non condividerla</li>
          <li>Proteggi la tua e-mail. Con quella recuperi l’accesso</li>
          <li>Il PIN della vista bambino è solo per il bambino e gli adulti responsabili</li>
          <li>Non usare l’app in un modo che violi la legge svedese</li>
        </ul>
        <p>Sei responsabile di tutto ciò che accade nel tuo account, anche se lo usa un’altra persona. Se sospetti un abuso, scrivi subito.</p>
        <h2>3. Bambini e dati personali</h2>
        <p>My Starday tratta dati sui bambini. Seguiamo il GDPR e il principio di minimizzazione:</p>
        <ul>
          <li>I bambini si riconoscono da un nome e da un emoji scelto. Niente cognome, niente numero personale, niente recapiti</li>
          <li>I genitori o gli adulti responsabili inseriscono i dati e accettano la condivisione</li>
          <li>Non usiamo i dati dei bambini per pubblicità né per altro che non sia il servizio</li>
          <li>Resoconti e piani si condividono solo se un adulto condivide lui stesso un link temporaneo</li>
        </ul>
        <h2>4. Contenuti che crei</h2>
        <p>Piani, ricompense, attività e osservazioni che aggiungi sono tuoi o della tua famiglia. Ci dai il diritto di conservarli e mostrarli finché l’account è attivo. Non li copiamo per pubblicità, non li vendiamo e non li usiamo nel marketing.</p>
        <h2>5. Uso</h2>
        <p>Il servizio è per un uso personale nella tua famiglia. Non è consentito:</p>
        <ul>
          <li>Un uso commerciale senza accordo con Papa Bravo AB</li>
          <li>Manipolare piani, stelle o ricompense fuori dai percorsi ordinari dell’app</li>
          <li>Mezzi automatici, scraper o bot contro il servizio</li>
          <li>Pubblicare contenuti illegali, offensivi o dannosi</li>
        </ul>
        <h2>6. Chiusura e cancellazione</h2>
        <p>Puoi cancellare l’account in modo definitivo in qualsiasi momento dalle impostazioni dell’app, confermando con la password.</p>
        <p>La cancellazione rimuove subito e in modo definitivo l’account adulto, tutti i bambini, i piani, i registri delle attività, le stelle, le ricompense e le eventuali osservazioni.</p>
        <p>Possiamo sospendere un account che viola queste condizioni o la legge svedese.</p>
        <h2>7. Prezzo</h2>
        <p>Le famiglie in Irlanda e in Canada possono usare My Starday gratis fino al 31 dicembre 2026 compreso. In quel periodo non serve un pagamento. Il periodo gratuito non diventa automaticamente un abbonamento. Dal 1° gennaio 2027 puoi scegliere un abbonamento nell’App Store o su Google Play. Su questa pagina non c’è una cassa web. Negli altri paesi valgono il prezzo e l’accesso che l’app mostra per quel paese. Le famiglie svedesi che iniziano dal 3 ottobre 2026 possono provare l’app per 14 giorni e poi scegliere 59 corone svedesi al mese oppure 590 corone svedesi all’anno nell’app. Le famiglie che hanno già un account mantengono l’offerta esistente.</p>
        <h2>8. Modifiche</h2>
        <p>Possiamo adattare queste condizioni, per esempio dopo un cambiamento di legge, una funzione nuova o un chiarimento. Se un cambiamento è rilevante, lo diciamo per e-mail o con un avviso nell’app.</p>
        <p>Se continui a usare il servizio dopo, ciò vale come accettazione delle nuove condizioni.</p>
        <h2>9. Responsabilità</h2>
        <p>My Starday è fornito così com’è. Facciamo il possibile per tenere il servizio stabile e sicuro, senza poter garantire che sia sempre disponibile senza interruzioni.</p>
        <p>Papa Bravo AB non risponde di:</p>
        <ul>
          <li>Perdita di dati per forza maggiore</li>
          <li>Un danno perché condividi un PIN o credenziali con chi non dovrebbe averli</li>
          <li>Un danno indiretto, un’occasione persa o dati perduti, salvo che la legge svedese disponga altrimenti</li>
        </ul>
        <p>Sei responsabile di un uso conforme a queste condizioni e alla legge svedese.</p>
        <h2>10. Contatto</h2>
        <p>Domande su queste condizioni o sul servizio? Usa il <a href="/en/contact">modulo di contatto</a>.</p>
      `,
    },
  },
});

module.exports = { pageFor };
