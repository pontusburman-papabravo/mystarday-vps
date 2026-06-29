"""Parent UX Principles, Handoff, Rewards, Operating Modes, Trust Failure."""

UX_PRINCIPLES = [
    {
        "id": "UX-P01",
        "name": "One next step",
        "rule": "Hem visar max ett coach-kort med ett CTA. Alternativ är sekundära.",
        "test": "Kan föräldern säga vad knappen gör på 3 sekunder?",
    },
    {
        "id": "UX-P02",
        "name": "No dashboard anxiety",
        "rule": "Ingen vägg av siffror, grafer eller 'status röd'.",
        "test": "Öppnar föräldern appen utan att känna sig granskad?",
    },
    {
        "id": "UX-P03",
        "name": "No admin overload",
        "rule": "Inställningar är destination, inte hem. Dag 0 kräver noll admin.",
        "test": "Färre än 3 val på success screen?",
    },
    {
        "id": "UX-P04",
        "name": "No guilt metrics",
        "rule": "Ingen synlig streak-förlust, miss-räknare eller jämförelse.",
        "test": "Efter missad dag — ingen siffra som skuldbelägger?",
    },
    {
        "id": "UX-P05",
        "name": "No surveillance feeling",
        "rule": "Parent ser sammanfattning och handoff — inte live-spionering av varje tap.",
        "test": "Barnets privata val (humör, dagbok) syns inte som logg?",
    },
    {
        "id": "UX-P06",
        "name": "No productivity-app tone",
        "rule": "Copy är varm familj — inte 'optimera', 'boosta', 'hacks'.",
        "test": "Låter Hem som en coach, inte Asana?",
    },
    {
        "id": "UX-P07",
        "name": "Parent confidence over parent control",
        "rule": "Produkten bekräftar 'du gör rätt' — den erbjuder inte fjärrkontroll över barnet.",
        "test": "reducesUncertainty finns i voice efter varje steg?",
    },
]

HANDOFF_SYSTEM = {
    "overview": "Handoff är ritualen där föräldern lämnar över till barnet — produktens viktigaste ögonblick.",
    "steps": [
        {
            "step": 1,
            "name": "Visa barnet",
            "parent_action": "Trycker primär CTA från success screen eller Hem när need SHOW_CHILD",
            "product": "Route till handoff — PIN-gate om parent session; barnvy direkt om redan barnläge",
            "child_result": "Ser Idag med NU/NÄSTA/SENARE",
            "rule": "Aldrig mer än ett steg före barnskärm",
        },
        {
            "step": 2,
            "name": "Barn-PIN",
            "parent_action": "Visar eller hjälper barn logga in första gånger; sedan barn själv",
            "product": "PIN enkel; lockout varnar parent — inte skuldbelägger barn",
            "child_result": "Egen session; parent gate för inställningar",
            "rule": "Manual name fallback om ingen parent session (web)",
        },
        {
            "step": 3,
            "name": "Första aktivitet",
            "parent_action": "Backar fysiskt — 'det är ditt schema'",
            "product": "En tap completion; visuell bekräftelse före siffror",
            "child_result": "Klarar det! — copy före stjärna",
            "rule": "Ingen parent måste bekräfta varje steg efter dag 0",
        },
        {
            "step": 4,
            "name": "Första stjärna",
            "parent_action": "Ser optional sammanfattning — firar med barn IRL om de vill",
            "product": "Star toast kort; server verify; lifetime stars aldrig minskar",
            "child_result": "Stjärna som punctuation — inte destination",
            "rule": "G-06: stjärnor säljs inte; G-01: inte för att öppna app",
        },
        {
            "step": 5,
            "name": "Första bygg-/världsögonblick",
            "parent_action": "Valfritt — 'vill du se ditt rum?' efter rutin, inte före",
            "product": "Min värld dessert; parent ser inte barnets lek som krav",
            "child_result": "Progression node unlock — emotionell, inte kvot-UI",
            "rule": "Idag spine först — WDB/GDB",
        },
        {
            "step": 6,
            "name": "Tillbaka till verkligheten",
            "parent_action": "Stänger appen; morgonen fortsätter offline",
            "product": "Ingen retention-hook; ingen 'spela mer'",
            "child_result": "Kapacitet i köket — appen var stöd",
            "rule": "Real life wins — Layer 1 PCB",
        },
    ],
}

