import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from './config.mjs';

function statePath(manifestId) {
  return path.join(PATHS.state, `${manifestId}.json`);
}

export function loadState(manifestId) {
  const file = statePath(manifestId);
  if (!fs.existsSync(file)) {
    return {
      manifestId,
      updatedAt: null,
      dailyGenerations: {},
      scenes: {},
    };
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function saveState(manifestId, state) {
  fs.mkdirSync(PATHS.state, { recursive: true });
  state.updatedAt = new Date().toISOString();
  fs.writeFileSync(statePath(manifestId), `${JSON.stringify(state, null, 2)}\n`);
}

export function getSceneState(state, sceneId) {
  return state.scenes[sceneId] || null;
}

export function updateSceneState(state, sceneId, patch) {
  const current = state.scenes[sceneId] || { status: 'pending' };
  state.scenes[sceneId] = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  return state;
}

export function countDailyGenerations(state, dateKey = todayKey()) {
  return state.dailyGenerations?.[dateKey] || 0;
}

export function incrementDailyGenerations(state, count = 1) {
  const key = todayKey();
  if (!state.dailyGenerations) state.dailyGenerations = {};
  state.dailyGenerations[key] = (state.dailyGenerations[key] || 0) + count;
  return state;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function isSceneComplete(state, sceneId) {
  const entry = state.scenes[sceneId];
  return entry?.status === 'completed' && entry.localPath && fs.existsSync(entry.localPath);
}

export function listCompletedScenePaths(manifest, state) {
  return manifest.scenes
    .map((scene) => {
      const entry = state.scenes[scene.id];
      if (!isSceneComplete(state, scene.id)) return null;
      return {
        scene,
        localPath: entry.localPath,
      };
    })
    .filter(Boolean);
}
