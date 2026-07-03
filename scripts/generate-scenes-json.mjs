#!/usr/bin/env node
/**
 * generate-scenes-json.mjs — Build scenes.json + browser catalog from living-world-scenes-catalog.cjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { LIVING_WORLD_ROOMS, buildScenesJson } = require('../config/living-world-scenes-catalog.cjs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SCENES_OUT = path.join(ROOT, 'config/experience-packs/child_se/scenes.json');
const CLIENT_OUT = path.join(ROOT, 'public/js/living-world-scenes-catalog.js');

const data = buildScenesJson();
fs.writeFileSync(SCENES_OUT, JSON.stringify(data, null, 2) + '\n');

const clientRooms = LIVING_WORLD_ROOMS.map(function (room) {
  return {
    scene_id: room.scene_id,
    world_id: room.world_id,
    asset_dir: room.asset_dir,
    class_prefix: room.class_prefix,
    display_name_sv: room.display_name_sv,
    exit_target: room.exit_target,
    exit_label_sv: room.exit_label_sv || null,
    asset_exportable: room.asset_exportable,
    wire_in: room.wire_in,
    wired_via: room.wired_via || null,
    hotspots: room.hotspots || [],
  };
});

const clientSrc = `/**
 * living-world-scenes-catalog.js — generated; do not edit by hand.
 * Regenerate: npm run generate:scenes-json
 */
(function () {
  'use strict';
  var rooms = ${JSON.stringify(clientRooms, null, 2)};
  function byWorldId(id) {
    for (var i = 0; i < rooms.length; i++) {
      if (rooms[i].world_id === id) return rooms[i];
    }
    return null;
  }
  function bySceneId(id) {
    for (var i = 0; i < rooms.length; i++) {
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
`;

fs.writeFileSync(CLIENT_OUT, clientSrc);
console.log('wrote', path.relative(ROOT, SCENES_OUT), '(' + data.scenes.length + ' scenes)');
console.log('wrote', path.relative(ROOT, CLIENT_OUT));
