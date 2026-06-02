#!/usr/bin/env node
/**
 * Local CLI: log in as admin and download the family migration ZIP from production/staging.
 *
 * Usage:
 *   node scripts/migration-export-cli.js
 *
 * Environment (or flags):
 *   MIGRATION_EXPORT_BASE_URL   — default https://mystarday.se
 *   MIGRATION_EXPORT_SECRET     — must match server MIGRATION_EXPORT_SECRET
 *   ADMIN_EMAIL / ADMIN_PASSWORD — optional (otherwise prompted)
 *
 * Server must have:
 *   MIGRATION_EXPORT_ENABLED=true
 *   MIGRATION_EXPORT_SECRET=<same secret>
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const fetch = require('node-fetch');

function parseArgs(argv) {
  const opts = {
    baseUrl: process.env.MIGRATION_EXPORT_BASE_URL || 'https://mystarday.se',
    secret: process.env.MIGRATION_EXPORT_SECRET || '',
    email: process.env.ADMIN_EMAIL || '',
    password: process.env.ADMIN_PASSWORD || '',
    out: path.join(process.cwd(), 'export', `stjarndag-families-${new Date().toISOString().slice(0, 10)}.zip`),
    familyId: null,
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--url' && argv[i + 1]) opts.baseUrl = argv[++i].replace(/\/$/, '');
    else if (argv[i] === '--secret' && argv[i + 1]) opts.secret = argv[++i];
    else if (argv[i] === '--email' && argv[i + 1]) opts.email = argv[++i];
    else if (argv[i] === '--password' && argv[i + 1]) opts.password = argv[++i];
    else if (argv[i] === '--out' && argv[i + 1]) opts.out = path.resolve(argv[++i]);
    else if (argv[i] === '--family-id' && argv[i + 1]) opts.familyId = argv[++i];
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(`Migration export CLI — download family data ZIP via admin API.

Options:
  --url <base>         App URL (default: MIGRATION_EXPORT_BASE_URL or https://mystarday.se)
  --secret <token>     MIGRATION_EXPORT_SECRET (required)
  --email <email>      Admin email (or ADMIN_EMAIL)
  --password <pass>    Admin password (or ADMIN_PASSWORD, else prompt)
  --out <file.zip>     Output path
  --family-id <uuid>   Export one family only
  --help

Example:
  MIGRATION_EXPORT_SECRET=xxx ADMIN_EMAIL=you@example.com \\
    node scripts/migration-export-cli.js --url https://mystarday.se
`);
      process.exit(0);
    }
  }
  return opts;
}

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  absorb(response) {
    const raw = response.headers.raw()['set-cookie'];
    if (!raw) return;
    for (const line of raw) {
      const part = line.split(';')[0];
      const eq = part.indexOf('=');
      if (eq === -1) continue;
      const name = part.slice(0, eq).trim();
      const value = part.slice(eq + 1).trim();
      this.cookies.set(name, value);
    }
  }

  header() {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }
}

async function main() {
  const opts = parseArgs(process.argv);

  if (!opts.secret) {
    console.error('ERROR: Set MIGRATION_EXPORT_SECRET (env or --secret)');
    process.exit(1);
  }

  if (!opts.email) {
    opts.email = await promptHidden('Admin e-post: ');
  }
  if (!opts.password) {
    opts.password = await promptHidden('Admin lösenord: ');
  }

  const jar = new CookieJar();
  const base = opts.baseUrl;

  console.log(`Loggar in mot ${base} ...`);
  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: opts.email.trim(), password: opts.password }),
  });
  jar.absorb(loginRes);

  const loginBody = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok) {
    console.error('Inloggning misslyckades:', loginBody.error || loginRes.statusText);
    process.exit(1);
  }
  if (!loginBody.user?.isAdmin) {
    console.error('ERROR: Kontot är inte admin (isAdmin=false)');
    process.exit(1);
  }

  const csrfToken = loginBody.csrfToken;
  if (!csrfToken) {
    console.error('ERROR: Inget csrfToken i login-svar');
    process.exit(1);
  }

  console.log('Startar export (kan ta flera minuter) ...');
  const exportRes = await fetch(`${base}/api/admin/migration-export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      'X-Migration-Export-Secret': opts.secret,
      Cookie: jar.header(),
    },
    body: JSON.stringify(opts.familyId ? { familyId: opts.familyId } : {}),
  });

  if (!exportRes.ok) {
    const errText = await exportRes.text();
    let errJson;
    try {
      errJson = JSON.parse(errText);
    } catch {
      errJson = { error: errText.slice(0, 500) };
    }
    console.error('Export misslyckades:', exportRes.status, errJson.error || errText.slice(0, 200));
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(opts.out), { recursive: true });
  const fileStream = fs.createWriteStream(opts.out);
  await new Promise((resolve, reject) => {
    exportRes.body.pipe(fileStream);
    exportRes.body.on('error', reject);
    fileStream.on('finish', resolve);
    fileStream.on('error', reject);
  });

  const stat = fs.statSync(opts.out);
  console.log(`Klar: ${opts.out} (${stat.size} bytes)`);
}

main().catch((err) => {
  console.error('Fel:', err.message);
  process.exit(1);
});
