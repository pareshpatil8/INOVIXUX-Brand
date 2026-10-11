import { expect, test } from '@playwright/test';

import { THEMES, gotoDocs, manifestSlugs, pinTheme } from './support/portal';

/**
 * D-gate 3(b) — PER-COMPONENT × PER-THEME VISUAL SNAPSHOTS of the docs pages (doc 26 §7).
 *
 * 43 manifest components × 3 themes = 129 snapshots, plus the 5 portal shell pages × 3.
 *
 * What this gate is for. `check-theme-parity.mjs` proves the three theme token sets agree with
 * each other, and `check-ds-adherence.mjs` proves components reference tokens instead of
 * hardcoding values. Neither can see the result. A component that reads
 * `--ino-color-surface-raised` for its text colour passes both and is invisible in
 * high-contrast; a demo that renders an empty box because its collection input defaulted to
 * `[]` passes both and publishes a blank page. The board's rejection on 2026-09-28 was made of
 * exactly those failures — things that were visibly wrong and mechanically green. A pixel
 * diff is the only check that sees what a visitor sees.
 *
 * The slug list comes from the manifest, never a transcribed array, so a new component is
 * photographed the moment it is registered — with no second list to forget.
 *
 * ── Baselines ────────────────────────────────────────────────────────────────────────────
 * These are PIXEL baselines, valid for exactly one rendering stack: the
 * mcr.microsoft.com/playwright container the CI job runs in (see playwright.config.ts's
 * header for why, and docs/brand/29-ci-gates-d3-ino-31.md for the seed/refresh recipe).
 * Do not commit baselines taken on a laptop — they will diff against everything forever.
 *
 * A LEGITIMATE visual change (a token edit, a demo rewrite, INO-373's page-anatomy
 * migration) is expected to fail this gate. That is the gate working: the diff lands in the
 * PR as an artifact, a human looks at it, and the baselines are refreshed in the same PR that
 * changed the look. It is a review prompt, not a prohibition.
 */

const SHELL_PAGES = [
  { path: '/docs', name: 'overview' },
  { path: '/docs/getting-started', name: 'getting-started' },
  { path: '/docs/components', name: 'components-index' },
  { path: '/docs/design-system', name: 'design-system' },
  { path: '/docs/api-reference', name: 'api-reference' },
];

/**
 * Suppresses the things that legitimately differ between two runs of an identical build.
 * Without this the gate flakes, and a flaky pixel gate is worse than none — the first three
 * false reds are what get it switched off.
 *
 *  - CSS animations/transitions: Playwright's `animations: 'disabled'` finishes them, but a
 *    CSS `animation-delay` on a skeleton shimmer can still be mid-flight at capture.
 *  - `caret-color`: a focused input's blinking caret is a 1px column that changes every
 *    500ms. (`caret: 'hide'` in the config covers the text caret; this covers custom ones.)
 *  - scroll-behavior: a smooth scroll still in progress when the shot is taken.
 */
const FREEZE_CSS = `
  *, *::before, *::after {
    animation-delay: 0s !important;
    animation-duration: 0s !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
  }
  html { scroll-behavior: auto !important; }
`;

for (const theme of THEMES) {
  test.describe(`D-gate 3b — theme: ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await pinTheme(page, theme);
    });

    for (const shell of SHELL_PAGES) {
      test(`portal shell — ${shell.name}`, async ({ page }) => {
        await gotoDocs(page, shell.path);
        await page.addStyleTag({ content: FREEZE_CSS });
        // Fonts settle after first paint; a snapshot taken before they do photographs the
        // fallback face and diffs against everything.
        await page.evaluate(() => document.fonts.ready);
        await expect(page).toHaveScreenshot(`shell-${shell.name}-${theme}.png`, { fullPage: true });
      });
    }

    for (const slug of manifestSlugs()) {
      test(`component — ${slug}`, async ({ page }) => {
        await gotoDocs(page, `/docs/components/${slug}`);

        // The page renders three sections from a runtime fetch (manifest + docs extract). The
        // "Accessibility contract" heading exists either way, so waiting on it would not prove
        // the fetch landed; waiting for the theme switcher — rendered only inside the
        // `*ngIf="component() as c"` branch — does.
        await expect(page.locator('.docs-theme-switcher')).toBeVisible();

        await page.addStyleTag({ content: FREEZE_CSS });
        await page.evaluate(() => document.fonts.ready);

        await expect(page).toHaveScreenshot(`component-${slug}-${theme}.png`, { fullPage: true });
      });
    }
  });
}
