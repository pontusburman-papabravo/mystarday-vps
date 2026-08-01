/**
 * living-world-scenes-catalog.js — generated; do not edit by hand.
 * Regenerate: npm run generate:scenes-json
 */
(function () {
  'use strict';
  const rooms = [
  {
    "scene_id": "home_exterior",
    "world_id": "home_exterior",
    "asset_dir": "home",
    "class_prefix": "hm",
    "display_name_sv": "Hemmet utanför",
    "exit_target": "routine_home",
    "exit_label_sv": "Tillbaka till Morgonhuset",
    "asset_exportable": true,
    "wire_in": true,
    "wired_via": null,
    "hotspots": [
      {
        "hotspot_id": "front_door",
        "interaction": "navigate",
        "target_scene": "home_hall",
        "label_sv": "In genom dörren",
        "hit_area": {
          "x": 0.38,
          "y": 0.42,
          "w": 0.24,
          "h": 0.38
        }
      }
    ]
  },
  {
    "scene_id": "home_hall",
    "world_id": "home_hall",
    "asset_dir": "hall",
    "class_prefix": "hl",
    "display_name_sv": "Hallen",
    "exit_target": "routine_home",
    "exit_label_sv": "Tillbaka till Morgonhuset",
    "asset_exportable": true,
    "wire_in": true,
    "wired_via": null,
    "hotspots": [
      {
        "hotspot_id": "fireplace_hero",
        "interaction": "inspect",
        "label_sv": "Brasan",
        "hit_area": {
          "x": 0.08,
          "y": 0.35,
          "w": 0.35,
          "h": 0.4
        }
      },
      {
        "hotspot_id": "door_bedroom",
        "interaction": "navigate",
        "target_scene": "bedroom",
        "label_sv": "Sovrummet",
        "hit_area": {
          "x": 0.02,
          "y": 0.5,
          "w": 0.18,
          "h": 0.35
        }
      },
      {
        "hotspot_id": "door_kitchen",
        "interaction": "navigate",
        "target_scene": "home_kitchen",
        "label_sv": "Köket",
        "hit_area": {
          "x": 0.72,
          "y": 0.48,
          "w": 0.18,
          "h": 0.32
        }
      },
      {
        "hotspot_id": "door_bathroom",
        "interaction": "navigate",
        "target_scene": "home_bathroom",
        "label_sv": "Badrummet",
        "hit_area": {
          "x": 0.78,
          "y": 0.55,
          "w": 0.16,
          "h": 0.28
        }
      },
      {
        "hotspot_id": "door_attic",
        "interaction": "navigate",
        "target_scene": "attic",
        "label_sv": "Vinden",
        "hit_area": {
          "x": 0.42,
          "y": 0.08,
          "w": 0.2,
          "h": 0.22
        }
      },
      {
        "hotspot_id": "door_trophy",
        "interaction": "navigate",
        "target_scene": "trophy_room",
        "label_sv": "Troféerna",
        "hit_area": {
          "x": 0.88,
          "y": 0.42,
          "w": 0.1,
          "h": 0.38
        }
      },
      {
        "hotspot_id": "door_garden",
        "interaction": "navigate",
        "target_scene": "garden",
        "label_sv": "Trädgården",
        "hit_area": {
          "x": 0.55,
          "y": 0.55,
          "w": 0.2,
          "h": 0.35
        }
      }
    ]
  },
  {
    "scene_id": "bedroom",
    "world_id": "bedroom",
    "asset_dir": "bedroom",
    "class_prefix": "br",
    "display_name_sv": "Sovrummet",
    "exit_target": "home_hall",
    "exit_label_sv": "Tillbaka till hallen",
    "asset_exportable": true,
    "wire_in": true,
    "wired_via": null,
    "hotspots": [
      {
        "hotspot_id": "child_bed_inspect",
        "interaction": "inspect",
        "label_sv": "Sängen",
        "hit_area": {
          "x": 0.18,
          "y": 0.48,
          "w": 0.42,
          "h": 0.28
        }
      },
      {
        "hotspot_id": "window_weather_inspect",
        "interaction": "inspect",
        "label_sv": "Fönstret",
        "hit_area": {
          "x": 0.62,
          "y": 0.18,
          "w": 0.28,
          "h": 0.22
        }
      },
      {
        "hotspot_id": "door_reading_corner",
        "interaction": "navigate",
        "target_scene": "reading_corner",
        "label_sv": "Läshörnan",
        "hit_area": {
          "x": 0.78,
          "y": 0.38,
          "w": 0.16,
          "h": 0.28
        }
      },
      {
        "hotspot_id": "door_hall",
        "interaction": "navigate",
        "target_scene": "home_hall",
        "label_sv": "Hallen",
        "hit_area": {
          "x": 0.04,
          "y": 0.58,
          "w": 0.18,
          "h": 0.32
        }
      }
    ]
  },
  {
    "scene_id": "home_kitchen",
    "world_id": "home_kitchen",
    "asset_dir": "kitchen",
    "class_prefix": "kt",
    "display_name_sv": "Köket",
    "exit_target": "home_hall",
    "exit_label_sv": "Tillbaka till hallen",
    "asset_exportable": true,
    "wire_in": true,
    "wired_via": null,
    "hotspots": [
      {
        "hotspot_id": "breakfast_table_inspect",
        "interaction": "inspect",
        "label_sv": "Frukostbordet",
        "hit_area": {
          "x": 0.22,
          "y": 0.52,
          "w": 0.38,
          "h": 0.25
        }
      },
      {
        "hotspot_id": "window_garden_inspect",
        "interaction": "inspect",
        "label_sv": "Fönstret",
        "hit_area": {
          "x": 0.58,
          "y": 0.2,
          "w": 0.3,
          "h": 0.22
        }
      },
      {
        "hotspot_id": "door_hall",
        "interaction": "navigate",
        "target_scene": "home_hall",
        "label_sv": "Hallen",
        "hit_area": {
          "x": 0.04,
          "y": 0.55,
          "w": 0.16,
          "h": 0.32
        }
      }
    ]
  },
  {
    "scene_id": "home_bathroom",
    "world_id": "home_bathroom",
    "asset_dir": "bathroom",
    "class_prefix": "ba",
    "display_name_sv": "Badrummet",
    "exit_target": "home_hall",
    "exit_label_sv": "Tillbaka till hallen",
    "asset_exportable": true,
    "wire_in": true,
    "wired_via": null,
    "hotspots": [
      {
        "hotspot_id": "mirror_inspect",
        "interaction": "inspect",
        "label_sv": "Spegeln",
        "hit_area": {
          "x": 0.35,
          "y": 0.22,
          "w": 0.28,
          "h": 0.25
        }
      },
      {
        "hotspot_id": "sink_activate",
        "interaction": "activate",
        "label_sv": "Tvättställ",
        "hit_area": {
          "x": 0.3,
          "y": 0.48,
          "w": 0.35,
          "h": 0.2
        }
      },
      {
        "hotspot_id": "door_hall",
        "interaction": "navigate",
        "target_scene": "home_hall",
        "label_sv": "Hallen",
        "hit_area": {
          "x": 0.04,
          "y": 0.58,
          "w": 0.16,
          "h": 0.3
        }
      }
    ]
  },
  {
    "scene_id": "attic",
    "world_id": "attic",
    "asset_dir": "attic",
    "class_prefix": "at",
    "display_name_sv": "Vinden",
    "exit_target": "home_hall",
    "exit_label_sv": "Tillbaka till hallen",
    "asset_exportable": true,
    "wire_in": true,
    "wired_via": null,
    "hotspots": [
      {
        "hotspot_id": "trunk_inspect",
        "interaction": "inspect",
        "label_sv": "Kistan",
        "hit_area": {
          "x": 0.28,
          "y": 0.5,
          "w": 0.35,
          "h": 0.28
        }
      },
      {
        "hotspot_id": "roof_window_inspect",
        "interaction": "inspect",
        "label_sv": "Takfönstret",
        "hit_area": {
          "x": 0.55,
          "y": 0.12,
          "w": 0.25,
          "h": 0.2
        }
      },
      {
        "hotspot_id": "stairs_to_hall",
        "interaction": "navigate",
        "target_scene": "home_hall",
        "label_sv": "Ner till hallen",
        "hit_area": {
          "x": 0.08,
          "y": 0.65,
          "w": 0.22,
          "h": 0.25
        }
      }
    ]
  },
  {
    "scene_id": "garden",
    "world_id": "garden",
    "asset_dir": "garden",
    "class_prefix": "gd",
    "display_name_sv": "Trädgården",
    "exit_target": "routine_home",
    "exit_label_sv": null,
    "asset_exportable": true,
    "wire_in": true,
    "wired_via": "child-garden.js",
    "hotspots": [
      {
        "hotspot_id": "garden_path",
        "interaction": "navigate",
        "target_scene": "memory_hall",
        "label_sv": "Stigen",
        "hit_area": {
          "x": 0.35,
          "y": 0.55,
          "w": 0.3,
          "h": 0.35
        }
      },
      {
        "hotspot_id": "garden_bed",
        "interaction": "inspect",
        "label_sv": "Blomsterbädden",
        "hit_area": {
          "x": 0.05,
          "y": 0.6,
          "w": 0.25,
          "h": 0.25
        }
      },
      {
        "hotspot_id": "garden_sky",
        "interaction": "inspect",
        "label_sv": "Himlen",
        "hit_area": {
          "x": 0.2,
          "y": 0.05,
          "w": 0.6,
          "h": 0.2
        }
      },
      {
        "hotspot_id": "path_workshop",
        "interaction": "navigate",
        "target_scene": "workshop",
        "label_sv": "Verkstaden",
        "hit_area": {
          "x": 0.72,
          "y": 0.48,
          "w": 0.18,
          "h": 0.28
        }
      },
      {
        "hotspot_id": "path_forest",
        "interaction": "navigate",
        "target_scene": "forest",
        "label_sv": "Skogen",
        "hit_area": {
          "x": 0.02,
          "y": 0.45,
          "w": 0.2,
          "h": 0.32
        }
      },
      {
        "hotspot_id": "gate_pet_house",
        "interaction": "navigate",
        "target_scene": "pet_house",
        "label_sv": "Husdjursstugan",
        "hit_area": {
          "x": 0.82,
          "y": 0.62,
          "w": 0.16,
          "h": 0.28
        }
      }
    ]
  },
  {
    "scene_id": "workshop",
    "world_id": "workshop",
    "asset_dir": "workshop",
    "class_prefix": "ws",
    "display_name_sv": "Verkstaden",
    "exit_target": "garden",
    "exit_label_sv": "Tillbaka till trädgården",
    "asset_exportable": true,
    "wire_in": true,
    "wired_via": null,
    "hotspots": [
      {
        "hotspot_id": "workbench_inspect",
        "interaction": "inspect",
        "label_sv": "Hörnet",
        "hit_area": {
          "x": 0.25,
          "y": 0.45,
          "w": 0.4,
          "h": 0.3
        }
      },
      {
        "hotspot_id": "door_garden",
        "interaction": "navigate",
        "target_scene": "garden",
        "label_sv": "Trädgården",
        "hit_area": {
          "x": 0.05,
          "y": 0.55,
          "w": 0.18,
          "h": 0.32
        }
      }
    ]
  },
  {
    "scene_id": "museum",
    "world_id": "museum",
    "asset_dir": "museum",
    "class_prefix": "mu",
    "display_name_sv": "Minnesrummet",
    "exit_target": "garden",
    "exit_label_sv": "Tillbaka till trädgården",
    "asset_exportable": true,
    "wire_in": true,
    "wired_via": "child-memory-hall.js",
    "hotspots": [
      {
        "hotspot_id": "memory_wall",
        "interaction": "inspect",
        "label_sv": "Minnesväggen",
        "hit_area": {
          "x": 0.15,
          "y": 0.25,
          "w": 0.55,
          "h": 0.4
        }
      }
    ]
  },
  {
    "scene_id": "pet_house",
    "world_id": "pet_house",
    "asset_dir": "pet-house",
    "class_prefix": "ph",
    "display_name_sv": "Husdjursstugan",
    "exit_target": "garden",
    "exit_label_sv": "Tillbaka till trädgården",
    "asset_exportable": true,
    "wire_in": true,
    "wired_via": null,
    "hotspots": [
      {
        "hotspot_id": "rescue_bed",
        "interaction": "inspect",
        "label_sv": "Bädden",
        "hit_area": {
          "x": 0.28,
          "y": 0.5,
          "w": 0.35,
          "h": 0.28
        }
      },
      {
        "hotspot_id": "gate_garden",
        "interaction": "navigate",
        "target_scene": "garden",
        "label_sv": "Trädgården",
        "hit_area": {
          "x": 0.05,
          "y": 0.55,
          "w": 0.2,
          "h": 0.32
        }
      }
    ]
  },
  {
    "scene_id": "trophy_room",
    "world_id": "trophy_room",
    "asset_dir": "trophy-room",
    "class_prefix": "tr",
    "display_name_sv": "Troférummet",
    "exit_target": "home_hall",
    "exit_label_sv": "Tillbaka till hallen",
    "asset_exportable": true,
    "wire_in": true,
    "wired_via": null,
    "hotspots": [
      {
        "hotspot_id": "trophy_shelf",
        "interaction": "inspect",
        "label_sv": "Hyllan",
        "hit_area": {
          "x": 0.2,
          "y": 0.3,
          "w": 0.5,
          "h": 0.35
        }
      },
      {
        "hotspot_id": "door_hall",
        "interaction": "navigate",
        "target_scene": "home_hall",
        "label_sv": "Hallen",
        "hit_area": {
          "x": 0.04,
          "y": 0.55,
          "w": 0.16,
          "h": 0.32
        }
      }
    ]
  },
  {
    "scene_id": "reading_corner",
    "world_id": "reading_corner",
    "asset_dir": "reading-corner",
    "class_prefix": "rc",
    "display_name_sv": "Läshörnan",
    "exit_target": "bedroom",
    "exit_label_sv": "Tillbaka till sovrummet",
    "asset_exportable": true,
    "wire_in": true,
    "wired_via": null,
    "hotspots": [
      {
        "hotspot_id": "reading_lamp",
        "interaction": "inspect",
        "label_sv": "Lampan",
        "hit_area": {
          "x": 0.55,
          "y": 0.25,
          "w": 0.25,
          "h": 0.25
        }
      },
      {
        "hotspot_id": "door_bedroom",
        "interaction": "navigate",
        "target_scene": "bedroom",
        "label_sv": "Sovrummet",
        "hit_area": {
          "x": 0.04,
          "y": 0.55,
          "w": 0.16,
          "h": 0.32
        }
      }
    ]
  },
  {
    "scene_id": "forest",
    "world_id": "forest",
    "asset_dir": "forest",
    "class_prefix": "fo",
    "display_name_sv": "Skogen",
    "exit_target": "garden",
    "exit_label_sv": "Tillbaka till trädgården",
    "asset_exportable": true,
    "wire_in": true,
    "wired_via": null,
    "hotspots": [
      {
        "hotspot_id": "forest_path",
        "interaction": "navigate",
        "target_scene": "lake",
        "label_sv": "Stigen till sjön",
        "hit_area": {
          "x": 0.35,
          "y": 0.55,
          "w": 0.3,
          "h": 0.35
        }
      },
      {
        "hotspot_id": "ancient_pine",
        "interaction": "inspect",
        "label_sv": "Tallen",
        "hit_area": {
          "x": 0.1,
          "y": 0.2,
          "w": 0.35,
          "h": 0.45
        }
      }
    ]
  },
  {
    "scene_id": "lake",
    "world_id": "lake",
    "asset_dir": "lake",
    "class_prefix": "lk",
    "display_name_sv": "Sjön",
    "exit_target": "forest",
    "exit_label_sv": "Tillbaka till skogen",
    "asset_exportable": true,
    "wire_in": true,
    "wired_via": null,
    "hotspots": [
      {
        "hotspot_id": "lake_dock",
        "interaction": "inspect",
        "label_sv": "Bryggan",
        "hit_area": {
          "x": 0.25,
          "y": 0.55,
          "w": 0.45,
          "h": 0.25
        }
      },
      {
        "hotspot_id": "path_forest",
        "interaction": "navigate",
        "target_scene": "forest",
        "label_sv": "Tillbaka till skogen",
        "hit_area": {
          "x": 0.05,
          "y": 0.6,
          "w": 0.2,
          "h": 0.28
        }
      }
    ]
  },
  {
    "scene_id": "memory_hall",
    "world_id": "memory_hall",
    "asset_dir": "memory-hall",
    "class_prefix": "mu",
    "display_name_sv": "Minnesrummet",
    "exit_target": "garden",
    "exit_label_sv": null,
    "asset_exportable": true,
    "wire_in": true,
    "wired_via": "child-memory-hall.js",
    "hotspots": [
      {
        "hotspot_id": "memory_hall_window",
        "interaction": "inspect",
        "label_sv": "Fönstret",
        "hit_area": {
          "x": 0.68,
          "y": 0.1,
          "w": 0.25,
          "h": 0.22
        }
      },
      {
        "hotspot_id": "memory_hall_wall",
        "interaction": "inspect",
        "label_sv": "Minnesväggen",
        "hit_area": {
          "x": 0.12,
          "y": 0.28,
          "w": 0.55,
          "h": 0.38
        }
      }
    ]
  }
];
  function byWorldId(id) {
    for (let i = 0; i < rooms.length; i++) {
      if (rooms[i].world_id === id) return rooms[i];
    }
    return null;
  }
  function bySceneId(id) {
    for (let i = 0; i < rooms.length; i++) {
      if (rooms[i].scene_id === id) return rooms[i];
    }
    return null;
  }
  window.LivingWorldScenesCatalog = {
    rooms: rooms,
    getRoomByWorldId: byWorldId,
    getRoomBySceneId: bySceneId,
  };
})();
