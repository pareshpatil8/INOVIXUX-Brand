#!/usr/bin/env node
/*
 * SPEC.md CITATION check — INO-185 / standards doc §5b.
 *
 * Third sibling to check-theme-parity.mjs and check-ds-adherence.mjs, and again a
 * different question:
 *
 *   parity    — "do web, React Native and Flutter agree about what the tokens are?"
 *   adherence — "does the component source actually USE them?"
 *   citations — "do the files a decision record cites actually EXIST here?"
 *
 * Why this exists. Every INO-31 component SPEC.md justifies its decisions by citing
 * siblings. Siblings are built on parallel unmerged branches, so those citations
 * routinely point at files that do not exist on ino-31-design-system-parity — INO-160's
 * toggle SPEC cited `checkbox/SPEC.md`, `InoCheckbox.tsx` and `ino_checkbox.dart`, none
 * of which were on the base. A decision record whose precedent is unverifiable is worse
 * than no record, because the next implementer copies a pattern that was never agreed.
 *
 * The rule (standards doc §5b): a citation must resolve against the merge base at review
 * time, or be written as an explicit forward reference naming the issue it waits on —
 * `(pending INO-158)` — never as settled precedent.
 *
 * Dependency-free ESM, same as its siblings. No waiver file: the forward-reference marker
 * IS the escape hatch, and unlike a waiver it stays readable in the prose it qualifies.
 *
 * Usage:
 *   node scripts/check-spec-citations.mjs                  # resolve against the working tree
 *   node scripts/check-spec-citations.mjs --ref origin/ino-31-design-system-parity
 *                                                         # resolve against that ref merged
 *                                                         # with this branch's added files
 *   node scripts/check-spec-citations.mjs --json
 *
 * Exit 0 = every citation resolves or is a declared forward reference. Exit 1 = at least
 * one dangling citation.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { relative, join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const asJson = process.argv.includes('--json');
const refIndex = process.argv.indexOf('--ref');
const ref = refIndex === -1 ? null : process.argv[refIndex + 1];

/* ------------------------------------------------------------------ *
 * 1. Scope — which documents are checked, and what a "path" looks like.
 * ------------------------------------------------------------------ */

// Only component decision records. The narrow scope is deliberate: SPEC.md is the file
// whose whole value is that its precedents are checkable. Widening this to every .md in
// docs/brand/ would fold in historical/archived docs whose citations are snapshots of a
// moment, not live claims, and the gate would be turned off within a week.
const SPEC_FILENAME = 'SPEC.md';

const SKIP_DIRS = new Set(['node_modules', '.git', '.angular', 'dist', 'build', '.dart_tool', 'coverage']);

// A candidate is only treated as a path if it ends in one of these. This extension
// allowlist — not a slash heuristic — is what keeps `ListView.builder`, `e.g.`, `1.4.11`
// and `aria-setsize` out of the results.
const EXTENSIONS = new Set([
  'md', 'ts', 'tsx', 'js', 'mjs', 'cjs', 'dart', 'kt', 'swift', 'java',
  'html', 'scss', 'css', 'json', 'txt', 'yml', 'yaml', 'xml', 'svg', 'png', 'plist',
]);

// A path is exempt when its own block declares what it is waiting for. One canonical
// form, so the gate is predictable and the prose reads the same everywhere.
const FORWARD_REF = /\bpending\s+INO-\d+\b/i;

/* ------------------------------------------------------------------ *
 * 2. The file index the citations are resolved against.
 * ------------------------------------------------------------------ */

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) walk(abs, out);
    else out.push(relative(root, abs).split('\\').join('/'));
  }
  return out;
}

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);

// Default: the working tree. On a clean feature checkout that IS the merge result — the
// base plus this branch's own additions — which is the state a reviewer is judging.
// --ref reconstructs it explicitly for when the base has moved under a long-lived branch.
let files;
if (ref) {
  files = [...new Set([
    ...git('ls-tree', '-r', '--name-only', ref),
    ...git('diff', '--name-only', '--diff-filter=A', `${ref}...HEAD`),
    ...git('ls-files', '--others', '--exclude-standard'),
  ])];
} else {
  files = walk(root);
}

const fileSet = new Set(files);

// In --ref mode a SPEC.md can be listed from the ref's tree but absent from this checkout,
// so content comes from the ref. Disk wins when the file is there: an uncommitted edit to a
// SPEC is exactly what a reviewer is looking at.
function readSpec(path) {
  try {
    return readFileSync(join(root, path), 'utf8');
  } catch (err) {
    if (!ref || err.code !== 'ENOENT') throw err;
    return execFileSync('git', ['show', `${ref}:${path}`], { cwd: root, encoding: 'utf8' });
  }
}

// Basename index: SPEC prose legitimately cites `tokens.css` or `check-theme-parity.mjs`
// without a directory. Those resolve if the name exists anywhere in the tree.
const byBasename = new Set(files.map(f => basename(f)));

/* ------------------------------------------------------------------ *
 * 3. Candidate extraction.
 * ------------------------------------------------------------------ */

