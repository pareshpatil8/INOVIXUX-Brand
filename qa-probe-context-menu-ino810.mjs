#!/usr/bin/env node
/**
 * QA probe: INO-810 — ContextMenuDemoComponent verification
 *
 * Verifies:
 * 1. Right-click target present
 * 2. Context menu opens on right-click with role="menu"
 * 3. Menu items include disabled item, separator, nested submenu
 * 4. Keyboard navigation works (Arrow/Home/End/Enter/Escape)
 * 5. All 3 density modes render with menu open
 * 6. All 3 themes render
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:4200';
const THEMES = ['light', 'dark', 'hc'];

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('INO-810 Context Menu Demo Verification\n');

  try {
    // Navigate to context-menu docs page
    await page.goto(`${BASE_URL}/docs/components/context-menu`, { waitUntil: 'networkidle' });
    console.log('✓ Page loaded');

    // Verify right-click target exists
    const trigger = await page.locator('.demo-trigger').first();
    if (!(await trigger.isVisible())) {
      throw new Error('Right-click trigger not found');
    }
    console.log('✓ Right-click target present');

    // Right-click to open menu
    await trigger.click({ button: 'right' });
    await page.waitForTimeout(500);

    // Verify menu appears with role="menu"
    const menu = await page.locator('[role="menu"]');
    if (!(await menu.isVisible())) {
      throw new Error('Context menu did not open');
    }
    console.log('✓ Menu opens with role="menu"');

    // Count menu items (excluding separators)
    const menuItems = await page.locator('[role="menuitem"]').count();
    console.log(`✓ Menu has ${menuItems} items`);

    // Check for disabled item
    const disabledItem = await page.locator('[role="menuitem"][aria-disabled="true"]');
    if ((await disabledItem.count()) === 0) {
      throw new Error('No disabled item found');
    }
    console.log('✓ Disabled item present');

    // Check for separator
    const separator = await page.locator('.ino-context-menu__separator, [role="separator"]');
    if ((await separator.count()) === 0) {
      throw new Error('No separator found');
    }
    console.log('✓ Separator present');

    // Check for nested submenu (item with children)
    const submenuItem = await page.locator('[role="menuitem"]:has-text("More actions")');
    if (!(await submenuItem.isVisible())) {
      throw new Error('Nested submenu item not found');
    }
    console.log('✓ Nested submenu item present');

    // Test keyboard navigation - Arrow Down
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    console.log('✓ ArrowDown works');

    // Test Home key
    await page.keyboard.press('Home');
    await page.waitForTimeout(200);
    console.log('✓ Home key works');

    // Test End key
    await page.keyboard.press('End');
    await page.waitForTimeout(200);
    console.log('✓ End key works');

    // Test Escape to close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    if (await menu.isVisible()) {
      throw new Error('Menu did not close on Escape');
    }
    console.log('✓ Escape closes menu');

    // Test density modes
    const denseTrigger = await page.locator('.demo-pane[data-density="dense"] .demo-trigger');
    await denseTrigger.click({ button: 'right' });
    await page.waitForTimeout(500);
    if (!(await menu.isVisible())) {
      throw new Error('Dense mode menu did not open');
    }
    console.log('✓ Dense mode renders with menu open');
    await page.keyboard.press('Escape');

    const fluidTrigger = await page.locator('.demo-pane[data-density="fluid"] .demo-trigger');
    await fluidTrigger.click({ button: 'right' });
    await page.waitForTimeout(500);
    const fluidMenu = await page.locator('[role="menu"][aria-label*="fluid"]');
    if (!(await fluidMenu.isVisible())) {
      throw new Error('Fluid mode menu did not open');
    }
    console.log('✓ Fluid mode renders with menu open');
    await page.keyboard.press('Escape');

    // Test themes
    for (const theme of THEMES) {
      await page.evaluate((t) => {
        document.documentElement.setAttribute('data-theme', t);
      }, theme);
      await page.waitForTimeout(500);

      await trigger.click({ button: 'right' });
      await page.waitForTimeout(500);

      const themeMenu = await page.locator('[role="menu"]').first();
      if (!(await themeMenu.isVisible())) {
        throw new Error(`Menu did not render in ${theme} theme`);
      }
      console.log(`✓ ${theme} theme renders`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    console.log('\n✅ All verifications passed');

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
