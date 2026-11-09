// QA probe for INO-924: ino-dock §2 Publish Contract validation.
// Run against a static copy of web/dist served on :4891 (see recovery heartbeat notes).
import { chromium } from 'playwright';

const BASE = 'http://localhost:4891';
const results = [];
const fail = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  if (!ok) fail.push(`${name}: ${detail}`);
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ' :: ' + detail : ''}`);
}

async function gotoDock(page, theme) {
  await page.addInitScript((t) => {
    try { localStorage.setItem('ino-theme', t); } catch {}
  }, theme);
  await page.goto(`${BASE}/docs/components/dock`, { waitUntil: 'networkidle' });
  await page.waitForSelector('ino-dock .ino-dock__bar', { timeout: 10000 });
}

const browser = await chromium.launch();

try {
  // ---------- 1. Keyboard-only walkthrough (live example dock: bottom, has disabled item) ----------
  {
    const page = await browser.newPage();
    await gotoDock(page, 'light');

    const liveDock = page.locator('ino-dock').first();
    const buttons = liveDock.locator('.ino-dock__btn');
    const count = await buttons.count();
    record('live dock item count', count === 5, `expected 5 got ${count}`);

    // Tab into the page until the dock bar receives focus (one roving tab stop).
    let focusedIsDockButton = false;
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      focusedIsDockButton = await page.evaluate(() => {
        const el = document.activeElement;
        return !!el && el.classList.contains('ino-dock__btn') &&
          el.closest('ino-dock') !== null &&
          el.closest('ino-dock') === document.querySelectorAll('ino-dock')[0];
      });
      if (focusedIsDockButton) break;
    }
    record('Tab reaches dock as a single stop', focusedIsDockButton, 'did not find focus inside first ino-dock within 40 tabs');

    const activeLabel = async () =>
      page.evaluate(() => document.activeElement?.getAttribute('aria-label'));

    const first = await activeLabel();
    record('initial roving stop is a real item', !!first, `aria-label=${first}`);

    // ArrowRight should move to next navigable item, skipping the disabled "Notes (locked)".
    const order = [first];
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(150);
      order.push(await activeLabel());
    }
    const hitNotes = order.includes('Notes (locked)');
    record('ArrowRight never lands on disabled item', !hitNotes, `order=${JSON.stringify(order)}`);
    const wrapped = order[0] === order[4]; // 4 navigable items -> wraps after 4 presses
    record('ArrowRight wraps after traversing all navigable items', wrapped, `order=${JSON.stringify(order)}`);

    // Home / End
    await page.keyboard.press('Home');
    await page.waitForTimeout(150);
    const homeLabel = await activeLabel();
    record('Home jumps to first navigable item', homeLabel === 'Files', `got ${homeLabel}`);

    await page.keyboard.press('End');
    await page.waitForTimeout(150);
    const endLabel = await activeLabel();
    record('End jumps to last navigable item', endLabel === 'Settings', `got ${endLabel}`);

    // ArrowLeft from End should go to previous (Notes is disabled, skipped -> Calendar)
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(150);
    const prevLabel = await activeLabel();
    record('ArrowLeft from last navigable skips disabled item', prevLabel === 'Calendar', `got ${prevLabel}`);

    // Disabled item is never a tab stop: tabindex must be -1 and it can never receive focus via Tab alone.
    const notesTabIndex = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('ino-dock .ino-dock__btn'));
      const notes = btns.find((b) => b.getAttribute('aria-label') === 'Notes (locked)');
      return notes?.getAttribute('tabindex');
    });
    record('disabled item has tabindex=-1', notesTabIndex === '-1', `got ${notesTabIndex}`);

    // Enter activates the focused (non-disabled) item. Poll rather than fixed-sleep after the
    // roving-focus keypress — the refocus happens in a queueMicrotask (ino-dock.component.ts
    // onKeydown), so firing the next key synchronously (or after too short a sleep, under a
    // loaded shared machine) can race it (INO-528-style keyboard QA gotcha).
    const demoLive = page.locator('.demo-live').first();
    await page.keyboard.press('Home');
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Files');
    await page.keyboard.press('Enter');
    await demoLive.filter({ hasText: 'last action: Files' }).waitFor({ timeout: 3000 });
    const lastAction = await demoLive.innerText();
    record('Enter activates focused item (live demo updates)', lastAction.includes('Files'), `got "${lastAction}"`);

    // Space activates too.
    await page.keyboard.press('End');
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Settings');
    await page.keyboard.press(' ');
    await demoLive.filter({ hasText: 'last action: Settings' }).waitFor({ timeout: 3000 });
    const lastAction2 = await demoLive.innerText();
    record('Space activates focused item', lastAction2.includes('Settings'), `got "${lastAction2}"`);

    await page.close();
  }

  // ---------- 2. Side position: ArrowUp/Down roving, ArrowLeft/Right no-op ----------
  {
    const page = await browser.newPage();
    await gotoDock(page, 'light');

    const sideDock = page.locator('ino-dock').filter({ has: page.locator('nav[aria-label="Dock, side position"]') });
    await sideDock.waitFor();
    const orientation = await sideDock.locator('.ino-dock__bar').getAttribute('aria-orientation');
    record('side dock aria-orientation=vertical', orientation === 'vertical', `got ${orientation}`);

    const firstBtn = sideDock.locator('.ino-dock__btn').first();
    await firstBtn.focus();
    const labelOf = async () => page.evaluate(() => document.activeElement?.getAttribute('aria-label'));

    const before = await labelOf();
    await page.keyboard.press('ArrowRight'); // inactive pair for side -> no-op
    await page.waitForTimeout(150);
    const afterRight = await labelOf();
    record('ArrowRight is a no-op in side position', before === afterRight, `before=${before} after=${afterRight}`);

    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(150);
    const afterDown = await labelOf();
    record('ArrowDown moves focus in side position', afterDown !== before, `before=${before} after=${afterDown}`);

    await page.close();
  }

  // ---------- 3. Magnify-on-hover, normal vs prefers-reduced-motion ----------
  {
    const page = await browser.newPage();
    await gotoDock(page, 'light');
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    const magnifyDock = page.locator('ino-dock').filter({ has: page.locator('nav[aria-label="Dock with magnify"]') });
    await magnifyDock.waitFor();
    const btn = magnifyDock.locator('.ino-dock__btn').first();
    await btn.hover();
    await page.waitForTimeout(150);
    const scaleNormal = await btn.evaluate((el) => getComputedStyle(el).transform);
    record('magnify applies transform on hover (motion ok)', scaleNormal !== 'none', `transform=${scaleNormal}`);

    await page.mouse.move(0, 0);
    await page.close();
  }
  {
    const page = await browser.newPage();
    await gotoDock(page, 'light');
    await page.emulateMedia({ reducedMotion: 'reduce' });

    const magnifyDock = page.locator('ino-dock').filter({ has: page.locator('nav[aria-label="Dock with magnify"]') });
    await magnifyDock.waitFor();
    const btn = magnifyDock.locator('.ino-dock__btn').first();
    await btn.hover();
    await page.waitForTimeout(150);
    const scaleReduced = await btn.evaluate((el) => getComputedStyle(el).transform);
    record('magnify is fully OFF under prefers-reduced-motion: reduce', scaleReduced === 'none', `transform=${scaleReduced}`);

    await page.close();
  }

  // ---------- 4. magnify=false kill switch ----------
  {
    const page = await browser.newPage();
    await gotoDock(page, 'light');
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    const noMagnifyDock = page.locator('ino-dock').filter({ has: page.locator('nav[aria-label="Dock without magnify"]') });
    await noMagnifyDock.waitFor();
    const btn = noMagnifyDock.locator('.ino-dock__btn').first();
    await btn.hover();
    await page.waitForTimeout(150);
    const scale = await btn.evaluate((el) => getComputedStyle(el).transform);
    record('[magnify]=false disables effect independent of motion setting', scale === 'none', `transform=${scale}`);

    await page.close();
  }

  // ---------- 5. Theme screenshots: 3 themes x bottom/side/sizing ----------
  const themes = ['dark', 'light', 'high-contrast'];
  for (const theme of themes) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
    await gotoDock(page, theme);
    await page.waitForTimeout(200);
    const section = page.locator('.demo-section').nth(1); // Position section: bottom vs side
    await section.screenshot({ path: `artifacts/qa-evidence/dock/ino924-position-${theme}.png` });
    const sizingSection = page.locator('.demo-section').nth(2); // Sizing sm/md/lg
    await sizingSection.screenshot({ path: `artifacts/qa-evidence/dock/ino924-sizing-${theme}.png` });
    const liveSection = page.locator('.demo-section').nth(0);
    await liveSection.screenshot({ path: `artifacts/qa-evidence/dock/ino924-live-${theme}.png` });
    record(`${theme} theme screenshots captured`, true, '');
    await page.close();
  }

  // ---------- 6. RTL spot-check on side label placement ----------
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
    await gotoDock(page, 'light');
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    await page.waitForTimeout(200);
    const sideDock = page.locator('ino-dock').filter({ has: page.locator('nav[aria-label="Dock, side position"]') });
    await sideDock.waitFor();
    await sideDock.scrollIntoViewIfNeeded();
    const section = page.locator('.demo-section').nth(1); // Position section, has the RTL-sensitive side pane
    await section.screenshot({ path: 'artifacts/qa-evidence/dock/ino924-side-rtl.png' });
    record('RTL side-position screenshot captured', true, '');
    await page.close();
  }
} finally {
  await browser.close();
}

console.log('\n=== SUMMARY ===');
console.log(`${results.length - fail.length}/${results.length} passed`);
if (fail.length) {
  console.log('FAILURES:');
  fail.forEach((f) => console.log(' - ' + f));
  process.exit(1);
}
