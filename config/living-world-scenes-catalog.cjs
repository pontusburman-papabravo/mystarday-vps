'use strict';

/**
 * Canonical Living World room catalog — drives scenes.json + client wire-in.
 * Source of truth aligned with docs/world/data/*.yaml (catalog #100–180).
 */
const LIVING_WORLD_ROOMS = [
  {
    scene_id: 'home_exterior',
    slug: 'home',
    catalog_number: 100,
    display_name_sv: 'Hemmet utanför',
    world_id: 'home_exterior',
    asset_dir: 'home',
    class_prefix: 'hm',
    exit_target: 'routine_home',
    exit_label_sv: 'Tillbaka till Morgonhuset',
    asset_exportable: true,
    wire_in: false,
    hotspots: [
      { hotspot_id: 'front_door', interaction: 'navigate', target_scene: 'home_hall', label_sv: 'In genom dörren', hit_area: { x: 0.38, y: 0.42, w: 0.24, h: 0.38 } },
    ],
  },
  {
    scene_id: 'home_hall',
    slug: 'hall',
    catalog_number: 101,
    display_name_sv: 'Hallen',
    world_id: 'home_hall',
    asset_dir: 'hall',
    class_prefix: 'hl',
    exit_target: 'routine_home',
    exit_label_sv: 'Tillbaka till Morgonhuset',
    asset_exportable: true,
    wire_in: true,
    hotspots: [
      { hotspot_id: 'fireplace_hero', interaction: 'inspect', label_sv: 'Brasan', hit_area: { x: 0.08, y: 0.35, w: 0.35, h: 0.4 } },
      { hotspot_id: 'door_bedroom', interaction: 'navigate', target_scene: 'bedroom', label_sv: 'Sovrummet', hit_area: { x: 0.02, y: 0.5, w: 0.18, h: 0.35 } },
      { hotspot_id: 'door_kitchen', interaction: 'navigate', target_scene: 'home_kitchen', label_sv: 'Köket', hit_area: { x: 0.72, y: 0.48, w: 0.18, h: 0.32 } },
      { hotspot_id: 'door_bathroom', interaction: 'navigate', target_scene: 'home_bathroom', label_sv: 'Badrummet', hit_area: { x: 0.78, y: 0.55, w: 0.16, h: 0.28 } },
      { hotspot_id: 'door_attic', interaction: 'navigate', target_scene: 'attic', label_sv: 'Vinden', hit_area: { x: 0.42, y: 0.08, w: 0.2, h: 0.22 } },
      { hotspot_id: 'door_garden', interaction: 'navigate', target_scene: 'garden', label_sv: 'Trädgården', hit_area: { x: 0.55, y: 0.55, w: 0.2, h: 0.35 } },
    ],
  },
  {
    scene_id: 'bedroom',
    slug: 'bedroom',
    catalog_number: 102,
    display_name_sv: 'Sovrummet',
    world_id: 'bedroom',
    asset_dir: 'bedroom',
    class_prefix: 'br',
    exit_target: 'home_hall',
    exit_label_sv: 'Tillbaka till hallen',
    asset_exportable: true,
    wire_in: true,
    hotspots: [
      { hotspot_id: 'child_bed_inspect', interaction: 'inspect', label_sv: 'Sängen', hit_area: { x: 0.18, y: 0.48, w: 0.42, h: 0.28 } },
      { hotspot_id: 'window_weather_inspect', interaction: 'inspect', label_sv: 'Fönstret', hit_area: { x: 0.62, y: 0.18, w: 0.28, h: 0.22 } },
      { hotspot_id: 'door_hall', interaction: 'navigate', target_scene: 'home_hall', label_sv: 'Hallen', hit_area: { x: 0.04, y: 0.58, w: 0.18, h: 0.32 } },
    ],
  },
  {
    scene_id: 'home_kitchen',
    slug: 'kitchen',
    catalog_number: 103,
    display_name_sv: 'Köket',
    world_id: 'home_kitchen',
    asset_dir: 'kitchen',
    class_prefix: 'kt',
    exit_target: 'home_hall',
    exit_label_sv: 'Tillbaka till hallen',
    asset_exportable: true,
    wire_in: true,
    hotspots: [
      { hotspot_id: 'breakfast_table_inspect', interaction: 'inspect', label_sv: 'Frukostbordet', hit_area: { x: 0.22, y: 0.52, w: 0.38, h: 0.25 } },
      { hotspot_id: 'window_garden_inspect', interaction: 'inspect', label_sv: 'Fönstret', hit_area: { x: 0.58, y: 0.2, w: 0.3, h: 0.22 } },
      { hotspot_id: 'door_hall', interaction: 'navigate', target_scene: 'home_hall', label_sv: 'Hallen', hit_area: { x: 0.04, y: 0.55, w: 0.16, h: 0.32 } },
    ],
  },
  {
    scene_id: 'home_bathroom',
    slug: 'bathroom',
    catalog_number: 104,
    display_name_sv: 'Badrummet',
    world_id: 'home_bathroom',
    asset_dir: 'bathroom',
    class_prefix: 'ba',
    exit_target: 'home_hall',
    exit_label_sv: 'Tillbaka till hallen',
    asset_exportable: true,
    wire_in: true,
    hotspots: [
      { hotspot_id: 'mirror_inspect', interaction: 'inspect', label_sv: 'Spegeln', hit_area: { x: 0.35, y: 0.22, w: 0.28, h: 0.25 } },
      { hotspot_id: 'sink_activate', interaction: 'activate', label_sv: 'Tvättställ', hit_area: { x: 0.3, y: 0.48, w: 0.35, h: 0.2 } },
      { hotspot_id: 'door_hall', interaction: 'navigate', target_scene: 'home_hall', label_sv: 'Hallen', hit_area: { x: 0.04, y: 0.58, w: 0.16, h: 0.3 } },
    ],
  },
  {
    scene_id: 'attic',
    slug: 'attic',
    catalog_number: 105,
    display_name_sv: 'Vinden',
    world_id: 'attic',
    asset_dir: 'attic',
    class_prefix: 'at',
    exit_target: 'home_hall',
    exit_label_sv: 'Tillbaka till hallen',
    asset_exportable: true,
    wire_in: true,
    hotspots: [
      { hotspot_id: 'trunk_inspect', interaction: 'inspect', label_sv: 'Kistan', hit_area: { x: 0.28, y: 0.5, w: 0.35, h: 0.28 } },
      { hotspot_id: 'roof_window_inspect', interaction: 'inspect', label_sv: 'Takfönstret', hit_area: { x: 0.55, y: 0.12, w: 0.25, h: 0.2 } },
      { hotspot_id: 'stairs_to_hall', interaction: 'navigate', target_scene: 'home_hall', label_sv: 'Ner till hallen', hit_area: { x: 0.08, y: 0.65, w: 0.22, h: 0.25 } },
    ],
  },
  {
    scene_id: 'garden',
    slug: 'garden',
    catalog_number: 110,
    display_name_sv: 'Trädgården',
    world_id: 'garden',
    asset_dir: 'garden',
    class_prefix: 'gd',
    exit_target: 'routine_home',
    asset_exportable: true,
    wire_in: true,
    wired_via: 'child-garden.js',
    hotspots: [
      { hotspot_id: 'garden_path', interaction: 'navigate', target_scene: 'memory_hall', label_sv: 'Stigen', hit_area: { x: 0.35, y: 0.55, w: 0.3, h: 0.35 } },
      { hotspot_id: 'garden_bed', interaction: 'inspect', label_sv: 'Blomsterbädden', hit_area: { x: 0.05, y: 0.6, w: 0.25, h: 0.25 } },
      { hotspot_id: 'garden_sky', interaction: 'inspect', label_sv: 'Himlen', hit_area: { x: 0.2, y: 0.05, w: 0.6, h: 0.2 } },
    ],
  },
  {
    scene_id: 'workshop',
    slug: 'workshop',
    catalog_number: 120,
    display_name_sv: 'Verkstaden',
    world_id: 'workshop',
    asset_dir: 'workshop',
    class_prefix: 'ws',
    exit_target: 'garden',
    exit_label_sv: 'Tillbaka till trädgården',
    asset_exportable: true,
    wire_in: false,
    hotspots: [
      { hotspot_id: 'workbench_inspect', interaction: 'inspect', label_sv: 'Hörnet', hit_area: { x: 0.25, y: 0.45, w: 0.4, h: 0.3 } },
      { hotspot_id: 'door_garden', interaction: 'navigate', target_scene: 'garden', label_sv: 'Trädgården', hit_area: { x: 0.05, y: 0.55, w: 0.18, h: 0.32 } },
    ],
  },
  {
    scene_id: 'museum',
    slug: 'museum',
    catalog_number: 130,
    display_name_sv: 'Museet',
    world_id: 'museum',
    asset_dir: 'museum',
    class_prefix: 'mu',
    exit_target: 'garden',
    asset_exportable: false,
    wire_in: false,
    hotspots: [
      { hotspot_id: 'memory_wall', interaction: 'inspect', label_sv: 'Minnesväggen', hit_area: { x: 0.15, y: 0.25, w: 0.55, h: 0.4 } },
    ],
  },
  {
    scene_id: 'pet_house',
    slug: 'pet_house',
    catalog_number: 140,
    display_name_sv: 'Husdjursstugan',
    world_id: 'pet_house',
    asset_dir: 'pet-house',
    class_prefix: 'ph',
    exit_target: 'garden',
    asset_exportable: true,
    wire_in: false,
    hotspots: [
      { hotspot_id: 'rescue_bed', interaction: 'inspect', label_sv: 'Bädden', hit_area: { x: 0.28, y: 0.5, w: 0.35, h: 0.28 } },
      { hotspot_id: 'gate_garden', interaction: 'navigate', target_scene: 'garden', label_sv: 'Trädgården', hit_area: { x: 0.05, y: 0.55, w: 0.2, h: 0.32 } },
    ],
  },
  {
    scene_id: 'trophy_room',
    slug: 'trophy_room',
    catalog_number: 150,
    display_name_sv: 'Troférummet',
    world_id: 'trophy_room',
    asset_dir: 'trophy-room',
    class_prefix: 'tr',
    exit_target: 'home_hall',
    asset_exportable: true,
    wire_in: false,
    hotspots: [
      { hotspot_id: 'trophy_shelf', interaction: 'inspect', label_sv: 'Hyllan', hit_area: { x: 0.2, y: 0.3, w: 0.5, h: 0.35 } },
      { hotspot_id: 'door_hall', interaction: 'navigate', target_scene: 'home_hall', label_sv: 'Hallen', hit_area: { x: 0.04, y: 0.55, w: 0.16, h: 0.32 } },
    ],
  },
  {
    scene_id: 'reading_corner',
    slug: 'reading_corner',
    catalog_number: 160,
    display_name_sv: 'Läshörnan',
    world_id: 'reading_corner',
    asset_dir: 'reading-corner',
    class_prefix: 'rc',
    exit_target: 'bedroom',
    asset_exportable: true,
    wire_in: false,
    hotspots: [
      { hotspot_id: 'reading_lamp', interaction: 'inspect', label_sv: 'Lampan', hit_area: { x: 0.55, y: 0.25, w: 0.25, h: 0.25 } },
      { hotspot_id: 'door_bedroom', interaction: 'navigate', target_scene: 'bedroom', label_sv: 'Sovrummet', hit_area: { x: 0.04, y: 0.55, w: 0.16, h: 0.32 } },
    ],
  },
  {
    scene_id: 'forest',
    slug: 'forest',
    catalog_number: 170,
    display_name_sv: 'Skogen',
    world_id: 'forest',
    asset_dir: 'forest',
    class_prefix: 'fo',
    exit_target: 'garden',
    asset_exportable: true,
    wire_in: false,
    hotspots: [
      { hotspot_id: 'forest_path', interaction: 'navigate', target_scene: 'lake', label_sv: 'Stigen till sjön', hit_area: { x: 0.35, y: 0.55, w: 0.3, h: 0.35 } },
      { hotspot_id: 'ancient_pine', interaction: 'inspect', label_sv: 'Tallen', hit_area: { x: 0.1, y: 0.2, w: 0.35, h: 0.45 } },
    ],
  },
  {
    scene_id: 'lake',
    slug: 'lake',
    catalog_number: 180,
    display_name_sv: 'Sjön',
    world_id: 'lake',
    asset_dir: 'lake',
    class_prefix: 'lk',
    exit_target: 'forest',
    asset_exportable: true,
    wire_in: false,
    hotspots: [
      { hotspot_id: 'lake_dock', interaction: 'inspect', label_sv: 'Bryggan', hit_area: { x: 0.25, y: 0.55, w: 0.45, h: 0.25 } },
      { hotspot_id: 'path_forest', interaction: 'navigate', target_scene: 'forest', label_sv: 'Tillbaka till skogen', hit_area: { x: 0.05, y: 0.6, w: 0.2, h: 0.28 } },
    ],
  },
  {
    scene_id: 'memory_hall',
    slug: 'memory_hall',
    catalog_number: 130,
    display_name_sv: 'Minnesrummet',
    world_id: 'memory_hall',
    asset_dir: 'memory-hall',
    class_prefix: 'mu',
    exit_target: 'garden',
    asset_exportable: true,
    wire_in: true,
    wired_via: 'child-memory-hall.js',
    hotspots: [
      { hotspot_id: 'memory_hall_window', interaction: 'inspect', label_sv: 'Fönstret', hit_area: { x: 0.68, y: 0.1, w: 0.25, h: 0.22 } },
      { hotspot_id: 'memory_hall_wall', interaction: 'inspect', label_sv: 'Minnesväggen', hit_area: { x: 0.12, y: 0.28, w: 0.55, h: 0.38 } },
    ],
  },
];

