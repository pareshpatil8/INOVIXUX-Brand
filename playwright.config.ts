import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the INO-31 D-gate 3 portal gates (doc 26 §7):
 *
 *   `--project=smoke`  → D-gate 3(a) interaction smoke. Overlay anchored to its trigger
 *                        (the direct INO-364 / D1 regression test), focus trap, and the
 *                        WAI-ARIA APG keyboard maps. Behavioural, resolution-independent,
 *                        and safe to run on any platform.
 *   `--project=visual`  → D-gate 3(b) per-component × per-theme docs-page snapshots.
 *                        PIXEL baselines, so it is only meaningful on ONE rendering stack.
 *
 * The split matters. Font rasterisation, scrollbar width and form-control metrics differ
 * between macOS, the ubuntu-latest runner image and the Playwright container, so a baseline
 * taken on a laptop can never be diffed in CI. `smoke` has no such constraint and is the
 * gate contributors run locally. `visual` therefore pins its baselines to ONE environment —
 * the mcr.microsoft.com/playwright container the CI job runs in — and the snapshot path
 * template carries no OS/arch segment precisely so that nobody accidentally commits a
 * second, un-diffable set from their own machine. Details and the reproduce-locally recipe:
 * docs/brand/29-ci-gates-d3-ino-31.md.
 *
 * Both projects run against a production build served by scripts/serve-static.mjs — the same
 * bytes and the same SPA-fallback behaviour deploy-pages.yml publishes.
 */

const PORT = Number(process.env.INO_E2E_PORT ?? 4300);
const BASE_URL = process.env.INO_E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './web/e2e',
  // Every assertion here is about a browser that has already painted, so the default 5s
  // expect timeout is the right order of magnitude; the overall per-test 30s is not, because
  // the first navigation of a run pays for the whole lazy-loaded docs chunk graph.
  timeout: 60_000,
  // A gate that is green because someone left a .only in is worse than no gate.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Bounded rather than unbounded: 129 visual snapshots on a 4-core runner thrash if every
  // worker is compositing a full-page screenshot at once, and thrashing is what turns a
  // pixel gate flaky.
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'web/e2e-report' }], ['list']]
    : [['list']],
  outputDir: 'web/e2e-results',

  use: {
    baseURL: BASE_URL,
    // Screenshots/traces only for failures — a green run should leave nothing behind.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  expect: {
    // 0.2% of pixels may differ before a snapshot fails. Font antialiasing on a
    // sub-pixel-positioned glyph is the only thing that legitimately lands in that band;
    // any real visual regression on a docs page moves far more than 0.2% of it.
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.002,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },

  // Deliberately NO {platform} / {arch} segment — see the header. One committed baseline
  // set, owned by the container the CI job runs in.
  snapshotPathTemplate: 'web/e2e/__screenshots__/{testFileName}/{arg}{ext}',

  projects: [
    {
      name: 'smoke',
      testMatch: /.*\.smoke\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'visual',
      testMatch: /.*\.visual\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // Pinned explicitly rather than inherited from the device preset: the snapshot
        // dimensions ARE the contract, and a Playwright upgrade that retunes a preset
        // would otherwise invalidate every baseline silently.
        viewport: { width: 1280, height: 900 },
        deviceScaleFactor: 1,
        colorScheme: 'no-preference',
        reducedMotion: 'reduce',
      },
    },
  ],

  webServer: {
    command: `node scripts/serve-static.mjs web/dist/web/browser ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
