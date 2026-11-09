import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 1400 } });
let stack = 0, nulld = 0;
p.on('console', m => { if (m.type()==='error'){ const t=m.text(); if(/Maximum call stack/.test(t)) stack++; if(/reading 'destroy'/.test(t)) nulld++; }});
await p.addInitScript(() => document.documentElement.setAttribute('data-theme','light'));
await p.goto('http://localhost:4300/docs/components/context-menu', { waitUntil: 'networkidle' });
await p.locator('.docs-theme-switcher').waitFor({state:'visible',timeout:20000});
const trig = p.locator('.demo-trigger').first();
for (let i=1;i<=4;i++){
  await trig.click({button:'right'}); await p.waitForTimeout(300);
  const open = await p.locator('.ino-context-menu__overlay').count();
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  const closed = await p.locator('.ino-context-menu__overlay').count();
  console.log(`cycle ${i}: opened=${open} afterEscape=${closed} ${closed===0?'OK':'STUCK OPEN'} | cumulative stackOverflow=${stack} nullDestroy=${nulld}`);
}
console.log('hosts left in DOM (leak check, expect 0):', await p.locator('ino-context-menu').count());
await b.close();
