"""Unique system models for GAME_DESIGN_BIBLE v2 — no shared boilerplate."""
from __future__ import annotations

# Each system: unique copy only. Keys map to § number in v2 TOC.


def system_quest() -> dict:
    return {
        "num": 27,
        "title": "Quest System",
        "syfte": (
            "Quests är **valfria berättelse-trådar** i Min värld som ger kontext åt världens emotion job — "
            "de är aldrig uppdrag som blockerar Idag. v1 har inga explicita quest-loggar; fictionen *är* questen "
            "(t.ex. 'hjälp Mira få ordning i köket' via morgonaktiviteter)."
        ),
        "psykologi": (
            "Barnet söker **meningsfull narrative glue** — inte en todo-lista med XP. Quest-motivation ska komma "
            "från nyfikenhet (*vad händer om jag hjälper till?*) och relatedness (NPC som känner igen insats), "
            "inte från FOMO eller tidsgräns. Om quest känns som läxor har vi designat fel."
        ),
        "designprinciper": (
            "Implicit > explicit i v1. Max **en aktiv quest-tråd per värld** synlig som ambient hint — inte quest tracker. "
            "Quest progress = verified routine completions mappade till fiction. Avslut alltid **löst narrativt** "
            "(NPC tack, ny prop) — aldrig 'Quest failed'."
        ),
        "regler": [
            "Quest får aldrig blockera Idag NOW.",
            "Quest har ingen countdown på barn-UI.",
            "Quest-belöning ≤ rutin-belöning i etisk vikt.",
            "Quest-kedja max djup 3 i child pack.",
            "Quest-abandon: tyst — ingen straff-state.",
            "Quest-copy max 2 meningar; ikon bär primär info.",
        ],
        "anti_patterns": [
            "Quest log med 12 aktiva objekt (MMO-slask).",
            "Daily quest reset med login-bonus.",
            "Quest som kräver IAP.",
            "Quest som jämför syskon.",
        ],
        "ui": (
            "Barn ser quest endast som **världshint** — speech bubble, ghost-prop, eller NPC-blick — aldrig "
            "sidebar med checkboxes. Parent ser valfri quest-mapping i Planering (v2+) som redaktör, inte barn."
        ),
        "backend": (
            "Core event: `onActivityComplete` → pack listener kan sätta `quest_progress[quest_id]` (JSONB per child, v2 table). "
            "v1: quest state implicit via `milestone` + `world_slug`. Idempotent: samma activity_id räknas en gång per dag."
        ),
        "animationer": "Quest-reveal: NPC turn 400 ms + bubble fade 250 ms. Ingen helruta quest cinematic.",
        "ljud": "Valfritt enstaka staccato-not vid quest-steg — av default av. Reduced motion: statisk bubble.",
        "analytics": "`quest_hint_shown`, `quest_beat_reached` — allowlist, anonymized, no PII. Aldrig quest_abandon_shame.",
        "qa": [
            "Idag completable med quest ignorerad.",
            "Quest hint skippbar inom 300 ms.",
            "Quest copy läsbar utan ljud.",
        ],
        "edge_cases": [
            "Barn byter värld mitt i quest-tråd: progress pausad, inte förlorad.",
            "Co-parent markerar retroaktivt: quest beat triggas fair en gång.",
            "Offline: quest hint från cache; progress sync vid reconnect.",
        ],
        "expansion": (
            "Teen pack: explicit valfria side-quests med högre autonomy. Adult support: quest = veckomål med OT-copy. "
            "Engine events oförändrade — endast pack fiction + UI density."
        ),
    }


