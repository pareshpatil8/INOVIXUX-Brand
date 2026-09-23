// Dependency-free source-contract audit. Run from any directory with Node.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
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
function pair(fg,bg,min,palette = hc,label = '') {
  const a = palette[fg], b = palette[bg];
  assert.ok(a && b, `${label}${fg}/${bg}: role missing from palette`);
  const composite = a.slice(0,3).map((v,i) => v*a[3]+b[i]*(1-a[3]));
  const ratio = contrast(composite,b);
  assert.ok(ratio >= min, `${label}${fg}/${bg}: ${ratio} < ${min}`);
  measurements.push(`${label}${fg} / ${bg}: ${ratio.toFixed(2)}:1`);
}
for (const bg of ['surface','surfaceRaised','surfaceSunken']) {
  for (const fg of ['onSurface','onSurfaceMuted','accentTextSafe','accentSecondary','success','warning','danger','info']) pair(fg,bg,7);
  for (const fg of ['border','borderSoft']) pair(fg,bg,3);
}
for (const [fg,bg] of [['onAccent','accent'],['onAccent','accentSecondary'],['onSuccess','success'],['onWarning','warning'],['onDanger','danger'],['onInfo','info'],['riskHighOnFill','riskHighFill'],['riskMediumOnFill','riskMediumFill'],['riskLowOnFill','riskLowFill']]) pair(fg,bg,7);
// Wave 0 / INO-123 — the pressed (:active) accent fill, audited in EVERY theme, not just
// high-contrast. Two independent budgets, and it is easy to fix one by breaking the other:
//   1. onAccent must stay legible ON the pressed fill (AA 4.5:1; AAA 7:1 in high-contrast).
//   2. The pressed fill must stay perceivable AGAINST the surface behind it — WCAG 2.2
//      SC 1.4.11 non-text contrast, 3:1. Darkening a filled control helps (1) and hurts (2),
//      which is precisely why accent-active is a picked-and-pinned value rather than a
//      filter: brightness() applied at the component level.
const activeBudget = { dark: 4.5, light: 4.5, 'high-contrast': 7 };
for (const [theme, min] of Object.entries(activeBudget)) {
  const palette = resolved[theme];
  assert.ok(palette, `accent-active audit: unknown theme ${theme}`);
  pair('onAccent','accentActive',min,palette,`${theme} `);
  for (const bg of ['surface','surfaceRaised','surfaceSunken']) pair('accentActive',bg,3,palette,`${theme} `);
}
// The focus ring is a width+colour shorthand, not a colour role, so it cannot go through the
// palette audit above. Assert its shape instead: every theme that overrides it must still
// resolve its colour from --ino-color-accent (so an accent swap re-themes focus for free) and
// must never inline a literal, which is the drift this token was created to end.
for (const [theme, vars] of Object.entries(themes)) {
  const ring = vars['--ino-focus-ring'];
  assert.ok(ring, `${theme}: --ino-focus-ring missing`);
  assert.match(ring, /^\d+px solid var\(--ino-color-accent\)$/, `${theme}: --ino-focus-ring must stay "<n>px solid var(--ino-color-accent)", got "${ring}"`);
  assert.match(vars['--ino-focus-ring-offset'] ?? '', /^\d+px$/, `${theme}: --ino-focus-ring-offset must be a px length`);
}
// ── Wave 0 / INO-257 (W0-7) — the invalid-state ring (tokens.css §12) ──────────────────────────
// The focus ring's opposite-channel twin: box-shadow rather than outline, because a control that
// is focused AND invalid has to paint both at once. Three things can break it, and none of the
// three shows up in a diff:
//   1. A theme inlines a literal colour, so a severity re-theme stops carrying the ring — the same
//      drift --ino-focus-ring was created to end, one channel over.
//   2. A theme flattens it to `none` alongside the elevation tokens it sits next to. That is
//      correct for elevation and catastrophic here: high-contrast is precisely the theme where an
//      invalid affordance must survive. A theme may WIDEN a state ring; it may never thin it.
//   3. --ino-color-danger drifts to a value that no longer reads against a surface. The ring is a
//      non-text state indicator (WCAG 2.2 SC 1.4.11, 3:1), which is why it reads `danger` and not
//      the heavier `danger-text-safe` the invalid LABEL uses — so 3:1 has to be measured, not
//      assumed, on every surface a ringed control can sit on.
const invalidRingWeight = v => Number(/^0 0 0 (\d+)px var\(--ino-color-danger\)$/.exec(v ?? '')?.[1]);
const baseInvalidRing = invalidRingWeight(base['--ino-invalid-ring']);
assert.ok(baseInvalidRing > 0, `:root: --ino-invalid-ring must be "0 0 0 <n>px var(--ino-color-danger)", got "${base['--ino-invalid-ring']}"`);
for (const [theme, vars] of Object.entries(themes)) {
  const weight = invalidRingWeight(vars['--ino-invalid-ring']);
  assert.ok(weight > 0, `${theme}: --ino-invalid-ring must stay "0 0 0 <n>px var(--ino-color-danger)" — it must never inline a colour and must never flatten to none the way elevation does in this theme, got "${vars['--ino-invalid-ring']}"`);
  assert.ok(weight >= baseInvalidRing, `${theme}: --ino-invalid-ring is ${weight}px against the base ring's ${baseInvalidRing}px — a theme may widen a state ring, never thin it`);
  for (const bg of ['surface', 'surfaceRaised', 'surfaceSunken']) pair('danger', bg, 3, resolved[theme], `${theme} invalid-ring `);
}
// ── Wave 0 / INO-124 — the control-size scale (tokens.css §12) ─────────────────────────────────
// Every component's size="sm"|"default"|"lg" API resolves entirely through these tokens, so the
// scale is load-bearing for ~35 components that do not exist yet. Three things break it quietly,
// and none of the three is visible in a diff:
//   1. A density block forgets a row, so the row falls through to the enclosing scope and a fluid
//      island nested in a dense shell silently renders 32px controls (or the reverse).
//   2. A height is trimmed below the WCAG 2.2 SC 2.5.8 24px floor while chasing density.
//      --ino-target-min is the floor for EVERY size in EVERY density, not just the nominal ones.
//   3. The RN/Flutter ports drift from the CSS, which no web-side check would ever notice.
// Assert all three structurally, so the failure lands on whoever edits the scale.
const SIZES = ['sm', 'default', 'lg'];
const ALIASES = ['height', 'padding-inline', 'padding-inline-roomy', 'font-size', 'icon-size', 'gap'];
const densityBody = name =>
  blocks.find(m => m[1].trim() === `[data-density="${name}"]`)?.[2];
