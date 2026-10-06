'use strict';

/**
 * French public pages. Written in French.
 * Legal text translates the verified baseline. It adds no French statute.
 */

const { defineLocalePages } = require('../locale-pack');

const pageFor = defineLocalePages('fr', {
  market: {
    title: (name) => `My Starday en ${name} — emplois du temps visuels pour enfants`,
    description: (name) => `La page marché pour ${name}. Emplois du temps visuels en français. C’est une page marché, pas un site de langue distinct.`,
    h1: (name) => `Emplois du temps visuels pour les familles en ${name}`,
    lead: (name) => `Voici la page pour ${name}. Le site en français reste un site de langue.`,
    registrationOpen: (name) => `Les nouveaux comptes en ${name} suivent l’inscription déjà en place. Le réglage par défaut est ouvert.`,
    registrationClosed: (name) => `Les nouveaux comptes en ${name} ne sont pas ouverts par défaut. Cela suit l’inscription déjà en place, pas cette page. Le réglage par défaut est fermé.`,
    complimentary: (name) => `La période gratuite déjà en place s’applique en ${name}. Elle ne devient pas un abonnement toute seule. Cette page ne fixe pas de prix.`,
    introYear: (name) => `${name} garde l’offre déjà publiée sur le site suédois. Cette page ne fixe pas de prix. Il n’y a pas de période gratuite jusqu’au 31 décembre 2026 sur ce marché.`,
    trial: (name, days) => `Si un compte devient possible ici plus tard, la règle déjà en place hors Suède, Irlande et Canada est un essai de ${days} jours. Le paiement doit d’abord être disponible. Il n’y a pas de période gratuite jusqu’au 31 décembre 2026 sur ce marché, et rien ne devient un abonnement tout seul. Cette page ne fixe pas de prix.`,
    notTreatment: (name) => `Le bouton ouvre la fiche générale de l’App Store, pas une fiche inventée pour ${name}. My Starday est un emploi du temps visuel. Ce n’est pas un traitement et cela ne promet aucun résultat médical.`,
    register: 'Créer un compte',
    registerNote: 'Le formulaire demande où vit la famille. Ce lien ne fixe ni le pays ni le prix.',
    how: 'Comment ça marche',
    playSoon: 'Google Play n’est pas ouvert ici comme page distincte.',
  },
  pages: {
    home: {
      title: 'Emploi du temps visuel pour enfants – routines, récompenses et pictogrammes | My Starday',
      description: 'Des emplois du temps visuels qui montrent à un enfant ce qui se passe maintenant et ce qui vient ensuite. Pictogrammes, une vue enfant, et des étoiles pour les étapes terminées.',
      h1: 'Des emplois du temps visuels qui montrent à un enfant ce qui se passe maintenant et ce qui vient ensuite.',
      ogTitle: 'Emploi du temps visuel pour enfants',
      faqs: [
        { q: 'Qu’est-ce que My Starday ?', a: 'Un emploi du temps visuel pour les familles. L’enfant voit l’étape suivante. L’adulte garde les réglages.' },
        { q: 'Les étoiles s’achètent-elles ?', a: 'Non. Une étoile vient d’une étape terminée. On ne peut pas l’acheter.' },
        { q: 'Est-ce un traitement ?', a: 'Non. My Starday aide le quotidien et ne promet aucun résultat médical.' },
      ],
      body(href) {
        return `
          <p class="lead">Un enfant se pose quand l’étape suivante est visible. My Starday montre la journée en images : maintenant, ensuite, terminé.</p>
          <h2>Ce que l’enfant voit</h2>
          <p>La vue enfant montre une étape à la fois. L’adulte prépare le planning. L’enfant coche. Plusieurs enfants peuvent partager le même foyer, chacun avec son planning.</p>
          <h2>Les étoiles</h2>
          <p>Une étape terminée peut donner une étoile. Les étoiles ne s’achètent pas. Elles ne remplacent pas un accord pris avant. Le détail est dans le <a href="${href('rewardSystem')}">système de récompenses</a>.</p>
          <h2>Pas un traitement</h2>
          <p>Le planning peut aider les enfants qui ont besoin de plus de clarté, y compris avec un TDAH ou un autisme, et aussi les familles sans diagnostic. My Starday n’est pas un traitement et ne promet aucun résultat précis.</p>
          <p>Le site en français explique le produit. Le pays est autre chose. Des pages distinctes existent pour la <a href="/fr/fr">France</a>, la <a href="/fr/be">Belgique</a> et le <a href="/fr/lu">Luxembourg</a>.</p>
          <p><a href="${href('howItWorks')}">Comment ça marche</a> · <a href="${href('visualSchedule')}">Emploi du temps visuel</a> · <a href="${href('morningRoutine')}">Routine du matin</a></p>
        `;
      },
    },
    howItWorks: {
      title: 'Comment fonctionne My Starday | Emploi du temps visuel',
      description: 'L’adulte prépare la journée. L’enfant voit l’étape suivante et la coche. Les étoiles récompensent une étape faite, elles ne s’achètent pas.',
      h1: 'Comment fonctionne My Starday',
      ogTitle: 'Comment ça marche',
      faqs: [
        { q: 'Qui règle le planning ?', a: 'Un adulte. L’enfant voit la vue enfant et coche les étapes.' },
        { q: 'L’enfant a-t-il besoin d’une adresse e-mail ?', a: 'Non. L’enfant se connecte avec un prénom et un code.' },
      ],
      body(href) {
        return `
          <p class="lead">Trois choses portent le matin : un planning visible, un enfant qui coche lui-même, et un adulte qui garde les réglages.</p>
          <h2>1. Le planning</h2>
          <p>Vous placez les activités dans l’ordre réel du matin. Les images aident quand l’enfant ne lit pas encore. L’<a href="${href('visualSchedule')}">emploi du temps visuel</a> montre maintenant et ensuite.</p>
          <h2>2. La vue enfant</h2>
          <p>L’enfant voit l’étape suivante, pas les réglages de la famille. Il n’y a ni publicité ni réseau social dans cette vue.</p>
          <h2>3. L’étoile</h2>
          <p>Une étape cochée peut donner une étoile. L’étoile ne s’achète pas. L’accord est pris avant, pas au milieu de l’énervement.</p>
          <p>My Starday aide le quotidien. Ce n’est pas un traitement et cela ne remplace pas l’avis d’un médecin, d’un thérapeute ou de l’école.</p>
        `;
      },
    },
    visualSchedule: {
      title: 'Emploi du temps visuel pour enfants | My Starday',
      description: 'Un emploi du temps visuel montre à un enfant ce qui se passe maintenant et ce qui vient ensuite. Peu d’étapes, des images connues, un ordre clair.',
      h1: 'Emploi du temps visuel pour enfants',
      ogTitle: 'Emploi du temps visuel',
      faqs: [
        { q: 'Combien d’étapes ?', a: 'Souvent quatre ou cinq suffisent. Une liste plus longue va si l’ordre est déjà connu.' },
        { q: 'Photos ou symboles ?', a: 'Des images que l’enfant reconnaît déjà. Les photos de la maison marchent bien.' },
      ],
      body(href) {
        return `
          <p class="lead">Un emploi du temps visuel rend l’ordre visible. L’enfant n’a pas à deviner la suite.</p>
          <h2>Maintenant et ensuite</h2>
          <p>Montrez l’étape en cours et la suivante. Une longue liste au mur aide moins qu’un geste clair.</p>
          <h2>Si une étape bloque</h2>
          <ul>
            <li><strong>Coupez l’étape.</strong> « S’habiller » devient chaussettes, pantalon, t-shirt.</li>
            <li><strong>Une à la fois.</strong></li>
            <li><strong>Montrer plutôt que répéter.</strong></li>
          </ul>
          <p>Le matin, c’est la <a href="${href('morningRoutine')}">routine du matin</a>. Sur la semaine, le <a href="${href('weeklySchedule')}">planning hebdomadaire</a> dit quel jour on est.</p>
          <p>My Starday n’est pas un traitement et ne promet aucun résultat médical.</p>
        `;
      },
    },
    morningRoutine: {
      title: 'Routine du matin pour enfants | My Starday',
      description: 'Une routine du matin en images réduit le nombre de rappels parlés. Le même ordre, jour après jour.',
      h1: 'Routine du matin pour enfants',
      ogTitle: 'Routine du matin',
      faqs: [
        { q: 'Que met-on le matin ?', a: 'Seulement ce qui arrive vraiment avant la porte. Lever, habillage, repas, dents, manteau.' },
        { q: 'Et si le temps manque ?', a: 'Raccourcissez la liste au lieu de parler plus vite. Un planning plus court est un vrai planning.' },
      ],
      body(href) {
        return `
          <p class="lead">Le même ordre transforme une liste en habitude. Au lieu de redire « brosse tes dents », vous regardez l’image suivante.</p>
          <h2>Exemple</h2>
          <ol>
            <li>Se lever</li>
            <li>Toilettes et mains</li>
            <li>S’habiller</li>
            <li>Petit-déjeuner</li>
            <li>Dents</li>
            <li>Manteau, chaussures, sac</li>
          </ol>
          <p>Beaucoup d’enfants d’âge maternel s’en sortent mieux avec quatre ou cinq étapes.</p>
          <p>Les familles qui cherchent plus d’appui dans les transitions peuvent lire le <a href="${href('neurodiverseRoutines')}">guide sur la clarté</a>. My Starday soutient la journée, ce n’est pas un traitement.</p>
        `;
      },
    },
    weeklySchedule: {
      title: 'Planning hebdomadaire avec pictogrammes | My Starday',
      description: 'Un planning hebdomadaire avec pictogrammes montre quel jour on est, pas seulement ce qui se passe maintenant.',
      h1: 'Planning hebdomadaire avec pictogrammes',
      ogTitle: 'Planning hebdomadaire',
      faqs: [
        { q: 'Quelle différence avec le planning du jour ?', a: 'Le jour, ce sont les étapes d’aujourd’hui. La semaine montre en quoi les jours diffèrent.' },
        { q: 'À partir de quel âge ?', a: 'Souvent vers l’âge scolaire, quand la semaine change davantage. Les plus jeunes ont d’abord besoin d’aujourd’hui.' },
      ],
      body(href) {
        return `
          <p class="lead">Un planning de semaine aide quand la semaine et le week-end diffèrent, ou quand « c’est quoi demain ? » a besoin d’une réponse avant le sommeil.</p>
          <p>Lundi avec le sport, mercredi chez l’autre parent, vendredi avec un film. Les images rendent cela visible avant qu’un enfant lise un calendrier.</p>
          <p>L’<a href="${href('visualSchedule')}">emploi du temps visuel</a> reste les étapes d’aujourd’hui. Le planning de semaine dit quel jour on est.</p>
          <p>My Starday ne promet aucun résultat médical.</p>
        `;
      },
    },
    neurodiverseRoutines: {
      title: 'Routines pour enfants neurodivergents | My Starday',
      description: 'Plus de clarté dans la journée pour les enfants qui ont besoin de transitions nettes. My Starday aide le quotidien, ce n’est ni un traitement ni un diagnostic.',
      h1: 'Routines pour enfants neurodivergents',
      ogTitle: 'Routines pour enfants neurodivergents',
      faqs: [
        { q: 'Faut-il un diagnostic ?', a: 'Non. Le planning aide là où il faut plus de clarté. Un diagnostic n’est pas une condition.' },
        { q: 'Cela remplace-t-il une thérapie ?', a: 'Non. Ce n’est pas un traitement et cela ne remplace pas l’avis de professionnels.' },
      ],
      body(href) {
        return `
          <p class="lead">Certains enfants ont besoin de voir l’étape suivante, pas de l’entendre plus fort. Cela vaut avec ou sans diagnostic.</p>
          <h2>TDAH : commencer et rester sur l’étape</h2>
          <p>Le passage bloque souvent parce que l’étape suivante n’est pas visible. Un planning avec une case donne un retour tout de suite : cette étape est faite.</p>
          <h2>Autisme : la journée prévisible</h2>
          <p>Un ordre différent peut peser. Un <a href="${href('weeklySchedule')}">planning hebdomadaire</a> montre à l’avance quel jour arrive. Une étape retirée doit être changée visiblement, pas disparaître en silence.</p>
          <p>My Starday est une aide éducative au quotidien. Ce n’est pas un traitement médical et cela ne remplace pas l’avis d’un médecin, d’un ergothérapeute, d’un orthophoniste ou de l’école. Des cartes du type d’abord, ensuite et terminé ne sont pas encore disponibles en PDF français. Ces cartes s’en inspirent : ce n’est ni une méthode officielle ni une certification.</p>
        `;
      },
    },
    rewardSystem: {
      title: 'Système de récompenses pour enfants | My Starday',
      description: 'Une récompense convenue avant n’est pas un marchandage sur le moment. L’enfant gagne les étoiles. Elles ne s’achètent pas.',
      h1: 'Système de récompenses pour enfants, sans en faire un marchandage',
      ogTitle: 'Système de récompenses',
      faqs: [
        { q: 'Une carte d’étoiles, c’est du chantage ?', a: 'Non, si la récompense est fixée avant et liée à quelque chose que l’enfant peut faire. Le marchandage, on le propose sur le moment pour faire cesser quelque chose.' },
        { q: 'Combien d’étoiles ?', a: 'Commencez par une étoile par étape terminée. Les étoiles ne s’achètent pas.' },
      ],
      body(href) {
        return `
          <p class="lead">« Ce n’est pas du chantage ? » dépend du moment où vous prenez l’accord. Convenu avant, un tableau peut soutenir une habitude. Proposé en pleine colère, il devient une négociation.</p>
          <p>Sur un <a href="${href('visualSchedule')}">emploi du temps visuel</a>, la chaîne est simple : voir l’étape, la faire, la cocher, recevoir l’étoile.</p>
          <ol>
            <li>Soyez précis. Récompensez « se brosse les dents sans rappel », pas « est gentil ».</li>
            <li>Montrez l’avancée.</li>
            <li>Comptez l’essai, pas seulement le matin parfait.</li>
            <li>Laissez l’enfant participer au choix de la récompense.</li>
            <li>Espacez les étoiles quand l’habitude tient.</li>
          </ol>
          <p>Les étoiles ne s’achètent pas. My Starday ne promet aucun résultat médical.</p>
        `;
      },
    },
    resources: {
      title: 'Ressources pour les routines visuelles | My Starday',
      description: 'Ce qui existe déjà en français, et ce qui n’est pas encore un PDF. L’application et une feuille imprimée sont deux choses différentes.',
      h1: 'Ressources',
      ogTitle: 'Ressources',
      faqs: [
        { q: 'Y a-t-il des PDF en français ?', a: 'Pas encore. Cette page ne vend pas des feuilles suédoises comme si elles étaient traduites.' },
      ],
      body(href) {
        return `
          <p class="lead">L’application montre la journée à l’écran. Une feuille imprimée est autre chose. Il n’y a pas encore de PDF en français ici.</p>
          <p>Dans l’application, vous préparez l’<a href="${href('visualSchedule')}">emploi du temps</a>, la <a href="${href('morningRoutine')}">routine du matin</a> et le <a href="${href('weeklySchedule')}">planning de la semaine</a>. L’enfant voit le même ordre dans la vue enfant.</p>
          <p>Nous ne lions pas une bibliothèque dans une autre langue comme si elle était française. Si des feuilles en français arrivent, elles seront sur cette page.</p>
        `;
      },
    },
    faq: {
      title: 'Questions fréquentes | My Starday',
      description: 'Réponses courtes sur le planning, les étoiles, la vue enfant, et sur ce que My Starday n’est pas.',
      h1: 'Questions fréquentes',
      ogTitle: 'Questions fréquentes',
      faqs: [
        { q: 'Pour qui est ce site ?', a: 'Le site en français explique le produit. La France, la Belgique et le Luxembourg ont des pages marché. La langue reste le français.' },
        { q: 'Puis-je acheter des étoiles ?', a: 'Non.' },
        { q: 'Est-ce une application de thérapie ?', a: 'Non. Pas de traitement, pas de résultat médical promis.' },
        { q: 'Où créer un compte ?', a: 'Par le formulaire déjà en place. Il demande où vit la famille. Une page marché ne fixe pas le pays toute seule.' },
      ],
      body(href) {
        return `
          <p class="lead">Les réponses courtes. Les textes plus longs sont dans les guides.</p>
          <h2>Langue et pays</h2>
          <p>Ce site est en français. Le pays se choisit à part. Une page marché ne change pas la langue et ne crée pas de compte.</p>
          <h2>L’enfant</h2>
          <p>L’enfant voit le planning et coche. Les réglages, les invitations et le compte restent chez l’adulte. La suite est dans <a href="${href('howItWorks')}">Comment ça marche</a>.</p>
          <h2>Les étoiles</h2>
          <p>Les étoiles viennent des étapes terminées. Elles ne s’achètent pas. Lisez le <a href="${href('rewardSystem')}">système de récompenses</a>.</p>
        `;
      },
    },
    privacy: {
      title: 'Politique de confidentialité — My Starday',
      description: 'Quelles données My Starday traite, ce que nous ne collectons pas, et quels droits le RGPD donne.',
      h1: 'Politique de confidentialité de My Starday',
      ogTitle: 'Confidentialité',
      body: `
        <p class="updated">Dernière mise à jour : octobre 2026</p>
        <p>Nous traitons votre vie privée avec soin. My Starday collecte le moins possible : seulement ce dont l’application a besoin pour fonctionner. Nous ne vendons pas vos données et nous ne les utilisons pas pour de la publicité ciblée. Un partage hors du service n’a lieu que si vous le choisissez, ou s’il est nécessaire pour que nos sous-traitants fassent tourner le service.</p>
        <p><strong>Responsable du traitement :</strong> Papa Bravo AB est responsable du traitement de vos données personnelles. Vous nous joignez par le <a href="/en/contact">formulaire de contact</a>.</p>
        <h2>Ce que nous collectons</h2>
        <p>Nous traitons des données sur la base du contrat, afin de fournir l’application et les fonctions pour lesquelles vous vous inscrivez. Sur les adultes et les familles, nous collectons :</p>
        <ul>
          <li><strong>Adresse e-mail</strong> — pour la connexion et les messages sur le compte</li>
          <li><strong>Prénom et nom</strong> — pour reconnaître le compte</li>
          <li><strong>Journal d’activités</strong> — quelles activités sont terminées, et quand</li>
          <li><strong>Étoiles</strong> — étoiles gagnées et échangées</li>
          <li><strong>Plannings et activités</strong> — ce que vous créez</li>
        </ul>
        <p><strong>Vie privée des enfants :</strong> un enfant n’est reconnaissable que par un prénom ou un surnom et un emoji choisi. Nous ne collectons ni nom de famille, ni numéro personnel, ni coordonnées d’un enfant.</p>
        <h2>Ce que nous ne collectons pas</h2>
        <ul>
          <li>Pas de noms de famille d’enfants</li>
          <li>Pas de numéros personnels, ni pour les adultes ni pour les enfants</li>
          <li>Pas de données de santé, de diagnostic ou de handicap d’un enfant</li>
          <li>Pas de données de paiement. Les achats passent par l’App Store ou Google Play</li>
          <li>Pas de données de localisation</li>
        </ul>
        <h2>À quoi servent les données</h2>
        <ul>
          <li>Montrer le planning du jour à l’enfant</li>
          <li>Garder l’avancée et les étoiles</li>
          <li>Envoyer le courriel de vérification et les messages de compte</li>
          <li>Répondre aux messages que vous nous envoyez</li>
        </ul>
        <h2>Partage</h2>
        <p>Nous ne partageons pas vos données avec des tiers pour de la publicité. Ces sous-traitants font tourner le service. Ils traitent seulement pour notre compte et selon le RGPD :</p>
        <ul>
          <li><strong>Neon (base de données)</strong> — compte, plannings, activités et données de la famille</li>
          <li><strong>Hébergement propre (VPS dans l’UE/l’EEE)</strong> — l’application web et l’API</li>
          <li><strong>Resend (e-mail)</strong> — courriels transactionnels, comme la vérification, le mot de passe et le message de bienvenue</li>
          <li><strong>Cloudflare R2</strong> — photos de profil téléversées si vous utilisez cette fonction</li>
          <li><strong>Apple et Google</strong> — connexion et notifications push via APNs et FCM si vous utilisez ces fonctions</li>
        </ul>
        <h2>Compte rendu pour un entretien</h2>
        <p>Si vous créez, en tant qu’adulte responsable, un lien temporaire vers un résumé de chiffres d’activités et de récompenses choisis, vous pouvez le partager par exemple avec un enseignant ou un thérapeute. Cela n’arrive que parce que vous le choisissez. Vous décidez du contenu et vous pouvez retirer le lien. La personne qui le reçoit n’a pas besoin de compte.</p>
        <p>Si vous protégez un lien par un code, ne partagez pas ce code dans le même message que le lien.</p>
        <h2>Connexion avec Apple ou Google</h2>
        <ul>
          <li><strong>Connexion avec Apple :</strong> nous traitons le nom et l’adresse e-mail. Si vous choisissez « Masquer mon e-mail », nous conservons l’adresse de relais unique créée par Apple, afin d’envoyer les messages de compte.</li>
          <li><strong>Connexion avec Google :</strong> nous recevons et conservons l’adresse e-mail et le nom du compte Google pour créer le profil.</li>
        </ul>
        <p>Le traitement effectué par Apple et Google eux-mêmes suit leurs propres politiques de confidentialité.</p>
        <h2>Notifications et jetons d’appareil</h2>
        <p>Si vous activez les notifications, nous conservons, sur la base de votre consentement, un jeton d’appareil unique (APNs ou FCM) pour que le message arrive sur le bon appareil. Le jeton est lié à votre compte.</p>
        <p>Les jetons expirent à la déconnexion, ou si la plateforme signale le jeton comme invalide. Nous ne conservons pas de caractéristique d’appareil sans un abonnement push actif. Vous désactivez cela dans les réglages de l’application ou sur l’appareil.</p>
        <h2>Durée de conservation</h2>
        <p>Nous conservons les données tant que le compte est actif. Si vous supprimez le compte, toutes les données sont effacées tout de suite et de façon définitive.</p>
        <h2>Supprimer le compte</h2>
        <p>Vous supprimez le compte dans l’application, via les réglages. Vous confirmez avec votre mot de passe, ou via la connexion tierce.</p>
        <p>C’est irréversible. Disparaissent alors le compte adulte, les profils enfants, les plannings, les journaux, les évaluations, les récompenses et les invitations.</p>
        <h2>Stockage et sécurité</h2>
        <p>Nous visons à stocker les données centrales dans l’UE/l’EEE lorsque cela s’applique. Certains fournisseurs peuvent traiter hors de l’EEE. Les transferts et les garanties figurent dans cette politique et sont revus en continu. Les connexions sont chiffrées (HTTPS). Les mots de passe ne sont pas en clair. Nous utilisons bcrypt.</p>
        <h2>Cookies</h2>
        <ul>
          <li><strong>Cookies strictement nécessaires</strong> — toujours actifs. Session et protection CSRF pour une connexion sûre.</li>
          <li><strong>Préférences</strong> — stockées localement, par exemple un thème.</li>
          <li><strong>Mesure d’audience et marketing</strong> — Google Analytics 4, Meta Pixel et Google Ads. Désactivés par défaut, jusqu’à votre consentement via le bandeau.</li>
        </ul>
        <p>Nous gardons votre choix au plus un an. Vous pouvez le modifier via le bandeau ou les réglages. Les données de routine des enfants ne vont pas vers des plateformes publicitaires.</p>
        <h2>Vos droits (RGPD)</h2>
        <ul>
          <li>Droit d’effacer votre compte et les données</li>
          <li>Droit d’accès</li>
          <li>Droit de faire rectifier des données inexactes</li>
          <li>Droit d’opposition ou de limitation</li>
          <li>Droit d’introduire une réclamation auprès de l’autorité suédoise Integritetsskyddsmyndigheten (IMY) si vous estimez que nous violons le RGPD</li>
        </ul>
        <h2>Contact</h2>
        <p>Des questions sur ce traitement ? Utilisez le <a href="/en/contact">formulaire de contact</a>.</p>
      `,
    },
    terms: {
      title: 'Conditions d’utilisation — My Starday',
      description: 'Les conditions d’utilisation de My Starday : compte, enfants, prix et responsabilité.',
      h1: 'Conditions d’utilisation',
      ogTitle: 'Conditions d’utilisation',
      body: `
        <p class="updated">Dernière mise à jour : octobre 2026</p>
        <p>Merci d’utiliser My Starday. Ces conditions visent à être claires et honnêtes. Vous posez vos questions via le <a href="/en/contact">formulaire de contact</a>.</p>
        <h2>1. Le service</h2>
        <p>My Starday est un service numérique pour les familles qui veulent un planning de journée structuré, marquer l’avancée d’un enfant avec des étoiles, et laisser l’enfant suivre les activités dans une vue qui lui est propre. Le service s’adresse aux parents et aux adultes responsables et à leurs enfants. Une famille a au moins un adulte avec un compte. Les enfants se connectent avec un code dans la vue enfant.</p>
        <h2>2. Compte et sécurité</h2>
        <ul>
          <li>Choisissez un mot de passe robuste et ne le partagez pas</li>
          <li>Protégez votre adresse e-mail. C’est avec elle que vous retrouvez l’accès</li>
          <li>Le code de la vue enfant est réservé à l’enfant et aux adultes responsables</li>
          <li>N’utilisez pas l’application d’une manière qui enfreint le droit suédois</li>
        </ul>
        <p>Vous êtes responsable de tout ce qui se passe sous votre compte, même si quelqu’un d’autre l’utilise. Si vous soupçonnez un abus, contactez-nous tout de suite.</p>
        <h2>3. Enfants et données personnelles</h2>
        <p>My Starday traite des données sur des enfants. Nous suivons le RGPD et le principe de minimisation :</p>
        <ul>
          <li>Les enfants sont reconnaissables par un prénom et un emoji choisi. Pas de nom de famille, pas de numéro personnel, pas de coordonnées</li>
          <li>Les parents ou adultes responsables saisissent les données et acceptent le partage</li>
          <li>Nous n’utilisons pas les données des enfants pour de la publicité, ni pour autre chose que le service</li>
          <li>Les comptes rendus et les plannings ne sont partagés que si un adulte partage lui-même un lien temporaire</li>
        </ul>
        <h2>4. Contenus que vous créez</h2>
        <p>Les plannings, récompenses, activités et observations que vous ajoutez vous appartiennent, ou appartiennent à votre famille. Vous nous donnez le droit de stocker et d’afficher ces contenus tant que le compte est actif. Nous ne les copions pas pour de la publicité, nous ne les vendons pas et nous ne les utilisons pas dans le marketing.</p>
        <h2>5. Usage</h2>
        <p>Le service est destiné à un usage personnel dans votre famille. Sont interdits :</p>
        <ul>
          <li>Un usage commercial sans accord avec Papa Bravo AB</li>
          <li>Manipuler plannings, étoiles ou récompenses hors des parcours ordinaires de l’application</li>
          <li>Des moyens automatisés, des extracteurs ou des robots contre le service</li>
          <li>Publier un contenu illégal, injurieux ou nuisible</li>
        </ul>
        <h2>6. Fin et suppression</h2>
        <p>Vous pouvez supprimer le compte de façon définitive à tout moment dans les réglages de l’application, en confirmant avec votre mot de passe.</p>
        <p>La suppression retire tout de suite et définitivement le compte adulte, tous les enfants, les plannings, les journaux d’activités, les étoiles, les récompenses et les éventuelles observations.</p>
        <p>Nous pouvons suspendre un compte qui enfreint ces conditions ou le droit suédois.</p>
        <h2>7. Prix</h2>
        <p>Les familles en Irlande et au Canada peuvent utiliser My Starday gratuitement jusqu’au 31 décembre 2026 inclus. Aucun paiement n’est demandé pendant cette période. La période gratuite ne devient pas automatiquement un abonnement. À partir du 1er janvier 2027, vous pouvez choisir un abonnement dans l’App Store ou sur Google Play. Cette page n’a pas de caisse web. Dans les autres pays, le prix et l’accès sont ceux que l’application affiche pour ce pays. Les familles suédoises qui commencent à partir du 3 octobre 2026 peuvent essayer l’application 14 jours, puis choisir 59 couronnes suédoises par mois ou 590 couronnes suédoises par an dans l’application. Les familles qui ont déjà un compte gardent leur offre existante.</p>
        <h2>8. Modifications</h2>
        <p>Nous pouvons adapter ces conditions, par exemple après un changement de loi, une nouvelle fonction ou une clarification. Si un changement est important, nous le disons par e-mail ou par un message dans l’application.</p>
        <p>Si vous continuez à utiliser le service ensuite, cela vaut acceptation des nouvelles conditions.</p>
        <h2>9. Responsabilité</h2>
        <p>My Starday est fourni tel quel. Nous faisons de notre mieux pour garder le service stable et sûr, sans pouvoir garantir qu’il sera toujours disponible sans interruption.</p>
        <p>Papa Bravo AB n’est pas responsable :</p>
        <ul>
          <li>D’une perte de données due à un cas de force majeure</li>
          <li>D’un dommage parce que vous partagez un code ou des identifiants avec quelqu’un qui ne devrait pas les avoir</li>
          <li>D’un dommage indirect, d’une chance manquée ou de données perdues, sauf si le droit suédois en dispose autrement</li>
        </ul>
        <p>Vous êtes responsable d’un usage conforme à ces conditions et au droit suédois.</p>
        <h2>10. Contact</h2>
        <p>Des questions sur ces conditions ou sur le service ? Utilisez le <a href="/en/contact">formulaire de contact</a>.</p>
      `,
    },
  },
});

module.exports = { pageFor };