def system_mission() -> dict:
    return {
        "num": 28,
        "title": "Mission System",
        "syfte": (
            "Missions är **förälder-definierade mål** med tydligt slut — 'denna vecka: en gång hjälpa till med disk'. "
            "Skiljer sig från quest: mission är **familjekontrakt**, inte världsfiction."
        ),
        "psykologi": (
            "Relatedness och shared intention. Barnet ska känna *vi gör det här tillsammans* — inte *appens algoritm "
            "kräver det*. Mission får inte bli övervakning; den ska vara förhandlad offline och speglas i appen som "
            "minnesmärke när klar."
        ),
        "designprinciper": (
            "Parent skapar mission; barn ser **en enkel mission-kort** max 1 aktiv. Completion kräver samma server verify "
            "som rutin. Mission firas som rutin — inte större jackpot."
        ),
        "regler": [
            "Max 1 aktiv mission synlig för barn.",
            "Mission skapas endast parent UI.",
            "Mission timeout → neutral 'pausad' — inte failed.",
            "Mission delas co-parent real-time sync.",
            "Mission utan rutin-koppling kräver parent manuell mark (PIN).",
        ],
        "anti_patterns": [
            "Mission board med 8 kolumner Kanban för barn.",
            "Mission leaderboard syskon.",
            "Auto-genererade skuld-missions ('du har inte…').",
        ],
        "ui": (
            "Barn: valfritt litet Familj-flik-kort med emoji + en mening. Parent: skapa mission ≤3 steg wizard. "
            "Ingen progress bar som grind — endast 'klar' / 'pågår'."
        ),
        "backend": (
            "`family_mission` (v2): family_id, child_id, title, activity_template_ids[], status, created_by. "
            "Complete via `daily_log_item` match eller parent POST verify. Engine: `onMissionComplete` event."
        ),
        "animationer": "Mission complete: samma celebration pipeline som activity — ingen separat slot machine.",
        "ljud": "Identisk med activity complete — pack kan override med familje-ljud ADR.",
        "analytics": "`mission_created`, `mission_completed` — parent-initierade metrics, not child funnel.",
        "qa": ["Mission utan aktivitet länk: parent verify flow.", "Syskon-isolation: mission per child_id."],
        "edge_cases": [
            "Mission raderas av parent: barn ser neutral borttag — ingen 'mission failed'.",
            "Delad custody: co-parent ser samma mission state.",
        ],
        "expansion": "Teen: self-proposed missions med parent approve. Adult: veckomål utan barn-emoji.",
    }


def system_routine() -> dict:
    return {
        "num": 29,
        "title": "Routine System",
        "syfte": (
            "Routine system är **NOW / NEXT / LATER** — den executiva funktionssställningen som gör att barnet vet "
            "vad som kommer utan att fråga vuxen varje gång. Detta är produktens ryggrad."
        ),
        "psykologi": (
            "Predictability minskar ångest (särskilt autism/ADHD-vänligt). Barnet bygger **inre modell av dagen**. "
            "Överraskningar i rutin = betrayal of trust. Success = *jag vet vad som kommer* + *jag klarade det*."
        ),
        "designprinciper": (
            "En primary NOW. NEXT/LATER som preview — max 2. Ordning stabil tills parent ändrar. "
            "Special day override dokumenterad precedence: special > weekly > default."
        ),
        "regler": [
            "Barn redigerar aldrig schema (C-02).",
            "NOW exakt en aktivitet synlig.",
            "Section times (fm/em/kväll) respekterar family settings.",
            "Schedule exclusion 'bara denna dag' server-side.",
            "Routine notification endast parent opt-in.",
        ],
        "anti_patterns": [
            "Random shuffle av aktiviteter dagligen.",
            "NOW gömd bakom world cutscene.",
            "15 aktiviteter synliga samtidigt.",
        ],
        "ui": (
            "Idag: NOW-kort 60 % visual weight. NEXT som små ikoner. LATER collapsed. "
            "Birthday/special day badge subtil — inte helruta."
        ),
        "backend": (
            "`weekly_schedule` + `weekly_schedule_item` + `special_day_schedule*`. "
            "GET `/api/children/:id/today` returnerar ordered items med section. Timezone: family.timezone."
        ),
        "animationer": "NOW→NEXT advance: crossfade 200 ms. Ingen slot-reel mellan aktiviteter.",
        "ljud": "Valfritt soft tick vid section change — av default. Kväll: tystare profil.",
        "analytics": "`routine_now_view`, `routine_section_complete` — no dwell-time manipulation.",
        "qa": [
            "Midnight boundary test family TZ.",
            "Special day override integration test.",
            "Empty day: calm 'inget mer idag' — not error.",
        ],
        "edge_cases": [
            "Zero activities configured: parent CTA — barn ser vänlig 'fråga vuxen'.",
            "Activity paused parent: NOW skip med förklaring till barn.",
        ],
        "expansion": "Adult support pack: längre chains, break reminders — samma schedule engine.",
    }


