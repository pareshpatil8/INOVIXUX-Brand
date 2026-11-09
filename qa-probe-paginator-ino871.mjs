// INO-871 QA verification: compute live WCAG contrast of .ino-paginator__btn--active
// text vs background across dark/light/high-contrast themes on the real docs page.
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:4300';

function srgbToLin(c) {
  c = c / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function luminance([r, g, b]) {
  return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
}
function parseRgb(str) {
  const m = str.match(/(\d+(\.\d+)?)/g).map(Number);
  return [m[0], m[1], m[2]];
}
function contrast(c1, c2) {
  const L1 = luminance(parseRgb(c1));
  const L2 = luminance(parseRgb(c2));
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
await page.goto(`${BASE}/docs/components/paginator`, { waitUntil: 'networkidle' });
await page.locator('.docs-theme-switcher').waitFor({ state: 'visible', timeout: 30000 });

const themes = ['dark', 'light', 'high-contrast'];
const results = [];

for (const theme of themes) {
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await page.waitForTimeout(300);

  const active = page.locator('.ino-paginator__btn--active').first();
  await active.waitFor({ state: 'visible', timeout: 15000 });

  const styles = await active.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { color: cs.color, background: cs.backgroundColor, fontSize: cs.fontSize, fontWeight: cs.fontWeight };
  });

  const ratio = contrast(styles.color, styles.background);
  results.push({ theme, ...styles, ratio: ratio.toFixed(2) });
}

console.log(JSON.stringify(results, null, 2));

const AA_FLOOR = 4.5;
let failed = false;
for (const r of results) {
  const pass = Number(r.ratio) >= AA_FLOOR;
  if (!pass) failed = true;
  console.log(`${r.theme}: ${r.color} on ${r.background} => ${r.ratio}:1 ${pass ? 'PASS' : 'FAIL'} (floor ${AA_FLOOR}:1)`);
}

await browser.close();
process.exit(failed ? 1 : 0);
