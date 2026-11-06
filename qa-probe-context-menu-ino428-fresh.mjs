#!/usr/bin/env node
// Fresh §2 re-pass for INO-428 against HEAD after INO-816/817/818/819/820/821 landed.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';

const BASE = 'http://localhost:4200';
const EVID = 'artifacts/qa-evidence/context-menu';
mkdirSync(EVID, { recursive: true });
const browser = await chromium.launch();

async function freshPage(theme) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.addInitScript((t) => {
    try { window.localStorage.setItem('ino-theme', t); } catch {}
    document.documentElement.setAttribute('data-theme', t);
  }, theme);
  await page.goto(`${BASE}/docs/components/context-menu`, { waitUntil: 'domcontentloaded' });
  await page.locator('.demo-trigger, [inoContextMenu]').first().waitFor({ state: 'visible', timeout: 15000 });
  return page;
}

// --- Keyboard-only walkthrough ---
{
  const page = await freshPage('light');
  const trigger = page.locator('.demo-trigger, [inoContextMenu]').first();
  await page.evaluate(() => {
    const el = document.querySelector('.demo-trigger') || document.querySelector('[inoContextMenu]');
    el.setAttribute('data-probe-trigger', '1');
  });
  await trigger.click({ button: 'right' });
  await page.waitForTimeout(300);
  console.log('1. menu open, role=menu count:', await page.locator('.ino-context-menu__overlay, .ino-context-menu__submenu').count());
  console.log('2. first item focused on open:', (await page.evaluate(() => document.activeElement?.textContent?.trim())));

  const seq = [];
  for (let i = 0; i < 6; i++) {
    seq.push(await page.evaluate(() => document.activeElement?.textContent?.trim()));
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
  }
  console.log('3. ArrowDown traversal (6 steps, wraps):', JSON.stringify(seq));

  await page.keyboard.press('Home');
  await page.waitForTimeout(100);
  console.log('4a. Home -> focused:', await page.evaluate(() => document.activeElement?.textContent?.trim()));
  await page.keyboard.press('End');
  await page.waitForTimeout(100);
  console.log('4b. End -> focused:', await page.evaluate(() => document.activeElement?.textContent?.trim()));

  // Navigate to "More actions" explicitly and open submenu
  let onMore = false;
  for (let i = 0; i < 6 && !onMore; i++) {
    onMore = await page.evaluate(() => document.activeElement?.textContent?.trim().includes('More actions'));
    if (!onMore) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(80); }
  }
  console.log('5. reached "More actions":', onMore);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(250);
  console.log('6. role=menu count after ArrowRight (expect 2):', await page.locator('.ino-context-menu__overlay, .ino-context-menu__submenu').count());
  console.log('7. submenu "Rename" visible:', await page.locator('.ino-context-menu__submenu [role="menuitem"]', { hasText: 'Rename' }).count());
  const subFocus = await page.evaluate(() => document.activeElement?.textContent?.trim());
  console.log('8. focus moved into submenu on open:', subFocus);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  console.log('9. [.ino-context-menu__overlay] count after 1st Escape (submenu was open, expect submenu closed, parent still open=1):', await page.locator('.ino-context-menu__overlay').count());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  console.log('9b. [.ino-context-menu__overlay] count after 2nd Escape (expect 0, fully closed):', await page.locator('.ino-context-menu__overlay').count());
  const returned = await page.evaluate(() => document.activeElement?.getAttribute('data-probe-trigger') === '1');
  console.log('10. focus returned to invoking trigger after full close:', returned);
  await page.close();
}

// --- Escape with no submenu open (direct top-level close) ---
{
  const page = await freshPage('light');
  const trigger = page.locator('.demo-trigger, [inoContextMenu]').first();
  await page.evaluate(() => {
    const el = document.querySelector('.demo-trigger') || document.querySelector('[inoContextMenu]');
    el.setAttribute('data-probe-trigger', '1');
  });
  await trigger.click({ button: 'right' });
  await page.waitForTimeout(300);
  console.log('10a. menu open (no submenu):', await page.locator('.ino-context-menu__overlay').count());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  console.log('10b. menu count after Escape (expect 0):', await page.locator('.ino-context-menu__overlay').count());
  const returned2 = await page.evaluate(() => document.activeElement?.getAttribute('data-probe-trigger') === '1');
  console.log('10c. focus returned to invoking trigger after Escape (no submenu case):', returned2);
  await page.close();
}

// --- Click-outside close ---
{
  const page = await freshPage('light');
  const trigger = page.locator('.demo-trigger, [inoContextMenu]').first();
  await trigger.click({ button: 'right' });
  await page.waitForTimeout(400);
  console.log('11. menu open before outside click:', await page.locator('.ino-context-menu__overlay, .ino-context-menu__submenu').count());
  await page.mouse.click(5, 5);
  await page.waitForTimeout(300);
  console.log('12. menu count after outside click:', await page.locator('.ino-context-menu__overlay, .ino-context-menu__submenu').count());
  await page.close();
}

// --- Static/visual checks per theme + screenshots ---
for (const theme of ['light', 'dark', 'high-contrast']) {
  const page = await freshPage(theme);
  const trigger = page.locator('.demo-trigger, [inoContextMenu]').first();
  await trigger.click({ button: 'right' });
  await page.waitForTimeout(300);
  const iconText = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.ino-context-menu__overlay [role="menuitem"]')).map(e => e.textContent.trim()).slice(0, 4)
  );
  console.log(`13[${theme}]. first 4 menuitem texts (check for literal "pi pi-" strings):`, JSON.stringify(iconText));
  const overlapCheck = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.ino-context-menu__overlay [role="menuitem"]'));
    const rects = items.map(e => e.getBoundingClientRect());
    let overlaps = 0;
    for (let i = 1; i < rects.length; i++) {
      if (rects[i].top < rects[i - 1].bottom - 2) overlaps++;
    }
    return { count: items.length, overlaps };
  });
  console.log(`14[${theme}]. row overlap check:`, JSON.stringify(overlapCheck));
  await page.screenshot({ path: `${EVID}/ino428-fresh-${theme}.png` });
  await page.close();
}

await browser.close();
console.log('done');
