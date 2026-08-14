'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..');
const DEPLOY_SH = path.join(REPO_ROOT, 'scripts/vps-deploy-revision.sh');

function deployStepOrder(script) {
  const names = [];
  for (const line of script.split('\n')) {
    const m = line.match(/^\s*echo "→ (.+)"/);
    if (m) names.push(m[1]);
  }
  return names;
}

function sectionBetween(script, startNeedle, endNeedle) {
  const start = script.indexOf(startNeedle);
  const end = script.indexOf(endNeedle, start + 1);
  assert.ok(start >= 0, `missing ${startNeedle}`);
  assert.ok(end > start, `missing end ${endNeedle}`);
  return script.slice(start, end);
}

function extractInlineIdentityFunctions(script) {
  const start = script.indexOf('sync_deploy_sha_env()');
  const end = script.indexOf('ROLLBACK_SHA=""');
  assert.ok(start >= 0, 'missing sync_deploy_sha_env');
  assert.ok(end > start, 'missing ROLLBACK_SHA marker');
  return script.slice(start, end);
}

function runGit(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 'test', GIT_AUTHOR_EMAIL: 'test@example.com', GIT_COMMITTER_NAME: 'test', GIT_COMMITTER_EMAIL: 'test@example.com' } }).trim();
}

describe('deploy release identity contract', () => {
  const sh = fs.readFileSync(DEPLOY_SH, 'utf8');

  test('identity sync is inlined and bootstrap-self-contained', () => {
    assert.match(sh, /sync_deploy_identity\(\)/);
    assert.match(sh, /sync_deploy_sha_env\(\)/);
    assert.doesNotMatch(sh, /source "\$\{VPS_APP_PATH\}\/scripts\/ops\/lib\/sync-deploy-identity\.sh"/);
    assert.doesNotMatch(sh, /sync-deploy-identity\.sh/);
    assert.doesNotMatch(sh, /\.bak\.deploy-sha/);
    assert.ok(!fs.existsSync(path.join(REPO_ROOT, 'scripts/ops/lib/sync-deploy-identity.sh')));
  });

  test('PRE_TARGET_CHECKOUT_SOURCE_FROM_VPS_APP_PATH = NONE', () => {
    const preCheckout = sectionBetween(sh, 'cd "$VPS_APP_PATH"', 'echo "→ Checkout target revision"');
    assert.doesNotMatch(preCheckout, /source\s+.*VPS_APP_PATH/);
    assert.doesNotMatch(preCheckout, /source\s+.*\$VPS_APP_PATH/);
    assert.doesNotMatch(preCheckout, /bash\s+.*VPS_APP_PATH/);
    assert.match(preCheckout, /sync_deploy_identity\(\)/);
  });

  test('SCENARIO 1: backup gate failure — no target identity before restart; rollback syncs previous', () => {
    const preRestart = sectionBetween(sh, 'echo "→ Checkout target revision"', 'echo "→ commit release identity before restart"');
    assert.doesNotMatch(preRestart, /sync_deploy_identity "\$TARGET_SHA"/);
    assert.doesNotMatch(preRestart, /echo "\$TARGET_SHA" > data\/deployed-sha/);
    assert.match(sh, /rollback_to_sha\(\)/);
    assert.match(sh, /sync_deploy_identity "\$sha"/);
    const rollbackBody = sh.slice(sh.indexOf('rollback_to_sha()'), sh.indexOf('PREV_SHA='));
    const gateFailBlock = sh.slice(sh.indexOf('pre-deploy backup gate failed'), sh.indexOf('log_deploy_summary failed', sh.indexOf('pre-deploy backup gate failed')));
    assert.match(gateFailBlock, /rollback_to_sha "\$PREV_SHA"/);
    assert.match(rollbackBody, /sync_deploy_identity "\$sha"/);
  });

  test('SCENARIO 2: npm ci failure — same pre-restart identity invariant', () => {
    const preRestart = sectionBetween(sh, 'echo "→ Checkout target revision"', 'echo "→ commit release identity before restart"');
    assert.doesNotMatch(preRestart, /sync_deploy_identity/);
    const npmFail = sh.slice(sh.indexOf('npm ci failed'), sh.indexOf('log_deploy_summary failed', sh.indexOf('npm ci failed')));
    assert.match(npmFail, /rollback_to_sha "\$PREV_SHA"/);
  });

  test('SCENARIO 3: successful deploy commits target identity immediately before restart', () => {
    const steps = deployStepOrder(sh);
    const identityIdx = steps.indexOf('commit release identity before restart');
    const restartIdx = steps.indexOf('restart app');
    const migrateCompareIdx = steps.lastIndexOf('post-migrate snapshot compare (migration-aware)');
    assert.ok(identityIdx > migrateCompareIdx);
    assert.ok(restartIdx === identityIdx + 1);
    const identityBlock = sh.slice(
      sh.indexOf('echo "→ commit release identity before restart"'),
      sh.indexOf('echo "→ restart app"')
    );
    assert.match(identityBlock, /sync_deploy_identity "\$TARGET_SHA"/);
  });

  test('SCENARIO 4: rollback restores identity before previous restart', () => {
    const rollbackBody = sh.slice(sh.indexOf('rollback_to_sha()'), sh.indexOf('PREV_SHA='));
    const syncIdx = rollbackBody.indexOf('sync_deploy_identity "$sha"');
    const npmIdx = rollbackBody.indexOf('npm ci --legacy-peer-deps');
    const restartIdx = rollbackBody.indexOf('systemctl restart');
    assert.ok(syncIdx >= 0 && syncIdx < npmIdx);
    assert.ok(npmIdx < restartIdx);
  });

  test('SCENARIO 5: forward-fix skip path does not commit target identity on main deploy path', () => {
    const preRestart = sectionBetween(sh, 'echo "→ Checkout target revision"', 'echo "→ commit release identity before restart"');
    assert.doesNotMatch(preRestart, /sync_deploy_identity "\$TARGET_SHA"/);
    assert.match(sh, /automatic code rollback skipped/);
  });

  test('SCENARIO 6: pre-restart failures never advertise target SHA via identity helper', () => {
    const preRestart = sectionBetween(sh, 'echo "→ Checkout target revision"', 'echo "→ commit release identity before restart"');
    assert.doesNotMatch(preRestart, /sync_deploy_identity/);
    assert.doesNotMatch(preRestart, /data\/deployed-sha/);
    assert.doesNotMatch(preRestart, /DEPLOY_SHA=\$\{TARGET_SHA\}/);
  });
});