const rawDense = declarations(densityBody('dense') ?? assert.fail('[data-density="dense"] block missing'));
const rawFluid = declarations(densityBody('fluid') ?? assert.fail('[data-density="fluid"] block missing'));
const rawBase = Object.fromEntries(Object.entries(base).filter(([k]) => k.startsWith('--ino-control-')));
const controlKeys = o => Object.keys(o).filter(k => k.startsWith('--ino-control-')).sort();

// The two density blocks must re-resolve exactly the SAME token set as each other. This is the
// check that makes "added a row to dense, forgot fluid" a build failure instead of a nesting bug.
assert.deepEqual(controlKeys(rawDense), controlKeys(rawFluid),
  'dense and fluid must re-resolve an identical set of --ino-control-* tokens');
// …and the tokens a density block deliberately does NOT re-resolve are pinned by name, so that
// dropping a row from both blocks at once cannot slip through the check above.
const DENSITY_INVARIANT = [
  '--ino-control-font-size-lg', '--ino-control-font-size-sm',   // alias body-lg/body-sm, which no density block overrides
  '--ino-control-gap-default', '--ino-control-gap-sm', '--ino-control-gap-lg', // gap is density-invariant by design, §12
];
assert.deepEqual(controlKeys(rawBase).filter(k => !controlKeys(rawDense).includes(k)), DENSITY_INVARIANT.sort(),
  'the set of control tokens a density block leaves to :root changed — update §12 and DENSITY_INVARIANT together');
for (const [name, decls] of [['dense', rawDense], ['fluid', rawFluid]]) {
  for (const f of ALIASES) {
    assert.ok(decls[`--ino-control-${f}`],
      `[data-density="${name}"] must re-declare the bare alias --ino-control-${f}; inheriting it from :root pins it to the OUTER density forever`);
  }
  assert.match(decls['--ino-row-min-height'] ?? '', /^\d+px$/, `[data-density="${name}"]: --ino-row-min-height must be a px length`);
}

const scales = { base, dense: { ...base, ...rawDense }, fluid: { ...base, ...rawFluid } };
const targetMin = numeric('--ino-target-min');
for (const [density, vars] of Object.entries(scales)) {
  const px = key => parseFloat(resolve(vars[key] ?? assert.fail(`${density}: ${key} missing`), vars));
  const row = f => SIZES.map(s => px(`--ino-control-${f}-${s}`));
  const [hSm, hDefault, hLg] = row('height');
  assert.ok(hSm < hDefault && hDefault < hLg,
    `${density}: control heights must strictly increase sm < default < lg, got ${hSm}/${hDefault}/${hLg}`);
  for (const f of ALIASES) {
    const [a, b, c] = row(f);
    assert.ok(a <= b && b <= c, `${density}: --ino-control-${f}-* must be non-decreasing across sm/default/lg, got ${a}/${b}/${c}`);
    // The bare alias is what components actually consume; if it ever stops tracking -default,
    // size="default" and "no size at all" quietly render differently.
    assert.equal(px(`--ino-control-${f}`), px(`--ino-control-${f}-default`),
      `${density}: --ino-control-${f} must resolve to its -default row`);
  }
  for (const s of SIZES) {
    assert.ok(px(`--ino-control-height-${s}`) >= targetMin,
      `${density}/${s}: control height ${px(`--ino-control-height-${s}`)}px is under the WCAG 2.2 SC 2.5.8 floor (--ino-target-min ${targetMin}px)`);
    assert.ok(px(`--ino-control-padding-inline-roomy-${s}`) > px(`--ino-control-padding-inline-${s}`),
      `${density}/${s}: -roomy padding must exceed the compact padding, or the two rows are the same row`);
  }
}
// The two pins §12 states in prose, asserted so the prose cannot go stale: a dense control fits a
// dense table row exactly, and a fluid control is the platform-HIG comfortable target.
assert.equal(parseFloat(scales.dense['--ino-control-height-default']), parseFloat(rawDense['--ino-row-min-height']),
  'dense: --ino-control-height-default must equal --ino-row-min-height so a control drops into a dense table row without growing it');
assert.equal(parseFloat(scales.fluid['--ino-control-height-default']), numeric('--ino-target-comfortable'),
  'fluid: --ino-control-height-default must equal --ino-target-comfortable');
// The fluid GEOMETRY is numerically identical to :root — it exists only so a fluid island nested
// inside a dense shell re-resolves instead of inheriting. If the two ever diverge, one is a typo.
// font-size is excluded on purpose: it aliases --ino-type-body-*, and a density block redefines
// that scale underneath it (fluid body is 15px vs :root 14px), so the alias is SUPPOSED to move.
// That distinction is the whole reason -font-size-default is re-declared in both density blocks.
for (const f of ALIASES.filter(f => f !== 'font-size')) {
  for (const s of SIZES) {
    const key = `--ino-control-${f}-${s}`;
    assert.equal(parseFloat(resolve(scales.fluid[key], scales.fluid)), parseFloat(resolve(base[key], base)),
      `${key}: the fluid geometry must stay numerically identical to :root (it is a re-declaration, not a variant)`);
  }
}
// …and the font-size rows are checked against the thing they are supposed to track instead: each
// density's own body size. A density block that overrides --ino-type-body-size but forgets to
// re-declare --ino-control-font-size-default would otherwise ship a control whose label is sized
// for the WRONG density — invisible in a diff, and the exact bug this re-declaration prevents.
for (const [density, vars] of Object.entries(scales)) {
  assert.equal(parseFloat(resolve(vars['--ino-control-font-size-default'], vars)), parseFloat(resolve(vars['--ino-type-body-size'], vars)),
    `${density}: --ino-control-font-size-default must re-resolve against this density's own --ino-type-body-size`);
}
// A control size never invents a spacing or type value — padding/gap alias §5, font-size aliases §4.
// Height and icon-size are deliberately their own ramps and stay raw px.
for (const [density, decls] of [['base', rawBase], ['dense', rawDense], ['fluid', rawFluid]]) {
  for (const [k, v] of Object.entries(decls)) {
    if (!SIZES.some(s => k.endsWith(`-${s}`))) continue; // bare aliases point at their own -default row
    if (/^--ino-control-(padding-inline|gap)/.test(k)) {
      assert.match(v, /^var\(--ino-space-\d+\)$/, `${density}/${k}: must alias the §5 space scale, got "${v}"`);
    }
    if (k.startsWith('--ino-control-font-size')) {
      assert.match(v, /^var\(--ino-type-[\w-]+\)$/, `${density}/${k}: must alias the §4 type scale, got "${v}"`);
    }
  }
}
// Mobile ports carry the FLUID column only (mobile is never dense), so they are asserted against
// the fluid resolution — not :root — even though the two are numerically identical today.
const CONTROL_FIELDS = {
  'height': 'height', 'padding-inline': 'paddingInline', 'padding-inline-roomy': 'paddingInlineRoomy',
  'font-size': 'fontSize', 'icon-size': 'iconSize', 'gap': 'gap',
};
const rnControl = rnGroup('control');
let controlChecks = 0;
for (const s of SIZES) {
  const rnRow = rnControl.match(new RegExp(`\\b${s}:\\s*\\{([^}]*)\\}`))?.[1];
  assert.ok(rnRow, `RN control.${s} missing`);
  // `default` is a reserved word in Dart, so the Flutter port names that row `standard`. This is
  // the one place the scale's names diverge from the web API, and it is deliberate — see tokens.dart.
  const dartName = s === 'default' ? 'standard' : s;
  const dartRow = dart.match(new RegExp(`static const ${dartName} = InoControlSize\\(([^)]*)\\)`))?.[1];
  assert.ok(dartRow, `Flutter InoControlSize.${dartName} missing`);
  const fields = Object.fromEntries([...rnRow.matchAll(/(\w+):\s*([\d.]+)/g)].map(m => [m[1], Number(m[2])]));
  const dartFields = Object.fromEntries([...dartRow.matchAll(/(\w+):\s*([\d.]+)/g)].map(m => [m[1], Number(m[2])]));
  assert.deepEqual(Object.keys(fields).sort(), Object.values(CONTROL_FIELDS).sort(), `RN control.${s} field completeness`);
  assert.deepEqual(Object.keys(dartFields).sort(), Object.values(CONTROL_FIELDS).sort(), `Flutter InoControlSize.${dartName} field completeness`);
  for (const [cssFamily, field] of Object.entries(CONTROL_FIELDS)) {
    const expected = parseFloat(resolve(scales.fluid[`--ino-control-${cssFamily}-${s}`], scales.fluid));
    assert.equal(fields[field], expected, `RN control.${s}.${field}: ${fields[field]} != CSS fluid ${expected}`);
    assert.equal(dartFields[field], expected, `Flutter InoControlSize.${dartName}.${field}: ${dartFields[field]} != CSS fluid ${expected}`);
    controlChecks += 2;
  }
}
assert.equal(numeric('--ino-target-comfortable'), parseFloat(rawFluid['--ino-row-min-height']),
  'fluid --ino-row-min-height must equal --ino-target-comfortable (the mobile ports export it as a single number)');

