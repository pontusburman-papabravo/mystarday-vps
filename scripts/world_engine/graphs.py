"""Graph and entity model definitions for WORLD_ENGINE v1.0."""
from __future__ import annotations

GRAPH_SPECS: dict[str, dict] = {
    "scene_graph": {
        "purpose": "Hierarchical spatial and render organization for a single diorama scene.",
        "node_types": ["root", "layer", "group", "entity", "anchor", "trigger_volume"],
        "edges": ["parent_child", "follow", "constraint"],
        "rules": [
            "Acyclic parent chain to root",
            "Entity nodes reference Component bundles",
            "Layers ordered by manifest z_index",
            "Trigger volumes never block primary tap path without alternate route",
        ],
        "operations": ["attach", "detach", "query", "traverse", "setTransform"],
    },
    "region_graph": {
        "purpose": "Connectivity between spatial regions within one world.",
        "node_types": ["region", "portal", "stream_zone"],
        "edges": ["adjacent", "portal_link", "preload_hint"],
        "rules": [
            "Portal links bidirectional unless manifest says one-way",
            "Max 2 active regions mobile default",
            "Stream zones preload adjacent bundles",
        ],
        "operations": ["enter", "exit", "preload", "getNeighbors"],
    },
    "world_graph": {
        "purpose": "Top-level world structure: regions, global systems, progression anchors.",
        "node_types": ["world_root", "region_ref", "global_system", "progression_anchor"],
        "edges": ["contains", "depends_on"],
        "rules": [
            "One world_root per loaded world",
            "Progression anchors bind to Progression Node ids",
            "Global systems: weather, season, audio bed",
        ],
        "operations": ["load", "unload", "resolve", "getProgressionAnchor"],
    },
    "interaction_graph": {
        "purpose": "Verb execution DAG: preconditions → gestures → effects → emissions.",
        "node_types": ["precondition", "gesture", "action", "effect", "emit", "branch"],
        "edges": ["then", "on_success", "on_fail", "parallel"],
        "rules": [
            "Every graph must have terminal emit or complete node",
            "No cycle without max iteration cap in manifest",
            "Failed preconditions fail soft — no blame copy",
        ],
        "operations": ["evaluate", "execute", "cancel", "resume"],
    },
    "animation_graph": {
        "purpose": "Blend tree and state machine for entity motion.",
        "node_types": ["clip", "blend1d", "blend2d", "state", "transition", "procedural"],
        "edges": ["transition_on", "blend_child"],
        "rules": [
            "Celebration clips ≤2000 ms unless pack override with ADR",
            "Reduced motion short-circuits to end state",
        ],
        "operations": ["play", "crossfade", "setParam", "stop"],
    },
    "camera_graph": {
        "purpose": "Rig blending and anchor transitions.",
        "node_types": ["rig", "anchor", "transition", "constraint"],
        "edges": ["blend_to", "follow_target"],
        "rules": ["Back always restores previous rig", "Reduced motion uses cut transitions"],
        "operations": ["setRig", "transition", "reset"],
    },
    "audio_graph": {
        "purpose": "Layered mixing: ambient, sfx, voice, music beds.",
        "node_types": ["bus", "event", "layer", "attenuation"],
        "edges": ["routes_to", "ducked_by"],
        "rules": ["Silent default on launch", "User mute persists"],
        "operations": ["play", "stop", "setVolume", "preload"],
    },
    "lighting_graph": {
        "purpose": "Preset stack and blends for mood.",
        "node_types": ["preset", "blend", "probe", "phase_driver"],
        "edges": ["overrides", "blends_from"],
        "rules": ["Readable contrast on interactables", "Phase driven by season/time manifest"],
        "operations": ["apply", "blend", "setPhase"],
    },
    "weather_graph": {
        "purpose": "Weather state machine and overlay drivers.",
        "node_types": ["state", "transition", "overlay", "wind_driver"],
        "edges": ["transition_on", "drives"],
        "rules": ["Opacity ≤55%", "One active weather state"],
        "operations": ["setState", "transition", "getWind"],
    },
    "particle_graph": {
        "purpose": "Emitter modules and burst definitions.",
        "node_types": ["emitter", "burst", "force", "color_over_life"],
        "edges": ["module_chain"],
        "rules": ["Pool all emitters", "Cap concurrent systems per scene manifest"],
        "operations": ["emit", "stop", "setEnabled"],
    },
    "save_graph": {
        "purpose": "Ordered persistence scopes and dependencies.",
        "node_types": ["scope", "serializer", "checkpoint"],
        "edges": ["depends_on", "triggers_after"],
        "rules": ["Auto-checkpoint on completion events", "Migration chain versioned"],
        "operations": ["capture", "restore", "migrate"],
    },
    "sync_graph": {
        "purpose": "Operation ordering and conflict domains.",
        "node_types": ["domain", "operation", "merge_rule"],
        "edges": ["ordered_before", "conflicts_with"],
        "rules": ["Server wins progression domain", "Merge log for audit", "Cosmetic may merge last-write-wins future"],
        "operations": ["enqueue", "flush", "resolve"],
    },
}

