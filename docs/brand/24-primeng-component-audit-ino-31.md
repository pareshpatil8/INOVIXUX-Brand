# 24 — PrimeNG component-wise audit (INO-31, board request 2026-09-26)

> **Question this answers** (board comment `3a183ead`, 2026-09-26): *"PrimeNG has more than 101
> components … I need the component-wise confirmation whether it is implemented or not, and if it
> is implemented, whether all Variants / Structure, States, Sizing, Labels, a11y, Notes are
> developed. Also I was requested for the portal to host these components with component
> information similar to PrimeNG."*
>
> Baseline: PrimeNG **22.1.1** (`specs/primeng/llms-22.1.1.txt`), as rebaselined in doc 16 §3.2.
> That tabulation lists **102 component/directive rows** (the "101" headline undercounted by one)
> plus 2 service APIs (`FilterService`, `Overlay`) that are not components.
> Our state: `docs/brand/design-system.manifest.json` @ commit `6785c87` — **38 shipped
> first-party components**, generated from source, not hand-claimed.

---

## 0. Headline — the honest numbers

| Measure | Count |
|---|---|
| PrimeNG 22.1.1 baseline rows (components + directives) | **102** |
| PrimeNG components **implemented** by a shipped INOVIXUX component | **33** |
| PrimeNG components **partially reachable** through another component (no dedicated build) | 2 (InputNumber, InputPassword via `<ino-input type>`) |
| PrimeNG components **not implemented** | **67** |
| — of which **Tier-1 committed in doc 17 but never built** | **5** (ProgressBar, IconField, InputGroup, Tabs, Stepper) |
| — of which **Tier-3, formally declined** (doc 17 §"Tier 2 and Tier 3") | Knob, Rating, ColorPicker, Editor, OrgChart, Terminal, Dock, media/gallery family (×6), Ripple, DragDrop |
| — remainder (Tier-2 "specify, don't build" / un-itemized) | ~46 — **the per-component Tier-2/Tier-3 itemization was never written down** (finding F-2 below) |
| INOVIXUX components with **no PrimeNG counterpart** (marketing/site) | 5 (`ino-feature-grid`, `ino-footer`, `ino-hero`, `ino-metric-panel`, `ino-tier-card`) |

**Three findings the board should see before the tables:**

- **F-1 — Five Tier-1 commitments were unbuilt; resolved under INO-318.** Doc 17 §4 Wave 2
  committed 27 Tier-1 components (T-1…T-27). 22 shipped; **T-15 ProgressBar, T-16 IconField, T-17
  InputGroup, T-26 Tabs, T-27 Stepper** did not — `ino-input.component.ts`'s own doc comment still
  pointed at IconField/InputGroup as future work, and no tabs/stepper/progress-bar source existed
  anywhere under `web/src`. Prior status roll-ups that read as "Tier 1 done" were wrong on these
  five. **All five now ship** (INO-318): `web/src/app/components/{progress-bar,icon-field,
  input-group,tabs,stepper}/`, each with a `SPEC.md`, a `docs/brand/06-angular-components/*.md`
  a11y contract, a `COMPONENT_REGISTRY` entry in `check-theme-parity.mjs` (web-only for now — no
  mobile port scheduled), and the manifest regenerated (43 components, was 38). `ino-input`'s doc
  comment now names both dependencies as built rather than future work.
- **F-2 — Tier-2 stub specs were never written.** Doc 17 promised each Tier-2 component "a stub
  spec file and a row in the docs site" (~8 d). Zero stub files exist. Consequently there is no
  written per-component Tier-2 vs Tier-3 assignment beyond the named Tier-3 examples — the "~35 /
  ~40" split is an estimate, not a list.
- **F-3 — The portal is registered but not built.** Doc 16 §6 specifies a hosted per-component
  docs site "like primeng.org" as register item **H-6 (High)**. What exists today: the deployed
  GitHub Pages site with four generic `/docs` routes, 33 per-component markdown files, and static
  HTML previews. What does not exist: per-component portal pages with live examples, props/API
  tables, variants/states/sizing/a11y tabs. See §4.

