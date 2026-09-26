// Dependency-free manifest generator. Run from any directory with Node.
//
// Walks docs/brand/06-angular-components/previews/*.html, reads each file's required first-line
// `<!-- @dsCard group="…" -->` marker (doc 17 §2 row 10 / §8), and writes
// docs/brand/06-angular-components/_ds_manifest.json — the card index the hosted docs site
// (index.html, H-6/INO-116) renders and the artifact the Claude Design import consumes (doc 17 §8).
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dsDir = new URL('../docs/brand/06-angular-components/', import.meta.url);
const previewsDir = new URL('previews/', dsDir);
const files = readdirSync(fileURLToPath(previewsDir)).filter(f => f.endsWith('.html')).sort();

const cards = files.map(file => {
  const id = file.replace(/\.html$/, '');
  const firstLine = readFileSync(new URL(file, previewsDir), 'utf8').split('\n', 1)[0];
  const group = firstLine.match(/<!--\s*@dsCard\s+group="([^"]+)"\s*-->/)?.[1];
  assert.ok(group, `${file}: missing/malformed leading @dsCard marker`);
  const docPath = `${id}.md`;
  return {
    id,
    group,
    preview: `previews/${file}`,
    doc: existsSync(new URL(docPath, dsDir)) ? docPath : null,
  };
});

cards.sort((a, b) => a.group.localeCompare(b.group) || a.id.localeCompare(b.id));
for (const c of cards) {
  if (!c.doc) console.warn(`gen-ds-manifest: ${c.id} has no matching ${c.id}.md doc`);
}

const manifest = { generatedFrom: 'previews/*.html @dsCard markers', cardCount: cards.length, cards };
writeFileSync(new URL('_ds_manifest.json', dsDir), JSON.stringify(manifest, null, 2) + '\n');
console.log(`gen-ds-manifest: wrote ${cards.length} cards across ${new Set(cards.map(c => c.group)).size} groups`);
