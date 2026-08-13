'use strict';

/**
 * Programmatic test image bytes — no real person photos in git.
 */

function tinyJpegBuffer() {
  return Buffer.from(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
    'base64'
  );
}

function tinyPngBuffer() {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
}

function tinyWebpBuffer() {
  const buf = Buffer.alloc(16);
  buf[0] = 0x52;
  buf[1] = 0x49;
  buf[2] = 0x46;
  buf[3] = 0x46;
  buf[8] = 0x57;
  buf[9] = 0x45;
  buf[10] = 0x42;
  buf[11] = 0x50;
  buf[12] = 0x56;
  buf[13] = 0x50;
  buf[14] = 0x38;
  buf[15] = 0x20;
  return buf;
}

function fakeJpegBuffer() {
  return Buffer.from('<html>not a jpeg</html>', 'utf8');
}

function svgBuffer() {
  return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'utf8');
}

function oversizeActivityBuffer() {
  const header = tinyJpegBuffer();
  return Buffer.concat([header, Buffer.alloc(5 * 1024 * 1024 + 1, 0)]);
}

function oversizeAvatarBuffer() {
  const header = tinyJpegBuffer();
  return Buffer.concat([header, Buffer.alloc(2 * 1024 * 1024 + 1, 0)]);
}

module.exports = {
  tinyJpegBuffer,
  tinyPngBuffer,
  tinyWebpBuffer,
  fakeJpegBuffer,
  svgBuffer,
  oversizeActivityBuffer,
  oversizeAvatarBuffer,
};