def system_activity() -> dict:
    return {
        "num": 30,
        "title": "Activity System",
        "syfte": (
            "Activity är **atomär verifierbar enhet** — 'borsta tänder', inte 'morgon'. En aktivitet = en stjärna-källa, "
            "en celebration, en loggrad. All game economy bygger på activity truth."
        ),
        "psykologi": (
            "Competence i mikroskala. Barnet ska känna *den här specifika saken fixade jag*. "
            "Sub-steps stödjer utan att splittra fokus. Tap-to-complete respekterar motor skills."
        ),
        "designprinciper": (
            "Visual-first card. Star value server-defined. Sub_steps JSONB optional. "
            "One tap complete where honest — parent kan kräva verify för känsliga."
        ),
        "regler": [
            "completion → `daily_log_item` med `completed_date`.",
            "Same activity same day: idempotent star grant.",
            "Star value > 0 validerat Zod server.",
            "Emoji + icon ≥48 px touch.",
            "Activity card alt-text för a11y.",
        ],
        "anti_patterns": [
            "Mini-game gate före varje activity.",
            "Activity med 0 stars som straff.",
            "Client-side complete utan server ack.",
        ],
        "ui": (
            "Kort: emoji/image vänster, namn kort, sub-step dots om finns. "
            "Complete: hela kortet tap target — inte liten kryss-ruta."
        ),
        "backend": (
            "POST `/api/daily-logs/...` verify parent/child authz. "
            "`activity_template` family-scoped. Source admin|user."
        ),
        "animationer": "Complete: squash 80 ms → glow 400 ms → star arc 600 ms. Total ≤2000 ms skippable.",
        "ljud": "En staccato + valfritt world hint chime. Silent mode: full visual.",
        "analytics": "`activity_complete` med activity_template_id hash — no child name in event.",
        "qa": ["Double tap debounce.", "Offline queue replay no duplicate stars.", "Sub-step partial state."],
        "edge_cases": [
            "Retroactive parent entry: completed_date backdated — one celebration.",
            "Pedagog read-only: cannot complete.",
        ],
        "expansion": "Teen activities: längre text OK via pack reading_level config.",
    }


def system_collection() -> dict:
    return {
        "num": 31,
        "title": "Collection System",
        "syfte": (
            "Collections är **minnesmärken** — 'du var modig den dagen' — inte Pokémon-grind. "
            "Varje collectible har en berättelse kopplad till verified win."
        ),
        "psykologi": (
            "Identity över tid. Barnet ska kunna peka: *det där fick jag när jag…*. "
            "Completionism OK om frivillig — aldrig 'catch 'em all' pressure med hål i dex."
        ),
        "designprinciper": (
            "No duplicate trash. No rarity tiers som gacha. Museum view optional parent. "
            "Collectible unlock = milestone eller kindness trigger — documented."
        ),
        "regler": [
            "Varje collectible_id unik per child.",
            "Ingen köpbar collectible.",
            "Ingen trade mellan syskon (isolated inventories).",
            "Display max 6 featured i rum — rest i museum.",
            "Collectible never decreases.",
        ],
        "anti_patterns": ["Duplicate för scrap.", "RNG drop table.", "Seasonal collectible FOMO wall."],
        "ui": "Shelf display i Min värld — tap för kort lore 2 rader. Ingen % complete bar.",
        "backend": "`child_collectible(child_id, collectible_id, earned_at, source_event)`. Server grant only.",
        "animationer": "Earn: item materialize 400 ms på hylla — inte loot chest.",
        "ljud": "Soft 'plopp' — optional.",
        "analytics": "`collectible_earned` med source milestone type.",
        "qa": ["Duplicate grant idempotent.", "Missing art fallback emoji."],
        "edge_cases": ["World migration: collectibles följer child inte world wipe."],
        "expansion": "Teen: frivillig journal link till collectible — same engine row.",
    }


