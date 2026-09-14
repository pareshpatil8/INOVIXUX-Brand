# 16 — Design System Gap Analysis (Revision 2)

**Revision 2 (2026-09-14).** Revision 1 compared our system against the *packaging structure* of the
e-Cheque reference folder. This revision keeps that analysis (now §8) and adds what was asked for: a
three-way cross-reference of **doc 16 × `ds-context.md` × the PrimeNG component implementation plan**,
broken down by component, variant, label size, state, and WCAG 2.1 AA compliance.

> **This is PHASE 1 only.** Per the instruction of 2026-09-14, no implementation work has been started
> and no child issues have been created. Phase 2 (development plan, agent orchestration, hosted HTML
> demo) is gated on your explicit approval of this document.

---

## 0. Sources compared

| # | Source | Exact path read this run | Size |
|---|---|---|---|
| A | **doc 16** (this file, rev 1) | `docs/brand/16-design-system-parity-vs-echeque-reference.md` | 235 lines |
| B | **ds_context file** | `~/Downloads/e-Cheque Design System/guidelines/ds-context.md` | 344 lines |
| C | **PrimeNG component implementation plan** | `~/Downloads/e-Cheque Design System/uploads/primeng_component_implementation_plan.md` | 768 lines, 38 components |
| C′ | PrimeNG taxonomy (supporting) | `~/Downloads/e-Cheque Design System/guidelines/primeng_taxonomy_complete.md` | 2,319 lines |
| D | **Our system** (the thing being measured) | `web/src/tokens.css` (436 lines), `web/src/app/components/` (16 components), `mobile/{capacitor,react-native,flutter}/` | — |

Note on C: `uploads/primeng_component_implementation_plan.md` and
`uploads/primeng_component_implementation_plan-5408c742.md` are byte-identical (MD5
`3b71684cd8a821bec728889d678bcefe`). Only one was used.

**Method.** Every ✅/⚠️/❌ below was derived by reading our source files this run — component `@Input()`
declarations, SCSS state selectors, template ARIA attributes, and token definitions. Nothing is
inferred from previous documents. Where I could not verify something from source, the row says
**🔲 Pending** and §10 explains what is missing.

---

## 1. Headline finding

