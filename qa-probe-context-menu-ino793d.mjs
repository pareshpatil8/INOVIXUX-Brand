#!/usr/bin/env node
/** INO-793 scope: which close paths throw; is the load-time error context-menu-specific. */
import { chromium } from '@playwright/test';
const B = 'http://localhost:4300';
const log = (...a) => console.log(...a);

const mk = async (b, path) => {
  const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 1400 } });
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().split('\n')[0].slice(0, 110)); });
  await p.addInitScript(() => document.documentElement.setAttribute('data-theme', 'light'));
  await p.goto(`${B}${path}`, { waitUntil: 'networkidle' });
  await p.locator('.docs-theme-switcher').waitFor({ state: 'visible', timeout: 20000 });
  return { p, errs };
};
const browser = await chromium.launch();

log('===== LOAD-TIME ERRORS: context-menu vs control pages =====');
for (const path of ['/docs/components/context-menu', '/docs/components/panel', '/docs/components/breadcrumb']) {
  const { p, errs } = await mk(browser, path);
  await p.waitForTimeout(600);
  log(`${path}: ${errs.length} error(s)`);
  [...new Set(errs)].slice(0, 3).forEach((e) => log('   ', e));
  await p.close();
}

log('');
log('===== CLOSE-PATH SCOPE (fresh page each) =====');
for (const how of ['escape', 'click-item', 'enter-item', 'click-outside']) {
  const { p, errs } = await mk(browser, '/docs/components/context-menu');
  errs.length = 0; // ignore load noise, measure the interaction only
  const trig = p.locator('.demo-trigger').first();
  await trig.click({ button: 'right' });
  await p.waitForTimeout(300);
  const before = await p.locator('.ino-context-menu__overlay').count();
  if (how === 'escape') await p.keyboard.press('Escape');
  else if (how === 'click-item') await p.locator('.ino-context-menu__overlay > [role="menuitem"]').first().click();
  else if (how === 'enter-item') await p.keyboard.press('Enter');
  else await p.locator('h1').first().click({ force: true });
  await p.waitForTimeout(500);
  const after = await p.locator('.ino-context-menu__overlay').count();
  const stack = errs.filter((e) => /Maximum call stack/.test(e)).length;
  const nulld = errs.filter((e) => /reading 'destroy'/.test(e)).length;
  log(`${how.padEnd(14)} open=${before} -> after=${after} ${after === 0 ? 'CLOSED' : 'STILL OPEN'} | stackOverflow=${stack} nullDestroy=${nulld} totalErrs=${errs.length}`);
  await p.close();
}

await browser.close();
log('DONE');
