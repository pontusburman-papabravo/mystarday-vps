"""Interaction, NPC, Living World, Save, Performance, AI dev specs."""
from __future__ import annotations

INTERACTION_VERBS = [
    ("tap", "Single touch release on target", "gesture:tap"),
    ("double_tap", "Two taps within window", "gesture:double_tap"),
    ("hold", "Press and hold threshold", "gesture:hold"),
    ("drag", "Move while pressed", "gesture:drag"),
    ("drop", "Release drag on valid target", "gesture:drop"),
    ("swipe", "Directional swipe", "gesture:swipe"),
    ("flick", "High velocity swipe", "gesture:flick"),
    ("pinch", "Two-finger scale", "gesture:pinch"),
    ("rotate", "Two-finger rotation", "gesture:rotate"),
    ("draw", "Freeform stroke path", "gesture:draw"),
    ("paint", "Continuous stroke fill", "verb:paint"),
    ("build", "Place build node component", "verb:build"),
    ("dig", "Remove/reveal terrain layer", "verb:dig"),
    ("plant", "Place growable entity", "verb:plant"),
    ("feed", "Transfer item to NPC/animal", "verb:feed"),
    ("wash", "Clean interaction sequence", "verb:wash"),
    ("brush", "Groom/clean stroke", "verb:brush"),
    ("throw", "Impulse projectile", "verb:throw"),
    ("catch", "Intercept projectile", "verb:catch"),
    ("follow", "Camera or NPC follow mode", "verb:follow"),
    ("talk", "Open dialog tree", "verb:talk"),
    ("inspect", "Show inspect panel/lore", "verb:inspect"),
    ("listen", "Play audio lore", "verb:listen"),
    ("open", "Open container/door", "verb:open"),
    ("close", "Close container/door", "verb:close"),
    ("carry", "Pick up and hold entity", "verb:carry"),
    ("combine", "Merge two inventory items", "verb:combine"),
    ("sort", "Order items in slots", "verb:sort"),
    ("stack", "Stack physics objects", "verb:stack"),
    ("balance", "Balance minigame", "verb:balance"),
    ("push", "Apply force away", "verb:push"),
    ("pull", "Apply force toward", "verb:pull"),
    ("celebrate", "Trigger celebration graph", "verb:celebrate"),
]

INTERACTION_SYSTEM = {
    "architecture": "Gesture System → Interaction Runtime → Interaction Graph → Effects (animation, progression, audio, npc)",
    "registration": "Verbs declared in interaction manifest; engine maps gesture+target tags to graph entry",
    "extension": "New verbs append to registry via manifest — no engine rewrite",
    "future_gestures": "manifest gesture_type enum is open — unknown types ignored gracefully in release",
}

NPC_SYSTEM = {
    "memory": {
        "description": "Short-term session memory + long-term world memory (server persisted).",
        "fields": ["last_seen_at", "interactions_count", "topics_discussed", "gifts_given"],
        "rules": ["Never guilt on absence", "Memory decay configurable per NPC manifest"],
    },
    "mood": {
        "description": "Emotional valence axis — calm default.",
        "range": "manifest-defined labels (not numeric exposed to child)",
        "drivers": ["weather", "season", "progression phase", "recent interaction"],
    },
    "schedule": {
        "description": "Time-of-day and phase-based location/activity table.",
        "fields": ["phase_id", "anchor_id", "activity", "priority"],
    },
    "personality": {
        "description": "Trait tags influencing dialog selection and reactions.",
        "fields": ["traits", "voice_style", "reaction_weights"],
    },
    "relationships": {
        "description": "Graph between NPCs and child avatar (relatedness, not romance for child pack).",
        "fields": ["target_id", "relationship_type", "strength"],
    },
    "knowledge": {
        "description": "Facts unlocked by progression nodes — gates dialog branches.",
        "fields": ["fact_id", "unlocked_by_node", "dialog_refs"],
    },
    "dialog": {
        "description": "Tree or graph of lines with conditions from knowledge/mood/progression.",
        "rules": ["Skippable", "One tap advance default", "No manipulation copy"],
    },
    "animation": {
        "description": "NPC Animation states bound to mood and schedule.",
        "states": ["idle", "walk", "react", "talk", "work", "sleep"],
    },
    "idle_behaviour": {
        "description": "Behaviour tree when not engaged — blink, breathe, micro-actions.",
        "rules": ["Never frozen >5 s (WDB)", "Reduced motion simplifies loops"],
    },
    "reactions": {
        "description": "Stimulus → reaction mapping (progression unlock, weather, player verb).",
        "fields": ["stimulus", "reaction_clip", "dialog_optional", "cooldown_ms"],
    },
}

