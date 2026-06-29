"""Loops, Family OS, Coach, Trust, Mental Load for PARENT_EXPERIENCE_BIBLE."""

PARENT_LOOPS = {
    "daily": {
        "window": "Morgon · eftermiddag · kväll",
        "parent_job": "Släpp kontroll till barnets Idag; var backup inte dirigent",
        "product": "Hem: max ett coach-kort om need finns. Annars lugn status.",
        "child_spine": "NOW / NEXT / LATER — parent ser sammanfattning not micromanagement",
        "exit": "Familjen lämnar appen till verkligheten",
    },
    "weekly": {
        "window": "7 dagar",
        "parent_job": "Se mönster utan skuld",
        "product": "Optional veckosammanfattning — höjdpunkt att dela, inte rapportkort",
        "metrics": "Konsekvens som reflektion, inte streak-skräck",
    },
    "monthly": {
        "window": "30 dagar",
        "parent_job": "Justera rutin/belöning/världstakt",
        "product": "Coach PERSONALIZE; Family Memory månadslinje",
        "anti": "Månatliga 'du missade X'",
    },
    "quarterly": {
        "window": "90 dagar",
        "parent_job": "Förbereda säsongsbyte (skolstart, lov, ljus/mörker)",
        "product": "Family OS säsongsmoduler — förslag inte tvång",
        "anti": "Battle pass season reset",
    },
    "yearly": {
        "window": "12 månader",
        "parent_job": "Fira familjens resa",
        "product": "Årsminne, traditioner, export optional (museum frame parent opt-in)",
        "anti": "Annual shame report",
    },
}

FAMILY_OS = {
    "morgon": {
        "stress": "Tidspress, glömda saker, upprepning",
        "product": "Idag spine; parent CTA endast om handoff saknas",
        "coach": "SHOW_CHILD, COMPLETE_DAY",
        "memory": "Smooth morning som First Success kind",
    },
    "eftermiddag": {
        "stress": "Övergång skola–hem, skärm/homework",
        "product": "Valfri eftermiddagsrutin — aldrig default spam",
        "coach": "INCREASE_CONSISTENCY → ADD_EVENING experiment",
    },
    "kväll": {
        "stress": "Läggning, skjutande tid",
        "product": "Kvällsschema som spegel morgon — samma UX-språk",
        "coach": "Calm tone; reduced motion",
    },
    "helg": {
        "stress": "Avvikande rytm",
        "product": "Helgschema optional; annars paus utan skuld",
        "coach": "ADD_WEEKEND experiment only when need",
    },
    "lov": {
        "stress": "Schema kollaps",
        "product": "Vacation mode parent-controlled (GDB §22)",
        "coach": "Tyst eller RESUME_ROUTINE efter lov",
    },
    "semester": {
        "stress": "Resa, tidszon",
        "product": "Offline queue; välkomnande tillbaka dim ≤15% (WDB)",
        "coach": "Ingen 'du var borta' copy",
    },
    "sjukdom": {
        "stress": "Ingen energi för app",
        "product": "Ingen push. Välkommen tillbaka utan catch-up skuld.",
        "coach": "RE_ENGAGE varsam",
    },
    "resor": {
        "stress": "Ny miljö",
        "product": "Rutin följer barnet; parent ser sync calmly",
        "coach": "Ingen extra setup krävs",
    },
    "skolstart": {
        "stress": "Ny rytm augusti",
        "product": "Mjuk template-förslag — parent godkänner",
        "coach": "PERSONALIZE not panic",
    },
    "jul": {
        "stress": "Högt tempo",
        "product": "Seasonal ambient i barnvärld — parent ej FOMO",
        "coach": "Type A ambient OK; Type D login RNG BLOCK (GDB)",
    },
    "födelsedagar": {
        "stress": "Vill fira utan app-styrning",
        "product": "Special day schedule optional; Familj-minne",
        "coach": "Celebration tone — kort",
    },
    "separation": {
        "stress": "Två hushåll, koordinering",
        "product": "Co-parent sync; neutral copy; inga 'vem missade'",
        "coach": "SHARE_RESPONSIBILITY; aldrig blame",
    },
    "bonusfamilj": {
        "stress": "Inkludering utan steg-förälder-känsla",
        "product": "Invite flows; roller primary/shared; Familj relatedness",
        "coach": "Relatedness not surveillance",
    },
}

