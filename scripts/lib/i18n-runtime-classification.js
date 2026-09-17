'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const CLASSIFICATION_PATH = path.join(ROOT, 'config', 'i18n-runtime-classification.json');
const INVENTORY_PATH = path.join(ROOT, 'config', 'i18n-runtime-inventory.json');
const CLASSES = new Set(['A', 'B', 'C', 'D']);

function loadClassification(filePath = CLASSIFICATION_PATH) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function classifyHit(hit, classification = loadClassification()) {
  const rules = classification.rules || [];
  for (const rule of rules) {
    const prefix = rule.pathPrefix == null ? '' : String(rule.pathPrefix);
    if (prefix && !String(hit.path).startsWith(prefix)) continue;
    if (rule.rule && hit.rule !== rule.rule) continue;
    return {
      class: rule.class,
      reason: rule.reason,
      pathPrefix: prefix,
    };
  }
  return null;
}

function classifyHits(hits, classification = loadClassification()) {
  const classified = [];
  const unclassified = [];
  const byClass = { A: 0, B: 0, C: 0, D: 0 };
  for (const hit of hits) {
    const match = classifyHit(hit, classification);
    if (!match || !CLASSES.has(match.class) || !match.reason) {
      unclassified.push(hit);
      continue;
    }
    byClass[match.class] += 1;
    classified.push({ ...hit, class: match.class, reason: match.reason });
  }
  return { classified, unclassified, byClass };
}

function loadInventory(filePath = INVENTORY_PATH) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

module.exports = {
  ROOT,
  CLASSIFICATION_PATH,
  INVENTORY_PATH,
  CLASSES,
  loadClassification,
  classifyHit,
  classifyHits,
  loadInventory,
};
