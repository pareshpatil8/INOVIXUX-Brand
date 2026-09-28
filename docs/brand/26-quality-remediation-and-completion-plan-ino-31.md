# 26 — Quality remediation, pending-component completion, and portal v2 plan (INO-31, board rejection 2026-09-28)

> **What this answers** (board rejection of confirmation `5603db9e`, 2026-09-28): components are
> not presentable (radio, checkbox, calendar popup mispositioned, calendar missing date+time /
> typed-entry variants), accessibility contracts render unformatted, and nothing is QA-validated
> before publishing. The board asked for: (1) a detailed plan for **all pending components**
> covering Variants/Structure, States, Sizing, Labels, a11y, Notes — for all three themes
> including mobile; (2) a plan for the hosting/documentation portal **using PrimeNG docs as the
> base** with our customization; (3) brainstorming-skill discipline before execution; (4) plan
> approval **before** any todo is created or assigned.
>
> Builds on doc 25 (status matrix, 2026-09-26). Source of truth for current state:
> `docs/brand/design-system.manifest.json` (43 components), doc 24 (PrimeNG 22.1.1 audit,
> 102 rows), `web/public/design-system/component-disposition.json`.

---

## 0. Brainstorm write-back (understanding before design)

Per the superpowers brainstorming skill: this is an **architectural** engagement — it
restructures the component pipeline (spec → build → QA gate → publish) and adds ~30 new
components plus a portal rework, not a one-file fix. The skill's HARD-GATE and the board's own
instruction coincide: **nothing below is executed until this plan is approved.**

**What the board said (verbatim intent):**
1. Several shipped components are below the publishable bar — named: radio buttons, checkbox
   ("limited implementation"), calendar (popup opens in the wrong place on the docs page; no
   date+time picker; no enterable/typed date; missing variations).
2. Accessibility contracts and notes appear as an unformatted dump — "must be demonstrated
   correctly."
3. "Plenty of stuff missed… everything has to be validated by the QA before publishing, it seems
   no one is the validator here." → a QA gate is a requirement, not a nicety.
4. Deliver a detailed plan for **all pending components** across the six spec dimensions
   (Variants/Structure, States, Sizing, Labels, a11y, Notes), all three themes, including mobile.
5. Plan the hosting page for components + their implementation docs, "refer the PrimeNG as it is
   the base, for the documentation and add our customisation on it."
6. Approval flow: brainstorm → plan with todo → board approves → create todos → assign resources.

**What I am assuming (correct me on approval/rejection):**
- "All pending components" = the 49 PrimeNG rows that are neither implemented (33+5) nor formally
  declined (Tier-3, 15/16 rows) — see §5 for the itemized split — **plus** remediation variants
  on shipped components (e.g. datepicker time/typed-entry). If "pending" also means re-opening
  any Tier-3 declines, say which.
- "Including the mobile" = React Native + Flutter ports for components that are form/input/
  feedback primitives (matching the existing 26-port precedent), not for desktop-idiom components
  (TreeTable, Toolbar, ContextMenu) — each row in §5 carries an explicit mobile disposition.
- "PrimeNG as the base for documentation" = adopt PrimeNG's **documentation page anatomy and
  information architecture** (per-component: import → basic demo → one demo per variant with
  code → Accessibility section → full API tables → theming tokens) rendered in our own Angular
  portal with our brand — not embedding or forking primeng.org's site code.
- QA validator = a dedicated QA agent role with blocking authority (no publish without its
  sign-off recorded on the child issue). If you prefer a human QA, the gate design (§7) is the
  same; only the assignee changes.

---

## 1. Verified root causes for the board's findings

These were audited in the workspace this heartbeat; each is a real defect with a located cause.