def system_achievement() -> dict:
    return {
        "num": 32,
        "title": "Achievement System",
        "syfte": (
            "Achievements är **privata milstolpar** som bekräftar lång rytm — 'första veckan med morgon' — "
            "inte Xbox gamerscore. Synliga för barn endast om pack säger det; default subtil."
        ),
        "psykologi": (
            "Mastery över månader. Pride without comparison. Achievement ska kännas som ** diplom i lådan**, "
            "inte badge som skriker 'du är sämre än andra'."
        ),
        "designprinciper": (
            "Ceremony ≤2 s skippable. No retroactive shame för unearned. "
            "Achievement definitions versioned — earning alltid på forward progress."
        ),
        "regler": [
            "Ingen public leaderboard.",
            "Max 1 achievement ceremony per session.",
            "Achievement copy accomplishment-first.",
            "Parent kan se lista — barn default minimal.",
            "No achievement for login streak alone.",
        ],
        "anti_patterns": ["90% achievements locked synligt.", "Achievement points shop.", "Rare achievement FOMO."],
        "ui": "Optional Familj-hörn trofe — tap öppnar 3 senaste — inte grid 100.",
        "backend": "`child_achievement` + rule engine on `onMilestone`. Rules in pack manifest JSON.",
        "animationer": "Medalj glider in 500 ms — reduced motion: instant icon.",
        "ljud": "En harmonisk kvart — optional.",
        "analytics": "`achievement_unlocked` — count capped reporting.",
        "qa": ["Rule boundary 6/7 days — fair grant.", "Downgrade forbidden."],
        "edge_cases": ["Account merge: achievements union utan duplicate."],
        "expansion": "Adult: achievement = habit streaks utan barn-emoji.",
    }


def system_building() -> dict:
    return {
        "num": 33,
        "title": "Building System",
        "syfte": (
            "Building är **placement av earnade delar** i diorama — ownership gjord fysisk. "
            "Inte SimCity grind; en del i taget, meningsfull i fiction."
        ),
        "psykologi": (
            "Autonomy + competence peak: *jag valde var hyllan står*. Barnet behöver kontroll över sin värld "
            "efter att vuxenvärlden styr så mycket. Placement är terapeutiskt — inte dekorations-shopping."
        ),
        "designprinciper": (
            "Ghost outline valid slots. Magnetic snap 8 px. Invalid = gentle gray pulse — aldrig röd. "
            "One part focus per session default."
        ),
        "regler": [
            "Build part unlock server milestone.",
            "Placement sparas server — client preview only.",
            "Rearrange unlocked post-milestone optional.",
            "Part shadow same frame as solid land.",
            "Concurrent build ceremony: one per session.",
        ],
        "anti_patterns": ["15-step IKEA UI.", "Paid parts.", "Destroy part mechanic.", "Timer på placement."],
        "ui": "Placement mode: zoom 108 %, ghost, snap zones highlighted gold once.",
        "backend": "`build_part_state(child_id, world_slug, part_id, x, y, rotation, placed_at)`.",
        "animationer": "Land 400 ms ease-out §Art Bible 36. Snap particle max 12.",
        "ljud": "Wood thunk optional — Verkstaden variant metal ping.",
        "analytics": "`build_part_placed` med part_id + world_slug.",
        "qa": ["Overlap validation.", "Sync conflict two devices — server wins.", "Reduced motion instant."],
        "edge_cases": ["Invalid slot tap: haptic off + gray hint — no error toast barn."],
        "expansion": "Teen: multi-room layout — same placement API.",
    }


