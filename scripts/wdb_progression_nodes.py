"""Progression node maps per world — variable count, no magic numbers."""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ProgressionNode:
    order: int
    node_id: str
    node_type: str  # build | room | npc | animal | animation | feature | sound | bridge | ...
    name_sv: str
    emotional_beat: str
    unlock_signal: str  # data-driven trigger description — not hardcoded star count
    pack_config_key: str  # manifest key path


@dataclass
class WorldProgression:
    slug: str
    name_sv: str
    progression_model: str
    phases: list[str]
    nodes: list[ProgressionNode]


def _n(
    slug: str,
    order: int,
    nid: str,
    ntype: str,
    name: str,
    beat: str,
    unlock: str,
    key: str = "",
) -> ProgressionNode:
    return ProgressionNode(
        order=order,
        node_id=f"{slug}_{nid}",
        node_type=ntype,
        name_sv=name,
        emotional_beat=beat,
        unlock_signal=unlock,
        pack_config_key=key or f"progression.{slug}.{nid}",
    )


def morgonhuset() -> WorldProgression:
    s = "routine_home"
    nodes = [
        _n(s, 1, "welcome_mat", "build", "Välkomstmatta", "Första foten innanför — du hör hemma.", "first_activity_complete:morning", "progression.routine_home.welcome_mat"),
        _n(s, 2, "nightstand", "build", "Nattduksbord", "Natten och morgonen hänger ihop.", "milestone:sprout", "progression.routine_home.nightstand"),
        _n(s, 3, "mirror_corner", "room", "Spegelhörna", "Jag ser mig själv som kapabel.", "activity_streak:brush_teeth:3", "progression.routine_home.mirror"),
        _n(s, 4, "coat_peg", "build", "Kapstok", "Kladerna har en plats.", "milestone:root", "progression.routine_home.coat_peg"),
        _n(s, 5, "breakfast_nook", "room", "Frukosthörna", "Morgon kan smaka lugnt.", "activity_group:breakfast:complete_week", "progression.routine_home.breakfast_nook"),
        _n(s, 6, "mira_arrives", "npc", "Morgon-Mira", "Någon ser att jag försöker.", "milestone:root + first_world_enter", "progression.routine_home.npc_mira"),
        _n(s, 7, "door_threshold", "build", "Dörrtröskel ljus", "Avfärd utan bråk — stolt.", "milestone:branch", "progression.routine_home.door"),
        _n(s, 8, "kettle_steam", "animation", "Kettle ånga", "Värmen efter morgon-klar.", "daily:morning_section_complete", "progression.routine_home.kettle_anim"),
        _n(s, 9, "window_bird", "animal", "Fönsterfågel", "Världen utanför väntar lugnt.", "explore:taps:5", "progression.routine_home.bird"),
        _n(s, 10, "breakfast_secret", "feature", "Hemlig frukostbricka", "Belöning för att utforska.", "kindness:flag + milestone:bloom", "progression.routine_home.secret_tray"),
        _n(s, 11, "balcony_hook", "room", "Balkongkrok ( framtid )", "Sommarluft som mål.", "milestone:legacy", "progression.routine_home.balcony"),
        _n(s, 12, "museum_frame", "feature", "Morgon-foto museum", "Minnen utan skuld.", "milestone:legacy + parent_export_opt_in", "progression.routine_home.museum"),
    ]
    return WorldProgression(
        slug=s,
        name_sv="Morgonhuset",
        progression_model="Rum växer längs morgonsekvensen — spegel, frukost, avfärd — node count driven av emotion beats, not quota.",
        phases=["Sprout", "Root", "Branch", "Bloom", "Legacy"],
        nodes=nodes,
    )


