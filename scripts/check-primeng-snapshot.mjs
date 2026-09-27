#!/usr/bin/env node
/*
 * PrimeNG pinned-snapshot check — INO-169 / register item M-13.
 *
 * Every ✅/❌ in docs/brand/16-design-system-parity-vs-echeque-reference.md is a claim
 * about a SPECIFIC PrimeNG version, made against the pinned index in specs/primeng/.
 * The live AI tooling (the PrimeNG Plugin / @primeng/mcp) is a moving target that
 * needs Node 22 and network access, so it cannot back a CI gate. This script is the
 * CI-safe counterpart. Two modes, two questions:
 *
 *   (default)  integrity — "is the pinned snapshot still exactly the file the parity
 *              claims were made against?" Verifies the newest specs/primeng/llms-*.txt
 *              against the bytes + MD5 declared in specs/primeng/README.md, and checks
 *              the guide/component route counts the README asserts. Offline, runs in
 *              the design-system PR gate. A silent edit to the snapshot — or a refresh
 *              that forgets to update the README's provenance table — fails here.
 *
 *   --drift    drift — "has PrimeNG's live llms.txt diverged from the pin?" Fetches
 *              https://primeng.dev/llms/llms.txt and diffs route URLs against the
 *              snapshot. Needs network, so it backs a SCHEDULED workflow, never the PR
 *              gate. Drift is not an error in our code — it is the signal to cut a new
 *              llms-<version>.txt and open the next doc 16 rebaseline, which is how
 *              "we regressed" stays distinguishable from "PrimeNG shipped more."
 *
 * Dependency-free ESM over node: builtins, same as its siblings — this is what lets
 * the design-system gate skip `npm ci` and stay ~15s.
 *
 * Usage:  node scripts/check-primeng-snapshot.mjs [--drift] [--json]
 * Exit 0 = clean. Exit 1 = integrity failure, or (with --drift) upstream drift.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const specDir = join(root, 'specs/primeng');
const driftMode = process.argv.includes('--drift');
const asJson = process.argv.includes('--json');

const LIVE_URL = 'https://primeng.dev/llms/llms.txt';

const problems = [];

/* ------------------------------------------------------------------ *
 * The pin — newest llms-<version>.txt wins (refreshes add, never overwrite).
 * ------------------------------------------------------------------ */
const snapshots = readdirSync(specDir)
  .filter((f) => /^llms-\d+\.\d+\.\d+\.txt$/.test(f))
  .sort((a, b) => {
    const v = (f) => f.match(/^llms-(\d+)\.(\d+)\.(\d+)\.txt$/).slice(1).map(Number);
    const [A, B] = [v(a), v(b)];
    return A[0] - B[0] || A[1] - B[1] || A[2] - B[2];
  });
if (!snapshots.length) {
  console.error(`FAIL: no llms-<version>.txt snapshot found in specs/primeng/`);
  process.exit(1);
}
const pinName = snapshots.at(-1);
const pinBuf = readFileSync(join(specDir, pinName));
const pinText = pinBuf.toString('utf8');

// Route URLs are the unit of comparison: every "- [Title](https://primeng.dev/...)" line.
const routes = (text) => {
  const urls = [];
  for (const m of text.matchAll(/^- \[[^\]]+\]\((https:\/\/primeng\.dev\/[^)\s]+)\)/gm)) urls.push(m[1]);
  return urls;
};
// Section split: guides before "## Components", component/API routes after.
const componentRoutes = (text) => routes(text.slice(text.indexOf('\n## Components')));
const guideRoutes = (text) => routes(text.slice(0, text.indexOf('\n## Components')));

/* ------------------------------------------------------------------ *
 * Integrity — snapshot vs the provenance the README declares for it.
 * ------------------------------------------------------------------ */
const readme = readFileSync(join(specDir, 'README.md'), 'utf8');
// Provenance table row: | `llms-22.1.1.txt` | `<url>` | <date> | 16,984 | `md5` |
const row = readme
  .split('\n')
  .map((l) => l.match(/^\|\s*`(llms-[\d.]+\.txt)`\s*\|.*\|\s*([\d,]+)\s*\|\s*`([0-9a-f]{32})`\s*\|/))
  .find((m) => m && m[1] === pinName);

