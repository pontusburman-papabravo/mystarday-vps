'use strict';

/**
 * Canonical 8 emotion keys — shared by app (mood cards), ratings API, and resurser R2.
 */

const EMOTION_KEYS = [
  'happy',
  'angry',
  'sad',
  'tired',
  'worried',
  'proud',
  'scared',
  'stressed',
];

const EMOTION_KEY_SET = new Set(EMOTION_KEYS);

function isValidEmotionKey(key) {
  return typeof key === 'string' && EMOTION_KEY_SET.has(key);
}

module.exports = {
  EMOTION_KEYS,
  EMOTION_KEY_SET,
  isValidEmotionKey,
};
