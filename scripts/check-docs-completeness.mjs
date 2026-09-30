#!/usr/bin/env node
/*
 * DOCS-COMPLETENESS lint — INO-375, doc 26 §7 D-gate 3(c).
 *
 * "A manifest component without the §2 sections fails the build."
 *
 * Fourth sibling in the design-system gate set, and again a different question from
 * the other three:
 *
 *   parity       — do web, RN and Flutter agree about what the tokens ARE?
 *   adherence    — does the component source USE them?
 *   citations    — do the files a SPEC.md cites EXIST here?
 *   completeness — is the component's DOCS PAGE actually publishable?
 *
 * All three existing gates pass on a component whose /docs/components/<slug> page
 * renders "No live example available", an empty Accessibility contract and nothing
 * about states or sizing. That page is exactly what the board rejected on 2026-09-28
 * ("plenty of stuff missed… no one is the validator here"). This is the gate that
 * catches it, mechanically, per component, before QA time is spent on it.
 *
 * What it checks, and WHY each is checkable statically — the portal page
 * (docs-component-detail.component.html) is assembled from four committed files, so
 * "what a visitor will see" is decidable without a browser:
 *
 *   demo     §2.1  slug resolves to a component class in generated/component-registry.ts
 *                  or a hand-authored demo in custom-demos.ts. Neither ⇒ the Live
 *                  example section literally renders "No live example available".
 *   variants §2.1  a component the manifest credits with ≥2 variants must document them.
 *   states   §2.2  a States section (default/hover/focus/disabled/invalid/…).
 *   sizing   §2.3  a component with a `size` @Input must document its scale or density.
 *   labels   §2.4  a component with a `label` @Input must document label/required/
 *                  help/error text behaviour.
 *   a11y     §2.5  component-docs-extract.json[slug].a11y is non-null — i.e. the portal's
 *                  "Accessibility contract" heading has something under it. A missing
 *                  `## Accessibility contract` heading in the doc renders as the
 *                  "No Accessibility contract section found" placeholder.
 *   notes    §2.6  ditto for `## Deliberate omissions`.
 *
 * NOT checked here, deliberately, because it is not statically decidable and belongs to
 * another gate: §2.2's "in all 3 themes" (theme parity + the visual-snapshot job),
 * §2.5's keyboard walkthrough (the Playwright interaction smoke), §2.7 mobile ports, and
 * §2.8 QA sign-off (QALead on the issue, per INO-295).
 *
 * Dependency-free ESM over node: builtins, same as its three siblings — that is what
 * keeps the whole `check` job at ~15s with no `npm ci`, which is what keeps it switched
 * on. It reads the COMMITTED component-docs-extract.json rather than regenerating it
 * (regeneration needs marked + sanitize-html); the generator is deterministic and
 * `generate-component-docs-extract.mjs` is re-run as part of editing a doc.
 *
 * Usage:  node scripts/check-docs-completeness.mjs [--json]
 * Exit 0 = clean. Exit 1 = a missing section, or a stale waiver.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const asJson = process.argv.includes('--json');

const read = (rel) => readFileSync(join(root, rel), 'utf8');
const readJson = (rel) => JSON.parse(read(rel));

/* ------------------------------------------------------------------ *
 * 1. Inputs — the four committed files the portal page is built from.
 * ------------------------------------------------------------------ */

const MANIFEST = 'docs/brand/design-system.manifest.json';
const EXTRACT = 'web/public/design-system/component-docs-extract.json';
const REGISTRY = 'web/src/app/pages/docs/components/generated/component-registry.ts';
const CUSTOM_DEMOS = 'web/src/app/pages/docs/components/custom-demos.ts';
const DOCS_DIR = 'docs/brand/06-angular-components';

const manifest = readJson(MANIFEST);
const extract = readJson(EXTRACT);

// Slug sets from the two demo registries. Both are `Record<string, Type<unknown>>`
// object literals, so the keys are readable without a TS parse: `'slug': Class,` or
// `slug: Class,`. Matching the KEY position specifically (line-anchored, before the
// colon) rather than searching for the bare slug anywhere avoids a false positive from
// a slug appearing inside an import path.
function registryKeys(source) {
  const keys = new Set();
  for (const line of source.split('\n')) {
    const m = /^\s*'([a-z0-9-]+)'\s*:/.exec(line) ?? /^\s*([a-z][a-zA-Z0-9-]*)\s*:/.exec(line);
    if (m) keys.add(m[1]);
  }
  return keys;
}