if (!row) {
  problems.push(`README.md has no provenance row (file | source | fetched | bytes | md5) for ${pinName}`);
} else {
  const declaredBytes = Number(row[2].replaceAll(',', ''));
  const declaredMd5 = row[3];
  const actualMd5 = createHash('md5').update(pinBuf).digest('hex');
  if (pinBuf.length !== declaredBytes)
    problems.push(`${pinName} is ${pinBuf.length} bytes, README declares ${declaredBytes} — snapshot edited without updating provenance`);
  if (actualMd5 !== declaredMd5)
    problems.push(`${pinName} md5 is ${actualMd5}, README declares ${declaredMd5} — snapshot edited without updating provenance`);
}

// Route-count claims: README states "<lines> lines — <n> guide routes plus <n> component/API routes".
const counts = readme.match(/(\d+)\s+lines\s+—\s+(\d+)\s+guide routes plus\s+\*{0,2}(\d+)\s+component\/API routes/);
const pinGuides = guideRoutes(pinText);
const pinComponents = componentRoutes(pinText);
if (counts) {
  const [, lines, guides, components] = counts.map(Number);
  const actualLines = pinText.split('\n').filter((l, i, a) => i < a.length - 1 || l !== '').length;
  if (actualLines !== lines) problems.push(`snapshot has ${actualLines} lines, README claims ${lines}`);
  if (pinGuides.length !== guides) problems.push(`snapshot has ${pinGuides.length} guide routes, README claims ${guides}`);
  if (pinComponents.length !== components) problems.push(`snapshot has ${pinComponents.length} component/API routes, README claims ${components}`);
} else {
  problems.push(`README.md no longer states the "N lines — N guide routes plus N component/API routes" claim to verify against`);
}

/* ------------------------------------------------------------------ *
 * Drift — live llms.txt vs the pin (route-URL set diff). --drift only.
 * ------------------------------------------------------------------ */
let drift = null;
if (driftMode) {
  let liveText;
  try {
    const res = await fetch(LIVE_URL, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    liveText = await res.text();
  } catch (e) {
    // Network failure is "could not answer", not "drift". Fail loudly so the
    // scheduled run shows red instead of a false "no drift" green.
    console.error(`FAIL: could not fetch ${LIVE_URL}: ${e.message}`);
    process.exit(1);
  }
  const pinSet = new Set(routes(pinText));
  const liveSet = new Set(routes(liveText));
  drift = {
    added: [...liveSet].filter((u) => !pinSet.has(u)),
    removed: [...pinSet].filter((u) => !liveSet.has(u)),
    liveComponentCount: componentRoutes(liveText).length,
  };
}

/* ------------------------------------------------------------------ *
 * Report.
 * ------------------------------------------------------------------ */
const hasDrift = drift !== null && (drift.added.length || drift.removed.length);
if (asJson) {
  console.log(JSON.stringify({ pin: pinName, componentRoutes: pinComponents.length, problems, drift }, null, 2));
} else {
  for (const p of problems) console.log(`integrity: ${p}`);
  if (drift) {
    for (const u of drift.added) console.log(`drift: NEW upstream route  ${u}`);
    for (const u of drift.removed) console.log(`drift: route GONE upstream  ${u}`);
    if (hasDrift)
      console.log(
        `\nPrimeNG's live llms.txt has drifted from ${pinName} (+${drift.added.length} / -${drift.removed.length}, live component/API routes: ${drift.liveComponentCount}).` +
          `\nThis is upstream movement, not a regression. Next step: curl -sL ${LIVE_URL} -o specs/primeng/llms-<new-version>.txt,` +
          `\nupdate the README provenance table, and open a doc 16 rebaseline issue against INO-31.`
      );
  }
  const status = problems.length || hasDrift ? 'FAIL' : 'PASS';
  console.log(
    `${status}: pin ${pinName} · ${pinComponents.length} component/API routes · ${problems.length} integrity problem${problems.length === 1 ? '' : 's'}` +
      (drift ? ` · drift +${drift.added.length}/-${drift.removed.length}` : ' · drift not checked (offline mode)')
  );
}
process.exit(problems.length || hasDrift ? 1 : 0);