LIVING_WORLD = {
    "idle_simulation": "Ambient motion layers run on Scene Runtime tick — no input required",
    "background_simulation": "Low-cost updates for off-screen regions — paused or simplified",
    "object_simulation": "Tagged props sway, steam, flicker per behaviour manifest",
    "weather_simulation": "Weather Runtime drives overlays and wind on tagged entities",
    "season_simulation": "Season Runtime swaps props and palette phases",
    "ambient_simulation": "Audio bed + particle dust + light flicker within budget",
    "micro_events": {
        "description": "Small ambient surprises — Type A per GDB.",
        "rules": ["Max 1 major micro-event per session (WDB)", "Never login RNG", "Never block routine"],
    },
    "world_memory": {
        "description": "Persistent cosmetic state — placed objects, unlocked visuals.",
        "persistence": "Server authoritative via Save/Sync",
        "rules": ["Welcome back after miss — dim ≤15%", "No reset trauma"],
    },
}

SAVE_SYSTEM = {
    "offline_first": "Local snapshot enables world view and queued routine ops without network",
    "conflict_resolution": "Server wins for progression/stars; merge log records client attempts",
    "server_authority": "Stars and progression node unlocks only after verify/sync",
    "delta_sync": "Operations sent as ordered deltas with timestamps",
    "compression": "Snapshot blobs compressed — schema version in header",
    "migration": "Semantic version on save format — up migrators, down rollback in dev only",
    "rollback": "Dev-only snapshot restore; live uses forward migration only",
    "versioning": "save_version semver in manifest — engine rejects unknown major without migrator",
}

PERFORMANCE = {
    "targets": {
        "fps": "60 FPS target — 30 FPS minimum acceptable on low tier with degradation",
        "boot": "≤1500 ms to first interactive on mid iPhone",
        "memory": "World memory cap from manifest — default conservative mobile",
        "battery": "Background sim paused when app backgrounded",
    },
    "platforms": ["iPhone", "Android", "Capacitor WebView", "Canvas/WebGL renderer abstraction"],
    "strategies": [
        "Lazy Loading", "Streaming", "Pooling", "LOD", "Asset Caching",
        "Tier-based quality", "Thermal throttling hook",
    ],
}

AI_DEVELOPMENT = {
    "create_world": [
        "1. Copy World Template from WDB §4",
        "2. Author world.yaml with progression map — variable node count",
        "3. Validate against world.schema.json + progression-node.schema.json",
        "4. Run dev.validateManifest in CI",
        "5. Never add magic numbers — use unlock_signal + pack_config_key",
    ],
    "create_npc": [
        "1. Define NPCManifest with personality, schedule, dialog refs",
        "2. Bind reactions to progression node ids not star counts",
        "3. Validate against npc.schema.json",
        "4. PCB NPC emotional contract review",
    ],
    "create_animation": [
        "1. Declare clips in animation manifest with duration_ms",
        "2. Celebration ≤2000 ms — Art Bible",
        "3. Register in Animation Graph — reduced motion alternate required",
    ],
    "create_assets": [
        "1. Asset refs in asset manifest with LOD tiers",
        "2. Follow Art Bible palette per world",
        "3. Bundle for lazy load — no monolithic world blob",
    ],
    "create_progression": [
        "1. Nodes with emotional_beat + unlock_signal only",
        "2. Node count from experience design — not quota",
        "3. ADR if >20% node change in live world",
    ],
    "create_interactions": [
        "1. Pick verb from registry — extend enum in manifest if new",
        "2. Author Interaction Graph with terminal emit",
        "3. Test no soft-lock with Testing Runtime scenario",
    ],
    "forbidden": [
        "Age if-statements in engine-facing data",
        "Hardcoded thresholds",
        "Fiction that violates G-rules or Constitution",
        "Implementation code in place of manifest when manifest suffices",
    ],
}
