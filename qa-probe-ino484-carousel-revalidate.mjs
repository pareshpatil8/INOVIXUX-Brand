import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = 'http://127.0.0.1:4892';
const OUT = '/Users/apple/INOVIXUX/.worktrees/INO-31-brand-architecture-identity-creation/artifacts/qa-evidence/carousel';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });

const results = [];

// 1. Load the carousel docs page
await page.goto(`${BASE}/docs/components/carousel`, { waitUntil: 'networkidle' });
const title = await page.title();
results.push(`page title: ${title}`);
console.log(`URL after load: ${page.url()}`);
console.log(`page title: ${title}`);

// 2. Confirm density demo section exists and dense/fluid rows render
const densityHeading = await page.getByText('Density (dense/fluid via data-density)').count();
results.push(`density heading found: ${densityHeading}`);

const densitySectionScope = page.locator('.demo-section', { hasText: 'Density (dense/fluid' });
const denseWrap = densitySectionScope.locator('[data-density="dense"]').first();
const fluidWrap = densitySectionScope.locator('[data-density="fluid"]').first();
const denseCount = await denseWrap.count();
const fluidCount = await fluidWrap.count();
results.push(`dense wrapper count: ${denseCount}, fluid wrapper count: ${fluidCount}`);

if (denseCount && fluidCount) {
  const denseBox = await denseWrap.boundingBox();
  const fluidBox = await fluidWrap.boundingBox();
  results.push(`dense carousel height: ${denseBox?.height}, fluid carousel height: ${fluidBox?.height}`);
}

// 3. Screenshot the density section in light theme
await densitySectionScope.scrollIntoViewIfNeeded();
await densitySectionScope.screenshot({ path: `${OUT}/ino484-revalidate-density-light.png` });

// 4. Theme sweep - 3 themes full page
for (const theme of ['light', 'dark', 'high-contrast']) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t);
  }, theme);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ino484-revalidate-${theme}.png`, fullPage: true });
}

// reset to light for keyboard walkthrough
await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));

// 5. Keyboard walkthrough on the first live carousel instance
const firstCarousel = page.locator('ino-carousel').first();
await firstCarousel.scrollIntoViewIfNeeded();
const nextBtn = firstCarousel.locator('button[aria-label*="Next" i], button[aria-label*="next" i]').first();
const prevBtn = firstCarousel.locator('button[aria-label*="Prev" i], button[aria-label*="previous" i]').first();

let kbLog = [];
const nextCount = await nextBtn.count();
kbLog.push(`next button found: ${nextCount}`);
if (nextCount) {
  await nextBtn.focus();
  const focused1 = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
  kbLog.push(`focused via .focus(): ${focused1}`);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  kbLog.push('pressed Enter on next button');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(200);
  const focused2 = await page.evaluate(() => ({ tag: document.activeElement?.tagName, label: document.activeElement?.getAttribute('aria-label') }));
  kbLog.push(`after Tab: ${JSON.stringify(focused2)}`);
}

await page.screenshot({ path: `${OUT}/ino484-revalidate-keyboard-state.png`, fullPage: false });

results.push(...kbLog);

console.log(results.join('\n'));

await browser.close();
