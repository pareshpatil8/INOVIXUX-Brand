import { test, expect } from '@playwright/test';

test.describe('TreeTable keyboard focus management', () => {
  test('ArrowDown should move DOM focus to next row', async ({ page }) => {
    await page.goto('http://localhost:4300/docs/components/treetable');

    // Wait for the page to load and find a single-grid example
    await page.waitForSelector('ino-treetable');

    // Find the first gridcell with tabindex="0"
    const firstCell = page.locator('td[role="gridcell"][tabindex="0"]').first();
    await firstCell.focus();

    // Verify initial focus
    await expect(firstCell).toBeFocused();
    const initialRowIndex = await firstCell.getAttribute('data-row-index');
    const initialColIndex = await firstCell.getAttribute('data-col-index');
    console.log(`Initial focus at row=${initialRowIndex}, col=${initialColIndex}`);

    // Press ArrowDown
    await page.keyboard.press('ArrowDown');

    // Wait a tick for requestAnimationFrame
    await page.waitForTimeout(100);

    // Check that document.activeElement moved to the next row
    const activeElement = page.locator(':focus');
    const newRowIndex = await activeElement.getAttribute('data-row-index');
    const newColIndex = await activeElement.getAttribute('data-col-index');
    console.log(`After ArrowDown, focus at row=${newRowIndex}, col=${newColIndex}`);

    // Verify focus moved down one row
    expect(Number(newRowIndex)).toBe(Number(initialRowIndex) + 1);
    expect(newColIndex).toBe(initialColIndex);

    // Verify the focused element is still a gridcell, not body
    await expect(activeElement).toHaveAttribute('role', 'gridcell');
  });

  test('ArrowRight on collapsible branch should not lose focus to body', async ({ page }) => {
    await page.goto('http://localhost:4300/docs/components/treetable');

    // Wait for the page to load
    await page.waitForSelector('ino-treetable');

    // Find the first gridcell with tabindex="0"
    const firstCell = page.locator('td[role="gridcell"][tabindex="0"]').first();
    await firstCell.focus();
    await expect(firstCell).toBeFocused();

    // Check if this is a branch row (has expand button in tree column)
    const treeColumn = firstCell;
    const hasExpandButton = await treeColumn.locator('button.ino-treetable__expand-button').count() > 0;

    if (!hasExpandButton) {
      console.log('First row is not a branch, skipping this test case');
      test.skip();
    }

    // Check if the branch is collapsed (not expanded)
    const isExpanded = await treeColumn.locator('button.ino-treetable__expand-button--expanded').count() > 0;

    if (isExpanded) {
      // Collapse it first
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(100);
    }

    // Now press ArrowRight to expand
    await page.keyboard.press('ArrowRight');

    // Wait for the expand animation/re-render
    await page.waitForTimeout(150);

    // Verify focus is still on a gridcell (not body)
    const activeElement = page.locator(':focus');
    const tagName = await activeElement.evaluate(el => el.tagName.toLowerCase());
    const role = await activeElement.getAttribute('role');

    console.log(`After ArrowRight expand, activeElement is <${tagName}> with role="${role}"`);

    // Focus should still be on a gridcell, not body
    expect(tagName).not.toBe('body');
    expect(role).toBe('gridcell');
  });
});