---

## 1. Matrix A — the 33 implemented PrimeNG components, dimension by dimension

Column meanings (the six dimensions the board named):
- **Variants/Structure** — the closed variant union (from the generated manifest) or the
  structural axes the doc specifies. "n/a (by design)" = the component doc records the absence
  under *Deliberate omissions*.
- **States** — interactive states documented in the component doc's *States* section (hover /
  active / focus / disabled / invalid / readonly / loading as applicable). "n/a" = non-interactive
  component; severity/shape is the state axis.
- **Sizing** — ✅ = `size` input on the INO-124 control-size scale (`sm | default | lg`,
  density-relative under `[data-density="dense"]`), verified in the manifest.
- **Labels** — how the component participates in the form-label system (W0-3 token set
  `label-lg/label/label-sm/hint/caption` + `ino-label` / `ino-float-label` / `ino-ifta-label`
  primitives) or its aria-labelling contract.
- **a11y** — every shipped component has an *Accessibility contract* section in its doc, and sits
  under the CI gates: WCAG 2.2 contrast/focus assertions (`check-theme-parity.mjs`), adherence
  lint + axe/pa11y (`check-ds-adherence.mjs`, INO-118). ✅ means both hold; the cell notes the
  pattern implemented.
- **Notes** — doc path under `docs/brand/06-angular-components/` (each doc also records
  *Deliberate omissions* and *Mobile parity*), plus known gaps vs PrimeNG.

### Form (12 of 31 implemented)

| PrimeNG | INOVIXUX | Variants/Structure | States | Sizing | Labels | a11y | Notes |
|---|---|---|---|---|---|---|---|
| Checkbox | `ino-checkbox` + `ino-checkbox-group` | standalone + group; indeterminate | checked/unchecked/indeterminate, readonly, disabled, focus | ✅ | `ino-label` integration | ✅ native input + visible focus ring | `checkbox.md` — doc-16 gaps (indeterminate, group, size) all closed |
| DatePicker | `ino-datepicker` | single/range/multiple `selectionMode`; 12/24 h | open/closed, disabled dates/weekdays, min/max, invalid | ✅ | float/ifta label compatible | ✅ APG dialog+grid keyboard map | `datepicker.md` — locale section incl. Indic digits |
| FloatLabel | `ino-float-label` | `over \| in \| on` (all 3 PrimeNG modes) | floated/resting derivation documented | ✅ | is itself a label primitive | ✅ label association contract | `floatlabel.md` |
| IftaLabel | `ino-ifta-label` | single mode (no float by design — documented) | static | ✅ | label primitive | ✅ | `iftalabel.md` |
| InputOtp | `ino-input-otp` | length-driven cell structure | filled/empty per cell, invalid, disabled | ✅ | aria contract for cells | ✅ paste + SR announcement handling | `input-otp.md` — built for KYB verification flows |
| InputText | `ino-input` | `outline \| filled` | hover/focus/disabled/invalid/readonly | ✅ | full W0-3 integration | ✅ | `input.md` — icon slot & addons deferred to IconField/InputGroup, **both now shipped (F-1, INO-318)** |
| Label | `ino-label` | 5 roles (`label-lg/label/label-sm/hint/caption`) | required/optional/error text states | ✅ | is the label primitive | ✅ `for` association enforced | `label.md`, `form-label-tokens.md` |
| MultiSelect | `ino-multiselect` | chip/comma `display`; grouping; select-all; selection limit | open/closed, option hover/selected/disabled, invalid | ✅ | float/ifta compatible | ✅ APG listbox multi-select pattern | `multiselect.md` |
| RadioButton | `ino-radio` + `ino-radio-group` | standalone + group (doc-16 gap closed) | checked, disabled, focus (roving tabindex) | ✅ | `ino-label` integration | ✅ APG radio-group pattern | `radio-group.md` |
| Select | `ino-select` | custom listbox rewrite (T-9) — no longer native `<select>` | open/closed, option states, invalid, disabled | ✅ | float/ifta compatible | ✅ APG combobox/listbox keyboard map | `select.md` |
| Textarea | `ino-textarea` | `outline \| filled` | hover/focus/disabled/invalid/readonly | ✅ | full W0-3 integration | ✅ | `textarea.md` |
| ToggleSwitch | `ino-toggle` | single structure | on/off, disabled, focus | ✅ | `ino-label` integration | ✅ `role="switch"` | `toggle.md` — doc-16 size gap closed; icon-overlay & error state remain deliberate omissions |

