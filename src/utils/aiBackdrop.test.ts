import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBackdropPrompt,
  encodeSvgToDataUrl,
  isValidHexColor,
  sanitizeSvgFragment,
  wrapSvgDocument,
} from './aiBackdrop';

test('buildBackdropPrompt incorporates user prompt and template theme cleanly', () => {
  const prompt = buildBackdropPrompt({
    userPrompt: 'Warm birthday lanterns in evening sky',
    themeTitle: 'Warm Family Birthday Toast',
    category: 'Birthdays',
    style: 'festive',
  });

  assert.match(prompt, /Warm birthday lanterns in evening sky/);
  assert.match(prompt, /Birthdays/);
  assert.match(prompt, /1080x1920/);
  assert.match(prompt, /Do NOT include any embedded text/);
});

test('sanitizeSvgFragment strips outer svg tag, scripts, and event handlers', () => {
  const dirty =
    '<svg viewBox="0 0 100 100"><script>alert(1)</script><circle cx="50" cy="50" r="30" onclick="evil()" fill="#fff"/><foreignObject>bad</foreignObject></svg>';
  const clean = sanitizeSvgFragment(dirty);

  assert.equal(clean.includes('<script'), false);
  assert.equal(clean.includes('onclick'), false);
  assert.equal(clean.includes('foreignObject'), false);
  assert.equal(clean.includes('<svg'), false);
  assert.match(clean, /<circle cx="50" cy="50" r="30"/);
});

test('wrapSvgDocument validates hex colors and produces base64 data URL', () => {
  assert.equal(isValidHexColor('#0F766E'), true);
  assert.equal(isValidHexColor('not-a-hex'), false);

  const doc = wrapSvgDocument('<circle cx="540" cy="400" r="180" fill="#ffffff" opacity="0.2" />', '#0F766E', 'bad');
  assert.match(doc, /viewBox="0 0 1080 1920"/);
  assert.match(doc, /#0F766E/);
  assert.match(doc, /#0F172A/); // Fallback for invalid end color

  const dataUrl = encodeSvgToDataUrl(doc);
  assert.ok(dataUrl.startsWith('data:image/svg+xml;base64,'));
});