| # | Board finding | Root cause (verified) | Fix shape |
|---|---|---|---|
| D1 | Calendar popup opens "somewhere different on the page" | `.ino-datepicker__overlay` is `position:absolute` (`ino-datepicker.component.scss:179-183`) but **no ancestor inside the component is positioned** — `:host` sets only `display:inline-block`, and the only `position:relative` is on `.ino-field__control-wrap`, a *sibling* of the overlay. The popup therefore anchors to the nearest positioned ancestor outside the component — on the docs page, the demo container. | Make `:host` (or the field wrapper that contains the overlay) the positioned ancestor; add an opt-in `appendTo="body"` portal + flip logic for clipped contexts (tables, dialogs). Regression-test inside `docs-live-box`, a modal, and a table cell. |
| D2 | No date+time picker / no enterable date | `ino-datepicker` supports single/range/multiple + 12/24h *display*, but has no time-selection panel and no free-text input parsing. | New variants on the existing component: `showTime` (hour/minute/second, 12/24h), `timeOnly`, typed entry with locale-aware parse + mask, `min/max` on the time axis. Ports to RN/Flutter datepickers. |
| D3 | Radio buttons "not presentable" | Component + APG semantics exist (`web/src/app/components/radio-group/`), but the docs page shows a thin sample set; sizing/label-position/disabled-in-group/invalid/RTL demos are not demonstrated, so the page reads as unfinished. | Presentability pass per §2 contract: full demo matrix on the docs page, one live demo per variant × state, in all 3 themes. |
| D4 | Checkbox "limited implementation" | `ino-checkbox` has indeterminate/readonly/disabled, but docs demos are thin; group validation, label wrapping, error/invalid state, and dense-mode table usage are not shown. | Same presentability pass; add any genuinely missing states found during the pass (invalid + form-error wiring). |
| D5 | A11y contracts/notes render unformatted | `scripts/generate-component-docs-extract.mjs` extracts the raw markdown of "Accessibility contract" / "Deliberate omissions" into JSON; `docs-component-detail.component.html` renders it inside `<pre class="docs-markdown">{{…}}</pre>`. There is **no markdown→HTML step** anywhere in the portal. | Render markdown properly (see §6): parse at generation time into sanitized HTML (build-time, no runtime dep), style tables/lists/inline code with portal styles. |
| D6 | "No one is the validator before publishing" | True. `check-theme-parity` / `check-ds-adherence` are token/lint gates; nothing validates rendered behavior, interaction correctness, or docs completeness. Deploys go out on merge. | QA gate (§7): publish checklist + QA sign-off required on every component child issue; CI additions (interaction smoke tests, visual snapshots); Pages deploy keyed to QA-approved tags, not every merge. |

---

## 2. The Component Publish Contract — definition of "presentable"

Every component (existing or new) is publishable only when **all** of the following hold. This
is the checklist QA signs against; it maps one-to-one to the board's six dimensions.

1. **Variants/Structure** — every variant in the component's SPEC.md has a live docs demo with
   copyable code; structure documented (anatomy diagram or slot/part list).
2. **States** — default, hover, focus-visible, active, disabled, readonly, invalid/error,
   loading (where applicable), empty (where applicable) — each demonstrated, in all 3 themes.
