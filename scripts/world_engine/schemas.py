"""JSON Schema definitions for WORLD_ENGINE v1.0 (draft-07)."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

SCHEMA_DIR = Path("/workspace/.ai/product/world-engine/schemas")

# Shared defs
PROGRESSION_NODE = {
    "type": "object",
    "required": ["node_id", "order", "node_type", "emotional_beat", "unlock_signal"],
    "properties": {
        "node_id": {"type": "string", "pattern": "^[a-z0-9_]+$"},
        "order": {"type": "integer", "minimum": 0},
        "node_type": {
            "type": "string",
            "enum": [
                "build", "room", "npc", "animal", "animation", "feature",
                "sound", "bridge", "boat", "tree", "book", "decoration",
            ],
        },
        "name_sv": {"type": "string"},
        "name_en": {"type": "string"},
        "emotional_beat": {"type": "string"},
        "unlock_signal": {"type": "string"},
        "pack_config_key": {"type": "string"},
        "scene_id": {"type": "string"},
        "entity_ref": {"type": "string"},
        "metadata": {"type": "object"},
    },
    "additionalProperties": False,
}

TRANSFORM = {
    "type": "object",
    "required": ["x", "y"],
    "properties": {
        "x": {"type": "number"},
        "y": {"type": "number"},
        "z": {"type": "number", "default": 0},
        "rotation": {"type": "number", "default": 0},
        "scale": {"type": "number", "default": 1, "minimum": 0.01},
    },
}

SCHEMAS: dict[str, dict[str, Any]] = {
    "progression-node": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "urn:stjarndag:world-engine:v1:progression-node",
        "title": "ProgressionNode",
        **PROGRESSION_NODE,
    },
    "progression": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "urn:stjarndag:world-engine:v1:progression",
        "title": "ProgressionMap",
        "type": "object",
        "required": ["world_slug", "progression_model", "nodes"],
        "properties": {
            "world_slug": {"type": "string"},
            "progression_model": {"type": "string"},
            "phases": {"type": "array", "items": {"type": "string"}},
            "nodes": {"type": "array", "items": PROGRESSION_NODE, "minItems": 1},
        },
        "additionalProperties": False,
    },
    "world-manifest": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "urn:stjarndag:world-engine:v1:world-manifest",
        "title": "WorldManifest",
        "type": "object",
        "required": ["world_id", "slug", "version", "emotion_job", "regions", "progression_ref"],
        "properties": {
            "world_id": {"type": "string"},
            "slug": {"type": "string", "pattern": "^[a-z0-9_]+$"},
            "version": {"type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$"},
            "emotion_job": {"type": "string"},
            "differentiation": {"type": "string"},
            "pack_id": {"type": "string"},
            "primary_interaction": {"type": "string"},
            "regions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "required": ["region_id", "scenes"],
                    "properties": {
                        "region_id": {"type": "string"},
                        "name_sv": {"type": "string"},
                        "scenes": {"type": "array", "items": {"type": "string"}, "minItems": 1},
                        "streaming": {"type": "boolean", "default": True},
                    },
                },
                "minItems": 1,
            },
            "progression_ref": {"type": "string"},
            "global_systems": {
                "type": "object",
                "properties": {
                    "weather_ref": {"type": "string"},
                    "season_ref": {"type": "string"},
                    "lighting_ref": {"type": "string"},
                    "audio_bed_ref": {"type": "string"},
                },
            },
            "asset_bundle": {"type": "string"},
            "metadata": {"type": "object"},
        },
        "additionalProperties": False,
    },
    "world": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "urn:stjarndag:world-engine:v1:world",
        "title": "World",
        "description": "Alias root — World DSL document (world.json / world.yaml parsed to JSON)",
        "allOf": [{"$ref": "world-manifest.json"}],
    },
    "region": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "urn:stjarndag:world-engine:v1:region",
        "title": "Region",
        "type": "object",
        "required": ["region_id", "world_slug", "scenes"],
        "properties": {
            "region_id": {"type": "string"},
            "world_slug": {"type": "string"},
            "name_sv": {"type": "string"},
            "bounds": {"type": "object"},
            "scenes": {"type": "array", "items": {"type": "string"}},
            "portals": {
                "type": "array",
                "items": {
                    "type": "object",
                    "required": ["portal_id", "target_region_id"],
                    "properties": {
                        "portal_id": {"type": "string"},
                        "target_region_id": {"type": "string"},
                        "target_scene_id": {"type": "string"},
                    },
                },
            },
            "weather_override": {"type": "string"},
            "lighting_preset": {"type": "string"},
        },
    },
    "scene": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "urn:stjarndag:world-engine:v1:scene",
        "title": "Scene",
        "type": "object",
        "required": ["scene_id", "region_id", "layers", "entities"],
        "properties": {
            "scene_id": {"type": "string"},
            "region_id": {"type": "string"},
            "focal_anchor": {"type": "string"},
            "primary_interaction_target": {"type": "string"},
            "layers": {
                "type": "array",
                "items": {
                    "type": "object",
                    "required": ["layer_id", "z_index"],
                    "properties": {
                        "layer_id": {"type": "string"},
                        "z_index": {"type": "integer"},
                        "parallax": {"type": "number", "default": 0},
                    },
                },
            },
            "entities": {"type": "array", "items": {"$ref": "#/definitions/entity"}},
            "ambient_behaviours": {"type": "array", "items": {"type": "string"}},
            "camera_default_rig": {"type": "string"},
        },
        "definitions": {
            "entity": {
                "type": "object",
                "required": ["entity_id", "archetype", "transform"],
                "properties": {
                    "entity_id": {"type": "string"},
                    "archetype": {"type": "string"},
                    "transform": TRANSFORM,
                    "layer_id": {"type": "string"},
                    "tags": {"type": "array", "items": {"type": "string"}},
                    "components": {"type": "array", "items": {"type": "object"}},
                    "progression_gate": {"type": "string"},
                },
            },
        },
    },
    "npc": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "urn:stjarndag:world-engine:v1:npc",
        "title": "NPC",
        "type": "object",
        "required": ["npc_id", "display_name_sv", "personality", "schedule"],
        "properties": {
            "npc_id": {"type": "string"},
            "display_name_sv": {"type": "string"},
            "personality": {
                "type": "object",
                "required": ["traits"],
                "properties": {"traits": {"type": "array", "items": {"type": "string"}}},
            },
            "schedule": {
                "type": "array",
                "items": {
                    "type": "object",
                    "required": ["phase_id", "anchor_id"],
                    "properties": {
                        "phase_id": {"type": "string"},
                        "anchor_id": {"type": "string"},
                        "activity": {"type": "string"},
                    },
                },
            },
            "mood_default": {"type": "string", "default": "calm"},
            "dialog_trees": {"type": "array", "items": {"type": "string"}},
            "reactions": {"type": "array", "items": {"type": "object"}},
            "memory_policy": {"type": "string", "enum": ["session", "persistent", "none"]},
        },
    },
    "behaviour": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "urn:stjarndag:world-engine:v1:behaviour",
        "title": "BehaviourTree",
        "type": "object",
        "required": ["tree_id", "root"],
        "properties": {
            "tree_id": {"type": "string"},
            "root": {"type": "object"},
            "blackboard_schema": {"type": "object"},
            "tick_budget_nodes": {"type": "integer", "minimum": 1},
        },
    },
    "interaction": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "urn:stjarndag:world-engine:v1:interaction",
        "title": "InteractionGraph",
        "type": "object",
        "required": ["interaction_id", "verb", "graph"],
        "properties": {
            "interaction_id": {"type": "string"},
            "verb": {"type": "string"},
            "target_tags": {"type": "array", "items": {"type": "string"}},
            "gestures": {"type": "array", "items": {"type": "string"}},
            "preconditions": {"type": "array", "items": {"type": "object"}},
            "graph": {"type": "object"},
            "effects": {"type": "array", "items": {"type": "object"}},
            "emit_on_complete": {"type": "string"},
        },
    },
    "quest": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "urn:stjarndag:world-engine:v1:quest",
        "title": "Quest",
        "type": "object",
        "required": ["quest_id", "world_slug", "objective_signal"],
        "properties": {
            "quest_id": {"type": "string"},
            "world_slug": {"type": "string"},
            "title_sv": {"type": "string"},
            "objective_signal": {"type": "string"},
            "optional": {"type": "boolean", "default": True},
            "rewards": {"type": "array", "items": {"type": "object"}},
        },
    },
    "mission": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "urn:stjarndag:world-engine:v1:mission",
        "title": "Mission",
        "type": "object",
        "required": ["mission_id", "routine_hook"],
        "properties": {
            "mission_id": {"type": "string"},
            "routine_hook": {"type": "string"},
            "world_slug": {"type": "string"},
            "copy_sv": {"type": "string"},
            "completion_signal": {"type": "string"},
        },
    },
    "collectible": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "urn:stjarndag:world-engine:v1:collectible",
        "title": "Collectible",
        "type": "object",
        "required": ["collectible_id", "world_slug", "earn_signal"],
        "properties": {
            "collectible_id": {"type": "string"},
            "world_slug": {"type": "string"},
            "type": {"type": "string", "enum": ["ambient", "earned", "secret"]},
            "earn_signal": {"type": "string"},
            "entity_ref": {"type": "string"},
        },
    },
    "animation": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "urn:stjarndag:world-engine:v1:animation",
        "title": "AnimationClip",
        "type": "object",
        "required": ["clip_id", "duration_ms"],
        "properties": {
            "clip_id": {"type": "string"},
            "duration_ms": {"type": "integer", "maximum": 2000},
            "loop": {"type": "boolean", "default": False},
            "reduced_motion_variant": {"type": "string"},
            "skippable": {"type": "boolean", "default": True},
            "asset_ref": {"type": "string"},
        },
    },
    "particle": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "urn:stjarndag:world-engine:v1:particle",
        "title": "ParticleSystem",
        "type": "object",
        "required": ["system_id"],
        "properties": {
            "system_id": {"type": "string"},
            "max_particles": {"type": "integer"},
            "duration_ms": {"type": "integer"},
            "reduced_motion_mode": {"type": "string", "enum": ["off", "static", "full"]},
        },
    },
    "lighting": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "urn:stjarndag:world-engine:v1:lighting",
        "title": "LightingPreset",
        "type": "object",
        "required": ["preset_id"],
        "properties": {
            "preset_id": {"type": "string"},
            "ambient_color": {"type": "string"},
            "key_light": {"type": "object"},
            "phase_bindings": {"type": "array", "items": {"type": "string"}},
        },
    },
    "weather": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "urn:stjarndag:world-engine:v1:weather",
        "title": "WeatherState",
        "type": "object",
        "required": ["state_id"],
        "properties": {
            "state_id": {"type": "string"},
            "overlay_opacity": {"type": "number", "maximum": 0.55},
            "wind_strength": {"type": "number"},
            "particle_ref": {"type": "string"},
            "audio_ref": {"type": "string"},
        },
    },
    "season": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "urn:stjarndag:world-engine:v1:season",
        "title": "SeasonPhase",
        "type": "object",
        "required": ["phase_id"],
        "properties": {
            "phase_id": {"type": "string"},
            "prop_swaps": {
                "type": "array",
                "maxItems": 2,
                "items": {"type": "object", "required": ["from_entity", "to_entity"]},
            },
            "palette_shift": {"type": "object"},
        },
    },
    "camera": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "urn:stjarndag:world-engine:v1:camera",
        "title": "CameraRig",
        "type": "object",
        "required": ["rig_id"],
        "properties": {
            "rig_id": {"type": "string"},
            "anchors": {"type": "array", "items": {"type": "object"}},
            "default_transition_ms": {"type": "integer", "maximum": 400},
            "reduced_motion_transition": {"type": "string", "enum": ["cut", "instant"]},
        },
    },
    "audio": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "urn:stjarndag:world-engine:v1:audio",
        "title": "AudioEvent",
        "type": "object",
        "required": ["event_id"],
        "properties": {
            "event_id": {"type": "string"},
            "asset_ref": {"type": "string"},
            "bus": {"type": "string", "enum": ["ambient", "sfx", "voice", "music"]},
            "spatial": {"type": "boolean", "default": False},
            "autoplay_on_launch": {"type": "boolean", "const": False},
        },
    },
    "asset": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "urn:stjarndag:world-engine:v1:asset",
        "title": "AssetRef",
        "type": "object",
        "required": ["asset_id", "uri", "kind"],
        "properties": {
            "asset_id": {"type": "string"},
            "uri": {"type": "string"},
            "kind": {"type": "string", "enum": ["sprite", "atlas", "audio", "data", "font"]},
            "lod_tiers": {"type": "array", "items": {"type": "string"}},
            "bundle_id": {"type": "string"},
        },
    },
    "experience-pack": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "urn:stjarndag:world-engine:v1:experience-pack",
        "title": "ExperiencePack",
        "type": "object",
        "required": ["pack_id", "audience_band", "locale", "worlds"],
        "properties": {
            "pack_id": {"type": "string"},
            "audience_band": {
                "type": "string",
                "enum": ["child", "teen", "young_adult", "adult", "support"],
            },
            "locale": {"type": "string"},
            "reading_level": {"type": "string"},
            "fiction_manifest": {"type": "string"},
            "ui_skin": {"type": "string"},
            "pacing": {"type": "object"},
            "feature_flags": {"type": "object"},
            "worlds": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Refs to world manifest files",
            },
            "copy_tables": {"type": "object"},
        },
        "additionalProperties": False,
    },
}


def write_schemas(out_dir: Path | None = None) -> list[str]:
    out = out_dir or SCHEMA_DIR
    out.mkdir(parents=True, exist_ok=True)
    written: list[str] = []
    for name, schema in SCHEMAS.items():
        path = out / f"{name}.schema.json"
        path.write_text(json.dumps(schema, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        written.append(str(path.relative_to(Path("/workspace"))))
    return written