const registrySlugs = registryKeys(read(REGISTRY));
const customDemoSlugs = registryKeys(read(CUSTOM_DEMOS));

/* ------------------------------------------------------------------ *
 * 2. Section detection.
 *
 * Heading conventions across the 38 component docs are NOT uniform — they were written
 * over ~6 waves by different authors, so the same dimension appears as `## States`,
 * `## 5 — Density`, `## Sizes`, `### Size API (INO-124 adoption)`. Normalising them is
 * INO-373's job (the PrimeNG-anatomy page migration); until then this lint matches a
 * documented FAMILY of headings per dimension rather than one exact string, at any
 * depth ## through ####.
 *
 * Deliberately permissive about heading TEXT and strict about PRESENCE: a false pass
 * here costs one missed doc section that QA still reviews by hand, while a false fail
 * on a heading synonym costs every author a waiver and gets the gate switched off.
 * ------------------------------------------------------------------ */

const SECTION_FAMILIES = {
  // §2.1 — variants and structure/anatomy.
  variants: /^#{2,4}\s+.*\b(variants?|structure|anatomy|shapes?|tiers?|severity|colour roles|color roles|selection model|two forms|three implementation patterns)\b/im,
  // §2.2 — the state set. Several docs (checkbox, toggle, radio-group) document states one
  // heading per state rather than under a single `## States`, so the per-state names count.
  states: /^#{2,4}\s+.*\b(states?|readonly|invalid|indeterminate|disabled|hover|focus-visible|loading|empty|behaviou?r notes|triggers?)\b/im,
  // §2.3 — the size scale and/or density register.
  sizing: /^#{2,4}\s+.*\b(siz(e|es|ing)|density|dense|scale|control-size)\b/im,
  // §2.4 — label, required marker, help/error text, truncation, RTL.
  labels: /^#{2,4}\s+.*\b(labels?|fields?|required|help text|error text|float ?label|ifta ?label)\b/im,
};

/** Headings of any depth in one doc, for the failure message — so the author can see
 *  what IS there next to what the lint wanted. */