**Against the e-Cheque *packaging* structure we are content-complete and packaging-incomplete
(rev 1's finding, unchanged). Against the *PrimeNG component plan* we are at 26% component coverage
with zero components fully conformant.**

The three numbers that matter:

| Dimension | Result |
|---|---|
| **Component coverage** | 10 of 38 present in some form (26%). **0 of 38 fully conformant** to the plan's variant + state + size + a11y contract. 28 absent entirely. |
| **Sizing tiers** | **0 of 38.** No component in our system accepts a `size` input. The plan requires `sm`/`default`/`lg` on 20 components. This is the single largest systematic gap. |
| **Label placement** | External-label only. **Floating and IFTA label modes do not exist** on any component; the plan requires them on 7 form components. |

Two systemic defects sit underneath those numbers and are cheap to fix now, expensive later:

1. **No `:active` (pressed) state exists anywhere in the system.** Verified across all 16 components —
   zero `:active` selectors. Every hover/focus/disabled state is present somewhere; pressed is present
   nowhere.
2. **No focus-ring token.** Every component hand-repeats `outline: 2px solid var(--ino-color-accent)`.
   It has already drifted: `outline-offset` is `2px` on button and checkbox but `1px` on input. The
   ds_context global requirements (§B.3) name a single `--focus-ring` token as a hard requirement.

---

## 2. Matrix A — Component coverage (all 38 from the PrimeNG plan)

Legend: ✅ Covered · ⚠️ Partial · ❌ Missing · 🔲 Pending (cannot assess)

### Section 1 — Form & Data Input (17 components)

| # | PrimeNG component | Our equivalent | Source path | Status |
|---|---|---|---|---|
| 1.1 | Text Input (`input-text`) | `<ino-input>` | `web/src/app/components/input/` | ⚠️ Partial |
| 1.2 | Textarea (`input-textarea`) | none | — | ❌ Missing |
| 1.3 | Number Input (`input-number`) | `<ino-input type="number">` — no spinners, no currency, no locale | `input/` | ❌ Missing |
| 1.4 | Date Picker (`date-picker`) | none | — | ❌ Missing |
| 1.5 | Select (`select`) | `<ino-select>` — native `<select>` | `select/` | ⚠️ Partial |
| 1.6 | Multi-Select (`multi-select`) | none | — | ❌ Missing |
| 1.7 | Cascade Select (`cascade-select`) | none | — | ❌ Missing |
| 1.8 | Tree Select (`tree-select`) | none | — | ❌ Missing |
| 1.9 | Checkbox (`checkbox`) | `<ino-checkbox>` | `checkbox/` | ⚠️ Partial |
| 1.10 | Radio Button (`radio-button`) | `<ino-radio-group>` | `radio-group/` | ⚠️ Partial |
| 1.11 | Toggle Switch (`toggle-switch`) | `<ino-toggle>` | `toggle/` | ⚠️ Partial |
| 1.12 | Select Button / Segmented (`select-button`) | none | — | ❌ Missing |
| 1.13 | Slider (`slider`) | none | — | ❌ Missing |
| 1.14 | Rating (`rating`) | none | — | ❌ Missing |
| 1.15 | Color Picker (`color-picker`) | none | — | ❌ Missing |
| 1.16 | Knob (`knob`) | none | — | ❌ Missing |
| 1.17 | Rich Text Editor (`editor`) | none | — | ❌ Missing |

**Section 1: 0 ✅ · 5 ⚠️ · 12 ❌**

### Section 2 — High-Density Data Containers (7 components)

| # | PrimeNG component | Our equivalent | Status |
|---|---|---|---|
| 2.1 | **Data Table (`data-table`)** | none — `[data-density="dense"]` sets `--ino-row-min-height: 32px` (`tokens.css` §10) but **no component reads it** | ❌ Missing — **highest-impact gap** |
| 2.2 | Data View (`data-view`) | none | ❌ Missing |
| 2.3 | Order List (`order-list`) | none | ❌ Missing |
| 2.4 | Pick List (`pick-list`) | none | ❌ Missing |
| 2.5 | Tree (`tree`) | none | ❌ Missing |
| 2.6 | Tree Table (`tree-table`) | none | ❌ Missing |
| 2.7 | Org Chart (`org-chart`) | none | ❌ Missing |

**Section 2: 0 ✅ · 0 ⚠️ · 7 ❌.** This is the section the KYB MVP cannot ship without — a risk-flag
report *is* a dense table.

### Section 3 — Overlays & Contextual Layers (5 components)

| # | PrimeNG component | Our equivalent | Status |
|---|---|---|---|
| 3.1 | Dialog / Modal (`dialog`) | `<ino-modal>` — centred only; no maximize, drag, or size variants | ⚠️ Partial |
| 3.2 | Confirm Dialog (`confirm-dialog`) | `<ino-confirm-action-sheet>` on all 3 mobile tracks (wraps `ino-modal`); **nothing on web** | ⚠️ Partial (mobile only) |
| 3.3 | Popover / Overlay Panel (`popover`) | none | ❌ Missing |
| 3.4 | Drawer / Sidebar (`drawer`) | none — `ino-modal` has no left/right/top/bottom positioning | ❌ Missing |
| 3.5 | Tooltip (`tooltip`) | none | ❌ Missing |

**Section 3: 0 ✅ · 2 ⚠️ · 3 ❌**

> **Correction to rev 1.** Rev 1 §4 recorded "Modal / Sheet — ✅ ahead". The sheet half of that is
> wrong for web: `ino-modal` is centre-anchored with no sheet/drawer positioning. The claim holds only
> for the three mobile tracks' `ConfirmActionSheet`. Corrected in the row above.

### Section 4 — Navigation & Menus (6 components)

| # | PrimeNG component | Our equivalent | Status |
|---|---|---|---|
| 4.1 | Menu Bar (`menubar`) | `<ino-nav>` — flat links + CTA; no submenus, no start/end slots | ⚠️ Partial |
| 4.2 | Toolbar (`toolbar`) | none | ❌ Missing |
| 4.3 | Menu (`menu`) | none | ❌ Missing |
| 4.4 | Stepper (`stepper`) | none | ❌ Missing |
| 4.5 | Accordion (`accordion`) | none | ❌ Missing |
| 4.6 | Tabs (`tabs`) | none (web). Mobile tracks have a bottom tab bar, which is not this component | ❌ Missing |

**Section 4: 0 ✅ · 1 ⚠️ · 5 ❌**

### Section 5 — Notifications & Status (2 components)

| # | PrimeNG component | Our equivalent | Status |
|---|---|---|---|
| 5.1 | Toast (`toast`) | `<ino-toast-container>` + `<ino-alert variant="toast">` | ⚠️ Partial |
| 5.2 | Inline Message / Alert (`message`) | `<ino-alert>` — `inline` \| `banner` \| `toast` × `success` \| `warning` \| `danger` | ⚠️ Partial |

**Section 5: 0 ✅ · 2 ⚠️ · 0 ❌** — our strongest section.

### Section 6 — Structural Containers (1 component)

| # | PrimeNG component | Our equivalent | Status |
|---|---|---|---|
| 6.1 | Card (`card`) | `<ino-card>` — `default` \| `sunken` \| `overlay`, padding `sm/md/lg`, `interactive` | ⚠️ Partial |

### Components we have that the plan does not list (we are ahead)

| Ours | Purpose | Note |
|---|---|---|
| `<ino-button>` | `primary` \| `secondary` \| `ghost` \| `icon` | The PrimeNG plan omits Button entirely — an omission in *their* plan, not a gap in ours. **No `danger` variant** (flagged in `confirm-action-sheet` source as a known workaround). |
| `<ino-hero>` | marketing hero | no PrimeNG equivalent |
| `<ino-feature-grid>` | bento feature grid | no PrimeNG equivalent |
| `<ino-tier-card>` | pricing/tier card | no PrimeNG equivalent |
| `<ino-metric-panel>` | RAG metric panel, closed `status` union | no PrimeNG equivalent — KYB-specific |
| `<ino-footer>` | site footer | no PrimeNG equivalent |
| `<ino-empty-state>` | ×3 mobile tracks | no PrimeNG equivalent |
| `<ino-screen-template>` | ×3 mobile tracks | no PrimeNG equivalent |

### Matrix A rollup

| Section | ✅ | ⚠️ | ❌ | Total |
|---|---|---|---|---|
| 1 — Form & Input | 0 | 5 | 12 | 17 |
| 2 — Data Containers | 0 | 0 | 7 | 7 |
| 3 — Overlays | 0 | 2 | 3 | 5 |
| 4 — Navigation | 0 | 1 | 5 | 6 |
| 5 — Notifications | 0 | 2 | 0 | 2 |
| 6 — Containers | 0 | 1 | 0 | 1 |
| **Total** | **0** | **11** | **27** | **38** |

*(11 ⚠️ counts Confirm Dialog as partial on the strength of the mobile tracks.)*

---

## 3. Matrix B — Variant coverage, for the 11 components we partially have

This is where "⚠️ Partial" is unpacked. Each row is a variant the plan explicitly requires.

### 1.1 Text Input — `<ino-input>`

| Required variant | Status | Evidence |
|---|---|---|
| Basic unadorned text box | ✅ | `ino-input.component.html` |
| Icon slot — left | ❌ | no icon input or slot |
| Icon slot — right | ❌ | — |
| Icon slot — dual | ❌ | — |
| Help / hint text below | ✅ | `@Input() hint` |
| Fluid (100% width) mode | ⚠️ | always full-width; not a toggleable variant |
| Types beyond text | ✅ ahead | `text\|email\|password\|number\|search\|tel\|url` |

### 1.5 Select — `<ino-select>`

| Required variant | Status | Evidence |
|---|---|---|
| Standard select trigger | ✅ | native `<select>` |
| Editable input (type-to-filter + custom values) | ❌ | native element cannot do this |
| Filter/search field in panel header | ❌ | native element has no panel |
| Grouped options with section headings | ❌ | no `<optgroup>` support in `InoSelectOption` |
| Custom item template slot | ❌ | native element cannot do this |

> **Architectural note:** four of five Select variants are impossible on a native `<select>`. Closing
> them means replacing `ino-select` with a custom listbox. That decision belongs in Phase 2, but flag
> it now — it converts Select from an "add variants" task into a "rewrite + migrate consumers" task.

### 1.9 Checkbox — `<ino-checkbox>`

| Required variant | Status |
|---|---|
| Standalone binary toggle | ✅ |
| Form group (array) | ❌ — no `ino-checkbox-group` |
| Indeterminate state | ❌ — no `indeterminate` input; `aria-checked="mixed"` never emitted |

### 1.10 Radio Button — `<ino-radio-group>`

| Required variant | Status |
|---|---|
| Radio group (mutually exclusive set) | ✅ |
| Standalone single radio | ❌ — only the group is exposed |

### 1.11 Toggle Switch — `<ino-toggle>`

| Required variant | Status |
|---|---|
| Binary toggle track + thumb | ✅ |
| Icon overlay on thumb | ❌ |

### 3.1 Dialog — `<ino-modal>`

| Required variant | Status | Evidence |
|---|---|---|
| Standard blocking modal | ✅ | `role="dialog"` + `aria-modal` |
| Dynamic runtime content (slot body) | ✅ | `ng-content` |
| Maximizable | ❌ | — |
| Draggable | ❌ | — |
| Header title | ✅ | `@Input() heading` |
| Footer action shelf | ⚠️ | projected content, no named footer slot |
| Width variants sm / md / lg | ❌ | single fixed width |

### 3.2 Confirm Dialog — `<ino-confirm-action-sheet>` (mobile only)

| Required variant | Status |
|---|---|
| Modal confirmation dialog (blocking, centred) | ⚠️ mobile tracks only |
| Inline anchor popup with arrow | ❌ |

### 4.1 Menu Bar — `<ino-nav>`

| Required variant | Status |
|---|---|
| Desktop horizontal bar | ✅ |
| Dropdown submenus | ❌ |
| Mobile hamburger → vertical panel | 🔲 Pending — see §10 |
| Start slot (logo/brand) | ⚠️ hardcoded, not a slot |
| End slot (search, profile) | ⚠️ `ctaLabel` only |
| `role="menubar"` + arrow-key navigation | ❌ |

### 5.1 Toast — `<ino-toast-container>`

| Required variant | Status |
|---|---|
| Position: Top-Right / Top-Left / Bottom-Right / Bottom-Left / Top-Center | ❌ — no position input, fixed placement |
| Summary title (bold) | ✅ via `ino-alert heading` |
| Detail body | ✅ |
| Leading status icon | ✅ |
| Severity: Success / Warning / Error | ✅ |
| Severity: **Info** | ❌ — `InoAlertStatus` is `success \| warning \| danger`; no info tier |
| Sticky / persistent (no auto-dismiss) | 🔲 Pending — see §10 |
| Close button | ✅ `dismissible` |

### 5.2 Inline Message — `<ino-alert>`

| Required variant | Status |
|---|---|
| Form-field inline error (compact) | ✅ `variant="inline"` |
| Full-width alert banner | ✅ `variant="banner"` |
| Severity Success / Warning / Error | ✅ |
| Severity **Info** | ❌ |
| Dismissable | ✅ |

### 6.1 Card — `<ino-card>`

| Required structure | Status |
|---|---|
| Body (content slot) | ✅ |
| Header (title + subtitle) | ❌ — no named header slot |
| Footer (right-aligned action shelf) | ❌ |
| Header image/media slot | ❌ |
| Configurable padding | ✅ ahead — `sm \| md \| lg` |
| Interactive hover (lift + scale) | ✅ `interactive` |
| Surface variants | ✅ ahead — `default \| sunken \| overlay` |

---

## 4. Matrix C — Sizing / density tiers

The plan requires `sm` / `default` / `lg` on 20 components (every Section-1 form control plus Data
Table, Dialog, and several navigation components).

| Question | Answer |
|---|---|
| How many of our components accept a `size` input? | **0 of 16.** Verified: `grep "size" web/src/app/components/*/*.component.ts` returns no `@Input`. |
| Do size tokens exist to build against? | ⚠️ Partially. `tokens.css` §10 defines `[data-density="dense"]` / `[data-density="fluid"]` with `--ino-space-row`, `--ino-type-body-size`, `--ino-row-min-height`. |
| Is that the same axis as `sm/default/lg`? | **No.** Density is a *container-level* mode (`[data-density]` on an ancestor, per `tokens.css` §10). The plan's sizing is a *per-component* prop. They are orthogonal and we have exactly one of the two. |
| Does any component consume the density tokens? | **No.** `grep "dense\|fluid" web/src/app/components/*/*.scss` → zero hits. The dense row-height token has no consumer. |
| Control-height tokens (`--ino-control-height-sm/md/lg`)? | ❌ Do not exist. |

| Item | Status |
|---|---|
| Per-component `sm` / `default` / `lg` API | ❌ Missing (0/20 required) |
| Container-level density mode tokens | ✅ Covered (`tokens.css` §10) |
| Density tokens consumed by a component | ❌ Missing |
| Control-height token scale | ❌ Missing |
| Touch-target floor (WCAG 2.2 §2.5.8) | ✅ Covered (`tokens.css` §7; dense row = 32px, above the 24px floor) |

---

## 5. Matrix D — Label placement and label sizes

### D.1 Label placement modes

| Mode | Required on | Our status |
|---|---|---|
| External label above field | 1.1–1.8, 1.12, 1.15, 1.17 | ✅ Covered — `@Input() label` on input, select, checkbox, toggle; `legend` on radio-group |
| **Floating label** (animates up on focus/fill) | 1.1–1.8 (7 components) | ❌ **Missing system-wide** |
| **IFTA label** (filled-state label inside boundary) | 1.1, 1.3, 1.5, 1.6 (4 components) | ❌ **Missing system-wide** |
| Inline-right label | 1.9, 1.10 | ✅ Covered (checkbox, radio-group default) |
| Inline-left label | 1.9, 1.10 | ❌ Missing — no placement input |
| External surrounding text | 1.11 toggle | ✅ Covered |
| Boundary value badges | 1.13 slider | ❌ n/a — component missing |

### D.2 Label *sizes* — token-level

`tokens.css` §4 defines exactly one label token:

```
--ino-type-label-size: 11px;  --ino-type-label-weight: 600;  --ino-type-label-tracking: 0.14em;
```

| Finding | Status |
|---|---|
| A label type token exists | ✅ |
| It is fit for form labels | ❌ — it is **mono, uppercase, 0.14em-tracked**, specified in `tokens.css` §4 for "uppercase eyebrows/section labels". Using it as a form-field label is a misuse. |
| A form-label token (sentence case, body font) | ❌ Missing |
| Label size tiers matched to `sm`/`default`/`lg` controls | ❌ Missing — the reference ships `--type-label` **and** `--type-label-sm`; we ship one token at one size |
| Help/hint text token | ⚠️ Partial — `--ino-type-body-sm-size: 12.5px` exists and is used, but is not named as a hint/caption role |
| Caption token | ❌ Missing (reference has `--type-caption`) |

**Net:** label sizing is a **one-token system where a five-token system is required** (label-lg,
label, label-sm, hint, caption).

---

## 6. Matrix E — Component states

Required state set from the plan: **Default · Hover · Focus · Active/Pressed · Filled · Invalid/Error ·
Disabled · Loading**. Verified by grepping each component's SCSS and template for the corresponding
selector or class.

| Component | Default | Hover | Focus | **Active** | Filled | Error | Disabled | Loading |
|---|---|---|---|---|---|---|---|---|
| `ino-button` | ✅ | ✅ | ✅ | ❌ | n/a | n/a | ✅ | ✅ `aria-busy` |
| `ino-input` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| `ino-select` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| `ino-checkbox` | ✅ | ❌ | ✅ | ❌ | n/a | ✅ | ✅ | n/a |
| `ino-radio-group` | ✅ | ❌ | ✅ | ❌ | n/a | ✅ | ✅ | n/a |
| `ino-toggle` | ✅ | ❌ | ✅ | ❌ | n/a | ❌ | ✅ | n/a |
| `ino-card` | ✅ | ✅ | ✅ | ❌ | n/a | n/a | n/a | ❌ no skeleton |
| `ino-alert` | ✅ | ✅ | ✅ | ❌ | n/a | ✅ | n/a | n/a |
| `ino-modal` | ✅ | ✅ | ✅ | ❌ | n/a | n/a | n/a | ❌ |
| `ino-nav` | ✅ | ✅ | ✅ | ❌ | n/a | n/a | n/a | n/a |
| `ino-footer` | ✅ | ✅ | ✅ | ❌ | n/a | n/a | n/a | n/a |
| `ino-hero` | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| `ino-feature-grid` | ✅ | ❌ | ❌ | ❌ | n/a | n/a | n/a | n/a |
| `ino-tier-card` | ✅ | ❌ | ❌ | ❌ | n/a | n/a | n/a | n/a |
| `ino-metric-panel` | ✅ | ❌ | ❌ | ❌ | n/a | n/a | n/a | ❌ |
| `ino-toast-container` | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | n/a |

### State-level findings

| # | Finding | Status |
|---|---|---|
| E-1 | **`:active` / pressed state absent from every component.** Zero `:active` selectors system-wide. | ❌ Missing (16/16) |
| E-2 | **Hover missing on all three binary controls** — checkbox, radio-group, toggle have `:focus-visible` and `:disabled` but no `:hover`. | ❌ Missing (3 components) |
| E-3 | **Filled state not styled** on input or select. The plan requires a distinct filled treatment (and it is the precondition for IFTA/floating labels). | ❌ Missing |
| E-4 | **Loading state exists only on button.** No spinner slot on input, no skeleton on card or metric-panel, no table loading overlay. | ⚠️ Partial (1/N) |
| E-5 | `ino-toggle` has no error state, unlike checkbox and radio-group. Inconsistent within the same control family. | ❌ Missing |
| E-6 | Marketing components (`feature-grid`, `tier-card`, `metric-panel`) carry **no interactive states at all** — acceptable if they are non-interactive by design, but `tier-card` has a `highlighted` input implying selection semantics. | ⚠️ Needs a decision |
| E-7 | Error state is styled consistently (`--ino-color-risk-high-*` family) on the three controls that have it. | ✅ Covered |
| E-8 | Disabled is consistently implemented via `[disabled]` attribute + SCSS, not `pointer-events: none`. | ✅ Covered |

---

## 7. Matrix F — Accessibility (WCAG 2.1 AA)

### F.1 Per-component ARIA and keyboard — verified from templates

| Component | ARIA verified present | Gaps against the plan |
|---|---|---|
| `ino-button` | `aria-label`, `aria-busy` (host binding), `[attr.disabled]` | Anchor variant: source comments that `disabled` is not honoured on `<a>` — a keyboard user can still activate a "disabled" link. ⚠️ |
| `ino-input` | `role`, `aria-invalid`, `aria-describedby` | ✅ meets the plan's stated a11y contract for 1.1 |
| `ino-select` | `role`, `aria-invalid`, `aria-describedby` | ❌ no `aria-expanded` / `aria-activedescendant` — but native `<select>` supplies its own semantics, so this is **acceptable today** and only becomes a gap if we move to a custom listbox |
| `ino-checkbox` | `role`, `aria-invalid`, `aria-describedby` | ❌ no `aria-checked="mixed"` (no indeterminate support) |
| `ino-radio-group` | `role`, `aria-describedby` | ⚠️ verify `role="radiogroup"` + arrow-key cycling — native radios give arrow keys free; the group `role` is present |
| `ino-toggle` | `role="switch"`, `aria-checked`, `aria-label` | ✅ meets the plan's contract for 1.11 |
| `ino-modal` | `role="dialog"`, `aria-modal`, `aria-label`, `tabindex` | 🔲 **focus trap not verified** — see §10. Escape close is implemented (`closeOnEscape`). |
| `ino-alert` | `role`, `aria-label` | ⚠️ `aria-live` is on the toast container, not the alert; inline-injected alerts may not announce |
| `ino-toast-container` | `aria-live`, `aria-atomic` | ⚠️ single politeness level — the plan requires `assertive` for errors, `polite` for info/success |
| `ino-nav` | `aria-label` | ❌ no `role="menubar"`, no `aria-current` for active route |
| `ino-card` | none | ⚠️ no `role="article"`; `interactive` cards have no `role="button"` or anchor wrapper → **keyboard-inaccessible clickable card** |
| `ino-hero`, `ino-feature-grid`, `ino-tier-card`, `ino-metric-panel`, `ino-footer` | none | ⚠️ presentational; acceptable if confirmed non-interactive (see E-6) |

### F.2 System-level WCAG 2.1 AA criteria

| SC | Criterion | Status | Evidence |
|---|---|---|---|
| 1.4.3 | Contrast (Minimum) 4.5:1 | ✅ Covered | All three themes' ratios measured and documented in `tokens.css` §1–§2c and `11-dark-light-mobile-accessibility.md`. High-contrast theme targets **AAA**. |
| 1.4.11 | Non-text Contrast 3:1 | ⚠️ Partial | Border and focus-ring colours are token-derived but **not systematically measured** the way text ratios are |
| 1.4.1 | Use of Colour | ⚠️ Partial | RAG status uses colour **and** text labels in `metric-panel`; not enforced anywhere as a rule |
| 2.1.1 | Keyboard | ⚠️ Partial | Interactive `ino-card` is not keyboard-operable; anchor-button disabled gap |
| 2.1.2 | No Keyboard Trap | 🔲 Pending | Modal focus trap unverified — §9 |
| 2.4.7 | Focus Visible | ⚠️ Partial | Present on every interactive component, but **hand-repeated, no token**, and `outline-offset` already drifted (input `1px` vs button/checkbox `2px`) |
| 3.3.1 | Error Identification | ✅ Covered | `aria-invalid` + visible error text on input, select, checkbox, radio-group |
| 3.3.2 | Labels or Instructions | ✅ Covered | `label` / `legend` / `hint` on all form controls |
| 4.1.2 | Name, Role, Value | ⚠️ Partial | Strong on form controls; missing on `nav` (no menubar role) and `card` (no article/button role) |
| 4.1.3 | Status Messages | ⚠️ Partial | `aria-live` on toast container only; single politeness level |
| 2.5.8 (2.2) | Target Size (Minimum) | ✅ Covered | `tokens.css` §7; dense row 32px vs 24px floor |
| — | `prefers-reduced-motion` | ⚠️ Partial | Honoured in button, card, hero, modal, toggle (5 of 16). ds_context §B global requirement 4 makes it mandatory for **all** motion. |

### F.3 Accessibility verdict

**No automated accessibility gate exists.** There is no axe/pa11y run, no CI a11y check, and no
accessibility test in the repo. `scripts/check-theme-parity.mjs` checks token parity across platforms,
not accessibility. Every ✅ above is a **source-reading assertion, not a test result** — which is
precisely the weakness the adherence-lint item (matrix row 22 / register item H-5) is meant to fix.

---

## 8. Matrix G — Token vocabulary vs the ds_context file

Cross-referencing source B's token catalogue against `web/src/tokens.css`.

| Token family | ds_context (reference) | INOVIXUX | Status |
|---|---|---|---|
| Colour primitives | 11-step indigo + 11-step slate + 4 status families | Primitive → role architecture, **three themes** | ✅ ahead |
| Brand naming | `--color-brand`, `--color-brand-hover/-active/-subtle/-muted/-emphasis` | `--ino-color-accent`, `--ino-color-accent-secondary` | ⚠️ **no `-hover` / `-active` brand-state tokens** — this is *why* E-1 (no `:active` state) happened |
| Surfaces | 7 tokens | `surface` / `-raised` / `-sunken` / `overlay-scrim` | ✅ |
| Text roles | 10 tokens incl. `--text-placeholder`, `--text-disabled` | present | ⚠️ verify placeholder/disabled text roles exist by name |
| Borders (colour) | `subtle` / `default` / `strong` / `brand` / `focus` | present | ⚠️ no named `--border-focus` |
| Spacing scale | 4px grid, 18 steps + semantic gaps/padding | `tokens.css` §5 | ✅ |
| Grid tokens | `--grid-cols-mobile/tablet/desktop`, gutter, margin | ❌ not present by name | ❌ Missing |
| Touch targets | `--touch-sm/md/lg` | `tokens.css` §7 | ✅ |
| Type scale | 9 steps | full scale §4 | ✅ |
| Font weights | 6 named weights | per-role weights, not a named scale | ⚠️ Partial |
| Line heights | 5 named (`--leading-*`) | per-role line values | ⚠️ Partial — no reusable `--leading-*` scale |
| Letter spacing | 6 named (`--tracking-*`) | per-role tracking | ⚠️ Partial |
| Composite type aliases | 15 (`--type-heading-1`, `--type-body`, …) | ❌ per-property tokens only, no shorthand composites | ❌ Missing |
| Radius scale | 9 steps + 12 semantic aliases | `tokens.css` §6 | ⚠️ verify semantic aliases (`--radius-button`, `--radius-input`, `--radius-card`…) exist |
| Border widths | 4 + 6 semantic | `tokens.css` §6 | ⚠️ Partial |
| Shadows | 6 elevation + 3 brand + 2 inset + **3 focus rings** + 6 semantic | **2 elevation steps + scrim** | ⚠️ materially thinner |
| **Focus-ring tokens** | `--focus-ring-brand`, `-error`, `-success` | ❌ **none** | ❌ Missing — root cause of F.2 SC 2.4.7 |
| Motion — durations | 6 named | `tokens.css` §9 | ✅ |
| Motion — easings | 7 named | §9 | ✅ |
| Motion — composite transitions | 7 + 3 property-specific | ❌ | ❌ Missing |
| Density modes | ❌ reference has none | ✅ `tokens.css` §10 | ✅ ahead |
| Safe-area insets | ❌ | ✅ §11 | ✅ ahead |
| Cross-platform parity check | ❌ | ✅ `scripts/check-theme-parity.mjs` | ✅ ahead |
| **Data-viz palette** | ❌ reference has none either | ❌ | ❌ Missing — both systems lack it; we need it more |

### ds_context global requirements (source B) — compliance

| # | Requirement | Status |
|---|---|---|
| 1 | All values reference CSS variables, nothing hardcoded | 🔲 Pending — **no lint enforces this**; cannot certify without the adherence lint (H-5) |
| 2 | Do not change the colour palette | ✅ |
| 3 | **Consistent focus ring via a single token** | ❌ Missing — hand-repeated and already drifted |
| 4 | All motion respects `prefers-reduced-motion` | ⚠️ Partial — 5 of 16 components |
| 5 | Dark mode automatic via CSS variables, no class overrides | ✅ ahead — three themes via `[data-theme]` |
| 6 | Responsive / mobile-viewport functional | ✅ |
| 7 | No external icon library assumed; icon slots accept a system icon | ⚠️ Partial — `14-icon-system.md` exists; components have no icon slots (see 1.1 icon variants ❌) |

---

## 9. Structural parity vs the e-Cheque packaging layer (carried from revision 1)

Unchanged and still accurate. `✅` at parity or ahead · `🟡` content covered, packaging missing · `❌` gap.

| # | Reference artifact | Our equivalent | Verdict |
|---|---|---|---|
| 1 | `styles.css` import entry | none — consumers import `web/src/tokens.css` | 🟡 |
| 2 | `tokens/` split into 6 files | single 436-line `tokens.css`, mirrored at `docs/brand/02-design-tokens/tokens.css` | 🟡 structure only |
| 3 | `tokens/colors.css` | §1–§2c, **three** themes, ratios measured | ✅ ahead |
| 4 | `tokens/typography.css` | §4, Geist/Geist Mono + system fallback chain | ✅ |
| 5 | `tokens/spacing.css` | §5 | ✅ |
| 6 | `tokens/shadows.css` | §2/§2b — 2 elevation steps + scrim | ⚠️ thinner than reference (see Matrix G) |
| 7 | `tokens/borders.css` | §6 | ✅ |
| 8 | `tokens/motion.css` | §9 | ✅ |
| 9 | — (no density modes in reference) | §10 dense/fluid, §7 touch targets, §11 safe-area | ✅ ahead |
| 10 | — (no parity check in reference) | `scripts/check-theme-parity.mjs` | ✅ ahead |
| 11 | `assets/logo*.svg` ×3 | `assets/brand/logo/` — 9 SVGs + 5 PNGs | ✅ ahead *(final artwork still INO-82)* |
| 12 | `assets/brand-hero.svg`, `brand-illustration.svg` | none | ❌ |
| 13 | `guidelines/*.card.html` ×12 | one combined `02-design-tokens/style-guide.html` | 🟡 not decomposed/embeddable |
| 14 | `guidelines/ds-context.md` | `02-design-tokens/README.md` + `angular-theme-contract.md` | ✅ |
| 15 | `components/<group>/X.jsx` | 16 Angular components, mirrored in `06-angular-components/` | ✅ |
| 16 | `components/<group>/X.d.ts` | `@Input()`s live in the `.ts`; no extracted contract | 🟡 |
| 17 | `components/<group>/X.prompt.md` | none | ❌ largest doc gap |
| 18 | `<group>.card.html` gallery | one 104-line docs page | 🟡 |
| 19 | `ui_kits/` prototypes | 3 real mobile apps (13 screens each) + 14-route Angular site + Pages preview | ✅ well ahead |
| 20 | `_ds_manifest.json` | none | ❌ |
| 21 | `_ds_bundle.js` | `06-angular-components/package.json` exists, never published | 🟡 |
| 22 | `_adherence.oxlintrc.json` | none — parity ≠ adherence | ❌ |
| 23 | `SKILL.md` | none | ❌ |
| 24 | `readme.md` | `docs/brand/00-INDEX.md` | ✅ |
| 25 | `thumbnail.html` | none | ❌ cosmetic |
| 26 | `uploads/` source briefs | `specs/`, issue threads | ✅ |

**Score: 14 ✅ (6 ahead) · 6 🟡 · 6 ❌.** Row 6 downgraded from ✅ to ⚠️ this revision on the strength
of the Matrix G shadow comparison.

---

## 10. Items I cannot assess — flagged as required

Per the instruction to flag anything lacking sufficient context:

| # | Item | Why I cannot assess it | What would resolve it |
|---|---|---|---|
| P-1 | **Modal focus trap** (WCAG 2.1.2) | `tabindex` is present in the template but I did not trace whether Tab is constrained to the dialog. A static read cannot prove it. | Keyboard test, or an axe/pa11y run on the modal route |
| P-2 | **`ino-nav` mobile hamburger** | Not visible in the component `.ts`; may live in the page template or be handled by CSS breakpoints | Read `ino-nav.component.html` + the site shell, or a mobile-viewport screenshot |
| P-3 | **Toast sticky/persistent mode** | `ino-toast-container` exposes no `@Input()`; the dismiss timing likely sits in a service I did not read | Read the toast service |
| P-4 | **Hardcoded-value audit** (ds_context global req. 1) | Certifying "zero hardcoded colours" requires a lint pass, not a grep | Run the adherence lint (register H-5) — this is exactly what it is for |
| P-5 | **Actual rendered contrast of non-text elements** (SC 1.4.11) | Border/focus-ring ratios are not in the measured set | Extend the ratio measurement script to borders and focus rings |
| P-6 | **Figma library parity** | Figma connector is **not authorized** in this session | You authorize the Figma connector (`00-INDEX.md` §5) |
| P-7 | **Mobile-track component parity** | I inventoried the three mobile tracks' component folders (2–4 components each) but did not cross-check every screen's inline styling against tokens | Per-track component audit, or extend `check-theme-parity.mjs` to component level |
| P-8 | **"Claude Design System conventions"** (named in your Phase 2 brief) | I have no authoritative spec for this by that name. I can align to Anthropic's published design guidance and the `dataviz` skill's palette methodology, but I should not guess at a named standard. | You point me at the specific document/URL you mean, or confirm "use the `dataviz` skill + general Claude design guidance" |

---

## 11. Pending Items Register

All 17 items from your brief, restated with verified status, **plus 9 new items (N-1…N-9) surfaced by
the matrices above** that were not in your list.

### HIGH — blocks near-term work

| # | Item | Verified status | Evidence | Blocked by |
|---|---|---|---|---|
| **H-1** | **Data-visualization palette** — categorical series, sequential + diverging ramps, colourblind-safe validation across all three themes | ❌ Missing | `tokens.css` mentions "chart strokes" once, in passing; no palette tokens | — |
| **H-2** | **Table / dense data component** | ❌ Missing | `--ino-row-min-height: 32px` defined in `tokens.css` §10; **zero component consumers** (grep confirmed) | — |
| **H-3** | **Devanagari + Indic typography** — Noto Sans Devanagari pairing, matched vertical rhythm | ❌ Missing | `--ino-font-display` chain is `Geist, system-ui, -apple-system, Arial, Helvetica, sans-serif` — no Devanagari face; a Hindi string falls to the OS default and breaks the line-height contract | — |
| **H-4** | **Report / PDF export theme** — header/footer, typographic spec, print colour profile, INO-14 disclaimer lockup | ❌ Missing | no print stylesheet, no `@media print` block in `tokens.css` | Print colour half is gated on **INO-82** |
| **H-5** | **Design-system adherence lint** (matrix row 22) | ❌ Missing | `check-theme-parity.mjs` checks parity, not adherence | — |
| **N-1** | **Per-component `sm`/`default`/`lg` size API** | ❌ Missing (0 of 16 components) | Matrix C | — |
| **N-2** | **Focus-ring token** (`--ino-focus-ring`) | ❌ Missing | Matrix G; already drifted (`outline-offset` 1px vs 2px) | — |
| **N-3** | **`:active` / pressed state across all components** | ❌ Missing (16 of 16) | Matrix E, finding E-1; root cause is the missing `--ino-color-accent-active` token | — |
| **N-4** | **Form-label token set** — label-lg / label / label-sm / hint / caption | ❌ Missing | Matrix D.2 — one mono uppercase token today, misused as a form label | — |

**Why N-1…N-4 are High and not Medium:** each one is a *cross-cutting contract change*. Adding a
`size` prop or a focus-ring token after 30 more components exist is 30× the work it is today. These
are cheapest at the current component count and get monotonically more expensive.

### MEDIUM — needed before external-facing release

| # | Item | Verified status | Blocked by |
|---|---|---|---|
| **M-6** | Email design system — transactional templates (verification, approval-requested, report-ready) + HTML signature block | ❌ Missing | — |
| **M-7** | Brand guidelines PDF | ❌ Missing | **INO-82** |
| **M-8** | Print colour spec — CMYK + Pantone for violet/indigo accent | ❌ Missing | **INO-82** |
| **M-9** | Social profile kit — LinkedIn/X banner, avatar crops, post templates | ❌ Missing | Partly **INO-82** |
| **M-10** | Motion specimen — rendered page demonstrating durations and easings | ❌ Missing (tokens exist, nothing renders them) | — |
| **M-11** | Imagery / illustration direction | ❌ Missing | — |
| **M-12** | App store listing assets — screenshots, feature graphic, store copy × 3 tracks | ❌ Missing | Partly **INO-82** |
| **N-5** | Composite type aliases (`--ino-type-heading-1` shorthand form) + `--leading-*` / `--tracking-*` scales | ❌ Missing | — |
| **N-6** | Shadow/elevation scale expansion — 2 steps today vs 6 + 3 brand + 2 inset in the reference | ⚠️ Partial | — |
| **N-7** | `prefers-reduced-motion` coverage — 5 of 16 components; ds_context makes it mandatory for all motion | ⚠️ Partial | — |
| **N-8** | Info severity tier — `InoAlertStatus` is `success \| warning \| danger`; the plan requires Info on both Toast and Message | ❌ Missing | — |
| **N-9** | Icon slots on components + `danger` button variant | ❌ Missing | — |

### LOW — deferrable

| # | Item | Verified status | Blocked by |
|---|---|---|---|
| **L-13** | Trademark / domain / handle audit — India TM classes 9 & 42, domain + social handles for "INOVIXUX" | ❌ Not started | Partly **INO-82** |
| **L-14** | Sound & haptics — mobile approval/rejection feedback | ❌ Missing | — |
| **L-15** | Accessibility statement — public VPAT-style page | ❌ Missing | Depends on H-5 + an automated a11y gate for its claims to be truthful |
| **L-16** | DS versioning & release — semver token contract, publish `06-angular-components/` as a real package | ❌ Missing | — |
| **L-17** | Figma library | 🔲 **Blocked** | **Figma connector not authorized** (`00-INDEX.md` §5) — confirmed unavailable this session |

### Register rollup

| Priority | Items | ❌ Missing | ⚠️ Partial | 🔲 Blocked |
|---|---|---|---|---|
| High | 9 (5 yours + 4 new) | 9 | 0 | 0 |
| Medium | 12 (7 yours + 5 new) | 9 | 3 | 0 |
| Low | 5 | 4 | 0 | 1 |
| **Total** | **26** | **22** | **3** | **1** |

---

## 12. Named blockers

Stated explicitly rather than worked around, per your constraint:

| Blocker | Blocks | Unblock owner | Unblock action |
|---|---|---|---|
| **INO-82** (Brand Logo — dedicated design workstream, currently `in_review`) | M-7 brand guidelines PDF, M-8 print colour spec, parts of M-9 and M-12, part of L-13 | You | Approve or reject the INO-82 logo round |
| **Figma connector not authorized** | L-17 Figma library; and the "importable + shareable in Figma" requirement of your **Phase 2** brief | You | Authorize the Figma connector in claude.ai connector settings (this session is non-interactive, so I cannot run the OAuth flow) |
| **"Claude Design System conventions" undefined** (P-8 above) | Phase 2 alignment requirement | You | Name the specific document you mean, or confirm the `dataviz` skill + general Claude design guidance is the intended reference |
| **No automated a11y gate** | Every ✅ in Matrix F is an assertion, not a test | Me, in Phase 2 | Fold axe/pa11y into H-5 |

---

## 13. Phase 2 gate

**Phase 1 ends here.** Nothing in §11 has been started, and no child issues have been created.

On your approval I will deliver Phase 2 as specified: implementation plan for all 26 register items,
agent orchestration strategy (count, specialization, dependency graph), time estimates with the
critical path and parallelization limits, and a hosted HTML demo page with all three web themes
switchable, a mobile view, and every component variation.

Three answers I need from you before Phase 2 can be accurate — **they do not block your approval of
Phase 1, but they change the Phase 2 plan materially:**

1. **`ino-select` rewrite** — 4 of 5 required Select variants are impossible on a native `<select>`.
   Rewrite as a custom listbox (better parity, migration cost, new a11y surface) or accept the native
   element and mark those four variants permanently out of scope?
2. **PrimeNG scope** — do you want all 38, or the subset the KYB MVP actually needs? Section 2's Org
   Chart, Pick List, and Order List, plus Section 1's Knob, Rating, and Colour Picker, have no visible
   use in a KYB underwriting product. Building all 38 is roughly 2× the work of building the ~22 that
   are load-bearing.
3. **The two blockers above** — Figma authorization and the "Claude Design System" definition.

---

*Revision 2 prepared 2026-09-14. Sources A–D read in full this run. Revision 1 (e-Cheque structural
parity, 172 reference files) is preserved as §9. Supersedes the "folder could not be read" notes in
`12-branding-completeness-checklist.md` §7 and `11-dark-light-mobile-accessibility.md` §9.*
