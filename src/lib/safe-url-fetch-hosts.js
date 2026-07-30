'use strict';

const { URL } = require('url');

function getR2PublicHostname() {
  const base = process.env.R2_PUBLIC_BASE_URL;
  if (!base) return null;
  try {
    return new URL(base).hostname.toLowerCase();
  } catch {
    return null;
  }
}

module.exports = {
  getR2PublicHostname,
};
