/**
 * ambient-objects-pack.js — generated; do not edit by hand.
 * Regenerate: npm run generate:ambient-objects
 */
(function () {
  'use strict';

  const PACK = {
  "version": "1.0.0",
  "scenes": {
    "routine_home": {
      "objects": [
        {
          "object_id": "door",
          "prop_id": "door",
          "hit_area": {
            "x": 0.62,
            "y": 0.36,
            "w": 0.28,
            "h": 0.54
          },
          "aria_label_sv": "Gå ut till trädgården",
          "hint_sv": "Gå ut till trädgården",
          "idle": "pulse",
          "tap_animation": "pulse",
          "action": "navigate_garden",
          "cooldown_ms": 700,
          "haptic": "light",
          "show_when": {
            "gate_to_garden": true
          },
          "legacy_classes": [
            "mh-hotspot",
            "mh-hotspot--door",
            "mh-hotspot--nav"
          ]
        },
        {
          "object_id": "treasure_chest",
          "hit_area": {
            "x": 0.06,
            "y": 0.58,
            "w": 0.22,
            "h": 0.28
          },
          "aria_label_sv": "Skattkistan",
          "idle": "sparkle",
          "tap_animation": "sparkle",
          "particle": "sparkle",
          "particle_glyph": "✨",
          "feedback_sv": "Dina stjärnor väntar!",
          "action": "open_skattkammaren",
          "cooldown_ms": 900,
          "haptic": "medium"
        },
        {
          "object_id": "window",
          "hit_area": {
            "x": 0.14,
            "y": 0.1,
            "w": 0.34,
            "h": 0.22
          },
          "aria_label_sv": "Fönstret",
          "idle": "pulse",
          "tap_animation": "pulse",
          "particle": "appear",
          "feedback_sv": "Morgonsolen lyser in.",
          "action": "ambient",
          "cooldown_ms": 1200,
          "haptic": "light"
        },
        {
          "object_id": "curtain",
          "hit_area": {
            "x": 0.46,
            "y": 0.16,
            "w": 0.2,
            "h": 0.34
          },
          "aria_label_sv": "Gardinen",
          "idle": "flutter",
          "tap_animation": "flutter",
          "feedback_sv": "Swoosh — den dansar lite.",
          "action": "ambient",
          "cooldown_ms": 1000,
          "haptic": "light"
        },
        {
          "object_id": "welcome_mat",
          "prop_id": "welcome_mat",
          "hit_area": {
            "x": 0.32,
            "y": 0.7,
            "w": 0.3,
            "h": 0.18
          },
          "aria_label_sv": "Välkomstmattan",
          "idle": "pulse",
          "tap_animation": "hop",
          "feedback_sv": "Välkommen hem!",
          "feedback_unlocked_sv": "Mattan minns dina steg.",
          "action": "ambient",
          "cooldown_ms": 1100,
          "haptic": "light",
          "visual_token": "welcome_mat_glow"
        },
        {
          "object_id": "first_light",
          "prop_id": "first_light",
          "hit_area": {
            "x": 0.7,
            "y": 0.12,
            "w": 0.2,
            "h": 0.26
          },
          "aria_label_sv": "Morgonljuset",
          "idle": "pulse",
          "tap_animation": "pulse",
          "particle": "pulse",
          "feedback_sv": "Ljuset vilar fortfarande.",
          "feedback_unlocked_sv": "Ett mjukt sken väcker rummet.",
          "action": "ambient",
          "cooldown_ms": 1200,
          "haptic": "light",
          "visual_token": "morning_light_warm"
        },
        {
          "object_id": "soft_toy",
          "hit_area": {
            "x": 0.52,
            "y": 0.56,
            "w": 0.16,
            "h": 0.2
          },
          "aria_label_sv": "Gosedjuret",
          "tap_animation": "wiggle",
          "feedback_sv": "Den gosiga vännen ler mot dig.",
          "action": "ambient",
          "cooldown_ms": 1000,
          "haptic": "light"
        }
      ]
    },
    "garden": {
      "objects": [
        {
          "object_id": "garden_bed",
          "hit_area": {
            "x": 0.05,
            "y": 0.6,
            "w": 0.25,
            "h": 0.25
          },
          "aria_label_sv": "Blomsterbädden",
          "action": "gameplay_bed",
          "cooldown_ms": 400,
          "haptic": "medium",
          "legacy_classes": [
            "gd-hotspot",
            "gd-hotspot--bed"
          ],
          "data_attrs": {
            "scenery": "garden_bed"
          }
        },
        {
          "object_id": "watering_can",
          "hit_area": {
            "x": 0.16,
            "y": 0.46,
            "w": 0.14,
            "h": 0.2
          },
          "aria_label_sv": "Vattenkannan",
          "idle": "sparkle",
          "tap_animation": "hop",
          "particle": "drip",
          "particle_glyph": "💧",
          "feedback_sv": "Plask — lite kallt och fräscht.",
          "action": "ambient",
          "cooldown_ms": 1100,
          "haptic": "light"
        },
        {
          "object_id": "garden_sky",
          "hit_area": {
            "x": 0.2,
            "y": 0.05,
            "w": 0.6,
            "h": 0.2
          },
          "aria_label_sv": "Himlen",
          "idle": "pulse",
          "tap_animation": "pulse",
          "scene_effect": "garden_sky",
          "particle": "drip",
          "particle_glyph": "☁️",
          "feedback_sv": "Ett litet moln droppar ner.",
          "action": "ambient",
          "cooldown_ms": 1300,
          "haptic": "light",
          "legacy_classes": [
            "gd-hotspot",
            "gd-hotspot--sky"
          ]
        },
        {
          "object_id": "garden_path",
          "hit_area": {
            "x": 0.35,
            "y": 0.55,
            "w": 0.3,
            "h": 0.35
          },
          "aria_label_sv": "Stigen",
          "idle": "sparkle",
          "tap_animation": "pulse",
          "scene_effect": "garden_path",
          "feedback_sv": "Stenarna glittrar under fötterna.",
          "action": "scenery_path",
          "cooldown_ms": 900,
          "haptic": "light",
          "legacy_classes": [
            "gd-hotspot",
            "gd-hotspot--path"
          ]
        },
        {
          "object_id": "bird",
          "hit_area": {
            "x": 0.62,
            "y": 0.22,
            "w": 0.14,
            "h": 0.14
          },
          "aria_label_sv": "Fågeln",
          "idle": "appear",
          "idle_glyph": "🐦",
          "tap_animation": "hop",
          "particle": "hop",
          "particle_glyph": "🐦",
          "feedback_sv": "Kvitt! Den hoppar bort.",
          "action": "ambient",
          "cooldown_ms": 1400,
          "haptic": "light"
        },
        {
          "object_id": "butterfly",
          "hit_area": {
            "x": 0.42,
            "y": 0.32,
            "w": 0.12,
            "h": 0.12
          },
          "aria_label_sv": "Fjärilen",
          "tap_animation": "appear",
          "particle": "appear",
          "particle_glyph": "🦋",
          "feedback_sv": "En fjäril dansar förbi.",
          "action": "ambient",
          "cooldown_ms": 1500,
          "haptic": "light"
        },
        {
          "object_id": "flower",
          "hit_area": {
            "x": 0.76,
            "y": 0.5,
            "w": 0.16,
            "h": 0.18
          },
          "aria_label_sv": "Blomman",
          "idle": "flutter",
          "idle_glyph": "🌸",
          "tap_animation": "wiggle",
          "particle": "appear",
          "particle_glyph": "🌸",
          "feedback_sv": "Blomman nickar glatt.",
          "action": "ambient",
          "cooldown_ms": 1000,
          "haptic": "light"
        },
        {
          "object_id": "stone_snail",
          "hit_area": {
            "x": 0.84,
            "y": 0.66,
            "w": 0.12,
            "h": 0.14
          },
          "aria_label_sv": "Snigeln på stenen",
          "tap_animation": "wiggle",
          "feedback_sv": "Snigeln sticker ut huvudet.",
          "action": "ambient",
          "cooldown_ms": 1200,
          "haptic": "light"
        }
      ]
    }
  }
};

  function getScene(sceneId) {
    const scene = PACK.scenes[sceneId];
    if (!scene || !scene.objects) return [];
    return scene.objects.slice();
  }

  window.AmbientObjectsPack = {
    version: PACK.version,
    getScene: getScene,
    _raw: PACK,
  };
})();
