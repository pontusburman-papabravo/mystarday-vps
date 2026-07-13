/** Per-scene colour treatment for emotional arc (cool stress → warm calm). */

const PRESETS = {
  cool: {
    eq: 'eq=saturation=0.82:contrast=1.1:brightness=-0.02',
    colorbalance: 'colorbalance=rs=-0.04:gs=0:bs=0.06',
  },
  neutral: {
    eq: 'eq=saturation=0.94:contrast=1.02',
    colorbalance: '',
  },
  warm: {
    eq: 'eq=saturation=1.04:contrast=0.98:brightness=0.01',
    colorbalance: 'colorbalance=rs=0.05:gs=0.02:bs=-0.04',
  },
};

export function buildColourGradeFilter(preset = 'neutral') {
  const p = PRESETS[preset] || PRESETS.neutral;
  return [p.eq, p.colorbalance].filter(Boolean).join(',');
}

export function resolveSceneColourGrade(scene, manifest) {
  if (scene.colourGrade) return scene.colourGrade;
  if (manifest?.colourGradeDefault) return manifest.colourGradeDefault;
  return 'neutral';
}
