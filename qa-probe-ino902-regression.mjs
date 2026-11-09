#!/usr/bin/env node
// INO-902 regression spot-check: items previously PASS in the first probe run,
// re-run against the post-INO-926 build to confirm the fix commit (be266a5)
// didn't disturb unrelated behavior (it touched ino-galleria-item.component.ts too).
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:4931';
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
await page.goto(`${BASE}/docs/components/galleria`, { waitUntil: 'networkidle' });
await page.waitForTimeout(200);

const sections = await page.locator('.demo-section h3').allInnerTexts();
check('variant: Basic Gallery present', sections.includes('Basic Gallery'));
check('variant: Loading State present', sections.includes('Gallery - Loading State'));
check('variant: Autoplay Enabled present', sections.includes('Gallery - Autoplay Enabled'));
check('variant: Density Comparison present (new)', sections.includes('Gallery - Density Comparison'));

const basicGalleria = page.locator('.demo-section', { hasText: 'Basic Gallery' }).locator('ino-galleria');
check('a11y: region role on host', (await basicGalleria.getAttribute('role')) === 'region');
check('a11y: aria-roledescription=gallery', (await basicGalleria.getAttribute('aria-roledescription')) === 'gallery');
const caption = basicGalleria.locator('.ino-galleria__caption');
check('label: per-item caption rendered', (await caption.count()) === 1 && (await caption.innerText()).length > 0);
const stage = basicGalleria.locator('.ino-galleria__stage');
const stageAriaLabel = await stage.getAttribute('aria-label');
check('label: stage aria-label is "Image X of Y"', /^Image \d+ of \d+$/.test(stageAriaLabel || ''), stageAriaLabel);

await stage.focus();
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(150);
let activeThumb = basicGalleria.locator('.ino-galleria__thumbnail--active');
check('keyboard: ArrowRight advances to image 2', (await activeThumb.getAttribute('aria-label')) === 'Image 2');
await page.keyboard.press('Home');
await page.waitForTimeout(150);
activeThumb = basicGalleria.locator('.ino-galleria__thumbnail--active');
check('keyboard: Home returns to image 1', (await activeThumb.getAttribute('aria-label')) === 'Image 1');

const p3 = await browser.newPage();
await p3.goto(`${BASE}/docs/components/galleria`, { waitUntil: 'networkidle' });
const a11yBody = await p3.locator('h2:has-text("Accessibility") + *').innerText().catch(() => '');
check('Accessibility section renders formatted content', a11yBody.length > 0 && !/no accessibility contract/i.test(a11yBody));
const mobileBody = await p3.locator('h2:has-text("Mobile parity") + *').innerText().catch(() => '');
check('Mobile parity section renders formatted content', mobileBody.length > 0 && /platform native/i.test(mobileBody));
await p3.close();

await page.close();
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) console.log(`\nFAILURES:\n${failed.map((f) => `- ${f.name}`).join('\n')}`);
process.exit(failed.length ? 1 : 0);
