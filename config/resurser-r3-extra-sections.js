'use strict';

/** Additional unique sections to meet ≥300 word body minimum per long-tail page. */
const R3_EXTRA_SECTIONS = {
  'bildschema-forskolan': {
    h2: 'Samverkan med föräldrar',
    paragraphs: [
      'Skicka gärna hem en länk till samma mall så föräldrar kan spegla förskolans struktur. När barnet möter liknande visuellt språk hemma och i förskolan minskar övergångsstress vid hämtning och lämning.',
      'Vid utvecklingssamtal kan ni visa vilket schema som används och diskutera om barnet behöver färre steg eller tydligare markering av "nu". Små justeringar varje månad slår en stor omstart varje termin.',
    ],
  },
  'bildstod-adhd-barn': {
    h2: 'Vanliga misstag att undvika',
    paragraphs: [
      'Att lägga till fler steg när något inte fungerar direkt — istället, dela upp det steg där barnet fastnar. Att byta schema varje vecka — barn med ADHD behöver repetition för att automatisera.',
      'Att använda schema som straff — bildstöd ska vara neutralt verktyg, inte hot. Om schemat känns som kontroll tappar barnet motivation att följa det.',
    ],
  },
  'kanslokort-barn-gratis': {
    h2: 'När känslokort inte räcker',
    paragraphs: [
      'Känslokort hjälper barnet identifiera känslan — inte alltid reglera den. Om barnet pekar på "arg" men fortsätter kasta saker behövs ofta paus, fysisk aktivitet eller förutsägbar rutin efteråt.',
      'Kombinera med lugna zoner och tydliga gränser. Korten öppnar samtalet; vuxen sätter fortfarande ramarna kring vad som är okej att göra med känslorna.',
    ],
  },
  'overgangsschema-barn': {
    h2: 'Övergångar utanför hemmet',
    paragraphs: [
      'Samma princip gäller i förskola och skola: förvarna, visa först–sedan, ge tid. Ett laminerat kort i väskan fungerar när barnet ska lämna kompisens hus eller stänga av lekplatsen.',
      'Föräldrar och pedagoger kan använda samma bilder så barnet känner igen kedjan oavsett miljö. Dela gärna vårt övergångsmaterial med den vuxna som hämtar eller lämnar.',
    ],
  },
  'morgonrutin-bildstod-pdf': {
    h2: 'När morgonen ändå strular',
    paragraphs: [
      'Om ett steg alltid fastnar — kläder, frukost, tänder — dela upp just det steget i delsteg på ett eget mini-schema. Ibland är problemet inte hela morgonen utan en enda flaskhals.',
      'Utvärdera efter två veckor med samma schema. Funkar fyra av sex steg? Firande. Justera det sista steget istället för att riva hela tavlan.',
    ],
  },
  'hygienschema-barn-pdf': {
    h2: 'Sensoriska anpassningar',
    paragraphs: [
      'Barn som ogillar vatten i ansiktet kan behöva färre steg synliga under dusch och tydligare "klar"-signal. Barn som hyperfokuserar på tvätt kan behöva timer så steget inte tar tjugo minuter.',
      'Anpassa ordningen: vissa barn borstar tänder före pyjamas, andra efter. Schemat ska spegla er verklighet — inte en generisk idealordning från en blogg.',
      'Om ett hygiensteg alltid misslyckas, dela upp det: istället för "borsta tänder" kan ni ha tandkräm på, borsta upp, borsta ner, spotta, skölj. Fler små steg ger fler möjligheter att lyckas och bocka av.',
    ],
  },
  'visuellt-schema-forskola': {
    h2: 'Dokumentera vad som fungerar',
    paragraphs: [
      'Anteckna kort vilka scheman som minskat konflikter i gruppen. Det underlättar överlämning till nya pedagoger och visar föräldrar att arbetet är genomtänkt.',
      'Fotografera tavlan (utan barn i bild) och spara som mall när ni byter tema — ni behöver inte uppfinna strukturen på nytt varje termin.',
      'Be barnen ibland peka på vad som händer härnäst — det visar snabbt om schemat faktiskt läses eller bara är väggdekoration.',
    ],
  },
  'bildstod-autism-vardag': {
    h2: 'Respekt för barnets tempo',
    paragraphs: [
      'Visuellt stöd ersätter inte bearbetningstid. Barnet kan se nästa steg och ändå behöva en minut innan kroppen följer med. Bygg in pauser i schemat — "paus" är ett legitimt kort.',
      'Undvik att peka aggressivt på schemat. Lugnt "nu är vi här" med finger på bilden räcker. Schemat är hjälpmedel, inte domare.',
    ],
  },
  'veckoschema-mall-gratis': {
    h2: 'Veckoschema och ångest',
    paragraphs: [
      'Barn som frågar om och om igen "vad händer imorgon" mår ofta bra av att söndagskvällen fyller i veckan tillsammans. Att se hela veckan kan sänka sömnlöshet kopplad till osäkerhet.',
      'Markera aktiviteter barnet ser fram emot — simskola, fredagsmys — inte bara skyldigheter. Veckoschemat ska visa att det finns roliga steg också.',
      'Vid plötsliga ändringar — sjuk personal, inställd aktivitet — uppdatera schemat synligt och förklara med en enkel "idag är annorlunda"-rad så barnet inte känner sig lurat.',
    ],
    bullets: ['Idag-markering med magnet eller klistermärke', 'Fyll i veckan söndag kväll tillsammans'],
  },
  'bildschema-pdf-gratis': {
    h2: 'Välj en kategori och börja',
    paragraphs: [
      'Många familjer laddar ner flera PDF:er samma dag och blir överväldigade. Välj den rutin som skapar mest friktion — ofta morgon eller skärm-avstängning — och kör den två veckor.',
      'När den sitter, lägg till nästa. Resursbiblioteket finns kvar — ni behöver inte använda allt på en gång.',
      'Skriv ut på vanligt papper första veckan. Laminera först när ni vet vilken mall som faktiskt används — annars slösar ni tid på perfekt utskrift som ändå byts ut.',
    ],
  },
  'forst-sedan-kort-barn': {
    h2: 'Exempel från vardagen',
    paragraphs: [
      'Först utomhuslek, sedan handtvätt före middag. Först toalett, sedan bilen. Först läxor, sedan TV. Två bilder, en kedja — barnet ser att det roliga också finns med, bara i rätt ordning.',
      'Fotografera barnets egna leksaker eller miljö om standardbilder känns abstrakta. Ett foto av er TV och ert kök slår generiska clipart-symboler för många barn.',
      'Ha ett par färdiga först–sedan-kort i väskan för spontana situationer: först handla klart, sedan fika. Överraskande byten blir lättare när kedjan är synlig även utanför hemmet.',
    ],
    bullets: [
      'Laminera ett kort för återkommande situationer',
      'Byt inte ordning mellan dagar utan att förklara',
      'Kombinera med nedräkning de sista minuterna',
      'Först alltid det mindre roliga steget — sedan belöningen',
    ],
  },
  'morgonschema-barn-skriva-ut': {
    h2: 'Syskon och olika åldrar',
    paragraphs: [
      'Syskon kan ha olika scheman sida vid sida — yngre färre steg, äldre fler. Undvik att jämföra vid tavlan: "din bror är redan klar" underminerar schemat.',
      'Gemensamma steg som frukost kan vara ett delat kort medan kläd-stegen är individuella. Flexibilitet inom samma visuella system.',
      'Om morgonen är tight tidsmässigt, markera inga klockslag förrän grundsekvensen sitter. Tidspress plus nytt schema samma vecka är en vanlig anledning till att papperstavlan överges.',
    ],
    bullets: ['Fira när hela schemat är avbockat — kort och äkta', 'Spegla verklig ordning, inte önskelista'],
  },
  'kvallsschema-barn-pdf': {
    h2: 'Sömn och skärm',
    paragraphs: [
      'Skärm som sista steg före säng gör insomning svårare för många barn. Placera skärm av minst trettio minuter före saga om det är återkommande problem.',
      'Kvällsschema kan inkludera "lugna kroppen" — sträckning, andningsövning, kram — som eget steg mellan aktiv lek och säng.',
      'Dimma ljus i samma ordning varje kväll: lampor av i vardagsrummet, nattlampa på i sovrummet. Fast ljusrutin förstärker att kvällen är på väg mot sömn, inte bara en lista på papper.',
    ],
    bullets: [
      'Samma ordning varje kväll i minst två veckor',
      'Skärm av som eget steg — inte implicit',
      'Saga eller lugn aktivitet som sista steg före säng',
      'Dimma ljus i samma sekvens varje kväll',
    ],
  },
  'beloningsschema-barn-gratis': {
    h2: 'Belöning utan skam',
    paragraphs: [
      'Om barnet inte når målet en vecka — analysera om målet var för högt, inte om barnet "misslyckades". Sänk tröskeln och bygg självförtroende tillbaka.',
      'Belöningar ska vara proportionerliga. Fem stjärnor för en veckas morgonrutin kan ge gemensam glass, inte en ny spelkonsol — håll förväntningarna jordnära.',
      'Låt barnet vara med och välja belöningen när målet sätts. Ägandeskap ökar motivation mer än överraskningar som barnet inte ville ha.',
    ],
    bullets: ['Belöna handlingar barnet kan påverka', 'Justera målet om det aldrig nås', 'Fira när rutnätet fylls — kort och äkta', 'Skriv ut nytt schema om aktiviteterna ändras'],
  },
  'skolschema-barn-bildstod': {
    h2: 'Läxor och struktur',
    paragraphs: [
      'Skolschemat visar dagens bågar — läxor behöver ofta ett separat först–sedan-kort vid skrivbordet. Att klumpa ihop hela skoldagen på ett kort blir för tät information.',
      'Vid läxor: först material fram, sedan en uppgift i taget, sedan paus. Synlig kedja minskar att barnet sitter och stirrar utan att börja.',
      'Fråga läraren vilka aktiviteter som alltid sker samma dag — idrott på onsdag, bibliotek på fredag — och markera dem tydligt på veckoöversikten om barnet behöver se hela veckan.',
    ],
    bullets: ['Läxor = separat först–sedan vid skrivbordet', 'Skoldag = överblick, inte varje uppgift', 'Markera fasta aktiviteter som idrott på samma dag varje vecka', 'Dela samma bilder med läraren om möjligt'],
  },
  'teacch-kort-barn': {
    h2: 'Skillnad mot digitala arbetssystem',
    paragraphs: [
      'Pappersbaserade först–sedan–klar-kort är medvetet enkla. Vi bygger inte ett digitalt ATT GÖRA/GÖR/KLAR-system i Min Stjärndag — familjer som behöver avancerade arbetssystem kan kombinera våra utskrifter med andra verktyg.',
      'Korten passar korta kedjor hemma: städa rum, läxor, hygien. Längre projekt kan behöva fler kort i en kö — visa inte hela kön samtidigt om det stressar.',
      'Sätt upp en "klar-låda" där färdiga kort läggs. Det ger fysiskt avslut — viktigt för barn som annars inte känner när en uppgift är helt färdig.',
    ],
    bullets: ['Klar-låda ger tydligt avslut', 'Visa ett steg i taget vid längre kedjor'],
  },
  'bildstod-npf-barn': {
    h2: 'Professionellt stöd',
    paragraphs: [
      'Bildstöd kompletterar inte logoped, arbetsterapeut eller BUP — det samverkar. Visa vilka scheman ni använder på vårdmöten så teamet kan ge konkreta justeringar.',
      'Om skolan redan har visuellt stöd, fråga vilka symboler de använder. Konsekvent bildspråk mellan miljöer är ofta värt mer än att hitta "perfekta" bilder hemma.',
      'Dokumentera kort vad som fungerat efter en månad — inte för att "bevisa" något utan för att själv se mönster och veta vad ni ska bygga vidare på.',
    ],
  },
  'rutinschema-barn-bilder': {
    h2: 'Från bild till handling',
    paragraphs: [
      'Barnet ska inte bara titta på schemat — peka, bocka av, flytta markör. Handling förstärker minnet bättre än passiv läsning av en vägg.',
      'Öva en gång i lugn stund: "så här flyttar vi magneten när vi är klara med frukost." I stressig morgon räcker pekning om övningen sitter.',
      'Byt inte bilder varje vecka om rutinen är stabil. Igenkänning bygger trygghet — nya fina clipart-bilder kan vänta tills grundrutinen sitter.',
    ],
    bullets: [
      'Öva i lugn stund innan stressig morgon',
      'Barnet bockar av — inte bara vuxen',
      'Foton från hemmet slår generiska symboler',
      'Byt inte bilder förrän rutinen sitter',
      'Ett schema i taget — inte fem samtidigt',
    ],
  },
  'visuellt-stod-hemmet': {
    h2: 'När gäster eller resor stör rutinen',
    paragraphs: [
      'Semester och sjukdom ändrar vardagen. Ett enkelt "idag är annorlunda"-schema med två tre steg kan förklara avvikelsen utan att riva hela systemet.',
      'Gäster hemma? Visa barnet ett kort schema för besöket: först hälsa, sedan lek, sedan kvällsmat som vanligt. Förutsägbarhet även när huset är fullt.',
      'Efter resa eller sjukdom: återgå till vanligt schema stegvis. Första dagen hemma kanske bara morgon — lägg till kväll när morgonen sitter igen.',
    ],
    bullets: ['Schema vid aktiviteten — inte i garderoben', 'Återgå stegvis efter avvikelser'],
  },
  'bildkort-rutiner-barn': {
    h2: 'Förvara så de används',
    paragraphs: [
      'Bildkort i en låda i garderoben används sällan. Magnet på kylskåpet, ficka vid dörren eller liten pärm vid aktivitetsplatsen — tillgänglighet avgör om korten blir vana eller skräp.',
      'Involvera barnet i att klippa ut och laminera. Ägandeskap ökar chansen att korten faktiskt plockas fram när det behövs.',
      'Rotera inte korten för ofta. När barnet känner igen "frukost"-bilden går övergången snabbare — nya motiv varje vecka kan förvirra mer än motivera.',
    ],
    bullets: ['Magnet på kylskåpet slår pärm i garderoben', 'Laminera kort som hanteras dagligen', 'Låt barnet klippa ut — ökar ägandeskap'],
  },
};

module.exports = { R3_EXTRA_SECTIONS };
