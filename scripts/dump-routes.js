#!/usr/bin/env node
'use strict';

/**
 * Dump all Express routes + global middleware order for E0 baseline inventory.
 * Usage:
 *   node scripts/dump-routes.js              # stdout
 *   node scripts/dump-routes.js --write      # docs/route-inventory-pre-split.md
 *   node scripts/dump-routes.js --check      # exit 1 if doc differs
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO_ROOT = path.join(__dirname, '..');
const OUT_PATH = path.join(REPO_ROOT, 'docs/route-inventory-pre-split.md');
const ROUTES_INDEX = path.join(REPO_ROOT, 'src/routes/index.js');

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://mock_test:mock@localhost:5432/mock_test';
}
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dump-routes-dev-secret-at-least-32-chars';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

function pathFromRegexp(regexp) {
  if (!regexp || regexp.fast_slash) return '';
  let src = regexp.source
    .replace(/^\^\\\/?/, '')
    .replace(/\\\/\?\(\?=\\\/\|\$\)/g, '')
    .replace(/\(\?=\\\/\|\$\)/g, '')
    .replace(/\\\//g, '/')
    .replace(/\$$/, '');
  src = src.replace(/\(\?:\(\[\^\/\]\+\?\)\)/g, ':param');
  src = src.replace(/\(\[\^\/\]\+\?\)/g, ':param');
  src = src.replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g, ':param');
  src = src.replace(/\(\[\^\\\/\]\+\?\)/g, ':param');
  return src === '' ? '' : `/${src}`.replace(/\/+/g, '/').replace(/\/$/, '') || '';
}

function joinPaths(prefix, segment) {
  const a = prefix === '/' ? '' : prefix;
  const b = segment.startsWith('/') ? segment : `/${segment}`;
  const joined = `${a}${b}` || '/';
  return joined.replace(/\/+/g, '/').replace(/:(\w+)\/(?=:|$)/g, ':$1');
}

function middlewareLabel(layer) {
  if (!layer) return 'unknown';
  if (layer.name && layer.name !== '<anonymous>') return layer.name;
  if (layer.handle?.name) return layer.handle.name;
  return 'anonymous';
}

function loadMountHints() {
  const hints = new Map();
  for (const file of [ROUTES_INDEX, path.join(REPO_ROOT, 'app.js')]) {
    const src = fs.readFileSync(file, 'utf8');
    const re = /app\.use\(\s*'([^']*)'\s*,\s*require\('\.\/([^']+)'\)(?:\.(\w+))?/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const [, mount, routeFile, exportName] = m;
      const key = mount || '/';
      const rel = exportName
        ? `src/routes/${routeFile}.js (${exportName})`
        : `src/routes/${routeFile}.js`;
      if (!hints.has(key)) hints.set(key, rel);
    }
    const reGet = /app\.get\(\s*'([^']+)'/g;
    while ((m = reGet.exec(src)) !== null) {
      const owner = file.endsWith('app.js') ? 'app.js (inline)' : 'src/routes/index.js (inline)';
      hints.set(m[1], owner);
    }
    const rePost = /app\.post\(\s*'([^']+)'/g;
    while ((m = rePost.exec(src)) !== null) {
      hints.set(m[1], 'app.js (inline)');
    }
  }
  return hints;
}

function guessSource(mountPath, mountHints) {
  const normalized = mountPath.replace(/\/$/, '') || '/';
  if (mountHints.has(normalized)) return mountHints.get(normalized);
  const parts = normalized.split('/').filter(Boolean);
  while (parts.length) {
    const candidate = `/${parts.join('/')}`;
    if (mountHints.has(candidate)) return mountHints.get(candidate);
    parts.pop();
  }
  return '—';
}

function collectRoutes(stack, prefix, inheritedMiddleware, mountHints, out) {
  const localMiddleware = [...inheritedMiddleware];

  for (const layer of stack) {
    if (layer.route) {
      const routePath = joinPaths(prefix, layer.route.path);
      const methods = Object.keys(layer.route.methods).filter((m) => layer.route.methods[m]);
      for (const method of methods) {
        out.push({
          method: method.toUpperCase(),
          path: routePath,
          source: guessSource(routePath, mountHints),
          middleware: [...localMiddleware],
        });
      }
      continue;
    }

    if (layer.name === 'router' && layer.handle?.stack) {
      const mountSegment = pathFromRegexp(layer.regexp);
      const nextPrefix = joinPaths(prefix, mountSegment);
      // Route-local middleware only — reset when entering a mounted router.
      collectRoutes(layer.handle.stack, nextPrefix, [], mountHints, out);
      continue;
    }

    if (inheritedMiddleware.length > 0 || localMiddleware.length > 0) {
      localMiddleware.push(middlewareLabel(layer));
    }
  }
}

function collectGlobalMiddleware(stack) {
  const globals = [];
  for (const layer of stack) {
    if (layer.route) break;
    if (layer.name === 'router' && layer.handle?.stack) {
      const mount = pathFromRegexp(layer.regexp);
      if (mount) {
        globals.push({ kind: 'mount', name: mount || '/', label: `router mount ${mount}` });
      }
      break;
    }
    globals.push({ kind: 'middleware', name: middlewareLabel(layer) });
  }
  return globals;
}

function globalMiddlewareDoc() {
  return [
    '1. request timeout (30s)',
    '2. POST /api/resend/webhook (raw body, resendWebhookLimiter) — before express.json',
    '3. trust proxy',
    '4. express.json',
    '5. cookieParser',
    '6. requestIdMiddleware',
    '7. restoreParentSession',
    '8. optionalAuth',
    '9. globalLimiter',
    '10. platformHtmlInject',
    '11. securityHeadersMiddleware',
    '12. GET /health, /.well-known/*, /api/i18n/*',
    '13. createDomainRedirect',
    '14. /api Cache-Control headers',
    '15. csrfProtect (/api)',
    '16. blockImpersonationWrites (/api)',
    '17. childParentApiBlock + apiLimiter (/api)',
    '18. checkMaintenanceMode (before registerRoutes — API 503; /api/iap exempt)',
    '19. registerRoutes(app) — all API + HTML routes',
    '20. express.static public/',
    '21. express.static /uploads',
    '22. express.static /V2.0',
    '23. public-pages router',
    '24. 404 JSON (/api) / redirect (HTML)',
    '25. error handler',
  ];
}

function buildInventory() {
  const { createApp } = require('../app');
  const app = createApp();
  const mountHints = loadMountHints();
  const routes = [];
  collectRoutes(app._router.stack, '', [], mountHints, routes);

  routes.sort((a, b) => {
    const pc = a.path.localeCompare(b.path);
    if (pc !== 0) return pc;
    return a.method.localeCompare(b.method);
  });

  const globals = collectGlobalMiddleware(app._router.stack);
  const generatedAt = 'E0 baseline (pre-split)';
  const lines = [
    '# Express route inventory (pre-split baseline)',
    '',
    `> **E0 snapshot** — generated by \`node scripts/dump-routes.js --write\`.`,
    `> Date: ${generatedAt} · Routes: ${routes.length}`,
    `> Re-run and diff after each E3b/E1/E2 step.`,
    '',
    '## Global middleware order (`app.js` → `createApp`)',
    '',
    ...globalMiddlewareDoc().map((l) => `- ${l}`),
    '',
    '## Runtime global layers (from `app._router.stack` head)',
    '',
    '| # | Layer |',
    '|---|-------|',
    ...globals.map((g, i) => `| ${i + 1} | ${g.kind === 'mount' ? g.label : g.name} |`),
    '',
    '## Routes',
    '',
    '| Method | Path | Source (mount hint) | Route middleware chain |',
    '|--------|------|---------------------|-------------------------|',
  ];

  for (const r of routes) {
    const mw = r.middleware.length ? r.middleware.join(' → ') : '—';
    const esc = (s) => String(s).replace(/\|/g, '\\|');
    lines.push(`| ${r.method} | \`${esc(r.path)}\` | ${esc(r.source)} | ${esc(mw)} |`);
  }

  lines.push('');
  return `${lines.join('\n')}\n`;
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function main() {
  const write = process.argv.includes('--write');
  const check = process.argv.includes('--check');
  const body = buildInventory();

  if (write) {
    fs.writeFileSync(OUT_PATH, body, 'utf8');
    console.log(`Wrote ${OUT_PATH} (${body.split('\n').length} lines)`);
    return;
  }

  if (check) {
    if (!fs.existsSync(OUT_PATH)) {
      console.error(`Missing ${OUT_PATH} — run with --write`);
      process.exit(1);
    }
    const existing = fs.readFileSync(OUT_PATH, 'utf8');
    if (sha256(existing) !== sha256(body)) {
      console.error('Route inventory drift — re-run: node scripts/dump-routes.js --write');
      process.exit(1);
    }
    console.log('Route inventory OK (matches committed snapshot)');
    return;
  }

  process.stdout.write(body);
}

main();