function headings(markdown) {
  return markdown
    .split('\n')
    .filter((l) => /^#{2,4}\s/.test(l))
    .map((l) => l.replace(/^#+\s*/, '').trim());
}

/* ------------------------------------------------------------------ *
 * 3. Per-component checks.
 * ------------------------------------------------------------------ */

const CHECK_HELP = {
  doc: `no component doc under ${DOCS_DIR}/ — the portal page renders the "marketing-only component" placeholder for every §2 section`,
  demo: `slug is in neither ${REGISTRY} nor ${CUSTOM_DEMOS} — the portal's "Live example" section renders "No live example available"`,
  variants: 'the manifest credits this component with ≥2 variants; the doc has no Variants/Structure section documenting them (§2.1)',
  states: 'no States section — default/hover/focus-visible/active/disabled/readonly/invalid coverage is undocumented (§2.2)',
  sizing: 'component declares a `size` @Input; the doc has no Sizing/Sizes/Density section (§2.3)',
  labels: 'component declares a `label` @Input; the doc has no Labels/Fields section covering required marker, help text and error text (§2.4)',
  a11y: `component-docs-extract.json has no a11y body — the doc is missing a "## Accessibility contract" heading, so the portal renders the "No Accessibility contract section found" placeholder (§2.5)`,
  notes: `component-docs-extract.json has no notes body — the doc is missing a "## Deliberate omissions" heading, so the portal renders the "No Deliberate omissions section found" placeholder (§2.6)`,
};

const findings = [];
const checked = [];

for (const component of manifest.components) {
  const slug = component.slug;
  const entry = extract.components?.[slug] ?? null;
  const docPath = entry?.docPath ?? null;
  const inputNames = new Set((component.inputs ?? []).map((i) => i.name));

  const fail = (check, detail) =>
    findings.push({ slug, name: component.name, check, docPath, detail: detail ?? CHECK_HELP[check] });

  // §2.1 — a live demo, in either registry.
  if (!registrySlugs.has(slug) && !customDemoSlugs.has(slug)) fail('demo');

  if (!docPath) {
    // No doc at all ⇒ every doc-sourced dimension is missing. Reported as ONE finding
    // rather than six, so the 5 marketing components (INO-374) need one waiver each
    // instead of six, and so the real signal ("this component has no doc") is not
    // buried under its own consequences.
    fail('doc');
    checked.push(slug);
    continue;
  }

  if (!existsSync(join(root, docPath))) {
    fail('doc', `component-docs-extract.json points at ${docPath}, which does not exist — re-run scripts/generate-component-docs-extract.mjs`);
    checked.push(slug);
    continue;
  }
  const markdown = read(docPath);

  if ((component.variants ?? []).length >= 2 && !SECTION_FAMILIES.variants.test(markdown)) fail('variants');
  if (!SECTION_FAMILIES.states.test(markdown)) fail('states');
  if (inputNames.has('size') && !SECTION_FAMILIES.sizing.test(markdown)) fail('sizing');
  if (inputNames.has('label') && !SECTION_FAMILIES.labels.test(markdown)) fail('labels');
  if (!entry.a11y) fail('a11y');
  if (!entry.notes) fail('notes');

  checked.push(slug);
}

/* ------------------------------------------------------------------ *
 * 4. Waivers — same ratchet discipline as the adherence gate.
 *
 * Keyed on (slug, check) rather than a line number. Every entry needs a `reason` and an
 * `issue`, an UNUSED waiver FAILS the build, and adding one is a visible diff on a
 * reviewed file. This file is how the gate can start blocking NEW incomplete docs today
 * instead of waiting on INO-371's 43-component sweep.
 * ------------------------------------------------------------------ */

const waiverPath = 'scripts/docs-completeness-waivers.json';
const waiverFile = existsSync(join(root, waiverPath)) ? readJson(waiverPath) : { waivers: [] };
const key = (w) => `${w.slug} ${w.check}`;
const waiverIndex = new Map();
const malformed = [];
for (const w of waiverFile.waivers ?? []) {
  if (!w.slug || !w.check || !w.reason || !w.issue) malformed.push(w);
  else if (!(w.check in CHECK_HELP)) malformed.push({ ...w, _why: `unknown check "${w.check}"` });
  else waiverIndex.set(key(w), { ...w, used: 0 });
}

const unwaived = [];
for (const f of findings) {
  const waived = waiverIndex.get(key(f));
  if (waived) {
    waived.used++;
    continue;
  }
  unwaived.push(f);
}
const stale = [...waiverIndex.values()].filter((w) => !w.used);

/* ------------------------------------------------------------------ *
 * 5. Report.
 * ------------------------------------------------------------------ */

const waivedCount = findings.length - unwaived.length;

if (asJson) {
  console.log(JSON.stringify({ componentsChecked: checked.length, findings: unwaived, waived: waivedCount, stale, malformed }, null, 2));
} else {
  const bySlug = new Map();
  for (const f of unwaived) {
    if (!bySlug.has(f.slug)) bySlug.set(f.slug, []);
    bySlug.get(f.slug).push(f);
  }
  for (const [slug, list] of [...bySlug].sort((a, b) => a[0].localeCompare(b[0]))) {
    const doc = list[0].docPath ?? '(no doc)';
    console.log(`\n${slug}  —  ${list.length} missing §2 section${list.length === 1 ? '' : 's'}  (${doc})`);
    for (const f of list) console.log(`  ${f.check}: ${f.detail}`);
    if (list[0].docPath) {
      const hs = headings(read(list[0].docPath));
      console.log(`    headings present: ${hs.length ? hs.join(' · ') : '(none)'}`);
    }
  }
  for (const w of malformed) {
    console.log(`\nmalformed waiver (needs slug/check/reason/issue, check must be one of ${Object.keys(CHECK_HELP).join('|')}): ${JSON.stringify(w)}`);
  }
  for (const w of stale) {
    console.log(`\nstale waiver — the section is there now, delete the entry: ${w.slug} ${w.check} (${w.issue})`);
  }

  const summary = `${checked.length} components checked · ${unwaived.length} missing section${unwaived.length === 1 ? '' : 's'} · ${waivedCount} waived · ${stale.length} stale waiver${stale.length === 1 ? '' : 's'}`;
  const bad = unwaived.length || stale.length || malformed.length;
  console.log(bad ? `\nFAIL: ${summary}` : `\nPASS: ${summary}`);
  if (bad) {
    console.log(
      `\nFix the doc (add the section to its ${DOCS_DIR}/*.md and re-run\n` +
        `scripts/generate-component-docs-extract.mjs), or register a live demo. Add a waiver to\n` +
        `${waiverPath} ONLY when the section needs a decision that is not yours to make on this\n` +
        `PR — and name the issue that deletes it.`,
    );
  }
}

process.exit(unwaived.length || stale.length || malformed.length ? 1 : 0);
