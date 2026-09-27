// INO-317: extracts the "Accessibility contract" and "Deliberate omissions" sections out of each
// component's narrative doc (docs/brand/06-angular-components/<file>.md) and publishes them as a
// runtime-fetchable JSON blob for the /docs/components portal. Generated — do not hand-edit.
// Re-run after editing any component doc's a11y/omissions text or after the manifest changes:
// `node scripts/generate-component-docs-extract.mjs`.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const manifestPath = new URL('docs/brand/design-system.manifest.json', root);
const docsDir = new URL('docs/brand/06-angular-components/', root);
const outPath = new URL('web/public/design-system/component-docs-extract.json', root);

// Filenames under docs/brand/06-angular-components/ are `${slug}.md` by default; these are the
// documented exceptions (see docs/brand/24-primeng-component-audit-ino-31.md and the INO-317
// ticket) plus the 5 marketing-only components that have no PrimeNG counterpart and no doc at all.
// (float-label / ifta-label's actual source directories are named `floatlabel` / `iftalabel`
// without a hyphen, so the default `${slug}.md` rule already resolves them correctly — no
// override entry needed for those two.)
const DOC_FILE_OVERRIDES = {
  nav: 'ino-nav.md',
  'toast-container': 'alert.md', // Toast shares the Message/alert doc
  'feature-grid': null,
  footer: null,
  hero: null,
  'metric-panel': null,
  'tier-card': null,
};

function docFileFor(slug) {
  if (Object.prototype.hasOwnProperty.call(DOC_FILE_OVERRIDES, slug)) {
    return DOC_FILE_OVERRIDES[slug];
  }
  return `${slug}.md`;
}

/** Extracts the body of a `## <heading>` section: everything after the heading line up to the
 * next `## ` heading or EOF. Returns null if the heading isn't present. */
function extractSection(markdown, heading) {
  const headingRe = new RegExp(`^##\\s+${heading}\\s*$`, 'm');
  const match = headingRe.exec(markdown);
  if (!match) return null;
  const start = match.index + match[0].length;
  const rest = markdown.slice(start);
  const nextHeadingMatch = /^##\s+/m.exec(rest);
  const body = nextHeadingMatch ? rest.slice(0, nextHeadingMatch.index) : rest;
  return body.trim() || null;
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const components = {};
for (const component of manifest.components) {
  const slug = component.slug;
  const docFile = docFileFor(slug);
  if (!docFile) {
    components[slug] = { name: component.name, docPath: null, a11y: null, notes: null };
    continue;
  }
  const docUrl = new URL(docFile, docsDir);
  const docPath = `docs/brand/06-angular-components/${docFile}`;
  if (!existsSync(docUrl)) {
    components[slug] = { name: component.name, docPath: null, a11y: null, notes: null };
    continue;
  }
  const markdown = readFileSync(docUrl, 'utf8');
  components[slug] = {
    name: component.name,
    docPath,
    a11y: extractSection(markdown, 'Accessibility contract'),
    notes: extractSection(markdown, 'Deliberate omissions'),
  };
}

const output = {
  generatedBy: 'scripts/generate-component-docs-extract.mjs',
  generatedFrom: 'docs/brand/06-angular-components/*.md via docs/brand/design-system.manifest.json',
  note: 'generated — do not hand-edit',
  components,
};

writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');
console.log(`wrote web/public/design-system/component-docs-extract.json (${Object.keys(components).length} components)`);
