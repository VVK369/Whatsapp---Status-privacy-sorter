export type BackdropArtStyle =
  | 'illustration'
  | 'atmospheric'
  | 'botanical'
  | 'festive';

export interface PromptBuildInput {
  userPrompt?: string;
  themeTitle?: string;
  category?: string;
  statusText?: string;
  style: BackdropArtStyle;
}

const STYLE_DIRECTIONS: Record<BackdropArtStyle, string> = {
  illustration:
    'Layered modern editorial vector illustration with expressive shapes, balanced framing around the edges, and clean open breathing space in the middle for status typography.',
  atmospheric:
    'Soft abstract atmospheric light gradients, organic layered curves, subtle glowing orbs, and calm tonal depth.',
  botanical:
    'Organic minimalist botanical illustration with stylized leaves, stems, warm sunlight beams, and gentle natural textures along the borders.',
  festive:
    'Celebratory editorial illustration with stylized garlands, lanterns, warm sparkles, and geometric confetti framed toward the top and bottom edges.',
};

export function buildBackdropPrompt(input: PromptBuildInput): string {
  const custom = input.userPrompt?.trim();
  const themeParts = [
    input.category ? `Occasion category: ${input.category}.` : '',
    input.themeTitle ? `Theme: ${input.themeTitle}.` : '',
    input.statusText?.trim()
      ? `Status message context: "${input.statusText.trim().slice(0, 180)}".`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const subject = custom
    ? `User concept: "${custom}". ${themeParts}`
    : themeParts || 'Warm, uplifting everyday social status background.';

  return [
    subject,
    `Visual style: ${STYLE_DIRECTIONS[input.style]}`,
    'Canvas dimensions: 1080x1920 vertical 9:16 portrait.',
    'Do NOT include any embedded text, words, letters, or watermarks in the SVG artwork.',
    'Keep the center region calm and low-contrast so white overlay status text remains clearly legible.',
  ].join(' ');
}

export function sanitizeSvgFragment(rawSvgBody: string): string {
  let cleaned = rawSvgBody.trim();

  // If the model accidentally returned a full <svg> wrapper, extract inner content
  const svgOpenMatch = /^<svg[^>]*>/i.exec(cleaned);
  if (svgOpenMatch) {
    cleaned = cleaned.slice(svgOpenMatch[0].length);
    cleaned = cleaned.replace(/<\/svg>\s*$/i, '');
  }

  // Strip dangerous tags and event handlers
  cleaned = cleaned
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');

  return cleaned.trim();
}

export function isValidHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value.trim());
}

export function wrapSvgDocument(
  svgBody: string,
  bgStart: string,
  bgEnd: string
): string {
  const safeStart = isValidHexColor(bgStart) ? bgStart : '#0F766E';
  const safeEnd = isValidHexColor(bgEnd) ? bgEnd : '#0F172A';
  const safeBody = sanitizeSvgFragment(svgBody);

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">',
    '  <defs>',
    '    <linearGradient id="circleStatusBaseBg" x1="0" y1="0" x2="1" y2="1">',
    `      <stop offset="0%" stop-color="${safeStart}" />`,
    `      <stop offset="100%" stop-color="${safeEnd}" />`,
    '    </linearGradient>',
    '    <linearGradient id="circleStatusScrim" x1="0" y1="0" x2="0" y2="1">',
    '      <stop offset="0%" stop-color="#000000" stop-opacity="0.18" />',
    '      <stop offset="50%" stop-color="#000000" stop-opacity="0.08" />',
    '      <stop offset="100%" stop-color="#000000" stop-opacity="0.34" />',
    '    </linearGradient>',
    '  </defs>',
    '  <rect width="1080" height="1920" fill="url(#circleStatusBaseBg)" />',
    `  ${safeBody}`,
    '  <rect width="1080" height="1920" fill="url(#circleStatusScrim)" />',
    '</svg>',
  ].join('\n');
}

export function encodeSvgToDataUrl(svgString: string): string {
  if (typeof Buffer !== 'undefined') {
    const b64 = Buffer.from(svgString, 'utf-8').toString('base64');
    return `data:image/svg+xml;base64,${b64}`;
  }
  const utf8Bytes = new TextEncoder().encode(svgString);
  let binary = '';
  for (const byte of utf8Bytes) {
    binary += String.fromCharCode(byte);
  }
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}
