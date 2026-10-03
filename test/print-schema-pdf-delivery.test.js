'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');

function PdfFileReader() {}
PdfFileReader.prototype.readAsDataURL = function (blob) {
  const reader = this;
  blob.arrayBuffer().then(function (buf) {
    reader.result = 'data:application/pdf;base64,' + Buffer.from(buf).toString('base64');
    if (reader.onload) reader.onload();
  }).catch(function (err) {
    reader.error = err;
    if (reader.onerror) reader.onerror();
  });
};
const FileReaderImpl = typeof FileReader !== 'undefined' ? FileReader : PdfFileReader;

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function loadCore(setup) {
  const location = {
    href: 'https://app.example/print-schema?childId=c1',
    pathname: '/print-schema',
    search: '?childId=c1',
    assign: function () { throw new Error('location.assign'); },
    replace: function () { throw new Error('location.replace'); },
  };
  const clicks = [];
  const objectUrls = [];
  const anchor = {
    href: '',
    download: '',
    rel: '',
    style: {},
    click: function () { clicks.push({ href: anchor.href, download: anchor.download }); },
  };
  const sheet = { scrollWidth: 200, scrollHeight: 100 };
  const container = {
    style: {},
    innerHTML: '',
    setAttribute: function () {},
    querySelector: function () { return sheet; },
  };
  const body = {
    appendChild: function () {},
    removeChild: function () {},
  };
  const sandbox = {
    console,
    setTimeout: function (fn) { fn(); },
    clearTimeout: function () {},
    URL: {
      createObjectURL: function () {
        objectUrls.push('blob:pdf');
        return 'blob:pdf';
      },
      revokeObjectURL: function () {},
    },
    Blob,
    File,
    FileReader: FileReaderImpl,
    document: {
      createElement: function (tag) { return tag === 'a' ? anchor : container; },
      body: body,
      fonts: { ready: Promise.resolve() },
    },
    window: {
      File: File,
      location: location,
      open: function () { throw new Error('window.open'); },
      navigator: {
        canShare: function () { return false; },
        share: async function () { throw new Error('share should not run'); },
      },
    },
  };
  sandbox.window.window = sandbox.window;
  if (setup) setup(sandbox);
  vm.runInNewContext(read('public/js/print-schema-core.js'), sandbox);
  return {
    core: sandbox.window.PrintSchemaCore,
    sandbox: sandbox,
    location: location,
    clicks: clicks,
    objectUrls: objectUrls,
    anchor: anchor,
  };
}

function pdfBlob() {
  return new Blob(['%PDF-1.4'], { type: 'application/pdf' });
}