def system_discovery() -> dict:
    return {
        "num": 34,
        "title": "Discovery System",
        "syfte": (
            "Discovery är **att hitta något som redan fanns** — en gömd låda, en ny NPC-replik efter milestone. "
            "Skiljer sig från exploration (rörelse) och curiosity (micro-detail)."
        ),
        "psykologi": (
            "Dopamine från **pattern recognition** — 'aha, det där fanns här hela tiden!'. "
            "Must feel earned by attention or kindness — not random login roll."
        ),
        "designprinciper": (
            "Discoveries catalogged per child `discovery_flags`. Max 1 major discovery per session default. "
            "No checklist UI barn — discovery log parent optional."
        ),
        "regler": [
            "Discovery kräver trigger (milestone, kindness count, visit count).",
            "Ingen discovery paywall.",
            "Repeat visit: discovery stays discovered — no re-roll.",
            "Discovery never blocks exit.",
            "Hint efter 3 besök utan find optional — aldrig tvingande.",
        ],
        "anti_patterns": ["Discovery % tracker.", "RNG loot on tap prop.", "Miss discovery forever one-shot."],
        "ui": "Subtle sparkle on first find 800 ms — then permanent state change prop.",
        "backend": "`child_discovery(child_id, discovery_key, discovered_at, trigger_event)`.",
        "animationer": "Reveal: silhouette → color 600 ms — skippable.",
        "ljud": "Chime major only — minor discovery silent OK.",
        "analytics": "`discovery_unlocked` — no funnel pressure metrics.",
        "qa": ["Trigger edge 2 vs 3 visits.", "Pack swap preserves flags."],
        "edge_cases": ["Sibling same device different child: separate flags."],
        "expansion": "Adult pack: discovery = nya coping tools unlocked — same flag system.",
    }


def system_exploration() -> dict:
    return {
        "num": 35,
        "title": "Exploration System",
        "syfte": (
            "Exploration är **spatial navigation** i Min värld — pan, zoom, enter room — utan bestraffning för 'fel väg'. "
            "Nintendo: utforska ska vara lek, inte maze med dead ends."
        ),
        "psykologi": (
            "Safe autonomy i begränsat space. Barnet testar gränser utan risk. "
            "Soft bounds — camera pan limits — inte osynliga väggar med 'du kan inte'."
        ),
        "designprinciper": (
            "Pan max 120 px/s. Bounds padding 12 px. No soft-lock. Back alltid exit. "
            "Exploration time not scored."
        ),
        "regler": [
            "Alla rum reachable utan grind gate.",
            "Secret rooms earned — not paywalled.",
            "Exploration pauses idle celebration — not inverse.",
            "No energy meter for walking.",
            "Exploration achievements forbidden — use discovery instead.",
        ],
        "anti_patterns": ["Fog of war på barnrum.", "Damage on wrong tile.", "Map collectibles required for progress."],
        "ui": "Edge parallax hint on pan limit — inte modal 'stopp'.",
        "backend": "Mostly client; `room_visit_count` optional analytics. No server gate on pan.",
        "animationer": "Parallax 3 layers max §Art Bible. Room enter crossfade 300 ms.",
        "ljud": "Footstep optional 6 s interval max — Läshörnan off default.",
        "analytics": "`world_room_entered` — aggregate only.",
        "qa": ["SE device pan jank.", "Reduced motion: no parallax."],
        "edge_cases": ["Deep link till rum: land safe default camera."],
        "expansion": "Larger worlds teen: same pan rules, wider bounds ADR.",
    }


ALL_SYSTEMS = [
    system_quest,
    system_mission,
    system_routine,
    system_activity,
    system_collection,
    system_achievement,
    system_building,
    system_discovery,
    system_exploration,
]
