/**
 * Per-format caption and logo safe zones.
 * Vertical uses a high bottom margin to clear thumb / home-indicator zones.
 */

export const FONT_PATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

export const FORMAT_LAYOUTS = {
  landscape: {
    id: 'landscape',
    width: 1920,
    height: 1080,
    caption: {
      fontSize: 48,
      lineSpacing: 14,
      marginX: 96,
      bottomSafe: 120,
      maxChars: 28,
    },
    logo: {
      width: 220,
      margin: 32,
      position: 'bottom-right',
    },
  },
  square: {
    id: 'square',
    width: 1080,
    height: 1080,
    caption: {
      fontSize: 40,
      lineSpacing: 12,
      marginX: 64,
      bottomSafe: 108,
      maxChars: 26,
    },
    logo: {
      width: 160,
      margin: 28,
      position: 'bottom-right',
    },
  },
  vertical: {
    id: 'vertical',
    width: 1080,
    height: 1920,
    caption: {
      fontSize: 42,
      lineSpacing: 12,
      marginX: 56,
      bottomSafe: 300,
      maxChars: 24,
    },
    logo: {
      width: 150,
      margin: 40,
      position: 'top-right',
    },
  },
};

const WRAP_MIN = 24;
const WRAP_MAX = 28;

/**
 * Wrap caption text. Manual `\n` in manifest is preserved; each paragraph is wrapped separately.
 */
export function wrapCaption(text, maxChars = 26) {
  const paragraphs = String(text).split('\n');
  return paragraphs.map((para) => wrapParagraph(para.trim(), maxChars)).join('\n');
}

function wrapParagraph(text, maxChars) {
  if (!text) return '';
  if (text.length <= maxChars) return text;

  const words = text.split(/\s+/);
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    if (word.length > maxChars) {
      // Hard-split very long tokens
      for (let i = 0; i < word.length; i += maxChars) {
        lines.push(word.slice(i, i + maxChars));
      }
      current = '';
    } else {
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.join('\n');
}

export function escapeDrawtext(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/%/g, '\\%');
}

export function buildCaptionDrawtextFilters(text, layout) {
  const wrapped = wrapCaption(text, layout.caption.maxChars);
  const lines = wrapped.split('\n');
  const { fontSize, lineSpacing, bottomSafe } = layout.caption;
  const lineHeight = fontSize + lineSpacing;

  return lines.map((line, idx) => {
    const fromBottom = bottomSafe + (lines.length - 1 - idx) * lineHeight;
    const y = `h-${fromBottom}-${fontSize}`;
    const escaped = escapeDrawtext(line);
    return [
      `drawtext=fontfile=${FONT_PATH}`,
      `text='${escaped}'`,
      `fontsize=${fontSize}`,
      `fontcolor=white`,
      `borderw=3`,
      `bordercolor=black@0.65`,
      `shadowcolor=black@0.45`,
      `shadowx=2`,
      `shadowy=2`,
      `x=(w-text_w)/2`,
      `y=${y}`,
    ].join(':');
  });
}

/** @deprecated use buildCaptionDrawtextFilters */
export function buildCaptionDrawtext(text, layout) {
  return buildCaptionDrawtextFilters(text, layout).join(',');
}

export function buildLogoOverlayFilter(layout) {
  const { width, margin, position } = layout.logo;
  const x = position === 'top-right'
    ? `W-w-${margin}`
    : `W-w-${margin}`;
  const y = position === 'top-right'
    ? `${margin}`
    : `H-h-${margin}`;

  return [
    `[1:v]scale=${width}:-1,format=rgba,colorchannelmixer=aa=0.92[logo]`,
    `[0:v][logo]overlay=${x}:${y}`,
  ].join(';');
}

export function sceneRenderDuration(scene) {
  return scene.renderDuration ?? scene.duration;
}

export function buildScaleCropFilter(layout) {
  const { width, height } = layout;
  if (width === 1920 && height === 1080) {
    return 'setsar=1';
  }
  return [
    `scale=${width}:${height}:force_original_aspect_ratio=increase`,
    `crop=${width}:${height}`,
    'setsar=1',
  ].join(',');
}

export function estimateLineCount(text, maxChars) {
  return wrapCaption(text, maxChars).split('\n').length;
}