def verkstaden() -> WorldProgression:
    s = "workshop"
    projects = [
        ("birdhouse", "Fågelholk", 6),
        ("toy_boat", "Leksaksbåt", 5),
        ("planter", "Planteringslåda", 5),
        ("picture_frame", "Ram familjefoto", 4),
        ("tool_rack", "Verktygsvägg komplett", 8),
        ("window_display", "Fönster-display", 4),
        ("co_build", "Co-build med vuxen", 5),
        ("master_bench", "Mästarbänk", 6),
    ]
    nodes: list[ProgressionNode] = [
        _n(s, 1, "empty_bench", "build", "Tom arbetsbänk", "Potential — inte tomhet.", "world_unlock:workshop", "progression.workshop.bench"),
        _n(s, 2, "pegboard", "build", "Pegboard", "Verktyg kan hängas där jag når.", "milestone:sprout", "progression.workshop.pegboard"),
        _n(s, 3, "sune_npc", "npc", "Snickar-Sune", "Någon som gör bredvid mig.", "first_helper_activity", "progression.workshop.npc_sune"),
    ]
    order = 4
    for pid, pname, components in projects:
        nodes.append(_n(s, order, f"proj_{pid}_start", "feature", f"Projekt: {pname} — start", f"Maker stolthet — {pname}.", f"project_unlock:{pid}", f"progression.workshop.projects.{pid}.start"))
        order += 1
        for c in range(1, components + 1):
            nodes.append(_n(
                s, order, f"proj_{pid}_c{c}", "build",
                f"{pname} — komponent {c}",
                f"Synligt framsteg utan siffror i UI.",
                f"project_stage:{pid}:{c}",
                f"progression.workshop.projects.{pid}.components.{c}",
            ))
            order += 1
    nodes.append(_n(s, order, "workshop_complete", "feature", "Verkstad komplett", "Alla projekt på hylla — arv.", "all_projects:displayed", "progression.workshop.complete"))
    return WorldProgression(
        slug=s,
        name_sv="Verkstaden",
        progression_model="8 stora projekt × varierande komponenter (40–120 totalt i data) — komponenter är noder, inte fast 75-lista.",
        phases=["Bänk", "Projekt 1–3", "Projekt 4–6", "Projekt 7–8", "Mästar-display"],
        nodes=nodes,
    )


def husdjurshemmet() -> WorldProgression:
    s = "pet_home"
    phases_nodes = [
        ("hem", "Bygg hem", [
            ("fence", "build", "Staket & grind", "Trygg gräns."),
            ("bed", "build", "Sovhörna", "Soft landing."),
            ("bowls", "build", "Skålar", "Omsorg synlig."),
            ("companion", "animal", "Rescue companion", "Tillhörighet."),
        ]),
        ("tradgard", "Trädgård", [
            ("garden_patch", "room", "Trädgård", "Utomhus omsorg."),
            ("flowers", "build", "Blomrabatt", "Lugnt arbete."),
            ("insect_hotel", "build", "Insektshotel", "Liv i kanten."),
        ]),
        ("lekplats", "Lekplats", [
            ("play_tunnel", "build", "Lektunnel", "Lek efter care."),
            ("toy_zone", "feature", "Leksakshörna", "Glädje utan krav."),
        ]),
        ("stall", "Stall / sanctuary", [
            ("second_enclosure", "room", "Andra enclosure", "Mer plats — sent spel."),
            ("sanctuary_plaque", "feature", "Sanctuary plakett", "Arv-omsorg."),
            ("sara_bench", "npc", "Skötare Sara", "Vuxen i bakgrunden, aldrig chef."),
        ]),
    ]
    nodes: list[ProgressionNode] = []
    order = 1
    for phase_id, phase_name, items in phases_nodes:
        for nid, ntype, name, beat in items:
            nodes.append(_n(
                s, order, f"{phase_id}_{nid}", ntype, name, beat,
                f"phase:{phase_id} + care_activities:verified",
                f"progression.pet_home.{phase_id}.{nid}",
            ))
            order += 1
    return WorldProgression(
        slug=s,
        name_sv="Husdjurshemmet",
        progression_model="Bygg hem → trädgård → lekplats → stall — fasbaserad, node count per fas i pack manifest.",
        phases=["Hem", "Trädgård", "Lekplats", "Stall"],
        nodes=nodes,
    )