function getRoomByWorldId(worldId) {
  return LIVING_WORLD_ROOMS.find(function (r) { return r.world_id === worldId; }) || null;
}

function getRoomBySceneId(sceneId) {
  return LIVING_WORLD_ROOMS.find(function (r) { return r.scene_id === sceneId; }) || null;
}

function getWiredCatalogRooms() {
  return LIVING_WORLD_ROOMS.filter(function (r) {
    return r.wire_in && !r.wired_via;
  });
}

function buildScenesJson() {
  return {
    version: '1.0.0',
    scenes: LIVING_WORLD_ROOMS.map(function (room) {
      return {
        scene_id: room.scene_id,
        catalog_number: room.catalog_number,
        display_name_sv: room.display_name_sv,
        asset_dir: room.asset_dir,
        asset_exportable: room.asset_exportable,
        theme_variants: ['house', 'castle', 'treehouse', 'space', 'pirate', 'wizard'],
        layers: ['sky', 'bg', 'ground', 'objects', 'fg'],
        exit_target: room.exit_target,
        hotspots: (room.hotspots || []).map(function (h) {
          const entry = {
            hotspot_id: h.hotspot_id,
            interaction: h.interaction,
            label_sv: h.label_sv,
            hit_area: h.hit_area,
          };
          if (h.target_scene) entry.target_scene = h.target_scene;
          return entry;
        }),
        ambient: [],
      };
    }),
  };
}

module.exports = {
  LIVING_WORLD_ROOMS,
  getRoomByWorldId,
  getRoomBySceneId,
  getWiredCatalogRooms,
  buildScenesJson,
};
