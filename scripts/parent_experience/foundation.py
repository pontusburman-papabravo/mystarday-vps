"""Core principles and emotional journey for PARENT_EXPERIENCE_BIBLE v1.0."""

FOUNDATION = {
    "mantra": "Barnet spelar. Föräldern leder. Produkten gör ledarskapet enkelt.",
    "never_feels_like": [
        "administration",
        "kontroll",
        "skuld",
        "övervakning",
        "uppfostran",
    ],
    "always_feels_like": [
        "lugn",
        "trygghet",
        "riktning",
        "samarbete",
        "framsteg",
        "glädje",
        "närvaro",
    ],
    "child_plays_parent_leads": (
        "Barnet är huvudpersonen i upplevelsen — Idag, stjärnor, Min värld. "
        "Föräldern är hjälparen som sätter spelplanen en gång och sedan låter produkten bära vardagen. "
        "Parent Experience äger aldrig barnets skärm som default."
    ),
}

EMOTIONAL_JOURNEY = [
    {
        "phase": "Kris & hopp",
        "parent_thought": "Vi behöver hjälp.",
        "product_job": "Lova lättnad, inte verktyg. Landning och word-of-mouth speglar First Success — inte 'bygg rutiner'.",
        "feeling": "Hopp utan prestation.",
        "signals": ["Hero = barnets första kväll/morgon", "CTA: kom igång på 2 min", "Ingen feature-lista som krav"],
    },
    {
        "phase": "Första andning",
        "parent_thought": "Okej, det här var enkelt.",
        "product_job": "Dag 0: barn + rutin + belöningar redan klart. Success screen: Visa barnet.",
        "feeling": "Lättnad + 'jag verkar göra rätt'.",
        "signals": ["Constitution §4", "Voice reducesUncertainty", "Ingen wizard"],
    },
    {
        "phase": "Första bevis",
        "parent_thought": "Det funkade faktiskt.",
        "product_job": "First Success (stjärna, hel rutin, eller lugn morgon). Celebration — kort, varm, skippbar.",
        "feeling": "Stolthet utan överdrift.",
        "signals": ["Milestone tone celebration", "Coach pausar under milestone", "Proxyn ≠ målet"],
    },
    {
        "phase": "Vana",
        "parent_thought": "Det här är vår morgon nu.",
        "product_job": "Coachen tyst när inget akut. Hem visar ett nästa steg max.",
        "feeling": "Konsekvens utan app-beroende.",
        "signals": ["primaryNeed null → tyst coach", "Calm tone default", "Offline dignity"],
    },
    {
        "phase": "Samarbete",
        "parent_thought": "Vi klarar det tillsammans.",
        "product_job": "Co-parent, Familj-värld, delat framsteg — aldrig syskonjämförelse.",
        "feeling": "Relatedness (SDT).",
        "signals": ["INVITE_PARENT need", "Shared pride not leaderboard", "G-rules"],
    },
    {
        "phase": "Identitet",
        "parent_thought": "Det här är bara så vår familj fungerar.",
        "product_job": "Family Memory, traditions, återkommande högtider — produkten dokumenterar resan utan att kräva skärm.",
        "feeling": "Tillhörighet över decennier.",
        "signals": ["Year 1+ memory surfaces", "No streak anxiety", "Franchise mindset"],
    },
]

LIFECYCLE = {
    "discovery": {
        "time": "Före registrering",
        "parent_state": "Stress, söker bildstöd/rutin/morgon",
        "product": "Landning: barnet först, löfte om första kväll/morgon, social proof",
        "success": "Klickar CTA med tro på lättnad",
        "anti": "Feature dump, 'bygg ditt schema', pris före värde",
    },
    "landing": {
        "time": "Första besök",
        "parent_state": "Skeptisk, trött",
        "product": "Hero synkad med dag 0, 3 steg omvänd ordning (barn → funkar → anpassa)",
        "success": "Förstår att barnet kan börja ikväll",
        "anti": "Parent som huvudperson i copy",
    },
    "registration": {
        "time": "< 2 min",
        "parent_state": "Vill bara komma igång",
        "product": "Namn, e-post, lösenord, barnnamn — inget mer",
        "success": "Konto + barn + PIN utan beslutströtthet",
        "anti": "Mallväljare, onboarding wizard, AI-frågor",
    },
    "day_0": {
        "time": "Timme 0–24",
        "parent_state": "Osäker om 'gör jag rätt?'",
        "product": "Färdig rutin, Skattkammare, success screen, primär CTA Visa barnet",
        "success": "first_success_within_48h påbörjad",
        "anti": "Tom hemvy, 'lägg till aktiviteter'",
    },
    "week_1": {
        "time": "Dag 2–7",
        "parent_state": "Testar om det håller",
        "product": "Coach: COMPLETE_DAY, ADD_EVENING vid behov. Tyst om det flyter.",
        "success": "Dag 2 + dag 7 retention, minst ett First Success-bevis",
        "anti": "Push-spam, skuld vid miss",
    },
    "month_1": {
        "time": "Vecka 2–4",
        "parent_state": "Vill anpassa eller bjuda in partner",
        "product": "PERSONALIZE, SHARE_RESPONSIBILITY needs. Veckosammanfattning optional.",
        "success": "Kväll/helg utökad om relevant, co-parent optional",
        "anti": "Tvinga fler features",
    },
    "month_3": {
        "time": "Kvartal 1",
        "parent_state": "Rutin är norm — frågar om värde",
        "product": "Min värld som optional dessert. Familj-minnen börjar.",
        "success": "Intrinsic test pass — rutin utan stjärnor?",
        "anti": "Gamification escalation",
    },
    "month_6": {
        "time": "Halvår",
        "parent_state": "Säsonger, skolstart, lov",
        "product": "Family OS kalenderhändelser — mjuka förslag, inte alarm",
        "success": "Familjen klarar övergång utan app-krasch",
        "anti": "Hård reset vid schemaändring",
    },
    "year_1": {
        "time": "12 månader",
        "parent_state": "Produkten är en del av identitet",
        "product": "Family Memory: årsöversikt, stolta ögonblick, traditioner",
        "success": "NPS driven by trust not lock-in",
        "anti": "Retention dark patterns",
    },
    "year_3": {
        "time": "36 månader",
        "parent_state": "Barnet växer — kapacitet ökar",
        "product": "Samma motor, pack kan växla senare — föräldra-UX fortsatt ledare/coach",
        "success": "Ingen 'reset trauma', historik bevarad",
        "anti": "Tvinga ny onboarding",
    },
}
