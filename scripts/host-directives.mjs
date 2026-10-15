// INO-693: shared `hostDirectives` extraction for the two docs generators
// (`generate-design-system-manifest.mjs` and `generate-component-docs-extract.mjs`).
//
// `<ino-keyfilter>` and `<ino-focus-trap>` declare their *entire* public `@Input`/`@Output`
// surface by re-aliasing a sibling directive's through `hostDirectives` — one implementation, no
// wrapper node, deliberately (see each component's class doc). Both generators only ever parsed
// decorators written in the `*.component.ts` file itself, so both components published an empty
// `inputs: []` in the manifest and the docs portal's "This component declares no `@Input()`
// properties" placeholder — wrong for three (keyfilter) and four (focus-trap) live inputs.
//
// This is the only module shared between the generators; everything else in scripts/ is
// self-contained by convention. It exists because the alternative is a third and fourth copy of
// the same alias-resolution parse, and the two copies that already existed
// (`findLocalTypeAliases`) are now imported from here instead.
import { readFileSync, existsSync } from 'node:fs';

/** `export type X = 'a' | 'b';` string-union aliases declared directly in `source`. */
export function findLocalTypeAliases(source) {
  const aliases = {};
  for (const m of source.matchAll(/export type (\w+) = ((?:'[^']+'\s*\|?\s*)+);/g)) {
    aliases[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  }
  return aliases;
}

/** Local aliases plus those declared by `source`'s own *relative* imports. A directive's enum
 *  input type normally lives in a sibling file (`InoKeyfilterPreset` is declared in
 *  `keyfilter-presets.ts`, not in the directive), so the directive file alone cannot resolve it to
 *  a `values` list. Local declarations win on collision. */
export function collectTypeAliases(source, sourceUrl) {
  const aliases = {};
  for (const m of source.matchAll(/from\s+'(\.[^']+)'/g)) {
    const importedUrl = new URL(`${m[1]}.ts`, sourceUrl);
    if (!existsSync(importedUrl)) continue;
    Object.assign(aliases, findLocalTypeAliases(readFileSync(importedUrl, 'utf8')));
  }
  return Object.assign(aliases, findLocalTypeAliases(source));
}

/** The text inside the `[ … ]` that follows `key:` in `source`, bracket-depth aware so a nested
 *  `inputs: [...]` array never terminates the outer one. Null when `key` isn't present. */
function arrayLiteralAfter(source, key) {
  const keyIndex = source.indexOf(`${key}:`);
  if (keyIndex === -1) return null;
  const open = source.indexOf('[', keyIndex);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '[') depth++;
    else if (source[i] === ']' && --depth === 0) return source.slice(open + 1, i);
  }
  return null;
}

/** `'a: b'` -> `{ from: 'a', to: 'b' }`; bare `'a'` -> `{ from: 'a', to: 'a' }`. `from` is the
 *  directive's own public binding name, `to` the name it is exposed as on the host component —
 *  Angular's `hostDirectives` mapping syntax is `'<directiveBinding>: <publicAlias>'`. */
function parseBindingMap(arrayLiteral) {
  if (!arrayLiteral) return [];
  return [...arrayLiteral.matchAll(/'([^']+)'/g)].map((m) => {
    const [from, to] = m[1].split(':').map((part) => part.trim());
    return { from, to: to || from };
  });
}

/** Every `hostDirectives: [...]` entry, as `{ directive, inputs, outputs }`. Entry objects have no
 *  nested braces in this codebase's usage, so each is matched as a brace-free `{ … }` block. */
export function parseHostDirectiveBindings(source) {
  const block = arrayLiteralAfter(source, 'hostDirectives');
  if (!block) return [];
  const entries = [];
  for (const m of block.matchAll(/\{([^{}]*)\}/g)) {
    const body = m[1];
    const directive = body.match(/directive:\s*(\w+)/)?.[1];
    if (!directive) continue;
    entries.push({
      directive,
      inputs: parseBindingMap(arrayLiteralAfter(body, 'inputs')),
      outputs: parseBindingMap(arrayLiteralAfter(body, 'outputs')),
    });
  }
  return entries;
}

/** The source text and URL of `className`'s declaring file, found via `source`'s relative imports.
 *  Null when the class comes from a package rather than a sibling file — nothing to extract then. */
function resolveImportedSource(source, className, sourceUrl) {
  for (const m of source.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*'(\.[^']+)';/g)) {
    const names = m[1].split(',').map((n) => n.trim().split(/\s+as\s+/)[0].trim());
    if (!names.includes(className)) continue;
    const url = new URL(`${m[2]}.ts`, sourceUrl);
    if (!existsSync(url)) return null;
    return { url, source: readFileSync(url, 'utf8') };
  }
  return null;
}

/**
 * The inputs/outputs a component publishes through `hostDirectives`, already renamed to the public
 * names callers bind to on the element.
 *
 * `parseDirectiveApi(directiveSource, directiveUrl)` is the caller's own parser and must return
 * `{ inputs, outputs }` arrays of objects carrying at least a `name` — each generator keeps its own
 * record shape (the manifest's `optional` flag, the docs extract's `description`), so only the
 * name mapping lives here.
 */
export function extractHostDirectiveApi(componentSource, sourceUrl, parseDirectiveApi) {
  const inputs = [];
  const outputs = [];
  for (const entry of parseHostDirectiveBindings(componentSource)) {
    const resolved = resolveImportedSource(componentSource, entry.directive, sourceUrl);
    if (!resolved) continue;
    const api = parseDirectiveApi(resolved.source, resolved.url);
    const take = (bindings, parsed, into) => {
      for (const { from, to } of bindings) {
        const match = parsed.find((item) => item.name === from);
        // An unexposed directive binding is invisible on the host element, and a mapping whose
        // target doesn't parse is a generator gap — in both cases publishing nothing is correct.
        if (match) into.push({ ...match, name: to });
      }
    };
    take(entry.inputs, api.inputs ?? [], inputs);
    take(entry.outputs, api.outputs ?? [], outputs);
  }
  return { inputs, outputs };
}
