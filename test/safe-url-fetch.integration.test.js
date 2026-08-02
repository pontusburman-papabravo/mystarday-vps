'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const zlib = require('zlib');
const dns = require('dns').promises;
const {
  safeFetchImageUrl,
  isPrivateOrBlockedIp,
  resolveHostAllowed,
} = require('../src/lib/safe-url-fetch');
const { getR2PublicHostname } = require('../src/lib/safe-url-fetch-hosts');

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46]);
const LOOPBACK = { allowLoopback: true };

function listenServer(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

describe('safe-url-fetch integration (local servers + controlled DNS)', () => {
  test('blocks metadata and link-local literal IPs', () => {
    assert.equal(isPrivateOrBlockedIp('169.254.169.254'), true);
    assert.equal(isPrivateOrBlockedIp('169.254.0.1'), true);
    assert.equal(isPrivateOrBlockedIp('::1'), true);
    assert.equal(isPrivateOrBlockedIp('127.0.0.1'), true);
  });

  test('blocks IPv4-mapped IPv6 loopback', () => {
    assert.equal(isPrivateOrBlockedIp('::ffff:127.0.0.1'), true);
  });

  test('blocks RFC1918', () => {
    assert.equal(isPrivateOrBlockedIp('10.0.0.1'), true);
    assert.equal(isPrivateOrBlockedIp('192.168.0.1'), true);
  });

  test('resolveHostAllowed rejects localhost', async () => {
    assert.equal(await resolveHostAllowed('localhost'), false);
  });

  test('credentials in URL rejected before fetch', async () => {
    await assert.rejects(
      () => safeFetchImageUrl('http://user:pass@example.com/x.jpg'),
      (e) => e.code === 'CREDENTIALS_IN_URL'
    );
  });

  test('redirect to private IP is blocked', async () => {
    const { server, port } = await listenServer((req, res) => {
      res.writeHead(302, { Location: 'http://169.254.169.254/latest/meta-data' });
      res.end();
    });
    try {
      await assert.rejects(
        () => safeFetchImageUrl(`http://127.0.0.1:${port}/start.jpg`, LOOPBACK),
        (e) => e.code === 'BLOCKED_HOST' || e.code === 'REDIRECT_LIMIT'
      );
    } finally {
      server.close();
    }
  });

  test('redirect loop hits REDIRECT_LIMIT', async () => {
    const { server, port } = await listenServer((req, res) => {
      res.writeHead(302, { Location: `http://127.0.0.1:${port}/loop.jpg` });
      res.end();
    });
    try {
      await assert.rejects(
        () => safeFetchImageUrl(`http://127.0.0.1:${port}/start.jpg`, LOOPBACK),
        (e) => e.code === 'REDIRECT_LIMIT'
      );
    } finally {
      server.close();
    }
  });

  test('too many redirects', async () => {
    let hops = 0;
    const { server, port } = await listenServer((req, res) => {
      hops += 1;
      res.writeHead(302, { Location: `http://127.0.0.1:${port}/hop${hops}.jpg` });
      res.end();
    });
    try {
      await assert.rejects(
        () => safeFetchImageUrl(`http://127.0.0.1:${port}/a.jpg`, LOOPBACK),
        (e) => e.code === 'REDIRECT_LIMIT'
      );
      assert.ok(hops >= 1);
    } finally {
      server.close();
    }
  });

  test('timeout before headers', async () => {
    const { server, port } = await listenServer(() => {});
    try {
      await assert.rejects(
        () => safeFetchImageUrl(`http://127.0.0.1:${port}/slow.jpg`, { ...LOOPBACK, timeoutMs: 200 }),
        (e) => e.code === 'TIMEOUT'
      );
    } finally {
      server.close();
    }
  });

  test('timeout mid body', async () => {
    const { server, port } = await listenServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      res.write(JPEG);
      const interval = setInterval(() => {
        res.write(Buffer.alloc(32 * 1024));
      }, 50);
      req.on('close', () => clearInterval(interval));
    });
    try {
      await assert.rejects(
        () => safeFetchImageUrl(`http://127.0.0.1:${port}/drip.jpg`, {
          ...LOOPBACK,
          timeoutMs: 300,
          maxBytes: 64 * 1024,
        }),
        (e) => e.code === 'TIMEOUT' || e.code === 'TOO_LARGE'
      );
    } finally {
      server.close();
    }
  });

  test('chunked response over maxBytes without Content-Length', async () => {
    const big = Buffer.concat([JPEG, Buffer.alloc(200 * 1024)]);
    const { server, port } = await listenServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Transfer-Encoding': 'chunked' });
      res.end(big);
    });
    try {
      await assert.rejects(
        () => safeFetchImageUrl(`http://127.0.0.1:${port}/big.jpg`, { ...LOOPBACK, maxBytes: 4096 }),
        (e) => e.code === 'TOO_LARGE'
      );
    } finally {
      server.close();
    }
  });

  test('gzip body over limit fails magic or size check', async () => {
    const raw = Buffer.concat([JPEG, Buffer.alloc(300 * 1024)]);
    const gz = zlib.gzipSync(raw);
    const { server, port } = await listenServer((req, res) => {
      res.writeHead(200, {
        'Content-Type': 'image/jpeg',
        'Content-Encoding': 'gzip',
        'Content-Length': String(gz.length),
      });
      res.end(gz);
    });
    try {
      await assert.rejects(
        () => safeFetchImageUrl(`http://127.0.0.1:${port}/gz.jpg`, { ...LOOPBACK, maxBytes: 4096 }),
        (e) => e.code === 'TOO_LARGE' || e.code === 'NOT_IMAGE'
      );
    } finally {
      server.close();
    }
  });

  test('wrong magic bytes with image content-type', async () => {
    const { server, port } = await listenServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      res.end(Buffer.from('not-an-image'));
    });
    try {
      await assert.rejects(
        () => safeFetchImageUrl(`http://127.0.0.1:${port}/fake.jpg`, LOOPBACK),
        (e) => e.code === 'NOT_IMAGE'
      );
    } finally {
      server.close();
    }
  });

  test('multi-dns with private address fails closed', async () => {
    const orig = dns.lookup;
    dns.lookup = async () => [
      { address: '8.8.8.8', family: 4 },
      { address: '10.0.0.5', family: 4 },
    ];
    try {
      assert.equal(await resolveHostAllowed('mixed-dns.invalid'), false);
    } finally {
      dns.lookup = orig;
    }
  });

  test('successful fetch on loopback test server', async () => {
    const { server, port } = await listenServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': String(JPEG.length) });
      res.end(JPEG);
    });
    try {
      const result = await safeFetchImageUrl(`http://127.0.0.1:${port}/ok.jpg`, LOOPBACK);
      assert.ok(result.buffer.length >= 3);
      assert.match(result.contentType, /^image\//);
    } finally {
      server.close();
    }
  });

  test('R2 hostname policy when R2_PUBLIC_BASE_URL set', () => {
    const prev = process.env.R2_PUBLIC_BASE_URL;
    process.env.R2_PUBLIC_BASE_URL = 'https://cdn.example.test';
    try {
      assert.equal(getR2PublicHostname(), 'cdn.example.test');
    } finally {
      if (prev === undefined) delete process.env.R2_PUBLIC_BASE_URL;
      else process.env.R2_PUBLIC_BASE_URL = prev;
    }
  });
});
