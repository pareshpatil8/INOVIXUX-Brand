// INO-115: generates docs/brand/design-system.manifest.json from source — never hand-maintained.
// Walks web/src/app/components/*/ino-*.component.ts (the live app; docs/brand/06-angular-components/src
// is a mirrored copy of the same 16 components and is intentionally not re-walked here to avoid
// double-counting) and extracts @Input() name/type/default per component from the TS AST-adjacent text.
// Re-run after adding or changing a component: `node scripts/generate-design-system-manifest.mjs`.
import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const componentsDir = new URL('web/src/app/components/', root);

// mobile = phones/small viewports; tablet/desktop breakpoints match the @media (max-width: …)
// values actually used across web/src/app/components/**/*.scss and web/src/styles/page-sections.scss
// (640px, 900px) — there is no separate per-component viewport contract today, so every component
// shares this one fleet-wide convention until a component declares its own.
const VIEWPORTS = {
  mobile: '<=640px',
  tablet: '641-900px',
  desktop: '>900px',
};

function findLocalTypeAliases(source) {
  const aliases = {};
  for (const m of source.matchAll(/export type (\w+) = ((?:'[^']+'\s*\|?\s*)+);/g)) {
    aliases[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map(x => x[1]);
  }
  return aliases;
}

// Blanks out `//` and `/* */` comments (preserving length/newlines so later offsets still make
// sense) so a `@Input()` mentioned in a JSDoc example — e.g. multiselect's class-doc comment —
// is never mistaken for a real decorator. Doesn't special-case `//` inside string literals;
// none of today's component sources put one there.
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length));
}

// Finds the index of `ch` in `text` starting at `from`, but only where bracket depth is 0 —
// i.e. not inside `()`, `[]`, or `{}` — so an arrow-function type's own `=>`/`;` never gets
// mistaken for the end of the enclosing `@Input` statement.
function findAtDepthZero(text, from, predicate) {
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    const c = text[i];
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (depth === 0 && predicate(text, i)) return i;
  }
  return -1;
}

// Most `@Input()`s in this codebase — especially the `booleanAttribute`/`numberAttribute`
// coercion form — skip the `: Type` annotation and let TS infer it from the default literal
// (`@Input({ transform: booleanAttribute }) disabled = false;`). Recover a manifest type from
// that literal so those inputs aren't silently dropped.
function inferTypeFromDefault(defaultValue) {
  if (defaultValue === null) return 'unknown';
  const v = defaultValue.trim();
  if (v === 'true' || v === 'false') return 'boolean';
  if (v === 'null') return 'null';
  if (/^-?\d+(\.\d+)?$/.test(v)) return 'number';
  if (/^(['"]).*\1$/.test(v)) return 'string';
  if (v.startsWith('[')) return 'unknown[]';
  return 'unknown';
}

function parseInputs(source, aliases) {
  const clean = stripComments(source);
  const inputs = [];
  // Bare `@Input()` or the coercion form `@Input({ transform: booleanAttribute | numberAttribute })`.
  const decoratorRe = /@Input\(\s*(?:\{\s*transform:\s*(booleanAttribute|numberAttribute)\s*\})?\s*\)\s*(\w+)(\??)\s*(?=[:=;])/g;
  let m;
  while ((m = decoratorRe.exec(clean))) {
    const [, transform, name, optional] = m;
    const afterName = m.index + m[0].length;

    let rawType = null;
    let cursor = afterName;
    if (clean[cursor] === ':') {
      const typeStart = cursor + 1;
      // Type ends at the first depth-0 `=` that isn't part of `=>`, or the first depth-0 `;`.
      const typeEnd = findAtDepthZero(
        clean,
        typeStart,
        (text, i) => text[i] === ';' || (text[i] === '=' && text[i + 1] !== '>'),
      );
      if (typeEnd === -1) continue; // malformed/unterminated — skip rather than swallow the rest of the file
      rawType = clean.slice(typeStart, typeEnd).trim();
      cursor = typeEnd;
    }

    let defaultValue = null;
    if (clean[cursor] === '=') {
      const defaultStart = cursor + 1;
      const defaultEnd = findAtDepthZero(clean, defaultStart, (text, i) => text[i] === ';');
      if (defaultEnd === -1) continue;
      defaultValue = clean.slice(defaultStart, defaultEnd).trim();
      cursor = defaultEnd;
    }
    if (clean[cursor] !== ';') continue; // malformed — skip rather than misparse
    decoratorRe.lastIndex = cursor;

    const trimmedType = transform
      ? (transform === 'booleanAttribute' ? 'boolean' : 'number')
      : (rawType ?? inferTypeFromDefault(defaultValue));
    let values = null;
    if (aliases[trimmedType]) values = aliases[trimmedType];
    else {
      const inlineUnion = [...trimmedType.matchAll(/'([^']+)'/g)].map(x => x[1]);
      if (inlineUnion.length) values = inlineUnion;
    }
    inputs.push({
      name,
      type: trimmedType,
      values,
      default: defaultValue,
      optional: Boolean(optional) || defaultValue !== null,
    });
  }
  return inputs;
}

const components = [];
for (const dirName of readdirSync(componentsDir).sort()) {
  if (!statSync(new URL(dirName, componentsDir)).isDirectory()) continue;
  const dirUrl = new URL(dirName + '/', componentsDir);
  const tsPath = new URL(`ino-${dirName}.component.ts`, dirUrl);
  let source;
  try {
    source = readFileSync(tsPath, 'utf8');
  } catch {
    continue; // directory without a matching ino-<name>.component.ts — not a component
  }
  const selectorMatch = source.match(/selector:\s*'([^']+)'/);
  const classMatch = source.match(/export class (\w+)/);
  const aliases = findLocalTypeAliases(source);
  const inputs = parseInputs(source, aliases);
  const variantInput = inputs.find(i => i.name === 'variant' || i.name === 'status');
  components.push({
    name: selectorMatch?.[1] ?? `ino-${dirName}`,
    slug: dirName,
    className: classMatch?.[1] ?? null,
    sourcePath: `web/src/app/components/${dirName}/ino-${dirName}.component.ts`,
    previewPath: null, // no docs/brand/06-angular-components/previews/*.html exist yet — tracked by H-6 (docs/brand/16-design-system-parity-vs-echeque-reference.md §6)
    inputs,
    variants: variantInput?.values ?? null,
    viewports: Object.keys(VIEWPORTS),
  });
}

const manifest = {
  $schema: 'https://json-schema.org/draft/2020-12/schema#',
  generatedBy: 'scripts/generate-design-system-manifest.mjs',
  generatedFrom: 'web/src/app/components/*/ino-*.component.ts',
  note: 'Machine-readable, generated — do not hand-edit. Re-run the generator after any component change.',
  viewportConventions: VIEWPORTS,
  componentCount: components.length,
  components,
};

const manifestJson = JSON.stringify(manifest, null, 2) + '\n';
writeFileSync(new URL('docs/brand/design-system.manifest.json', root), manifestJson);
// Also publish a runtime-fetchable copy under web/public/ — anything under public/ is served
// as-is by Angular (web/angular.json assets glob), so the docs portal can `HttpClient.get` this
// at `/design-system/manifest.json` without bundling the manifest into the JS build.
writeFileSync(new URL('web/public/design-system/manifest.json', root), manifestJson);
console.log(`wrote docs/brand/design-system.manifest.json and web/public/design-system/manifest.json (${components.length} components)`);
