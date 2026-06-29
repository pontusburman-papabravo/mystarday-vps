"""World Definition Language (DSL) specification for WORLD_ENGINE v1.0."""
from __future__ import annotations

WORLD_DSL = {
    "formats": ["world.yaml", "world.json"],
    "rule": "AI agent or designer authors a complete world without changing engine code",
    "parse_pipeline": [
        "1. Load world.yaml / world.json",
        "2. Validate against world-manifest.schema.json",
        "3. Resolve refs: progression, regions, scenes, assets, npc, interactions",
        "4. Merge into World Graph + pack binding",
        "5. Hot-reload in dev via Developer Runtime",
    ],
    "root_fields": [
        ("world_id", "string", "required", "Unique stable id e.g. world_workshop_v1"),
        ("slug", "string", "required", "Stable slug e.g. workshop — matches WDB/GDB"),
        ("version", "semver", "required", "Manifest version for migration"),
        ("emotion_job", "string", "required", "One-line emotional contract from PCB/WDB"),
        ("differentiation", "string", "required", "Never feels like X — WDB matrix"),
        ("pack_id", "string", "required", "Experience Pack e.g. child_se"),
        ("primary_interaction", "string", "required", "Default verb for first visit"),
        ("regions", "array", "required", "Region refs with scene lists"),
        ("progression_ref", "string", "required", "Path to progression map JSON"),
        ("global_systems", "object", "optional", "weather, season, lighting, audio refs"),
        ("asset_bundle", "string", "optional", "Default asset bundle id"),
        ("scenes", "object", "optional inline", "Inline scene defs keyed by scene_id"),
        ("npcs", "array", "optional inline", "Inline NPC manifests"),
        ("interactions", "array", "optional inline", "Inline interaction graphs"),
        ("metadata", "object", "optional", "Studio notes — not loaded in child runtime"),
    ],
    "example_yaml": """\
world_id: world_workshop_v1
slug: workshop
version: 1.0.0
emotion_job: Maker pride — synligt framsteg utan siffror
differentiation: Pegboard och projekt — ALDRIG djur-sovplats eller mini-rum
pack_id: child_se
primary_interaction: build

regions:
  - region_id: bench_floor
    name_sv: Verkstads-golvet
    scenes: [workshop_main]
    streaming: false

progression_ref: ./progression/workshop.json

global_systems:
  weather_ref: ./systems/weather_indoor.json
  season_ref: ./systems/season_neutral.json
  lighting_ref: ./systems/lighting_workshop_warm.json
  audio_bed_ref: ./audio/ambient_workshop.json

asset_bundle: bundle_workshop_v1

scenes:
  workshop_main:
    scene_id: workshop_main
    region_id: bench_floor
    focal_anchor: bench_center
    primary_interaction_target: pegboard_slot_1
    camera_default_rig: rig_workshop_wide
    layers:
      - layer_id: back_wall
        z_index: 0
      - layer_id: bench
        z_index: 10
    entities:
      - entity_id: pegboard_slot_1
        archetype: interactable_slot
        layer_id: bench
        transform: { x: 120, y: 80 }
        tags: [build_target, primary]
        progression_gate: workshop_proj_birdhouse_c1

npcs:
  - $ref: ./npcs/workshop_mentor.json

interactions:
  - $ref: ./interactions/build_component.json
""",
    "ref_resolution": {
        "$ref": "JSON Schema style relative file refs",
        "progression_ref": "Must validate against progression.schema.json",
        "scene inline or external": "scene.schema.json each",
    },
    "constitution_rules": [
        "No fixed node count in world root — progression map defines nodes",
        "No star thresholds in world.yaml — use unlock_signal in progression",
        "No age_band field in world root — pack_id carries audience",
    ],
}
