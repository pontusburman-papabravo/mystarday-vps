'use strict';

/**
 * German public pages. Written in German.
 * Legal text translates the verified baseline. It adds no German statute.
 */

const { defineLocalePages } = require('../locale-pack');

const pageFor = defineLocalePages('de', {
  market: {
    title: (name) => `My Starday in ${name} — visuelle Tagespläne für Kinder`,
    description: (name) => `Die Marktseite für ${name}. Visuelle Tagespläne auf Deutsch. Das ist eine Marktseite, keine eigene Sprachwebsite.`,
    h1: (name) => `Visuelle Tagespläne für Familien in ${name}`,
    lead: (name) => `Das ist die Seite für ${name}. Die deutschsprachige Website bleibt eine Sprachwebsite.`,
    registrationOpen: (name) => `Neue Konten in ${name} folgen der bestehenden Registrierung. Die Voreinstellung ist offen.`,
    registrationClosed: (name) => `Neue Konten in ${name} sind standardmäßig nicht offen. Das folgt der bestehenden Registrierung, nicht dieser Seite. Die Voreinstellung ist geschlossen.`,
    complimentary: (name) => `Für ${name} gilt der bestehende kostenfreie Zeitraum. Er wird nicht von selbst zu einem Abonnement. Diese Seite legt keinen Preis fest.`,
    introYear: (name) => `${name} behält das Angebot, das bereits auf der schwedischen Website steht. Diese Seite legt keinen Preis fest. Auf diesem Markt gibt es keinen kostenfreien Zeitraum bis zum 31. Dezember 2026.`,
    trial: (name, days) => `Wenn ein Konto hier später möglich wird, gilt die bestehende Regel außerhalb von Schweden, Irland und Kanada: eine Probezeit von ${days} Tagen. Die Zahlung muss zuerst verfügbar sein. Auf diesem Markt gibt es keinen kostenfreien Zeitraum bis zum 31. Dezember 2026, und nichts wird von selbst zu einem Abonnement. Diese Seite legt keinen Preis fest.`,
    notTreatment: (name) => `Die Schaltfläche öffnet den allgemeinen App-Store-Eintrag, keine erfundene Produktseite für ${name}. My Starday ist ein visueller Tagesplan. Es ist keine Behandlung und verspricht kein medizinisches Ergebnis.`,
    register: 'Konto erstellen',
    registerNote: 'Das Formular fragt, wo die Familie wohnt. Dieser Link setzt selbst kein Land und keinen Preis.',
    how: 'So funktioniert es',
    playSoon: 'Google Play ist hier nicht als eigene Seite geöffnet.',
  },
  pages: {
    home: {
      title: 'Visueller Tagesplan für Kinder – Routinen, Belohnungen und Piktogramme | My Starday',
      description: 'Visuelle Tagespläne und Routinen, die einem Kind zeigen, was jetzt passiert und was danach kommt. Piktogramme, eine eigene Kinderansicht und Sterne für erledigte Schritte.',
      h1: 'Visuelle Tagespläne und Routinen, die einem Kind zeigen, was jetzt passiert und was danach kommt.',
      ogTitle: 'Visueller Tagesplan für Kinder',
      faqs: [
        { q: 'Was ist My Starday?', a: 'Ein visueller Tagesplan für Familien. Das Kind sieht den nächsten Schritt. Die erwachsene Person behält die Einstellungen.' },
        { q: 'Sind die Sterne käuflich?', a: 'Nein. Sterne gibt es für einen erledigten Schritt. Man kann sie nicht kaufen.' },
        { q: 'Ist das eine Behandlung?', a: 'Nein. My Starday ist Hilfe im Alltag und verspricht kein medizinisches Ergebnis.' },
      ],
      body(href) {
        return `
          <p class="lead">Ein Kind kommt zur Ruhe, wenn der nächste Schritt sichtbar ist. My Starday zeigt den Tag in Bildern: jetzt, danach, fertig.</p>
          <h2>Was das Kind sieht</h2>
          <p>Die Kinderansicht zeigt einen Schritt nach dem anderen. Die erwachsene Person legt den Plan an. Das Kind hakt ab. Mehrere Kinder können denselben Haushalt teilen, jedes mit eigenem Plan.</p>
          <h2>Sterne</h2>
          <p>Ein erledigter Schritt kann einen Stern geben. Sterne sind nicht käuflich. Sie ersetzen keine Absprache, die ihr vorher getroffen habt. Mehr dazu steht im <a href="${href('rewardSystem')}">Belohnungssystem</a>.</p>
          <h2>Keine Behandlung</h2>
          <p>Der Plan kann Kindern helfen, die mehr Übersicht brauchen, auch bei ADHS oder Autismus, und ebenso Familien ohne Diagnose. My Starday ist keine Behandlung und verspricht kein bestimmtes Ergebnis.</p>
          <p>Die deutschsprachige Website erklärt das Produkt. Das Land ist etwas anderes. Eigene Seiten gibt es für <a href="/de/de">Deutschland</a>, <a href="/de/at">Österreich</a>, <a href="/de/be">Belgien</a> und <a href="/de/lu">Luxemburg</a>.</p>
          <p><a href="${href('howItWorks')}">So funktioniert es</a> · <a href="${href('visualSchedule')}">Visueller Tagesplan</a> · <a href="${href('morningRoutine')}">Morgenroutine</a></p>
        `;
      },
    },
    howItWorks: {
      title: 'So funktioniert My Starday | Visueller Tagesplan',
      description: 'Die erwachsene Person legt den Tag an. Das Kind sieht den nächsten Schritt und hakt ihn ab. Sterne gibt es für erledigte Schritte, nicht zum Kaufen.',
      h1: 'So funktioniert My Starday',
      ogTitle: 'So funktioniert es',
      faqs: [
        { q: 'Wer stellt den Plan ein?', a: 'Eine erwachsene Person. Das Kind sieht die Kinderansicht und hakt Schritte ab.' },
        { q: 'Braucht das Kind ein E-Mail-Konto?', a: 'Nein. Das Kind meldet sich mit einem Namen und einer PIN an.' },
      ],
      body(href) {
        return `
          <p class="lead">Drei Dinge tragen den Morgen: ein sichtbarer Plan, ein Kind, das selbst abhakt, und eine erwachsene Person, die die Einstellungen behält.</p>
          <h2>1. Der Plan</h2>
          <p>Ihr legt Aktivitäten in der Reihenfolge an, die der Morgen wirklich hat. Bilder helfen, wenn das Kind noch nicht liest. Der <a href="${href('visualSchedule')}">visuelle Tagesplan</a> zeigt jetzt und danach.</p>
          <h2>2. Die Kinderansicht</h2>
          <p>Das Kind sieht den nächsten Schritt, nicht die Einstellungen der Familie. Es gibt dort keine Werbung und kein soziales Netzwerk.</p>
          <h2>3. Der Stern</h2>
          <p>Ein abgeschlossener Schritt kann einen Stern geben. Der Stern ist nicht käuflich. Die Absprache steht vorher fest, nicht mitten in der Aufregung.</p>
          <p>My Starday ist Alltagshilfe. Es ist keine Behandlung und ersetzt keinen Rat von Ärztin, Therapeut oder Schule.</p>
        `;
      },
    },
    visualSchedule: {
      title: 'Visueller Tagesplan für Kinder | My Starday',
      description: 'Ein visueller Tagesplan zeigt einem Kind, was jetzt passiert und was danach kommt. Wenige Schritte, bekannte Bilder, eine klare Reihenfolge.',
      h1: 'Visueller Tagesplan für Kinder',
      ogTitle: 'Visueller Tagesplan',
      faqs: [
        { q: 'Wie viele Schritte?', a: 'Oft reichen vier oder fünf. Eine längere Liste geht, wenn die Reihenfolge schon bekannt ist.' },
        { q: 'Fotos oder Symbole?', a: 'Bilder, die das Kind schon kennt. Fotos von zu Hause funktionieren gut.' },
      ],
      body(href) {
        return `
          <p class="lead">Ein visueller Tagesplan macht die Reihenfolge sichtbar. Das Kind muss nicht raten, was als Nächstes kommt.</p>
          <h2>Jetzt und danach</h2>
          <p>Zeigt nur den aktuellen Schritt und den nächsten. Eine lange Liste an der Wand hilft weniger als ein klarer nächster Handgriff.</p>
          <h2>Wenn ein Schritt stockt</h2>
          <ul>
            <li><strong>Teilt den Schritt.</strong> „Anziehen“ wird Socken, Hose, Shirt.</li>
            <li><strong>Einer nach dem anderen.</strong></li>
            <li><strong>Zeigen statt wiederholen.</strong></li>
          </ul>
          <p>Am Morgen steht die <a href="${href('morningRoutine')}">Morgenroutine</a> im Mittelpunkt. Über die Woche zeigt der <a href="${href('weeklySchedule')}">Wochenplan</a>, welcher Tag es ist.</p>
          <p>My Starday ist keine Behandlung und verspricht kein medizinisches Ergebnis.</p>
        `;
      },
    },
    morningRoutine: {
      title: 'Morgenroutine für Kinder | My Starday',
      description: 'Eine Morgenroutine mit Bildern senkt die Zahl der gesprochenen Erinnerungen. Dieselbe Reihenfolge, Tag für Tag.',
      h1: 'Morgenroutine für Kinder',
      ogTitle: 'Morgenroutine',
      faqs: [
        { q: 'Was gehört in den Morgen?', a: 'Nur das, was wirklich vor der Tür passiert. Aufstehen, anziehen, essen, Zähne, Jacke.' },
        { q: 'Was, wenn die Zeit knapp ist?', a: 'Kürzt die Liste, statt schneller zu reden. Ein kürzerer Plan ist ein echter Plan.' },
      ],
      body(href) {
        return `
          <p class="lead">Dieselbe Reihenfolge macht aus einer Liste eine Gewohnheit. Statt „Zähne putzen“ noch einmal zu sagen, schaut ihr auf das nächste Bild.</p>
          <h2>Beispiel</h2>
          <ol>
            <li>Aufstehen</li>
            <li>Toilette und Hände waschen</li>
            <li>Anziehen</li>
            <li>Frühstück</li>
            <li>Zähne putzen</li>
            <li>Jacke, Schuhe, Tasche</li>
          </ol>
          <p>Viele Kinder im Kindergartenalter kommen mit vier oder fünf Schritten besser zurecht.</p>
          <p>Familien, die mehr Halt bei Übergängen suchen, können den <a href="${href('neurodiverseRoutines')}">Ratgeber zur Übersicht</a> lesen. My Starday ist Stütze im Tag, keine Behandlung.</p>
        `;
      },
    },
    weeklySchedule: {
      title: 'Wochenplan mit Piktogrammen für Kinder | My Starday',
      description: 'Ein Wochenplan mit Piktogrammen zeigt, welcher Tag es ist, nicht nur was gerade passiert.',
      h1: 'Wochenplan mit Piktogrammen',
      ogTitle: 'Wochenplan mit Piktogrammen',
      faqs: [
        { q: 'Was ist der Unterschied zum Tagesplan?', a: 'Der Tagesplan sind die Schritte von heute. Der Wochenplan zeigt, wie sich die Tage unterscheiden.' },
        { q: 'Ab welchem Alter?', a: 'Oft rund um die Schulzeit, wenn die Woche mehr wechselt. Jüngere Kinder brauchen zuerst den heutigen Tag.' },
      ],
      body(href) {
        return `
          <p class="lead">Ein Wochenplan hilft, wenn Werktag und Wochenende verschieden sind oder wenn „Was ist morgen?“ eine Antwort vor dem Schlafen braucht.</p>
          <p>Montag mit Sport, Mittwoch beim anderen Elternteil, Freitag mit einem Film. Bilder machen das sichtbar, bevor ein Kind einen Kalender liest.</p>
          <p>Der <a href="${href('visualSchedule')}">Tagesplan</a> bleibt die Schritte von heute. Der Wochenplan sagt, welcher Tag es ist.</p>
          <p>My Starday verspricht kein medizinisches Ergebnis.</p>
        `;
      },
    },
    neurodiverseRoutines: {
      title: 'Routinen für neurodiverse Kinder | My Starday',
      description: 'Mehr Übersicht im Tag für Kinder, die klare Übergänge brauchen. My Starday ist Alltagshilfe, keine Behandlung und keine Diagnose.',
      h1: 'Routinen für neurodiverse Kinder',
      ogTitle: 'Routinen für neurodiverse Kinder',
      faqs: [
        { q: 'Ist das nur für eine Diagnose?', a: 'Nein. Der Plan hilft, wo mehr Übersicht gebraucht wird. Eine Diagnose ist keine Voraussetzung.' },
        { q: 'Ersetzt das Therapie?', a: 'Nein. Es ist keine Behandlung und ersetzt keinen Rat von Fachleuten.' },
      ],
      body(href) {
        return `
          <p class="lead">Manche Kinder brauchen den nächsten Schritt sichtbar, nicht lauter erklärt. Das gilt mit und ohne Diagnose.</p>
          <h2>ADHS: anfangen und beim Schritt bleiben</h2>
          <p>Der Wechsel stockt oft, weil der nächste Schritt nicht zu sehen ist. Ein Plan mit Häkchen gibt sofort Rückmeldung: dieser Schritt ist fertig.</p>
          <h2>Autismus: Vorhersehbarkeit</h2>
          <p>Eine andere Reihenfolge kann groß wirken. Ein <a href="${href('weeklySchedule')}">Wochenplan</a> zeigt vorher, welcher Tag kommt. Ein gestrichener Schritt sollte sichtbar geändert werden, nicht still verschwinden.</p>
          <p>My Starday ist Bildungshilfe im Alltag. Es ist keine medizinische Behandlung und ersetzt keinen Rat von Ärztin, Ergotherapie, Logopädie oder Schule. Karten im Sinne von zuerst, dann und fertig sind noch nicht als deutsches PDF verfügbar. Solche Karten sind angelehnt, keine offizielle Methode und keine Zertifizierung.</p>
        `;
      },
    },
    rewardSystem: {
      title: 'Belohnungssystem für Kinder | My Starday',
      description: 'Eine Belohnung, die ihr vorher absprecht, ist etwas anderes als ein Handel im Augenblick. Sterne verdient das Kind. Sie sind nicht käuflich.',
      h1: 'Belohnungssystem für Kinder, ohne es zum Handel zu machen',
      ogTitle: 'Belohnungssystem für Kinder',
      faqs: [
        { q: 'Ist eine Sternkarte Bestechung?', a: 'Nicht, wenn die Belohnung vorher feststeht und an etwas hängt, das das Kind tun kann. Einen Handel bietet man im Moment an, um etwas zu stoppen.' },
        { q: 'Wie viele Sterne?', a: 'Beginnt mit einem Stern pro erledigtem Schritt. Sterne sind nicht käuflich.' },
      ],
      body(href) {
        return `
          <p class="lead">„Ist das nicht einfach Bestechung?“ hängt davon ab, wann ihr die Absprache trefft. Vorher abgesprochen kann eine Karte eine Gewohnheit stützen. Mitten in der Wut wird sie zum Verhandeln.</p>
          <p>Auf einem <a href="${href('visualSchedule')}">visuellen Tagesplan</a> ist die Kette einfach: Schritt sehen, tun, abhaken, Stern bekommen.</p>
          <ol>
            <li>Seid konkret. Belohnt „putzt die Zähne ohne Erinnerung“, nicht „ist lieb“.</li>
            <li>Zeigt den Fortschritt.</li>
            <li>Zählt den Versuch, nicht nur den perfekten Morgen.</li>
            <li>Lasst das Kind bei der Belohnung mitdenken.</li>
            <li>Dünnt die Sterne aus, wenn die Gewohnheit steht.</li>
          </ol>
          <p>Sterne sind nicht käuflich. My Starday verspricht kein medizinisches Ergebnis.</p>
        `;
      },
    },
    resources: {
      title: 'Materialien für visuelle Routinen | My Starday',
      description: 'Was es auf Deutsch schon gibt, und was noch nicht als PDF vorliegt. Die App und ein gedrucktes Blatt sind zwei verschiedene Dinge.',
      h1: 'Materialien',
      ogTitle: 'Materialien',
      faqs: [
        { q: 'Gibt es deutsche PDFs?', a: 'Noch nicht. Diese Seite verkauft keine schwedischen Blätter als deutsche Übersetzung.' },
      ],
      body(href) {
        return `
          <p class="lead">Die App zeigt den Tag auf dem Bildschirm. Ein gedrucktes Blatt ist etwas anderes. Deutsche PDFs gibt es hier noch nicht.</p>
          <p>In der App legt ihr den <a href="${href('visualSchedule')}">Tagesplan</a>, die <a href="${href('morningRoutine')}">Morgenroutine</a> und den <a href="${href('weeklySchedule')}">Wochenplan</a> an. Das Kind sieht dieselbe Reihenfolge in der Kinderansicht.</p>
          <p>Wir verlinken keine Bibliothek in einer anderen Sprache, als wäre sie deutsch. Wenn deutsche Blätter dazukommen, stehen sie auf dieser Seite.</p>
        `;
      },
    },
    faq: {
      title: 'Häufige Fragen | My Starday',
      description: 'Kurze Antworten zu Tagesplan, Sternen, Kinderansicht, Preislogik und dazu, was My Starday nicht ist.',
      h1: 'Häufige Fragen',
      ogTitle: 'Häufige Fragen',
      faqs: [
        { q: 'Für wen ist die Website?', a: 'Die deutschsprachige Website erklärt das Produkt. Deutschland, Österreich, Belgien und Luxemburg haben eigene Marktseiten. Die Sprache bleibt Deutsch.' },
        { q: 'Kann ich Sterne kaufen?', a: 'Nein.' },
        { q: 'Ist das eine Therapie-App?', a: 'Nein. Keine Behandlung, kein versprochenes medizinisches Ergebnis.' },
        { q: 'Wo lege ich ein Konto an?', a: 'Über das bestehende Formular. Es fragt, wo die Familie wohnt. Eine Marktseite setzt das Land nicht selbst.' },
      ],
      body(href) {
        return `
          <p class="lead">Die kurzen Antworten. Längere Texte stehen in den Ratgebern.</p>
          <h2>Sprache und Land</h2>
          <p>Diese Website ist auf Deutsch. Das Land wählt ihr getrennt. Eine Marktseite ändert die Sprache nicht und legt kein Konto an.</p>
          <h2>Das Kind</h2>
          <p>Das Kind sieht den Plan und hakt ab. Einstellungen, Einladungen und das Konto bleiben bei der erwachsenen Person. Mehr steht unter <a href="${href('howItWorks')}">So funktioniert es</a>.</p>
          <h2>Sterne</h2>
          <p>Sterne gibt es für erledigte Schritte. Sie sind nicht käuflich. Lies das <a href="${href('rewardSystem')}">Belohnungssystem</a>.</p>
        `;
      },
    },
    privacy: {
      title: 'Datenschutzerklärung — My Starday',
      description: 'Welche Daten My Starday verarbeitet, was wir nicht sammeln, und welche Rechte die DSGVO gibt.',
      h1: 'Datenschutzerklärung für My Starday',
      ogTitle: 'Datenschutzerklärung',
      body: `
        <p class="updated">Zuletzt aktualisiert: Oktober 2026</p>
        <p>Wir gehen sorgfältig mit deiner Privatsphäre um. My Starday erhebt so wenig wie möglich: nur das, was die App zum Funktionieren braucht. Wir verkaufen deine Daten nicht und nutzen sie nicht für gezielte Werbung. Eine Weitergabe außerhalb des Dienstes geschieht nur, wenn du sie selbst wählst, oder wenn sie nötig ist, damit unsere Auftragsverarbeiter den Dienst betreiben.</p>
        <p><strong>Verantwortlicher:</strong> Papa Bravo AB ist verantwortlich für die Verarbeitung deiner personenbezogenen Daten. Du erreichst uns über das <a href="/en/contact">Kontaktformular</a>.</p>
        <h2>Was wir erheben</h2>
        <p>Wir verarbeiten Daten auf Grundlage des Vertrags, damit wir die App und die Funktionen bereitstellen können, für die du dich anmeldest. Über Erwachsene und Familien erheben wir:</p>
        <ul>
          <li><strong>E-Mail-Adresse</strong> — für die Anmeldung und Nachrichten zum Konto</li>
          <li><strong>Vor- und Nachname</strong> — um das Konto zu erkennen</li>
          <li><strong>Aktivitätsprotokoll</strong> — welche Aktivitäten erledigt wurden, und wann</li>
          <li><strong>Sterne</strong> — verdiente und eingelöste Sterne</li>
          <li><strong>Pläne und Aktivitäten</strong> — was du selbst anlegst</li>
        </ul>
        <p><strong>Privatsphäre von Kindern:</strong> ein Kind ist nur an einem Vornamen oder Spitznamen und einem gewählten Emoji erkennbar. Wir erheben keinen Nachnamen, keine Personennummer und keine Kontaktdaten eines Kindes.</p>
        <h2>Was wir nicht erheben</h2>
        <ul>
          <li>Keine Nachnamen von Kindern</li>
          <li>Keine Personennummern, weder von Erwachsenen noch von Kindern</li>
          <li>Keine Angaben zu Gesundheit, Diagnose oder Behinderung eines Kindes</li>
          <li>Keine Zahlungsdaten. Käufe laufen über den App Store oder Google Play</li>
          <li>Keine Standortdaten</li>
        </ul>
        <h2>Wofür wir die Daten nutzen</h2>
        <ul>
          <li>Dem Kind den Tagesplan zeigen</li>
          <li>Fortschritt und Sterne speichern</li>
          <li>Bestätigungsmail und Kontonachrichten senden</li>
          <li>Auf Nachrichten antworten, die du uns schickst</li>
        </ul>
        <h2>Weitergabe</h2>
        <p>Wir geben deine Daten nicht zu Werbezwecken an Dritte weiter. Diese Auftragsverarbeiter betreiben den Dienst. Sie verarbeiten nur in unserem Auftrag und nach der DSGVO:</p>
        <ul>
          <li><strong>Neon (Datenbank)</strong> — Konto, Pläne, Aktivitäten und Familiendaten</li>
          <li><strong>Eigenes Hosting (VPS in der EU/im EWR)</strong> — die Web-App und die API</li>
          <li><strong>Resend (E-Mail)</strong> — Transaktionsmail, etwa Bestätigung, Passwort und Willkommensmail</li>
          <li><strong>Cloudflare R2</strong> — hochgeladene Profilfotos, wenn du diese Funktion nutzt</li>
          <li><strong>Apple und Google</strong> — Anmeldung und Push-Nachrichten über APNs und FCM, wenn du diese Funktionen nutzt</li>
        </ul>
        <h2>Bericht für ein Gespräch</h2>
        <p>Wenn du als sorgeberechtigte Person einen zeitlich begrenzten Link zu einer Zusammenfassung ausgewählter Aktivitäts- und Belohnungszahlen erstellst, kannst du ihn zum Beispiel mit einer Lehrkraft oder einer therapeutischen Fachperson teilen. Das geschieht nur, weil du es wählst. Du bestimmst den Inhalt und kannst den Link widerrufen. Die empfangende Person braucht kein Konto.</p>
        <p>Schützt du einen Link mit einem Code, teile den Code nicht in derselben Nachricht wie den Link.</p>
        <h2>Anmeldung über Apple oder Google</h2>
        <ul>
          <li><strong>Anmeldung mit Apple:</strong> wir verarbeiten Name und E-Mail-Adresse. Wählst du „E-Mail verbergen“, speichern wir die eindeutige Weiterleitungsadresse, die Apple erzeugt, damit wir Kontonachrichten senden können.</li>
          <li><strong>Anmeldung mit Google:</strong> wir erhalten und speichern die E-Mail-Adresse und den Namen des Google-Kontos, um das Profil anzulegen.</li>
        </ul>
        <p>Für die Verarbeitung durch Apple und Google selbst gelten deren eigene Datenschutzerklärungen.</p>
        <h2>Push-Nachrichten und Geräte-Token</h2>
        <p>Aktivierst du Push-Nachrichten, speichern wir auf Grundlage deiner Einwilligung ein eindeutiges Geräte-Token (APNs oder FCM), damit die Nachricht auf dem richtigen Gerät ankommt. Das Token hängt an deinem Konto.</p>
        <p>Token verfallen beim Abmelden oder wenn die Plattform das Token als ungültig meldet. Wir speichern kein Gerätemerkmal ohne ein aktives Push-Abonnement. Ausschalten geht in den Einstellungen der App oder am Gerät.</p>
        <h2>Speicherdauer</h2>
        <p>Wir speichern Daten, solange das Konto aktiv ist. Löschst du das Konto, werden alle Daten sofort und dauerhaft gelöscht.</p>
        <h2>Konto löschen</h2>
        <p>Du löschst das Konto in der App über die Einstellungen. Du bestätigst mit deinem Passwort oder über die Anmeldung des Drittanbieters.</p>
        <p>Das lässt sich nicht rückgängig machen. Weg sind dann das Elternkonto, die Kinderprofile, Pläne, Tagesprotokolle, Bewertungen, Belohnungen und Einladungen.</p>
        <h2>Speicherung und Sicherheit</h2>
        <p>Wir streben an, Kerndaten in der EU/im EWR zu speichern, wo das gilt. Manche Anbieter können außerhalb des EWR verarbeiten. Übermittlung und Garantien stehen in dieser Erklärung und werden fortlaufend geprüft. Verbindungen sind verschlüsselt (HTTPS). Passwörter stehen nicht im Klartext. Wir verwenden bcrypt.</p>
        <h2>Cookies</h2>
        <ul>
          <li><strong>Unbedingt erforderliche Cookies</strong> — immer an. Sitzung und CSRF-Schutz für eine sichere Anmeldung.</li>
          <li><strong>Einstellungen</strong> — lokal gespeichert, zum Beispiel ein Thema.</li>
          <li><strong>Statistik und Marketing</strong> — Google Analytics 4, Meta Pixel und Google Ads. Standardmäßig aus, bis du über den Cookie-Hinweis einwilligst.</li>
        </ul>
        <p>Deine Wahl speichern wir höchstens ein Jahr. Du kannst sie über den Hinweis oder die Einstellungen ändern. Routinedaten von Kindern gehen nicht an Werbeplattformen.</p>
        <h2>Deine Rechte (DSGVO)</h2>
        <ul>
          <li>Recht, dein Konto und die Daten zu löschen</li>
          <li>Recht auf Auskunft</li>
          <li>Recht, unrichtige Daten berichtigen zu lassen</li>
          <li>Recht auf Widerspruch oder Einschränkung</li>
          <li>Recht, eine Beschwerde bei der schwedischen Aufsicht Integritetsskyddsmyndigheten (IMY) einzureichen, wenn du meinst, dass wir die DSGVO verletzen</li>
        </ul>
        <h2>Kontakt</h2>
        <p>Fragen zu dieser Verarbeitung? Nutze das <a href="/en/contact">Kontaktformular</a>.</p>
      `,
    },
    terms: {
      title: 'Nutzungsbedingungen — My Starday',
      description: 'Die Bedingungen für die Nutzung von My Starday: Konto, Kinder, Preis und Haftung.',
      h1: 'Nutzungsbedingungen',
      ogTitle: 'Nutzungsbedingungen',
      body: `
        <p class="updated">Zuletzt aktualisiert: Oktober 2026</p>
        <p>Danke, dass du My Starday nutzt. Diese Bedingungen sollen klar und ehrlich sein. Fragen stellst du über das <a href="/en/contact">Kontaktformular</a>.</p>
        <h2>1. Über den Dienst</h2>
        <p>My Starday ist ein digitaler Dienst für Familien, die einen strukturierten Tagesplan wollen, den Fortschritt eines Kindes mit Sternen markieren und das Kind Aktivitäten in einer eigenen Ansicht verfolgen lassen. Der Dienst ist für Eltern und Sorgeberechtigte und ihre Kinder. Eine Familie hat mindestens eine erwachsene Person mit einem Konto. Kinder melden sich mit einer PIN in der Kinderansicht an.</p>
        <h2>2. Konto und Sicherheit</h2>
        <ul>
          <li>Wähle ein starkes Passwort und teile es nicht</li>
          <li>Schütze deine E-Mail-Adresse. Damit stellst du den Zugang wieder her</li>
          <li>Die PIN der Kinderansicht ist nur für das Kind und die Sorgeberechtigten</li>
          <li>Nutze die App nicht auf eine Weise, die gegen schwedisches Recht verstößt</li>
        </ul>
        <p>Du bist verantwortlich für alles, was unter deinem Konto geschieht, auch wenn jemand anders es nutzt. Vermutest du Missbrauch, nimm sofort Kontakt auf.</p>
        <h2>3. Kinder und personenbezogene Daten</h2>
        <p>My Starday verarbeitet Daten über Kinder. Wir folgen der DSGVO und dem Grundsatz der Datenminimierung:</p>
        <ul>
          <li>Kinder sind an einem Vornamen und einem gewählten Emoji erkennbar. Kein Nachname, keine Personennummer, keine Kontaktdaten</li>
          <li>Eltern oder Sorgeberechtigte tragen die Daten ein und stimmen dem Teilen zu</li>
          <li>Wir nutzen Daten von Kindern nicht für Werbung und für nichts anderes als den Dienst</li>
          <li>Berichte und Pläne werden nur geteilt, wenn eine erwachsene Person selbst einen zeitlich begrenzten Link teilt</li>
        </ul>
        <h2>4. Inhalte, die du erstellst</h2>
        <p>Pläne, Belohnungen, Aktivitäten und Beobachtungen, die du hinzufügst, gehören dir oder deiner Familie. Du gibst uns das Recht, diese Inhalte zu speichern und anzuzeigen, solange das Konto aktiv ist. Wir kopieren sie nicht für Werbung, verkaufen sie nicht und nutzen sie nicht im Marketing.</p>
        <h2>5. Nutzung</h2>
        <p>Der Dienst ist für den persönlichen Gebrauch in deiner Familie. Nicht erlaubt ist:</p>
        <ul>
          <li>Gewerbliche Nutzung ohne Absprache mit Papa Bravo AB</li>
          <li>Pläne, Sterne oder Belohnungen außerhalb der gewöhnlichen Abläufe der App zu manipulieren</li>
          <li>Automatisierte Mittel, Scraper oder Bots gegen den Dienst</li>
          <li>Inhalte zu veröffentlichen, die rechtswidrig, beleidigend oder schädlich sind</li>
        </ul>
        <h2>6. Beenden und Löschen</h2>
        <p>Du kannst das Konto jederzeit dauerhaft über die Einstellungen in der App löschen, bestätigt mit deinem Passwort.</p>
        <p>Das Löschen entfernt sofort und dauerhaft das Elternkonto, alle Kinder, Pläne, Aktivitätsprotokolle, Sterne, Belohnungen und etwaige Beobachtungen.</p>
        <p>Wir können ein Konto sperren, das diese Bedingungen oder schwedisches Recht verletzt.</p>
        <h2>7. Preis</h2>
        <p>Familien in Irland und Kanada können My Starday bis einschließlich 31. Dezember 2026 kostenfrei nutzen. In diesem Zeitraum ist keine Zahlung nötig. Der kostenfreie Zeitraum wird nicht automatisch zu einem Abonnement. Ab dem 1. Januar 2027 kannst du ein Abonnement im App Store oder bei Google Play wählen. Auf dieser Seite gibt es keine Webkasse. In anderen Ländern gelten der Preis und der Zugang, den die App für dieses Land zeigt. Schwedische Familien, die ab dem 3. Oktober 2026 starten, können die App 14 Tage probieren und danach 59 schwedische Kronen im Monat oder 590 schwedische Kronen im Jahr in der App wählen. Familien, die schon ein Konto haben, behalten ihr bestehendes Angebot.</p>
        <h2>8. Änderungen</h2>
        <p>Wir können diese Bedingungen anpassen, zum Beispiel nach einer Gesetzesänderung, einer neuen Funktion oder einer Klarstellung. Ist eine Änderung wesentlich, teilen wir das per E-Mail oder mit einem Hinweis in der App mit.</p>
        <p>Nutzt du den Dienst danach weiter, gilt das als Annahme der neuen Bedingungen.</p>
        <h2>9. Haftung</h2>
        <p>My Starday wird bereitgestellt, wie es ist. Wir tun unser Bestes, den Dienst stabil und sicher zu halten, können aber nicht garantieren, dass er immer ohne Unterbrechung verfügbar ist.</p>
        <p>Papa Bravo AB haftet nicht für:</p>
        <ul>
          <li>Datenverlust durch höhere Gewalt</li>
          <li>Schaden, weil du eine PIN oder Anmeldedaten mit jemandem teilst, der sie nicht haben soll</li>
          <li>Mittelbaren Schaden, entgangene Chance oder verlorene Daten, sofern schwedisches Recht nichts anderes verlangt</li>
        </ul>
        <p>Du bist verantwortlich für eine Nutzung nach diesen Bedingungen und nach schwedischem Recht.</p>
        <h2>10. Kontakt</h2>
        <p>Fragen zu diesen Bedingungen oder zum Dienst? Nutze das <a href="/en/contact">Kontaktformular</a>.</p>
      `,
    },
  },
});

module.exports = { pageFor };