COACH_SYSTEM = {
    "identity": "Produkten är en coach — inte en kontrollant.",
    "layers": "Brain (need) → Coach (action) → Voice (copy) → ett kort på Hem",
    "how_speaks": [
        "Kort, varm, svensk vardagston",
        "Ett fokus — aldrig meny",
        "Bekräftar: 'Du är på rätt väg'",
        "Säger aldrig 'Mission' i UI",
        "Ton: coach, calm, encouragement, celebration (sällan warning)",
    ],
    "when_silent": [
        "primaryNeed null — familjen flyter",
        "Barnet aktiv i Idag — parent ska inte störa",
        "Natt — inga push",
        "Vacation mode",
        "Efter milestone — kort paus before next coach",
    ],
    "when_leads": [
        "ONBOARDING — SHOW_CHILD",
        "DORMANT/RETURNING — RESUME_ROUTINE",
        "Gap i rutin — ADD_EVENING / CUSTOMIZE",
        "Ensam förälder bär allt — INVITE_PARENT",
    ],
    "when_celebrates": [
        "First Success milestone",
        "first_complete_routine",
        "Co-parent joined",
        "Optional veckohöjdpunkt",
    ],
    "when_waits": [
        "Vecka 0 — inte föreslå belöning före First Success",
        "Barnet inte sett app — inget annat CTA före handoff",
        "Dålig vecka — välkomna tillbaka först",
    ],
    "never_says": [
        "Du har missat X dagar",
        "Ditt barn ligger efter",
        "Aktivera notiser nu eller missa",
        "Köp / uppgradera för att fixa morgonen",
        "Syskon A vs B",
        "AI-dominans ('Jag har bestämt att…')",
    ],
}

TRUST_ENGINE = {
    "pillars": [
        ("Transparens", "Föräldern förstår varför ett förslag visas — aldrig 'varför ser jag det här?'"),
        ("Server truth", "Stjärnor och progression verifierade — ingen falsk celebration offline"),
        ("No surveillance", "Barnets privata val (humör-dagbok dockhus) stannar hos barnet"),
        ("Parent approval", "Layer 7 real reward — Skattkammaren kräver förälder"),
        ("Calm errors", "Nätverksfel skyller inte på barn eller förälder"),
        ("Data dignity", "Export/opt-in minnen — inte auto-dela"),
    ],
    "build": [
        "Constitution 5/5 på varje parent-facing change",
        "reducesUncertainty i varje voice-post",
        "Screenshot test — förälder stolt, inte generad",
        "Co-parent ser progress — inte jämförelse",
    ],
    "never_lose": [
        "Ingen dark pattern efter dopamin-spike",
        "Ingen bait-and-switch efter registrering",
        "Ingen dold paywall på rutin",
        "Ingen AI som överrider föräldrabeslut",
        "Ingen dataplöts till tredje part utan consent",
    ],
    "recovery_if_damaged": [
        "Plain-language förklaring",
        "Default av — opt-in tillbaka",
        "Human support path",
        "ADR + post-mortem public internally",
    ],
}

MENTAL_LOAD = {
    "planning": "Dag 0 färdig rutin; coach föreslår nästa steg — parent planerar inte från noll",
    "påminnelser": "Push sällan; förälder väljer; aldrig skuld-push",
    "konflikter": "Produkten skapar inte syskon-tävling; en primary action barn",
    "beslut": "Max ett beslut i taget; experiment på coach inte parent",
    "oro": "Osäkerhet minskas varje steg (Lag 7); status utan alarm",
    "friktion": "Ingen wizard; back fungerar; co-parent delar börda",
    "system_rules": [
        "Default är gjort — anpassa är optional",
        "Tomma tillstånd förbjudna",
        "Inställningar är sällan destination",
        "Hem är inte en dashboard med 12 widgets",
    ],
}

