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

function parseInputs(source, aliases) {
  const inputs = [];
  for (const m of source.matchAll(/@Input\(\)\s+(\w+)(\??):\s*([^=;]+?)\s*(?:=\s*([^;]+))?;/g)) {
    const [, name, optional, type, defaultValue] = m;
    const trimmedType = type.trim();
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
      default: defaultValue?.trim() ?? null,
      optional: Boolean(optional) || defaultValue !== undefined,
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
