#!/usr/bin/env node
/*
 * Design-system ADHERENCE lint — INO-118 / register item H-5.
 *
 * Sibling to check-theme-parity.mjs, and deliberately a different question:
 *
 *   parity    — "do web, React Native and Flutter agree about what the tokens are?"
 *   adherence — "does the component source actually USE them?"
 *
 * Parity passes with flying colours on a codebase where every component hardcodes
 * #7C5CFC, because the token files still agree with each other. This script is the
 * gate that catches that. It is the equivalent of the reference kit's
 * _adherence.oxlintrc.json (docs/brand/16-…-parity-vs-echeque-reference.md §13 row 22),
 * and it enforces the four-layer customisation contract in that document's §4.3.
 *
 * Dependency-free ESM, same as its sibling: no oxlint, no stylelint, no eslint, and
 * therefore nothing to keep in sync with three separate toolchains (Angular SCSS/HTML,
 * React Native TSX, Flutter Dart) that have no single linter in common. The legal
 * scales are PARSED FROM tokens.css at run time — never transcribed — so adding
 * --ino-space-12 widens the lint automatically and can never drift from the contract.
 *
 * Usage:  node scripts/check-ds-adherence.mjs [--json]
 * Exit 0 = clean. Exit 1 = violations, or a stale waiver.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { relative, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const asJson = process.argv.includes('--json');

/* ------------------------------------------------------------------ *
 * 1. Scope — what gets linted, and what is exempt.
 * ------------------------------------------------------------------ */

// Directories walked. Each is component/screen/page source: the places where
// drift actually lands. Adding a new UI track means adding it here.
const SCOPES = [
  'web/src',
  'docs/brand/06-angular-components/src',
  'mobile/capacitor/app/src',
  'mobile/react-native/src',
  'mobile/flutter/lib',
];

// Token-definition files: the ONE place raw values are not only legal but required.
// Everything here is either the canonical contract or a checked mirror of it, and
// check-theme-parity.mjs already guards their agreement.
const TOKEN_FILES = new Set([
  'docs/brand/02-design-tokens/tokens.css',
  'web/src/tokens.css',
  'mobile/react-native/src/theme/tokens.ts',
  'mobile/flutter/lib/theme/tokens.dart',
]);

// Theme plumbing: translates tokens into a framework's native theme object. These
// legitimately touch every role name, but must still not invent values — so they get
// the raw-color and off-scale rules, and are exempt only from `no-primitive-token`
// (they are the primitive → role boundary on their platform).
const THEME_ADAPTERS = new Set([
  'mobile/react-native/src/theme/ThemeProvider.tsx',
  'mobile/flutter/lib/theme/app_theme.dart',
  'mobile/flutter/lib/theme/theme_controller.dart',
]);

const SKIP_DIRS = new Set(['node_modules', 'dist', 'dist-web', 'build', '.dart_tool', '.angular', 'ios', 'android', 'coverage']);
const LINTED_EXT = /\.(scss|css|html|ts|tsx|dart)$/;
const SPEC_FILE = /\.(spec|test)\.(ts|tsx)$/;

/* ------------------------------------------------------------------ *
 * 2. The legal scales, parsed from the canonical token contract.
 * ------------------------------------------------------------------ */

const tokensCss = readFileSync(join(root, 'docs/brand/02-design-tokens/tokens.css'), 'utf8');
// Collect every declaration across every theme/density block — a value is legal if ANY
// block declares it (dense mode redefines --ino-type-body-size to 12.5px, and a
// component written against dense mode must not be flagged for it).
const tokenDecls = [...tokensCss.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--ino-[\w-]+)\s*:\s*([^;]+);/g)]
  .map(m => [m[1], m[2].trim()]);
if (!tokenDecls.length) throw new Error('parsed zero tokens from tokens.css — the lint would be vacuous');

