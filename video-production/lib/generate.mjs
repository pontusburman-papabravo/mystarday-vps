import fs from 'node:fs';
import path from 'node:path';
import { CONFIG, PATHS } from './config.mjs';
import {
  listManifestFiles,
  loadManifest,
  planGeneration,
  resolveManifestPaths,
  countPendingScenes,
} from './manifest.mjs';
import {
  loadState,
  saveState,
  updateSceneState,
  isSceneComplete,
  countDailyGenerations,
  incrementDailyGenerations,
} from './state.mjs';
import { submitScene, pollUntilComplete, downloadVideo } from './pika-client.mjs';
import { generatePlaceholdersForManifest, generateScenePlaceholder } from './placeholders.mjs';
import {
  parseArgs,
  requireFilmSelection,
  printPlanSummary,
  assertConfirmForBillable,
  ensureDirs,
} from './cli.mjs';

export async function runGenerate(argv = process.argv.slice(2)) {
  const { flags, options } = parseArgs(argv);
  const usePlaceholders = flags.has('placeholders');
  const confirm = flags.has('confirm');

  ensureDirs(PATHS.state, PATHS.raw);

  const manifestFiles = requireFilmSelection(listManifestFiles(), options.film);
  const bundles = manifestFiles.map((filePath) => {
    const { manifest } = loadManifest(filePath);
    const state = loadState(manifest.id);
    return { filePath, manifest, state };
  });

  const plan = planGeneration(
    bundles.map((b) => ({ manifest: b.manifest, state: b.state })),
    { sceneId: options.scene },
  );
  printPlanSummary(plan, { estimatedCostPerScene: CONFIG.estimatedCostPerSceneUsd });
  assertConfirmForBillable({ confirm, placeholders: usePlaceholders, pendingScenes: plan.pendingScenes });

  if (plan.pendingScenes === 0) {
    console.log('Nothing to generate — all scenes already completed.');
    return { generated: 0, skipped: plan.totalScenes };
  }

  if (!usePlaceholders && plan.pendingScenes > CONFIG.maxGenerationsPerRun) {
    throw new Error(
      `Safety limit: ${plan.pendingScenes} pending scenes exceeds MAX_GENERATIONS_PER_RUN (${CONFIG.maxGenerationsPerRun}). ` +
      'Raise the limit in .env or run with --film / --scene to narrow scope.',
    );
  }

  let generatedThisRun = 0;
  let skipped = 0;

  for (const bundle of bundles) {
    const { manifest, state: initialState } = bundle;
    let state = initialState;

    if (usePlaceholders) {
      console.log(`\n[${manifest.id}] Generating placeholder clips…`);
      const clips = generatePlaceholdersForManifest(manifest, PATHS.raw, { sceneId: options.scene });
      for (const { scene, localPath } of clips) {
        updateSceneState(state, scene.id, {
          status: 'completed',
          source: 'placeholder',
          localPath,
          completedAt: new Date().toISOString(),
        });
      }
      saveState(manifest.id, state);
      generatedThisRun += clips.length;
      continue;
    }

    const pending = countPendingScenes(manifest, state, { sceneId: options.scene });
    const billablePending = pending.filter((s) => !s.skipPika);
    const dailyCount = countDailyGenerations(state);
    if (dailyCount + billablePending.length > CONFIG.maxGenerationsPerDay) {
      throw new Error(
        `Daily limit would be exceeded for ${manifest.id}: ` +
        `${dailyCount} already today + ${billablePending.length} pending > MAX_GENERATIONS_PER_DAY (${CONFIG.maxGenerationsPerDay})`,
      );
    }

    const paths = resolveManifestPaths(manifest);

    for (let index = 0; index < manifest.scenes.length; index++) {
      const scene = manifest.scenes[index];
      if (options.scene && scene.id !== options.scene) continue;

      if (isSceneComplete(state, scene.id)) {
        console.log(`  skip ${scene.id} (already completed)`);
        skipped += 1;
        continue;
      }

      if (generatedThisRun >= CONFIG.maxGenerationsPerRun) {
        console.log(`  stop: MAX_GENERATIONS_PER_RUN (${CONFIG.maxGenerationsPerRun}) reached`);
        saveState(manifest.id, state);
        return { generated: generatedThisRun, skipped };
      }

      const localPath = path.join(PATHS.raw, manifest.id, scene.outputFilename);

      if (scene.skipPika) {
        const kind = scene.endBoard ? 'end board' : scene.appScreenshot ? 'app screen' : 'local clip';
        console.log(`\n[${manifest.id}] Local ${kind} ${scene.id} (skip Pika)…`);
        const assetRoot = path.join(PATHS.assets, '..');
        generateScenePlaceholder(scene, localPath, index, { manifest, assetRoot });
        updateSceneState(state, scene.id, {
          status: 'completed',
          source: scene.endBoard ? 'end-board' : scene.appScreenshot ? 'app-screen' : 'local-black',
          localPath,
          completedAt: new Date().toISOString(),
        });
        saveState(manifest.id, state);
        generatedThisRun += 1;
        continue;
      }

      const resolvedRef = paths.scenes.find((s) => s.id === scene.id)?.referenceImage || paths.referenceImage;

      if (!fs.existsSync(resolvedRef)) {
        throw new Error(
          `Reference image missing for ${manifest.id}/${scene.id}: ${resolvedRef}\n` +
          'Add a family reference PNG/JPG under assets/references/ for visual consistency.',
        );
      }

      console.log(`\n[${manifest.id}] Generating ${scene.id}…`);

      try {
        updateSceneState(state, scene.id, { status: 'submitting' });
        saveState(manifest.id, state);

        const { requestId, imageUrl } = await submitScene({
          prompt: scene.pikaPrompt,
          referenceImagePath: resolvedRef,
          duration: scene.duration,
          resolution: CONFIG.pikaResolution,
          seed: manifest.seed,
        });

        updateSceneState(state, scene.id, {
          status: 'queued',
          requestId,
          referenceImageUrl: imageUrl,
        });
        saveState(manifest.id, state);

        const result = await pollUntilComplete(requestId, {
          onStatus: (status) => {
            if (status.status === 'IN_PROGRESS') {
              process.stdout.write('.');
            }
          },
        });
        console.log('');

        const videoUrl = result.data?.video?.url;
        if (!videoUrl) {
          throw new Error(`No video URL in Pika result for ${scene.id}`);
        }

        await downloadVideo(videoUrl, localPath);

        updateSceneState(state, scene.id, {
          status: 'completed',
          requestId,
          videoUrl,
          localPath,
          completedAt: new Date().toISOString(),
        });
        incrementDailyGenerations(state, 1);
        saveState(manifest.id, state);

        generatedThisRun += 1;
        console.log(`  ✓ ${scene.id} → ${localPath}`);
      } catch (err) {
        updateSceneState(state, scene.id, {
          status: 'failed',
          error: err.message,
        });
        saveState(manifest.id, state);
        throw new Error(`Generation failed for ${manifest.id}/${scene.id}: ${err.message}`);
      }
    }
  }

  console.log(`\nDone. Generated: ${generatedThisRun}, skipped: ${skipped}`);
  return { generated: generatedThisRun, skipped };
}
