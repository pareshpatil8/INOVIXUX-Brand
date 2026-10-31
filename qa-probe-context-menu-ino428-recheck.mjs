#!/usr/bin/env node
// Isolated re-checks of the three suspect findings from the first independent pass:
// focus-return on Escape, click-outside close, and ArrowRight submenu (via real roving nav).
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:4200';
const browser = await chromium.launch();

async function freshPage() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 2400 } });
  await page.addInitScript(() => {
    try { window.localStorage.setItem('ino-theme', 'light'); } catch {}
    document.documentElement.setAttribute('data-theme', 'light');
  });
  await page.goto(`${BASE}/docs/components/context-menu`, { waitUntil: 'domcontentloaded' });
  await page.locator('.docs-theme-switcher').waitFor({ state: 'visible', timeout: 15000 });
  return page;
}

// --- Check A: focus-return on Escape ---
{
  const page = await freshPage();
  const trigger = page.locator('.demo-trigger, [inoContextMenu]').first();
  await trigger.waitFor({ state: 'visible' });
  await page.evaluate(() => { (document.querySelector('.demo-trigger') || document.querySelector('[inoContextMenu]')).setAttribute('data-probe-trigger', '1'); });
  await trigger.click({ button: 'right' });
  await page.waitForTimeout(300);
  console.log('A1. menu open:', await page.locator('[role="menu"]').count());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const returned = await page.evaluate(() => document.activeElement?.getAttribute('data-probe-trigger') === '1');
  console.log('A2. focus returned to invoking trigger after Escape:', returned, '| activeElement:', await page.evaluate(() => document.activeElement?.outerHTML?.slice(0, 150)));
  await page.close();
}

// --- Check B: click-outside close ---
{
  const page = await freshPage();
  const trigger = page.locator('.demo-trigger, [inoContextMenu]').first();
  await trigger.waitFor({ state: 'visible' });
  await trigger.click({ button: 'right' });
  await page.waitForTimeout(400); // allow setupClickOutsideListener's setTimeout(0) to register
  console.log('B1. menu open before outside click:', await page.locator('[role="menu"]').count());
  await page.mouse.click(5, 5);
  await page.waitForTimeout(300);
  console.log('B2. menu count after outside click:', await page.locator('[role="menu"]').count());
  await page.close();
}

// --- Check C: ArrowRight opens submenu, reached via real ArrowDown roving nav ---
{
  const page = await freshPage();
  const trigger = page.locator('.demo-trigger, [inoContextMenu]').first();
  await trigger.waitFor({ state: 'visible' });
  await trigger.click({ button: 'right' });
  await page.waitForTimeout(300);
  const seq = [];
  for (let i = 0; i < 5; i++) {
    const t = await page.evaluate(() => document.activeElement?.textContent?.trim());
    seq.push(t);
    if (t && t.includes('More actions')) break;
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(120);
  }
  console.log('C1. ArrowDown traversal sequence:', JSON.stringify(seq));
  const onMoreActions = await page.evaluate(() => document.activeElement?.textContent?.trim().includes('More actions'));
  console.log('C2. focused on "More actions" item:', onMoreActions);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(250);
  console.log('C3. role=menu count after ArrowRight (expect 2 if submenu opened):', await page.locator('[role="menu"]').count());
  console.log('C4. submenu item "Rename" visible:', await page.locator('[role="menuitem"]', { hasText: 'Rename' }).count());
  await page.close();
}

await browser.close();
