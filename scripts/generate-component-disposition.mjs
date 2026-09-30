// INO-317 / INO-503: publishes the F-2 itemization from docs/brand/24-primeng-component-audit-ino-31.md
// §2 Matrix B — every PrimeNG component with no dedicated INOVIXUX build, and its disposition — as a
// runtime-fetchable JSON blob for the /docs/components portal. Transcribed by hand from the audit
// doc's table (small, stable source; not worth an AST/table parser) — do not invent rows, keep this
// in sync with doc 24 §2 if that table changes. Generated — do not hand-edit the output.
// Re-run: `node scripts/generate-component-disposition.mjs`.
//
// Rev 2 (INO-503, 2026-09-30): the tier axis is retired. The board directive on INO-377 card
// `9fd2d7c2` ("stick to 101 components with all variations", approval `f55baa72`) superseded the
// Tier-2 "open, unassigned" and Tier-3 "declined" buckets: doc 26 §5 rev-2 commits every
// genuinely-distinct row to a build phase (B1-B5) and records the rest as alias rows in its
// covered-by ledger. So every Matrix B row now carries a settled disposition — `Shipped`,
// `Committed`, or `Covered` — and nothing is left `open`. The ledger closing at 100% is enforced
// below by ASSERTIONS, not asserted in prose: this script throws if any Matrix B component has no
// rev-2 disposition, or if REV2 names a component Matrix B does not list.
import { writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const outPath = new URL('web/public/design-system/component-disposition.json', root);

const SOURCE = 'docs/brand/24-primeng-component-audit-ino-31.md §2 Matrix B';
const AMENDMENT =
  'docs/brand/26-quality-remediation-and-completion-plan-ino-31.md §5 rev 2 ' +
  '(Phase B5 spec table + covered-by ledger; board approval f55baa72, INO-377)';

// Each row transcribed verbatim from the Matrix B table. Multi-name cells are expanded to one
// entry per component name below, sharing the row's group and `sourceNote`. `sourceNote` is the
// PRE-amendment audit label, kept for provenance — the live disposition comes from REV2.
const ROWS = [
  { group: 'Form', components: ['IconField'], disposition: 'T1-unbuilt (T-16)' },
  { group: 'Form', components: ['InputGroup'], disposition: 'T1-unbuilt (T-17)' },
  { group: 'Panel', components: ['Tabs'], disposition: 'T1-unbuilt (T-26)' },
  { group: 'Panel', components: ['Stepper'], disposition: 'T1-unbuilt (T-27)' },
  { group: 'Misc', components: ['ProgressBar'], disposition: 'T1-unbuilt (T-15)' },
  { group: 'Form', components: ['Knob', 'Rating', 'ColorPicker', 'Editor'], disposition: 'T3-declined (in writing, doc 17)' },
  { group: 'Data', components: ['OrgChart'], disposition: 'T3-declined' },
  { group: 'Menu', components: ['Dock'], disposition: 'T3-declined' },
  { group: 'Misc', components: ['Terminal', 'Ripple (directive)', 'DragDrop (directive)'], disposition: 'T3-declined' },
  { group: 'Media', components: ['Carousel', 'Compare', 'Gallery', 'Galleria', 'Image', 'ImageCompare'], disposition: 'T3-declined ("gallery family")' },
  {
    group: 'Form',
    components: [
      'AutoComplete', 'CascadeSelect', 'InputColor', 'InputMask', 'InputNumber*', 'InputPassword*',
      'InputTags', 'KeyFilter', 'Listbox', 'SelectButton', 'Slider', 'ToggleButton', 'TreeSelect',
    ],
    disposition: 'T2/3-open (13; * = partial via `ino-input type`)',
  },
  { group: 'Button', components: ['SpeedDial', 'SplitButton'], disposition: 'T2/3-open (2)' },
  { group: 'Data', components: ['DataView', 'OrderList', 'PickList', 'Tree', 'TreeTable'], disposition: 'T2/3-open (5)' },
  {
    group: 'Panel',
    components: ['Accordion', 'Divider', 'Fieldset', 'Panel', 'ScrollArea', 'ScrollPanel', 'Splitter', 'Toolbar'],
    disposition: 'T2/3-open (8)',
  },
  { group: 'Overlay', components: ['DynamicDialog'], disposition: 'T2/3-open (1)' },
  {
    group: 'Menu',
    components: ['Menu', 'Breadcrumb', 'CommandMenu', 'ContextMenu', 'MegaMenu', 'PanelMenu', 'Sidebar', 'TieredMenu'],
    disposition: 'T2/3-open (8)',
  },
  {
    group: 'Misc',
    components: [
      'Fluid', 'Avatar', 'Badge', 'BlockUI', 'Chip', 'Inplace', 'ScrollTop', 'AnimateOnScroll',
      'AutoFocus', 'Bind', 'ClassNames', 'StyleClass',
    ],
    disposition: 'T2/3-open (12)',
  },
];

// --- Rev-2 dispositions -------------------------------------------------------------------------
// One entry per Matrix B component name (keys match ROWS verbatim, `*` partial markers included).
//   shipped(target, issue)      — built since the audit snapshot; the commitment is closed.
//   build(phase, target, note?) — committed to a doc 26 §5 phase, with its spec row written.
//   covered(by, why)            — an alias row: PrimeNG's name for capability we already ship.
//                                 `by` is the one-line "covered by X" the ledger closes with.
const shipped = (target, issue) => ({ kind: 'Shipped', target, issue });
const build = (phase, target, note = null) => ({ kind: 'Committed', phase, target, note });
const covered = (by, why) => ({ kind: 'Covered', by, why });

const REV2 = {
  // Shipped since the audit snapshot — doc 24 F-1, the five doc-17 Tier-1 commitments, all built.
  ProgressBar: shipped('ino-progress-bar', 'INO-318'),
  IconField: shipped('ino-icon-field', 'INO-318'),
  InputGroup: shipped('ino-input-group', 'INO-318'),
  Tabs: shipped('ino-tabs', 'INO-318'),
  Stepper: shipped('ino-stepper', 'INO-318'),

  // Phase B1 — Form & input (12).
  AutoComplete: build('B1', 'ino-autocomplete'),
  'InputNumber*': build('B1', 'ino-inputnumber', 'promotes the `<ino-input type=number>` partial to a dedicated component'),
  InputMask: build('B1', 'ino-inputmask'),
  'InputPassword*': build('B1', 'ino-password', 'promotes the `<ino-input type=password>` partial to a dedicated component'),
  Slider: build('B1', 'ino-slider'),
  SelectButton: build('B1', 'ino-select-button'),
  ToggleButton: build('B1', 'ino-toggle-button'),
  Listbox: build('B1', 'ino-listbox'),
  TreeSelect: build('B1', 'ino-treeselect'),
  InputTags: build('B1', 'ino-inputtags'),
  KeyFilter: build('B1', 'ino-keyfilter'),
  CascadeSelect: build('B1', 'ino-cascade-select'),

  // Phase B2 — Menus, panels, structure (12).
  Menu: build('B2', 'ino-menu', 'absorbs PrimeNG TieredMenu as its nested-submenu variant'),
  ContextMenu: build('B2', 'ino-context-menu'),
  Breadcrumb: build('B2', 'ino-breadcrumb'),
  PanelMenu: build('B2', 'ino-panel-menu'),
  CommandMenu: build('B2', 'ino-command-menu'),
  Accordion: build('B2', 'ino-accordion'),
  Panel: build('B2', 'ino-panel'),
  Fieldset: build('B2', 'ino-fieldset'),
  Divider: build('B2', 'ino-divider'),
  Toolbar: build('B2', 'ino-toolbar'),
  Splitter: build('B2', 'ino-splitter'),
  DynamicDialog: build('B2', 'ino-dynamic-dialog'),

  // Phase B3 — Data display (5 rows; orderlist + picklist share one spec row).
  Tree: build('B3', 'ino-tree'),
  TreeTable: build('B3', 'ino-treetable'),
  DataView: build('B3', 'ino-dataview'),
  OrderList: build('B3', 'ino-orderlist'),
  PickList: build('B3', 'ino-picklist'),

  // Phase B4 — Misc primitives (5).
  Avatar: build('B4', 'ino-avatar'),
  Badge: build('B4', 'ino-badge'),
  Chip: build('B4', 'ino-chip'),
  ScrollTop: build('B4', 'ino-scrolltop'),
  AutoFocus: build('B4', 'ino-autofocus'),

  // Phase B5 — reinstated full-catalog rows (17), rev-2 amendment.
  Knob: build('B5', 'ino-knob'),
  Rating: build('B5', 'ino-rating'),
  ColorPicker: build('B5', 'ino-colorpicker'),
  Editor: build('B5', 'ino-editor'),
  OrgChart: build('B5', 'ino-orgchart'),
  Terminal: build('B5', 'ino-terminal'),
  Dock: build('B5', 'ino-dock'),
  Carousel: build('B5', 'ino-carousel'),
  Galleria: build('B5', 'ino-galleria'),
  Image: build('B5', 'ino-image'),
  ImageCompare: build('B5', 'ino-imagecompare'),
  'DragDrop (directive)': build('B5', 'ino-dragdrop'),
  SpeedDial: build('B5', 'ino-speeddial'),
  MegaMenu: build('B5', 'ino-megamenu'),
  Inplace: build('B5', 'ino-inplace'),
  InputColor: build('B5', 'ino-inputcolor'),
  AnimateOnScroll: build('B5', 'ino-animateonscroll'),

  // Phase B5 addendum — the one baseline row the rev-2 amendment left unplaced (INO-503). It is
  // neither in doc 26 §5's B5 table nor in its covered-by ledger. Recorded as a build rather than
  // a 12th alias row, because declining a row is a board call and the standing directive is the
  // full catalog; a composition of `button[ino-button]` + `ino-menu` is a plausible alternative
  // disposition, so this row is flagged for board acknowledgement on INO-503.
  SplitButton: build('B5', 'ino-split-button', 'addendum row added by INO-503 — awaiting board acknowledgement; see doc 26 §5 rev 2.1 note'),

  // Covered-by ledger — alias rows, capability already shipped (doc 26 §5 rev 2).
  Sidebar: covered('`ino-drawer`', 'the same component under our name, with 4 edge positions and modal/non-modal forms'),
  ScrollArea: covered('native scroll + scrollbar tokens', 'no wrapper component: overflow is CSS, the scrollbar is themed by token'),
  ScrollPanel: covered('native scroll + scrollbar tokens', 'no wrapper component: overflow is CSS, the scrollbar is themed by token'),
  BlockUI: covered('loading states + `ino-skeleton`', 'per-component loading state and the skeleton primitive replace a blocking overlay'),
  Fluid: covered('density tokens', 'dense/fluid density ships on every component, not as a wrapper'),
  Bind: covered('built-in Angular syntax (`[class]`/`[style]`)', 'framework idiom, not a design-system component'),
  ClassNames: covered('built-in Angular syntax (`[class]`/`[style]`)', 'framework idiom, not a design-system component'),
  StyleClass: covered('built-in Angular syntax (`[class]`/`[style]`)', 'framework idiom, not a design-system component'),
  'Ripple (directive)': covered('pressed-state tokens + Angular animations', 'our pressed state is token-driven; no ripple directive to ship'),
  Gallery: covered('`ino-galleria` (Phase B5)', 'duplicate baseline row for the same capability as Galleria'),
  Compare: covered('`ino-imagecompare` (Phase B5)', 'duplicate baseline row for the same capability as ImageCompare'),
  TieredMenu: covered('`ino-menu` (Phase B2 — nested submenus)', 'absorbed as a variant of ino-menu per its doc 26 §5 B2 row'),
};

/** The one-line ledger entry rendered by the portal — every row closes with one of these three. */
function describe(rev2) {
  switch (rev2.kind) {
    case 'Shipped':
      return `Shipped — built as \`${rev2.target}\` under ${rev2.issue}; the doc-17 Tier-1 commitment is closed (doc 24 F-1).`;
    case 'Committed':
      return (
        `Committed — Phase ${rev2.phase} build as \`${rev2.target}\`, spec row written in doc 26 §5` +
        `${rev2.note ? ` (${rev2.note})` : ''}.`
      );
    case 'Covered':
      return `Covered by ${rev2.by} — ${rev2.why}; nothing separate to build.`;
    default:
      throw new Error(`unknown rev-2 disposition kind: ${rev2.kind}`);
  }
}

const items = [];
for (const row of ROWS) {
  for (const component of row.components) {
    const rev2 = REV2[component];
    // Closure assertion #1: no Matrix B row may be left without a rev-2 disposition. This is what
    // "the ledger closes at 100%" means — if it throws, a baseline row is unaccounted for.
    if (!rev2) throw new Error(`no rev-2 disposition for Matrix B row "${component}" — the ledger would not close`);
    items.push({
      component,
      group: row.group,
      disposition: rev2.kind,
      phase: rev2.phase ?? null,
      target: rev2.target ?? null,
      coveredBy: rev2.kind === 'Covered' ? rev2.by : null,
      status: describe(rev2),
      sourceNote: row.disposition,
    });
  }
}

// Closure assertion #2: REV2 may not name a component Matrix B does not list (a typo'd key would
// otherwise pass #1 silently on the row it was meant for).
const matrixBNames = new Set(ROWS.flatMap((r) => r.components));
const orphans = Object.keys(REV2).filter((name) => !matrixBNames.has(name));
if (orphans.length) throw new Error(`REV2 names rows absent from Matrix B: ${orphans.join(', ')}`);

const byDisposition = items.reduce((acc, item) => {
  acc[item.disposition] = (acc[item.disposition] ?? 0) + 1;
  return acc;
}, {});

const output = {
  generatedFrom: SOURCE,
  amendedBy: AMENDMENT,
  rev: 2,
  note:
    'Every PrimeNG 22.1.1 baseline row with no dedicated INOVIXUX build carries a settled ' +
    'disposition here (finding F-2, closed): Shipped (built since the audit snapshot), Committed ' +
    '(a doc 26 §5 build phase, spec row written), or Covered (an alias row — PrimeNG\'s name for ' +
    'capability we already ship, closed with a one-line "covered by X"). The rev-1 Tier-2 "open, ' +
    'unassigned" and Tier-3 "declined" buckets are retired by the rev-2 amendment and are empty; ' +
    'each row keeps its pre-amendment audit label in `sourceNote` for provenance.',
  summary: {
    baselineRows: 102,
    implemented: 33,
    servicesNotComponents: 2,
    notImplemented: 67,
    ledgerRows: items.length,
    ledgerRowNote:
      `${items.length} ledger rows vs 67 not-implemented baseline rows: the two \`ino-input\` ` +
      'partials and the directive/duplicate overlaps are listed once per Matrix B name (doc 24 §2 ' +
      'count check).',
    byDisposition,
    openUnassigned: 0,
    closedPercent: 100,
  },
  items,
};

writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');
console.log(
  `wrote web/public/design-system/component-disposition.json (${items.length} items; ` +
    `${Object.entries(byDisposition).map(([k, v]) => `${k} ${v}`).join(', ')}; 0 open)`,
);
