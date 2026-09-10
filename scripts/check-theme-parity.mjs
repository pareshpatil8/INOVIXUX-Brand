// Dependency-free source-contract audit. Run from any directory with Node.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const cssRaw = read('docs/brand/02-design-tokens/tokens.css');
assert.equal(read('web/src/tokens.css'), cssRaw, 'canonical/web CSS byte parity');
const capacitorStyles = read('mobile/capacitor/app/src/styles.scss');
const capacitorImport = capacitorStyles.match(/@import\s+'([^']*web\/src\/tokens\.css)';/)?.[1];
assert.ok(capacitorImport, 'Capacitor shared import present');
// Resolve the relative path the same way Sass would, from the importing file's own directory —
// a plausible-looking '../web/src/tokens.css' regex match is not proof the path actually
// resolves (it previously pointed one directory short and silently broke the Capacitor build).
assert.ok(
  existsSync(new URL(capacitorImport, new URL('mobile/capacitor/app/src/', root))),
  `Capacitor import path does not resolve to a real file: ${capacitorImport}`
);
const css = cssRaw.replace(/\/\*[\s\S]*?\*\//g, '');
const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
const declarations = body => Object.fromEntries([...body.matchAll(/(--ino-[\w-]+)\s*:\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
const base = Object.assign({}, ...blocks.filter(m => m[1].trim() === ':root').map(m => declarations(m[2])));
const themes = { dark: base };
for (const m of blocks) {
  const name = m[1].trim().match(/^\[data-theme="([\w-]+)"\]$/)?.[1];
  if (name) themes[name] = { ...base, ...declarations(m[2]) };
}
function resolve(value, vars, seen = []) {
  return value.replace(/var\((--ino-[\w-]+)\)/g, (_, key) => {
    assert.ok(vars[key] && !seen.includes(key), `missing/cyclic token ${key}`);
    return resolve(vars[key], vars, [...seen, key]);
  });
}
function rgba(value) {
  if (/^#[\da-f]{6}$/i.test(value)) return [...value.slice(1).match(/../g).map(x => parseInt(x, 16)), 1];
  const m = value.match(/^rgba\(([^)]+)\)$/);
  assert.ok(m, `Unsupported color ${value}`);
  return m[1].split(',').map(Number);
}
const rn = read('mobile/react-native/src/theme/tokens.ts').replace(/\/\/[^\n]*/g, '');
const dart = read('mobile/flutter/lib/theme/tokens.dart').replace(/\/\/[^\n]*/g, '');
const camel = key => key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const palettes = { dark: ['Dark', 'dark'], light: ['Light', 'light'], 'high-contrast': ['HighContrast', 'highContrast'] };
const resolved = {};
let colorChecks = 0;
for (const [theme, vars] of Object.entries(themes)) {
  assert.ok(palettes[theme], `Register mobile palette for theme ${theme}`);
  const [jsName, dartName] = palettes[theme];
  const jsBody = rn.match(new RegExp(`export const colors${jsName} = \\{([\\s\\S]*?)\\} as const`))?.[1];
  const dartBody = dart.match(new RegExp(`static const ${dartName} = InoPalette\\(([\\s\\S]*?)\\);`))?.[1];
  assert.ok(jsBody && dartBody, `Missing mobile palette ${theme}`);
  const js = Object.fromEntries([...jsBody.matchAll(/(\w+):\s*'([^']+)'/g)].map(m => [m[1], rgba(m[2])]));
  const flutter = Object.fromEntries([...dartBody.matchAll(/(\w+):\s*Color\(0x([\dA-F]{8})\)/gi)].map(m => {
    const bytes = m[2].match(/../g).map(x => parseInt(x, 16));
    return [m[1], [...bytes.slice(1), bytes[0] / 255]];
  }));
  const fields = [...dart.matchAll(/final Color (\w+);/g)].map(m => m[1]).sort();
  assert.deepEqual(Object.keys(js).sort(), fields, `${theme} RN role completeness`);
  assert.deepEqual(Object.keys(flutter).sort(), fields, `${theme} Flutter role completeness`);
  resolved[theme] = Object.fromEntries(Object.entries(vars).filter(([k]) => k.startsWith('--ino-color-')).map(([k,v]) => [camel(k.slice(12)), rgba(resolve(v, vars))]));
  for (const field of fields) {
    const expected = resolved[theme][field];
    assert.ok(expected, `${theme}/${field} canonical role exists`);
    assert.deepEqual(js[field], expected, `${theme}/${field} RN`);
    for (let i = 0; i < 4; i++) assert.ok(Math.abs(flutter[field][i] - expected[i]) <= (i === 3 ? 0.5 / 255 + 1e-9 : 0), `${theme}/${field} Dart channel ${i}`);
    colorChecks++;
  }
}
const numeric = key => parseFloat(base[key]);
const rnGroup = name => rn.match(new RegExp(`export const ${name} = \\{([\\s\\S]*?)\\} as const`))[1];
for (const [n,v] of [...rnGroup('space').matchAll(/(\d+):\s*(\d+)/g)].map(m => [m[1], Number(m[2])])) {
  assert.equal(v, numeric(`--ino-space-${n}`));
  assert.equal(Number(dart.match(new RegExp(`\\bs${n} = (\\d+)`))?.[1]), v, `Flutter space ${n}`);
}
for (const m of rnGroup('radius').matchAll(/(\w+):\s*(\d+)/g)) {
  assert.equal(Number(m[2]), numeric(`--ino-radius-${m[1]}`));
  assert.match(dart, new RegExp(`\\b${m[1]} = ${m[2]}\\b`));
}
for (const [jsName,dartName,token] of [['targetComfortable','comfortable','--ino-target-comfortable'],['targetSpacing','spacing','--ino-target-spacing']]) {
  const n = numeric(token);
  assert.match(rn, new RegExp(`${jsName} = ${n};`));
  assert.match(dart, new RegExp(`\\b${dartName} = ${n}\\b`));
}
for (const name of ['fast','base','slow']) {
  const n = numeric(`--ino-motion-duration-${name}`);
  assert.match(rn, new RegExp(`duration${name[0].toUpperCase()+name.slice(1)}: ${n}`));
  assert.match(dart, new RegExp(`${name} = Duration\\(milliseconds: ${n}\\)`));
}
function luminance(c) {
  const v = c.slice(0,3).map(n => n/255).map(n => n <= .04045 ? n/12.92 : ((n+.055)/1.055)**2.4);
  return v[0]*.2126+v[1]*.7152+v[2]*.0722;
}
function contrast(a,b) { const x=luminance(a), y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
const hc = resolved['high-contrast'];
const measurements = [];
function pair(fg,bg,min) {
  const a = hc[fg], b = hc[bg];
  const composite = a.slice(0,3).map((v,i) => v*a[3]+b[i]*(1-a[3]));
  const ratio = contrast(composite,b);
  assert.ok(ratio >= min, `${fg}/${bg}: ${ratio} < ${min}`);
  measurements.push(`${fg} / ${bg}: ${ratio.toFixed(2)}:1`);
}
for (const bg of ['surface','surfaceRaised','surfaceSunken']) {
  for (const fg of ['onSurface','onSurfaceMuted','accentTextSafe','accentSecondary','success','warning','danger']) pair(fg,bg,7);
  for (const fg of ['border','borderSoft']) pair(fg,bg,3);
}
for (const [fg,bg] of [['onAccent','accent'],['onAccent','accentSecondary'],['onSuccess','success'],['onWarning','warning'],['onDanger','danger'],['riskHighOnFill','riskHighFill'],['riskMediumOnFill','riskMediumFill'],['riskLowOnFill','riskLowFill']]) pair(fg,bg,7);
console.log(`PASS: CSS mirrors; Capacitor import; ${colorChecks} color roles across 3 themes × 2 mobile ports; space/radius/targets/durations.`);
console.log('High-contrast token pairs (AAA text >=7; non-text borders >=3; excludes disabled/decorative subtle role):\n'+measurements.join('\n'));
