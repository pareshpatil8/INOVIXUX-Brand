import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = '/tmp/qa-ino411-revalidate';
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:4327';

const browser = await chromium.launch();
const results = [];
const check = (name, pass, detail) => results.push({ name, pass, detail });

for (const theme of ['light', 'dark', 'high-contrast']) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 2400 } });
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  await page.goto(`${BASE}/docs/components/select-button`, { waitUntil: 'networkidle' });
  await page.locator('.docs-theme-switcher').waitFor({ state: 'visible', timeout: 30000 });
  // switch theme if switcher supports it
  const switcher = page.locator('.docs-theme-switcher');
  await switcher.locator(`button:has-text("${theme === 'high-contrast' ? 'High contrast' : theme === 'dark' ? 'Dark' : 'Light'}")`).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);

  const demo = page.locator('app-select-button-demo');
  await demo.waitFor({ state: 'visible', timeout: 15000 });

  const optionCount = await demo.locator('ino-select-button-option').count();
  const groupCount = await demo.locator('ino-select-button').count();
  check(`${theme}/options-render`, optionCount > 0, `${optionCount} options / ${groupCount} groups`);

  const emptyGroups = await demo.locator('ino-select-button').evaluateAll((nodes) =>
    nodes.filter((n) => n.querySelectorAll('ino-select-button-option').length === 0).length
  );
  check(`${theme}/no-empty-groups`, emptyGroups === 0, `${emptyGroups} empty of ${groupCount}`);

  check(`${theme}/no-console-errors`, consoleErrors.length === 0, JSON.stringify(consoleErrors.slice(0,3)));

  await page.screenshot({ path: `${OUT}/select-button-${theme}.png`, fullPage: true });
  await page.close();
}

// Defect 1: aria-readonly placement
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 2400 } });
  await page.goto(`${BASE}/docs/components/select-button`, { waitUntil: 'networkidle' });
  const demo = page.locator('app-select-button-demo');
  await demo.waitFor({ state: 'visible' });

  // find a readonly single-select group and readonly multi-select group
  const singleReadonly = demo.locator('ino-select-button[readonly]:not([multiple])').first();
  const singleCount = await singleReadonly.count();
  if (singleCount > 0) {
    const groupAriaReadonly = await singleReadonly.getAttribute('aria-readonly');
    const inputAriaReadonly = await singleReadonly.locator('input[type=radio]').first().getAttribute('aria-readonly');
    check('defect1/single-select-readonly-on-group', groupAriaReadonly === 'true', `group aria-readonly="${groupAriaReadonly}"`);
    check('defect1/single-select-readonly-not-on-radio-input', inputAriaReadonly === null, `radio input aria-readonly="${inputAriaReadonly}"`);
  } else {
    check('defect1/single-select-readonly-group-found', false, 'no readonly single-select group found in demo');
  }

  const multiReadonly = demo.locator('ino-select-button[readonly][multiple]').first();
  const multiCount = await multiReadonly.count();
  if (multiCount > 0) {
    const groupAriaReadonly = await multiReadonly.getAttribute('aria-readonly');
    const inputAriaReadonly = await multiReadonly.locator('input[type=checkbox]').first().getAttribute('aria-readonly');
    check('defect1/multi-select-readonly-not-on-group', groupAriaReadonly === null, `group aria-readonly="${groupAriaReadonly}"`);
    check('defect1/multi-select-readonly-on-checkbox-input', inputAriaReadonly === 'true', `checkbox input aria-readonly="${inputAriaReadonly}"`);
  } else {
    check('defect1/multi-select-readonly-group-found', false, 'no readonly multi-select group found in demo');
  }

  // non-readonly group should have no aria-readonly at all (absent, not "false")
  const nonReadonly = demo.locator('ino-select-button:not([readonly])').first();
  if (await nonReadonly.count() > 0) {
    const attr = await nonReadonly.getAttribute('aria-readonly');
    check('defect1/non-readonly-attr-absent', attr === null, `aria-readonly="${attr}"`);
  }
  await page.close();
}

// Defect 2: overflow ellipsis on a group wider than its container, without equalWidth
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 2400 } });
  await page.goto(`${BASE}/docs/components/select-button`, { waitUntil: 'networkidle' });
  const demo = page.locator('app-select-button-demo');
  await demo.waitFor({ state: 'visible' });

  const overflowCheck = await demo.evaluate((hostEl) => {
    const groups = [...hostEl.querySelectorAll('ino-select-button')];
    return groups.map((g) => {
      const rect = g.getBoundingClientRect();
      const parent = g.parentElement;
      const parentRect = parent ? parent.getBoundingClientRect() : null;
      const widthOk = parentRect ? rect.width <= parentRect.width + 1 : null;
      const opts = [...g.querySelectorAll('ino-select-button-option')];
      const anyEllipsing = opts.some((o) => {
        const label = o.querySelector('.ino-select-button-option__label, label, span');
        if (!label) return false;
        return label.scrollWidth > label.clientWidth;
      });
      return { widthOk, parentWidth: parentRect?.width, groupWidth: rect.width, anyEllipsing };
    });
  });
  const anyOverflowingPastParent = overflowCheck.some((g) => g.widthOk === false);
  check('defect2/no-group-wider-than-container', !anyOverflowingPastParent, JSON.stringify(overflowCheck.filter(g => g.widthOk === false)));
  const anyEllipsisEngaged = overflowCheck.some((g) => g.anyEllipsing);
  check('defect2/ellipsis-chain-engages-somewhere', anyEllipsisEngaged, JSON.stringify(overflowCheck.filter(g => g.anyEllipsing)));
  await page.close();
}

// Keyboard-only spot check: roving tabindex + readonly refuses arrow-key change
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 2400 } });
  await page.goto(`${BASE}/docs/components/select-button`, { waitUntil: 'networkidle' });
  const demo = page.locator('app-select-button-demo');
  await demo.waitFor({ state: 'visible' });

  const liveExample = demo.locator('ino-select-button').first();
  const firstInput = liveExample.locator('input').first();
  await firstInput.focus();
  const before = await liveExample.evaluate((el) => [...el.querySelectorAll('input')].find(i => i.checked)?.value ?? null);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(150);
  const after = await liveExample.evaluate((el) => [...el.querySelectorAll('input')].find(i => i.checked)?.value ?? null);
  check('keyboard/arrow-right-moves-selection', before !== after, `${before} -> ${after}`);

  // readonly group: arrow key should not change selection
  const readonlyGroup = demo.locator('ino-select-button[readonly]:not([multiple])').first();
  if (await readonlyGroup.count() > 0) {
    const rInput = readonlyGroup.locator('input').first();
    await rInput.focus();
    const rBefore = await readonlyGroup.evaluate((el) => [...el.querySelectorAll('input')].find(i => i.checked)?.value ?? null);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(150);
    const rAfter = await readonlyGroup.evaluate((el) => [...el.querySelectorAll('input')].find(i => i.checked)?.value ?? null);
    check('keyboard/readonly-refuses-arrow-key-change', rBefore === rAfter, `${rBefore} -> ${rAfter}`);
  }
  await page.close();
}

await browser.close();

const bad = results.filter(r => !r.pass);
console.log(JSON.stringify({ total: results.length, passed: results.length - bad.length, failed: bad.length, failures: bad }, null, 2));
