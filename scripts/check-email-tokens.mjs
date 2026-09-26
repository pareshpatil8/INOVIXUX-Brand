// Guards against email templates drifting into a third source of truth. Regenerates the email
// HTML in memory from the same generator used to produce the committed files, then diffs against
// what's checked in — any hand-edit of docs/brand/07-collateral/email/templates/*.html that isn't
// also reflected by re-running the generator fails this check. Run with
// `node scripts/check-email-tokens.mjs`.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const committedDir = new URL('docs/brand/07-collateral/email/templates/', root);
const files = ['verification.html', 'approval-requested.html', 'report-ready.html', 'password-reset.html', 'signature.html'];

for (const f of files) {
  assert.ok(existsSync(new URL(f, committedDir)), `missing generated email file: ${f} — run node scripts/gen-email-templates.mjs`);
}

// The generator resolves its own output path relative to its module URL, so it always writes
// into this repo tree regardless of cwd — capture the committed content, re-run it in place,
// and diff byte-for-byte. A clean working tree makes this check non-destructive in practice;
// CI should run it on a fresh checkout.
const before = Object.fromEntries(files.map(f => [f, readFileSync(new URL(f, committedDir), 'utf8')]));
execFileSync(process.execPath, [new URL('gen-email-templates.mjs', import.meta.url).pathname], { stdio: 'pipe' });
const after = Object.fromEntries(files.map(f => [f, readFileSync(new URL(f, committedDir), 'utf8')]));

for (const f of files) {
  assert.equal(
    after[f],
    before[f],
    `${f} does not match a fresh run of scripts/gen-email-templates.mjs — the committed file drifted from tokens.css or the generator. Regenerate and commit.`
  );
}

console.log(`OK — ${files.length} email files match tokens.css via scripts/gen-email-templates.mjs`);
