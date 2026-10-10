'use strict';

/**
 * Server-owned sentences for the first-25 offer.
 * Unknown locales use English. They do not fall back to Swedish.
 * Remaining-place counts are never invented here.
 */

const { normalizeLocale } = require('./locale');
const {
  LAUNCH_COHORT_OFFER_MONTHS,
  LAUNCH_COHORT_SLOT_LIMIT,
} = require('./launch-cohort-offer');

const COPY_FALLBACK_LOCALE = 'en-GB';

/** @type {Record<string, { headline: string, duration: string, noPaymentMethod: string, noAutoCharge: string, after: string, remaining: string, endsOn: string, ended: string, title: string }>} */
const COPY = {
  'en-GB': {
    title: '12 months of Premium, free',
    headline: 'Be one of the first 25 families in your country and get 12 months of Premium free.',
    duration: 'Premium is free for 12 months, starting the day your family receives the offer.',
    noPaymentMethod: 'No payment method is needed.',
    noAutoCharge: 'Nothing is charged automatically.',
    after: 'When the 12 months end, free Premium stops. Your routines, stars and rewards stay. You can buy Premium at the price in your store if you want to keep it.',
    remaining: '{count} places are still open.',
    endsOn: 'Your free Premium ends on {date}. Nothing is charged automatically.',
    ended: 'Your 12 free months have ended. Nothing was charged. Your routines and stars are still here. You can buy Premium at the price in your store if you want to continue.',
  },
  'sv-SE': {
    title: '12 månader Premium utan kostnad',
    headline: 'Var en av de första 25 familjerna i ditt land och få 12 månader Premium utan kostnad.',
    duration: 'Premium är gratis i 12 månader, räknat från dagen då familjen får erbjudandet.',
    noPaymentMethod: 'Ingen betalmetod behövs.',
    noAutoCharge: 'Ingenting dras automatiskt.',
    after: 'När de 12 månaderna tar slut upphör gratis Premium. Rutiner, stjärnor och belöningar finns kvar. Du kan köpa Premium till priset i din butik om du vill behålla det.',
    remaining: '{count} platser är fortfarande öppna.',
    endsOn: 'Er gratis Premium slutar {date}. Ingenting dras automatiskt.',
    ended: 'Era 12 gratis månader har tagit slut. Ingenting drogs. Rutiner och stjärnor finns kvar. Ni kan köpa Premium till priset i er butik om ni vill fortsätta.',
  },
  'de-DE': {
    title: '12 Monate Premium kostenlos',
    headline: 'Sei eine der ersten 25 Familien in deinem Land und erhalte 12 Monate Premium kostenlos.',
    duration: 'Premium ist 12 Monate kostenlos, ab dem Tag, an dem deine Familie das Angebot erhält.',
    noPaymentMethod: 'Keine Zahlungsmethode nötig.',
    noAutoCharge: 'Es wird nichts automatisch abgebucht.',
    after: 'Nach 12 Monaten endet kostenloses Premium. Routinen, Sterne und Belohnungen bleiben. Du kannst Premium zum Preis in deinem Store kaufen, wenn du es behalten willst.',
    remaining: '{count} Plätze sind noch offen.',
    endsOn: 'Euer kostenloses Premium endet am {date}. Es wird nichts automatisch abgebucht.',
    ended: 'Eure 12 kostenlosen Monate sind zu Ende. Es wurde nichts abgebucht. Routinen und Sterne sind noch da. Ihr könnt Premium zum Preis in eurem Store kaufen, wenn ihr weitermachen wollt.',
  },
  'fr-FR': {
    title: '12 mois de Premium offerts',
    headline: 'Faites partie des 25 premières familles de votre pays et recevez 12 mois de Premium gratuits.',
    duration: 'Premium est gratuit pendant 12 mois, à partir du jour où votre famille reçoit l’offre.',
    noPaymentMethod: 'Aucun moyen de paiement n’est demandé.',
    noAutoCharge: 'Aucun prélèvement automatique.',
    after: 'Au bout de 12 mois, le Premium gratuit s’arrête. Vos routines, étoiles et récompenses restent. Vous pouvez acheter Premium au prix de votre boutique si vous voulez le garder.',
    remaining: '{count} places sont encore ouvertes.',
    endsOn: 'Votre Premium gratuit se termine le {date}. Aucun prélèvement automatique.',
    ended: 'Vos 12 mois gratuits sont terminés. Rien n’a été prélevé. Vos routines et vos étoiles sont toujours là. Vous pouvez acheter Premium au prix de votre boutique si vous voulez continuer.',
  },
  'nl-NL': {
    title: '12 maanden Premium gratis',
    headline: 'Wees een van de eerste 25 gezinnen in je land en krijg 12 maanden Premium gratis.',
    duration: 'Premium is 12 maanden gratis, vanaf de dag dat je gezin het aanbod krijgt.',
    noPaymentMethod: 'Geen betaalmethode nodig.',
    noAutoCharge: 'Er wordt niets automatisch afgeschreven.',
    after: 'Na 12 maanden stopt gratis Premium. Routines, sterren en beloningen blijven. Je kunt Premium kopen voor de prijs in je winkel als je het wilt houden.',
    remaining: '{count} plaatsen zijn nog open.',
    endsOn: 'Jullie gratis Premium stopt op {date}. Er wordt niets automatisch afgeschreven.',
    ended: 'Jullie 12 gratis maanden zijn voorbij. Er is niets afgeschreven. Routines en sterren blijven. Je kunt Premium kopen voor de prijs in je winkel als je wilt doorgaan.',
  },
  'da-DK': {
    title: '12 måneder Premium gratis',
    headline: 'Vær en af de første 25 familier i dit land og få 12 måneder Premium gratis.',
    duration: 'Premium er gratis i 12 måneder fra den dag, familien får tilbuddet.',
    noPaymentMethod: 'Der kræves ingen betalingsmetode.',
    noAutoCharge: 'Der trækkes ingenting automatisk.',
    after: 'Når de 12 måneder er gået, stopper gratis Premium. Rutiner, stjerner og belønninger bliver. I kan købe Premium til prisen i jeres butik, hvis I vil beholde det.',
    remaining: '{count} pladser er stadig åbne.',
    endsOn: 'Jeres gratis Premium slutter {date}. Der trækkes ingenting automatisk.',
    ended: 'Jeres 12 gratis måneder er slut. Der blev ikke trukket noget. Rutiner og stjerner er her stadig. I kan købe Premium til prisen i jeres butik, hvis I vil fortsætte.',
  },
  'fi-FI': {
    title: '12 kuukautta Premiumia maksutta',
    headline: 'Ole yksi maasi 25 ensimmäisestä perheestä ja saat 12 kuukautta Premiumia maksutta.',
    duration: 'Premium on maksuton 12 kuukautta siitä päivästä, kun perhe saa tarjouksen.',
    noPaymentMethod: 'Maksutapaa ei tarvita.',
    noAutoCharge: 'Mitään ei veloiteta automaattisesti.',
    after: '12 kuukauden jälkeen maksuton Premium päättyy. Rutiinit, tähdet ja palkinnot säilyvät. Voit ostaa Premiumin kauppasi hinnalla, jos haluat jatkaa.',
    remaining: '{count} paikkaa on vielä auki.',
    endsOn: 'Maksuton Premium päättyy {date}. Mitään ei veloiteta automaattisesti.',
    ended: '12 maksutonta kuukautta on päättynyt. Mitään ei veloitettu. Rutiinit ja tähdet ovat tallessa. Voit ostaa Premiumin kauppasi hinnalla, jos haluat jatkaa.',
  },
  'nb-NO': {
    title: '12 måneder Premium gratis',
    headline: 'Bli en av de første 25 familiene i landet ditt og få 12 måneder Premium gratis.',
    duration: 'Premium er gratis i 12 måneder fra dagen familien får tilbudet.',
    noPaymentMethod: 'Ingen betalingsmåte trengs.',
    noAutoCharge: 'Ingenting trekkes automatisk.',
    after: 'Når de 12 månedene er over, stopper gratis Premium. Rutiner, stjerner og belønninger blir. Du kan kjøpe Premium til prisen i butikken din hvis du vil beholde det.',
    remaining: '{count} plasser er fortsatt åpne.',
    endsOn: 'Gratis Premium slutter {date}. Ingenting trekkes automatisk.',
    ended: 'De 12 gratis månedene er over. Ingenting ble trukket. Rutiner og stjerner er fortsatt her. Du kan kjøpe Premium til prisen i butikken din hvis du vil fortsette.',
  },
  'es-ES': {
    title: '12 meses de Premium gratis',
    headline: 'Sé una de las primeras 25 familias de tu país y consigue 12 meses de Premium gratis.',
    duration: 'Premium es gratis durante 12 meses desde el día en que tu familia recibe la oferta.',
    noPaymentMethod: 'No hace falta un método de pago.',
    noAutoCharge: 'No se cobra nada automáticamente.',
    after: 'Cuando pasen los 12 meses, el Premium gratis termina. Las rutinas, las estrellas y los premios siguen. Puedes comprar Premium al precio de tu tienda si quieres seguir.',
    remaining: 'Quedan {count} plazas abiertas.',
    endsOn: 'Vuestro Premium gratis termina el {date}. No se cobra nada automáticamente.',
    ended: 'Vuestros 12 meses gratis han terminado. No se ha cobrado nada. Las rutinas y las estrellas siguen aquí. Puedes comprar Premium al precio de tu tienda si quieres continuar.',
  },
  'it-IT': {
    title: '12 mesi di Premium gratis',
    headline: 'Sii una delle prime 25 famiglie del tuo paese e ricevi 12 mesi di Premium gratis.',
    duration: 'Premium è gratis per 12 mesi, dal giorno in cui la famiglia riceve l’offerta.',
    noPaymentMethod: 'Non serve un metodo di pagamento.',
    noAutoCharge: 'Non viene addebitato nulla in automatico.',
    after: 'Dopo 12 mesi il Premium gratis finisce. Routine, stelle e premi restano. Puoi acquistare Premium al prezzo del tuo store se vuoi tenerlo.',
    remaining: '{count} posti sono ancora aperti.',
    endsOn: 'Il Premium gratis finisce il {date}. Non viene addebitato nulla in automatico.',
    ended: 'I 12 mesi gratis sono finiti. Non è stato addebitato nulla. Routine e stelle ci sono ancora. Puoi acquistare Premium al prezzo del tuo store se vuoi continuare.',
  },
  'pt-PT': {
    title: '12 meses de Premium grátis',
    headline: 'Sê uma das primeiras 25 famílias do teu país e recebe 12 meses de Premium grátis.',
    duration: 'O Premium é grátis durante 12 meses, a partir do dia em que a família recebe a oferta.',
    noPaymentMethod: 'Não é preciso método de pagamento.',
    noAutoCharge: 'Nada é cobrado automaticamente.',
    after: 'Ao fim de 12 meses, o Premium grátis termina. Rotinas, estrelas e recompensas ficam. Podes comprar Premium ao preço da tua loja se quiseres continuar.',
    remaining: '{count} lugares ainda estão abertos.',
    endsOn: 'O Premium grátis termina a {date}. Nada é cobrado automaticamente.',
    ended: 'Os 12 meses grátis terminaram. Nada foi cobrado. As rotinas e as estrelas continuam aqui. Podes comprar Premium ao preço da tua loja se quiseres continuar.',
  },
  'pl-PL': {
    title: '12 miesięcy Premium za darmo',
    headline: 'Bądź jedną z pierwszych 25 rodzin w swoim kraju i otrzymaj 12 miesięcy Premium za darmo.',
    duration: 'Premium jest bezpłatne przez 12 miesięcy od dnia, w którym rodzina otrzymuje ofertę.',
    noPaymentMethod: 'Nie potrzeba metody płatności.',
    noAutoCharge: 'Nic nie jest pobierane automatycznie.',
    after: 'Po 12 miesiącach darmowe Premium się kończy. Rutyny, gwiazdki i nagrody zostają. Możesz kupić Premium w cenie swojego sklepu, jeśli chcesz je zachować.',
    remaining: '{count} miejsc jest jeszcze otwartych.',
    endsOn: 'Wasze darmowe Premium kończy się {date}. Nic nie jest pobierane automatycznie.',
    ended: 'Wasze 12 darmowych miesięcy dobiegło końca. Nic nie zostało pobrane. Rutyny i gwiazdki zostały. Możesz kupić Premium w cenie swojego sklepu, jeśli chcesz kontynuować.',
  },
  'cs-CZ': {
    title: '12 měsíců Premium zdarma',
    headline: 'Buďte jednou z prvních 25 rodin ve své zemi a získejte 12 měsíců Premium zdarma.',
    duration: 'Premium je zdarma 12 měsíců ode dne, kdy rodina nabídku dostane.',
    noPaymentMethod: 'Platební metoda není potřeba.',
    noAutoCharge: 'Nic se nestrhává automaticky.',
    after: 'Po 12 měsících bezplatné Premium skončí. Rutiny, hvězdy a odměny zůstanou. Premium můžete koupit za cenu ve svém obchodě, pokud ho chcete dál.',
    remaining: '{count} míst je stále volných.',
    endsOn: 'Vaše bezplatné Premium končí {date}. Nic se nestrhává automaticky.',
    ended: 'Vašich 12 měsíců zdarma skončilo. Nic se nestrhlo. Rutiny a hvězdy zůstávají. Premium můžete koupit za cenu ve svém obchodě, pokud chcete pokračovat.',
  },
  'sk-SK': {
    title: '12 mesiacov Premium zadarmo',
    headline: 'Buďte jednou z prvých 25 rodín vo svojej krajine a získajte 12 mesiacov Premium zadarmo.',
    duration: 'Premium je zadarmo 12 mesiacov odo dňa, keď rodina ponuku dostane.',
    noPaymentMethod: 'Platobná metóda nie je potrebná.',
    noAutoCharge: 'Nič sa nestrháva automaticky.',
    after: 'Po 12 mesiacoch bezplatné Premium skončí. Rutiny, hviezdy a odmeny ostanú. Premium môžete kúpiť za cenu vo svojom obchode, ak ho chcete ďalej.',
    remaining: '{count} miest je stále voľných.',
    endsOn: 'Vaše bezplatné Premium končí {date}. Nič sa nestrháva automaticky.',
    ended: 'Vašich 12 mesiacov zadarmo sa skončilo. Nič sa nestrhlo. Rutiny a hviezdy ostávajú. Premium môžete kúpiť za cenu vo svojom obchode, ak chcete pokračovať.',
  },
  'sl-SI': {
    title: '12 mesecev Premium brezplačno',
    headline: 'Bodite ena od prvih 25 družin v svoji državi in prejmite 12 mesecev Premium brezplačno.',
    duration: 'Premium je brezplačen 12 mesecev od dne, ko družina prejme ponudbo.',
    noPaymentMethod: 'Način plačila ni potreben.',
    noAutoCharge: 'Nič se ne obračuna samodejno.',
    after: 'Po 12 mesecih se brezplačni Premium konča. Rutine, zvezdice in nagrade ostanejo. Premium lahko kupite po ceni v svoji trgovini, če ga želite obdržati.',
    remaining: '{count} mest je še odprtih.',
    endsOn: 'Vaš brezplačni Premium se konča {date}. Nič se ne obračuna samodejno.',
    ended: 'Vaših 12 brezplačnih mesecev je konec. Nič ni bilo obračunano. Rutine in zvezdice so še tu. Premium lahko kupite po ceni v svoji trgovini, če želite nadaljevati.',
  },
  'hr-HR': {
    title: '12 mjeseci Premiuma besplatno',
    headline: 'Budite jedna od prvih 25 obitelji u svojoj zemlji i dobijte 12 mjeseci Premiuma besplatno.',
    duration: 'Premium je besplatan 12 mjeseci od dana kad obitelj dobije ponudu.',
    noPaymentMethod: 'Način plaćanja nije potreban.',
    noAutoCharge: 'Ništa se ne naplaćuje automatski.',
    after: 'Nakon 12 mjeseci besplatni Premium prestaje. Rutine, zvjezdice i nagrade ostaju. Premium možete kupiti po cijeni u svojoj trgovini ako ga želite zadržati.',
    remaining: '{count} mjesta je još otvoreno.',
    endsOn: 'Vaš besplatni Premium završava {date}. Ništa se ne naplaćuje automatski.',
    ended: 'Vaših 12 besplatnih mjeseci je završilo. Ništa nije naplaćeno. Rutine i zvjezdice su još tu. Premium možete kupiti po cijeni u svojoj trgovini ako želite nastaviti.',
  },
  'hu-HU': {
    title: '12 hónap Premium ingyen',
    headline: 'Legyetek országotok első 25 családja között, és kapjatok 12 hónap Premiumot ingyen.',
    duration: 'A Premium 12 hónapig ingyenes, attól a naptól, amikor a család megkapja az ajánlatot.',
    noPaymentMethod: 'Nem kell fizetési mód.',
    noAutoCharge: 'Semmi sem kerül automatikusan levonásra.',
    after: '12 hónap után az ingyenes Premium véget ér. A rutinok, csillagok és jutalmak megmaradnak. A Premiumot a bolt árán megvehetitek, ha meg akarjátok tartani.',
    remaining: '{count} hely még nyitva van.',
    endsOn: 'Az ingyenes Premium {date} napon ér véget. Semmi sem kerül automatikusan levonásra.',
    ended: 'A 12 ingyenes hónap véget ért. Semmit nem vontunk le. A rutinok és a csillagok megmaradtak. A Premiumot a bolt árán megvehetitek, ha folytatni szeretnétek.',
  },
  'ro-RO': {
    title: '12 luni de Premium gratuit',
    headline: 'Fii una dintre primele 25 de familii din țara ta și primești 12 luni de Premium gratuit.',
    duration: 'Premium este gratuit 12 luni, din ziua în care familia primește oferta.',
    noPaymentMethod: 'Nu este nevoie de o metodă de plată.',
    noAutoCharge: 'Nu se percepe nimic automat.',
    after: 'După 12 luni, Premiumul gratuit se oprește. Rutinele, stelele și recompensele rămân. Poți cumpăra Premium la prețul din magazinul tău dacă vrei să îl păstrezi.',
    remaining: '{count} locuri sunt încă deschise.',
    endsOn: 'Premiumul gratuit se încheie la {date}. Nu se percepe nimic automat.',
    ended: 'Cele 12 luni gratuite s-au încheiat. Nu s-a perceput nimic. Rutinele și stelele sunt încă aici. Poți cumpăra Premium la prețul din magazinul tău dacă vrei să continui.',
  },
  'bg-BG': {
    title: '12 месеца Premium безплатно',
    headline: 'Бъдете едно от първите 25 семейства в страната си и получете 12 месеца Premium безплатно.',
    duration: 'Premium е безплатен 12 месеца от деня, в който семейството получи офертата.',
    noPaymentMethod: 'Не е нужен начин на плащане.',
    noAutoCharge: 'Нищо не се таксува автоматично.',
    after: 'След 12 месеца безплатният Premium спира. Рутините, звездите и наградите остават. Можете да купите Premium на цената в магазина си, ако искате да го запазите.',
    remaining: '{count} места са още отворени.',
    endsOn: 'Безплатният ви Premium приключва на {date}. Нищо не се таксува автоматично.',
    ended: 'Вашите 12 безплатни месеца приключиха. Нищо не е таксувано. Рутините и звездите са още тук. Можете да купите Premium на цената в магазина си, ако искате да продължите.',
  },
  'el-GR': {
    title: '12 μήνες Premium δωρεάν',
    headline: 'Γίνετε μία από τις πρώτες 25 οικογένειες στη χώρα σας και πάρτε 12 μήνες Premium δωρεάν.',
    duration: 'Το Premium είναι δωρεάν για 12 μήνες, από την ημέρα που η οικογένεια λαμβάνει την προσφορά.',
    noPaymentMethod: 'Δεν χρειάζεται τρόπος πληρωμής.',
    noAutoCharge: 'Δεν γίνεται καμία αυτόματη χρέωση.',
    after: 'Μετά από 12 μήνες το δωρεάν Premium σταματά. Οι ρουτίνες, τα αστέρια και οι ανταμοιβές μένουν. Μπορείτε να αγοράσετε Premium στην τιμή του καταστήματός σας αν θέλετε να το κρατήσετε.',
    remaining: '{count} θέσεις είναι ακόμη ανοιχτές.',
    endsOn: 'Το δωρεάν Premium τελειώνει στις {date}. Δεν γίνεται καμία αυτόματη χρέωση.',
    ended: 'Οι 12 δωρεάν μήνες τελείωσαν. Δεν έγινε καμία χρέωση. Οι ρουτίνες και τα αστέρια είναι ακόμη εδώ. Μπορείτε να αγοράσετε Premium στην τιμή του καταστήματός σας αν θέλετε να συνεχίσετε.',
  },
  'et-EE': {
    title: '12 kuud Premiumi tasuta',
    headline: 'Ole oma riigi esimese 25 pere seas ja saa 12 kuud Premiumi tasuta.',
    duration: 'Premium on tasuta 12 kuud alates päevast, mil pere pakkumise saab.',
    noPaymentMethod: 'Maksemeetodit ei ole vaja.',
    noAutoCharge: 'Midagi ei võeta automaatselt.',
    after: '12 kuu pärast tasuta Premium lõpeb. Rutiinid, tähed ja auhinnad jäävad alles. Premiumi saab osta oma poe hinnaga, kui soovid seda alles hoida.',
    remaining: '{count} kohta on veel avatud.',
    endsOn: 'Teie tasuta Premium lõpeb {date}. Midagi ei võeta automaatselt.',
    ended: 'Teie 12 tasuta kuud on läbi. Midagi ei võetud. Rutiinid ja tähed on alles. Premiumi saab osta oma poe hinnaga, kui soovite jätkata.',
  },
  'lt-LT': {
    title: '12 mėnesių Premium nemokamai',
    headline: 'Būkite viena iš pirmųjų 25 šeimų savo šalyje ir gaukite 12 mėnesių Premium nemokamai.',
    duration: 'Premium nemokama 12 mėnesių nuo dienos, kai šeima gauna pasiūlymą.',
    noPaymentMethod: 'Mokėjimo būdo nereikia.',
    noAutoCharge: 'Nieko nenuskaičiuojama automatiškai.',
    after: 'Po 12 mėnesių nemokamas Premium baigiasi. Rutinos, žvaigždutės ir apdovanojimai lieka. Premium galite nusipirkti savo parduotuvės kaina, jei norite jį išlaikyti.',
    remaining: '{count} vietų dar atvira.',
    endsOn: 'Jūsų nemokamas Premium baigiasi {date}. Nieko nenuskaičiuojama automatiškai.',
    ended: 'Jūsų 12 nemokamų mėnesių baigėsi. Nieko nebuvo nuskaičiuota. Rutinos ir žvaigždutės liko. Premium galite nusipirkti savo parduotuvės kaina, jei norite tęsti.',
  },
  'lv-LV': {
    title: '12 mēneši Premium bez maksas',
    headline: 'Esi viena no pirmajām 25 ģimenēm savā valstī un saņem 12 mēnešus Premium bez maksas.',
    duration: 'Premium ir bez maksas 12 mēnešus no dienas, kad ģimene saņem piedāvājumu.',
    noPaymentMethod: 'Maksāšanas veids nav vajadzīgs.',
    noAutoCharge: 'Nekas netiek iekasēts automātiski.',
    after: 'Pēc 12 mēnešiem bezmaksas Premium beidzas. Rutīnas, zvaigznes un balvas paliek. Premium var nopirkt sava veikala cenā, ja vēlaties to paturēt.',
    remaining: '{count} vietas vēl ir atvērtas.',
    endsOn: 'Jūsu bezmaksas Premium beidzas {date}. Nekas netiek iekasēts automātiski.',
    ended: 'Jūsu 12 bezmaksas mēneši ir beigušies. Nekas netika iekasēts. Rutīnas un zvaigznes joprojām ir šeit. Premium var nopirkt sava veikala cenā, ja vēlaties turpināt.',
  },
  'is-IS': {
    title: '12 mánuðir af Premium ókeypis',
    headline: 'Vertu ein af fyrstu 25 fjölskyldunum í landinu þínu og fáðu 12 mánuði af Premium ókeypis.',
    duration: 'Premium er ókeypis í 12 mánuði frá deginum sem fjölskyldan fær tilboðið.',
    noPaymentMethod: 'Engin greiðsluleið þarf.',
    noAutoCharge: 'Ekkert er skuldfært sjálfkrafa.',
    after: 'Eftir 12 mánuði lýkur ókeypis Premium. Venjur, stjörnur og verðlaun haldast. Þú getur keypt Premium á verði verslunarinnar ef þú vilt halda því.',
    remaining: '{count} pláss eru enn opin.',
    endsOn: 'Ókeypis Premium lýkur {date}. Ekkert er skuldfært sjálfkrafa.',
    ended: '12 ókeypis mánuðirnir eru liðnir. Ekkert var skuldfært. Venjur og stjörnur eru enn hér. Þú getur keypt Premium á verði verslunarinnar ef þú vilt halda áfram.',
  },
  'ga-IE': {
    title: '12 mhí de Premium saor in aisce',
    headline: 'Bí i measc an chéad 25 teaghlach i do thír agus faigh 12 mhí de Premium saor in aisce.',
    duration: 'Tá Premium saor in aisce ar feadh 12 mhí, ón lá a fhaigheann do theaghlach an tairiscint.',
    noPaymentMethod: 'Ní theastaíonn modh íocaíochta.',
    noAutoCharge: 'Ní ghearrfar aon táille go huathoibríoch.',
    after: 'Nuair a chríochnaíonn na 12 mhí, stopann Premium saor in aisce. Fanann na gnáthaimh, na réaltaí agus na duaiseanna. Is féidir Premium a cheannach ar phraghas do shiopa más mian leat é a choinneáil.',
    remaining: '{count} áit fós oscailte.',
    endsOn: 'Críochnaíonn do Premium saor in aisce ar {date}. Ní ghearrfar aon táille go huathoibríoch.',
    ended: 'Tá na 12 mhí saor in aisce thart. Níor gearradh aon táille. Tá na gnáthaimh agus na réaltaí fós anseo. Is féidir Premium a cheannach ar phraghas do shiopa más mian leat leanúint ar aghaidh.',
  },
  'mt-MT': {
    title: '12-il xahar ta’ Premium b’xejn',
    headline: 'Kun waħda mill-ewwel 25 familja f’pajjiżek u ikseb 12-il xahar ta’ Premium b’xejn.',
    duration: 'Premium huwa b’xejn għal 12-il xahar, mill-jum li fih il-familja tirċievi l-offerta.',
    noPaymentMethod: 'M’hemmx bżonn metodu ta’ ħlas.',
    noAutoCharge: 'Ma jsir l-ebda ħlas awtomatiku.',
    after: 'Meta jintemmu t-12-il xahar, il-Premium b’xejn jieqaf. Ir-rutini, l-istilel u l-premjijiet jibqgħu. Tista’ tixtri Premium bil-prezz tal-ħanut tiegħek jekk trid iżżommu.',
    remaining: '{count} postijiet għadhom miftuħa.',
    endsOn: 'Il-Premium b’xejn tagħkom jintemm fi {date}. Ma jsir l-ebda ħlas awtomatiku.',
    ended: 'It-12-il xahar b’xejn intemmu. Ma tħallas xejn. Ir-rutini u l-istilel għadhom hawn. Tista’ tixtri Premium bil-prezz tal-ħanut tiegħek jekk trid tkompli.',
  },
};

