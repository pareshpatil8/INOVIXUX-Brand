import { chromium } from '@playwright/test';
const BASE = 'http://localhost:4300';
function srgbToLin(c){c=c/255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4;}
function luminance([r,g,b]){return 0.2126*srgbToLin(r)+0.7152*srgbToLin(g)+0.0722*srgbToLin(b);}
function parseRgb(s){return s.match(/(\d+(\.\d+)?)/g).map(Number);}
function contrast(c1,c2){const L1=luminance(parseRgb(c1)),L2=luminance(parseRgb(c2));const[hi,lo]=L1>L2?[L1,L2]:[L2,L1];return (hi+0.05)/(lo+0.05);}
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
await page.goto(`${BASE}/docs/components/table`, { waitUntil: 'networkidle' });
await page.locator('.docs-theme-switcher').waitFor({ state: 'visible', timeout: 30000 });
const btn = page.locator('.ino-paginator__btn--active').first();
await btn.waitFor({ state: 'visible', timeout: 15000 });
const styles = await btn.evaluate(el => { const cs=getComputedStyle(el); return {color: cs.color, bg: cs.backgroundColor}; });
console.log('table active-page button:', styles, 'ratio', contrast(styles.color, styles.bg).toFixed(2));
await browser.close();
