'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { parseTapSummary } = require('../../run-full-npm-test.js');
const { STATUS } = require('./constants.cjs');

const ROOT = path.join(__dirname, '../../..');

function testEnv(extra = {}) {
  const env = { ...process.env, ...extra };
  env.NODE_ENV = 'test';
  env.REQUIRE_EMAIL_VERIFICATION = 'false';
  const nvmBin = path.join(process.env.HOME || '', '.nvm/versions/node/v20.20.2/bin');
  if (nvmBin && fs.existsSync(nvmBin)) {
    env.PATH = `${nvmBin}${path.delimiter}${env.PATH || ''}`;
  }
  delete env.RESEND_API_KEY;
  delete env.RESEND_API_KEY_WEEKLY;
  return env;
}

function nodeBin() {
  return process.execPath;
}

function parseFailedFiles(output) {
  const failed = new Set();
  const passed = new Set();
  const fileRe = /(?:^|\s)(test\/[^\s:]+\.test\.js)/g;
  for (const line of output.split('\n')) {
    const isFail = /^\s*not ok\b/.test(line) || line.includes('not ok ');
    const isPass = /^\s*ok \d+/.test(line) && !/not ok/.test(line);
    let m;
    const re = new RegExp(fileRe);
    while ((m = re.exec(line))) {
      if (isFail) failed.add(m[1]);
      else if (isPass) passed.add(m[1]);
    }
    if (line.startsWith('# Subtest: ') && line.includes('test/')) {
      const sub = line.replace('# Subtest: ', '').trim();
      const fileMatch = sub.match(/test\/[^\s]+\.test\.js/);
      if (fileMatch) {
        /* file-level subtest — status comes from following ok/not ok */
        passed.add(fileMatch[0]);
      }
    }
  }
  for (const f of failed) passed.delete(f);
  return { failed: [...failed], passed: [...passed] };
}

function runNodeTest(files, { concurrency = 1, forceExit = false, label } = {}) {
  const existing = files.filter((f) => fs.existsSync(path.join(ROOT, f)));
  const missing = files.filter((f) => !fs.existsSync(path.join(ROOT, f)));
  if (!existing.length) {
    return {
      status: STATUS.NOT_VERIFIED,
      evidence: { label, reason: 'no_test_files', requested: files, missing },
    };
  }

  const args = ['--test', `--test-concurrency=${concurrency}`];
  if (forceExit) args.push('--test-force-exit');
  args.push(...existing);

  const result = spawnSync(nodeBin(), args, {
    cwd: ROOT,
    env: testEnv(),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

  const output = `${result.stdout || ''}${result.stderr || ''}`;
  const summary = parseTapSummary(output);
  const filesHit = parseFailedFiles(output);
  const spawnFailed = result.status !== 0 && result.status !== null;
  const tapFailed = summary.fail > 0 || summary.cancelled > 0;

  if (missing.length && !tapFailed && !spawnFailed) {
    /* missing files are NOT_VERIFIED for those paths but others may PASS */
  }

  let status = STATUS.PASS;
  if (tapFailed || spawnFailed) status = STATUS.BLOCKER;
  else if (summary.pass === 0 && existing.length > 0 && result.status !== 0) {
    status = STATUS.NOT_VERIFIED;
  }

  const failLines = output
    .split('\n')
    .filter((l) => /^\s*not ok\b/.test(l) || l.startsWith('not ok'))
    .slice(0, 40);

  return {
    status,
    evidence: {
      label,
      files: existing,
      missing,
      summary,
      exitCode: result.status,
      failedFiles: filesHit.failed,
      failLines,
    },
  };
}

function runNpmScript(script, { label, extraEnv = {} } = {}) {
  const result = spawnSync('npm', ['run', script], {
    cwd: ROOT,
    env: testEnv(extraEnv),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    shell: false,
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  const summary = parseTapSummary(output);
  const spawnFailed = result.status !== 0 && result.status !== null;
  const tapFailed = summary.fail > 0 || summary.cancelled > 0;
  const failLines = output
    .split('\n')
    .filter((l) => /^\s*not ok\b/.test(l) || l.startsWith('not ok') || /FAIL:/.test(l))
    .slice(0, 40);

  let status = STATUS.PASS;
  if (tapFailed || spawnFailed) status = STATUS.BLOCKER;

  return {
    status,
    evidence: {
      label,
      script: `npm run ${script}`,
      summary,
      exitCode: result.status,
      failLines,
      failedFiles: parseFailedFiles(output).failed,
    },
  };
}

function runNodeScript(relPath, { args = [], label, extraEnv = {}, allowNonZeroAs } = {}) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) {
    return {
      status: STATUS.NOT_VERIFIED,
      evidence: { label, reason: 'script_missing', relPath },
    };
  }
  const result = spawnSync(nodeBin(), [abs, ...args], {
    cwd: ROOT,
    env: { ...process.env, ...extraEnv },
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`.slice(0, 8000);
  if (result.status === 0) {
    return { status: STATUS.PASS, evidence: { label, relPath, exitCode: 0, outputTail: output.slice(-1500) } };
  }
  if (allowNonZeroAs) {
    return {
      status: allowNonZeroAs,
      evidence: { label, relPath, exitCode: result.status, outputTail: output.slice(-1500) },
    };
  }
  return {
    status: STATUS.BLOCKER,
    evidence: { label, relPath, exitCode: result.status, outputTail: output.slice(-1500) },
  };
}

function mapFilesToAreaStatus(area, runResults) {
  const wanted = [...(area.unit || []), ...(area.db || [])];
  if (area.excluded) {
    return { status: STATUS.EXCLUDED, evidence: { reason: 'paused_out_of_scope' } };
  }
  const failed = new Set();
  const seen = new Set();
  const missing = [];
  for (const file of wanted) {
    if (!fs.existsSync(path.join(ROOT, file))) missing.push(file);
  }
  for (const run of runResults) {
    for (const f of run.evidence?.failedFiles || []) {
      if (wanted.includes(f)) failed.add(f);
    }
    for (const f of run.evidence?.files || []) {
      if (wanted.includes(f)) seen.add(f);
    }
    const listed = run.evidence?.script;
    if (listed && run.status === STATUS.BLOCKER) {
      for (const f of run.evidence?.failedFiles || []) {
        if (wanted.includes(f)) failed.add(f);
      }
    }
  }

  if (failed.size) {
    return {
      status: STATUS.BLOCKER,
      evidence: { failedFiles: [...failed], missing, files: wanted },
    };
  }
  if (missing.length) {
    return {
      status: STATUS.NOT_VERIFIED,
      evidence: { reason: 'test_files_missing', missing, files: wanted },
    };
  }
  return {
    status: STATUS.PASS,
    evidence: { files: wanted, note: 'No failures in area test files.' },
  };
}

module.exports = {
  testEnv,
  runNodeTest,
  runNpmScript,
  runNodeScript,
  mapFilesToAreaStatus,
  parseFailedFiles,
};