FAMILY_MEMORY = {
    "purpose": "Hjälpa familjen minnas resan — inte arkivera skuld.",
    "includes": [
        "First Success ögonblick",
        "Milestone timeline (stjärnor, världar, rutiner)",
        "Säsongshöjdpunkter (jul, skolstart, födelsedag)",
        "Co-parent delade minnen",
        "Optional museum export (parent opt-in, WDB)",
        "Veckohöjdpunkt att dela externt",
    ],
    "excludes": [
        "Surveillance log of child failures",
        "Streak shame archive",
        "Jämförelse mellan barn",
        "Auto-post till sociala medier",
    ],
    "presentation": "Varm tidslinje — inte Excel. Firande > statistik.",
}

MOTIVATION = {
    "barn": {
        "framework": "SDT — competence, autonomy, relatedness (GDB §8, PCB)",
        "fuel": "Stjärnor som punctuation — Min värld som optional lek",
        "forbidden": [
            "Login bonus",
            "Skuld-NPC eller Tamagotchi-mechanik",
            "Syskon-leaderboard",
            "G-regler G-01–G-08 brutna",
        ],
    },
    "förälder": {
        "framework": "Lättnad, stolthet, samarbete — inte produktivitetspoäng",
        "fuel": "Ser att det fungerar offline; coach bekräftar rätt väg",
        "forbidden": [
            "Parent streak som skuld",
            "Admin completion badges",
            "DAU-guilt i copy eller push",
        ],
    },
    "familj": {
        "framework": "Relatedness — Familj-värld, co-parent, delade minnen",
        "fuel": "Gemensam stolthet, inte tävling",
        "forbidden": [
            "Familj-leaderboard",
            "Delad skuld mellan vuxna",
        ],
    },
}

FAILURE_RECOVERY = {
    "ingen_användning": {
        "situation": "Appen öppnas inte på 7–14 dagar",
        "product": "Core state DORMANT; ingen skuld-push",
        "return": "RE_ENGAGE → RESUME_ROUTINE; tone encouragement",
    },
    "barnet_vägrar": {
        "situation": "Barnet vill inte öppna Idag",
        "product": "Ingen straff; parent får tips om handoff not force",
        "return": "Fokus verklig belöning Layer 7; minska krav temporärt",
    },
    "rutiner_kraschar": {
        "situation": "Schema kaos efter lov/sjukdom",
        "product": "Vacation mode; enkel återställning",
        "return": "Välkommen tillbaka; retroactive parent completion fair cap (WDB)",
    },
    "förälder_ger_upp": {
        "situation": "Förälder uninstall eller ignorera",
        "product": "Win-back endast varsam email — approval gated",
        "return": "Erbjud Resume not 'you failed'",
    },
    "dålig_vecka": {
        "situation": "Allt går snett",
        "product": "Dim world ≤15%; coach tyst eller en varm rad",
        "return": "Ingen catch-up marathon; nästa litet steg",
    },
    "principles": [
        "Welcome not guilt (POS 00A)",
        "Miss day ≠ failure",
        "Real life wins",
        "Never blame child in parent copy",
    ],
}

NOTIFICATIONS = {
    "when_send": [
        "Parent explicit opt-in påminnelse",
        "Co-parent invite accepted",
        "PIN lockout warning (safety)",
        "Skattkammaren redemption request (action needed)",
        "Optional veckosammanfattning om påslagen",
    ],
    "when_not_send": [
        "Barnet missade rutin",
        "Streak om barn",
        "FOMO värld/event",
        "Marketing utan consent",
        "AI coach unsolicited advice",
        "Natt 21–07 default",
    ],
    "never_push": [
        "Du ligger efter",
        "Ditt barn har inte loggat in",
        "Limited time world",
        "Köp premium nu",
        "Syskonjämförelse",
        "Login bonus",
    ],
    "tone": "Calm, actionable, one tap to value — dismiss never punishes",
}