// name -> every value the contract ever gives it. A token is redeclared per theme and
// per density block, so this is a set, not a scalar: --ino-type-body-size is 14px at
// base, 12.5px dense and 15px fluid, and all three are correct.
const tokenValues = new Map();
for (const [name, value] of tokenDecls) {
  if (!tokenValues.has(name)) tokenValues.set(name, new Set());
  tokenValues.get(name).add(value.replace(/\s+/g, ' '));
}

// Reverse index: numeric px value -> the token names that carry it, for "did you mean".
// Every declaration counts, not just the last one, or the dense/fluid redeclarations
// would read as off-scale (this is why `font-size: 14px` must stay legal: it is
// --ino-type-body-size at base density).
const scaleOf = prefixes => {
  const byValue = new Map();
  for (const [name, value] of tokenDecls) {
    if (!prefixes.some(p => name.startsWith(p))) continue;
    const px = value.match(/^(-?\d*\.?\d+)px$/);
    if (!px) continue;
    const n = parseFloat(px[1]);
    if (!byValue.has(n)) byValue.set(n, []);
    if (!byValue.get(n).includes(name)) byValue.get(n).push(name);
  }
  return byValue;
};
const SPACE_SCALE = scaleOf(['--ino-space-', '--ino-target-', '--ino-row-min-height']);
const RADIUS_SCALE = scaleOf(['--ino-radius-']);
const TYPE_SCALE = scaleOf(['--ino-type-']);

// Durations, in milliseconds, keyed the same way.
const DURATION_SCALE = new Map();
for (const [name, value] of tokenDecls) {
  if (!name.startsWith('--ino-motion-duration')) continue;
  const t = value.match(/^(\d*\.?\d+)(ms|s)$/);
  if (!t) continue;
  const ms = parseFloat(t[1]) * (t[2] === 's' ? 1000 : 1);
  if (!DURATION_SCALE.has(ms)) DURATION_SCALE.set(ms, []);
  DURATION_SCALE.get(ms).push(name);
};

const suggest = (scale, n) => {
  const hit = scale.get(n);
  if (hit) return `use var(${hit[0]})`;
  // Nearest on-scale neighbour, so the fix is a decision between two named steps
  // rather than a hunt through tokens.css.
  const near = [...scale.keys()].sort((a, b) => Math.abs(a - n) - Math.abs(b - n)).slice(0, 2).sort((a, b) => a - b);
  return near.length ? `nearest on-scale: ${near.map(v => `${scale.get(v)[0]} (${v})`).join(' / ')}` : 'no token on this scale';
};

/* ------------------------------------------------------------------ *
 * 3. Comment stripping — line-count preserving.
 * ------------------------------------------------------------------ */

// A hex literal inside a comment (`/* was #7C5CFC */`) is documentation, not drift.
// Blank comments out in place so reported line numbers still match the real file.
const blank = s => s.replace(/[^\n]/g, ' ');
function stripComments(text, kind) {
  const blockAndLine = t => t
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:\w])\/\/[^\n]*/g, (m, lead) => lead + blank(m.slice(lead.length)));
  if (kind === 'html') return text.replace(/<!--[\s\S]*?-->/g, blank);
  if (kind === 'css') return blockAndLine(text);
  return blockAndLine(text); // ts / tsx / dart
}

/* ------------------------------------------------------------------ *
 * 4. Rules.
 * ------------------------------------------------------------------ */

const violations = [];
const lineOf = (text, index) => text.slice(0, index).split('\n').length;
const add = (rule, file, text, index, match, message) =>
  violations.push({ rule, file, line: lineOf(text, index), match: match.trim(), message });

// Colour words that are unambiguously a colour decision. Deliberately not the full
// CSS named-colour list: `orange`, `tan` and friends collide with prose and class names.
const NAMED_COLORS = /\b(white|black|red|blue|green|yellow|purple|violet|indigo|magenta|cyan|gray|grey|silver|maroon|navy|olive|teal|lime|aqua|fuchsia)\b/;
// Colour keywords that carry no value of their own and are always legal.
const COLOR_KEYWORDS = /^(transparent|currentcolor|inherit|initial|unset|none|revert|auto)$/i;