describe('sync_deploy_identity inline execution', () => {
  test('writes data/deployed-sha and .env DEPLOY_SHA atomically', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-id-'));
    const prevSha = '5eb4edf79be6b19d643697a873694b6a4ff7bf3f';
    const nextSha = '00ebb2004a5a60b7ca71ab869215d894a071b800';
    fs.mkdirSync(path.join(tmp, 'data'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'data', 'deployed-sha'), `${nextSha}\n`);
    fs.writeFileSync(path.join(tmp, '.env'), `DEPLOY_SHA=${nextSha}\nOTHER=1\n`);

    const fnBlock = extractInlineIdentityFunctions(fs.readFileSync(DEPLOY_SH, 'utf8'));
    execFileSync('bash', ['-lc', `
      set -euo pipefail
      export VPS_APP_PATH="${tmp}"
      ${fnBlock}
      sync_deploy_identity "${prevSha}"
    `]);

    const fileSha = fs.readFileSync(path.join(tmp, 'data', 'deployed-sha'), 'utf8').trim();
    const env = fs.readFileSync(path.join(tmp, '.env'), 'utf8');
    assert.equal(fileSha, prevSha);
    assert.match(env, new RegExp(`^DEPLOY_SHA=${prevSha}$`, 'm'));
    assert.match(env, /^OTHER=1$/m);
    assert.doesNotMatch(env, /\.bak\.deploy-sha/);
  });
});

describe('deploy bootstrap from stale worktree', () => {
  test('BOOTSTRAP_FROM_STALE_WORKTREE = PASS', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-bootstrap-'));
    const bare = path.join(tmp, 'origin.git');
    const appPath = path.join(tmp, 'app');
    const extractedScript = path.join(tmp, 'vps-deploy-revision.sh');

    runGit(tmp, ['init', '--bare', bare]);
    execFileSync('git', ['clone', bare, appPath], { stdio: 'pipe' });

    fs.mkdirSync(path.join(appPath, 'scripts'), { recursive: true });
    fs.writeFileSync(path.join(appPath, 'README.md'), 'old deployed revision\n');
    runGit(appPath, ['add', 'README.md']);
    runGit(appPath, ['commit', '-m', 'old deployed revision']);
    const oldSha = runGit(appPath, ['rev-parse', 'HEAD']);

    fs.mkdirSync(path.join(appPath, 'scripts'), { recursive: true });
    fs.copyFileSync(DEPLOY_SH, path.join(appPath, 'scripts/vps-deploy-revision.sh'));
    runGit(appPath, ['add', 'scripts/vps-deploy-revision.sh']);
    runGit(appPath, ['commit', '-m', 'target deploy script with inline identity']);
    const newSha = runGit(appPath, ['rev-parse', 'HEAD']);

    runGit(appPath, ['push', 'origin', 'HEAD']);
    runGit(appPath, ['checkout', '--detach', oldSha]);

    assert.ok(!fs.existsSync(path.join(appPath, 'scripts/ops/lib/sync-deploy-identity.sh')));
    assert.equal(runGit(appPath, ['rev-parse', 'HEAD']), oldSha);

    runGit(appPath, ['fetch', '--depth', '1', 'origin', newSha]);
    execFileSync('bash', ['-lc', `git show "${newSha}:scripts/vps-deploy-revision.sh" > "${extractedScript}" && chmod +x "${extractedScript}"`], { cwd: appPath });

    let output = '';
    let exitCode = 0;
    try {
      execFileSync('bash', [extractedScript], {
        cwd: appPath,
        encoding: 'utf8',
        env: {
          ...process.env,
          DEPLOY_SHA: newSha,
          VPS_APP_PATH: appPath,
          PATH: process.env.PATH,
        },
        timeout: 15000,
      });
    } catch (err) {
      exitCode = err.status ?? 1;
      output = `${err.stdout || ''}${err.stderr || ''}`;
    }

    assert.doesNotMatch(output, /sync-deploy-identity\.sh: No such file or directory/);
    assert.doesNotMatch(output, /No such file or directory.*sync-deploy-identity/);
    assert.match(output, /Previous deployed SHA/);
    assert.match(output, /Target deploy SHA/);
    assert.match(output, /Checkout target revision/);
    assert.notEqual(exitCode, 127);
  });
});

describe('deploy safety semantics preserved', () => {
  test('backup gate and snapshot contracts unchanged', () => {
    const sh = fs.readFileSync(DEPLOY_SH, 'utf8');
    assert.match(sh, /pre-deploy-backup-gate\.mjs/);
    assert.match(sh, /compare-db-snapshots\.mjs/);
    assert.match(sh, /verify-deploy-release-identity\.mjs/);
    assert.doesNotMatch(sh, /--skip-test-gate/);
    assert.doesNotMatch(sh, /BACKUP_REQUIRED=0/);
  });
});
