'use strict';

const { cookieHeader } = require('./http.js');

/** Match server resolveLocalUploadPath — avoids greedy-regex stripping nested /uploads/ prefix. */
function localUploadRelPath(imageUrl) {
  const pathname = new URL(imageUrl).pathname;
  if (!pathname.startsWith('/uploads/')) {
    throw new Error(`Not an upload URL: ${imageUrl}`);
  }
  return pathname.slice('/uploads/'.length);
}

async function uploadMultipart(baseUrl, path, session, { buffer, filename, mime }) {
  const form = new FormData();
  form.append('image', new Blob([buffer], { type: mime }), filename);
  const headers = { Cookie: cookieHeader(session.cookies) };
  if (session.csrfToken) headers['X-CSRF-Token'] = session.csrfToken;
  const res = await fetch(`${baseUrl}${path}`, { method: 'POST', headers, body: form });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
}

async function putAvatarMultipart(baseUrl, path, session, { buffer, filename, mime }) {
  const form = new FormData();
  form.append('image', new Blob([buffer], { type: mime }), filename);
  return fetch(`${baseUrl}${path}`, {
    method: 'PUT',
    headers: {
      Cookie: cookieHeader(session.cookies),
      'X-CSRF-Token': session.csrfToken,
    },
    body: form,
  });
}

module.exports = { uploadMultipart, putAvatarMultipart, localUploadRelPath };