function fill(template, params) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => (
    params[key] == null ? '' : String(params[key])
  ));
}

function formatOfferDate(instant, locale, timeZone) {
  const date = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(date.getTime())) return '';
  const tag = COPY[locale] ? locale : COPY_FALLBACK_LOCALE;
  const zone = timeZone || 'UTC';
  return new Intl.DateTimeFormat(tag, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: zone,
  }).format(date);
}

/**
 * Acquisition sentences. Remaining text is included only when count is a real number.
 * @param {string} locale
 * @param {number|null} slotsRemaining
 */
function packLocaleFor(locale) {
  const tag = normalizeLocale(locale);
  if (tag && COPY[tag]) return tag;
  return COPY_FALLBACK_LOCALE;
}

function describeLaunchCohortAcquisition(locale, slotsRemaining) {
  const packLocale = packLocaleFor(locale);
  const sentences = COPY[packLocale];
  const hasCount = Number.isInteger(slotsRemaining);
  return {
    locale: packLocale,
    months: LAUNCH_COHORT_OFFER_MONTHS,
    slot_limit: LAUNCH_COHORT_SLOT_LIMIT,
    title: sentences.title,
    headline: sentences.headline,
    duration: sentences.duration,
    no_payment_method: sentences.noPaymentMethod,
    no_auto_charge: sentences.noAutoCharge,
    after: sentences.after,
    remaining: hasCount ? fill(sentences.remaining, { count: slotsRemaining }) : null,
  };
}

