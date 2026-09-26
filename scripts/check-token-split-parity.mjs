// INO-115 gate: proves docs/brand/02-design-tokens/styles.css (which @imports the
// tokens/{colors,typography,spacing,elevation,borders,motion,density}.css split) resolves to
// the EXACT same custom-property values as the canonical docs/brand/02-design-tokens/tokens.css
// that scripts/check-theme-parity.mjs audits and web/src/tokens.css + the mobile ports consume.
// tokens.css stays the byte-for-byte source of truth; this script is what lets the split exist
// alongside it without silently drifting. Run after any change to either side.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');

const declarations = body => Object.fromEntries(
  [...body.matchAll(/(--ino-[\w-]+)\s*:\s*([^;]+);/g)].map(m => [m[1], m[2].trim()])
);

function parse(cssRaw) {
  const css = cssRaw.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const root = Object.assign({}, ...blocks.filter(m => m[1].trim() === ':root').map(m => declarations(m[2])));
  const themes = {};
  for (const m of blocks) {
    const name = m[1].trim().match(/^\[data-theme="([\w-]+)"\]$/)?.[1];
    if (name) themes[name] = declarations(m[2]);
  }
  const density = {};
  for (const m of blocks) {
    const name = m[1].trim().match(/^\[data-density="([\w-]+)"\]$/)?.[1];
    if (name) density[name] = { ...(density[name] ?? {}), ...declarations(m[2]) };
  }
  const langHi = Object.assign({}, ...blocks.filter(m => m[1].trim() === ':lang(hi)').map(m => declarations(m[2])));
  const osFallback = Object.assign({}, ...blocks.filter(m => m[1].trim() === ':root:not([data-theme])').map(m => declarations(m[2])));
  return { root, themes, density, langHi, osFallback };
}

// Resolve styles.css's one level of local @import 'tokens/x.css'; into a single concatenated string.
function resolveImports(entryPath) {
  const raw = read(entryPath);
  const dir = entryPath.slice(0, entryPath.lastIndexOf('/') + 1);
  return raw.replace(/@import\s+'([^']+)';/g, (_, rel) => read(dir + rel));
}

const canonical = parse(read('docs/brand/02-design-tokens/tokens.css'));
const split = parse(resolveImports('docs/brand/02-design-tokens/styles.css'));

assert.deepEqual(split.root, canonical.root, ':root declarations must match exactly between the split and tokens.css');
assert.deepEqual(split.themes, canonical.themes, '[data-theme="..."] overrides must match exactly between the split and tokens.css');
assert.deepEqual(split.density, canonical.density, '[data-density="..."] overrides must match exactly between the split and tokens.css');
assert.deepEqual(split.langHi, canonical.langHi, ':lang(hi) overrides must match exactly between the split and tokens.css');
assert.deepEqual(split.osFallback, canonical.osFallback, 'prefers-color-scheme OS-fallback overrides must match exactly between the split and tokens.css');

const totalVars = Object.keys(canonical.root).length
  + Object.values(canonical.themes).reduce((n, t) => n + Object.keys(t).length, 0)
  + Object.values(canonical.density).reduce((n, d) => n + Object.keys(d).length, 0)
  + Object.keys(canonical.langHi).length
  + Object.keys(canonical.osFallback).length;
console.log(`PASS: tokens/ split resolves to the same ${totalVars} custom-property declarations as tokens.css (:root, ${Object.keys(canonical.themes).length} themes, ${Object.keys(canonical.density).length} density modes, :lang(hi), OS-fallback).`);
