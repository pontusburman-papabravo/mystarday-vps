#!/usr/bin/env node
/**
 * v4 deliverables: shot report, UI %, emotion timeline, EDL, side-by-side.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from '../lib/config.mjs';
import {
  loadManifest,
  computeAppScreenRatio,
  computeManifestDuration,
  computeSceneStarts,
  sceneTransitionDurations,
} from '../lib/manifest.mjs';
import { sceneRenderDuration } from '../lib/caption-layout.mjs';
import { runFfmpeg, probeDuration } from '../lib/ffmpeg.mjs';
import { parseArgs } from '../lib/cli.mjs';

const EMOTION_BY_ROLE = {
  chaos: 'recognition → stress',
  story: 'hope → together',
  'app-screen': 'quiet enablement',
  validation: 'independence → pride',
  payoff: 'pride',
  brand: 'relief → silence',
};

const ACTS = [
  { id: 1, label: 'Recognition / stress', startSec: 0, endSec: 8 },
  { id: 2, label: 'Hope / together', startSec: 8, endSec: 20 },
  { id: 3, label: 'Independence', startSec: 20, endSec: 31 },
  { id: 4, label: 'Pride / reward feeling', startSec: 31, endSec: 36 },
  { id: 5, label: 'Relief / silence / logo', startSec: 36, endSec: 40.5 },
];

function buildShotDurationReport(manifest) {
  const starts = computeSceneStarts(manifest.scenes);
  const transitions = sceneTransitionDurations(manifest.scenes);
  return manifest.scenes.map((scene, i) => ({
    index: i + 1,
    sceneId: scene.id,
    role: scene.role,
    renderDurationSec: sceneRenderDuration(scene),
    timelineStartSec: Number(starts[i].toFixed(2)),
    transitionOut: i < manifest.scenes.length - 1 ? scene.transition : null,
    transitionDurationSec: i < transitions.length ? transitions[i] : null,
    colourGrade: scene.colourGrade || manifest.colourGradeDefault || 'neutral',
    isAppUi: scene.role === 'app-screen' || scene.role === 'app-glimpse',
    caption: scene.showCaption !== false ? (scene.swedishText || '').replace(/\n/g, ' / ') : '',
  }));
}

function buildEmotionTimeline(manifest, totalSec) {
  const starts = computeSceneStarts(manifest.scenes);
  const points = manifest.scenes.map((scene, i) => ({
    atSec: Number(starts[i].toFixed(2)),
    sceneId: scene.id,
    emotion: EMOTION_BY_ROLE[scene.role] || scene.role,
    note: scene.validationScene ? 'key beat' : undefined,
  }));

  const acts = ACTS.map((act) => ({
    ...act,
    scenes: manifest.scenes
      .map((s, i) => ({ id: s.id, start: starts[i] }))
      .filter((s) => s.start >= act.startSec && s.start < act.endSec)
      .map((s) => s.id),
  }));

  return { totalSec: Number(totalSec.toFixed(2)), points, acts };
}

function buildEdl(manifest) {
  const shots = buildShotDurationReport(manifest);
  return shots.map((shot, i) => {
    const next = shots[i + 1];
    const outPoint = next
      ? next.timelineStartSec + (shot.transitionDurationSec || 0)
      : shot.timelineStartSec + shot.renderDurationSec;
    return {
      event: i + 1,
      reel: shot.sceneId,
      sourceIn: '00:00:00:00',
      sourceOut: secondsToTimecode(shot.renderDurationSec),
      recordIn: secondsToTimecode(shot.timelineStartSec),
      recordOut: secondsToTimecode(outPoint),
      transition: shot.transitionOut,
      notes: [shot.caption, shot.isAppUi ? 'UI' : null, shot.colourGrade].filter(Boolean).join(' · '),
    };
  });
}

function secondsToTimecode(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const f = Math.round((sec % 1) * 30);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

function buildSideBySide(referencePath, v4Path, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  runFfmpeg([
    '-y',
    '-i', referencePath,
    '-i', v4Path,
    '-filter_complex',
    [
      '[0:v]scale=960:540,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text=\'v3 reference\':fontsize=28:fontcolor=white@0.9:x=24:y=24[v0]',
      '[1:v]scale=960:540,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text=\'v4 commercial\':fontsize=28:fontcolor=white@0.9:x=24:y=24[v1]',
      '[v0][v1]hstack=inputs=2[v]',
    ].join(';'),
    '-map', '[v]',
    '-map', '1:a?',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'medium',
    '-crf', '22',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-shortest',
    outputPath,
  ], { label: 'side-by-side' });
}

function main() {
  const { options } = parseArgs(process.argv.slice(2));
  const outDir = path.join(PATHS.output, 'together-through-the-morning', 'v4-reports');
  fs.mkdirSync(outDir, { recursive: true });

  const { manifest: v4 } = loadManifest('together-through-the-morning-v4');
  const { manifest: v3 } = loadManifest('together-through-the-morning');

  const totalSec = computeManifestDuration(v4);
  const ui = computeAppScreenRatio(v4);

  const shotReport = {
    filmId: v4.id,
    totalDurationSec: Number(totalSec.toFixed(2)),
    shots: buildShotDurationReport(v4),
  };

  const uiReport = {
    filmId: v4.id,
    appScreenSec: Number(ui.appSec.toFixed(2)),
    totalSec: Number(ui.totalSec.toFixed(2)),
    uiExposurePercent: Number((ui.ratio * 100).toFixed(1)),
    targetPercent: '15–20%',
    passesTarget: ui.ratio <= 0.2,
    appScenes: v4.scenes.filter((s) => s.role === 'app-screen').map((s) => ({
      id: s.id,
      durationSec: sceneRenderDuration(s),
    })),
    removedFromV3: ['app-check-star-2'],
  };

  const emotionTimeline = buildEmotionTimeline(v4, totalSec);
  const edl = buildEdl(v4);

  const reports = {
    shotDuration: shotReport,
    uiExposure: uiReport,
    emotionTimeline,
    edl,
    v3Reference: {
      id: v3.id,
      durationSec: Number(computeManifestDuration(v3).toFixed(2)),
      uiExposurePercent: Number((computeAppScreenRatio(v3).ratio * 100).toFixed(1)),
    },
  };

  const reportPath = path.join(outDir, 'v4-deliverables.json');
  fs.writeFileSync(reportPath, `${JSON.stringify(reports, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, 'shot-duration-report.json'), `${JSON.stringify(shotReport, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, 'ui-exposure.json'), `${JSON.stringify(uiReport, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, 'emotion-timeline.json'), `${JSON.stringify(emotionTimeline, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, 'edit-decision-list.json'), `${JSON.stringify(edl, null, 2)}\n`);

  console.log(`Reports → ${outDir}`);
  console.log(`  Duration: ${totalSec.toFixed(1)}s`);
  console.log(`  UI exposure: ${uiReport.uiExposurePercent}%`);

  const refPath = options.reference
    || path.join(PATHS.output, 'together-through-the-morning', 'together-through-the-morning-v3-fal-cartoon-landscape.mp4');
  const v4Path = options.v4
    || path.join(PATHS.output, 'together-through-the-morning', 'together-through-the-morning-v4-commercial-landscape.mp4');

  if (fs.existsSync(refPath) && fs.existsSync(v4Path)) {
    const sidePath = path.join(outDir, 'side-by-side-v3-vs-v4.mp4');
    buildSideBySide(refPath, v4Path, sidePath);
    console.log(`  Side-by-side: ${sidePath}`);
  } else {
    console.log('  Side-by-side skipped (render v4 first, or pass --reference / --v4 paths)');
  }
}

main();