/**
 * The family's own period. Dates come from the stored grant, not from a counter.
 * mode winning: this grant is the current Premium right.
 * mode ended: the stored period has passed and no other Premium right is active.
 * mode stored: another right is winning. Do not say the free months have ended.
 * @param {{ starts_at?: Date|string|null, expires_at?: Date|string|null, metadata?: { time_zone?: string } }} premium
 * @param {string} locale
 * @param {{ mode?: 'winning'|'ended'|'stored', active?: boolean, timeZone?: string|null }} [opts]
 */
function describeLaunchCohortFamilyCopy(premium, locale, opts = {}) {
  const packLocale = packLocaleFor(locale);
  const sentences = COPY[packLocale];
  const timeZone = opts.timeZone
    || (premium && premium.metadata && premium.metadata.time_zone)
    || 'UTC';
  const expiresAt = premium && premium.expires_at ? premium.expires_at : null;
  const mode = opts.mode
    || (opts.active === false ? 'ended' : 'winning');
  const date = expiresAt ? formatOfferDate(expiresAt, packLocale, timeZone) : '';
  return {
    locale: packLocale,
    title: sentences.title,
    ends_on: mode === 'winning' && date ? fill(sentences.endsOn, { date }) : null,
    ended: mode === 'ended' ? sentences.ended : null,
    no_auto_charge: sentences.noAutoCharge,
    no_payment_method: sentences.noPaymentMethod,
    after: sentences.after,
    expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    time_zone: timeZone,
  };
}

function localeHasLaunchCohortCopy(locale) {
  return Object.prototype.hasOwnProperty.call(COPY, locale);
}

module.exports = {
  COPY_FALLBACK_LOCALE,
  LAUNCH_COHORT_COPY_LOCALES: Object.freeze(Object.keys(COPY)),
  describeLaunchCohortAcquisition,
  describeLaunchCohortFamilyCopy,
  formatOfferDate,
  localeHasLaunchCohortCopy,
};
