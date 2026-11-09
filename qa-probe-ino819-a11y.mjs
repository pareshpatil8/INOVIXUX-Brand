#!/usr/bin/env node --experimental-default-type=module
/**
 * INO-819 a11y verification probe
 * Tests 5 defects:
 * 1. Submenu parent has aria-haspopup and aria-expanded
 * 2. Roving tabindex in submenu (exactly one tabindex="0")
 * 3. Submenu role="menu" is NOT nested inside role="menuitem"
 * 4. Focus returns to trigger on close
 * 5. Overlay boundary contrast >= 3:1 or visible shadow
 */

import { chromium } from 'playwright';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pc = require('picocolors');

const PORT = 4200;
const URL = `http://localhost:${PORT}`;

async function probe() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(URL, { waitUntil: 'networkidle' });

    // Navigate to context menu demo
    await page.click('a[href="/docs/components"]');
    await page.waitForTimeout(500);

    // Find context menu demo section
    const demoSection = await page.locator('text=Context Menu').first();
    await demoSection.scrollIntoViewIfNeeded();

    // Right-click to open menu
    const trigger = await page.locator('[inoContextMenu]').first();
    await trigger.click({ button: 'right' });
    await page.waitForTimeout(300);

    // Test 1: Check parent item with children has aria-haspopup and aria-expanded
    const parentItem = await page.locator('.ino-context-menu__item--has-children').first();
    const ariaHasPopup = await parentItem.getAttribute('aria-haspopup');
    const ariaExpanded = await parentItem.getAttribute('aria-expanded');

    console.log(pc.cyan('\n1. Submenu parent ARIA attributes:'));
    console.log(`   aria-haspopup: ${ariaHasPopup} ${ariaHasPopup === 'menu' ? pc.green('✓') : pc.red('✗ (expected "menu")')}`);
    console.log(`   aria-expanded: ${ariaExpanded} ${ariaExpanded === 'false' ? pc.green('✓') : pc.red('✗ (expected "false" when closed)')}`);

    // Open submenu with keyboard
    await parentItem.focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);

    const ariaExpandedOpen = await parentItem.getAttribute('aria-expanded');
    console.log(`   aria-expanded (open): ${ariaExpandedOpen} ${ariaExpandedOpen === 'true' ? pc.green('✓') : pc.red('✗ (expected "true" when open)')}`);

    // Test 2: Check roving tabindex in submenu
    const submenuItems = await page.locator('.ino-context-menu__submenu [role="menuitem"]').all();
    const tabindexes = await Promise.all(
      submenuItems.map(item => item.getAttribute('tabindex'))
    );
    const zeroCount = tabindexes.filter(ti => ti === '0').length;

    console.log(pc.cyan('\n2. Submenu roving tabindex:'));
    console.log(`   Tabindex values: [${tabindexes.join(', ')}]`);
    console.log(`   Items with tabindex="0": ${zeroCount} ${zeroCount === 1 ? pc.green('✓') : pc.red('✗ (expected exactly 1)')}`);

    // Test 3: Check submenu is NOT nested inside menuitem
    const submenuParent = await page.locator('.ino-context-menu__submenu').evaluateHandle(
      el => el.parentElement
    );
    const parentRole = await submenuParent.evaluate(el => el.getAttribute('role'));
    const isDirectChild = await page.locator('.ino-context-menu__overlay > .ino-context-menu__submenu').count();

    console.log(pc.cyan('\n3. Submenu DOM structure:'));
    console.log(`   Submenu parent role: ${parentRole || '(none)'} ${parentRole !== 'menuitem' ? pc.green('✓') : pc.red('✗ (should NOT be menuitem)')}`);
    console.log(`   Submenu is direct child of overlay: ${isDirectChild > 0 ? pc.green('✓ Yes') : pc.red('✗ No')}`);

    // Test 4: Check focus return to trigger
    const triggerTabindex = await trigger.getAttribute('tabindex');
    console.log(pc.cyan('\n4. Focus return capability:'));
    console.log(`   Trigger tabindex: ${triggerTabindex} ${triggerTabindex !== null ? pc.green('✓') : pc.red('✗ (trigger needs tabindex for focus)')}`);

    // Close menu with Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    const activeElement = await page.evaluate(() => {
      const ae = document.activeElement;
      return ae ? ae.tagName + (ae.className ? '.' + ae.className.split(' ')[0] : '') : 'unknown';
    });
    console.log(`   Active element after Escape: ${activeElement}`);
    console.log(`   ${activeElement !== 'BODY' ? pc.green('✓ Focus returned') : pc.red('✗ Focus went to BODY')}`);

    // Test 5: Check overlay boundary contrast
    // Re-open menu
    await trigger.click({ button: 'right' });
    await page.waitForTimeout(300);

    const overlayStyles = await page.locator('.ino-context-menu__overlay').evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        border: styles.border,
        borderColor: styles.borderColor,
        boxShadow: styles.boxShadow,
        background: styles.backgroundColor
      };
    });

    console.log(pc.cyan('\n5. Overlay boundary (WCAG 1.4.11):'));
    console.log(`   Border: ${overlayStyles.border}`);
    console.log(`   Box-shadow: ${overlayStyles.boxShadow !== 'none' ? pc.green('✓ ' + overlayStyles.boxShadow) : pc.yellow('(none - relying on border)')}`);

    if (overlayStyles.boxShadow !== 'none') {
      console.log(pc.green('   ✓ Shadow provides visible boundary'));
    } else {
      console.log(pc.yellow('   Border contrast needs manual verification in all 3 themes'));
    }

    console.log(pc.green('\n✓ All checks complete'));

  } catch (error) {
    console.error(pc.red('\n✗ Probe failed:'), error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

probe().catch(err => {
  console.error(err);
  process.exit(1);
});