def dinosauriedalen() -> WorldProgression:
    s = "dino_valley"
    nodes = [
        _n(s, 1, "trail_start", "room", "Stig i dimma", "Mod börjar med ett steg.", "world_unlock:dino_valley"),
        _n(s, 2, "expedition_1", "feature", "Expedition 1: fotspår", "Spår bevisar väg.", "brave_activity:first"),
        _n(s, 3, "fossil_1", "build", "Fossil A", "Forntid som stolthet.", "expedition:1:complete"),
        _n(s, 4, "expedition_2", "feature", "Expedition 2: bro", "Över vattnet — hanterbart.", "brave_streak:week"),
        _n(s, 5, "nest", "room", "Nest", "Något växer.", "expedition:2:complete"),
        _n(s, 6, "egg_crack", "animation", "Ägg spricka", "Förväntan utan skräck.", "milestone:branch"),
        _n(s, 7, "hatchling", "animal", "Mini-Dino", "Mod i liten form.", "nest:complete"),
        _n(s, 8, "fossil_museum", "room", "Fossil-museum", "Minnen av mod.", "expeditions:3:complete"),
        _n(s, 9, "cave_secret", "feature", "Grotta hemlighet", "Belöning för läkarbesök-aktivitet.", "activity_template:doctor_visit + explore"),
        _n(s, 10, "valley_bloom", "animation", "Valley bloom", "Awe utan rädsla.", "milestone:legacy"),
        _n(s, 11, "ranger_npc", "npc", "Fossil-Farbror", "Vittne, inte domare.", "expedition:2:mid"),
    ]
    return WorldProgression(
        slug=s,
        name_sv="Dinosauriedalen",
        progression_model="Expeditioner → fossil → museum — noder läggs till per expedition i data.",
        phases=["Dimma", "Expeditioner", "Nest", "Museum", "Bloom"],
        nodes=nodes,
    )


def dockhuset() -> WorldProgression:
    s = "dollhouse"
    rooms = [
        ("bedroom", "Sovrum", ["Säng", "Garderob", "Nattlampa"]),
        ("kitchen", "Kök", ["Mini-spis", "Te-set", "Bord"]),
        ("playroom", "Lekrum", ["Klossar", "Mjukis hörna"]),
        ("bath", "Badrum", ["Badkar mini", "Handduk"]),
        ("attic", "Vind", ["Attic key", "Daisy docka"]),
        ("garden", "Trädgård mini", ["Bänk", "Lampa"]),
    ]
    nodes: list[ProgressionNode] = []
    order = 1
    for rid, rname, furniture in rooms:
        nodes.append(_n(s, order, f"room_{rid}", "room", f"Rum: {rname}", "Ordning i egen skala.", f"tidy_activity:linked:{rid}", f"progression.dollhouse.rooms.{rid}"))
        order += 1
        for i, furn in enumerate(furniture, 1):
            nodes.append(_n(s, order, f"{rid}_f{i}", "build", furn, "Plats för allt.", f"room:{rid}:furniture:{i}", f"progression.dollhouse.rooms.{rid}.f{i}"))
            order += 1
    nodes.append(_n(s, order, "harmoni_glow", "animation", "Harmoni-glow", "Balans känns bra.", "all_rooms:furnished_min", "progression.dollhouse.harmony"))
    nodes.append(_n(s, order + 1, "wallpaper_swap", "feature", "Wallpaper val", "Autonomi kosmetisk.", "milestone:bloom", "progression.dollhouse.wallpaper"))
    return WorldProgression(
        slug=s,
        name_sv="Dockhuset",
        progression_model="Rum → möbler → dekoration — noder per rum definieras i pack, expanderbar.",
        phases=["Sovrum", "Kök", "Lekrum", "Badrum", "Vind", "Trädgård"],
        nodes=nodes,
    )


def fiskebryggan() -> WorldProgression:
    s = "fishing_pier"
    nodes = [
        _n(s, 1, "plank_start", "bridge", "Första plankor", "Början av väntan.", "world_unlock:fishing_pier"),
        _n(s, 2, "railing", "build", "Räcke", "Trygghet vid vatten.", "patience_activity:first"),
        _n(s, 3, "bench", "build", "Bänk", "Sitta får ta tid.", "plank:stage:2"),
        _n(s, 4, "freja_npc", "npc", "Fiskar-Freja", "Tyst sällskap.", "bench:placed"),
        _n(s, 5, "pier_long", "bridge", "Lång brygga", "Horisont expanderar.", "patience_streak:week"),
        _n(s, 6, "boat_decor", "boat", "Båt vid brygga", "Fantasi utan sim.", "milestone:branch"),
        _n(s, 7, "gear_box", "build", "Utrustning låda", "Redskap för lugn.", "boat:placed"),
        _n(s, 8, "telescope", "build", "Teleskop", "Se längre — utan brådska.", "pier:long:complete"),
        _n(s, 9, "fish_gallery", "feature", "Fiskgalleri", "Minnen av tålamod.", "catches:verified:5"),
        _n(s, 10, "aquarium", "room", "Akvarium hörn", "Liv under ytan lugn.", "gallery:half"),
        _n(s, 11, "sunset_anim", "animation", "Solnedgång", "Kvällsro.", "evening_visit:count"),
        _n(s, 12, "pier_complete", "feature", "Brygga komplett", "Tålamod som arv.", "milestone:legacy"),
    ]
    return WorldProgression(
        slug=s,
        name_sv="Fiskebryggan",
        progression_model="Brygga → båt → utrustning → akvarium — linjär med sidogrenar i data.",
        phases=["Plankor", "Brygga", "Båt & utrustning", "Akvarium", "Arv"],
        nodes=nodes,
    )