AI_COACH = {
    "may_do": [
        "Föreslå nästa steg baserat på Brain need (via Coach layer)",
        "Generera copy från voice-katalog med guardrails",
        "Sammanfatta vecka om parent opt-in",
        "Hjälpa formulera belöning copy",
        "Förklara varför ett förslag visas (transparency)",
    ],
    "never_do": [
        "Fatta beslut utan parent confirm (schema, belöning, push)",
        "Skriva till barnet utan parent gate",
        "Jämföra barn eller föräldrar",
        "Diagnostisera NPF/medical",
        "Ersätta terapeut eller pedagog",
        "Manipulera med skuld/FOMO",
        "Override G-rules eller Constitution",
    ],
    "never_decide": [
        "Aktivera push defaults",
        "Ändra barnschema utan explicit approve",
        "Godkänna Skattkammaren utgift",
        "Dela data externt",
        "Co-parent permissions",
    ],
    "human_escalation": "Alltid synlig väg till människa/support vid trust breach",
}

PARENT_RUNTIME = {
    "decision_support": {
        "job": "Ett rekommenderat nästa steg — inte beslutsträd",
        "input": "Brain primaryNeed, capabilities, core state",
        "output": "Coach action + voice card",
    },
    "planning": {
        "job": "Schema/redigering när parent väljer — inte default hem",
        "input": "Family settings, season transitions",
        "output": "Updated routine templates",
    },
    "reflection": {
        "job": "Vecko/månad minne — optional",
        "input": "Completions, milestones, photos opt-in",
        "output": "Warm summary not KPI dashboard",
    },
    "insights": {
        "job": "Mönster som hjälper — inte surveillance",
        "input": "Aggregated family rhythm",
        "output": "Tips ('kväll saknas') only when need",
    },
    "celebration": {
        "job": "Milestone moments — kort",
        "input": "first_success, co_parent_joined",
        "output": "Celebration tone ≤2000 ms equivalent emotional length",
    },
    "conflict_prevention": {
        "job": "Undvik syskon-tävling, skuld, dubbla CTAs",
        "input": "Family structure facts",
        "output": "Neutral copy, separate child sessions",
    },
    "family_alignment": {
        "job": "Co-parent sync, shared view of progress",
        "input": "Invite tokens, roles",
        "output": "Same truth, no blame assignment",
    },
}

SUCCESS_METRICS = {
    "not": ["DAU", "MAU", "Session length", "Screen minutes", "Feature adoption count"],
    "measure": {
        "familjestress": "Kvalitativ + proxy: förälder rapporterar lugnare morgon",
        "konflikter": "Färre upprepningar — enkel enfråga i playtest",
        "självständighet": "Barn complete utan parent nag",
        "trygghet": "Trust survey; refund/churn reasons",
        "konsekvens": "first_success_within_48h, dag 7 — not streak terror",
        "glädje": "Child voluntary return Min värld; parent screenshot pride",
        "familjesamarbete": "Co-parent invite completion; shared milestones",
    },
    "proxies": [
        "first_success_within_48h",
        "first_complete_routine",
        "dag 2 / dag 7 retention",
        "need_fulfilled_within_7d",
        "child_has_seen_app",
    ],
}

ANTI_PATTERNS = [
    ("AP-P01", "todo-app", "Oändlig checklista utan ledning", "Ett nästa steg + färdig dag 0"),
    ("AP-P02", "kalender", "Parent måste planera varje dag", "Rutin lever; kalender är undantag"),
    ("AP-P03", "skolplattform", "Lärar-dashboard estetik", "Familj-värme, Nintendo inte SaaS"),
    ("AP-P04", "habit tracker", "Streak skuld", "Welcome back; streak optional parent-only"),
    ("AP-P05", "övervakning", "Logga varje barnfel", "Server truth utan skuld-UI"),
    ("AP-P06", "produktivitetsapp", "Parent completion %", "Lättnad och minnen"),
    ("AP-P07", "administration", "12 inställningar på hem", "Coach kort eller lugn status"),
    ("AP-P08", "kontroll", "Remote pause barn som straff", "Pause activity — pedagogiskt"),
    ("AP-P09", "skuld", "Missed day copy", "Dim welcome (WDB)"),
    ("AP-P10", "uppfostran", "App som domare", "Coach som medspelare"),
]
