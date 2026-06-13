#!/usr/bin/env node
/**
 * Minimal GitHub webhook listener that triggers deploy.sh on push to a branch.
 *
 * Uses only Node built-ins (http, crypto, child_process) — no dependencies.
 * Verifies the GitHub HMAC signature (X-Hub-Signature-256) before doing
 * anything, so the endpoint is safe to expose publicly.
 *
 * Env:
 *   DEPLOY_WEBHOOK_SECRET   required — must match the GitHub webhook secret
 *   DEPLOY_WEBHOOK_PORT     listen port                  (default: 9001)
 *   DEPLOY_WEBHOOK_BRANCH   branch to act on             (default: main)
 *   DEPLOY_WEBHOOK_PATH     URL path to accept POSTs on  (default: /deploy)
 *
 * Any extra env (e.g. DEPLOY_SERVICE_NAME, DEPLOY_BRANCH) is passed through to
 * deploy.sh.
 */
'use strict';

const http = require('http');
const crypto = require('crypto');
const { execFile } = require('child_process');
const path = require('path');

const PORT = Number(process.env.DEPLOY_WEBHOOK_PORT || 9001);
const SECRET = process.env.DEPLOY_WEBHOOK_SECRET;
const BRANCH = process.env.DEPLOY_WEBHOOK_BRANCH || 'main';
const URL_PATH = process.env.DEPLOY_WEBHOOK_PATH || '/deploy';
const SCRIPT = path.join(__dirname, 'deploy.sh');
const MAX_BODY = 5 * 1024 * 1024; // 5 MB guard

if (!SECRET) {
  console.error('[webhook] DEPLOY_WEBHOOK_SECRET is required');
  process.exit(1);
}

let deploying = false;

function signatureValid(signature, body) {
  if (!signature) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function runDeploy(after) {
  deploying = true;
  console.log(`[webhook] deploying ${after}`);
  execFile('bash', [SCRIPT], { env: process.env, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
    deploying = false;
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
    if (err) console.error('[webhook] deploy FAILED:', err.message);
    else console.log('[webhook] deploy complete');
  });
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== URL_PATH) {
    res.writeHead(404);
    return res.end('not found');
  }

  const chunks = [];
  let size = 0;
  let aborted = false;
  req.on('data', (c) => {
    if (aborted) return;
    size += c.length;
    if (size > MAX_BODY) {
      aborted = true;
      res.writeHead(413);
      res.end('payload too large');
      req.destroy();
      return;
    }
    chunks.push(c);
  });
  req.on('end', () => {
    if (aborted) return;
    const body = Buffer.concat(chunks);

    if (!signatureValid(req.headers['x-hub-signature-256'], body)) {
      res.writeHead(401);
      return res.end('invalid signature');
    }

    const event = req.headers['x-github-event'];
    if (event === 'ping') {
      res.writeHead(200);
      return res.end('pong');
    }
    if (event !== 'push') {
      res.writeHead(204);
      return res.end();
    }

    let payload;
    try {
      payload = JSON.parse(body.toString('utf8'));
    } catch {
      res.writeHead(400);
      return res.end('bad json');
    }

    if (payload.ref !== `refs/heads/${BRANCH}`) {
      res.writeHead(200);
      return res.end(`ignored ref ${payload.ref}`);
    }
    if (deploying) {
      res.writeHead(200);
      return res.end('deploy already in progress');
    }

    res.writeHead(202);
    res.end('deploy started');
    runDeploy(payload.after);
  });
});

server.listen(PORT, () => {
  console.log(`[webhook] listening on :${PORT}${URL_PATH} (branch ${BRANCH})`);
});
