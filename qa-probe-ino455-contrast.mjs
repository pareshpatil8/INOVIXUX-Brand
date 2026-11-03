import { chromium } from 'playwright';

function relLum([r, g, b]) {
  const toLin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [rl, gl, bl] = [toLin(r), toLin(g), toLin(b)];
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}
function parseRgb(str) {
  const m = str.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
function ratio(c1, c2) {
  const l1 = relLum(c1);
  const l2 = relLum(c2);
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto('http://localhost:4300/docs/components/dataview', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

const themes = ['dark', 'light', 'high-contrast'];
const targets = [
  { name: 'list item text', sel: '.dataview-demo__row-name' },
  { name: 'empty message', sel: 'text=No companies found.' },
  { name: 'active paginator page btn text', sel: 'ino-paginator button.ino-paginator__btn--active' },
];

for (const theme of themes) {
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await page.waitForTimeout(200);
  console.log(`\n=== ${theme} ===`);
  for (const t of targets) {
    const el = page.locator(t.sel).first();
    const count = await el.count();
    if (!count) {
      console.log(`${t.name}: NOT FOUND`);
      continue;
    }
    const styles = await el.evaluate((node) => {
      let bg = getComputedStyle(node).backgroundColor;
      let probe = node;
      while (bg === 'rgba(0, 0, 0, 0)' && probe.parentElement) {
        probe = probe.parentElement;
        bg = getComputedStyle(probe).backgroundColor;
      }
      return { color: getComputedStyle(node).color, bg };
    });
    const fg = parseRgb(styles.color);
    const bg = parseRgb(styles.bg);
    if (!fg || !bg) {
      console.log(`${t.name}: could not parse colors`, styles);
      continue;
    }
    const r = ratio(fg, bg);
    console.log(`${t.name}: fg=${styles.color} bg=${styles.bg} ratio=${r.toFixed(2)}:1 ${r >= 4.5 ? 'PASS AA' : 'FAIL AA'}`);
  }
}

await browser.close();
process.exit(0);
