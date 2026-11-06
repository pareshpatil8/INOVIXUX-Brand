#!/usr/bin/env node
/**
 * INO-793 / INO-428 §2 Component Publish Contract probe — ino-context-menu.
 *
 * Re-run of the INO-808 pre-check after INO-810 (a854b56) landed the
 * ContextMenuDemoComponent + CUSTOM_DEMOS entry. The pre-check could not
 * exercise items 1/2/3/5 because the generic renderer never opened a menu;
 * this probe opens the real menu on the shipped docs page and drives it.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = '/tmp/qa-ino-793';
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:4300';
const URL = `${BASE}/docs/components/context-menu`;
const THEMES = ['dark', 'light', 'high-contrast'];

// --- WCAG 2.2 relative luminance / contrast ------------------------------
const srgb = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const lum = ([r, g, b]) => 0.2126 * srgb(r / 255) + 0.7152 * srgb(g / 255) + 0.0722 * srgb(b / 255);
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const parse = (s) => {
  const m = String(s).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(',').map((x) => parseFloat(x.trim()));
  return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 };
};
// flatten a possibly-translucent fg over an opaque bg
const over = (fg, bg) => fg.rgb.map((c, i) => c * fg.a + bg[i] * (1 - fg.a));
const hex = (rgb) => '#' + rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');

const openPage = async (browser, theme) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
  await page.addInitScript((value) => {
    try { window.localStorage.setItem('ino-theme', value); } catch {}
    document.documentElement.setAttribute('data-theme', value);
  }, theme);
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.locator('.docs-theme-switcher').waitFor({ state: 'visible', timeout: 20000 });
  await page.evaluate(() => document.fonts.ready);
  return page;
};

const browser = await chromium.launch();
const log = (...a) => console.log(...a);

// =======================================================================
// Item 1 + 2 + 5 — structure, states, keyboard (light theme, in depth)
// =======================================================================
log('########## ITEM 1/2/5 — STRUCTURE + STATES + KEYBOARD (light) ##########');
{
  const page = await openPage(browser, 'light');
  const trigger = page.locator('.demo-trigger').first();
  await trigger.waitFor({ state: 'visible' });

  log('DEMO_TRIGGER_COUNT (INO-810 fix: expect 4):', await page.locator('[inoContextMenu]').count());
  log('MENU_OPEN_BEFORE_RIGHTCLICK (expect 0):', await page.locator('[role="menu"]').count());

  // --- 1. right-click binding
  await trigger.click({ button: 'right' });
  await page.waitForTimeout(250);
  const menu = page.locator('.ino-context-menu__overlay');
  log('MENU_OPEN_AFTER_RIGHTCLICK (expect 1):', await menu.count());
  log('MENU_ROLE:', await menu.first().getAttribute('role'));
  log('MENU_ARIA_LABEL:', await menu.first().getAttribute('aria-label'));
  log('MENUITEM_COUNT (expect 5 top-level enabled+disabled):',
    await page.locator('.ino-context-menu__overlay > [role="menuitem"]').count());
  log('SEPARATOR_COUNT (expect 2):',
    await page.locator('.ino-context-menu__overlay > [role="separator"]').count());

  // --- 2. disabled state
  const disabled = page.locator('[role="menuitem"][aria-disabled="true"]');
  log('DISABLED_ITEM_COUNT (expect 1):', await disabled.count());
  log('DISABLED_ITEM_LABEL:', (await disabled.first().innerText().catch(() => '')).trim());
  log('DISABLED_ITEM_TABINDEX (expect null — not focusable):',
    await disabled.first().getAttribute('tabindex'));

  // --- ARIA submenu-affordance audit on the parent item
  const parent = page.locator('.ino-context-menu__item--has-children').first();
  log('--- submenu parent ARIA ---');
  log('HAS_CHILDREN_ITEM_LABEL:', (await parent.innerText().catch(() => '')).trim().replace(/\s+/g, ' '));
  log('ARIA_HASPOPUP (ARIA menu pattern requires "true"/"menu"):', await parent.getAttribute('aria-haspopup'));
  log('ARIA_EXPANDED_COLLAPSED (ARIA menu pattern requires "false"):', await parent.getAttribute('aria-expanded'));

  // --- roving tabindex on top level
  const tabindexes = await page.locator('.ino-context-menu__overlay > div').evaluateAll((els) =>
    els.map((e) => ({ role: e.getAttribute('role'), ti: e.getAttribute('tabindex') })));
  log('TOP_LEVEL_ROLE_TABINDEX_MAP:', JSON.stringify(tabindexes));
  log('TOP_LEVEL_TABINDEX_0_COUNT (roving tabindex: expect exactly 1):',
    tabindexes.filter((t) => t.ti === '0').length);

  // --- 5. keyboard: ArrowDown / Home / End
  log('--- keyboard nav ---');
  const activeLabel = () => page.evaluate(() => {
    const el = document.activeElement;
    return el ? (el.className || '') + ' | ' + (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) : '(none)';
  });
  log('ACTIVE_ON_OPEN:', await activeLabel());
  for (const key of ['ArrowDown', 'ArrowDown', 'ArrowDown']) {
    await page.keyboard.press(key);
    await page.waitForTimeout(120);
    log(`AFTER_${key}:`, await activeLabel());
  }
  await page.keyboard.press('Home'); await page.waitForTimeout(120);
  log('AFTER_Home (expect first enabled "Open"):', await activeLabel());
  await page.keyboard.press('End'); await page.waitForTimeout(120);
  log('AFTER_End (expect last enabled "More actions"):', await activeLabel());

  // --- 1. submenu open/close via ArrowRight / ArrowLeft
  log('--- submenu open/close ---');
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200);
  log('SUBMENU_COUNT_AFTER_ArrowRight (expect 1):', await page.locator('.ino-context-menu__submenu').count());
  log('ARIA_EXPANDED_AFTER_ArrowRight (ARIA requires "true"):', await parent.getAttribute('aria-expanded'));
  const subTi = await page.locator('.ino-context-menu__submenu > div').evaluateAll((els) =>
    els.map((e) => ({ role: e.getAttribute('role'), ti: e.getAttribute('tabindex') })));
  log('SUBMENU_ROLE_TABINDEX_MAP:', JSON.stringify(subTi));
  log('SUBMENU_TABINDEX_0_COUNT (roving tabindex: expect exactly 1):',
    subTi.filter((t) => t.ti === '0').length);
  log('ACTIVE_IN_SUBMENU (expect first submenu item "Rename"):', await activeLabel());

  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(200);
  log('SUBMENU_COUNT_AFTER_ArrowLeft (expect 0):', await page.locator('.ino-context-menu__submenu').count());

  // --- 5. Escape closes + focus return contract
  log('--- Escape + focus return ---');
  await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  log('MENU_COUNT_AFTER_Escape (expect 0):', await page.locator('.ino-context-menu__overlay').count());
  log('FOCUS_RETURNED_TO_TRIGGER (expect true):', await page.evaluate(() =>
    !!document.activeElement && document.activeElement.classList.contains('demo-trigger')));

  // --- Enter activation
  log('--- Enter activation ---');
  await trigger.click({ button: 'right' }); await page.waitForTimeout(250);
  await page.keyboard.press('Home'); await page.waitForTimeout(120);
  await page.keyboard.press('Enter'); await page.waitForTimeout(250);
  log('MENU_COUNT_AFTER_Enter (expect 0 — activate closes):',
    await page.locator('.ino-context-menu__overlay').count());
  log('LAST_ACTION_TEXT (expect "Open"):',
    (await page.locator('.demo-live').first().innerText().catch(() => '')).trim());

  await page.close();
}

// =======================================================================
// Item 3 — sizing across density panes
// =======================================================================
log('');
log('########## ITEM 3 — SIZING / DENSITY ##########');
{
  const page = await openPage(browser, 'light');
  for (const density of ['dense', 'default', 'fluid']) {
    const sel = density === 'default'
      ? '.demo-pane:not([data-density]) .demo-trigger'
      : `.demo-pane[data-density="${density}"] .demo-trigger`;
    const t = page.locator(sel).first();
    await t.click({ button: 'right' });
    await page.waitForTimeout(220);
    const h = await page.locator('.ino-context-menu__overlay > [role="menuitem"]').first()
      .evaluate((e) => Math.round(e.getBoundingClientRect().height)).catch(() => null);
    const fs = await page.locator('.ino-context-menu__overlay > [role="menuitem"]').first()
      .evaluate((e) => getComputedStyle(e).fontSize).catch(() => null);
    log(`DENSITY_${density}: item_height=${h}px font_size=${fs}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(180);
  }
  await page.close();
}

// =======================================================================
// Items 2 + 5 — 3 themes: open-menu screenshots + WCAG AA contrast
// =======================================================================
log('');
log('########## ITEM 2/5 — 3 THEMES: OPEN-MENU EVIDENCE + WCAG 2.2 AA ##########');
for (const theme of THEMES) {
  const page = await openPage(browser, theme);
  const trigger = page.locator('.demo-trigger').first();
  await trigger.click({ button: 'right' });
  await page.waitForTimeout(250);
  // open the submenu too, so one screenshot carries every state
  await page.keyboard.press('End'); await page.waitForTimeout(120);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(220);
  await page.screenshot({ path: `${OUT}/context-menu-open-${theme}.png` });

  const probe = await page.evaluate(() => {
    const ov = document.querySelector('.ino-context-menu__overlay');
    const items = [...ov.querySelectorAll(':scope > [role="menuitem"]')];
    const enabled = items.find((e) => e.getAttribute('aria-disabled') !== 'true');
    const dis = items.find((e) => e.getAttribute('aria-disabled') === 'true');
    const sep = ov.querySelector(':scope > [role="separator"]');
    const sub = ov.querySelector('.ino-context-menu__submenu');
    const cs = (e) => (e ? getComputedStyle(e) : null);
    const bgOf = (e) => {
      // walk up for the first non-transparent background
      let n = e;
      while (n) {
        const b = getComputedStyle(n).backgroundColor;
        const m = b.match(/rgba?\(([^)]+)\)/);
        if (m) { const p = m[1].split(',').map(parseFloat); if ((p[3] ?? 1) > 0.95) return b; }
        n = n.parentElement;
      }
      return 'rgb(255,255,255)';
    };
    return {
      overlayBg: cs(ov).backgroundColor,
      overlayBorder: cs(ov).borderTopColor,
      pageBg: bgOf(ov.parentElement),
      enabledLabel: enabled ? cs(enabled.querySelector('.ino-context-menu__label') || enabled).color : null,
      enabledText: enabled ? enabled.textContent.trim().replace(/\s+/g, ' ') : null,
      disabledLabel: dis ? cs(dis.querySelector('.ino-context-menu__label') || dis).color : null,
      disabledText: dis ? dis.textContent.trim().replace(/\s+/g, ' ') : null,
      sepColor: sep ? (cs(sep).borderTopColor !== 'rgba(0, 0, 0, 0)' ? cs(sep).borderTopColor : cs(sep).backgroundColor) : null,
      subBg: sub ? cs(sub).backgroundColor : null,
      subLabel: sub && sub.querySelector('[role="menuitem"]') ? cs(sub.querySelector('[role="menuitem"]')).color : null,
    };
  });

  log(`--- ${theme} ---`);
  const oBg = parse(probe.overlayBg);
  const pBg = parse(probe.pageBg);
  const oBgFlat = oBg.a < 1 ? over(oBg, pBg.rgb) : oBg.rgb;
  log(`  overlay bg ${probe.overlayBg} -> flattened ${hex(oBgFlat)}`);

  const check = (name, colStr, bgRgb, min) => {
    if (!colStr) { log(`  ${name}: (not measured)`); return; }
    const c = parse(colStr);
    const flat = c.a < 1 ? over(c, bgRgb) : c.rgb;
    const r = ratio(flat, bgRgb);
    log(`  ${name}: ${hex(flat)} on ${hex(bgRgb)} = ${r.toFixed(2)}:1  (AA min ${min})  ${r >= min ? 'PASS' : 'FAIL'}`);
  };
  check(`enabled label "${probe.enabledText}"`, probe.enabledLabel, oBgFlat, 4.5);
  check(`disabled label "${probe.disabledText}"`, probe.disabledLabel, oBgFlat, 4.5);
  check('separator (non-text, 3:1)', probe.sepColor, oBgFlat, 3.0);
  check('overlay border vs page (non-text, 3:1)', probe.overlayBorder, pBg.rgb, 3.0);
  if (probe.subBg) {
    const sB = parse(probe.subBg);
    const sFlat = sB.a < 1 ? over(sB, oBgFlat) : sB.rgb;
    check('submenu label', probe.subLabel, sFlat, 4.5);
  }
  await page.close();
}

// =======================================================================
// Item 6 — docs page prose renders formatted
// =======================================================================
log('');
log('########## ITEM 6 — DOCS PAGE NOTES/A11Y RENDER ##########');
{
  const page = await openPage(browser, 'light');
  log('RAW_MARKDOWN_PRE_COUNT (expect 0):', await page.locator('pre.docs-markdown').count());
  for (const h of ['Accessibility', 'Notes', 'Mobile parity']) {
    const html = await page.locator(`h2:text-is("${h}") + *`).first().innerHTML().catch(() => '(not found)');
    log(`${h.toUpperCase()}_LEN:`, html.length, '|', html.slice(0, 120).replace(/\n/g, ' '));
  }
  await page.close();
}

await browser.close();
log('');
log('DONE. Open-menu screenshots in', OUT);
