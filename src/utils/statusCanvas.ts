import type { StatusFontStyle, StatusFormat } from '../types';

interface RenderStatusCardOptions {
  format: StatusFormat;
  text: string;
  caption: string;
  bgColorHex: string;
  fontStyle: StatusFontStyle;
  imageUrl: string | null;
  cropZoom?: boolean;
}

function getCanvasFontFamily(fontStyle: StatusFontStyle): string {
  if (fontStyle === 'serif') return 'Georgia, "Times New Roman", serif';
  if (fontStyle === 'mono') return '"JetBrains Mono", ui-monospace, monospace';
  return '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let currentLine = words[0];
    for (let i = 1; i < words.length; i += 1) {
      const candidate = `${currentLine} ${words[i]}`;
      if (ctx.measureText(candidate).width <= maxWidth) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    lines.push(currentLine);
  }
  return lines;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load status image'));
    img.src = src;
  });
}

async function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  imageUrl: string,
  width: number,
  height: number,
  cropZoom?: boolean
) {
  const img = await loadImageElement(imageUrl);
  const scaleFactor = cropZoom ? 1.38 : 1;
  const imgRatio = img.width / img.height || width / height;
  const targetRatio = width / height;

  let drawWidth = width;
  let drawHeight = height;
  if (imgRatio > targetRatio) {
    drawHeight = height * scaleFactor;
    drawWidth = drawHeight * imgRatio;
  } else {
    drawWidth = width * scaleFactor;
    drawHeight = drawWidth / imgRatio;
  }

  const dx = (width - drawWidth) / 2;
  const dy = (height - drawHeight) / 2;
  ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
}

export async function renderStatusCardBlob(
  options: RenderStatusCardOptions
): Promise<Blob> {
  const width = 1080;
  const height = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  ctx.fillStyle = options.bgColorHex || '#0F766E';
  ctx.fillRect(0, 0, width, height);

  if (options.imageUrl) {
    try {
      await drawCoverImage(ctx, options.imageUrl, width, height, options.cropZoom);
    } catch {
      // Fallback cleanly to solid background
    }
  } else {
    const grad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.38,
      80,
      width * 0.5,
      height * 0.5,
      height * 0.72
    );
    grad.addColorStop(0, 'rgba(255,255,255,0.11)');
    grad.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  if (options.format === 'photo') {
    if (options.caption.trim()) {
      const scrim = ctx.createLinearGradient(0, height * 0.58, 0, height);
      scrim.addColorStop(0, 'rgba(0, 0, 0, 0)');
      scrim.addColorStop(0.55, 'rgba(0, 0, 0, 0.58)');
      scrim.addColorStop(1, 'rgba(0, 0, 0, 0.84)');
      ctx.fillStyle = scrim;
      ctx.fillRect(0, height * 0.58, width, height * 0.42);

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.font = `500 46px ${getCanvasFontFamily(options.fontStyle)}`;
      const captionLines = wrapLines(ctx, options.caption.trim(), width - 140);
      const lineHeight = 62;
      const startY = height - 150 - (captionLines.length - 1) * lineHeight;
      captionLines.forEach((line, idx) => {
        ctx.fillText(line, width / 2, startY + idx * lineHeight);
      });
    }
  } else {
    if (options.imageUrl) {
      // Measured center scrim when overlaying text onto AI illustration
      ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
      ctx.fillRect(0, 0, width, height);
    }

    const bodyText = options.text.trim() || 'Status update';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    const fontSize = bodyText.length > 160 ? 52 : bodyText.length > 90 ? 60 : 72;
    const lineHeight = Math.round(fontSize * 1.36);
    ctx.font = `600 ${fontSize}px ${getCanvasFontFamily(options.fontStyle)}`;

    const lines = wrapLines(ctx, bodyText, width - 160);
    const totalHeight = lines.length * lineHeight;
    const startY = (height - totalHeight) / 2 + fontSize * 0.4;

    lines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, startY + idx * lineHeight);
    });
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to export PNG'));
    }, 'image/png');
  });
}

export async function downloadStatusCardPng(
  options: RenderStatusCardOptions,
  filename: string = 'whatsapp-status-card.png'
): Promise<void> {
  const blob = await renderStatusCardBlob(options);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
