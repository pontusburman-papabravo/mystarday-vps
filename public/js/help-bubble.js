/**
 * Contextual Help Bubble (❓) for logged-in pages.
 * Auto-detects the current page and shows relevant FAQ content.
 * Position: bottom-right, above the nav bar on mobile.
 * Does NOT conflict with support-bubble.js (which is logged-out only).
 *
 * Usage: Include <script src="/js/help-bubble.js"></script> before </body>.
 * Optional: set window.HELP_PAGE to override auto-detection.
 */
(function () {
  'use strict';

  if (document.getElementById('helpBubbleRoot')) return;
  // Skip if the page already has its own help button (e.g. dashboard.html)
  if (document.getElementById('helpBtn')) return;
  // Admin panel has its own layout — no floating help bubble
  if ((window.location.pathname || '').startsWith('/admin')) return;

  // ─── Page-specific content ─────────────────────────────────────────────────
  const PAGE_CONTENT = {

    dashboard: {
      title: '❓ Hjälp – Översikt',
      tabs: [
        {
          id: 'overview',
          label: '🏠 Översikt',
          faqs: [
            { q: 'Vad gör de 3 snabbknapparna längst upp?', a: '<strong>⭐ Ge extra stjärnor</strong> — ge ett barn bonusstjärnor manuellt. <strong>📋 Engångsaktivitet</strong> — lägg till en tillfällig aktivitet för idag. <strong>🏠 Ledig dag</strong> — pausar barnets schema för en dag (t.ex. sjukdag, ledig).' },
            { q: 'Hur bockar jag av en aktivitet?', a: 'Klicka på aktiviteten i barnkortet — den bockas av direkt. Barnet kan också bocka av i sin <strong>barnvy</strong>.' },
            { q: 'Vad är komprimerat barnkort?', a: 'Barnkortet visar avatar, namn, stjärnbalans och sektionspiller i komprimerat läge. Expandera kortet för fler detaljer, schema-länk och pausknapp.' },
            { q: 'Vad är Ledig dag?', a: '<strong>🏠 Ledig dag</strong> pausar barnets schema för den valda dagen — perfekt vid sjukdom eller lov. Barnet ser schemat som inaktivt. Aktivera dagen igen via samma knapp.' },
            { q: 'Vad är pausad-läge?', a: 'Klicka på pausikonen (⏸) på barnkortet för att pausa ett barn. Aktiviteterna visas som inaktiva och barnet tjänar inga stjärnor tills du återupptar.' },
          ],
        },
        {
          id: 'stars',
          label: '⭐ Stjärnor',
          faqs: [
            { q: 'Hur tjänar barnet stjärnor?', a: 'Varje avklarad aktivitet ger <strong>1 stjärna</strong>. Barnet bockar av i sin barnvy. Du kan också ge bonus-stjärnor manuellt via ⭐-knappen ovan barnkorten.' },
            { q: 'Hur funkar Skattkammaren?', a: 'Barnet öppnar Skattkammaren via 💎-fliken i barnvyn och ser belöningar med stjärnpris. Barnet kan begära belöning när det sparat tillräckligt — du godkänner det.' },
            { q: 'Hur lägger jag till belöningar?', a: 'Gå till <strong>Bibliotek</strong> i menyn → fliken "Belöningar". Lägg till egna belöningar, redigera stjärnkostnad och välj vilka barn som ser dem.' },
          ],
        },
        {
          id: 'schedule',
          label: '📅 Schema',
          faqs: [
            { q: 'Hur lägger jag till en aktivitet?', a: 'Gå till <strong>Veckoschema</strong> → välj barn → välj dag → klicka "+" för att lägga till aktivitet från biblioteket. Du kan söka bland 63 standardaktiviteter.' },
            { q: 'Hur kopierar jag schema till alla dagar?', a: 'I Veckoschema → "Kopiera från…" → välj källa (eget schema eller standardbibliotek) → bocka av vilka dagar du vill kopiera till.' },
            { q: 'Vad är en Idag-vy?', a: 'Översiktens "Idag"-vy synkas automatiskt när du ändrar schemat. Ändringar i Veckoschema syns direkt på Översikten och i barnets vy.' },
          ],
        },
        {
          id: 'family',
          label: '👨‍👩‍👧 Familj',
          faqs: [
            { q: 'Hur bjuder jag in en annan vuxen?', a: 'Gå till <strong>Familjen & inställningar → Familjemedlemmar</strong> → klicka "Bjud in". Den inbjudna personen får ett e-postmeddelande med inloggningslänk.' },
            { q: 'Hur loggar barnet in?', a: 'Barnet loggar in på <strong>/child-login</strong> med sitt användarnamn och PIN-kod. Inloggningsuppgifterna hittar du under <strong>Familjen & inställningar → Barn</strong>.' },
            { q: 'Kontakta support', a: 'Maila oss på <a href="mailto:info@mystarday.se" style="color:#F5A623;font-weight:600;">info@mystarday.se</a> — vi svarar inom 24 timmar.' },
          ],
        },
      ],
    },

    'child-dashboard': {
      title: '❓ Hjälp – Barnvyn',
      tabs: [
        {
          id: 'today',
          label: '📋 Aktiviteter',
          faqs: [
            { q: 'Hur bockar jag av en aktivitet?', a: 'Tryck på den vita cirkeln bredvid aktiviteten med texten <strong>NU</strong>. Den fylls grön med bock och du tjänar en stjärna! 🌟' },
            { q: 'Vad är understeg och hur ser jag dem?', a: 'Aktiviteter med understeg visar en 📋-knapp. Tryck på den för att se stegen som hjälper dig klara aktiviteten! Du bockar ändå av hela aktiviteten med ett enda tryck.' },
            { q: 'Vad är cirkeln runt min emoji?', a: 'Cirkeln runt din emoji visar <strong>dagens framsteg</strong> — hur många aktiviteter du klarat av idag. Cirkeln fylls på och blir grön när du är klar med alla! 🟢' },
            { q: 'Vad är NU / NÄSTA / SEDAN?', a: '<strong>NU</strong> = din aktuella aktivitet att göra. <strong>NÄSTA</strong> = vad som kommer efter. <strong>SEDAN</strong> = resten av dagen. Bocka av NU-aktiviteten för att gå vidare.' },
            { q: 'Vad är timern?', a: 'Den runda timern visar hur lång tid aktiviteten tar. Grön = gott om tid, Orange = lite kvar, Röd = snart slut.' },
          ],
        },
        {
          id: 'stars',
          label: '⭐ Mina stjärnor',
          faqs: [
            { q: 'Vad är de tre stjärn-elementen?', a: '<strong>Cirkeln runt emojin</strong> = hur många aktiviteter du klarat idag. <strong>Stjärnsaldo</strong> = dina totalt sparade stjärnor. <strong>Långsiktigt mål</strong> = progress mot din valda belöning.' },
            { q: 'Hur löser jag in en belöning?', a: 'Öppna Skattkammaren (tryck 💎-fliken) → tryck på en belöning du sparat tillräckligt till → tryck "Fråga om att lösa in" → vänta på att en vuxen godkänner.' },
            { q: 'Hur tjänar jag fler stjärnor?', a: 'Bocka av aktiviteterna i ditt schema! Varje avklarad aktivitet ger stjärnor. En vuxen kan också ge dig bonus-stjärnor.' },
          ],
        },
        {
          id: 'help',
          label: '🔧 Hjälp',
          faqs: [
            { q: 'Jag ser inte min belöning', a: 'En vuxen behöver lägga till belöningar åt dig i <strong>Bibliotek</strong>. Be en vuxen hjälpa till.' },
            { q: 'Jag har glömt min PIN', a: 'Be en vuxen gå till <strong>Familjen & inställningar → Barn</strong> → välj ditt namn → "Ändra PIN".' },
            { q: 'Schemat ser konstigt ut', a: 'Be en vuxen kontrollera schemat. Det kan behöva uppdateras för dagens dag.' },
          ],
        },
      ],
    },

    skattkammaren: {
      title: '❓ Hjälp – Belöningar',
      tabs: [
        {
          id: 'rewards',
          label: '🏆 Belöningar',
          faqs: [
            { q: 'Hur fungerar belöningssystemet?', a: 'Barnet samlar stjärnor genom att klara aktiviteter. När stjärnbalansen räcker till en belöning kan barnet begära att lösa in den — du godkänner eller avvisar.' },
            { q: 'Hur lägger jag till nya belöningar?', a: 'Gå till <strong>Bibliotek</strong> i menyn → fliken "Belöningar" → sök eller klicka "+ Lägg till belöning". Du kan också kopiera direkt från standardbiblioteket.' },
            { q: 'Hur styr jag per-barn synlighet?', a: 'När du skapar eller redigerar en belöning väljer du vilka barn som ska se den. Perfekt för anpassade belöningar per barn.' },
            { q: 'Hur godkänner jag en inlösenbegäran?', a: 'Barnets begäran syns på Översikten med en badge. Klicka för att godkänna. Stjärnorna dras automatiskt och barnet ser ändringen direkt.' },
          ],
        },
        {
          id: 'stars',
          label: '⭐ Stjärnor',
          faqs: [
            { q: 'Hur tjänar barnet stjärnor?', a: 'Varje avklarad aktivitet ger stjärnor (1 stjärna per aktivitet som standard). Du kan också ge bonus-stjärnor via ⭐-knappen på Översikten.' },
            { q: 'Vad är stjärnsaldo vs. daglig progress?', a: '<strong>Stjärnsaldo</strong> = total sparad balance. <strong>Daglig progress</strong> (ringen runt emojin) = hur många aktiviteter barnet klarat idag. Dessa är separata.' },
            { q: 'Vad händer när en belöning löses in?', a: 'Stjärnorna dras automatiskt från barnets konto. Barnet ser ändringen direkt i sin Skattkammaren. Du ser historiken på Belöningssidan.' },
          ],
        },
      ],
    },

    schedule: {
      title: '❓ Hjälp – Veckoschema',
      tabs: [
        {
          id: 'edit',
          label: '📅 Redigera schema',
          faqs: [
            { q: 'Hur lägger jag till en aktivitet?', a: 'Välj dag → klicka "+" → sök och välj aktivitet. Du kan välja <strong>flera tidsluckor på en gång</strong> (Morgon + Kväll) och aktiviteten läggs till i alla.' },
            { q: 'Hur skapar jag en ny aktivitet direkt i schemat?', a: 'Klicka "+" → sök → om inga träffar hittas visas "Skapa ny"-formuläret direkt i sökmodalen. Fyll i namn, emoji, stjärnvärde och eventuella delsteg.' },
            { q: 'Hur redigerar jag en aktivitets namn/emoji?', a: 'Klicka på aktivitetens namn eller emoji i schemat → redigeringsmodalen öppnas. Ändringar propagerar automatiskt till alla barn och dagar.' },
            { q: 'Hur kopierar jag schema från ett annat barn?', a: 'Klicka "Kopiera från…" → välj källa → bocka av specifika veckodagar du vill kopiera till. Välj om du vill skriva över befintligt innehåll.' },
            { q: 'Synkas schemat automatiskt till barnvyn?', a: 'Ja! Ändringar i Veckoschema synkas direkt till "Idag"-vyn på Översikten och till barnets vy — inga manuella uppdateringar behövs.' },
          ],
        },
        {
          id: 'library',
          label: '📚 Bibliotek',
          faqs: [
            { q: 'Vad är standardbiblioteket?', a: 'Standardbiblioteket innehåller 63 färdiga aktiviteter i 6 kategorier och 5 schemamallar. Klicka "Snabbinfoga från bibliotek" för att lägga till dem i schemat.' },
            { q: 'Hur kopierar jag ett standardschema?', a: 'Under Schema-fliken → "Kopiera från…" → välj "Standardbibliotek" → välj schema → välj dagar → kopiera.' },
            { q: 'Varför ser barnet inga aktiviteter?', a: 'Kontrollera att schemat är valt för rätt barn och att det finns aktiviteter för dagens dag. Tomt schema? Kopiera från standardbiblioteket för att komma igång snabbt.' },
          ],
        },
        {
          id: 'tips',
          label: '💡 Tips',
          faqs: [
            { q: 'Hur bygger jag ett bra rutinschema?', a: 'Börja med 3-5 fasta aktiviteter (frukost, tandborstning, läxor). Lägg dem i rätt ordning. Barnet lär sig rutinen snabbt när den är konsekvent.' },
            { q: 'Vad är understeg på aktiviteter?', a: 'Du kan lägga till understeg på aktiviteter (t.ex. "Tvätta händer", "Ta på pyjamas" under "Kvällsrutin"). Barnet ser dem som en visuell guide men bockar av hela aktiviteten i ett.' },
            { q: 'Hur många aktiviteter per dag?', a: 'Rekommenderat: 4-8 aktiviteter. För få ger inget flöde, för många blir överväldigande. Börja litet och bygg upp.' },
          ],
        },
      ],
    },

    family: {
      title: '❓ Hjälp – Familjen & inställningar',
      tabs: [
        {
          id: 'children',
          label: '👶 Barn',
          faqs: [
            { q: 'Hur lägger jag till ett barn?', a: 'Gå till Översikten → klicka "+ Lägg till barn". Fyll i namn, emoji och födelsedag. Barnet får automatiskt ett schema baserat på ålder.' },
            { q: 'Hur ändrar jag barnets PIN?', a: 'Klicka på barnkortet → fliken "Inställningar" → "Ändra PIN". Välj en ny 4-siffrig PIN-kod.' },
            { q: 'Hur ser barnet sina inloggningsuppgifter?', a: 'Klicka på barnkortet → fliken "Inställningar" → "Visa inloggningsuppgifter". Du ser barnets användarnamn och PIN.' },
            { q: 'Hur tar jag bort ett barn?', a: 'Klicka på barnkortet → fliken "Inställningar" → "Ta bort barn". OBS: Detta tar bort all data för barnet permanent.' },
          ],
        },
        {
          id: 'adults',
          label: '🔑 Vuxna',
          faqs: [
            { q: 'Hur bjuder jag in en annan vuxen?', a: 'Gå till fliken <strong>Familjemedlemmar</strong> → "Bjud in". Den inbjudna personen får ett e-postmeddelande med en länk för att skapa konto.' },
            { q: 'Kan jag välja vilka barn en vuxen ser?', a: 'Ja! Du väljer vilka barn personen ska ha åtkomst till när du skickar inbjudan. Du kan ändra det senare under Familjemedlemmar → personen → Barn-åtkomst.' },
            { q: 'Hur tar jag bort en familjemedlem?', a: 'Klicka på personen i Familjemedlemmar-listan → "Ta bort". De förlorar omedelbart åtkomst till familjen.' },
          ],
        },
        {
          id: 'settings',
          label: '⚙️ Inställningar',
          faqs: [
            { q: 'Hur ändrar jag mitt lösenord?', a: 'Gå till <strong>Inställningar</strong> (⚙️) i menyn → "Byt lösenord". Du behöver ange ditt nuvarande lösenord.' },
            { q: 'Hur aktiverar jag notiser?', a: 'Gå till Inställningar → "Påminnelser" → slå på notiser och välj tider. Notiser kräver att du godkänner webbläsar-tillstånd.' },
            { q: 'Kontakta support', a: 'Maila oss på <a href="mailto:info@mystarday.se" style="color:#F5A623;font-weight:600;">info@mystarday.se</a> — vi svarar inom 24 timmar.' },
          ],
        },
      ],
    },

    activities: {
      title: '❓ Hjälp – Aktiviteter',
      tabs: [
        {
          id: 'manage',
          label: '📝 Hantera',
          faqs: [
            { q: 'Vad är en aktivitet?', a: 'En <strong>aktivitet</strong> är en uppgift som barnet gör (t.ex. "Borsta tänderna"). Aktiviteter ger 1–5 stjärnor och kan ha delsteg. Samla dem i ditt bibliotek och lägg till i barnens scheman.' },
            { q: 'Hur skapar jag en ny aktivitet?', a: 'Klicka "+ Ny aktivitet" → fyll i namn, kategori (Hygien, Mat, Lek osv.), varaktighet och stjärnvärde. Spara och aktiviteten läggs till ditt bibliotek.' },
            { q: 'Hur lägger jag till en aktivitet i schemat?', a: 'Aktiviteter finns i ditt bibliotek. Gå till Veckoschema → välj dag → "+" → välj aktiviteten du vill lägga till.' },
            { q: 'Hur redigerar jag en aktivitet?', a: 'Klicka på aktiviteten i listan → "Redigera". Ändringarna gäller direkt i alla scheman där aktiviteten används.' },
          ],
        },
        {
          id: 'categories',
          label: '🎨 Kategorier',
          faqs: [
            { q: 'Vad är kategorierna till för?', a: 'Kategorier färgkodar aktiviteterna i barnvyn. <strong>Hygien</strong>=blå, <strong>Mat</strong>=gul, <strong>Lek</strong>=grön, <strong>Skola</strong>=lila, <strong>Rörelse</strong>=röd, <strong>Vila</strong>=grå, <strong>Social</strong>=orange.' },
            { q: 'Hur väljer jag kategori?', a: 'När du skapar eller redigerar en aktivitet väljer du kategori i dropdownmenyn. Välj den som bäst beskriver aktiviteten.' },
          ],
        },
      ],
    },

    library: {
      title: '❓ Hjälp – Bibliotek',
      tabs: [
        {
          id: 'tabs',
          label: '🗂️ Flikar',
          faqs: [
            { q: 'Vilka flikar finns i biblioteket?', a: '<strong>Scheman</strong> — dina egna schemamallar. <strong>Aktiviteter</strong> — aktivitetsbibliotek med understeg. <strong>Belöningar</strong> — dina egna belöningar. <strong>Standardbibliotek</strong> — 63 aktiviteter, 15 belöningar och 5 scheman att kopiera från.' },
            { q: 'Hur kopierar jag från standardbiblioteket?', a: 'Gå till fliken "Standardbibliotek" → välj aktivitet eller belöning → klicka 📥-knappen för att kopiera till ditt familjebibliotek. Scheman kopieras via Veckoschema → "Kopiera från…".' },
          ],
        },
        {
          id: 'activities',
          label: '📝 Aktiviteter',
          faqs: [
            { q: 'Hur skapar jag en ny aktivitet?', a: 'Klicka "+ Ny aktivitet" → fyll i namn, emoji (välj eller skriv fritt), stjärnvärde och eventuella delsteg → spara. Aktiviteten sparas i biblioteket för hela familjen.' },
            { q: 'Vad är understeg/delsteg?', a: 'Understeg är steg-för-steg-instruktioner under en aktivitet (t.ex. "Tvätta händer" under "Hygien"). Barnet ser dem som guide men bockar av hela aktiviteten i ett tryck.' },
            { q: 'Hur redigerar jag en aktivitet?', a: 'Klicka på aktivitetens namn i schemat — redigeringsmodalen öppnas. Ändringar (namn, emoji, delsteg) propagerar automatiskt till alla barn och dagar.' },
          ],
        },
        {
          id: 'rewards',
          label: '🏆 Belöningar',
          faqs: [
            { q: 'Hur lägger jag till en belöning?', a: 'Fliken "Belöningar" → sök efter belöning → klicka "+ Skapa ny" om den inte finns → fyll i namn, emoji, stjärnpris → välj vilka barn som ser den → spara.' },
            { q: 'Hur söker jag belöningar?', a: 'Sökrutan söker i dina egna belöningar OCH i standardbiblioteket samtidigt. Inga träffar? Knappen "Skapa [namn]" öppnar ett förifyllt formulär.' },
            { q: 'Kan ett barn ha privata belöningar?', a: 'Ja! När du skapar belöningen väljer du vilka barn som ska se den. Perfekt för anpassade belöningar per barn.' },
          ],
        },
      ],
    },

    settings: {
      title: '❓ Hjälp – Inställningar',
      tabs: [
        {
          id: 'account',
          label: '👤 Konto',
          faqs: [
            { q: 'Hur ändrar jag mitt lösenord?', a: 'Fyll i ditt nuvarande lösenord och det nya lösenordet → klicka "Spara". Lösenordet måste vara minst 6 tecken.' },
            { q: 'Hur ändrar jag min e-postadress?', a: 'Ange din nya e-postadress → klicka "Spara". Du kan behöva verifiera den nya adressen via e-post.' },
            { q: 'Hur tar jag bort mitt konto?', a: 'Kontakta oss på <a href="mailto:info@mystarday.se" style="color:#F5A623;font-weight:600;">info@mystarday.se</a> för kontoradering. Vi hanterar det inom 48 timmar.' },
          ],
        },
        {
          id: 'notifications',
          label: '🔔 Notiser',
          faqs: [
            { q: 'Hur aktiverar jag påminnelser?', a: 'Slå på växeln under "Påminnelser" → välj tid och vilka dagar. Din webbläsare måste godkänna notiser.' },
            { q: 'Jag får inga notiser trots att det är aktiverat', a: 'Kontrollera att webbläsaren har tillåtit notiser för sidan. Gå till webbläsarinställningarna → Notiser → hitta mystarday.se → Tillåt.' },
          ],
        },
      ],
    },

    calendar: {
      title: '❓ Hjälp – Kalender',
      tabs: [
        {
          id: 'calendar',
          label: '📆 Kalender',
          faqs: [
            { q: 'Vad visar kalendern?', a: 'Kalendern ger en månadsöversikt av barnets aktiviteter, inlösta belöningar och viktiga händelser.' },
            { q: 'Hur navigerar jag mellan månader?', a: 'Klicka på pilarna (< >) bredvid månadens namn för att byta månad.' },
            { q: 'Hur ser jag mer detaljer för en dag?', a: 'Klicka på ett datum för att se en detaljerad lista med aktiviteter och stjärnor för den dagen.' },
          ],
        },
      ],
    },

    'daily-log': {
      title: '❓ Hjälp – Daglig logg',
      tabs: [
        {
          id: 'log',
          label: '📖 Logg',
          faqs: [
            { q: 'Vad är den dagliga loggen?', a: 'Loggen visar en historik av alla avklarade aktiviteter per barn och dag. Perfekt för att följa upp rutinerna över tid.' },
            { q: 'Hur filtrerar jag loggen?', a: 'Välj barn i filtret högst upp för att visa loggen bara för ett specifikt barn. Du kan också filtrera på datum.' },
            { q: 'Hur långt bak kan jag se?', a: 'Loggen sparar data från den dag du började använda Min Stjärndag. Scrolla eller välj datum för att se äldre data.' },
          ],
        },
      ],
    },

    'assign-schedule': {
      title: '❓ Hjälp – Välj schema per dag',
      tabs: [
        {
          id: 'assign',
          label: '📅 Tilldela schema',
          faqs: [
            { q: 'Vad är "Välj schema per dag"?', a: 'Här väljer du vilket veckoschema som ska vara aktivt för varje barn och dag. Perfekt om du har olika rutiner för vardagar och helger.' },
            { q: 'Kan ett barn ha olika scheman på vardagar vs. helger?', a: 'Ja! Välj ett schema för Mån-Fre och ett annat för Lör-Sön. Klicka på dagen och välj önskat schema.' },
            { q: 'Vad händer om ingen dag är tilldelad?', a: 'Om ingen dag är tilldelad ett schema ser barnet inga aktiviteter den dagen. Se till att alla dagar du vill använda har ett schema tilldelat.' },
          ],
        },
      ],
    },

    admin: {
      title: '❓ Admin-panel',
      tabs: [
        {
          id: 'overview',
          label: '🔧 Översikt',
          faqs: [
            { q: 'Vad kan jag göra i admin-panelen?', a: 'Admin-panelen ger dig åtkomst till alla familjer, användare och systemdata. Du kan se statistik, hantera konton och moderera innehåll.' },
            { q: 'Hur hittar jag en specifik användare?', a: 'Använd sökfältet längst upp för att söka på e-post eller namn. Klicka på en familj för att se detaljer.' },
            { q: 'Hur arkiverar jag en familj?', a: 'Klicka på familjekortet → "Arkivera". Arkiverade familjer kan återställas men är inaktiva tills dess.' },
          ],
        },
        {
          id: 'support',
          label: '💬 Support',
          faqs: [
            { q: 'Hur ser jag inkomna supportmessage?', a: 'Under fliken "Support-inkorg" ser du alla meddelanden som skickats via kontaktformuläret. Klicka för att se full text och svara.' },
            { q: 'Hur markerar jag ett ärende som löst?', a: 'Klicka på ärendet → "Markera som löst". Lösta ärenden filtreras bort i standardvyn men kan visas via "Visa lösta".' },
          ],
        },
      ],
    },
  };

  // ─── Auto-detect page ──────────────────────────────────────────────────────
  function detectPage() {
    if (window.HELP_PAGE) return window.HELP_PAGE;
    const path = window.location.pathname.replace(/^\//, '').replace(/\.html$/, '').replace(/\/$/, '') || 'dashboard';
    // Normalize: /admin -> admin, /admin/index -> admin
    if (path === 'admin' || path.startsWith('admin/')) return 'admin';
    return path;
  }

  const pageKey = detectPage();
  const content = PAGE_CONTENT[pageKey];

  // Don't inject on pages without defined content
  if (!content) return;

  // ─── Build HTML ────────────────────────────────────────────────────────────
  function buildFaqItem(faq) {
    return `
      <div class="hb-faq-item">
        <button class="hb-faq-q" onclick="window.__hbToggleFaq(this)">
          <span class="hb-faq-text">${faq.q}</span>
          <span class="hb-faq-icon">+</span>
        </button>
        <div class="hb-faq-a" style="display:none;">
          ${faq.a}
        </div>
      </div>
      <hr class="hb-hr">
    `;
  }

  function buildTabContent(tab, isFirst) {
    return `
      <div id="hb-content-${tab.id}" class="hb-tab-content" ${isFirst ? '' : 'style="display:none;"'}>
        ${tab.faqs.map(buildFaqItem).join('')}
      </div>
    `;
  }

  function buildTabBtn(tab, isFirst) {
    return `
      <button class="hb-tab-btn ${isFirst ? 'hb-tab-active' : ''}"
        data-tab="${tab.id}"
        onclick="window.__hbSwitchTab(this, '${tab.id}')">
        ${tab.label}
      </button>
    `;
  }

  const root = document.createElement('div');
  root.id = 'helpBubbleRoot';

  root.innerHTML = `
    <!-- Help bubble trigger button -->
    <button id="hbBtn" onclick="window.__hbToggle()" title="Hjälp" aria-label="Öppna hjälp">
      ❓
    </button>

    <!-- Help panel backdrop + panel -->
    <div id="hbBackdrop" onclick="window.__hbClose()"></div>
    <div id="hbPanel" role="dialog" aria-modal="true" aria-label="${content.title}">
      <!-- Header -->
      <div class="hb-header">
        <h2 class="hb-title">${content.title}</h2>
        <button class="hb-close" onclick="window.__hbClose()" aria-label="Stäng hjälp">×</button>
      </div>

      <!-- Tabs (only if multiple) -->
      ${content.tabs.length > 1 ? `
        <div class="hb-tabs" role="tablist">
          ${content.tabs.map((tab, i) => buildTabBtn(tab, i === 0)).join('')}
        </div>
      ` : ''}

      <!-- Content -->
      <div class="hb-content">
        ${content.tabs.map((tab, i) => buildTabContent(tab, i === 0)).join('')}
      </div>
    </div>
  `;

  // ─── Styles ────────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #helpBubbleRoot {
      font-family: 'Plus Jakarta Sans', sans-serif;
    }

    /* Trigger button — mobile: stack above native tab bar when present */
    #hbBtn {
      position: fixed;
      bottom: calc(56px + env(safe-area-inset-bottom, 0px) + 64px);
      right: max(16px, env(safe-area-inset-right, 0px));
      z-index: 10001;
      width: 44px;
      height: 44px;
      background: #1B2340;
      color: white;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 4px 16px rgba(27,35,64,0.3);
      transition: background 0.2s, transform 0.15s;
    }
    #hbBtn:hover {
      background: #2A3458;
      transform: scale(1.08);
    }
    #hbBtn:active {
      transform: scale(0.95);
    }
    /* On desktop, align higher (no bottom nav) */
    @media (min-width: 768px) {
      #hbBtn {
        bottom: 24px;
        right: 80px;  /* offset right of support bubble at right:24px */
        z-index: 900;
      }
    }

    /* PWA/mobile without native tab bar */
    @media (max-width: 767px) {
      body:not(.has-native-tab-bar) #hbBtn {
        bottom: 80px;
        z-index: 900;
      }
    }

    /* Backdrop */
    #hbBackdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 9980;
    }
    #hbBackdrop.hb-open { display: block; }

    /* Panel */
    #hbPanel {
      display: none;
      position: fixed;
      left: 50%;
      bottom: 0;
      transform: translateX(-50%);
      width: 100%;
      max-width: 520px;
      max-height: 82vh;
      background: white;
      border-radius: 20px 20px 0 0;
      box-shadow: 0 -8px 40px rgba(27,35,64,0.18);
      z-index: 9981;
      overflow: hidden;
      flex-direction: column;
      animation: hbSlideUp 0.25s ease-out;
    }
    #hbPanel.hb-open {
      display: flex;
    }
    @media (min-width: 768px) {
      #hbPanel {
        bottom: 80px;
        right: 80px;
        left: auto;
        transform: none;
        border-radius: 20px;
        max-height: 80vh;
        max-width: 480px;
      }
    }

    @keyframes hbSlideUp {
      from { opacity: 0; transform: translateX(-50%) translateY(20px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @media (min-width: 768px) {
      @keyframes hbSlideUp {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    }

    /* Header */
    .hb-header {
      position: sticky;
      top: 0;
      background: white;
      border-bottom: 1px solid #EDE7F6;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      border-radius: 20px 20px 0 0;
    }
    .hb-title {
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 16px;
      color: #1B2340;
      margin: 0;
    }
    .hb-close {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #EDE7F6;
      border: none;
      cursor: pointer;
      font-size: 20px;
      font-weight: 700;
      color: #1B2340;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
      line-height: 1;
    }
    .hb-close:hover { background: #d8d0f0; }

    /* Tabs */
    .hb-tabs {
      display: flex;
      gap: 4px;
      padding: 10px 12px;
      border-bottom: 1px solid #EDE7F6;
      overflow-x: auto;
      scrollbar-width: none;
      flex-shrink: 0;
    }
    .hb-tabs::-webkit-scrollbar { display: none; }
    .hb-tab-btn {
      white-space: nowrap;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
      background: #EDE7F6;
      color: #1B2340;
    }
    .hb-tab-btn:hover { background: #d8d0f0; }
    .hb-tab-btn.hb-tab-active {
      background: #1B2340;
      color: white;
    }

    /* Scrollable content area */
    .hb-content {
      overflow-y: auto;
      padding: 16px 20px;
      flex: 1;
    }

    /* FAQ items */
    .hb-faq-item { }
    .hb-faq-q {
      width: 100%;
      text-align: left;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 0;
      background: none;
      border: none;
      cursor: pointer;
      font-family: inherit;
      font-size: 13px;
      font-weight: 600;
      color: #1B2340;
      gap: 8px;
    }
    .hb-faq-q:hover .hb-faq-text { color: #2A3458; }
    .hb-faq-text { flex: 1; text-align: left; }
    .hb-faq-icon {
      color: #5A6178;
      font-size: 18px;
      flex-shrink: 0;
      line-height: 1;
    }
    .hb-faq-a {
      padding-bottom: 12px;
      font-size: 12px;
      color: #5A6178;
      line-height: 1.7;
    }
    .hb-hr {
      border: none;
      border-top: 1px solid #EDE7F6;
      margin: 0;
    }
    .hb-hr:last-child { display: none; }
  `;

  document.head.appendChild(style);

  // Append to body after DOM is ready
  function mount() {
    document.body.appendChild(root);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  // ─── Logic ─────────────────────────────────────────────────────────────────
  window.__hbToggle = function () {
    const panel = document.getElementById('hbPanel');
    const backdrop = document.getElementById('hbBackdrop');
    const isOpen = panel.classList.contains('hb-open');
    if (isOpen) {
      panel.classList.remove('hb-open');
      backdrop.classList.remove('hb-open');
    } else {
      panel.classList.add('hb-open');
      backdrop.classList.add('hb-open');
    }
  };

  window.__hbClose = function () {
    document.getElementById('hbPanel').classList.remove('hb-open');
    document.getElementById('hbBackdrop').classList.remove('hb-open');
  };

  window.__hbSwitchTab = function (btn, tabId) {
    // Reset tab buttons
    document.querySelectorAll('#helpBubbleRoot .hb-tab-btn').forEach(b => {
      b.classList.remove('hb-tab-active');
    });
    btn.classList.add('hb-tab-active');
    // Hide/show content
    document.querySelectorAll('#helpBubbleRoot .hb-tab-content').forEach(c => {
      c.style.display = 'none';
    });
    const target = document.getElementById('hb-content-' + tabId);
    if (target) target.style.display = 'block';
  };

  window.__hbToggleFaq = function (btn) {
    const answer = btn.nextElementSibling;
    const isOpen = answer.style.display !== 'none';
    answer.style.display = isOpen ? 'none' : 'block';
    btn.querySelector('.hb-faq-icon').textContent = isOpen ? '+' : '−';
  };

  // Close on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') window.__hbClose();
  });

})();
