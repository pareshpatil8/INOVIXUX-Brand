// INO-317: publishes the F-2 itemization from docs/brand/24-primeng-component-audit-ino-31.md
// §2 Matrix B — every PrimeNG component with no dedicated INOVIXUX build, and its disposition
// (Tier-1 unbuilt / Tier-2 open / Tier-3 declined) — as a runtime-fetchable JSON blob for the
// /docs/components portal. Transcribed by hand from the audit doc's table (small, stable source;
// not worth an AST/table parser) — do not invent rows, keep this in sync with doc 24 §2 if that
// table changes. Generated — do not hand-edit the output.
// Re-run: `node scripts/generate-component-disposition.mjs`.
import { writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const outPath = new URL('web/public/design-system/component-disposition.json', root);

const SOURCE = 'docs/brand/24-primeng-component-audit-ino-31.md §2 Matrix B';

// Each row transcribed verbatim from the Matrix B table. Multi-name cells are expanded to one
// entry per component name below, sharing the row's group/disposition text.
const ROWS = [
  { group: 'Form', components: ['IconField'], disposition: 'T1-unbuilt (T-16)', detail: '`ino-input` doc still routes icon slots here' },
  { group: 'Form', components: ['InputGroup'], disposition: 'T1-unbuilt (T-17)', detail: 'prefix/suffix addon mechanism' },
  { group: 'Panel', components: ['Tabs'], disposition: 'T1-unbuilt (T-26)', detail: null },
  { group: 'Panel', components: ['Stepper'], disposition: 'T1-unbuilt (T-27)', detail: null },
  { group: 'Misc', components: ['ProgressBar'], disposition: 'T1-unbuilt (T-15)', detail: 'ProgressSpinner shipped, bar did not' },
  { group: 'Form', components: ['Knob', 'Rating', 'ColorPicker', 'Editor'], disposition: 'T3-declined (in writing, doc 17)', detail: null },
  { group: 'Data', components: ['OrgChart'], disposition: 'T3-declined', detail: null },
  { group: 'Menu', components: ['Dock'], disposition: 'T3-declined', detail: null },
  { group: 'Misc', components: ['Terminal', 'Ripple (directive)', 'DragDrop (directive)'], disposition: 'T3-declined', detail: null },
  { group: 'Media', components: ['Carousel', 'Compare', 'Gallery', 'Galleria', 'Image', 'ImageCompare'], disposition: 'T3-declined ("gallery family")', detail: null },
  {
    group: 'Form',
    components: [
      'AutoComplete', 'CascadeSelect', 'InputColor', 'InputMask', 'InputNumber*', 'InputPassword*',
      'InputTags', 'KeyFilter', 'Listbox', 'SelectButton', 'Slider', 'ToggleButton', 'TreeSelect',
    ],
    disposition: 'T2/3-open (13; * = partial via `ino-input type`)',
    detail: null,
  },
  { group: 'Button', components: ['SpeedDial', 'SplitButton'], disposition: 'T2/3-open (2)', detail: null },
  { group: 'Data', components: ['DataView', 'OrderList', 'PickList', 'Tree', 'TreeTable'], disposition: 'T2/3-open (5)', detail: null },
  {
    group: 'Panel',
    components: ['Accordion', 'Divider', 'Fieldset', 'Panel', 'ScrollArea', 'ScrollPanel', 'Splitter', 'Toolbar'],
    disposition: 'T2/3-open (8)',
    detail: null,
  },
  { group: 'Overlay', components: ['DynamicDialog'], disposition: 'T2/3-open (1)', detail: null },
  {
    group: 'Menu',
    components: ['Menu', 'Breadcrumb', 'CommandMenu', 'ContextMenu', 'MegaMenu', 'PanelMenu', 'Sidebar', 'TieredMenu'],
    disposition: 'T2/3-open (8)',
    detail: null,
  },
  {
    group: 'Misc',
    components: [
      'Fluid', 'Avatar', 'Badge', 'BlockUI', 'Chip', 'Inplace', 'ScrollTop', 'AnimateOnScroll',
      'AutoFocus', 'Bind', 'ClassNames', 'StyleClass',
    ],
    disposition: 'T2/3-open (12)',
    detail: null,
  },
];

// Per the F-2 default-assignment call already blessed by the INO-317 ticket description: anything
// not already explicitly declined Tier-3 or committed Tier-1 defaults to Tier-2 ("the portal is
// where the Tier-2 vs Tier-3 assignment gets itemized in writing").
function classify(disposition) {
  const tMatch = disposition.match(/\(T-\d+\)/);
  if (disposition.startsWith('T1-unbuilt')) {
    return {
      tier: 'Tier-1',
      status: `Unbuilt — committed in doc 17 Wave 2${tMatch ? ` ${tMatch[0]}` : ''}, tracked in a separate INO-31 child issue.`,
    };
  }
  if (disposition.startsWith('T3-declined')) {
    return {
      tier: 'Tier-3',
      status: 'Declined — see doc 17 "Tier 2 and Tier 3".',
    };
  }
  // T2/3-open
  return {
    tier: 'Tier-2',
    status:
      'Open — no build committed, no spec written yet. Itemized here per finding F-2; needs a spec before any implementation work starts.',
  };
}

const items = [];
for (const row of ROWS) {
  const { tier, status } = classify(row.disposition);
  for (const component of row.components) {
    items.push({
      component,
      group: row.group,
      tier,
      status,
      sourceNote: row.disposition,
    });
  }
}

const output = {
  generatedFrom: SOURCE,
  note:
    'Tier assignment per finding F-2: every PrimeNG component with no dedicated INOVIXUX build gets ' +
    'an explicit disposition here — Tier-1 (committed, unbuilt), Tier-3 (formally declined per doc ' +
    '17), or Tier-2 (open — specify before building; the default for anything neither built nor ' +
    'explicitly declined).',
  items,
};

writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');
console.log(`wrote web/public/design-system/component-disposition.json (${items.length} items)`);