ENTITY_MODEL = {
    "entity": {
        "description": "Addressable object in Scene Graph with unique entity_id within scene.",
        "required_fields": ["entity_id", "archetype", "transform"],
        "optional_fields": ["tags", "components", "progression_visibility", "lod_group"],
    },
    "component": {
        "description": "Data + behaviour attachment. Composition over inheritance.",
        "types": [
            "transform", "sprite", "mesh", "collider", "interactable",
            "animator", "npc", "behaviour", "progression_gate", "audio_source",
            "particle_anchor", "light_probe",
        ],
        "rules": [
            "Components defined in manifest — not hardcoded class hierarchy",
            "interactable requires collider or touch_bounds",
            "progression_gate references node_id not numeric threshold",
        ],
    },
    "event_bus": {
        "description": "Broadcast pub/sub for engine-wide age-agnostic events (GDB Appendix B extended).",
        "delivery": "async queued same tick",
        "naming": "domain.action (e.g. progression.node_unlocked)",
        "core_events": [
            "onActivityComplete",
            "onStarGranted",
            "onProgressionNodeUnlocked",
            "onWorldEnter",
            "onWorldExit",
            "onMilestone",
            "onNpcInteraction",
            "interaction.completed",
            "save.captured",
            "sync.completed",
        ],
        "rules": [
            "Experience Packs subscribe — engine emits",
            "No PII in event payloads crossing analytics boundary",
            "Handlers must not block tick >2 ms",
        ],
    },
    "message_bus": {
        "description": "Point-to-point commands between runtimes (not broadcast).",
        "delivery": "sync or deferred queue",
        "examples": [
            "camera.transitionTo → Camera Runtime",
            "animation.play → Animation Runtime",
            "asset.preload → Asset Runtime",
        ],
        "rules": ["Typed envelopes with request_id", "Timeouts on blocking requests"],
    },
    "state_machine_system": {
        "description": "Finite state machines for entities, UI flow, world phases.",
        "features": ["entry/exit actions", "event transitions", "guard conditions from manifest"],
        "data": "StateMachineManifest bound to entity or runtime",
    },
    "behaviour_tree_system": {
        "description": "Tick-based behaviour trees for NPC and ambient life.",
        "node_types": ["sequence", "selector", "parallel", "decorator", "leaf_action"],
        "blackboard": "Shared key-value per entity instance",
        "budget": "Max nodes ticked per frame configurable",
    },
    "input_system": {
        "description": "Normalizes platform input to engine InputEvents.",
        "sources": ["touch", "pointer", "keyboard dev-only", "gamepad future"],
        "outputs": ["InputEvent stream to Gesture System"],
    },
    "gesture_system": {
        "description": "Recognizes gestures from pointer streams.",
        "gestures": [
            "tap", "double_tap", "hold", "drag", "drop", "swipe", "flick",
            "pinch", "rotate", "draw", "multi_touch future",
        ],
        "outputs": ["GestureEvent with verb hints"],
    },
    "touch_model": {
        "description": "Hit testing and touch target policy.",
        "rules": [
            "48 px minimum touch target (GDB Appendix H)",
            "Primary target per scene — manifest flagged",
            "Z-order hit test with transparent pass-through zones",
            "No precision timing required for child path",
        ],
    },
}
