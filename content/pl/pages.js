'use strict';

/**
 * Polish public pages. Written in Polish.
 * Legal text translates the verified baseline. It adds no Polish statute.
 */

const { defineLocalePages } = require('../locale-pack');

const pageFor = defineLocalePages('pl', {
  market: {
    title: (name) => `My Starday — ${name}. Obrazkowe plany dnia dla dzieci`,
    description: (name) => `Strona rynku: ${name}. Obrazkowe plany dnia po polsku. To strona rynku, nie osobna witryna językowa.`,
    h1: (name) => `Obrazkowe plany dnia dla rodzin. Rynek: ${name}`,
    lead: (name) => `To strona dla rynku ${name}. Witryna po polsku zostaje witryną językową.`,
    registrationOpen: (name) => `Nowe konta na rynku ${name} idą za istniejącą rejestracją. Domyślnie jest otwarta.`,
    registrationClosed: (name) => `Nowe konta na rynku ${name} nie są domyślnie otwarte. Wynika to z istniejącej rejestracji, nie z tej strony. Domyślnie jest zamknięta.`,
    complimentary: (name) => `Na rynku ${name} obowiązuje istniejący okres bez opłat. Sam nie zmienia się w subskrypcję. Ta strona nie ustala ceny.`,
    introYear: (name) => `${name} zachowuje ofertę już opublikowaną na szwedzkiej witrynie. Ta strona nie ustala ceny. Na tym rynku nie ma okresu bez opłat do 31 grudnia 2026.`,
    trial: (name, days) => `Jeśli konto będzie tu później możliwe, istniejąca zasada poza Szwecją, Irlandią i Kanadą to ${days} dni próby. Płatność musi być najpierw dostępna. Na tym rynku nie ma okresu bez opłat do 31 grudnia 2026 i nic samo nie staje się subskrypcją. Ta strona nie ustala ceny.`,
    notTreatment: (name) => `Przycisk otwiera ogólny wpis w App Store, nie wymyśloną kartę produktu dla rynku ${name}. My Starday to obrazkowy plan dnia. To nie jest leczenie i nie obiecuje wyniku medycznego.`,
    register: 'Utwórz konto',
    registerNote: 'Formularz pyta, gdzie mieszka rodzina. Ten odnośnik sam nie ustawia kraju ani ceny.',
    how: 'Jak to działa',
    playSoon: 'Google Play nie jest tu otwarty jako osobna strona.',
  },
  pages: {
    home: {
      title: 'Obrazkowy plan dnia dla dzieci – rutyny, nagrody i piktogramy | My Starday',
      description: 'Obrazkowe plany dnia, które pokazują dziecku, co dzieje się teraz i co będzie potem. Piktogramy, widok dziecka i gwiazdki za ukończone kroki.',
      h1: 'Obrazkowe plany dnia, które pokazują dziecku, co dzieje się teraz i co będzie potem.',
      ogTitle: 'Obrazkowy plan dnia dla dzieci',
      faqs: [
        { q: 'Czym jest My Starday?', a: 'Obrazkowym planem dnia dla rodzin. Dziecko widzi następny krok. Dorosły zostawia ustawienia u siebie.' },
        { q: 'Czy gwiazdki można kupić?', a: 'Nie. Gwiazdka jest za ukończony krok. Nie da się jej kupić.' },
        { q: 'Czy to leczenie?', a: 'Nie. My Starday pomaga w zwykłym dniu i nie obiecuje wyniku medycznego.' },
      ],
      body(href) {
        return `
          <p class="lead">Dziecko uspokaja się, gdy widać następny krok. My Starday pokazuje dzień obrazkami: teraz, potem, gotowe.</p>
          <h2>Co widzi dziecko</h2>
          <p>Widok dziecka pokazuje jeden krok naraz. Dorosły układa plan. Dziecko odhacza. Kilkoro dzieci może mieszkać w tym samym domu, każde ze swoim planem.</p>
          <h2>Gwiazdki</h2>
          <p>Ukończony krok może dać gwiazdkę. Gwiazdek nie kupuje się. Nie zastępują umowy ustalonej wcześniej. Szczegóły są w <a href="${href('rewardSystem')}">systemie nagród</a>.</p>
          <h2>To nie leczenie</h2>
          <p>Plan może pomóc dzieciom, które potrzebują więcej jasności, także przy ADHD albo autyzmie, i rodzinom bez diagnozy. My Starday nie jest leczeniem i nie obiecuje konkretnego wyniku.</p>
          <p>Witryna po polsku wyjaśnia produkt. Kraj to coś innego. Osobna strona jest dla <a href="/pl/pl">Polski</a>.</p>
          <p><a href="${href('howItWorks')}">Jak to działa</a> · <a href="${href('visualSchedule')}">Plan dnia</a> · <a href="${href('morningRoutine')}">Poranna rutyna</a></p>
        `;
      },
    },
    howItWorks: {
      title: 'Jak działa My Starday | Obrazkowy plan dnia',
      description: 'Dorosły układa dzień. Dziecko widzi następny krok i go odhacza. Gwiazdki są za zrobiony krok, nie do kupienia.',
      h1: 'Jak działa My Starday',
      ogTitle: 'Jak to działa',
      faqs: [
        { q: 'Kto ustawia plan?', a: 'Dorosły. Dziecko widzi widok dziecka i odhacza kroki.' },
        { q: 'Czy dziecko potrzebuje e-maila?', a: 'Nie. Dziecko loguje się imieniem i kodem PIN.' },
      ],
      body(href) {
        return `
          <p class="lead">Poranek trzymają trzy rzeczy: widoczny plan, dziecko, które samo odhacza, i dorosły, który zostawia ustawienia u siebie.</p>
          <h2>1. Plan</h2>
          <p>Ułóż czynności w prawdziwej kolejności poranka. Obrazki pomagają, gdy dziecko jeszcze nie czyta. <a href="${href('visualSchedule')}">Plan dnia</a> pokazuje teraz i potem.</p>
          <h2>2. Widok dziecka</h2>
          <p>Dziecko widzi następny krok, nie ustawienia rodziny. W tym widoku nie ma reklam ani sieci społecznościowej.</p>
          <h2>3. Gwiazdka</h2>
          <p>Odhaczony krok może dać gwiazdkę. Gwiazdki nie kupuje się. Umowa jest wcześniej, nie w środku zdenerwowania.</p>
          <p>My Starday pomaga w zwykłym dniu. To nie jest leczenie i nie zastępuje rady lekarza, terapeuty ani szkoły.</p>
        `;
      },
    },
    visualSchedule: {
      title: 'Obrazkowy plan dnia dla dzieci | My Starday',
      description: 'Obrazkowy plan dnia pokazuje dziecku, co dzieje się teraz i co będzie potem. Mało kroków, znane obrazki, jasna kolejność.',
      h1: 'Obrazkowy plan dnia dla dzieci',
      ogTitle: 'Obrazkowy plan dnia',
      faqs: [
        { q: 'Ile kroków?', a: 'Często wystarczą cztery albo pięć. Dłuższa lista ma sens, gdy kolejność jest już znana.' },
        { q: 'Zdjęcia czy symbole?', a: 'Obrazki, które dziecko już rozpoznaje. Zdjęcia z domu działają dobrze.' },
      ],
      body(href) {
        return `
          <p class="lead">Obrazkowy plan dnia pokazuje kolejność. Dziecko nie musi zgadywać, co dalej.</p>
          <h2>Teraz i potem</h2>
          <p>Pokaż tylko bieżący krok i następny. Długa lista na ścianie pomaga mniej niż jeden jasny ruch.</p>
          <h2>Gdy krok staje</h2>
          <ul>
            <li><strong>Podziel krok.</strong> „Ubieranie” staje się skarpetki, spodnie, koszulka.</li>
            <li><strong>Jeden naraz.</strong></li>
            <li><strong>Pokaż zamiast powtarzać.</strong></li>
          </ul>
          <p>Rano liczy się <a href="${href('morningRoutine')}">poranna rutyna</a>. W tygodniu <a href="${href('weeklySchedule')}">plan tygodnia</a> mówi, jaki jest dzień.</p>
          <p>My Starday nie jest leczeniem i nie obiecuje wyniku medycznego.</p>
        `;
      },
    },
    morningRoutine: {
      title: 'Poranna rutyna dla dzieci | My Starday',
      description: 'Poranna rutyna z obrazkami zmniejsza liczbę słownych przypomnień. Ta sama kolejność, dzień po dniu.',
      h1: 'Poranna rutyna dla dzieci',
      ogTitle: 'Poranna rutyna',
      faqs: [
        { q: 'Co wchodzi w poranek?', a: 'Tylko to, co naprawdę dzieje się przed drzwiami. Wstanie, ubranie, jedzenie, zęby, kurtka.' },
        { q: 'A gdy brakuje czasu?', a: 'Skróć listę zamiast mówić szybciej. Krótszy plan jest prawdziwym planem.' },
      ],
      body(href) {
        return `
          <p class="lead">Ta sama kolejność zamienia listę w nawyk. Zamiast powtarzać „umyj zęby”, patrzycie na następny obrazek.</p>
          <h2>Przykład</h2>
          <ol>
            <li>Wstanie</li>
            <li>Toaleta i ręce</li>
            <li>Ubranie</li>
            <li>Śniadanie</li>
            <li>Zęby</li>
            <li>Kurtka, buty, plecak</li>
          </ol>
          <p>Wiele dzieci w wieku przedszkolnym lepiej radzi sobie z czterema albo pięcioma krokami.</p>
          <p>Rodziny, które szukają więcej oparcia przy przejściach, mogą przeczytać <a href="${href('neurodiverseRoutines')}">poradnik o jasności</a>. My Starday podpiera dzień, to nie jest leczenie.</p>
        `;
      },
    },
    weeklySchedule: {
      title: 'Plan tygodnia z piktogramami | My Starday',
      description: 'Plan tygodnia z piktogramami pokazuje, jaki jest dzień, nie tylko co dzieje się teraz.',
      h1: 'Plan tygodnia z piktogramami',
      ogTitle: 'Plan tygodnia',
      faqs: [
        { q: 'Czym różni się od planu dnia?', a: 'Dzień to kroki na dziś. Tydzień pokazuje, czym dni się różnią.' },
        { q: 'Od jakiego wieku?', a: 'Często koło wieku szkolnego, gdy tydzień bardziej się zmienia. Młodsze dzieci najpierw potrzebują dzisiejszego dnia.' },
      ],
      body(href) {
        return `
          <p class="lead">Plan tygodnia pomaga, gdy dzień powszedni i weekend są inne albo gdy „co będzie jutro?” potrzebuje odpowiedzi przed snem.</p>
          <p>Poniedziałek ze sportem, środa u drugiego rodzica, piątek z filmem. Obrazki pokazują to, zanim dziecko przeczyta kalendarz.</p>
          <p><a href="${href('visualSchedule')}">Plan dnia</a> zostaje krokami na dziś. Plan tygodnia mówi, jaki jest dzień.</p>
          <p>My Starday nie obiecuje wyniku medycznego.</p>
        `;
      },
    },
    neurodiverseRoutines: {
      title: 'Rutyny dla dzieci neuroróżnorodnych | My Starday',
      description: 'Więcej jasności w dniu dla dzieci, które potrzebują wyraźnych przejść. My Starday pomaga na co dzień, to nie leczenie i nie diagnoza.',
      h1: 'Rutyny dla dzieci neuroróżnorodnych',
      ogTitle: 'Rutyny dla dzieci neuroróżnorodnych',
      faqs: [
        { q: 'Czy potrzebna jest diagnoza?', a: 'Nie. Plan pomaga tam, gdzie potrzeba więcej jasności. Diagnoza nie jest warunkiem.' },
        { q: 'Czy zastępuje terapię?', a: 'Nie. To nie leczenie i nie zastępuje rady specjalistów.' },
      ],
      body(href) {
        return `
          <p class="lead">Niektóre dzieci muszą zobaczyć następny krok, a nie usłyszeć go głośniej. Dotyczy to rodzin z diagnozą i bez niej.</p>
          <h2>ADHD: zacząć i zostać przy kroku</h2>
          <p>Przejście często staje, bo następnego kroku nie widać. Plan z kratką daje od razu odpowiedź: ten krok jest zrobiony.</p>
          <h2>Autyzm: przewidywalny dzień</h2>
          <p>Inna kolejność może być duża. <a href="${href('weeklySchedule')}">Plan tygodnia</a> pokazuje wcześniej, jaki dzień nadchodzi. Usunięty krok trzeba zmienić widocznie, a nie po cichu.</p>
          <p>My Starday to pomoc edukacyjna w zwykłym dniu. To nie leczenie medyczne i nie zastępuje rady lekarza, terapeuty zajęciowego, logopedy ani szkoły. Karty w rodzaju najpierw, potem i gotowe nie są jeszcze polskim plikiem PDF. Takie karty są inspirowane tym podejściem: to nie oficjalna metoda i nie certyfikat.</p>
        `;
      },
    },
    rewardSystem: {
      title: 'System nagród dla dzieci | My Starday',
      description: 'Nagroda umówiona wcześniej to nie targowanie w danej chwili. Dziecko zdobywa gwiazdki. Nie kupuje się ich.',
      h1: 'System nagród dla dzieci, bez zamieniania go w targ',
      ogTitle: 'System nagród',
      faqs: [
        { q: 'Czy tabela gwiazdek to przekupstwo?', a: 'Nie, jeśli nagroda jest ustalona wcześniej i dotyczy czegoś, co dziecko może zrobić. Targ proponuje się w chwili, żeby coś przerwać.' },
        { q: 'Ile gwiazdek?', a: 'Zacznij od jednej gwiazdki za ukończony krok. Gwiazdek nie kupuje się.' },
      ],
      body(href) {
        return `
          <p class="lead">„Czy to nie przekupstwo?” zależy od chwili umowy. Ustalona wcześniej tablica może podpierać nawyk. Zaproponowana w środku złości staje się negocjacją.</p>
          <p>Na <a href="${href('visualSchedule')}">planie dnia</a> łańcuch jest prosty: zobaczyć krok, zrobić, odhaczyć, dostać gwiazdkę.</p>
          <ol>
            <li>Bądź konkretny. Nagradzaj „myje zęby bez przypomnienia”, nie „jest grzeczne”.</li>
            <li>Pokaż postęp.</li>
            <li>Licz próbę, nie tylko idealny poranek.</li>
            <li>Niech dziecko pomyśli o nagrodzie razem z tobą.</li>
            <li>Rozrzedzaj gwiazdki, gdy nawyk już się trzyma.</li>
          </ol>
          <p>Gwiazdek nie kupuje się. My Starday nie obiecuje wyniku medycznego.</p>
        `;
      },
    },
    resources: {
      title: 'Materiały do obrazkowych rutyn | My Starday',
      description: 'Co już jest po polsku i czego jeszcze nie ma jako PDF. Aplikacja i kartka do druku to dwie różne rzeczy.',
      h1: 'Materiały',
      ogTitle: 'Materiały',
      faqs: [
        { q: 'Czy są polskie pliki PDF?', a: 'Jeszcze nie. Ta strona nie sprzedaje szwedzkich kartek tak, jakby były przetłumaczone.' },
      ],
      body(href) {
        return `
          <p class="lead">Aplikacja pokazuje dzień na ekranie. Wydrukowana kartka to coś innego. Polskich plików PDF tu jeszcze nie ma.</p>
          <p>W aplikacji układasz <a href="${href('visualSchedule')}">plan dnia</a>, <a href="${href('morningRoutine')}">poranną rutynę</a> i <a href="${href('weeklySchedule')}">plan tygodnia</a>. Dziecko widzi tę samą kolejność w swoim widoku.</p>
          <p>Nie podlinkujemy biblioteki w innym języku tak, jakby była polska. Gdy pojawią się polskie kartki, będą na tej stronie.</p>
        `;
      },
    },
    faq: {
      title: 'Pytania | My Starday',
      description: 'Krótkie odpowiedzi o planie dnia, gwiazdkach, widoku dziecka i o tym, czym My Starday nie jest.',
      h1: 'Pytania',
      ogTitle: 'Pytania',
      faqs: [
        { q: 'Dla kogo jest ta witryna?', a: 'Witryna po polsku wyjaśnia produkt. Polska ma stronę rynku. Język zostaje polski.' },
        { q: 'Czy mogę kupić gwiazdki?', a: 'Nie.' },
        { q: 'Czy to aplikacja terapeutyczna?', a: 'Nie. Ani leczenie, ani obiecany wynik medyczny.' },
        { q: 'Gdzie zakłada się konto?', a: 'W istniejącym formularzu. Pyta, gdzie mieszka rodzina. Strona rynku sama nie ustawia kraju.' },
      ],
      body(href) {
        return `
          <p class="lead">Krótkie odpowiedzi. Dłuższe teksty są w poradnikach.</p>
          <h2>Język i kraj</h2>
          <p>Ta witryna jest po polsku. Kraj wybiera się osobno. Strona rynku nie zmienia języka i nie zakłada konta.</p>
          <h2>Dziecko</h2>
          <p>Dziecko widzi plan i odhacza. Ustawienia, zaproszenia i konto zostają u dorosłego. Więcej w <a href="${href('howItWorks')}">Jak to działa</a>.</p>
          <h2>Gwiazdki</h2>
          <p>Gwiazdki są za ukończone kroki. Nie kupuje się ich. Przeczytaj <a href="${href('rewardSystem')}">system nagród</a>.</p>
        `;
      },
    },
    privacy: {
      title: 'Polityka prywatności — My Starday',
      description: 'Jakie dane przetwarza My Starday, czego nie zbieramy i jakie prawa daje RODO.',
      h1: 'Polityka prywatności My Starday',
      ogTitle: 'Prywatność',
      body: `
        <p class="updated">Ostatnia aktualizacja: październik 2026</p>
        <p>Obchodzimy się z twoją prywatnością ostrożnie. My Starday zbiera jak najmniej: tylko to, czego aplikacja potrzebuje, żeby działać. Nie sprzedajemy twoich danych i nie używamy ich do reklam kierowanych. Udostępnienie poza usługą dzieje się tylko wtedy, gdy sam je wybierzesz, albo gdy jest potrzebne, żeby nasi przetwarzający utrzymali usługę.</p>
        <p><strong>Administrator:</strong> Papa Bravo AB odpowiada za przetwarzanie twoich danych osobowych. Piszesz do nas przez <a href="/en/contact">formularz kontaktowy</a>.</p>
        <h2>Co zbieramy</h2>
        <p>Przetwarzamy dane na podstawie umowy, żeby świadczyć aplikację i funkcje, do których się zapisujesz. O dorosłych i rodzinach zbieramy:</p>
        <ul>
          <li><strong>Adres e-mail</strong> — do logowania i wiadomości o koncie</li>
          <li><strong>Imię i nazwisko</strong> — żeby rozpoznać konto</li>
          <li><strong>Dziennik czynności</strong> — które czynności zostały ukończone i kiedy</li>
          <li><strong>Gwiazdki</strong> — zdobyte i wymienione gwiazdki</li>
          <li><strong>Plany i czynności</strong> — to, co sam tworzysz</li>
        </ul>
        <p><strong>Prywatność dzieci:</strong> dziecko rozpoznaje się tylko po imieniu albo przezwisku i wybranym emoji. Nie zbieramy nazwiska, numeru osobistego ani danych kontaktowych dziecka.</p>
        <h2>Czego nie zbieramy</h2>
        <ul>
          <li>Nazwisk dzieci</li>
          <li>Numerów osobistych, ani dorosłych, ani dzieci</li>
          <li>Danych o zdrowiu, diagnozie albo niepełnosprawności dziecka</li>
          <li>Danych płatniczych. Zakupy idą przez App Store albo Google Play</li>
          <li>Danych o lokalizacji</li>
        </ul>
        <h2>Do czego używamy danych</h2>
        <ul>
          <li>Pokazania dziecku planu dnia</li>
          <li>Przechowania postępu i gwiazdek</li>
          <li>Wysłania maila weryfikacyjnego i wiadomości o koncie</li>
          <li>Odpowiedzi na wiadomości, które do nas wysyłasz</li>
        </ul>
        <h2>Komu je przekazujemy</h2>
        <p>Nie przekazujemy twoich danych osobom trzecim w celach reklamowych. Ci przetwarzający utrzymują usługę. Przetwarzają tylko na nasze zlecenie i według RODO:</p>
        <ul>
          <li><strong>Neon (baza danych)</strong> — konto, plany, czynności i dane rodziny</li>
          <li><strong>Własny hosting (VPS w UE/EOG)</strong> — aplikacja webowa i API</li>
          <li><strong>Resend (e-mail)</strong> — maile transakcyjne, takie jak weryfikacja, hasło i powitanie</li>
          <li><strong>Cloudflare R2</strong> — wgrane zdjęcia profilowe, jeśli używasz tej funkcji</li>
          <li><strong>Apple i Google</strong> — logowanie i powiadomienia push przez APNs i FCM, jeśli używasz tych funkcji</li>
        </ul>
        <h2>Zestawienie do rozmowy</h2>
        <p>Jeśli jako dorosły odpowiedzialny tworzysz tymczasowy odnośnik do zestawienia wybranych liczb o czynnościach i nagrodach, możesz udostępnić go na przykład nauczycielowi albo terapeucie. Dzieje się to tylko dlatego, że sam tak wybierasz. Ty decydujesz o treści i możesz odnośnik cofnąć. Odbiorca nie potrzebuje konta.</p>
        <p>Jeśli chronisz odnośnik kodem, nie podawaj tego kodu w tej samej wiadomości co odnośnik.</p>
        <h2>Logowanie przez Apple albo Google</h2>
        <ul>
          <li><strong>Logowanie przez Apple:</strong> przetwarzamy imię i nazwisko oraz e-mail. Jeśli wybierzesz ukrycie adresu, zachowujemy unikalny adres przekierowania, który tworzy Apple, żeby móc wysyłać wiadomości o koncie.</li>
          <li><strong>Logowanie przez Google:</strong> otrzymujemy i zachowujemy e-mail oraz nazwę konta Google, żeby utworzyć profil.</li>
        </ul>
        <p>Przetwarzanie po stronie Apple i Google odbywa się według ich własnych polityk prywatności.</p>
        <h2>Powiadomienia i tokeny urządzenia</h2>
        <p>Gdy włączysz powiadomienia, na podstawie twojej zgody zachowujemy unikalny token urządzenia (APNs albo FCM), żeby wiadomość doszła na właściwy sprzęt. Token jest powiązany z kontem.</p>
        <p>Tokeny wygasają przy wylogowaniu albo gdy platforma zgłosi token jako nieważny. Nie zachowujemy cechy urządzenia bez aktywnej subskrypcji push. Wyłącza się to w ustawieniach aplikacji albo na urządzeniu.</p>
        <h2>Okres przechowywania</h2>
        <p>Przechowujemy dane, dopóki konto jest aktywne. Gdy usuniesz konto, wszystkie dane są kasowane od razu i trwale.</p>
        <h2>Usunięcie konta</h2>
        <p>Konto usuwasz w aplikacji, w ustawieniach. Potwierdzasz hasłem albo logowaniem u podmiotu trzeciego.</p>
        <p>Tego nie da się cofnąć. Znikają wtedy konto dorosłego, profile dzieci, plany, dzienniki, oceny, nagrody i zaproszenia.</p>
        <h2>Przechowywanie i bezpieczeństwo</h2>
        <p>Dążymy do przechowywania danych podstawowych w UE/EOG, gdzie to obowiązuje. Niektórzy dostawcy mogą przetwarzać poza EOG. Przekazania i zabezpieczenia są w tej polityce i są na bieżąco przeglądane. Połączenia są szyfrowane (HTTPS). Hasła nie są zapisane otwartym tekstem. Używamy bcrypt.</p>
        <h2>Pliki cookie</h2>
        <ul>
          <li><strong>Ściśle niezbędne</strong> — zawsze włączone. Sesja i ochrona CSRF dla bezpiecznego logowania.</li>
          <li><strong>Preferencje</strong> — zapisane lokalnie, na przykład motyw.</li>
          <li><strong>Statystyka i marketing</strong> — Google Analytics 4, Meta Pixel i Google Ads. Domyślnie wyłączone, dopóki nie wyrazisz zgody w banerze.</li>
        </ul>
        <p>Twój wybór przechowujemy najwyżej rok. Możesz go zmienić w banerze albo w ustawieniach. Dane rutyn dzieci nie idą na platformy reklamowe.</p>
        <h2>Twoje prawa (RODO)</h2>
        <ul>
          <li>Prawo do usunięcia konta i danych</li>
          <li>Prawo dostępu</li>
          <li>Prawo do sprostowania nieprawidłowych danych</li>
          <li>Prawo sprzeciwu albo ograniczenia</li>
          <li>Prawo skargi do szwedzkiego organu Integritetsskyddsmyndigheten (IMY), jeśli uważasz, że naruszamy RODO</li>
        </ul>
        <h2>Kontakt</h2>
        <p>Pytania o to przetwarzanie? Użyj <a href="/en/contact">formularza kontaktowego</a>.</p>
      `,
    },
    terms: {
      title: 'Regulamin — My Starday',
      description: 'Zasady korzystania z My Starday: konto, dzieci, cena i odpowiedzialność.',
      h1: 'Regulamin',
      ogTitle: 'Regulamin',
      body: `
        <p class="updated">Ostatnia aktualizacja: październik 2026</p>
        <p>Dziękujemy, że korzystasz z My Starday. Ten regulamin ma być jasny i uczciwy. Pytania kierujesz przez <a href="/en/contact">formularz kontaktowy</a>.</p>
        <h2>1. Usługa</h2>
        <p>My Starday to usługa cyfrowa dla rodzin, które chcą ułożonego planu dnia, oznaczać postęp dziecka gwiazdkami i pozwolić dziecku śledzić czynności we własnym widoku. Usługa jest dla rodziców i opiekunów oraz ich dzieci. Rodzina ma co najmniej jednego dorosłego z kontem. Dzieci logują się kodem PIN w widoku dziecka.</p>
        <h2>2. Konto i bezpieczeństwo</h2>
        <ul>
          <li>Wybierz mocne hasło i nie udostępniaj go</li>
          <li>Chroń adres e-mail. Nim odzyskujesz dostęp</li>
          <li>PIN widoku dziecka jest tylko dla dziecka i opiekunów</li>
          <li>Nie używaj aplikacji w sposób sprzeczny ze szwedzkim prawem</li>
        </ul>
        <p>Odpowiadasz za wszystko, co dzieje się na twoim koncie, także gdy używa go ktoś inny. Jeśli podejrzewasz nadużycie, napisz od razu.</p>
        <h2>3. Dzieci i dane osobowe</h2>
        <p>My Starday przetwarza dane o dzieciach. Stosujemy RODO i zasadę minimalizacji:</p>
        <ul>
          <li>Dzieci rozpoznaje się po imieniu i wybranym emoji. Bez nazwiska, numeru osobistego i danych kontaktowych</li>
          <li>Rodzice albo opiekunowie wpisują dane i zgadzają się na udostępnienie</li>
          <li>Nie używamy danych dzieci do reklamy ani do niczego poza usługą</li>
          <li>Zestawienia i plany są udostępniane tylko wtedy, gdy dorosły sam udostępni tymczasowy odnośnik</li>
        </ul>
        <h2>4. Treści, które tworzysz</h2>
        <p>Plany, nagrody, czynności i obserwacje, które dodajesz, należą do ciebie albo do rodziny. Dajesz nam prawo przechowywać je i pokazywać, dopóki konto jest aktywne. Nie kopiujemy ich do reklamy, nie sprzedajemy ich i nie używamy ich w marketingu.</p>
        <h2>5. Korzystanie</h2>
        <p>Usługa jest do osobistego użytku w rodzinie. Niedozwolone jest:</p>
        <ul>
          <li>Użycie komercyjne bez umowy z Papa Bravo AB</li>
          <li>Manipulowanie planami, gwiazdkami albo nagrodami poza zwykłymi ścieżkami aplikacji</li>
          <li>Środki automatyczne, scrapery albo boty przeciw usłudze</li>
          <li>Publikowanie treści bezprawnych, obraźliwych albo szkodliwych</li>
        </ul>
        <h2>6. Zakończenie i usunięcie</h2>
        <p>Konto możesz trwale usunąć w każdej chwili w ustawieniach aplikacji, potwierdzając hasłem.</p>
        <p>Usunięcie natychmiast i trwale kasuje konto dorosłego, wszystkie dzieci, plany, dzienniki czynności, gwiazdki, nagrody i ewentualne obserwacje.</p>
        <p>Możemy zawiesić konto, które łamie ten regulamin albo szwedzkie prawo.</p>
        <h2>7. Cena</h2>
        <p>Rodziny w Irlandii i Kanadzie mogą korzystać z My Starday bez opłat do 31 grudnia 2026 włącznie. W tym czasie płatność nie jest potrzebna. Okres bez opłat nie zmienia się automatycznie w subskrypcję. Od 1 stycznia 2027 możesz wybrać subskrypcję w App Store albo Google Play. Na tej stronie nie ma kasy internetowej. W innych krajach obowiązują cena i dostęp, które aplikacja pokazuje dla tego kraju. Szwedzkie rodziny, które zaczynają od 3 października 2026, mogą próbować aplikacji przez 14 dni, a potem wybrać 59 koron szwedzkich miesięcznie albo 590 koron szwedzkich rocznie w aplikacji. Rodziny, które już mają konto, zachowują istniejącą ofertę.</p>
        <h2>8. Zmiany</h2>
        <p>Możemy dostosować ten regulamin, na przykład po zmianie prawa, nowej funkcji albo doprecyzowaniu. Jeśli zmiana jest istotna, powiemy o niej mailem albo komunikatem w aplikacji.</p>
        <p>Dalsze korzystanie z usługi oznacza przyjęcie nowych warunków.</p>
        <h2>9. Odpowiedzialność</h2>
        <p>My Starday jest udostępniane w stanie, w jakim jest. Staramy się utrzymać usługę stabilną i bezpieczną, ale nie możemy zagwarantować, że będzie zawsze dostępna bez przerw.</p>
        <p>Papa Bravo AB nie odpowiada za:</p>
        <ul>
          <li>Utratę danych z powodu siły wyższej</li>
          <li>Szkodę wynikłą z tego, że udostępnisz PIN albo dane logowania osobie, która nie powinna ich mieć</li>
          <li>Szkodę pośrednią, utraconą szansę albo utracone dane, chyba że szwedzkie prawo stanowi inaczej</li>
        </ul>
        <p>Odpowiadasz za korzystanie zgodne z tym regulaminem i ze szwedzkim prawem.</p>
        <h2>10. Kontakt</h2>
        <p>Pytania o ten regulamin albo o usługę? Użyj <a href="/en/contact">formularza kontaktowego</a>.</p>
      `,
    },
  },
});

module.exports = { pageFor };
