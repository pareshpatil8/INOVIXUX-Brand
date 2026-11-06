#!/usr/bin/env node
/** INO-793 confirm-pass: unresolved tokens, keyboard reachability, submenu-by-hover. */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const OUT = '/tmp/qa-ino-793';
mkdirSync(OUT, { recursive: true });
const URL = 'http://localhost:4300/docs/components/context-menu';
const log = (...a) => console.log(...a);

const open = async (b, theme) => {
  const p = await b.newPage({ viewport: { width: 1280, height: 1400 } });
  await p.addInitScript((v) => {
    try { window.localStorage.setItem('ino-theme', v); } catch {}
    document.documentElement.setAttribute('data-theme', v);
  }, theme);
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.locator('.docs-theme-switcher').waitFor({ state: 'visible', timeout: 20000 });
  await p.evaluate(() => document.fonts.ready);
  return p;
};

const browser = await chromium.launch();

log('########## A. UNRESOLVED-TOKEN RUNTIME EFFECT ##########');
{
  const page = await open(browser, 'light');
  await page.locator('.demo-trigger').first().click({ button: 'right' });
  await page.waitForTimeout(250);
  const m = await page.evaluate(() => {
    const ov = document.querySelector('.ino-context-menu__overlay');
    const it = ov.querySelector(':scope > [role="menuitem"]');
    const o = getComputedStyle(ov), i = getComputedStyle(it);
    const root = getComputedStyle(document.documentElement);
    const tok = (n) => JSON.stringify(root.getPropertyValue(n));
    return {
      resolved: {
        height_compact: tok('--ino-control-height-compact'),
        font_compact: tok('--ino-control-font-size-compact'),
        gap_compact: tok('--ino-control-gap-compact'),
        pad_compact: tok('--ino-control-padding-inline-compact'),
        shadow_lg: tok('--ino-shadow-lg'),
        z_overlay: tok('--ino-z-overlay'),
        surface: tok('--ino-color-surface'),
      },
      item: { minHeight: i.minHeight, height: i.height, paddingInline: i.paddingInlineStart + ' / ' + i.paddingInlineEnd, gap: i.columnGap, fontSize: i.fontSize },
      overlay: { boxShadow: o.boxShadow, zIndex: o.zIndex, border: o.borderTopWidth + ' ' + o.borderTopStyle + ' ' + o.borderTopColor },
    };
  });
  log('TOKEN VALUES AS RESOLVED BY THE BROWSER ("" = undefined):');
  for (const [k, v] of Object.entries(m.resolved)) log(`  --ino-${k.replace(/_/g, '-')} = ${v}`);
  log('MENU ITEM COMPUTED:', JSON.stringify(m.item));
  log('OVERLAY COMPUTED:', JSON.stringify(m.overlay));

  log('--- separator visibility ---');
  log(JSON.stringify(await page.locator('.ino-context-menu__overlay > [role="separator"]').first().evaluate((e) => {
    const c = getComputedStyle(e);
    return { height: c.height, borderTop: c.borderTopWidth + ' ' + c.borderTopStyle, bg: c.backgroundColor, rectH: Math.round(e.getBoundingClientRect().height) };
  })));
  await page.close();
}

log('');
log('########## B. KEYBOARD REACHABILITY OF ALL 4 ENABLED ITEMS ##########');
{
  const page = await open(browser, 'light');
  await page.locator('.demo-trigger').first().click({ button: 'right' });
  await page.waitForTimeout(250);
  const active = () => page.evaluate(() => (document.activeElement?.textContent || '(body)').trim().replace(/\s+/g, ' '));
  const seen = new Set();
  log('open ->', await active()); seen.add(await active());
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('ArrowDown'); await page.waitForTimeout(110);
    const a = await active(); seen.add(a);
    log(`  ArrowDown x${i + 1} ->`, a);
  }
  log('DISTINCT ITEMS REACHED BY ArrowDown:', JSON.stringify([...seen]));
  log('EXPECTED 4 enabled: Open, Save, Paste, More actions');

  log('--- End / ArrowUp ---');
  await page.keyboard.press('End'); await page.waitForTimeout(120); log('  End ->', await active());
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(120); log('  ArrowUp ->', await active());

  log('--- ArrowRight on whatever is reachable (submenu by keyboard?) ---');
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(220);
  log('  submenu count:', await page.locator('.ino-context-menu__submenu').count());
  await page.close();
}

log('');
log('########## C. SUBMENU BY HOVER (mouse path) ##########');
{
  const page = await open(browser, 'light');
  await page.locator('.demo-trigger').first().click({ button: 'right' });
  await page.waitForTimeout(250);
  await page.locator('.ino-context-menu__item--has-children').first().hover();
  await page.waitForTimeout(400);
  const n = await page.locator('.ino-context-menu__submenu').count();
  log('SUBMENU_COUNT_AFTER_HOVER (expect 1):', n);
  if (n) {
    log('SUBMENU_ITEMS:', JSON.stringify(await page.locator('.ino-context-menu__submenu [role="menuitem"]').allInnerTexts()));
    log('SUBMENU_TABINDEXES (roving requires exactly one "0"):', JSON.stringify(
      await page.locator('.ino-context-menu__submenu > div').evaluateAll((e) => e.map((x) => x.getAttribute('tabindex')))));
    log('SUBMENU_role:', await page.locator('.ino-context-menu__submenu').first().getAttribute('role'));
    log('PARENT_IS_role_menuitem_containing_role_menu (ARIA structure violation if true):',
      await page.locator('[role="menuitem"] > .ino-context-menu__submenu[role="menu"]').count() > 0);
  }
  await page.close();
}

log('');
log('########## D. FOCUS RETURN + Enter ACTIVATION (isolated) ##########');
{
  const page = await open(browser, 'light');
  const trig = page.locator('.demo-trigger').first();
  log('TRIGGER_TABINDEX (focusable? null = not focusable):', await trig.getAttribute('tabindex'));
  await trig.click({ button: 'right' }); await page.waitForTimeout(250);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  log('AFTER_Escape activeElement:', await page.evaluate(() => {
    const e = document.activeElement;
    return e ? `${e.tagName}.${e.className || '(none)'}` : '(null)';
  }));

  log('--- Enter on first item ---');
  await trig.click({ button: 'right' }); await page.waitForTimeout(300);
  log('  active before Enter:', await page.evaluate(() => (document.activeElement?.textContent || '(body)').trim().replace(/\s+/g, ' ').slice(0, 30)));
  await page.keyboard.press('Enter'); await page.waitForTimeout(350);
  log('  menu count after Enter (expect 0):', await page.locator('.ino-context-menu__overlay').count());
  log('  demo last-action line:', (await page.locator('.demo-live').first().innerText().catch(() => '(none)')).trim());
  log('--- click activation ---');
  if (await page.locator('.ino-context-menu__overlay').count() === 0) { await trig.click({ button: 'right' }); await page.waitForTimeout(250); }
  await page.locator('.ino-context-menu__overlay > [role="menuitem"]').first().click();
  await page.waitForTimeout(300);
  log('  menu count after click (expect 0):', await page.locator('.ino-context-menu__overlay').count());
  log('  demo last-action line after click:', (await page.locator('.demo-live').first().innerText().catch(() => '(none)')).trim());
  await page.close();
}

log('');
log('########## E. DIRECTIVE OUTPUT SURFACE ##########');
log('(demo binds no output; checked in source separately)');

await browser.close();
log('DONE');