// ── Wave 0 / INO-125 — form-label colour roles (§4b) ────────────────────────────────────────────
// label / hint / caption are body text, not decoration, so they carry the same AA 4.5:1 (AAA 7:1
// in high-contrast) budget as onSurface/onSurfaceMuted above — but they are new roles the generic
// audit at line 104 never walked, so a future edit that quietly re-points one at a token that
// fails contrast would otherwise ship silently. labelDisabled is exempt (WCAG 1.4.3 carve-out for
// disabled content, same as the control it labels) and is checked for presence only, not contrast.
const labelBudget = { dark: 4.5, light: 4.5, 'high-contrast': 7 };
for (const [theme, min] of Object.entries(labelBudget)) {
  const palette = resolved[theme];
  assert.ok(palette, `form-label audit: unknown theme ${theme}`);
  for (const bg of ['surface', 'surfaceRaised', 'surfaceSunken']) {
    for (const fg of ['label', 'labelMuted', 'hint', 'caption', 'labelInvalid', 'requiredMarker']) {
      pair(fg, bg, min, palette, `${theme} `);
    }
  }
  assert.ok(palette.labelDisabled, `${theme}: --ino-color-label-disabled role missing`);
}
// labelInvalid and requiredMarker are aliases of --ino-color-danger-text-safe, not a fresh pick —
// assert the alias directly so the two can never drift from the token they exist to reuse.
for (const [theme, vars] of Object.entries(themes)) {
  assert.equal(vars['--ino-color-label-invalid'], 'var(--ino-color-danger-text-safe)', `${theme}: --ino-color-label-invalid must alias --ino-color-danger-text-safe`);
  assert.equal(vars['--ino-color-required-marker'], 'var(--ino-color-danger-text-safe)', `${theme}: --ino-color-required-marker must alias --ino-color-danger-text-safe`);
}
// The five size/role tiers must exist on :root — the three size tiers map 1:1 onto §12's
// sm/default/lg, which is the whole reason a control's `size` input can select its label tier for
// free (doc: form-label-tokens.md §Adoption) — plus the two non-tiered roles (hint, caption).
for (const key of ['--ino-type-label-lg-size', '--ino-type-label-size', '--ino-type-label-sm-size', '--ino-type-hint-size', '--ino-type-caption-size']) {
  assert.ok(base[key], `${key} missing`);
}
// label / hint / caption move with density (dense compresses, fluid/base share the same fluid
// resolution as §12) — the DEFAULT tier only, exactly like §12's own base/fluid geometry pin.
for (const [density, decls] of [['dense', rawDense], ['fluid', rawFluid]]) {
  for (const role of ['label', 'hint', 'caption']) {
    assert.ok(decls[`--ino-type-${role}-size`], `[data-density="${density}"] must re-declare --ino-type-${role}-size`);
    assert.ok(decls[`--ino-type-${role}-line`], `[data-density="${density}"] must re-declare --ino-type-${role}-line`);
  }
}

