import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  buildBackdropPrompt,
  encodeSvgToDataUrl,
  wrapSvgDocument,
} from './src/utils/aiBackdrop.ts';
import type { BackdropArtStyle } from './src/utils/aiBackdrop.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID_STYLES: BackdropArtStyle[] = [
  'illustration',
  'atmospheric',
  'botanical',
  'festive',
];

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/ai/generate-background', async (req, res) => {
    try {
      const body = req.body as {
        userPrompt?: string;
        themeTitle?: string;
        category?: string;
        statusText?: string;
        style?: string;
      };

      const style: BackdropArtStyle = VALID_STYLES.includes(
        body?.style as BackdropArtStyle
      )
        ? (body.style as BackdropArtStyle)
        : 'illustration';

      const hasInput =
        Boolean(body?.userPrompt?.trim()) ||
        Boolean(body?.themeTitle?.trim()) ||
        Boolean(body?.statusText?.trim());

      if (!hasInput) {
        return res.status(400).json({
          error:
            'Provide a background prompt or select a status message/template theme.',
        });
      }

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({
          error:
            'GEMINI_API_KEY is not configured in Settings > Secrets. Add a Gemini API key to generate AI backgrounds.',
        });
      }

      const prompt = buildBackdropPrompt({
        userPrompt: body.userPrompt,
        themeTitle: body.themeTitle,
        category: body.category,
        statusText: body.statusText,
        style,
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are an editorial visual designer creating vertical 1080x1920 SVG artwork for WhatsApp status backgrounds. Produce clean, rich, layered geometric and organic SVG elements (circles, paths, ellipses, polygons, radial gradients) positioned tastefully around the upper and lower thirds so white text in the center stays crisp and readable. Never include <text> tags, words, or <script> tags.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'Short 2-4 word artwork title.',
              },
              bgStart: {
                type: Type.STRING,
                description: 'Top gradient hex color, e.g. #0F766E.',
              },
              bgEnd: {
                type: Type.STRING,
                description: 'Bottom gradient hex color, e.g. #1E293B.',
              },
              svgBody: {
                type: Type.STRING,
                description:
                  'Valid inner SVG elements (<defs>, <path>, <circle>, <ellipse>, <rect>, <polygon>, <g>) designed for a 1080x1920 viewBox, with no outer <svg> wrapper and no <text> elements.',
              },
            },
            required: ['title', 'bgStart', 'bgEnd', 'svgBody'],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        return res.status(502).json({
          error: 'The AI model returned an empty artwork response. Please retry.',
        });
      }

      const parsed = JSON.parse(rawText) as {
        title?: string;
        bgStart?: string;
        bgEnd?: string;
        svgBody?: string;
      };

      if (!parsed.svgBody) {
        return res.status(502).json({
          error: 'Generated artwork payload was incomplete. Please try another prompt.',
        });
      }

      const bgStart = parsed.bgStart || '#0F766E';
      const bgEnd = parsed.bgEnd || '#0F172A';
      const fullSvg = wrapSvgDocument(parsed.svgBody, bgStart, bgEnd);
      const imageUrl = encodeSvgToDataUrl(fullSvg);

      return res.json({
        title: parsed.title || 'AI Status Artwork',
        bgColorHex: bgStart,
        style,
        imageUrl,
      });
    } catch (err) {
      const errorObj = err as { status?: number; message?: string };
      const status = typeof errorObj?.status === 'number' ? errorObj.status : 500;
      const message =
        errorObj?.message || 'Failed to generate AI status background.';

      if (status === 403 || status === 401) {
        return res.status(403).json({
          error:
            'Gemini API key permission denied. Check your API key in Settings > Secrets.',
        });
      }
      if (status === 429) {
        return res.status(429).json({
          error:
            'Gemini API quota temporarily reached. Please wait a moment and try again.',
        });
      }

      return res.status(status >= 400 && status < 600 ? status : 500).json({
        error: message,
      });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`CircleStatus server listening on http://localhost:${port}`);
  });
}

startServer();
