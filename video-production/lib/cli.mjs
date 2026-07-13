import path from 'node:path';
import fs from 'node:fs';

export function parseArgs(argv = process.argv.slice(2)) {
  const flags = new Set();
  const options = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--confirm') flags.add('confirm');
    else if (arg === '--dry-run') flags.add('dry-run');
    else if (arg === '--placeholders') flags.add('placeholders');
    else if (arg === '--help' || arg === '-h') flags.add('help');
    else if (arg === '--film' && argv[i + 1]) {
      options.film = argv[++i];
    } else if (arg.startsWith('--film=')) {
      options.film = arg.slice('--film='.length);
    } else if (!arg.startsWith('-')) {
      options.film = options.film || arg;
    }
  }

  return { flags, options };
}

export function printHelp(command) {
  const common = `
Options:
  --film <id>       Process a single manifest id (default: all manifests)
  --confirm         Required for billable Pika API generation
  --placeholders    Use ffmpeg color clips instead of Pika (no API cost)
  --help            Show this help

Environment: copy .env.example to .env and set FAL_KEY for paid generation.
`;

  const texts = {
    generate: `Usage: npm run generate [-- --film <id>] [--confirm] [--placeholders]\n${common}`,
    render: `Usage: npm run render [-- --film <id>] [--placeholders]\n${common}`,
    all: `Usage: npm run all [-- --film <id>] [--confirm] [--placeholders]\n${common}`,
    'dry-run': `Usage: npm run dry-run [-- --film <id>]\n${common}`,
  };

  console.log(texts[command] || texts.generate);
}

export function requireFilmSelection(manifestFiles, filmId) {
  if (!filmId) return manifestFiles;
  const match = manifestFiles.filter((f) => path.basename(f, '.json') === filmId || f.includes(filmId));
  if (match.length === 0) {
    throw new Error(`No manifest found for film id: ${filmId}`);
  }
  return match;
}

export function printPlanSummary(plan, { estimatedCostPerScene }) {
  console.log('\n=== Generation plan ===');
  for (const film of plan.films) {
    console.log(`• ${film.title} (${film.id})`);
    console.log(`  scenes: ${film.totalScenes} total, ${film.completedScenes} done, ${film.pendingScenes} pending`);
    if (film.pending.length) {
      console.log(`  pending ids: ${film.pending.join(', ')}`);
    }
  }
  console.log(`\nTotal API calls if all pending scenes run: ${plan.pendingScenes}`);
  const est = (plan.pendingScenes * estimatedCostPerScene).toFixed(2);
  console.log(`Estimated cost (@ $${estimatedCostPerScene}/scene): ~$${est} USD`);
  console.log('');
}

export function assertConfirmForBillable({ confirm, placeholders, pendingScenes }) {
  if (placeholders || pendingScenes === 0) return;
  if (!confirm) {
    console.error('Billable generation blocked.');
    console.error(`This run would submit ${pendingScenes} Pika API call(s).`);
    console.error('Re-run with --confirm to proceed, or use --placeholders for local testing.');
    process.exit(1);
  }
}

export function ensureDirs(...dirs) {
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