// ── Wave 0 / INO-126 (W0-4) — elevation scale expansion (tokens.css §2) ─────────────────────────
// 6 neutral + 3 brand + 2 inset, on top of the untouched --ino-elevation-0/-1/-2. Three shapes,
// three sets of invariants: neutral is a plain shadow ramp that must get stronger monotonically and
// must still agree with -1/-2 at the two rungs it reuses; brand must stay parametric on
// var(--ino-color-accent) (never a literal rgb triple, or the documented accent-swap contract in the
// file header silently breaks); inset must be an inset shadow, not a drop shadow. High-contrast
// flattens all 11 to `none`, same as -1/-2 — assert that decision directly so it cannot regress.
const ELEVATION_GROUPS = {
  neutral: [1, 2, 3, 4, 5, 6].map(n => `--ino-elevation-neutral-${n}`),
  brand: [1, 2, 3].map(n => `--ino-elevation-brand-${n}`),
  inset: [1, 2].map(n => `--ino-elevation-inset-${n}`),
};
const ALL_ELEVATION_KEYS = Object.values(ELEVATION_GROUPS).flat();
for (const [theme, vars] of Object.entries(themes)) {
  for (const key of ALL_ELEVATION_KEYS) assert.ok(vars[key], `${theme}: ${key} missing`);
}
for (const key of ALL_ELEVATION_KEYS) {
  assert.equal(themes['high-contrast'][key], 'none', `high-contrast: ${key} must flatten to none (recorded decision, see tokens.css §2)`);
}
for (const theme of ['dark', 'light']) {
  const vars = themes[theme];
  const blurOf = key => {
    const m = vars[key].match(/^0 -?\d+px (\d+)px -?\d+px rgba?\(/);
    assert.ok(m, `${theme}: ${key} does not match the neutral shadow shape, got "${vars[key]}"`);
    return Number(m[1]);
  };
  const blurs = ELEVATION_GROUPS.neutral.map(blurOf);
  for (let i = 1; i < blurs.length; i++) {
    assert.ok(blurs[i] > blurs[i - 1], `${theme}: --ino-elevation-neutral-* blur must strictly increase, got ${blurs.join(', ')}`);
  }
  // neutral-4/-5 are the two rungs the OLD 2-step scale already picked — pin the equality so the
  // two names can never quietly diverge (a component still reading -1/-2 would silently stop
  // matching a component reading -neutral-4/-neutral-5).
  assert.equal(vars['--ino-elevation-neutral-4'], vars['--ino-elevation-1'], `${theme}: --ino-elevation-neutral-4 must stay numerically identical to --ino-elevation-1`);
  assert.equal(vars['--ino-elevation-neutral-5'], vars['--ino-elevation-2'], `${theme}: --ino-elevation-neutral-5 must stay numerically identical to --ino-elevation-2`);

  const pctOf = key => {
    const m = vars[key].match(/color-mix\(in srgb, var\(--ino-color-accent\) (\d+)%, transparent\)/);
    assert.ok(m, `${theme}: ${key} must stay parametric on color-mix(… var(--ino-color-accent) …) — a literal rgb triple breaks the accent-swap contract, got "${vars[key]}"`);
    return Number(m[1]);
  };
  const pcts = ELEVATION_GROUPS.brand.map(pctOf);
  for (let i = 1; i < pcts.length; i++) {
    assert.ok(pcts[i] > pcts[i - 1], `${theme}: --ino-elevation-brand-* color-mix % must strictly increase, got ${pcts.join(', ')}`);
  }

  for (const key of ELEVATION_GROUPS.inset) {
    assert.match(vars[key], /^inset /, `${theme}: ${key} must be an inset shadow, got "${vars[key]}"`);
  }
}
// Brand elevation must read distinctly LOWER against light than dark at every step — the same
// "lower alpha, dark-mode glow reads muddy on white" relief rule --ino-glow-accent already follows.
for (let i = 0; i < ELEVATION_GROUPS.brand.length; i++) {
  const key = ELEVATION_GROUPS.brand[i];
  const pct = t => Number(themes[t][key].match(/(\d+)%/)[1]);
  assert.ok(pct('light') < pct('dark'), `${key}: light color-mix % (${pct('light')}) must be lower than dark (${pct('dark')})`);
}

// ── Wave 0 / INO-126 (W0-4) — leading/tracking rhythm scale + composite type aliases (§4c) ──────
// Two independent claims: (1) the --ino-leading-*/--ino-tracking-* primitives form a strictly
// ascending scale and every type role's -line/-tracking now resolves through one of them, never a
// bare literal; (2) every role has a --ino-type-<role> composite `font` shorthand alias, so a
// component can stop hand-composing size/line/weight/family across four separate declarations.
const LEADING_STEPS = Array.from({ length: 9 }, (_, i) => `--ino-leading-${i + 1}`);
const TRACKING_STEPS = Array.from({ length: 7 }, (_, i) => `--ino-tracking-${i + 1}`);
for (const key of [...LEADING_STEPS, ...TRACKING_STEPS]) assert.ok(base[key], `${key} missing at :root`);
const asNum = v => parseFloat(v);
for (const steps of [LEADING_STEPS, TRACKING_STEPS]) {
  const vals = steps.map(k => asNum(base[k]));
  for (let i = 1; i < vals.length; i++) {
    assert.ok(vals[i] > vals[i - 1], `${steps[i]} (${vals[i]}) must be strictly greater than ${steps[i - 1]} (${vals[i - 1]}) — the scale must stay ascending`);
  }
}
// Every -line / -tracking token this issue touched must be a var() reference into the scale above,
// never a bare number — across :root AND both density blocks, so a future edit can't reintroduce a
// hand-typed literal that quietly drifts from its named rung.
const RHYTHM_ROLES = ['display', 'h2', 'h3', 'body-lg', 'body', 'body-sm', 'eyebrow', 'label-lg', 'label', 'label-sm', 'hint', 'caption'];
for (const [scope, decls] of [[':root', base], ['[data-density="dense"]', rawDense], ['[data-density="fluid"]', rawFluid]]) {
  for (const role of RHYTHM_ROLES) {
    const lineKey = `--ino-type-${role}-line`;
    if (decls[lineKey]) assert.match(decls[lineKey], /^var\(--ino-leading-\d\)$/, `${scope}: ${lineKey} must reference the --ino-leading-* scale, got "${decls[lineKey]}"`);
    const trackKey = `--ino-type-${role}-tracking`;
    if (decls[trackKey]) assert.match(decls[trackKey], /^var\(--ino-tracking-\d\)$/, `${scope}: ${trackKey} must reference the --ino-tracking-* scale, got "${decls[trackKey]}"`);
  }
}
// Composite aliases: one per role (metric has no -line token, so its shorthand omits the
// /line-height segment — that segment is optional in the `font` shorthand grammar).
const COMPOSITE_ROLES = [...RHYTHM_ROLES, 'metric'];
for (const role of COMPOSITE_ROLES) {
  const key = `--ino-type-${role}`;
  assert.ok(base[key], `${key} composite alias missing at :root`);
  assert.ok(base[key].includes(`var(--ino-type-${role}-weight)`), `${key} must reference --ino-type-${role}-weight`);
  assert.ok(base[key].includes(`var(--ino-type-${role}-size)`), `${key} must reference --ino-type-${role}-size`);
  if (role !== 'metric') assert.ok(base[key].includes(`var(--ino-type-${role}-line)`), `${key} must reference --ino-type-${role}-line`);
  const family = role === 'eyebrow' || role === 'metric' ? '--ino-font-mono' : '--ino-font-display';
  assert.ok(base[key].includes(`var(${family})`), `${key} must reference ${family}`);
}
// Density-varying composites (body/label/hint/caption) must be re-declared in BOTH density blocks —
// same rule §12's CONSUMPTION ALIASES and §4b's label/hint/caption sizes already follow in this file.
for (const [scope, decls] of [['[data-density="dense"]', rawDense], ['[data-density="fluid"]', rawFluid]]) {
  for (const role of ['body', 'label', 'hint', 'caption']) {
    assert.ok(decls[`--ino-type-${role}`], `${scope} must re-declare the composite --ino-type-${role} alias`);
  }
}

// ── S-9 / INO-171 — component-level theme-parity check (resolves P-7) ──────────────────────────
// Everything above proves the TOKEN layer is byte-identical across tracks. It says nothing about
// whether a component present on web exists on the mobile tracks, or whether a port that DOES
// exist reads the same semantic roles web reads. This section closes that gap with an append-only
// registry: one entry per component, alphabetically inserted — the shared-file merge rule for this
// file (docs/brand/17-phase-2-implementation-program.md §6): a merge conflict here should only
// ever be "insert my line between these two neighbours," never a semantic collision.
//
// Any role a mobile port drops or substitutes relative to web must be declared in that entry's
// `divergences` with a written reason, so an intentional difference reads as a decision instead of
// drift — and a declared divergence that no longer reflects a real gap fails just as loudly, so the
// registry cannot rot into stale permissions either.
const ALL_ROLE_FIELDS = new Set([...dart.matchAll(/final Color (\w+);/g)].map(m => m[1]));

function webColorRoles(dir) {
  const scssFiles = readdirSync(new URL(`${dir}/`, root)).filter(f => f.endsWith('.scss'));
  assert.ok(scssFiles.length, `${dir}: no .scss files found`);
  const roles = new Set();
  for (const f of scssFiles) {
    for (const m of read(`${dir}/${f}`).matchAll(/var\(--ino-color-([\w-]+)\)/g)) roles.add(camel(m[1]));
  }
  return roles;
}

const COMPONENT_REGISTRY = [
  {
    name: 'button',
    web: 'web/src/app/components/button',
    mobile: {
      reactNative: {
        path: 'mobile/react-native/src/components/InoButton.tsx',
        roles: ['accent', 'accentActive', 'border', 'danger', 'onAccent', 'onSurface', 'onSurfaceMuted', 'surfaceRaised', 'surfaceSunken'],
      },
      flutter: {
        path: 'mobile/flutter/lib/widgets/ino_button.dart',
        roles: ['accent', 'accentActive', 'border', 'danger', 'onAccent', 'onSurface', 'onSurfaceMuted', 'surface', 'surfaceRaised', 'surfaceSunken'],
      },
    },
    divergences: [
      { platform: 'reactNative', roles: ['onDanger'], reason: 'the danger variant text reuses onAccent instead of reading a dedicated onDanger. onAccent and onDanger are numerically identical white/black pairs in all three themes today (mobile/react-native/src/theme/tokens.ts), so this is not a contrast regression right now, but it is a value coincidence rather than a declared alias like --ino-color-label-invalid. Flagged for the button owner via INO-171: either add a dedicated onDanger read or formally alias the two roles.' },
      { platform: 'flutter', roles: ['onDanger'], reason: 'same as the React Native entry above — the danger variant reuses onAccent instead of onDanger.' },
      { platform: 'flutter', roles: ['surface'], reason: "ghost/icon fill uses colors.surface.withValues(alpha: 0) as a typed transparent Color; RN uses the bare string 'transparent' for the same visual result, so this role never actually reads a surface value." },
    ],
  },
  {
    name: 'confirm-dialog',
    web: 'web/src/app/components/confirm-dialog',
    mobile: { reactNative: 'web-only', flutter: 'web-only' },
    reason: 'web-only by explicit decision (INO-148, plan rev 9 §5 desktop-idiom porting rule) — the mobile counterpart is a native action-sheet idiom (`ino-confirm-action-sheet`, already shipped on all three mobile tracks), not a port of the centered card-with-scrim dialog. See web/src/app/components/confirm-dialog/SPEC.md §5 and docs/brand/06-angular-components/confirm-dialog.md#mobile.',
  },
  {
    name: 'confirm-popup',
    web: 'web/src/app/components/confirm-popup',
    mobile: { reactNative: 'web-only', flutter: 'web-only' },
    reason: 'web-only by explicit decision (INO-148, plan rev 9 §5 desktop-idiom porting rule) — same rationale as confirm-dialog above; `ino-confirm-action-sheet` already covers mobile confirm. See web/src/app/components/confirm-popup/SPEC.md §5 and docs/brand/06-angular-components/confirm-popup.md#mobile.',
  },
  {
    name: 'datepicker',
    web: 'web/src/app/components/datepicker',
    mobile: {
      reactNative: {
        path: 'mobile/react-native/src/components/InoDatepicker.tsx',
        roles: ['accent', 'border', 'danger', 'onAccent', 'onSurface', 'onSurfaceMuted', 'onSurfaceSubtle', 'surfaceRaised', 'surfaceSunken'],
      },
      flutter: {
        path: 'mobile/flutter/lib/widgets/ino_datepicker.dart',
        roles: ['accent', 'border', 'danger', 'onAccent', 'onSurface', 'onSurfaceMuted', 'onSurfaceSubtle', 'surfaceRaised', 'surfaceSunken'],
      },
    },
    divergences: [
      { platform: 'reactNative', roles: ['accentActive'], reason: 'same rationale as the input entry above — web reserves accent-active for the transient mousedown-before-focus-settles flash on the trigger and nav buttons (ino-datepicker.component.scss); touch has no pointer-down-before-focus phase, so Pressable goes straight from unfocused to colors.accent on selection, using its built-in pressed style instead of a dedicated role read.' },
      { platform: 'flutter', roles: ['accentActive'], reason: 'same as the React Native entry above.' },
      { platform: 'reactNative', roles: ['borderSoft'], reason: 'web reads border-soft for the internal calendar-grid week divider (a lighter rule than the panel border); the mobile ports are scoped to single-selection only (SPEC.md §9) and never render week dividers, so the role has nothing to draw and the port reads border for every border it does draw.' },
      { platform: 'flutter', roles: ['borderSoft'], reason: 'same as the React Native entry above.' },
      { platform: 'reactNative', roles: ['accentTextSafe'], reason: 'web reads accent-text-safe only for the in-range cell tint (range-mode text over a flat accent-tinted surface); the mobile ports are single-selection-only (SPEC.md §9) and have no in-range state to color, so the role is never reached.' },
      { platform: 'flutter', roles: ['accentTextSafe'], reason: 'same as the React Native entry above.' },
    ],
  },
  {
    name: 'drawer',
    web: 'web/src/app/components/drawer',
    mobile: { reactNative: 'web-only', flutter: 'web-only' },
    reason: 'web-only for now, by scoping decision, not a permanent exemption — same kind of scoping decision `<ino-select>` makes (pending INO-152 — not yet landed on this merge base as a registry entry to point to). INO-151 (INO-31 T-24) spent its full budget on the web core (4 edge positions, 3 sizes, modal/non-modal mode, full-screen-on-mobile breakpoint, [inoFocusTrap] integration) across all 3 web themes; React Native and Flutter ports (re-authored against the same semantic roles, per plan rev 9 §5\'s "real ports" rule) are filed as a follow-up child issue rather than shipped at lower fidelity here. mobile/react-native/src/components/ConfirmActionSheet.tsx and mobile/flutter/lib/widgets/confirm_action_sheet.dart are the nearest existing bottom-sheet-style precedent for that follow-up to extend. See web/src/app/components/drawer/SPEC.md §9 and docs/brand/06-angular-components/drawer.md#mobile.',
  },
  {
    name: 'floatlabel',
    web: 'web/src/app/components/floatlabel',
    mobile: {
      reactNative: {
        path: 'mobile/react-native/src/components/InoFloatLabel.tsx',
        roles: ['onSurfaceMuted', 'onSurfaceSubtle', 'dangerTextSafe', 'surface'],
      },
      flutter: {
        path: 'mobile/flutter/lib/widgets/ino_float_label.dart',
        roles: ['onSurfaceMuted', 'onSurfaceSubtle', 'dangerTextSafe', 'surface'],
      },
    },
    divergences: [
      { platform: 'reactNative', roles: ['onSurfaceMuted', 'onSurfaceSubtle', 'dangerTextSafe'], reason: 'web composes <ino-label> internally and re-points its --ino-type-label-* size/weight custom properties only — colour itself stays whichever role <ino-label>\'s OWN stylesheet already resolves (label/ino-label.component.scss: onSurface/onSurfaceMuted/onSurfaceSubtle/dangerTextSafe), so floatlabel/ino-floatlabel.component.scss never references those colour roles directly. The RN port has no separate label component to delegate to (it renders the label Text itself), so it reads the three non-default label colour roles inline. See SPEC.md §2.' },
      { platform: 'flutter', roles: ['onSurfaceMuted', 'onSurfaceSubtle', 'dangerTextSafe'], reason: 'same as the React Native entry above — ino_float_label.dart renders its own label Text instead of delegating to InoLabel.' },
    ],
  },
  {
    name: 'focus-trap',
    web: 'web/src/app/components/focus-trap',
    mobile: { reactNative: 'web-only', flutter: 'web-only' },
    reason: 'web-only by explicit decision — neither platform has the DOM tab-order construct this component exists for (RN: accessibilityViewIsModal; Flutter: FocusScope on the modal route). See docs/brand/06-angular-components/focus-trap.md#mobile and web/src/app/components/focus-trap/SPEC.md §5.',
  },
  {
    name: 'iftalabel',
    web: 'web/src/app/components/iftalabel',
    mobile: {
      reactNative: {
        path: 'mobile/react-native/src/components/InoIftaLabel.tsx',
        roles: ['onSurfaceMuted', 'onSurfaceSubtle', 'dangerTextSafe'],
      },
      flutter: {
        path: 'mobile/flutter/lib/widgets/ino_ifta_label.dart',
        roles: ['onSurfaceMuted', 'onSurfaceSubtle', 'dangerTextSafe'],
      },
    },
    divergences: [
      { platform: 'reactNative', roles: ['onSurfaceMuted', 'onSurfaceSubtle', 'dangerTextSafe'], reason: 'web composes <ino-label> internally and never references a --ino-color-* role directly in iftalabel/ino-iftalabel.component.scss (colour is entirely delegated to <ino-label>\'s own stylesheet: onSurface/onSurfaceMuted/onSurfaceSubtle/dangerTextSafe). The RN port has no separate label component to delegate to (it renders the label Text itself), so it reads the three non-default label colour roles inline. Same divergence shape the sibling floatlabel/ino-float-label wrapper (INO-141) declares for the same reason (minus the "surface" role — this component has no on-variant background cutout, SPEC.md §3). See SPEC.md §7.' },
      { platform: 'flutter', roles: ['onSurfaceMuted', 'onSurfaceSubtle', 'dangerTextSafe'], reason: 'same as the React Native entry above — ino_ifta_label.dart renders its own label Text instead of delegating to InoLabel.' },
    ],
  },
  {
    name: 'input',
    web: 'web/src/app/components/input',
    mobile: {
      reactNative: {
        path: 'mobile/react-native/src/components/InoInput.tsx',
        roles: ['accent', 'border', 'danger', 'onSurface', 'onSurfaceMuted', 'onSurfaceSubtle', 'surfaceRaised', 'surfaceSunken'],
      },
      flutter: {
        path: 'mobile/flutter/lib/widgets/ino_input.dart',
        roles: ['accent', 'border', 'danger', 'onSurface', 'onSurfaceMuted', 'surfaceRaised', 'surfaceSunken'],
      },
    },
    divergences: [
      { platform: 'reactNative', roles: ['accentActive'], reason: 'web reserves accent-active for the transient mousedown-before-focus-settles flash (ino-input.component.scss); touch input has no pointer-down-before-focus phase, so the port goes straight from unfocused to colors.accent on focus.' },
      { platform: 'flutter', roles: ['accentActive'], reason: 'same as the React Native entry above.' },
      // NOT a declared design decision — this is an apparent gap this check surfaced while being
      // written (INO-171). RN sets placeholderTextColor={colors.onSurfaceSubtle} explicitly
      // (InoInput.tsx); Flutter's TextField/InputDecoration sets no hintStyle at all, so the
      // placeholder falls back to Flutter's default theme color instead of reading the role web
      // and RN both use. Recorded here so the check passes without masking the finding — flagged
      // to the input component owner (INO-157) to fix Flutter or confirm the omission is intended.
      { platform: 'flutter', roles: ['onSurfaceSubtle'], reason: 'GAP, not a decision: Flutter InoInput sets no explicit placeholder/hint color (no hintStyle on the InputDecoration), so it never reads onSurfaceSubtle at all, unlike web (::placeholder) and RN (placeholderTextColor). Filed as a follow-up against the input component owner rather than fixed here — see INO-171 handoff comment.' },
    ],
  },
  {
    name: 'input-otp',
    web: 'web/src/app/components/input-otp',
    mobile: {
      reactNative: {
        path: 'mobile/react-native/src/components/InoInputOtp.tsx',
        roles: ['accent', 'border', 'danger', 'onSurface', 'onSurfaceMuted', 'surfaceSunken'],
      },
      flutter: {
        path: 'mobile/flutter/lib/widgets/ino_input_otp.dart',
        roles: ['accent', 'border', 'danger', 'onSurface', 'onSurfaceMuted', 'surfaceSunken'],
      },
    },
    divergences: [
      { platform: 'reactNative', roles: ['accentActive', 'surfaceRaised'], reason: 'accentActive is the transient mousedown-before-focus-settles flash (same rationale as the input entry above), which touch input never triggers, so the port goes straight from unfocused to colors.accent on focus. surfaceRaised is unused because the mobile ports never swap fills for readonly the way the web component does (ino-input-otp.component.scss :read-only rule) — boxes always render colors.surfaceSunken regardless of readOnly.' },
      { platform: 'flutter', roles: ['accentActive', 'surfaceRaised'], reason: 'same as the React Native entry above.' },
    ],
  },
  {
    name: 'multiselect',
    web: 'web/src/app/components/multiselect',
    mobile: {
      reactNative: {
        path: 'mobile/react-native/src/components/InoMultiSelect.tsx',
        roles: ['accent', 'accentTextSafe', 'border', 'borderSoft', 'danger', 'onSurface', 'onSurfaceMuted', 'onSurfaceSubtle', 'overlayScrim', 'surfaceRaised', 'surfaceSunken'],
      },
      flutter: {
        path: 'mobile/flutter/lib/widgets/ino_multi_select.dart',
        roles: ['accent', 'accentTextSafe', 'border', 'borderSoft', 'danger', 'onSurface', 'onSurfaceMuted', 'onSurfaceSubtle', 'overlayScrim', 'surfaceRaised', 'surfaceSunken'],
      },
    },
    divergences: [
      { platform: 'reactNative', roles: ['accentActive'], reason: 'same rationale as the select entry above (INO-152/INO-258) — web reserves accent-active for the transient mousedown-before-focus-settles flash on the trigger (ino-multiselect.component.scss `.ino-field__control:active`); touch has no pointer-down-before-focus phase, so the Pressable goes straight from unfocused to colors.accent when the sheet opens.' },
      { platform: 'flutter', roles: ['accentActive'], reason: 'same as the React Native entry above.' },
      { platform: 'reactNative', roles: ['overlayScrim', 'borderSoft'], reason: 'ADDED roles, not dropped ones — same one intentional visual divergence ino-select\'s port declares (INO-258). Web anchors the option panel absolutely under the trigger with no scrim and no sheet chrome; this port presents the same checkbox list in a modal bottom sheet (ConfirmActionSheet.tsx idiom, docs/brand/13-mobile-app-patterns.md §2) for the same reason — an anchored popover under a field collides with the keyboard and the bottom safe area on a phone. overlay-scrim is that sheet backdrop and border-soft its grabber. See web/src/app/components/multiselect/SPEC.md §9.' },
      { platform: 'flutter', roles: ['overlayScrim', 'borderSoft'], reason: 'same as the React Native entry above — showModalBottomSheet barrierColor is overlay-scrim and the grabber is border-soft, matching confirm_action_sheet.dart / ino_select.dart.' },
    ],
  },
  {
    name: 'popover',
    web: 'web/src/app/components/popover',
    mobile: { reactNative: 'web-only', flutter: 'web-only' },
    reason: 'web-only by explicit decision (INO-31 plan rev 9 §5 desktop-idiom porting rule) — an anchor-positioned floating panel keyed to getBoundingClientRect() and mouse/keyboard dismiss gestures is a desktop pointer-and-keyboard idiom. The mobile counterpart is a different component and gets its own issue in a later wave. See web/src/app/components/popover/SPEC.md §5 and docs/brand/06-angular-components/popover.md#mobile-parity.',
  },
  {
    name: 'select',
    web: 'web/src/app/components/select',
    mobile: {
      reactNative: {
        path: 'mobile/react-native/src/components/InoSelect.tsx',
        roles: ['accent', 'accentTextSafe', 'border', 'borderSoft', 'danger', 'onSurface', 'onSurfaceMuted', 'onSurfaceSubtle', 'overlayScrim', 'surfaceRaised', 'surfaceSunken'],
      },
      flutter: {
        path: 'mobile/flutter/lib/widgets/ino_select.dart',
        roles: ['accent', 'accentTextSafe', 'border', 'borderSoft', 'danger', 'onSurface', 'onSurfaceMuted', 'onSurfaceSubtle', 'overlayScrim', 'surfaceRaised', 'surfaceSunken'],
      },
    },
    divergences: [
      { platform: 'reactNative', roles: ['accentActive'], reason: 'same rationale as the input and datepicker entries above — web reserves accent-active for the transient mousedown-before-focus-settles flash on the trigger (ino-select.component.scss `.ino-field__control:active`); touch has no pointer-down-before-focus phase, so the Pressable goes straight from unfocused to colors.accent when the sheet opens.' },
      { platform: 'flutter', roles: ['accentActive'], reason: 'same as the React Native entry above.' },
      { platform: 'reactNative', roles: ['overlayScrim', 'borderSoft'], reason: 'ADDED roles, not dropped ones — the two consequences of the one intentional visual divergence in this port (INO-258). Web anchors the option panel absolutely under the trigger with no scrim and no sheet chrome; an anchored popover under a field is a pointer idiom that on a phone collides with the software keyboard and the bottom safe area, so the port presents the same list in a modal bottom sheet (ConfirmActionSheet.tsx, docs/brand/13-mobile-app-patterns.md §2). overlay-scrim is that sheet backdrop and border-soft its grabber — both read from the same shared palette the existing sheet template already uses, not new values. See web/src/app/components/select/SPEC.md §9.' },
      { platform: 'flutter', roles: ['overlayScrim', 'borderSoft'], reason: 'same as the React Native entry above — showModalBottomSheet barrierColor is overlay-scrim and the grabber is border-soft, matching confirm_action_sheet.dart.' },
    ],
  },
  {
    name: 'table',
    web: 'web/src/app/components/table',
    mobile: { reactNative: 'web-only', flutter: 'web-only' },
    reason: 'web-only by explicit decision (INO-155, plan rev 9 §5 desktop-idiom porting rule) — a dense grid with column resize/reorder/frozen columns and roving-tabindex keyboard nav is a desktop pointer-and-keyboard idiom. The mobile counterpart is a different component and gets its own issue in a later wave. See web/src/app/components/table/SPEC.md §1 and docs/brand/06-angular-components/table.md#mobile-parity.',
  },
  {
    name: 'tag',
    web: 'web/src/app/components/tag',
    mobile: {
      reactNative: {
        path: 'mobile/react-native/src/components/InoTag.tsx',
        roles: ['info', 'onInfo', 'success', 'onSuccess', 'warning', 'onWarning', 'danger', 'onDanger'],
      },
      flutter: {
        path: 'mobile/flutter/lib/widgets/ino_tag.dart',
        roles: ['info', 'onInfo', 'success', 'onSuccess', 'warning', 'onWarning', 'danger', 'onDanger'],
      },
    },
    divergences: [
      {
        platform: 'reactNative',
        roles: ['onSurfaceMuted', 'riskHighDot', 'riskHighFill', 'riskHighOnFill', 'riskLowDot', 'riskLowFill', 'riskLowOnFill', 'riskMediumDot', 'riskMediumFill', 'riskMediumOnFill', 'success', 'onSuccess', 'warning', 'onWarning', 'danger', 'onDanger'],
        reason: 'severity remaps onto the roles the mobile palettes actually carry — high→danger, medium→warning, low→success, info→info — since neither native palette has risk-* fields (mobile/react-native/src/theme/tokens.ts). Dot mode also drops the adjacent label text color (on-surface-muted) because the RN/Flutter dot renders only the indicator, no text. Full reasoning: web/src/app/components/tag/SPEC.md §7 and docs/brand/06-angular-components/tag.md#mobile-parity.',
      },
      {
        platform: 'flutter',
        roles: ['onSurfaceMuted', 'riskHighDot', 'riskHighFill', 'riskHighOnFill', 'riskLowDot', 'riskLowFill', 'riskLowOnFill', 'riskMediumDot', 'riskMediumFill', 'riskMediumOnFill', 'success', 'onSuccess', 'warning', 'onWarning', 'danger', 'onDanger'],
        reason: 'same remapping as the React Native entry above.',
      },
    ],
  },
  {
    name: 'textarea',
    web: 'web/src/app/components/textarea',
    mobile: {
      reactNative: {
        path: 'mobile/react-native/src/components/InoTextarea.tsx',
        roles: ['accent', 'border', 'danger', 'onSurface', 'onSurfaceMuted', 'onSurfaceSubtle', 'surfaceRaised', 'surfaceSunken'],
      },
      flutter: {
        path: 'mobile/flutter/lib/widgets/ino_textarea.dart',
        roles: ['accent', 'border', 'danger', 'onSurface', 'onSurfaceMuted', 'onSurfaceSubtle', 'surfaceRaised', 'surfaceSunken'],
      },
    },
    divergences: [
      { platform: 'reactNative', roles: ['accentActive'], reason: 'same rationale as the input entry above — web reserves accent-active for the transient mousedown-before-focus-settles flash (ino-textarea.component.scss); touch input has no pointer-down-before-focus phase, so the port goes straight from unfocused to colors.accent on focus.' },
      { platform: 'flutter', roles: ['accentActive'], reason: 'same as the React Native entry above.' },
    ],
  },
  {
    name: 'tooltip',
    web: 'web/src/app/components/tooltip',
    mobile: { reactNative: 'web-only', flutter: 'web-only' },
    reason: 'web-only by explicit decision (INO-149, plan rev 9 §5 desktop-idiom porting rule) — hover and keyboard focus have no touch equivalent; a long-press hint is a materially different interaction, not a port. See web/src/app/components/tooltip/SPEC.md §5 and docs/brand/06-angular-components/tooltip.md#mobile.',
  },
  {
    name: 'virtual-scroller',
    web: 'web/src/app/components/virtual-scroller',
    mobile: { reactNative: 'web-only', flutter: 'web-only' },
    reason: 'web-only by design — the mobile tracks have platform-native equivalents (FlatList, ListView.builder) that are strictly better than a port. See web/src/app/components/virtual-scroller/SPEC.md §1 and docs/brand/06-angular-components/virtual-scroller.md#mobile.',
  },
];

for (let i = 1; i < COMPONENT_REGISTRY.length; i++) {
  assert.ok(COMPONENT_REGISTRY[i - 1].name < COMPONENT_REGISTRY[i].name,
    `COMPONENT_REGISTRY must stay alphabetically inserted: "${COMPONENT_REGISTRY[i - 1].name}" is not before "${COMPONENT_REGISTRY[i].name}"`);
}

let componentChecks = 0;
for (const entry of COMPONENT_REGISTRY) {
  assert.ok(existsSync(new URL(entry.web, root)), `${entry.name}: web path ${entry.web} does not exist`);
  const webRoles = webColorRoles(entry.web);

  const bothWebOnly = entry.mobile.reactNative === 'web-only' && entry.mobile.flutter === 'web-only';
  if (bothWebOnly) {
    assert.ok(entry.reason?.trim(), `${entry.name}: web-only on both mobile tracks needs a top-level "reason"`);
    componentChecks++;
    continue;
  }

  for (const platform of ['reactNative', 'flutter']) {
    const decl = entry.mobile[platform];
    const declaredDivergences = (entry.divergences ?? []).filter(d => d.platform === platform);
    if (decl === 'web-only') {
      const reason = declaredDivergences[0]?.reason ?? entry.reason;
      assert.ok(reason?.trim(), `${entry.name}/${platform}: declared web-only needs a reason (top-level "reason" or a divergence entry)`);
      componentChecks++;
      continue;
    }
    assert.ok(decl?.path, `${entry.name}/${platform}: registry entry must set either "web-only" or { path, roles }`);
    assert.ok(existsSync(new URL(decl.path, root)), `${entry.name}/${platform}: ${decl.path} does not exist`);
    const declaredRoles = new Set(decl.roles ?? []);
    const portSource = read(decl.path);
    for (const role of declaredRoles) {
      assert.ok(ALL_ROLE_FIELDS.has(role), `${entry.name}/${platform}: declared role "${role}" is not a known palette field`);
      // The registry's role list is author-declared, not auto-extracted (mobile role access is too
      // varied to parse reliably — literal `colors.x`, bracket lookups, indirection tables like
      // InoTag's SEVERITY_ROLE map). This whole-word presence check is the cheap guard against the
      // declaration going stale after a port edit: it would not have caught the role rename above.
      assert.ok(new RegExp(`\\b${role}\\b`).test(portSource),
        `${entry.name}/${platform}: registry declares role "${role}" for ${decl.path}, but that name does not appear anywhere in the file — update the registry (or the port) so the declaration stops describing code that no longer exists`);
    }
    for (const d of declaredDivergences) assert.ok(d.reason?.trim(), `${entry.name}/${platform}: divergence entry missing a reason`);
    const declaredDiffRoles = new Set(declaredDivergences.flatMap(d => d.roles));

    const missing = [...webRoles].filter(r => !declaredRoles.has(r));
    const extra = [...declaredRoles].filter(r => !webRoles.has(r));
    for (const role of [...missing, ...extra]) {
      assert.ok(declaredDiffRoles.has(role),
        `${entry.name}/${platform}: role "${role}" differs between web (${entry.web}) and the port (${decl.path}) with no declared divergence — either make the port consume the same role, or add a { platform: '${platform}', roles: ['${role}'], reason } entry to this component's divergences`);
    }
    for (const role of declaredDiffRoles) {
      assert.ok(missing.includes(role) || extra.includes(role),
        `${entry.name}/${platform}: declared divergence for role "${role}" no longer reflects an actual difference — remove the stale entry`);
    }
    componentChecks++;
  }
}

console.log(`PASS: CSS mirrors; Capacitor import; ${colorChecks} color roles across 3 themes × 2 mobile ports; space/radius/targets/durations; focus-ring shape; invalid-ring shape, never-flatten rule and SC 1.4.11 budget in 3 themes; pressed-accent contrast in 3 themes; control-size scale across 3 densities + ${controlChecks} mobile port values; form-label tokens across 3 themes × 2 densities; elevation scale (6 neutral + 3 brand + 2 inset) across 3 themes; leading/tracking rhythm scale + composite type aliases across 3 densities; component registry (${COMPONENT_REGISTRY.length} components, ${componentChecks} platform checks).`);
console.log('High-contrast token pairs (AAA text >=7; non-text borders >=3; excludes disabled/decorative subtle role);\nplus per-theme pressed-accent pairs (INO-123):\n'+measurements.join('\n'));
