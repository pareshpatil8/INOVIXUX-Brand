#!/usr/bin/env node
/**
 * INO-443 acceptance probe — ino-toolbar §2 contract compliance
 *
 * Verifies the 6 defects from CTO review are fixed:
 * 1. Spacing tokens: all use --ino-space-*, not --ino-spacing-*
 * 2. Density height: uses --ino-row-min-height, not hardcoded 32px
 * 3. No @Input() density
 * 4. No host class binding for density
 * 5. Demo uses [data-density] wrapper pattern
 * 6. SPEC.md reflects correct implementation
 */

import { readFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const c = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
};

const findings = [];
const pass = (msg) => console.log(c.green('✓'), msg);
const fail = (msg) => {
  console.log(c.red('✗'), msg);
  findings.push(msg);
};

console.log('\n=== INO-443 ino-toolbar defect verification ===\n');

// Read files
const scss = readFileSync('web/src/app/components/toolbar/ino-toolbar.component.scss', 'utf8');
const ts = readFileSync('web/src/app/components/toolbar/ino-toolbar.component.ts', 'utf8');
const demo = readFileSync('web/src/app/pages/docs/components/demos/toolbar-demo.component.ts', 'utf8');
const spec = readFileSync('web/src/app/components/toolbar/SPEC.md', 'utf8');

// 1. Check for wrong spacing tokens in component files
const wrongTokensScss = (scss.match(/--ino-spacing-/g) || []).length;
const wrongTokensTs = (ts.match(/--ino-spacing-/g) || []).length;
const wrongTokensDemo = (demo.match(/--ino-spacing-/g) || []).length;

if (wrongTokensScss + wrongTokensTs + wrongTokensDemo === 0) {
  pass('Defect 1 fixed: no --ino-spacing-* tokens in component files');
} else {
  fail(`Defect 1: found ${wrongTokensScss + wrongTokensTs + wrongTokensDemo} wrong spacing tokens (SCSS: ${wrongTokensScss}, TS: ${wrongTokensTs}, Demo: ${wrongTokensDemo})`);
}

// 2. Check for hardcoded 32px in SCSS
if (scss.includes('32px')) {
  fail('Defect 2: hardcoded 32px found in SCSS');
} else {
  pass('Defect 2 fixed: no hardcoded 32px in SCSS');
}

// 3. Check for @Input() density
const hasDensityInput = /@Input\(\).*density/.test(ts) || /density.*@Input/.test(ts);
if (hasDensityInput) {
  fail('Defect 3: @Input() density still exists');
} else {
  pass('Defect 3 fixed: no @Input() density');
}

// 4. Check for host class binding
if (ts.includes('ino-toolbar--dense')) {
  fail('Defect 4: host class binding for density still exists');
} else {
  pass('Defect 4 fixed: no host class binding for density');
}

// 5. Check demo uses [data-density] wrapper
if (demo.includes('data-density="dense"')) {
  pass('Defect 5 fixed: demo uses [data-density] wrapper pattern');
} else {
  fail('Defect 5: demo does not use [data-density] wrapper');
}

// Check demo doesn't use density="" attribute (but data-density is OK)
const badDensityAttr = demo.match(/(?<!data-)density="/g);
if (badDensityAttr && badDensityAttr.length > 0) {
  fail(`Defect 5: demo still uses ${badDensityAttr.length} density="" attribute(s)`);
}

// 6. Check SPEC.md updated
if (spec.includes('[data-density]') && !spec.includes('density: \'comfortable\' | \'dense\'')) {
  pass('Defect 6 fixed: SPEC.md reflects [data-density] pattern');
} else {
  fail('Defect 6: SPEC.md not updated to reflect correct implementation');
}

// Additional checks
console.log('\n=== Additional compliance checks ===\n');

// Check correct spacing tokens are used
const correctTokensScss = (scss.match(/--ino-space-\d+/g) || []).length;
if (correctTokensScss >= 4) {
  pass(`Found ${correctTokensScss} correct --ino-space-* token uses in SCSS`);
} else {
  fail(`Only ${correctTokensScss} correct spacing tokens in SCSS (expected at least 4)`);
}

// Check --ino-row-min-height usage
if (scss.includes('--ino-row-min-height')) {
  pass('SCSS uses --ino-row-min-height token');
} else {
  fail('SCSS does not use --ino-row-min-height');
}

// Summary
console.log('\n=== Summary ===\n');
if (findings.length === 0) {
  console.log(c.green('✓ All defects fixed — ready for CTO re-review\n'));
  process.exit(0);
} else {
  console.log(c.red(`✗ ${findings.length} issue(s) found:\n`));
  findings.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  console.log();
  process.exit(1);
}