REWARD_SYSTEM = {
    "principle": "Föräldern styr verkliga belöningar. Barnet äger känslan. Appen är budbärare — aldrig merchant.",
    "layers": [
        {
            "layer": "Stjärnor (digital fuel)",
            "parent_role": "Ser att barnet tjänat — behöver inte mikrohantera",
            "child_role": "Känner kompetens — 'Du klarade det!'",
            "app_role": "Verifierar completion; visar punctuation",
        },
        {
            "layer": "Skattkammaren (bridge)",
            "parent_role": "Skapar och godkänner belöningar; måste approve redemption",
            "child_role": "Väljer bland godkända belöningar — autonomy inom ram",
            "app_role": "Varm UI — inte shop-simulator; G-07 parent approval",
        },
        {
            "layer": "Min värld (digital lek)",
            "parent_role": "Optional — behöver inte förstå varje node",
            "child_role": "Ownership av diorama; intrinsic play",
            "app_role": "Progression nodes — no magic numbers",
        },
        {
            "layer": "Verklig belöning (Layer 7)",
            "parent_role": "Definierar fika, utflykt, extra sagostund — offline",
            "child_role": "High-five i köket; appen nämnde inte att föräldern 'köpte' glädje",
            "app_role": "Kopplar stjärnor till förhandling — skickar aldrig varor",
        },
    ],
    "warm_not_transactional": [
        "Copy: 'Välj en belöning ni kommit överens om' — inte 'Köp med 50 stjärnor'",
        "Parent approval som omsorg — inte gatekeeping",
        "Ingen countdown på belöning",
        "Ingen pay-to-skip rutin",
    ],
    "never": [
        "App ersätter förälderns närvaro med digital godis",
        "Skattkammaren som loot box",
        "Barn shame om parent nekar — neutral 'fråga mamma/pappa'",
    ],
}

OPERATING_MODES = {
    "calm_mode": {
        "when": "Default — rutin flyter, primaryNeed null",
        "parent_experience": "Lugn hemvy; status utan CTA-stress",
        "coach": "Tyst",
        "child": "Normal Idag",
    },
    "setup_mode": {
        "when": "Dag 0, add child, ny rutin, PERSONALIZE need",
        "parent_experience": "Guided — ett beslut i taget; färdigt default",
        "coach": "coach tone; reducesUncertainty varje steg",
        "child": "Inte blockerad — handoff snabbt",
    },
    "recovery_mode": {
        "when": "RETURNING, dålig vecka, barn vägrar, efter sjukdom",
        "parent_experience": "Välkommen tillbaka; ett litet steg",
        "coach": "encouragement; RESUME_ROUTINE",
        "child": "Värld dim ≤15%; ingen straff",
    },
    "school_morning_mode": {
        "when": "Vardagsmorgon 06–09 (family timezone)",
        "parent_experience": "Minimal — handoff eller tyst status",
        "coach": "Endast SHOW_CHILD eller COMPLETE_DAY om akut",
        "child": "NOW tydlig; snabb completion path",
    },
    "evening_mode": {
        "when": "Kvällsrutin aktiv",
        "parent_experience": "Samma lugn som morgon; ADD_EVENING only as coach suggestion vecka 1+",
        "coach": "calm tone",
        "child": "Reduced motion; ljud av default",
    },
    "vacation_mode": {
        "when": "Parent aktiverar — lov/resa",
        "parent_experience": "Bekräftelse: 'Rutinen pausar — vi väntar på er'",
        "coach": "Tyst",
        "child": "Ingen skuld-animation",
    },
    "co_parent_mode": {
        "when": "Två föräldrar kopplade",
        "parent_experience": "Samma data; invites och approvals synliga för båda",
        "coach": "SHARE_RESPONSIBILITY om en aktiv",
        "child": "En sanning — schema ändras en gång",
    },
    "crisis_mode": {
        "when": "Sjukdom, separation konflikt, extrem stress (parent flag eller inferred dormant + support)",
        "parent_experience": "Minimal surface; human support link synlig",
        "coach": "Tyst eller en rad empati — aldrig produktivitet",
        "child": "Oförändrad trygg Idag — inga extra krav",
    },
}

TRUST_FAILURE_RECOVERY = {
    "when_product_causes": [
        "Förvirrande coach-C TA ('varför ser jag det här?')",
        "Falsk celebration offline",
        "Push som känns skuldbeläggande",
        "Co-parent sync-konflikt med fel sanning",
        "AI-förslag som ignorerar parent beslut",
        "Skattkammaren-känsla av butik",
        "Barnskärm som kräver parent utan escape",
    ],
    "immediate_response": [
        "Back alltid fungerar — anti-frustration GDB",
        "Felmeddelande skyller inte på barn eller förälder",
        "Stäng av feature flag om incident — rollback path",
        "Plain-language 'det här var vår miss' internt; user-facing fix utan jargon",
    ],
    "parent_facing_recovery": [
        "Erkänn i release notes om bred incident",
        "Opt-in tillbaka till push — default av efter breach",
        "Gratis förlängd trial/lifetime respect — aldrig straff",
        "Synlig 'så här ändrade vi' — Trust Engine transparency",
    ],
    "never_do_when_broken": [
        "Mer notifications för att 'engagera tillbaka'",
        "Dark pattern retention",
        "Blame parent for not understanding",
    ],
}