def lashornan() -> WorldProgression:
    s = "reading_nook"
    nodes = [
        _n(s, 1, "floor_cushion", "build", "Golv kudde", "Stillhet börjar.", "world_unlock:reading_nook"),
        _n(s, 2, "shelf_low", "build", "Låg hylla", "Berättelser samlas.", "evening_activity:first"),
        _n(s, 3, "lamp", "build", "Läslampa", "Egen pool av ljus.", "shelf:books:3"),
        _n(s, 4, "story_1", "feature", "Berättelse 1 (3 panel)", "Saga förtjänt.", "evening_streak:week"),
        _n(s, 5, "story_2", "feature", "Berättelse 2", "Fler världar i text.", "story:1:complete"),
        _n(s, 6, "fort_p1", "build", "Filttält del 1", "Cozy capstone börjar.", "milestone:root"),
        _n(s, 7, "fort_p2", "build", "Filttält del 2", "Skydd mot kvällsbrus.", "fort:1:placed"),
        _n(s, 8, "fort_p3", "build", "Filttält komplett", "Eget fort.", "fort:2:placed"),
        _n(s, 9, "owl_npc", "npc", "Bok-Owl", "Stilla vittne.", "fort:complete"),
        _n(s, 10, "story_worlds", "feature", "Berättelse-världar", "Länkar till andra världar i fiction.", "stories:2:complete"),
        _n(s, 11, "window_seat", "room", "Fönstersits", "Läsning med utsikt.", "milestone:bloom"),
        _n(s, 12, "read_aloud", "sound", "Uppläsning optional", "Röst när familj vill.", "parent_setting:read_aloud + story:unlock"),
        _n(s, 13, "nook_complete", "feature", "Läshörna komplett", "Focus pride arv.", "milestone:legacy"),
    ]
    return WorldProgression(
        slug=s,
        name_sv="Läshörnan",
        progression_model="Bokhyllor → berättelser → berättelse-världar — fler böcker = fler noder i manifest.",
        phases=["Kudde", "Hylla", "Berättelser", "Fort", "Världar"],
        nodes=nodes,
    )


def mitt_rum() -> WorldProgression:
    s = "my_room"
    nodes = [
        _n(s, 1, "rug", "build", "Personlig matta", "Det här är mitt.", "first_success:day3"),
        _n(s, 2, "bed_choice", "build", "Säng val", "Autonomi.", "milestone:sprout"),
        _n(s, 3, "trophy_shelf", "feature", "Trofehylla", "Minnen utan poäng.", "any_world:milestone:first"),
        _n(s, 4, "mini_routine_home", "build", "Morgonhuset miniatyr", "Identitet kors världar.", "world_complete:routine_home:sprout"),
        _n(s, 5, "mini_workshop", "build", "Verkstad miniatyr", "Alla världar får plats.", "world_phase:workshop:project_1"),
        _n(s, 6, "identity_wall", "room", "Identitetsvägg", "Vem jag blir.", "milestones:multi_world:3"),
        _n(s, 7, "mood_emoji", "feature", "Dagens emoji", "Privat — inte surveillance.", "feature_flag:my_room_mood"),
        _n(s, 8, "museum_export", "feature", "Museum export frame", "Dela stolthet frivilligt.", "parent_opt_in:museum"),
        _n(s, 9, "growth_chart", "feature", "Tillväxtlinje", "20-års franchise minne.", "milestone:legacy"),
        _n(s, 10, "pack_preview_teen", "feature", "Teen pack preview (låst)", "Framtiden utan reset.", "account_age:years:10 + pack:teen_tease"),
    ]
    return WorldProgression(
        slug=s,
        name_sv="Mitt Rum",
        progression_model="Identitetsankare — noder kopplade till andra världars milestones, inte egen grind.",
        phases=["Personligt", "Miniatyrer", "Identitet", "Arv", "Framtid"],
        nodes=nodes,
    )


ALL_PROGRESSIONS = [
    morgonhuset(),
    verkstaden(),
    husdjurshemmet(),
    dinosauriedalen(),
    dockhuset(),
    fiskebryggan(),
    lashornan(),
    mitt_rum(),
]
