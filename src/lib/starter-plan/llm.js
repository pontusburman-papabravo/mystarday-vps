'use strict';

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const DEFAULT_TIMEOUT_MS = 15000;

/**
 * @param {object} opts
 * @param {string} opts.system
 * @param {string} opts.user
 * @param {number} [opts.timeoutMs]
 */
async function chatJson({ system, user, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const err = new Error('OPENAI_API_KEY_MISSING');
    err.code = 'OPENAI_API_KEY_MISSING';
    throw err;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        response_format: { type: 'json_object' },
        temperature: 0.35,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`OPENAI_HTTP_${res.status}`);
      err.code = 'OPENAI_HTTP_ERROR';
      err.status = res.status;
      err.detail = text.slice(0, 500);
      throw err;
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      const err = new Error('OPENAI_EMPTY_RESPONSE');
      err.code = 'OPENAI_EMPTY_RESPONSE';
      throw err;
    }

    try {
      return JSON.parse(content);
    } catch {
      const err = new Error('OPENAI_INVALID_JSON');
      err.code = 'OPENAI_INVALID_JSON';
      throw err;
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeout = new Error('OPENAI_TIMEOUT');
      timeout.code = 'OPENAI_TIMEOUT';
      throw timeout;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { chatJson, DEFAULT_TIMEOUT_MS };
