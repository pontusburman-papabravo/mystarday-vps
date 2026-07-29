'use strict';

const db = require('./db');
const maps = require('../../config/family-content-locale/sv-to-en.json');
const { normalizeLocale } = require('./locale');

const MEMORY_CACHE_MAX = 1000;
const memoryCache = new Map();

function isRemoteTranslationEnabled() {
  if (process.env.CONTENT_TRANSLATION_REMOTE === 'false') return false;
  if (process.env.NODE_ENV === 'test') return false;
  return true;
}

function cacheKey(sourceLocale, targetLocale, text) {
  return `${sourceLocale}::${targetLocale}::${text}`;
}

function rememberInMemory(key, value) {
  if (memoryCache.size >= MEMORY_CACHE_MAX) {
    const first = memoryCache.keys().next().value;
    memoryCache.delete(first);
  }
  memoryCache.set(key, value);
}

function staticLookup(text, targetLocale) {
  if (targetLocale !== 'en-GB' || !text) return null;
  return maps.activities[text]
    || maps.rewards[text]
    || maps.schedules?.[text]
    || maps.scheduleDescriptions?.[text]
    || null;
}

function looksAlreadyEnglish(text) {
  if (!text) return true;
  if (/[åäöÅÄÖ]/.test(text)) return false;
  return true;
}

async function lookupDbCache(sourceLocale, targetLocale, text) {
  const result = await db.query(
    `SELECT translated_text FROM content_translation_cache
     WHERE source_locale = $1 AND target_locale = $2 AND source_text = $3
     LIMIT 1`,
    [sourceLocale, targetLocale, text]
  );
  return result.rows[0]?.translated_text || null;
}

async function storeDbCache(sourceLocale, targetLocale, sourceText, translatedText) {
  await db.query(
    `INSERT INTO content_translation_cache (source_locale, target_locale, source_text, translated_text, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (source_locale, target_locale, source_text)
     DO UPDATE SET translated_text = EXCLUDED.translated_text, updated_at = NOW()`,
    [sourceLocale, targetLocale, sourceText, translatedText]
  );
}

async function fetchMachineTranslation(text, sourceLocale, targetLocale) {
  if (!isRemoteTranslationEnabled()) return null;

  const sourceLang = (normalizeLocale(sourceLocale) || sourceLocale || 'sv-SE').split('-')[0];
  const targetLang = (normalizeLocale(targetLocale) || targetLocale || 'en-GB').split('-')[0];
  const langpair = `${sourceLang}|${targetLang}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langpair)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const payload = await response.json();
    if (payload?.responseStatus === 429) return null;
    const translated = payload?.responseData?.translatedText;
    if (!translated || typeof translated !== 'string') return null;
    const cleaned = translated.trim();
    if (!cleaned || cleaned === text) return null;
    return cleaned;
  } catch (err) {
    console.warn('[content-translator] Remote translation failed:', err.message);
    return null;
  }
}

/**
 * Translate a single content string (activity/reward name) for display.
 * @param {string} text
 * @param {string} targetLocale
 * @param {string} [sourceLocale]
 * @returns {Promise<string>}
 */
async function translateContentText(text, targetLocale, sourceLocale = 'sv-SE') {
  if (!text) return text;
  const target = normalizeLocale(targetLocale) || targetLocale;
  const source = normalizeLocale(sourceLocale) || sourceLocale;
  if (target !== 'en-GB' || source === target) return text;

  const key = cacheKey(source, target, text);
  if (memoryCache.has(key)) return memoryCache.get(key);

  const staticHit = staticLookup(text, target);
  if (staticHit) {
    rememberInMemory(key, staticHit);
    return staticHit;
  }

  try {
    const dbHit = await lookupDbCache(source, target, text);
    if (dbHit) {
      rememberInMemory(key, dbHit);
      return dbHit;
    }
  } catch (err) {
    console.warn('[content-translator] DB cache lookup failed:', err.message);
  }

  const remote = await fetchMachineTranslation(text, source, target);
  if (remote) {
    rememberInMemory(key, remote);
    try {
      await storeDbCache(source, target, text, remote);
    } catch (err) {
      console.warn('[content-translator] DB cache store failed:', err.message);
    }
    return remote;
  }

  return text;
}

/**
 * Batch-translate unique strings; returns a sync lookup function.
 * @param {string[]} texts
 * @param {string} targetLocale
 * @param {string} [sourceLocale]
 * @returns {Promise<(text: string) => string>}
 */
async function buildContentTranslator(texts, targetLocale, sourceLocale = 'sv-SE') {
  const target = normalizeLocale(targetLocale) || targetLocale;
  if (target !== 'en-GB') {
    return (text) => text;
  }

  const unique = [...new Set((texts || []).filter(Boolean))];
  const map = new Map();
  await Promise.all(unique.map(async (text) => {
    map.set(text, await translateContentText(text, target, sourceLocale));
  }));

  return (text) => {
    if (!text) return text;
    return map.has(text) ? map.get(text) : text;
  };
}

function clearTranslationMemoryCache() {
  memoryCache.clear();
}

module.exports = {
  translateContentText,
  buildContentTranslator,
  clearTranslationMemoryCache,
  staticLookup,
  looksAlreadyEnglish,
};
