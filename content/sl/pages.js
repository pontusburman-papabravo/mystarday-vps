'use strict';

/**
 * Slovenian public pages. Written in Slovenian.
 * Legal text translates the verified baseline. It adds no Slovenian statute.
 */

const { composeLocale, faq } = require('../compose-pages');

const pageFor = composeLocale('sl', {
  marker: /otrok/i,
  market: {
    title: (name) => `My Starday — ${name}. Vizualni dnevni načrti za otroke`,
    description: (name) => `Tržna stran za ${name}. Vizualni dnevni načrti v slovenščini. To je tržna stran, ne samostojno jezikovno spletno mesto.`,
    h1: (name) => `Vizualni dnevni načrti za družine. Trg: ${name}`,
    lead: (name) => `To je stran za ${name}. Slovensko spletno mesto ostane jezikovno mesto.`,
    registrationOpen: (name) => `Novi računi v državi ${name} sledijo obstoječi registraciji. Privzeto je odprto.`,
    registrationClosed: (name) => `Novi računi v državi ${name} privzeto niso odprti. To sledi obstoječi registraciji, ne tej strani. Privzeto je zaprto.`,
    complimentary: (name) => `Za ${name} velja obstoječe brezplačno obdobje. Samo od sebe ne postane naročnina. Ta stran ne določi cene.`,
    introYear: (name) => `${name} obdrži ponudbo, ki je že na švedskem spletnem mestu. Ta stran ne določi cene. Na tem trgu ni brezplačnega obdobja do 31. decembra 2026.`,
    trial: (name, days) => `Če bo račun tu pozneje mogoč, velja obstoječe pravilo zunaj Švedske, Irske in Kanade: preskus ${days} dni. Plačilo mora biti najprej na voljo. Na tem trgu ni brezplačnega obdobja do 31. decembra 2026 in nič samo od sebe ne postane naročnina. Ta stran ne določi cene.`,
    notTreatment: (name) => `Gumb odpre običajno stran App Store, ne izmišljene strani izdelka za ${name}. My Starday je vizualni dnevni načrt. Ni zdravljenje in ne obljublja zdravniškega izida.`,
    register: 'Ustvari račun',
    registerNote: 'Obrazec vpraša, kje družina živi. Ta povezava sama ne nastavi države ali cene.',
    how: 'Kako deluje',
    playSoon: 'Google Play tu ni odprt kot lastna stran.',
  },
  home: {
    title: 'Vizualni dnevni načrt za otroke – rutine, nagrade in piktogrami | My Starday',
    description: 'Vizualni dnevni načrti in rutine, ki otroku pokažejo, kaj se dogaja zdaj in kaj pride potem. Piktogrami, lasten otroški pogled in zvezdice za opravljene korake.',
    h1: 'Vizualni dnevni načrti in rutine, ki otroku pokažejo, kaj se dogaja zdaj in kaj pride potem.',
    ogTitle: 'Vizualni dnevni načrt za otroke',
    faqs: [
      faq('Kaj je My Starday?', 'Vizualni dnevni načrt za družine. Otrok vidi naslednji korak. Odrasli obdrži nastavitve.'),
      faq('Ali se zvezdice kupijo?', 'Ne. Zvezdica je za opravljen korak. Kupiti je ni mogoče.'),
      faq('Ali je to zdravljenje?', 'Ne. My Starday je pomoč v vsakdanu in ne obljublja zdravniškega izida.'),
    ],
    lead: 'Otrok se umiri, ko je naslednji korak viden. My Starday pokaže dan v slikah: zdaj, potem, končano.',
    hSee: 'Kaj otrok vidi',
    see: 'Otroški pogled pokaže en korak naenkrat. Odrasli naredi načrt. Otrok odkljuka. Več otrok lahko deli isti dom, vsak s svojim načrtom.',
    hStars: 'Zvezdice',
    stars: 'Opravljen korak lahko da zvezdico. Zvezdic ni mogoče kupiti. Ne nadomestijo dogovora, ki ste ga sklenili vnaprej. Več je v',
    starsLink: 'sistemu nagrad',
    hTreat: 'Ni zdravljenja',
    treat: 'Načrt lahko pomaga otroku, ki potrebuje več pregleda, tudi pri ADHD ali avtizmu, in enako družinam brez diagnoze. My Starday ni zdravljenje in ne obljublja določenega izida.',
    marketsIntro: 'Slovensko spletno mesto razloži izdelek. Država je nekaj drugega. Lastna stran je za',
    linkHow: 'Kako deluje',
    linkVisual: 'Vizualni dnevni načrt',
    linkMorning: 'Jutranja rutina',
  },
  howItWorks: {
    title: 'Kako deluje My Starday | Vizualni dnevni načrt',
    description: 'Odrasli sestavi dan. Otrok vidi naslednji korak in ga odkljuka. Zvezdice so za opravljene korake, ne za nakup.',
    h1: 'Kako deluje My Starday',
    ogTitle: 'Kako deluje',
    faqs: [
      faq('Kdo nastavi načrt?', 'Odrasli. Otrok vidi otroški pogled in odkljuka korake.'),
      faq('Ali otrok potrebuje e-pošto?', 'Ne. Otrok se prijavi z imenom in PIN-om.'),
    ],
    lead: 'Jutro nosijo tri stvari: viden načrt, otrok, ki sam odkljuka, in odrasli, ki drži nastavitve.',
    hPlan: '1. Načrt',
    plan: 'Dejavnosti daste v vrstni red, ki ga jutro res ima. Slike pomagajo, ko otrok še ne bere.',
    planLink: 'Vizualni dnevni načrt pokaže zdaj in potem',
    hChild: '2. Otroški pogled',
    child: 'Otrok vidi naslednji korak, ne nastavitev družine. Ni oglasov in ni družbenega omrežja.',
    hStar: '3. Zvezdica',
    star: 'Končan korak lahko da zvezdico. Zvezdice ni mogoče kupiti. Dogovor stoji vnaprej, ne sredi hitenja.',
    closing: 'My Starday je pomoč v vsakdanu. Ni zdravljenje in ne nadomesti nasveta zdravnika, terapevta ali šole.',
  },
  visualSchedule: {
    title: 'Vizualni dnevni načrt za otroke | My Starday',
    description: 'Vizualni dnevni načrt otroku pokaže, kaj se dogaja zdaj in kaj pride potem. Malo korakov, znane slike, jasen vrstni red.',
    h1: 'Vizualni dnevni načrt za otroke',
    ogTitle: 'Vizualni dnevni načrt',
    faqs: [
      faq('Koliko korakov?', 'Pogosto zadoščajo štirje ali pet. Daljši seznam gre, ko je vrstni red že znan.'),
      faq('Fotografije ali simboli?', 'Slike, ki jih otrok že pozna. Fotografije od doma delujejo dobro.'),
    ],
    lead: 'Vizualni dnevni načrt naredi vrstni red viden. Otroku ni treba ugibati, kaj pride potem.',
    hNow: 'Zdaj in potem',
    now: 'Pokažite samo trenutni korak in naslednjega. Dolg seznam na steni pomaga manj kot jasen naslednji prijem.',
    hStuck: 'Ko se korak ustavi',
    stuck1: 'Razdelite korak. „Obleči se“ so nogavice, hlače, majica.',
    stuck2: 'Eden za drugim.',
    stuck3: 'Pokažite, namesto da ponavljate.',
    bridge: 'Zjutraj je v središču',
    morningLink: 'jutranja rutina',
    weekLink: 'Tedenski načrt pokaže, kateri dan je',
    closing: 'My Starday ni zdravljenje in ne obljublja zdravniškega izida.',
  },
  morningRoutine: {
    title: 'Jutranja rutina za otroke | My Starday',
    description: 'Jutranja rutina s slikami zmanjša število govorjenih opominov. Isti vrstni red, dan za dnem.',
    h1: 'Jutranja rutina za otroke',
    ogTitle: 'Jutranja rutina',
    faqs: [
      faq('Kaj sodi v jutro?', 'Samo tisto, kar se res zgodi pred odhodom. Vstati, obleči se, jesti, zobje, jakna.'),
      faq('Kaj če zmanjka časa?', 'Skrajšajte seznam, namesto da govorite hitreje. Krajši načrt je pravi načrt.'),
    ],
    lead: 'Isti vrstni red naredi iz seznama navado. Namesto še enega „umij zobe“ pogledate naslednjo sliko.',
    hExample: 'Primer',
    steps: ['Vstati', 'Stranišče in umiti roke', 'Obleči se', 'Zajtrk', 'Umij zobe', 'Jakna, čevlji, torba'],
    age: 'Otrok v vrtcu pogosto bolje zmore štiri ali pet korakov.',
    bridge: 'Družine, ki iščejo več opore pri prehodih, lahko preberejo',
    bridgeLink: 'vodnik o pregledu',
    closing: 'My Starday je opora v dnevu, ne zdravljenje.',
  },
  weeklySchedule: {
    title: 'Tedenski načrt s piktogrami za otroke | My Starday',
    description: 'Tedenski načrt s piktogrami pokaže, kateri dan je, ne samo kaj se dogaja prav zdaj.',
    h1: 'Tedenski načrt s piktogrami',
    ogTitle: 'Tedenski načrt s piktogrami',
    faqs: [
      faq('V čem se razlikuje od dnevnega načrta?', 'Dnevni načrt so današnji koraki. Tedenski načrt pokaže, kako se dnevi razlikujejo.'),
      faq('Od katere starosti?', 'Pogosto ob vstopu v šolo, ko se teden bolj menja. Mlajši otrok najprej potrebuje današnji dan.'),
    ],
    lead: 'Tedenski načrt pomaga, ko se dan v tednu in konec tedna razlikujeta, ali ko „kaj je jutri?“ potrebuje odgovor pred spanjem.',
    mid: 'Ponedeljek s športom, sreda pri drugem staršu, petek s filmom. Slike to pokažejo, preden otrok bere koledar.',
    dayLink: 'Dnevni načrt',
    dayRest: 'so današnji koraki. Tedenski načrt pove, kateri dan je.',
    closing: 'My Starday ne obljublja zdravniškega izida.',
  },
  neurodiverseRoutines: {
    title: 'Rutine za nevroraznolike otroke | My Starday',
    description: 'Več pregleda v dnevu za otroka, ki potrebuje jasne prehode. My Starday je pomoč v vsakdanu, ne zdravljenje in ne diagnoza.',
    h1: 'Rutine za nevroraznolike otroke',
    ogTitle: 'Rutine za nevroraznolike otroke',
    faqs: [
      faq('Ali je to samo za diagnozo?', 'Ne. Načrt pomaga tam, kjer je treba več pregleda. Diagnoza ni pogoj.'),
      faq('Ali nadomesti terapijo?', 'Ne. Ni zdravljenje in ne nadomesti nasveta strokovnjakov.'),
    ],
    lead: 'Kakšen otrok potrebuje, da je naslednji korak viden, ne razložen glasneje. Velja z diagnozo in brez nje.',
    hAdhd: 'ADHD: začeti in ostati pri koraku',
    adhd: 'Prehod se pogosto ustavi, ker naslednjega koraka ni videti. Načrt s kljukico takoj pove: ta korak je končan.',
    hAutism: 'Avtizem: predvidljivost',
    autism: 'Drug vrstni red je lahko velik.',
    weekLink: 'Tedenski načrt',
    autismRest: 'vnaprej pokaže, kateri dan pride. Prečrtan korak naj se spremeni vidno, ne izgine v tišini.',
    closing: 'My Starday je pomoč v vsakdanu. Ni zdravniško zdravljenje in ne nadomesti nasveta zdravnika, delovnega terapevta, logopeda ali šole. Kartice v pomenu najprej, potem in končano še niso slovenski PDF. Take kartice so navdih, ne uradna metoda in ne certifikat.',
  },
  rewardSystem: {
    title: 'Sistem nagrad za otroke | My Starday',
    description: 'Nagrada, o kateri se dogovorite vnaprej, je nekaj drugega kot kupčija v trenutku. Otrok zvezdice zasluži. Kupiti jih ni mogoče.',
    h1: 'Sistem nagrad za otroke, ne da bi to postala kupčija',
    ogTitle: 'Sistem nagrad za otroke',
    faqs: [
      faq('Ali je kartica z zvezdicami podkupnina?', 'Ne, ko nagrada stoji vnaprej in visi na nečem, kar otrok zmore. Kupčijo ponudijo v trenutku, da bi se nekaj ustavilo.'),
      faq('Koliko zvezdic?', 'Začnite z eno zvezdico na opravljen korak. Zvezdic ni mogoče kupiti.'),
    ],
    lead: '„Ali to ni samo podkupnina?“ je odvisno od tega, kdaj se dogovorite. Dogovor vnaprej lahko kartico opre na navado. Sredi jeze postane pogajanje.',
    planLink: 'V vizualnem dnevnem načrtu',
    chain: 'je veriga preprosta: videti korak, narediti ga, odkljukati, dobiti zvezdico.',
    steps: [
      'Bodite konkretni. Nagradite „umije zobe brez opomina“, ne „je prijazen“.',
      'Pokažite napredek.',
      'Štejte poskus, ne samo popolno jutro.',
      'Naj otrok sodeluje pri nagradi.',
      'Zvezdice redčite, ko navada stoji.',
    ],
    closing: 'Zvezdic ni mogoče kupiti. My Starday ne obljublja zdravniškega izida.',
  },
  resources: {
    title: 'Gradiva za vizualne rutine | My Starday',
    description: 'Kaj v slovenščini že je in česa še ni kot PDF. Aplikacija in natisnjen list sta dve različni stvari.',
    h1: 'Gradiva',
    ogTitle: 'Gradiva',
    faqs: [faq('Ali so slovenski PDF-ji?', 'Še ne. Ta stran ne prodaja švedskih listov kot slovenskega prevoda.')],
    lead: 'Aplikacija pokaže dan na zaslonu. Natisnjen list je nekaj drugega. Slovenskih PDF-jev tu še ni.',
    app: 'V aplikaciji sestavite',
    dayLink: 'dnevni načrt',
    morningLink: 'jutranjo rutino',
    weekLink: 'tedenski načrt',
    appRest: 'Otrok vidi isti vrstni red v otroškem pogledu.',
    nolink: 'Ne povežemo knjižnice v drugem jeziku, kot da bi bila slovenska. Ko slovenski listi pridejo, bodo na tej strani.',
  },
  faq: {
    title: 'Pogosta vprašanja | My Starday',
    description: 'Kratki odgovori o dnevnem načrtu, zvezdicah, otroškem pogledu, ceni in o tem, kaj My Starday ni.',
    h1: 'Pogosta vprašanja',
    ogTitle: 'Pogosta vprašanja',
    faqs: [
      faq('Za koga je spletno mesto?', 'Slovensko spletno mesto razloži izdelek. Slovenija ima lastno tržno stran. Jezik ostane slovenščina.'),
      faq('Ali lahko kupim zvezdice?', 'Ne.'),
      faq('Ali je to terapevtska aplikacija?', 'Ne. Nobenega zdravljenja, nobenega obljubljenega zdravniškega izida.'),
      faq('Kje ustvarim račun?', 'V obstoječem obrazcu. Vpraša, kje družina živi. Tržna stran države ne nastavi sama.'),
    ],
    lead: 'Kratki odgovori. Daljša besedila so v vodnikih.',
    hLang: 'Jezik in država',
    lang: 'To spletno mesto je v slovenščini. Državo izberete posebej. Tržna stran jezika ne spremeni in računa ne ustvari.',
    hChild: 'Otrok',
    child: 'Otrok vidi načrt in odkljuka. Nastavitve, vabila in račun ostanejo pri odraslem. Več je v',
    howLink: 'Kako deluje',
    hStars: 'Zvezdice',
    stars: 'Zvezdice so za opravljene korake. Kupiti jih ni mogoče. Preberite',
    starsLink: 'sistem nagrad',
  },
  privacy: {
    title: 'Pravilnik o zasebnosti — My Starday',
    description: 'Katere podatke My Starday obdeluje, česa ne zbiramo in katere pravice daje GDPR.',
    h1: 'Pravilnik o zasebnosti za My Starday',
    ogTitle: 'Pravilnik o zasebnosti',
    body: `
      <p class="updated">Nazadnje posodobljeno: oktober 2026</p>
      <p>Z zasebnostjo ravnamo skrbno. My Starday zbere čim manj: samo tisto, kar aplikacija potrebuje, da deluje. Tvojih podatkov ne prodajamo in jih ne uporabljamo za ciljano oglaševanje. Posredovanje zunaj storitve se zgodi samo, ko ga izbereš sam, ali ko je potrebno, da naši obdelovalci storitev vodijo.</p>
      <p><strong>Upravljavec:</strong> Papa Bravo AB je odgovoren za obdelavo tvojih osebnih podatkov. Dosežeš nas prek <a href="/en/contact">kontaktnega obrazca</a>.</p>
      <h2>Kaj zbiramo</h2>
      <p>Podatke obdelujemo na podlagi pogodbe, da lahko damo aplikacijo in funkcije, v katere se prijaviš. O odraslih in družinah zbiramo:</p>
      <ul>
        <li><strong>E-pošto</strong> — za prijavo in sporočila o računu</li>
        <li><strong>Ime in priimek</strong> — da račun prepoznamo</li>
        <li><strong>Zapis dejavnosti</strong> — katere dejavnosti so bile končane in kdaj</li>
        <li><strong>Zvezdice</strong> — pridobljene in unovčene zvezdice</li>
        <li><strong>Načrte in dejavnosti</strong> — tisto, kar sam ustvariš</li>
      </ul>
      <p><strong>Zasebnost otroka:</strong> otroka prepoznamo samo po imenu ali vzdevku in izbranem emojiju. Ne zbiramo priimka, identifikacijske številke ali stika otroka.</p>
      <h2>Česa ne zbiramo</h2>
      <ul>
        <li>Nobenih priimkov otrok</li>
        <li>Nobenih identifikacijskih številk, ne odraslih ne otrok</li>
        <li>Nobenih podatkov o zdravju, diagnozi ali invalidnosti otroka</li>
        <li>Nobenih plačilnih podatkov. Nakupi gredo prek App Store ali Google Play</li>
        <li>Nobenih podatkov o lokaciji</li>
      </ul>
      <h2>Za kaj podatke uporabljamo</h2>
      <ul>
        <li>Otroku pokazati dnevni načrt</li>
        <li>Shraniti napredek in zvezdice</li>
        <li>Poslati potrditveno e-pošto in sporočila o računu</li>
        <li>Odgovoriti na sporočila, ki nam jih pošlješ</li>
      </ul>
      <h2>Posredovanje</h2>
      <p>Tvojih podatkov ne posredujemo za oglaševanje. Ti obdelovalci vodijo storitev. Obdelujejo samo po našem naročilu in po GDPR:</p>
      <ul>
        <li><strong>Neon (zbirka podatkov)</strong> — račun, načrti, dejavnosti in podatki družine</li>
        <li><strong>Lastno gostovanje (VPS v EU/EGP)</strong> — spletna aplikacija in API</li>
        <li><strong>Resend (e-pošta)</strong> — transakcijska pošta, na primer potrditev, geslo in pozdravno sporočilo</li>
        <li><strong>Cloudflare R2</strong> — naložene profilne fotografije, ko funkcijo uporabiš</li>
        <li><strong>Apple in Google</strong> — prijava in potisna sporočila prek APNs in FCM, ko funkcije uporabiš</li>
      </ul>
      <h2>Poročilo za pogovor</h2>
      <p>Ko kot zakoniti zastopnik ustvariš časovno omejeno povezavo do izbranih številk o dejavnostih in nagradah, jo lahko deliš, na primer z učiteljem ali terapevtom. To se zgodi samo zato, ker tako izbereš. Vsebino določiš ti in povezavo lahko prekličeš. Prejemnik ne potrebuje računa.</p>
      <p>Če povezavo zaščitiš s kodo, kode ne deli v istem sporočilu kot povezavo.</p>
      <h2>Prijava z Apple ali Google</h2>
      <ul>
        <li><strong>Prijava z Apple:</strong> obdelujemo ime in e-pošto. Če izbereš skriti e-pošto, shranimo edinstven naslov za posredovanje, ki ga ustvari Apple, da lahko pošljemo sporočila o računu.</li>
        <li><strong>Prijava z Google:</strong> prejmemo in shranimo e-pošto in ime računa Google, da ustvarimo profil.</li>
      </ul>
      <p>Lastna obdelava Apple in Google sledi njunim pravilnikom.</p>
      <h2>Potisna sporočila in žeton naprave</h2>
      <p>Če vklopiš potisna sporočila, na podlagi tvojega soglasja shranimo edinstven žeton naprave (APNs ali FCM), da sporočilo pride na pravo napravo. Žeton je vezan na tvoj račun.</p>
      <p>Žeton poteče ob odjavi ali ko platforma žeton označi za neveljaven. Ne shranimo znaka naprave brez aktivne naročnine na potisna sporočila. Izklop je v nastavitvah aplikacije ali na napravi.</p>
      <h2>Čas hrambe</h2>
      <p>Podatke hranimo, dokler je račun dejaven. Če račun izbrišeš, se vsi podatki takoj in trajno izbrišejo.</p>
      <h2>Izbris računa</h2>
      <p>Račun izbrišeš v aplikaciji v nastavitvah. Potrdiš z geslom ali s prijavo tretje osebe.</p>
      <p>Tega ni mogoče razveljaviti. Izginejo račun odraslega, profili otrok, načrti, dnevni zapisi, ocene, nagrade in vabila.</p>
      <h2>Hramba in varnost</h2>
      <p>Prizadevamo si, da jedrne podatke hranimo v EU/EGP, kjer to velja. Nekateri ponudniki lahko obdelujejo zunaj EGP. Prenos in jamstva so v tem besedilu in jih sproti pregledujemo. Povezave so šifrirane (HTTPS). Gesla niso v berljivi obliki. Uporabljamo bcrypt.</p>
      <h2>Piškotki</h2>
      <ul>
        <li><strong>Nujni piškotki</strong> — vedno vklopljeni. Seja in zaščita CSRF za varno prijavo.</li>
        <li><strong>Nastavitve</strong> — shranjene lokalno, na primer tema.</li>
        <li><strong>Statistika in trženje</strong> — Google Analytics 4, Meta Pixel in Google Ads. Privzeto izklopljeni, dokler ne privoliš v obvestilu o piškotkih.</li>
      </ul>
      <p>Tvojo izbiro hranimo največ eno leto. Spremeniš jo lahko v obvestilu ali nastavitvah. Podatki o rutini otroka ne gredo na oglaševalske platforme.</p>
      <h2>Tvoje pravice (GDPR)</h2>
      <ul>
        <li>Pravica izbrisati račun in podatke</li>
        <li>Pravica do dostopa</li>
        <li>Pravica do popravka netočnih podatkov</li>
        <li>Pravica do ugovora ali omejitve</li>
        <li>Pravica do pritožbe švedskemu nadzorniku Integritetsskyddsmyndigheten (IMY), če meniš, da kršimo GDPR</li>
      </ul>
      <h2>Stik</h2>
      <p>Vprašanja o tej obdelavi? Uporabi <a href="/en/contact">kontaktni obrazec</a>.</p>
    `,
  },
  terms: {
    title: 'Pogoji uporabe — My Starday',
    description: 'Pogoji uporabe My Starday: račun, otroci, cena in odgovornost.',
    h1: 'Pogoji uporabe',
    ogTitle: 'Pogoji uporabe',
    body: `
      <p class="updated">Nazadnje posodobljeno: oktober 2026</p>
      <p>Hvala, da uporabljaš My Starday. Ti pogoji naj bodo jasni in pošteni. Vprašanja pošlji prek <a href="/en/contact">kontaktnega obrazca</a>.</p>
      <h2>1. O storitvi</h2>
      <p>My Starday je digitalna storitev za družine, ki hočejo urejen dnevni načrt, označiti napredek otroka z zvezdicami in otroku pustiti, da dejavnosti spremlja v lastnem pogledu. Storitev je za starše in zakonite zastopnike in njihove otroke. Družina ima vsaj enega odraslega z računom. Otrok se prijavi s PIN-om v otroškem pogledu.</p>
      <h2>2. Račun in varnost</h2>
      <ul>
        <li>Izberi močno geslo in ga ne deli</li>
        <li>Varuj svojo e-pošto. Z njo dobiš dostop nazaj</li>
        <li>PIN otroškega pogleda je samo za otroka in zakonite zastopnike</li>
        <li>Aplikacije ne uporabljaj na način, ki je v nasprotju s švedskim pravom</li>
      </ul>
      <p>Odgovarjaš za vse, kar se zgodi pod tvojim računom, tudi če ga uporabi kdo drug. Ob sumu zlorabe se takoj oglasi.</p>
      <h2>3. Otroci in osebni podatki</h2>
      <p>My Starday obdeluje podatke o otrocih. Sledimo GDPR in načelu najmanjšega obsega podatkov:</p>
      <ul>
        <li>Otroka prepoznamo po imenu in izbranem emojiju. Brez priimka, brez identifikacijske številke, brez stika</li>
        <li>Starši ali zakoniti zastopniki podatke vnesejo in privolijo v deljenje</li>
        <li>Podatkov otrok ne uporabljamo za oglaševanje in za nič drugega kot storitev</li>
        <li>Poročila in načrti se delijo samo, ko odrasli sam deli časovno omejeno povezavo</li>
      </ul>
      <h2>4. Vsebina, ki jo ustvariš</h2>
      <p>Načrti, nagrade, dejavnosti in opažanja, ki jih dodaš, pripadajo tebi ali tvoji družini. Daš nam pravico, da to vsebino shranimo in prikažemo, dokler je račun dejaven. Ne kopiramo je v oglaševanje, ne prodajamo je in je ne uporabljamo v trženju.</p>
      <h2>5. Uporaba</h2>
      <p>Storitev je za osebno rabo v tvoji družini. Ni dovoljeno:</p>
      <ul>
        <li>Komercialna raba brez dogovora s Papa Bravo AB</li>
        <li>Spreminjati načrte, zvezdice ali nagrade zunaj običajnega poteka aplikacije</li>
        <li>Avtomatizirana sredstva, strgala ali boti proti storitvi</li>
        <li>Objavljati vsebino, ki je nezakonita, žaljiva ali škodljiva</li>
      </ul>
      <h2>6. Prenehanje in izbris</h2>
      <p>Račun lahko kadar koli trajno izbrišeš v nastavitvah aplikacije, potrjeno z geslom.</p>
      <p>Izbris takoj in trajno odstrani račun odraslega, vse otroke, načrte, zapise dejavnosti, zvezdice, nagrade in morebitna opažanja.</p>
      <p>Lahko zapremo račun, ki krši te pogoje ali švedsko pravo.</p>
      <h2>7. Cena</h2>
      <p>Družine na Irskem in v Kanadi lahko My Starday uporabljajo brezplačno do 31. decembra 2026 vključno. V tem obdobju plačilo ni potrebno. Brezplačno obdobje samo od sebe ne postane naročnina. Od 1. januarja 2027 lahko izbereš naročnino v App Store ali na Google Play. Na tej strani ni spletne blagajne. V drugih državah veljata cena in dostop, ki ju aplikacija pokaže za to državo. Švedske družine, ki začnejo od 3. oktobra 2026, lahko aplikacijo preizkusijo 14 dni in potem v aplikaciji izberejo 59 švedskih kron na mesec ali 590 švedskih kron na leto. Družine, ki račun že imajo, obdržijo obstoječo ponudbo.</p>
      <h2>8. Spremembe</h2>
      <p>Te pogoje lahko prilagodimo, na primer po spremembi zakona, novi funkciji ali pojasnilu. Če je sprememba bistvena, to povemo po e-pošti ali z obvestilom v aplikaciji.</p>
      <p>Če storitev uporabljaš naprej, to velja kot sprejem novih pogojev.</p>
      <h2>9. Odgovornost</h2>
      <p>My Starday je na voljo tak, kot je. Naredimo, kar moremo, da je storitev stabilna in varna, ne moremo pa zagotoviti, da bo vedno na voljo brez prekinitve.</p>
      <p>Papa Bravo AB ne odgovarja za:</p>
      <ul>
        <li>Izgubo podatkov zaradi višje sile</li>
        <li>Škodo, ker PIN ali podatke za prijavo deliš s kom, ki jih ne bi smel imeti</li>
        <li>Posredno škodo, izgubljeno priložnost ali izgubljene podatke, razen če švedsko pravo zahteva drugače</li>
      </ul>
      <p>Odgovarjaš za uporabo po teh pogojih in po švedskem pravu.</p>
      <h2>10. Stik</h2>
      <p>Vprašanja o teh pogojih ali o storitvi? Uporabi <a href="/en/contact">kontaktni obrazec</a>.</p>
    `,
  },
});

module.exports = { pageFor };