3. **Sizing** — sm/md/lg (or the component's documented scale) + dense/fluid density behavior
   demonstrated.
4. **Labels** — label, required marker, help text, error text, float/ifta label integration
   where applicable; truncation/wrapping behavior shown; RTL spot-check.
5. **a11y** — formatted accessibility contract on the docs page (roles, keyboard map, focus
   behavior, SR announcements), WCAG 2.2 AA contrast in all 3 themes (already gated by
   `check-theme-parity`), keyboard-only walkthrough recorded in the QA sign-off.
6. **Notes** — deliberate omissions, PrimeNG mapping row, mobile disposition, and any
   platform caveats — rendered formatted (post-D5 fix).
7. **Mobile** — if the row's disposition is "port": RN + Flutter implementations with the
   same variant/state coverage, listed in the mobile preview.
8. **QA sign-off** — a QA validation comment (checklist + evidence) on the component's issue,
   authored by the QA owner, before the component's docs page ships to Pages.

---

## 3. Approaches considered (brainstorming step 4)

**A. Remediate-first, then complete (recommended).** Fix the six defect classes and bring all
43 shipped components up to the §2 contract *before* building new ones; then build the Tier-2
list in phases. — Pros: the board's trust problem is quality, not coverage; every new component
built after the QA gate exists is born compliant; portal fixes (D5, D1) benefit all pages at
once. Cons: new-component delivery starts ~2 weeks later.

**B. Parallel tracks from day one.** One track remediates, another builds new components
simultaneously. — Pros: fastest calendar time. Cons: new components would be built while the
publish contract and QA gate are still being stood up, i.e. re-work risk — the exact failure
mode the board just called out.

**C. Adopt PrimeNG wholesale (theme it, stop building).** The 2026-09-14 board answer
("PrimeNG as dependency, pass-through, all 101") was never executed; doing it now would moot
most of the Tier-2 backlog. — Pros: coverage jumps to 102 rows quickly. Cons: abandons 43
shipped first-party components and their mobile ports; the board's 2026-09-25→28 direction
("our customisation on PrimeNG *docs*", detailed plans for pending components) reads as
ratifying the build-our-own path with PrimeNG as *reference*, not as runtime. **If the board
actually wants C, reject this plan and say so — it's a different program.**

**Recommendation: A**, with one pragmatic overlap: portal v2 (§6) and the QA gate (§7) start
immediately alongside remediation, since they are prerequisites for everything else.

---

## 4. Workstream A — Remediation of shipped components (P0)

**A1. Datepicker positioning fix (D1)** — positioned-ancestor fix + `appendTo` portal + flip
logic; regression demos in constrained containers. *2 agent-days.*

**A2. Datepicker variants (D2)** — `showTime` / `timeOnly` / seconds / 12-24h selection, typed
entry with locale parse + input mask, time-axis min/max; RN + Flutter parity. *4 agent-days
(web 2, mobile 2).*

**A3. Radio + checkbox presentability pass (D3, D4)** — full §2 demo matrix, group validation
and invalid states, dense-table usage demos; any missing states implemented. *2 agent-days.*

**A4. Full-catalog presentability sweep** — audit all 43 components against §2 (a fast rubric
pass per component: demo coverage, state coverage, sizing, labels), file one remediation child
issue per component that fails, fix. Expected heavy hitters: the 5 marketing components with no
docs at all (feature-grid, footer, hero, metric-panel, tier-card), multiselect, table dense
mode, file-upload. *Audit 1 day; fixes est. 8-10 agent-days across the catalog.*

---

## 5. Workstream B — All pending components, itemized

Doc 24's 102-row baseline minus 38 implemented (33 audit rows + 5 INO-318) minus 15 declined
Tier-3 leaves **49 open rows**. The Tier-2/Tier-3 split for these was promised (doc 17) but
never assigned — that gap is itself one of the board's "plenty of stuff missed." Proposed
split, itemized: **33 build (Tier-2)**, **16 decline (Tier-3 additions)**.

Column key — **V** Variants/Structure · **St** States (beyond the §2 standard set, which all
rows get) · **Sz** Sizing · **L** Labels · **A11y** pattern/keyboard contract · **N** Notes /
mobile disposition. All rows: 3 web themes (dark/light/high-contrast) × dense/fluid, WCAG 2.2 AA.

### Phase B1 — Form & input (12 components; KYB underwriting forms depend on these)

| Component | V — Variants/Structure | St — States | Sz | L — Labels | A11y | N — Notes / mobile |
|---|---|---|---|---|---|---|
| ino-autocomplete | single/multiple; dropdown vs inline suggest; async datasource; item templates; force-selection vs free text | open/closed, loading, no-results, max-selected | sm/md/lg | float/ifta/plain, help+error | APG combobox: `aria-expanded/activedescendant`, type-ahead, Esc/Arrow keys | Port RN+Flutter (native sheets on mobile) |
| ino-inputnumber | spinner buttons on/off; currency/percent/decimal modes; prefix/suffix; locale digit grouping (incl. Indic) | invalid, readonly, at-min/at-max | sm/md/lg | full label set | `role=spinbutton`, `aria-valuemin/max/now`, Up/Down/PageUp | Promote from `<ino-input type=number>` partial; port both |
| ino-inputmask | pattern masks (PAN, GSTIN, IFSC, phone, date); optional sections; placeholder char | invalid, incomplete | sm/md/lg | full label set | mask announced via description; caret management rules | India-stack mask presets shipped as tokens; port both |
| ino-password | strength meter on/off; reveal toggle; policy hint panel | invalid, caps-lock warning | sm/md/lg | full label set | reveal toggle labeled; meter as `aria-live` polite | Promote from partial; port both |
| ino-slider | single/range; step marks; vertical; value tooltip | dragging, at-bounds | track sm/md | value label, min/max labels | `role=slider` per thumb, Arrow/Home/End | Port both (RN pan-responder / Flutter slider theming) |
| ino-select-button | single/multiple segmented control; icon-only; equal-width | pressed, disabled-option | sm/md/lg | group label | radiogroup (single) / group of toggles (multi) semantics | Port both |
| ino-toggle-button | single on/off button with two faces | pressed | sm/md/lg | own label | `aria-pressed` | Port both |
| ino-listbox | single/multiple; filter box; grouped options; virtualized long lists (reuse virtual-scroller) | selected, filtered-empty | fixed-height scales | list label + filter label | APG listbox: roving selection, type-ahead | Web-first; mobile = full-screen sheet reuse of multiselect |
| ino-treeselect | single/multiple/checkbox selection; lazy children; filter | partial-checked, loading branch | sm/md/lg | full label set | combobox opening a `role=tree`; Arrow-key tree nav | Depends on ino-tree (B3); web-first, mobile sheet variant |
| ino-inputtags (Chips) | free-entry tags; suggestions (reuses autocomplete); max tags; validation per tag | tag-invalid, at-max | sm/md/lg | full label set | listbox of removable options; Backspace removal announced | Port both |
| ino-keyfilter | directive: int/num/alpha/alphanum/regex presets | n/a (directive) | n/a | n/a | must not block IME/AT input; document screen-reader behavior | Web directive + RN/Flutter formatter equivalents |
| ino-cascade-select | nested option drill-down; breadcrumb of chosen path | open-level, loading | sm/md/lg | full label set | combobox + nested listbox levels, Arrow navigation | Web-first; mobile = stacked sheet pages |

### Phase B2 — Menus, panels, structure (12 components; portal + product shell depend on these)

| Component | V | St | Sz | L | A11y | N |
|---|---|---|---|---|---|---|
| ino-menu | vertical menu; popup (from button); sections + icons; nested submenus (absorbs PrimeNG TieredMenu) | open, active-item | compact/comfortable | menu label | APG menu/menubutton: full Arrow/Esc/typeahead map | Web-only (mobile uses action sheets) |
| ino-context-menu | right-click/long-press target binding; nested | open | compact | n/a | menu pattern + focus return contract | Web-only |
| ino-breadcrumb | with icons; collapsed middle (…) overflow; router integration | current-page | one size | `aria-label="breadcrumb"` | `nav` + `aria-current="page"` | Port both (header nav) |
| ino-panel-menu | accordion-of-menus hybrid | expanded per node | compact/comfortable | section labels | tree or disclosure semantics — decide in SPEC vs APG | Web-only |
| ino-command-menu (CommandMenu) | ⌘K palette: search, grouped results, recent, keyboard-first | open, empty-results | fixed | search label | combobox+listbox in dialog; focus trap reuse | Web-only; flagship portal feature (§6) |
| ino-accordion | single/multiple expand; icon position; nested | expanded, disabled-panel | compact/comfortable | header = button | APG accordion: heading+button, Arrow keys | Port both |
| ino-panel | plain titled container; collapsible; footer slot | collapsed | padding scales | header | landmark/region with label | Port both (simple) |
| ino-fieldset | legend + optional toggle | collapsed | padding scales | legend | native `fieldset/legend` | Port both (simple) |
| ino-divider | horizontal/vertical; with centered label | n/a | thickness tokens | optional label | `role=separator` | Port both (trivial) |
| ino-toolbar | start/center/end slots; overflow behavior | n/a | dense/comfortable | `aria-label` | `role=toolbar`, Arrow-key roving focus | Web-only |
| ino-splitter | horizontal/vertical; nested; min sizes; collapse handles | dragging | gutter tokens | n/a | `role=separator` + `aria-valuenow`, keyboard resize | Web-only (dashboards) |
| ino-dynamic-dialog | service-opened dialog reusing ino-modal; config API, result promise | (inherits modal) | inherits | inherits | inherits modal contract; document focus-return for service flow | Web-only; API layer, minimal UI |

### Phase B3 — Data display (4 components; KYB risk-report views)

| Component | V | St | Sz | L | A11y | N |
|---|---|---|---|---|---|---|
| ino-tree | basic/checkbox selection; lazy load; filter; drag-reorder OUT of scope | expanded, partial-checked, loading | compact/comfortable | tree label | APG tree view: full Arrow map, `aria-level/expanded` | Web-first; mobile = nested list pattern |
| ino-treetable | tree + table columns; sortable; frozen first column | expanded, sorted, loading | dense/fluid row heights | caption + column headers | `role=treegrid` — the hardest a11y row in the program; spec first | Web-only |
| ino-dataview | list/grid layout switch; paginator integration; item templates | loading, empty | grid gap scales | list label | `role=list/listitem`; layout toggle announced | Port both (list mode) |
| ino-orderlist + ino-picklist | reorder list; dual-list transfer; buttons + keyboard | selected, moved-flash | compact/comfortable | list labels ×2 | listbox multi-select + documented button alternatives to drag | Web-only; **build only if a product screen needs it — else decline; default: build last** |

### Phase B4 — Misc primitives (5 components)

| Component | V | St | Sz | L | A11y | N |
|---|---|---|---|---|---|---|
| ino-avatar (+group) | image/initials/icon; shapes; group overlap + surplus count | image-error fallback | xs–xl | `alt`/`aria-label` | decorative vs informative rules documented | Port both |
| ino-badge | dot/count/status; positioned-on-child or standalone; max+ overflow (99+) | n/a | sm/md | `aria-label` for count | live-region guidance for dynamic counts | Port both |
| ino-chip | label+icon+avatar; removable; interactive vs static | focus, removing | sm/md/lg | own label | removable = button-in-group contract (shares inputtags spec) | Port both |
| ino-scrolltop | window/parent target; threshold; smooth scroll | visible/hidden | one size | `aria-label` | focus handling on activate; `prefers-reduced-motion` | Web-only |
| ino-autofocus | directive; initial-focus management | n/a | n/a | n/a | documented interplay with focus-trap + route change | Web + both mobile equivalents |

### Tier-3 additions — decline in writing (16 rows, rationale recorded in disposition JSON)

SpeedDial, MegaMenu, Sidebar (alias → ino-drawer), ScrollArea + ScrollPanel (native scroll +
existing scrollbar tokens), Inplace, BlockUI (covered by loading states + skeleton), Fluid
(covered by density tokens), AnimateOnScroll, Bind, ClassNames, StyleClass, AutoFocus-adjacent
utilities Ripple-style (Angular idioms — `[class]`/`[style]`/animations cover them), InputColor
(no product use; risk-flag colors are tokens, never user-picked), DataTable-adjacent Compare
duplicates, plus the 15 already-declined rows reaffirmed. **Any row here re-opens by board
comment — it moves into B4 with a spec, nothing else changes.**

---

## 6. Workstream C — Portal v2: PrimeNG-docs anatomy, our customization

Base = **PrimeNG documentation IA** (primeng.org component pages), which the dev team already
knows, implemented in our existing Angular portal (no framework change, no fork of their site).

**Per-component page (the PrimeNG anatomy, adopted):**
1. Header: name, PrimeNG-mapping badge, import statement (copy button).
2. One section per variant/feature — live demo + collapsible code tab (HTML/TS), theme-aware.
3. **Accessibility** section — formatted (D5 fix): keyboard table, roles list, SR notes.
4. **API** section — Props / Events / Methods / Templates(Slots) tables, generated from source
   (extend `generate-component-docs-extract.mjs` to parse `@Input/@Output` JSDoc, not hand-written).
5. **Theming** section — the component's design tokens with live values per theme.
6. Notes / deliberate omissions / mobile disposition — formatted.

**Our customization (beyond PrimeNG's docs):**
- Theme × density switcher on every demo (3 themes × dense/fluid) — already partially built.
- Mobile tab per component showing the RN + Flutter port (code + screenshot) where ported.
- QA status badge per page (§7): `QA-approved <date>` or `pending` — publish gate made visible.
- ino-command-menu (⌘K) as the portal's search once B2 lands; simple text filter until then.

**Engineering fixes in this workstream:**
- **C1 (D5):** markdown rendered at extract-generation time (`marked` + sanitizer in the build
  script → HTML in the JSON blob; zero runtime dependency), portal styles for tables/lists/code.
  *1-2 agent-days.*
- **C2:** demo containers get overlay-safe styling (positioned wrappers) so D1-class bugs are
  visible in dev rather than on Pages; add a "constrained container" demo harness. *1 day.*
- **C3:** API-table generation from component source. *2-3 days.*
- **C4:** page-anatomy migration of all 43 existing pages to the new template. *3-4 days.*
- **C5:** the 5 marketing components get docs pages (currently none). *1-2 days.*

---

## 7. Workstream D — QA validation gate ("someone is the validator")

- **D-gate 1: role.** A dedicated **QA Validator agent** is hired (CEO `canCreateAgents`) with
  the §2 checklist as its operating contract. Every component child issue gets a QA subtask;
  the component's docs page may not ship while its QA subtask is open. QA sign-off is authored
  by the QA agent only (sign-off authorship rule INO-295 applies fleet-wide).
- **D-gate 2: process.** Child-issue template: Spec → Build → Docs page → **QA validation**
  (checklist + keyboard walkthrough + 3-theme screenshots attached as evidence) → publish.
  Board review happens on the published page, not on promises.
- **D-gate 3: CI.** Add to the existing gate set: (a) interaction smoke tests (Playwright
  against the portal: overlay opens anchored to trigger — a direct D1 regression test; focus
  trap; keyboard maps for the APG patterns); (b) per-component × per-theme visual snapshots on
  the docs pages, diffed in CI; (c) docs-completeness lint — a manifest component without the
  §2 sections fails the build. *Standing up: 3-4 agent-days; then it's free.*
- **D-gate 4: deploy.** Pages deploys from tagged QA-approved states of main rather than every
  merge (workflow_dispatch + tag filter), so a half-remediated catalog never publishes again.

---

## 8. Sequencing, estimates, resources

Elapsed estimates assume current fleet capacity (CTO + engineering agents in parallel where
files don't collide) and the observed ~1 merged PR/day board-merge cadence — **board merge
throughput is the binding constraint**, as INO-333 documented.

| Phase | Contents | Effort | Elapsed |
|---|---|---|---|
| P0 (starts on approval) | A1-A3 fixes, C1-C2 portal fixes, D-gate 1-2 stood up, QA agent hired | ~8 agent-days | week 1 |
| P1 | A4 catalog sweep + fixes, C3-C5 portal migration, D-gate 3-4 CI | ~16 agent-days | weeks 2-3 |
| P2 | B1 forms (12 components, spec→build→QA each) | ~20 agent-days | weeks 3-5 |
| P3 | B2 menus/panels (12) | ~14 agent-days | weeks 5-6 |
| P4 | B3 data + B4 misc (9) + Tier-3 decline records | ~12 agent-days | weeks 6-7 |

**Total: ~70 agent-days, ~7 elapsed weeks** to a fully-presentable, QA-gated, 71-component
system (43 remediated + ~28-33 new) with portal v2. Re-planning checkpoints: after P1 (board
reviews remediated catalog before new builds start) and after P2.

**Resources:** CTO owns technical execution and PR review; 2-3 engineering agents on component
tracks (existing fleet); **new QA Validator agent** (the §7 hire — needs board's implicit OK via
this plan's approval); CEO runs the board interface, phase gates, and this plan's governance.

---

## 9. The todo (created as child issues ONLY after approval)

P0: `A1 datepicker positioning fix` · `A2 datepicker time/typed variants (web+mobile)` ·
`A3 radio+checkbox presentability` · `C1 markdown rendering for a11y/notes` · `C2 demo
harness` · `D1-2 QA role + process (hire QA agent)`
P1: `A4 sweep (one issue per failing component, filed from the audit)` · `C3 API tables` ·
`C4 page-anatomy migration` · `C5 marketing-component docs` · `D3 CI gates` · `D4 deploy gate`
P2-P4: one issue per §5 component (`spec → build → docs → QA` checklist embedded), phased as
B1 → B2 → B3/B4, plus `Tier-3 decline record update`.

Each issue carries: the §2 contract as acceptance criteria, its §5 dimension row as the spec
seed, assignee, and a blocking QA subtask.

---

## 10. Decision points for the board (defaults apply on plain approval)

1. **Tier-2/Tier-3 split (§5)** — default: build 33 as listed, decline 16 in writing.
2. **Mobile scope** — default: per-row dispositions in §5 tables.
3. **QA Validator** — default: new dedicated agent with blocking sign-off authority.
4. **Deploy gate** — default: Pages publishes only QA-approved tags (no more publish-on-merge).
5. **Approach** — default: A (remediate-first). Choosing C (PrimeNG runtime adoption) instead
   is a rejection of this plan; say so and I'll draft that program instead.

**Approve** → todos created per §9, resources assigned, P0 starts same heartbeat.
**Reject with notes** → plan revised, re-submitted; nothing executes meanwhile.
