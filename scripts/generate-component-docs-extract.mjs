// INO-317/INO-367/INO-372: extracts the "Accessibility contract" and "Deliberate omissions"
// sections out of each component's narrative doc (docs/brand/06-angular-components/<file>.md),
// renders them from markdown to sanitized HTML at generation time (so the portal has zero
// runtime markdown dependency), parses each component's `@Input`/`@Output` (plus public
// documented methods and `<ng-content>` slots) straight from its `.component.ts`/`.html` source
// into a structured `api` block (Props/Events/Methods/Templates — doc 26 §6 C3), and publishes
// the combined result as a runtime-fetchable JSON blob for the /docs/components portal.
// Generated — do not hand-edit.
// Re-run after editing any component doc's a11y/omissions text, after the manifest changes, or
// after changing any component's inputs/outputs/methods/slots:
// `node scripts/generate-component-docs-extract.mjs`.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

marked.setOptions({ gfm: true });

/** Markdown -> sanitized HTML for one extracted section body. Allows the tags/attributes needed
 * for tables, lists, code blocks and links; strips everything else (scripts, inline event
 * handlers, style attributes, arbitrary URLs schemes). */
function renderSection(markdown) {
  if (!markdown) return null;
  const html = marked.parse(markdown);
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'hr',
      'strong', 'em', 'del', 'code', 'pre',
      'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote',
    ],
    allowedAttributes: {
      a: ['href'],
      th: ['align'],
      td: ['align'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}

const root = new URL('../', import.meta.url);
const manifestPath = new URL('docs/brand/design-system.manifest.json', root);
const docsDir = new URL('docs/brand/06-angular-components/', root);
const outPath = new URL('web/public/design-system/component-docs-extract.json', root);

/** Angular lifecycle/CVA hook names — framework-invoked, never part of a component's public API,
 * so they're excluded from the generated Methods table even when documented. */
const LIFECYCLE_METHOD_NAMES = new Set([
  'constructor',
  'ngOnInit',
  'ngOnChanges',
  'ngOnDestroy',
  'ngDoCheck',
  'ngAfterViewInit',
  'ngAfterViewChecked',
  'ngAfterContentInit',
  'ngAfterContentChecked',
  'writeValue',
  'registerOnChange',
  'registerOnTouched',
  'setDisabledState',
]);

/** Byte ranges of every `/* ... *‍/` block comment in `source`, used both to skip decorator-shaped
 * text that only appears inside a doc comment (e.g. "`@Input() value`" in prose) and to find the
 * JSDoc immediately preceding a given match. */
function findCommentRanges(source) {
  const ranges = [];
  for (const m of source.matchAll(/\/\*[\s\S]*?\*\//g)) {
    ranges.push([m.index, m.index + m[0].length]);
  }
  return ranges;
}

function isInsideComment(ranges, index) {
  return ranges.some(([start, end]) => index >= start && index < end);
}

/** The nearest `/** ... *‍/` JSDoc block that sits directly above `index` (only whitespace in
 * between), flattened to a single line. Returns null when there is no such comment. */
function jsDocBefore(source, index, ranges) {
  let best = null;
  for (const [start, end] of ranges) {
    if (end <= index && source.slice(end, index).trim() === '') {
      if (!best || end > best[1]) best = [start, end];
    }
  }
  if (!best) return null;
  const raw = source.slice(best[0], best[1]);
  if (!raw.startsWith('/**')) return null; // plain `/* */`, not a doc comment
  const text = raw
    .slice(3, -2)
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text || null;
}

function findLocalTypeAliases(source) {
  const aliases = {};
  for (const m of source.matchAll(/export type (\w+) = ((?:'[^']+'\s*\|?\s*)+);/g)) {
    aliases[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  }
  return aliases;
}

/** Best-effort type when an `@Input`/`@Output` field has no explicit `: Type` annotation and
 * relies on inference from its initializer, e.g. `@Input() label = '';`. */
function inferTypeFromDefault(defaultValue) {
  if (defaultValue === null || defaultValue === undefined) return 'unknown';
  if (/^(true|false)$/.test(defaultValue)) return 'boolean';
  if (/^-?\d+(\.\d+)?$/.test(defaultValue)) return 'number';
  if (/^'.*'$/.test(defaultValue) || /^".*"$/.test(defaultValue)) return 'string';
  if (/^\[\s*\]$/.test(defaultValue)) return 'unknown[]';
  return 'unknown';
}

/** Props table: every `@Input()` field, its type (declared or inferred), the union values a
 * local `export type` alias or inline string-union resolves to, its default, and the JSDoc
 * immediately above it (if any). */
function parseProps(source, ranges) {
  const aliases = findLocalTypeAliases(source);
  const props = [];
  const re =
    /@Input\((?:\{[^}]*\})?\)\s*(?:readonly\s+)?(\w+)(\?)?\s*(?::\s*([^=;]+?))?\s*(?:=\s*([^;]+))?;/g;
  for (const m of source.matchAll(re)) {
    if (isInsideComment(ranges, m.index)) continue;
    const [, name, optionalMark, typeRaw, defaultRaw] = m;
    const defaultValue = defaultRaw?.trim() ?? null;
    const type = typeRaw?.trim() ?? inferTypeFromDefault(defaultValue);
    let values = null;
    if (aliases[type]) values = aliases[type];
    else {
      const inlineUnion = [...type.matchAll(/'([^']+)'/g)].map((x) => x[1]);
      if (inlineUnion.length) values = inlineUnion;
    }
    props.push({
      name,
      type,
      values,
      default: defaultValue,
      optional: Boolean(optionalMark) || defaultValue !== null,
      description: jsDocBefore(source, m.index, ranges),
    });
  }
  return props;
}

/** Events table: every `@Output()` `EventEmitter<T>` field, its payload type, and its JSDoc. */
function parseEvents(source, ranges) {
  const events = [];
  const re = /@Output\(\)\s*(?:readonly\s+)?(\w+)\s*=\s*new EventEmitter<([^;]*?)>\(\);/g;
  for (const m of source.matchAll(re)) {
    if (isInsideComment(ranges, m.index)) continue;
    const [, name, type] = m;
    events.push({ name, type: type.trim(), description: jsDocBefore(source, m.index, ranges) });
  }
  return events;
}

/** Methods table: public (no `private`/`protected`/`static`/getter modifier) class methods that
 * carry their own JSDoc — undocumented public methods are template-internal wiring, not
 * documented API surface, and lifecycle/CVA hooks are excluded even when documented. Anchored to
 * two-space class-member indentation, this codebase's consistent convention. */
function parseMethods(source, ranges) {
  const methods = [];
  const re = /^  (\w+)\(([^)]*)\)(?:\s*:\s*([^{]+?))?\s*\{/gm;
  for (const m of source.matchAll(re)) {
    if (isInsideComment(ranges, m.index)) continue;
    const [, name, params, returnType] = m;
    if (LIFECYCLE_METHOD_NAMES.has(name)) continue;
    const description = jsDocBefore(source, m.index, ranges);
    if (!description) continue;
    methods.push({
      name,
      params: params.trim() || null,
      returnType: returnType?.trim() ?? 'void',
      description,
    });
  }
  return methods;
}

/** The inline `template: \`...\`` string or the sibling `templateUrl` file's contents, whichever
 * this component uses — for `<ng-content>` slot discovery. */
function resolveTemplateMarkup(source, sourceUrl) {
  const templateUrlMatch = source.match(/templateUrl:\s*'([^']+)'/);
  if (templateUrlMatch) {
    const htmlUrl = new URL(templateUrlMatch[1], sourceUrl);
    return existsSync(htmlUrl) ? readFileSync(htmlUrl, 'utf8') : '';
  }
  const start = source.indexOf('template:');
  if (start === -1) return '';
  const backtickStart = source.indexOf('`', start);
  if (backtickStart === -1) return '';
  let end = backtickStart + 1;
  while (end < source.length && !(source[end] === '`' && source[end - 1] !== '\\')) end++;
  return source.slice(backtickStart + 1, end);
}

/** Templates(Slots) table: every distinct `<ng-content>` projection slot, named by its `select`
 * attribute or `"default"` when unselected. */
function parseTemplates(markup) {
  const seen = new Map();
  for (const m of markup.matchAll(/<ng-content(?:\s+select="([^"]*)")?[^>]*>/g)) {
    const name = m[1] ?? 'default';
    if (!seen.has(name)) seen.set(name, { name, description: null });
  }
  return [...seen.values()];
}

function parseComponentApi(sourcePath) {
  const sourceUrl = new URL(sourcePath, root);
  if (!existsSync(sourceUrl)) return { props: [], events: [], methods: [], templates: [] };
  const source = readFileSync(sourceUrl, 'utf8');
  const ranges = findCommentRanges(source);
  return {
    props: parseProps(source, ranges),
    events: parseEvents(source, ranges),
    methods: parseMethods(source, ranges),
    templates: parseTemplates(resolveTemplateMarkup(source, sourceUrl)),
  };
}

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
  const api = component.sourcePath
    ? parseComponentApi(component.sourcePath)
    : { props: [], events: [], methods: [], templates: [] };
  if (!docFile) {
    components[slug] = { name: component.name, docPath: null, a11y: null, notes: null, api };
    continue;
  }
  const docUrl = new URL(docFile, docsDir);
  const docPath = `docs/brand/06-angular-components/${docFile}`;
  if (!existsSync(docUrl)) {
    components[slug] = { name: component.name, docPath: null, a11y: null, notes: null, api };
    continue;
  }
  const markdown = readFileSync(docUrl, 'utf8');
  components[slug] = {
    name: component.name,
    docPath,
    a11y: renderSection(extractSection(markdown, 'Accessibility contract')),
    notes: renderSection(extractSection(markdown, 'Deliberate omissions')),
    api,
  };
}

const output = {
  generatedBy: 'scripts/generate-component-docs-extract.mjs',
  generatedFrom: 'docs/brand/06-angular-components/*.md and web/src/app/components/*/ino-*.component.{ts,html} via docs/brand/design-system.manifest.json',
  note: 'generated — do not hand-edit',
  format: 'html', // a11y/notes are sanitized HTML (marked + sanitize-html at generation time); api is structured JSON (Props/Events/Methods/Templates), not HTML
  components,
};

writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');
console.log(`wrote web/public/design-system/component-docs-extract.json (${Object.keys(components).length} components)`);
