import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Locator, Page, expect } from '@playwright/test';

/**
 * Shared helpers for the INO-375 portal gates. Nothing here asserts anything on its own —
 * these are the "get the page into a known state" primitives the specs share.
 */

export type InoTheme = 'dark' | 'light' | 'high-contrast';
export const THEMES: readonly InoTheme[] = ['dark', 'light', 'high-contrast'];

/** The 43 shipped components, read from the manifest rather than transcribed — so a new
 *  component is photographed by the visual gate the moment it lands in the manifest, with
 *  no second list to forget to update. */
export function manifestSlugs(): string[] {
  // Resolved from cwd, not from `import.meta.url`: Playwright transpiles specs to CJS, where
  // `import.meta` is a syntax error. Playwright sets cwd to the directory holding
  // playwright.config.ts, which is the repo root — the same base the config's webServer
  // command and snapshotPathTemplate use.
  const manifest = JSON.parse(readFileSync(resolve('docs/brand/design-system.manifest.json'), 'utf8')) as {
    components: { slug: string }[];
  };
  return manifest.components.map((c) => c.slug).sort();
}

/**
 * Pins the theme for the whole page lifetime BEFORE first paint.
 *
 * Not by clicking the on-page theme switcher: that fires after hydration, so a screenshot
 * can catch the switch mid-transition, and it would make each snapshot depend on the
 * switcher still existing. `index.html` runs a small blocking script that reads
 * `localStorage['ino-theme']` and sets `data-theme` on <html> before Angular bootstraps
 * (see the ThemeService docblock), which is exactly the hook we want — same code path a
 * returning visitor takes.
 */
export async function pinTheme(page: Page, theme: InoTheme): Promise<void> {
  await page.addInitScript((value) => {
    try {
      window.localStorage.setItem('ino-theme', value as string);
    } catch {
      /* storage disabled — the init script below still sets the attribute */
    }
    document.documentElement.setAttribute('data-theme', value as string);
  }, theme);
}

/** Navigates and waits for Angular to have rendered the docs shell. `networkidle` is not
 *  usable here (the portal fetches the manifest JSON at runtime), so we wait on the thing
 *  we actually depend on: the article the docs page renders into. */
export async function gotoDocs(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.ino-article').first()).toBeVisible({ timeout: 30_000 });
}

/** Bounding box, or a failure — Playwright types boundingBox() as nullable (an element
 *  with no box at all), and `!` on every call site hides a genuinely useful failure. */
export async function box(locator: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  const b = await locator.boundingBox();
  if (!b) throw new Error(`element has no bounding box (display:none / detached): ${locator}`);
  return b;
}

/** `document.activeElement`, described well enough to read in a failure message. */
export async function activeElement(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return '(none)';
    const attrs = ['data-testid', 'role', 'type', 'name', 'aria-label', 'tabindex']
      .map((a) => (el.getAttribute(a) ? `${a}="${el.getAttribute(a)}"` : ''))
      .filter(Boolean)
      .join(' ');
    const cls = el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).join('.')}` : '';
    return `<${el.tagName.toLowerCase()}${cls ? ' class="' + cls.slice(1) + '"' : ''} ${attrs}>${(el.textContent ?? '').trim().slice(0, 24)}`;
  });
}

/** Whether `document.activeElement` is inside the given element. The focus-trap contract is
 *  about containment, not about which specific control has focus. */
export async function focusIsInside(page: Page, containerSelector: string): Promise<boolean> {
  return page.evaluate((selector) => {
    const container = document.querySelector(selector);
    return !!container && !!document.activeElement && container.contains(document.activeElement);
  }, containerSelector);
}