// Spacing rhythm only. `top`/`left` are deliberately absent: positioning a toggle knob
// 2px inside its track is optical geometry, not a step on the spacing scale, and linting
// it produces noise that gets the whole lint switched off.
const SPACE_PROPS = /^(padding|margin|gap|row-gap|column-gap|inset|scroll-padding|scroll-margin)(-(top|right|bottom|left|block|inline|start|end|x|y))*$/;
const RADIUS_PROPS = /^border(-(top|bottom)-(left|right))?-radius$/;
const SHADOW_PROPS = /^(box-shadow|text-shadow)$/;
const TIME_PROPS = /^(transition|transition-duration|transition-delay|animation|animation-duration|animation-delay)$/;

/** Rules that apply to any file, by raw text scan. */
function scanUniversal(file, src, { allowPrimitives }) {
  // no-raw-color — the headline rule. A raw #7C5CFC in a component is invisible to
  // the theme switcher: it will not repaint in light or high-contrast mode.
  for (const m of src.matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|color-mix|oklch|lab)\s*\(/g)) {
    // SVG path data and Angular/TS identifiers can look hex-ish; require it to be a
    // standalone token, i.e. not part of a longer word.
    if (/^#/.test(m[0]) && !/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(m[0])) continue;
    add('no-raw-color', file, src, m.index, m[0],
      'raw colour literal — components must read a semantic role (var(--ino-color-*) / colors.* / InoPalette) so all 3 themes repaint');
  }

  // no-primitive-token — §4.3 Layer 1: "a component that references a primitive token
  // is a lint error". Primitives are frozen per-theme; roles are what re-theme.
  if (!allowPrimitives) {
    for (const m of src.matchAll(/--ino-primitive-[\w-]+/g)) {
      add('no-primitive-token', file, src, m.index, m[0],
        `primitive token — resolve it to the semantic role that owns it (tokens.css §2); primitives do not re-theme`);
    }
  }

  // no-escape-hatch — §4.3 Layer 4: no sanctioned override mechanism exists yet
  // (N-11 is still an open decision), and ::ng-deep is unlintable and permanent.
  for (const m of src.matchAll(/::ng-deep|\/deep\/|::part\(/g)) {
    add('no-escape-hatch', file, src, m.index, m[0],
      'style piercing — no escape hatch is sanctioned yet (doc 16 §4.3 Layer 4 / N-11); change the component API instead');
  }
}

// A token's own declared values can themselves be a pure var() reference — e.g. INO-126/W0-4 made
// --ino-type-body-line resolve as var(--ino-leading-8) / var(--ino-leading-5) / var(--ino-leading-9)
// instead of a bare decimal in every theme/density block. Chase those chains down to their terminal
// literals before comparing against a fallback below, or every existing `var(--ino-type-body-line,
// 1.65)` in the Capacitor track would misreport as stale the moment a token starts aliasing a scale
// instead of typing its own literal — exactly the move the primitive -> semantic-role architecture
// (and now the leading/tracking scale) asks every token in this file to make eventually.
const resolvedDeclaredCache = new Map();
function resolveDeclared(name, seen = new Set()) {
  if (resolvedDeclaredCache.has(name)) return resolvedDeclaredCache.get(name);
  if (seen.has(name)) return new Set(); // cyclic guard, should never trigger on real tokens
  seen.add(name);
  const out = new Set();
  for (const v of tokenValues.get(name) ?? []) {
    const pure = v.match(/^var\((--ino-[\w-]+)\)$/);
    if (pure && tokenValues.has(pure[1])) for (const r of resolveDeclared(pure[1], seen)) out.add(r);
    else out.add(v);
  }
  resolvedDeclaredCache.set(name, out);
  return out;
}

/*
 * `var(--ino-radius-md, 8px)` is the house idiom: the Capacitor track uses fallbacks so a
 * component still renders if tokens.css has not loaded. The fallback is therefore NOT a
 * hardcoded value and must be invisible to the literal rules below — but it is a
 * transcribed copy of a token, which is its own drift risk, so it gets a rule of its own.
 * Returns the value with every var() expression blanked, having checked its fallback.
 */
function resolveVars(file, value, at, whole) {
  let out = '';
  for (let i = 0; i < value.length; i++) {
    if (!value.startsWith('var(', i)) { out += value[i]; continue; }
    // Walk to the matching paren — fallbacks nest (`var(--a, var(--b))`).
    let depth = 0, end = i;
    for (; end < value.length; end++) {
      if (value[end] === '(') depth++;
      else if (value[end] === ')' && --depth === 0) break;
    }
    const inner = value.slice(i + 4, end);
    const comma = inner.indexOf(',');
    const name = (comma === -1 ? inner : inner.slice(0, comma)).trim();
    const fallback = comma === -1 ? null : inner.slice(comma + 1).trim();

    // stale-var-fallback — the fallback must be a value the contract actually gives this
    // token, in some theme or density. A fallback that drifted is worse than no fallback:
    // it renders a value the design system never approved, only when the stylesheet is
    // slow. Only checked for --ino-* tokens whose values are plain literals.
    if (fallback && tokenValues.has(name) && !fallback.startsWith('var(')) {
      const declared = resolveDeclared(name);
      const norm = fallback.replace(/\s+/g, ' ');
      const numeric = norm.match(/^(-?\d*\.?\d+)px$/);
      const sameNumber = d => {
        const dn = d.match(/^(-?\d*\.?\d+)px$/);
        return numeric && dn && parseFloat(dn[1]) === parseFloat(numeric[1]);
      };
      // A token defined as env()/var() carries its own fallback, and repeating THAT is the
      // correct thing to write: --ino-safe-area-top is env(safe-area-inset-top, 0px), so
      // `var(--ino-safe-area-top, 0px)` agrees with the contract on every browser — the
      // 0px is the same 0px. Comparing against the literal `env(…)` string would flag the
      // house idiom on every mobile page, which is how a lint gets switched off.
      const echoesInnerFallback = d => {
        const inner = d.match(/^(?:env|var)\([^,()]+,\s*([^()]+)\)$/);
        return inner && (inner[1].trim().replace(/\s+/g, ' ') === norm || sameNumber(inner[1].trim()));
      };
      const ok = declared.has(norm) || [...declared].some(d => sameNumber(d) || echoesInnerFallback(d));
      if (!ok) {
        add('stale-var-fallback', file, whole, at, `var(${name}, ${fallback})`,
          `${name} is never ${fallback} — the contract declares ${[...declared].join(' | ')}; a drifted fallback renders an unapproved value whenever tokens.css is slow`);
      }
    }
    out += blank(value.slice(i, end + 1));
    i = end;
  }
  return out;
}

/** CSS/SCSS declaration rules. Also used for inline style="" in templates. */
function scanDeclarations(file, src, offset = 0, whole = src) {
  for (const m of src.matchAll(/([-\w]+)\s*:\s*([^;{}]+)/g)) {
    const prop = m[1].toLowerCase();
    const at = offset + m.index + m[0].indexOf(m[2]);
    if (prop.startsWith('--')) continue; // a local custom-property definition, not a use
    const raw = m[2].trim();               // what the author wrote, for the report
    // Strip token references (checking their fallbacks on the way through) so the rules
    // below only ever see values the author really did hardcode.
    const value = resolveVars(file, raw, at, whole);
    const where = `${prop}: ${raw}`;

    // off-scale-spacing — a literal is tolerated (calc() and one-off layout need it),
    // but only if it lands on the space scale. 13px does not.
    if (SPACE_PROPS.test(prop)) {
      for (const px of value.matchAll(/(-?\d*\.?\d+)px/g)) {
        const n = Math.abs(parseFloat(px[1]));
        if (n === 0 || SPACE_SCALE.has(n)) continue;
        add('off-scale-spacing', file, whole, at + px.index, where,
          `${px[0]} is off the space scale — ${suggest(SPACE_SCALE, n)}`);
      }
    }

    // non-token-radius — closed 5-step scale, so nothing but a token (or the 0 / 50% /
    // pill idioms) has a reason to appear.
    if (RADIUS_PROPS.test(prop)) {
      for (const px of value.matchAll(/(\d*\.?\d+)(px|rem|em)/g)) {
        const n = parseFloat(px[1]);
        if (px[2] === 'px' && n >= 999) continue; // 9999px full-round idiom
        add('non-token-radius', file, whole, at + px.index, where,
          `${px[0]} is not a radius token — ${suggest(RADIUS_SCALE, px[2] === 'px' ? n : n * 16)}`);
      }
    }

    // non-token-shadow — elevation is a themed token: the dark-mode shadow reads as a
    // black smear in light mode and is `none` in high-contrast. A hardcoded one cannot
    // follow that.
    // Token references are already blanked, so any digit left is a real hardcoded offset.
    if (SHADOW_PROPS.test(prop) && !COLOR_KEYWORDS.test(value.trim()) && /\d/.test(value)) {
      add('non-token-shadow', file, whole, at, where,
        'hardcoded shadow — use var(--ino-elevation-1|-2); elevation is themed (none in high-contrast)');
    }

    // non-token-duration — motion durations are a 4-step scale tied to the easing set.
    if (TIME_PROPS.test(prop)) {
      for (const t of value.matchAll(/(\d*\.?\d+)(ms|s)\b/g)) {
        const ms = parseFloat(t[1]) * (t[2] === 's' ? 1000 : 1);
        if (ms === 0) continue;
        add('non-token-duration', file, whole, at + t.index, where,
          `${t[0]} is not a motion token — ${suggest(DURATION_SCALE, ms)}`);
      }
    }

    // off-scale-font-size — the type scale is the vertical rhythm. A 13px that belongs
    // to no role is exactly the drift doc 16 §9.2 (N-4) describes.
    if (prop === 'font-size') {
      for (const px of value.matchAll(/(\d*\.?\d+)(px|rem)/g)) {
        const n = px[2] === 'rem' ? parseFloat(px[1]) * 16 : parseFloat(px[1]);
        if (TYPE_SCALE.has(n)) continue;
        add('off-scale-font-size', file, whole, at + px.index, where,
          `${px[0]} is off the type scale — ${suggest(TYPE_SCALE, n)}`);
      }
    }
  }
}

/** Template rules — SVG/icon paint attributes and inline styles. */
function scanTemplate(file, src) {
  // no-hardcoded-icon-color — icons must inherit from text colour. A `stroke="#7C5CFC"`
  // is a violet icon in high-contrast mode, where the accent is yellow.
  for (const m of src.matchAll(/\b(fill|stroke|stop-color|flood-color|lighting-color|color)\s*=\s*"([^"]*)"/gi)) {
    const value = m[2].trim();
    if (!value || COLOR_KEYWORDS.test(value) || value.startsWith('url(') || value.startsWith('var(')) continue;
    if (/^[[(]/.test(m[1])) continue; // Angular binding syntax, handled as an expression
    add('no-hardcoded-icon-color', file, src, m.index, m[0],
      `icon paint must be currentColor or var(--ino-color-*) so it follows the text role in all 3 themes`);
  }
  for (const m of src.matchAll(/\bstyle\s*=\s*"([^"]*)"/gi)) {
    scanDeclarations(file, m[1], m.index + m[0].indexOf(m[1]), src);
  }
}

/** React Native style-object rules. The token module exports space/radius/duration. */
function scanReactNative(file, src) {
  for (const m of src.matchAll(/\b([A-Za-z]+)\s*:\s*(-?\d*\.?\d+)\b/g)) {
    const key = m[1];
    const n = Math.abs(parseFloat(m[2]));
    const camel = /^(padding|margin|gap|rowGap|columnGap)[A-Za-z]*$/;
    if (camel.test(key)) {
      if (n === 0 || SPACE_SCALE.has(n)) continue;
      add('off-scale-spacing', file, src, m.index, m[0], `${n} is off the space scale — ${suggest(SPACE_SCALE, n)} (import { space } from theme/tokens)`);
    } else if (/^border(Top|Bottom)?(Left|Right|Start|End)?Radius$/.test(key)) {
      if (n === 0 || n >= 999) continue;
      add('non-token-radius', file, src, m.index, m[0], `${n} is a raw radius — ${suggest(RADIUS_SCALE, n)} (import { radius } from theme/tokens)`);
    } else if (key === 'fontSize') {
      if (TYPE_SCALE.has(n)) continue;
      add('off-scale-font-size', file, src, m.index, m[0], `${n} is off the type scale — ${suggest(TYPE_SCALE, n)}`);
    } else if (key === 'duration') {
      if (n === 0 || DURATION_SCALE.has(n)) continue;
      add('non-token-duration', file, src, m.index, m[0], `${n}ms is not a motion token — ${suggest(DURATION_SCALE, n)}`);
    }
  }
}

/** Flutter rules. The token module exports InoSpace / InoRadius / InoMotion / InoPalette. */
function scanFlutter(file, src) {
  // Raw colours in Dart don't look like CSS: Color(0xFF7C5CFC) and Colors.deepPurple.
  for (const m of src.matchAll(/\bColor(?:\.fromARGB|\.fromRGBO)?\s*\(\s*0x[0-9a-fA-F]+|\bColors\.[a-zA-Z]+/g)) {
    add('no-raw-color', file, src, m.index, m[0],
      'raw colour — read it off context.inoColors / InoPalette so it follows the active theme');
  }
  // EdgeInsets.all(12) / .symmetric(horizontal: 4) / .fromLTRB(20, 0, 20, 56)
  for (const m of src.matchAll(/EdgeInsets\.\w+\(([^()]*)\)/g)) {
    for (const num of m[1].matchAll(/(?<![\w.])(-?\d*\.?\d+)(?![\w.])/g)) {
      const n = Math.abs(parseFloat(num[1]));
      if (n === 0 || SPACE_SCALE.has(n)) continue;
      add('off-scale-spacing', file, src, m.index, m[0], `${n} is off the space scale — ${suggest(SPACE_SCALE, n)} (InoSpace.*)`);
    }
  }
  for (const m of src.matchAll(/BorderRadius\.(?:circular|all)\s*\(\s*(?:Radius\.circular\s*\(\s*)?(-?\d*\.?\d+)/g)) {
    const n = Math.abs(parseFloat(m[1]));
    if (n === 0 || n >= 999) continue;
    add('non-token-radius', file, src, m.index, m[0], `${n} is a raw radius — ${suggest(RADIUS_SCALE, n)} (InoRadius.*)`);
  }
  for (const m of src.matchAll(/Duration\(\s*milliseconds:\s*(\d+)/g)) {
    const n = parseInt(m[1], 10);
    if (n === 0 || DURATION_SCALE.has(n)) continue;
    add('non-token-duration', file, src, m.index, m[0], `${n}ms is not a motion token — ${suggest(DURATION_SCALE, n)} (InoMotion.*)`);
  }
  for (const m of src.matchAll(/fontSize:\s*(\d*\.?\d+)/g)) {
    const n = parseFloat(m[1]);
    if (TYPE_SCALE.has(n)) continue;
    add('off-scale-font-size', file, src, m.index, m[0], `${n} is off the type scale — ${suggest(TYPE_SCALE, n)}`);
  }
}

/* ------------------------------------------------------------------ *
 * 5. Walk and dispatch.
 * ------------------------------------------------------------------ */

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.dart_tool') {
      if (entry.isDirectory()) continue;
    }
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(full);
    } else if (LINTED_EXT.test(entry.name)) {
      yield full;
    }
  }
}

let filesLinted = 0;
for (const scope of SCOPES) {
  const abs = join(root, scope);
  if (!existsSync(abs)) continue;
  for (const full of walk(abs)) {
    const file = relative(root, full).split(sep).join('/');
    if (TOKEN_FILES.has(file) || SPEC_FILE.test(file)) continue;
    const ext = file.split('.').pop();
    const kind = ext === 'html' ? 'html' : ext === 'scss' || ext === 'css' ? 'css' : 'code';
    const src = stripComments(readFileSync(full, 'utf8'), kind);
    filesLinted++;

    scanUniversal(file, src, { allowPrimitives: THEME_ADAPTERS.has(file) });
    if (kind === 'css') scanDeclarations(file, src);
    else if (kind === 'html') scanTemplate(file, src);
    else if (ext === 'dart') scanFlutter(file, src);
    else {
      // Angular .ts may carry an inline `template:` / `styles:`; RN .tsx is style objects.
      scanTemplate(file, src);
      scanReactNative(file, src);
    }
  }
}
if (!filesLinted) throw new Error('linted zero files — SCOPES is wrong or the checkout is incomplete');

/* ------------------------------------------------------------------ *
 * 6. Waivers.
 * ------------------------------------------------------------------ */

// A waiver is keyed on (rule, file, match) rather than a line number, so it survives
// edits above it instead of silently sliding onto an innocent line. Every waiver needs
// a `reason` and an `issue`, and an UNUSED waiver fails the build — so the file cannot
// quietly become a permanent parking lot for drift.
const waiverPath = join(root, 'scripts/ds-adherence-waivers.json');
const waivers = existsSync(waiverPath) ? JSON.parse(readFileSync(waiverPath, 'utf8')).waivers ?? [] : [];
const key = w => `${w.rule} ${w.file} ${w.match}`;
const waiverIndex = new Map();
const malformed = [];
for (const w of waivers) {
  if (!w.rule || !w.file || !w.match || !w.reason || !w.issue) malformed.push(w);
  else waiverIndex.set(key(w), { ...w, used: 0 });
}

const unwaived = [];
for (const v of violations) {
  const hit = waiverIndex.get(key(v));
  if (hit) hit.used++;
  else unwaived.push(v);
}
const stale = [...waiverIndex.values()].filter(w => !w.used);

/* ------------------------------------------------------------------ *
 * 7. Report.
 * ------------------------------------------------------------------ */

if (asJson) {
  console.log(JSON.stringify({ filesLinted, violations: unwaived, waived: violations.length - unwaived.length, stale, malformed }, null, 2));
} else {
  const byRule = new Map();
  for (const v of unwaived) (byRule.get(v.rule) ?? byRule.set(v.rule, []).get(v.rule)).push(v);
  for (const [rule, list] of [...byRule].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n${rule} — ${list.length} violation${list.length === 1 ? '' : 's'}`);
    for (const v of list.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)) {
      console.log(`  ${v.file}:${v.line}  ${v.match}`);
      console.log(`    → ${v.message}`);
    }
  }
  for (const w of malformed) console.log(`\nmalformed waiver (needs rule/file/match/reason/issue): ${JSON.stringify(w)}`);
  for (const w of stale) console.log(`\nstale waiver — the violation is gone, delete the entry: ${w.rule} ${w.file} "${w.match}" (${w.issue})`);

  const waived = violations.length - unwaived.length;
  const summary = `${filesLinted} files linted · ${unwaived.length} violation${unwaived.length === 1 ? '' : 's'} · ${waived} waived · ${stale.length} stale waiver${stale.length === 1 ? '' : 's'}`;
  console.log(unwaived.length || stale.length || malformed.length ? `\nFAIL: ${summary}` : `\nPASS: ${summary}`);
}

process.exit(unwaived.length || stale.length || malformed.length ? 1 : 0);