// Paths live in inline code spans or link targets — already the house convention in every
// SPEC.md on the base. Prose outside a code span is not scanned: doing so buys nothing and
// costs false positives on ordinary sentences.
const CODE_SPAN = /`([^`\n]+)`/g;
const LINK = /\]\(([^)\s]+)\)/g;

// `docs/brand/16-…-parity-vs-echeque-reference.md` is an established elision in these
// files. Rather than force a churn-y rewrite of other issues' prose, an elided path is
// resolved as a glob and must match exactly one real file — so it still verifies.
function resolvesElided(candidate) {
  const pattern = new RegExp('^' + candidate.split(/…|\.\.\./).map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
  const hits = candidate.includes('/') ? files.filter(f => pattern.test(f)) : [...byBasename].filter(b => pattern.test(b));
  return hits.length === 1;
}

function isPathLike(raw) {
  if (!raw || raw.includes('://') || raw.startsWith('#')) return false;
  // Template placeholders (`web/src/app/components/<name>/**`), globs and shell/JS
  // fragments are not citations of a specific file.
  if (/[<>*{}$\s|=()]/.test(raw)) return false;
  const ext = raw.split('.').pop().toLowerCase();
  return EXTENSIONS.has(ext) && ext !== raw.toLowerCase();
}

function resolves(candidate, specFile) {
  if (candidate.includes('…') || candidate.includes('...')) return resolvesElided(candidate);
  if (fileSet.has(candidate)) return true;                                   // repo-relative
  const dir = dirname(specFile);
  if (fileSet.has(`${dir}/${candidate}`)) return true;                       // same directory
  if (fileSet.has(`${dirname(dir)}/${candidate}`)) return true;              // sibling component
  if (!candidate.includes('/') && byBasename.has(candidate)) return true;    // bare filename
  return false;
}

/* ------------------------------------------------------------------ *
 * 4. Blocks — the scope a forward-reference marker covers.
 * ------------------------------------------------------------------ *
 * A marker qualifies the citation's own block: one paragraph, one list item, or one table
 * row. Not the whole file (a single `pending INO-158` anywhere would exempt everything)
 * and not one physical line (markdown wraps at ~100 cols, so a citation and its marker
 * routinely land on different lines of the same sentence).
 */
function blockIds(lines) {
  const ids = [];
  let id = 0;
  let inFence = false;
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; ids.push(inFence ? ++id : id); continue; }
    if (inFence) { ids.push(id); continue; }
    // A blank line, a new bullet/number, or a table row starts a new block.
    if (!line.trim() || /^\s*([-*+]|\d+[.)])\s/.test(line) || line.trimStart().startsWith('|')) id++;
    ids.push(id);
  }
  return ids;
}

/* ------------------------------------------------------------------ *
 * 5. Check every SPEC.md.
 * ------------------------------------------------------------------ */

const specs = files.filter(f => basename(f) === SPEC_FILENAME).sort();
const dangling = [];
let citationCount = 0;

for (const spec of specs) {
  const lines = readSpec(spec).split('\n');
  const ids = blockIds(lines);
  const markedBlocks = new Set();
  let inFence = false;
  const fenced = lines.map(line => {
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; return true; }
    return inFence;
  });

  lines.forEach((line, i) => { if (FORWARD_REF.test(line)) markedBlocks.add(ids[i]); });

  lines.forEach((line, i) => {
    if (fenced[i]) return;  // code fences hold examples and commands, not citations
    const raw = [];
    for (const m of line.matchAll(CODE_SPAN)) raw.push(m[1]);
    for (const m of line.matchAll(LINK)) raw.push(m[1]);

    for (const candidate of raw) {
      const cleaned = candidate.replace(/[.,;:)\]]+$/, '').replace(/^[([]+/, '');
      if (!isPathLike(cleaned)) continue;
      citationCount++;
      if (resolves(cleaned, spec)) continue;
      dangling.push({
        file: spec,
        line: i + 1,
        citation: cleaned,
        forwardReferenced: markedBlocks.has(ids[i]),
      });
    }
  });
}

const unresolved = dangling.filter(d => !d.forwardReferenced);
const declared = dangling.length - unresolved.length;

/* ------------------------------------------------------------------ *
 * 6. Report.
 * ------------------------------------------------------------------ */

if (asJson) {
  console.log(JSON.stringify({
    resolvedAgainst: ref ?? 'working tree',
    specsChecked: specs,
    citations: citationCount,
    unresolved,
    declaredForwardReferences: dangling.filter(d => d.forwardReferenced),
  }, null, 2));
} else {
  const byFile = new Map();
  for (const d of unresolved) (byFile.get(d.file) ?? byFile.set(d.file, []).get(d.file)).push(d);
  for (const [file, list] of [...byFile].sort()) {
    console.log(`\n${file} — ${list.length} dangling citation${list.length === 1 ? '' : 's'}`);
    for (const d of list) {
      console.log(`  ${file}:${d.line}  ${d.citation}`);
      console.log(`    → does not exist in ${ref ?? 'the working tree'}. Either cite a file that does, or mark it`);
      console.log(`      as a forward reference in the same paragraph / list item / table row: "(pending INO-nnn)".`);
    }
  }

  const summary = `${specs.length} SPEC.md checked · ${citationCount} citations · ${unresolved.length} dangling · ${declared} declared forward reference${declared === 1 ? '' : 's'} · resolved against ${ref ?? 'working tree'}`;
  console.log(unresolved.length ? `\nFAIL: ${summary}` : `\nPASS: ${summary}`);
}

process.exit(unresolved.length ? 1 : 0);