describe('print schema PDF delivery', () => {
  it('generates a PDF and downloads it on the web without leaving the page', async () => {
    const page = loadCore(function (sandbox) {
      sandbox.html2canvas = async function () {
        return {
          width: 200,
          height: 100,
          toDataURL: function () { return 'data:image/png;base64,xx'; },
        };
      };
      sandbox.jspdf = {
        jsPDF: function () {
          this.internal = {
            pageSize: {
              getWidth: function () { return 297; },
              getHeight: function () { return 210; },
            },
          };
          this.addImage = function () {};
          this.output = function (kind) {
            assert.equal(kind, 'blob');
            return pdfBlob();
          };
          this.save = function () { throw new Error('pdf.save'); };
        },
      };
    });
    const result = await page.core.downloadPdf(
      { styles: '', body: '<div class="sheet"></div>', title: 'Schema' },
      { childName: 'Astrid', myDaysOnly: false }
    );
    assert.equal(result.method, 'download');
    assert.match(result.filename, /\.pdf$/);
    assert.equal(page.clicks.length, 1);
    assert.equal(page.clicks[0].download, result.filename);
    assert.equal(page.location.pathname, '/print-schema');
    assert.equal(page.location.href, 'https://app.example/print-schema?childId=c1');
  });

  it('uses the native file share sheet and does not navigate', async () => {
    const calls = [];
    const page = loadCore(function (sandbox) {
      sandbox.window.Platform = {
        isNative: function () { return true; },
        isIOS: function () { return true; },
        isAndroid: function () { return false; },
      };
      sandbox.window.Capacitor = {
        Plugins: {
          Filesystem: {
            writeFile: async function (opts) {
              calls.push(['write', opts.directory, opts.path]);
              return { uri: 'file:///cache/' + opts.path };
            },
            deleteFile: async function (opts) {
              calls.push(['delete', opts.directory, opts.path]);
            },
          },
          Share: {
            share: async function (opts) {
              calls.push(['share', opts.files[0]]);
            },
          },
        },
      };
    });
    const result = await page.core.deliverPdfBlob(pdfBlob(), 'schema.pdf');
    assert.equal(result.method, 'share');
    assert.deepEqual(calls.map(function (row) { return row[0]; }), ['write', 'share', 'delete']);
    assert.equal(calls[0][1], 'CACHE');
    assert.match(calls[2][2], /schema\.pdf$/);
    assert.match(calls[1][1], /^file:\/\/\/cache\//);
    assert.equal(page.objectUrls.length, 0);
    assert.equal(page.clicks.length, 0);
    assert.equal(page.location.pathname, '/print-schema');
  });

  it('keeps the route when native share is cancelled or fails', async () => {
    const page = loadCore(function (sandbox) {
      sandbox.window.Platform = { isIOS: function () { return true; } };
      sandbox.window.navigator = {
        canShare: function () { return true; },
        share: async function () {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          throw err;
        },
      };
    });
    const cancelled = await page.core.deliverPdfBlob(pdfBlob(), 'schema.pdf');
    assert.equal(cancelled.method, 'cancelled');
    assert.equal(page.objectUrls.length, 0);
    assert.equal(page.location.href, 'https://app.example/print-schema?childId=c1');

    page.sandbox.window.navigator.share = async function () {
      throw new Error('disk full');
    };
    await assert.rejects(
      () => page.core.deliverPdfBlob(pdfBlob(), 'schema.pdf'),
      /disk full/
    );
    assert.equal(page.objectUrls.length, 0);
    assert.equal(page.location.pathname, '/print-schema');
  });

  it('asks for a fresh tap instead of opening a blob URL when iOS blocks the gesture', async () => {
    const page = loadCore(function (sandbox) {
      sandbox.window.Platform = { isIOS: function () { return true; } };
      sandbox.window.navigator = {
        canShare: function () { return false; },
        share: async function () {
          const err = new Error('not allowed');
          err.name = 'NotAllowedError';
          throw err;
        },
      };
    });
    const result = await page.core.deliverPdfBlob(pdfBlob(), 'schema.pdf');
    assert.equal(result.method, 'needs_gesture');
    assert.equal(page.objectUrls.length, 0);
    assert.equal(page.location.pathname, '/print-schema');

    const session = page.core.createPdfDelivery();
    const key = 'child-1|1w|all|0';
    session.remember(key, result);
    assert.equal(session.canSharePending(key), true);
    let shares = 0;
    page.sandbox.window.navigator.share = async function (opts) {
      shares += 1;
      assert.equal(opts.files[0], result.file);
    };
    session.onResume();
    assert.equal(shares, 0);
    assert.equal(session.canSharePending(key), true);
    const shared = await session.sharePending();
    assert.equal(shared.method, 'share');
    assert.equal(shares, 1);
    assert.equal(session.canSharePending(key), false);
    assert.equal(page.location.pathname, '/print-schema');
  });

  it('does not start a second share while one is open, including after resume', async () => {
    const page = loadCore(function (sandbox) {
      sandbox.window.Platform = { isIOS: function () { return true; } };
      sandbox.window.navigator = { share: async function () {}, canShare: function () { return true; } };
    });
    const session = page.core.createPdfDelivery();
    const file = new File([pdfBlob()], 'schema.pdf', { type: 'application/pdf' });
    session.remember('child|1w|all|0', { method: 'needs_gesture', filename: 'schema.pdf', file: file });
    let release;
    let shares = 0;
    page.sandbox.window.navigator.share = function () {
      shares += 1;
      return new Promise(function (resolve) { release = resolve; });
    };
    const first = session.sharePending();
    const second = await session.sharePending();
    assert.equal(second.method, 'busy');
    session.onResume();
    const third = await session.sharePending();
    assert.equal(third.method, 'busy');
    assert.equal(shares, 1);
    release();
    const done = await first;
    assert.equal(done.method, 'share');
    assert.equal(page.location.pathname, '/print-schema');
  });

  it('shares again on a later export and still does not change the route', async () => {
    let shares = 0;
    const page = loadCore(function (sandbox) {
      sandbox.window.Platform = { isIOS: function () { return true; } };
      sandbox.window.navigator = {
        canShare: function () { return true; },
        share: async function () { shares += 1; },
      };
    });
    const first = await page.core.deliverPdfBlob(pdfBlob(), 'one.pdf');
    const second = await page.core.deliverPdfBlob(pdfBlob(), 'two.pdf');
    assert.equal(first.method, 'share');
    assert.equal(second.method, 'share');
    assert.equal(shares, 2);
    assert.equal(page.objectUrls.length, 0);
    assert.equal(page.location.href, 'https://app.example/print-schema?childId=c1');
  });

  it('keeps the web download when file share is unavailable', async () => {
    const page = loadCore();
    const result = await page.core.deliverPdfBlob(pdfBlob(), 'schema.pdf');
    assert.equal(result.method, 'download');
    assert.equal(page.clicks.length, 1);
    assert.equal(page.anchor.download, 'schema.pdf');
    assert.equal(page.location.pathname, '/print-schema');
  });

  it('page export does not navigate and resume does not export again', () => {
    const page = read('public/js/print-schema.js');
    const fn = page.slice(page.indexOf('async function runCreatePdf'), page.indexOf('function applyUrlParams'));
    assert.match(fn, /canSharePending/);
    assert.match(fn, /needs_gesture/);
    assert.match(fn, /printSchema\.toasts\.shareAgain/);
    assert.match(fn, /createPdfError/);
    assert.doesNotMatch(fn, /location\.href|location\.assign|location\.replace|window\.open/);
    assert.doesNotMatch(fn, /loadChildren\(/);
    assert.match(page, /visibilitychange/);
    assert.match(page, /onResume/);
    const core = read('public/js/print-schema-core.js');
    const deliver = core.slice(core.indexOf('async function deliverPdfBlob'), core.indexOf('function createPdfDelivery'));
    assert.match(core, /directory: 'CACHE'/);
    assert.match(deliver, /shareWithPlugins/);
    assert.doesNotMatch(deliver, /location\.href|window\.open|createObjectURL/);
  });
});