Partial, no dedicated component: **InputNumber** and **InputPassword** are reachable as
`<ino-input type="number|password">` — no spinners/currency/locale, no strength meter/mask toggle.
Both remain honest ⚠ rows, recorded in `input.md` *Deliberate omissions*.

### Button (1 of 3)

| PrimeNG | INOVIXUX | Variants/Structure | States | Sizing | Labels | a11y | Notes |
|---|---|---|---|---|---|---|---|
| Button | `button[ino-button]`, `a[ino-button]` | `primary \| secondary \| ghost \| icon \| danger` | hover/active/focus/disabled/**loading** | ✅ | native content; `icon` variant requires caller `aria-label` (documented MUST) | ✅ attribute-selector on native tag keeps native semantics | `button.md` — doc-16 gaps (danger, size, `:active`) all closed (INO-156) |

### Data (4 of 10)

| PrimeNG | INOVIXUX | Variants/Structure | States | Sizing | Labels | a11y | Notes |
|---|---|---|---|---|---|---|---|
| Table | `ino-table` | sort, filter, row selection (`selectionMode`), row expansion, grouping | row hover/selected/expanded, sort direction, empty | ✅ + dense mode | column headers + caption contract | ✅ grid/table semantics, sort announcements | `table.md` (largest doc, 244+ lines) — the KYB risk-report surface |
| Paginator | `ino-paginator` | page-size options | current/disabled nav states | ✅ | aria page labels | ✅ | `paginator.md` |
| Timeline | `ino-timeline` | vertical/horizontal `layout`, alternate `align`, marker roles | static + interactive roving-tabindex mode | ✅ | `ariaLabel`/`ariaDescribedBy` inputs | ✅ | `timeline.md` — web-only by design (INO-134) |
| VirtualScroller | `ino-virtual-scroller` | fixed + variable item size (`itemSizeFn`), both orientations | loading/lazy, scroll-restoration | ✅ | `itemRole`, `ariaLabel` inputs | ✅ | `virtual-scroller.md` — web-only by design (INO-129) |

### Panel (1 of 11)

| PrimeNG | INOVIXUX | Variants/Structure | States | Sizing | Labels | a11y | Notes |
|---|---|---|---|---|---|---|---|
| Card | `ino-card` | `default \| sunken \| overlay` + header/footer/media slots (U-6) | n/a (non-interactive) | ✅ + `padding` | heading-slot contract | ✅ landmark/heading guidance | `card.md` |

### Overlay (6 of 7)

| PrimeNG | INOVIXUX | Variants/Structure | States | Sizing | Labels | a11y | Notes |
|---|---|---|---|---|---|---|---|
| Dialog | `ino-modal` | maximize, drag, content projection | open/closed/maximized | ✅ (`sm/default/lg`) | `aria-labelledby` wiring | ✅ FocusTrap adopted, APG dialog | `modal.md` (INO-162 / U-7) |
| ConfirmDialog | `ino-confirm-dialog` (web) + `ino-confirm-action-sheet` (3 mobile tracks) | `severity` | pending/confirmed/rejected | ✅ | severity-labelled actions | ✅ | `confirm-dialog.md` — doc-16 "mobile only" gap closed |
| ConfirmPopup | `ino-confirm-popup` | anchored `position` | open/closed | ✅ | | ✅ | `confirm-popup.md` |
| Drawer | `ino-drawer` | 4 edge `position`s, modal & non-modal | open/closed | ✅ | `aria-labelledby` | ✅ | `drawer.md` |
| Popover | `ino-popover` | anchored `position` | open/closed | ✅ | | ✅ | `popover.md` |
| Tooltip | `ino-tooltip` | `position` | visible/hidden; hover **and** focus triggers, always both | ✅ | `aria-describedby` wiring | ✅ | `tooltip.md` |

Not implemented in this group: **DynamicDialog** (service-driven dialog composition).

### Menu (1 of 10)

| PrimeNG | INOVIXUX | Variants/Structure | States | Sizing | Labels | a11y | Notes |
|---|---|---|---|---|---|---|---|
| Menubar | `ino-nav` | links + CTA + submenus | hover/open/active-route | ✅ | | ✅ `role="menubar"`, APG roving-tabindex keyboard map | `ino-nav.md` — doc-16 gaps (submenus, menubar role) closed (U-9) |

### Messages (2 of 2)

| PrimeNG | INOVIXUX | Variants/Structure | States | Sizing | Labels | a11y | Notes |
|---|---|---|---|---|---|---|---|
| Toast | `ino-toast-container` + `ToastService` | `position` input (doc-16 gap closed); severity ×4 | enter/exit, timed dismiss | n/a (by design) | | ✅ `aria-live` contract | `alert.md` |
| Message | `ino-alert` | `inline \| banner \| toast` × `info \| success \| warning \| danger` | static | n/a (by design) | | ✅ role/`aria-live` per severity | `alert.md` — `outlined`/`simple` remain deliberate omissions |

### File (1 of 1)

| PrimeNG | INOVIXUX | Variants/Structure | States | Sizing | Labels | a11y | Notes |
|---|---|---|---|---|---|---|---|
| FileUpload | `ino-file-upload` | `mode`, `captureMode`, controlled `items` | idle/dragover/uploading/error per item | ✅ + density | | ✅ | `file-upload.md` — the KYB document-intake blocker, closed |

### Misc (5 of 21)

| PrimeNG | INOVIXUX | Variants/Structure | States | Sizing | Labels | a11y | Notes |
|---|---|---|---|---|---|---|---|
| Skeleton | `ino-skeleton` | `shape` axis | is itself the loading state | ✅ | | ✅ hidden from AT correctly | `skeleton.md` |
| FocusTrap | `ino-focus-trap` (component + directive forms) | two forms, one implementation | active/paused | n/a | | ✅ — is an a11y primitive | `focus-trap.md` |
| ProgressSpinner | `ino-progress-spinner` | `mode` (determinate/indeterminate) | spinning/complete | ✅ | | ✅ `aria-busy`/status contract | `progress-spinner.md` |
| Tag | `ino-tag` | `severity` tiers (RAG risk flags) | static | ✅ | | ✅ not color-only (INO-113 palette) | `tag.md` |
| MeterGroup | `ino-meter-group` | `orientation`, custom legend template | static | ✅ | | ✅ | `meter-group.md` — composite risk score surface |

### INOVIXUX-specific (no PrimeNG counterpart) — 5

`ino-feature-grid`, `ino-footer`, `ino-hero`, `ino-metric-panel`, `ino-tier-card` — marketing-site
components on the same token/a11y contract; not part of the parity count.

---

## 2. Matrix B — the 67 PrimeNG components NOT implemented, with disposition

Legend: **T1-unbuilt** = committed in doc 17 Wave 2, never built (F-1). **T3-declined** = named in
doc 17's written decline list. **T2/3-open** = neither built nor explicitly assigned (F-2) —
disposition owed by the itemization task in §4.

| Group | Component | Disposition |
|---|---|---|
| Form | IconField | **T1-unbuilt (T-16)** — `ino-input` doc still routes icon slots here |
| Form | InputGroup | **T1-unbuilt (T-17)** — prefix/suffix addon mechanism |
| Panel | Tabs | **T1-unbuilt (T-26)** |
| Panel | Stepper | **T1-unbuilt (T-27)** |
| Misc | ProgressBar | **T1-unbuilt (T-15)** — ProgressSpinner shipped, bar did not |
| Form | Knob, Rating, ColorPicker, Editor | **T3-declined** (in writing, doc 17) |
| Data | OrgChart | **T3-declined** |
| Menu | Dock | **T3-declined** |
| Misc | Terminal, Ripple (directive), DragDrop (directive) | **T3-declined** |
| Media | Carousel, Compare, Gallery, Galleria, Image, ImageCompare | **T3-declined** ("gallery family") |
| Form | AutoComplete, CascadeSelect, InputColor, InputMask, InputNumber*, InputPassword*, InputTags, KeyFilter, Listbox, SelectButton, Slider, ToggleButton, TreeSelect | **T2/3-open** (13; * = partial via `ino-input type`) |
| Button | SpeedDial, SplitButton | **T2/3-open** (2) |
| Data | DataView, OrderList, PickList, Tree, TreeTable | **T2/3-open** (5) |
| Panel | Accordion, Divider, Fieldset, Panel, ScrollArea, ScrollPanel, Splitter, Toolbar | **T2/3-open** (8) |
| Overlay | DynamicDialog | **T2/3-open** (1) |
| Menu | Menu, Breadcrumb, CommandMenu, ContextMenu, MegaMenu, PanelMenu, Sidebar, TieredMenu | **T2/3-open** (8) |
| Misc | Fluid, Avatar, Badge, BlockUI, Chip, Inplace, ScrollTop, AnimateOnScroll, AutoFocus, Bind, ClassNames, StyleClass | **T2/3-open** (12) |

Count check: 5 T1-unbuilt + 16 T3-declined + 49 T2/3-open − 3 double-listed partials/directive
overlaps = 67 not-implemented rows; 67 + 33 implemented + 2 services = the doc-16 §3.2 tabulation.

Services (`FilterService`, `Overlay` API): our equivalents are internal — `ino-table` carries its
own `filterPredicate`/`filters` inputs; overlay positioning is a shared internal service used by
popover/tooltip/confirm-popup. Neither is exposed as a public API; recorded as deliberate.

---

## 3. What "developed" means per dimension — the verification chain

A ✅ above is backed by, in order: (1) the generated manifest (variants, size, inputs — from
source, regenerated on change, commit `6785c87`); (2) the component doc's named section
(*Variants / States / Size API / Accessibility contract / Deliberate omissions / Mobile parity*);
(3) CI: `check-theme-parity.mjs` (3-theme × contrast/focus token assertions, WCAG 2.2),
`check-ds-adherence.mjs` + axe/pa11y (INO-118), all green on `main` since PR #68.
What ✅ does **not** claim: pixel parity with PrimeNG's variant surface. Where PrimeNG has a
variant we deliberately dropped, it is written in that component's *Deliberate omissions* — that
is the "Notes" dimension the board asked about, and it exists for every shipped component.

---

## 4. The portal (PrimeNG-style component showcase) — current state and the gap

**Exists today**
- Deployed GitHub Pages site (`deploy-pages.yml`, on every `main` push): the Angular app with
  `/docs` routes — overview, getting-started, api-reference, design-system. These are *narrative*
  pages, not per-component pages.
- 33 per-component markdown docs + static HTML previews under `docs/brand/06-angular-components/`.
- The machine-readable manifest — the natural data source for generated props tables.

**Missing (the actual ask)**
- One route per component (`/docs/components/<name>`) with: live rendered examples per
  variant/state/size, a props/API table generated from the manifest, the a11y contract, theme
  switcher (dark/light/high-contrast), and the Notes/deliberate-omissions register — i.e. what
  primeng.org gives per component.

This was specified in doc 16 §6 as register item **H-6 (High)** with an estimate but was never
scheduled into a wave. It is now cut as a child issue of INO-31 (created alongside this audit)
covering: the component-route shell + manifest-driven API tables + live examples for the 38
shipped components, plus a stub row per Tier-2 component (closing F-2's itemization debt in the
same surface). The five F-1 components are scoped separately — building them is component work,
not portal work.
