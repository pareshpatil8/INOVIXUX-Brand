import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = 'http://localhost:4301';
const URL = `${BASE}/docs/components/animateonscroll`;
const OUT = 'artifacts/qa-evidence/animateonscroll';
mkdirSync(OUT, { recursive: true });

const results = [];
function log(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} — ${name}${detail ? `: ${detail}` : ''}`);
}

/** Steps the container's own `scrollTop` directly instead of dispatching wheel events — wheeling
 *  over a nested scroll box that reaches its own scroll limit bubbles into page-level scroll,
 *  which drags the box off-screen out from under the fixed mouse coordinate and desyncs the next
 *  wheel from the intended target. The container must already be scrolled into the page's
 *  viewport once (scrollIntoViewIfNeeded) before this, since IntersectionObserver's root is the
 *  top-level viewport (no `root` option passed), not this nested box. */
async function stepScroll(page, locator, positions) {
  for (const pos of positions) {
    await locator.evaluate((el, p) => { el.scrollTop = p; }, pos);
    await page.waitForTimeout(150);
  }
}

const browser = await chromium.launch();

// --- 1. Three themes, screenshots ---
for (const theme of ['light', 'dark', 'high-contrast']) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: theme, exact: true }).click();
  await page.waitForTimeout(150);
  const appliedTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  log(`theme switch → ${theme}`, appliedTheme === theme, `data-theme=${appliedTheme}`);
  await page.screenshot({ path: `${OUT}/ino949-${theme}.png`, fullPage: true });
  await page.close();
}

// --- 2. Content never hidden pre-animation (check DOM before any intersection) ---
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(URL, { waitUntil: 'networkidle' });
  const cards = await page.locator('.demo-aos__card').all();
  let allVisible = true;
  let anyPreClass = false;
  for (const card of cards) {
    const box = await card.boundingBox();
    const cls = await card.getAttribute('class');
    if (!box) allVisible = false;
    if (cls && (cls.includes('aos-rise') || cls.includes('aos-fall'))) anyPreClass = true;
  }
  const opacityCheck = await page.evaluate(() => {
    const els = document.querySelectorAll('.demo-aos__card');
    return Array.from(els).every((el) => getComputedStyle(el).opacity !== '0' && getComputedStyle(el).visibility !== 'hidden');
  });
  log('content never hidden pre-animation (visible + no opacity:0 + no pre-applied class)', allVisible && opacityCheck && !anyPreClass,
    `boxesOk=${allVisible} opacityOk=${opacityCheck} preClassApplied=${anyPreClass}`);
  await page.close();
}

// --- 3. Scroll-reveal enter/leave + counters (two-forms section) ---
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(URL, { waitUntil: 'networkidle' });
  const viewport = page.locator('.demo-aos__viewport[aria-label*="two forms"]');
  await viewport.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const before = await page.locator('.demo-live').first().innerText();
  await stepScroll(page, viewport, [100, 200, 300, 400, 500, 600, 700, 782]);
  const afterScrollDown = await page.locator('.demo-live').first().innerText();
  await stepScroll(page, viewport, [700, 500, 300, 100, 0]);
  const afterScrollUp = await page.locator('.demo-live').first().innerText();
  log('enter counters increment on scroll into view', before !== afterScrollDown, `before="${before}" afterDown="${afterScrollDown}"`);
  log('leave+re-enter counters increment on scroll back out/in', afterScrollDown !== afterScrollUp, `afterDown="${afterScrollDown}" afterUp="${afterScrollUp}"`);
  await page.close();
}

// --- 4. Once vs repeat ---
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(URL, { waitUntil: 'networkidle' });
  const viewport = page.locator('.demo-aos__viewport[aria-label*="once vs repeat"]');
  await viewport.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const readLive = () => page.locator('.demo-live', { hasText: 'once enters' }).innerText();
  const maxScroll = await viewport.evaluate((el) => el.scrollHeight - el.clientHeight);

  await stepScroll(page, viewport, [maxScroll * 0.3, maxScroll * 0.6, maxScroll]);
  const afterFirstDown = await readLive();
  await stepScroll(page, viewport, [maxScroll * 0.6, maxScroll * 0.3, 0]);
  await stepScroll(page, viewport, [maxScroll * 0.3, maxScroll * 0.6, maxScroll]);
  const afterSecondDown = await readLive();

  const onceVal = (s) => s.match(/once enters:\s*(\d+)/)?.[1];
  const repeatVal = (s) => s.match(/repeat enters:\s*(\d+)/)?.[1];
  log('once: stays at 1 after a second reveal', onceVal(afterFirstDown) === '1' && onceVal(afterSecondDown) === '1',
    `first=${onceVal(afterFirstDown)} second=${onceVal(afterSecondDown)}`);
  log('repeat: increments past 1 on re-entry', Number(repeatVal(afterSecondDown)) > Number(repeatVal(afterFirstDown)),
    `first=${repeatVal(afterFirstDown)} second=${repeatVal(afterSecondDown)}`);
  await page.close();
}

// --- 5. Threshold 0.15 vs 0.9 ---
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.addInitScript(() => {
    const Orig = window.IntersectionObserver;
    window.__ioLog = [];
    window.IntersectionObserver = class extends Orig {
      constructor(cb, opts) {
        super((entries, obs) => {
          window.__ioLog.push({ threshold: opts.threshold, isIntersecting: entries[0].isIntersecting, ratio: entries[0].intersectionRatio });
          cb(entries, obs);
        }, opts);
      }
    };
  });
  await page.goto(URL, { waitUntil: 'networkidle' });
  const viewport = page.locator('.demo-aos__viewport[aria-label*="threshold"]');
  await viewport.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const maxScroll = await viewport.evaluate((el) => el.scrollHeight - el.clientHeight);
  await stepScroll(page, viewport, [maxScroll * 0.25, maxScroll * 0.5, maxScroll * 0.75, maxScroll]);
  const live = await page.locator('.demo-live', { hasText: '0.15 enters' }).innerText();
  const v15 = Number(live.match(/0\.15 enters:\s*(\d+)/)?.[1]);
  const v9 = Number(live.match(/0\.9 enters:\s*(\d+)/)?.[1]);
  log('threshold 0.15 card fires enter', v15 >= 1, `0.15 enters=${v15}`);
  log('threshold 0.9 card fires enter (slower scroll settles past 0.9)', v9 >= 1, `0.9 enters=${v9}`);
  await page.close();
}

// --- 6. prefers-reduced-motion: reduce disables classes AND events ---
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(URL, { waitUntil: 'networkidle' });
  const readoutText = await page.locator('.demo-live', { hasText: 'prefers-reduced-motion on this visit' }).innerText();
  const viewport = page.locator('.demo-aos__viewport[aria-label*="two forms"]');
  await viewport.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const before = await page.locator('.demo-live').first().innerText();
  await stepScroll(page, viewport, [100, 200, 300, 400, 500, 600, 700, 782]);
  const after = await page.locator('.demo-live').first().innerText();
  log('reduced-motion readout reflects "reduce"', readoutText.includes('reduce') && !readoutText.includes('no-preference'), readoutText);
  log('reduced-motion: counters hold still (no class/event applied)', before === after, `before="${before}" after="${after}"`);
  await page.close();
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('FAILED:', failed.map((f) => f.name).join('; '));
  process.exitCode = 1;
}
