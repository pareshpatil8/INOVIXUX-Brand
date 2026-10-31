#!/usr/bin/env node
/**
 * INO-817 keyboard navigation fix verification
 * Tests that all navigable items are reachable by keyboard.
 */

import { chromium } from 'playwright';

const PORT = process.env.PORT || 4200;
const BASE = `http://localhost:${PORT}`;

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('→ Navigate to context menu demo');
    await page.goto(`${BASE}/docs/components/context-menu`, { waitUntil: 'networkidle' });

    console.log('→ Open context menu via right-click');
    const trigger = await page.locator('text=Right-click this box').first();
    await trigger.click({ button: 'right' });

    // Wait for menu to be visible
    await page.waitForSelector('.ino-context-menu--visible', { timeout: 2000 });

    console.log('→ Test keyboard navigation through all items');

    // Start at first item (should be "Open")
    let focused = await page.locator('.ino-context-menu__item[tabindex="0"]').textContent();
    console.log(`  Initial focus: ${focused.trim()}`);

    const visited = [focused.trim()];

    // ArrowDown x1 -> Save
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
    focused = await page.locator('.ino-context-menu__item[tabindex="0"]').textContent();
    console.log(`  After ArrowDown: ${focused.trim()}`);
    visited.push(focused.trim());

    // ArrowDown x2 -> should skip separator and disabled "Copy", land on Paste
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
    focused = await page.locator('.ino-context-menu__item[tabindex="0"]').textContent();
    console.log(`  After ArrowDown: ${focused.trim()}`);
    visited.push(focused.trim());

    // ArrowDown x3 -> should skip separator, land on "More actions"
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
    focused = await page.locator('.ino-context-menu__item[tabindex="0"]').textContent();
    console.log(`  After ArrowDown: ${focused.trim()}`);
    visited.push(focused.trim());

    console.log('\n→ Test Home key');
    await page.keyboard.press('Home');
    await page.waitForTimeout(100);
    focused = await page.locator('.ino-context-menu__item[tabindex="0"]').textContent();
    console.log(`  After Home: ${focused.trim()}`);

    console.log('\n→ Test End key');
    await page.keyboard.press('End');
    await page.waitForTimeout(100);
    focused = await page.locator('.ino-context-menu__item[tabindex="0"]').textContent();
    console.log(`  After End: ${focused.trim()}`);
    const endItem = focused.trim();

    console.log('\n→ Test ArrowRight to open submenu');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);
    const submenuVisible = await page.locator('.ino-context-menu__submenu').isVisible();
    console.log(`  Submenu visible: ${submenuVisible}`);

    console.log('\n→ Test ArrowLeft to close submenu');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(200);
    const submenuHidden = !(await page.locator('.ino-context-menu__submenu').isVisible());
    console.log(`  Submenu closed: ${submenuHidden}`);

    console.log('\n→ Results:');
    console.log(`  Distinct items visited: [${[...new Set(visited)].join(', ')}]`);
    console.log(`  Expected: [Open, Save, Paste, More actions]`);
    console.log(`  End key reached: ${endItem}`);
    console.log(`  Expected: More actions`);
    console.log(`  Submenu keyboard control: ${submenuVisible && submenuHidden ? 'PASS' : 'FAIL'}`);

    const uniqueVisited = [...new Set(visited)];
    const hasOpen = uniqueVisited.some(v => v.includes('Open'));
    const hasSave = uniqueVisited.some(v => v.includes('Save'));
    const hasPaste = uniqueVisited.some(v => v.includes('Paste'));
    const hasMoreActions = uniqueVisited.some(v => v.includes('More actions'));

    const pass = uniqueVisited.length === 4 &&
                 hasOpen &&
                 hasSave &&
                 hasPaste &&
                 hasMoreActions &&
                 endItem.includes('More actions') &&
                 submenuVisible &&
                 submenuHidden;

    console.log(`\n✓ ${pass ? 'PASS' : 'FAIL'}: All navigable items reachable, submenu keyboard-accessible`);

    await page.waitForTimeout(2000);
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
})();
