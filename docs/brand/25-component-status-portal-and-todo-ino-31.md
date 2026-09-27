# 25 — Component-wise implementation status, portal availability, and TO_DO plan (INO-31, board request 2026-09-26)

> **Question this answers** (board comment `030137c5`, 2026-09-26): component-wise status — name,
> implemented in design system incl. all variations, mobile-compatible 3 themes, web 3 themes,
> Variants/Structure, States, Sizing, Labels, a11y, Notes — plus whether a PrimeNG-style hosted
> portal exists for the dev team (component picker, usage docs, sample code), split as TO_DO with
> an implementation plan for all pending items.
>
> Supersedes the snapshot in doc 24 (which predated INO-317/INO-318 landing). Source of truth:
> `docs/brand/design-system.manifest.json` (43 components, generated from source),
> `scripts/check-theme-parity.mjs` COMPONENT_REGISTRY (per-platform parity),
> `web/public/design-system/component-disposition.json` (tier itemization, 69 rows).

---

## 0. Headline

| Measure | Count |
|---|---|
| PrimeNG 22.1.1 baseline rows | 102 |
| **Implemented** with a dedicated INOVIXUX component | **38** (was 33; +5 Tier-1 under INO-318) |
| Partially reachable (InputNumber/InputPassword via `<ino-input type>`) | 2 |
| Not implemented — **Tier-1 committed** | **0** (all cleared) |
| Not implemented — Tier-2 open (specify before building) | 49 |
| Not implemented — Tier-3 formally declined | 15 |
| INOVIXUX-only marketing components (no PrimeNG counterpart) | 5 |
| **Portal** (PrimeNG-style, per-component routes) | **Built (INO-317)** — live on Pages after merge to `main` |

**Theme columns, defined once (they apply uniformly):**
- **Web 3 themes** — every one of the 43 components passes `check-theme-parity.mjs` (dark /
  light / high-contrast × WCAG 2.2 contrast + focus assertions) and `check-ds-adherence.mjs` +
  axe/pa11y in CI. **✅ for all 43** — no exceptions, so the table below doesn't repeat the column.
- **Mobile 3 themes** — two meanings, both true where marked ✅:
  - **Capacitor track** wraps the same Angular app and stylesheet, so **all 43 components** run
    there with all 3 themes (CI asserts the Capacitor styles import).
  - **Native tracks (React Native + Flutter)** have hand-ported components reading the same
    3-theme token exports (`tokens.ts` / `tokens.dart`, palette-asserted per theme in CI). The
    Mobile column below reports this native-port status; any role a port drops is a written
    `divergences` entry in the registry, never silent.

---

## 1. Component-wise status — all 43 shipped components

Mobile legend: **✅ RN+Fl** = ported to React Native and Flutter, 3 themes CI-gated;
**idiom** = covered by a deliberate native idiom instead of a 1:1 port;
**web-only (by design)** = written decision with issue ref; **web-only (for now)** = port
neither built nor declined — listed in TO_DO §3.4.

### Form

| Component | Implemented (all variations) | Mobile (native, 3 themes) | Variants/Structure | States | Sizing | Labels | a11y | Notes |
|---|---|---|---|---|---|---|---|---|
| `ino-checkbox` (+`-group`) | ✅ | ✅ RN+Fl | standalone + group; indeterminate | checked/unchecked/indeterminate, readonly, disabled, focus | ✅ | `ino-label` | ✅ native input + focus ring | `checkbox.md` |
| `ino-datepicker` | ✅ | ✅ RN+Fl | single/range/multiple; 12/24 h | open/closed, disabled/min/max dates, invalid | ✅ | float/ifta compatible | ✅ APG dialog+grid | `datepicker.md`, Indic digits |
| `ino-float-label` | ✅ | ✅ RN+Fl | `over \| in \| on` (all 3 PrimeNG modes) | floated/resting | ✅ | is a label primitive | ✅ | `floatlabel.md` |
| `ino-ifta-label` | ✅ | ✅ RN+Fl | single mode (no float, by design) | static | ✅ | label primitive | ✅ | `iftalabel.md` |
| `ino-input` | ✅ | ✅ RN+Fl | `outline \| filled` | hover/focus/disabled/invalid/readonly | ✅ | full W0-3 | ✅ | `input.md` |
| `ino-input-otp` | ✅ | ✅ RN+Fl | length-driven cells | filled/empty/invalid/disabled | ✅ | per-cell aria | ✅ paste + SR announce | `input-otp.md` (KYB verification) |
| `ino-label` | ✅ | ✅ RN+Fl | 5 roles | required/optional/error | ✅ | is the primitive | ✅ `for` enforced | `label.md` |
| `ino-multiselect` | ✅ | ✅ RN+Fl | chip/comma display; grouping; select-all; limit | open/closed, option states, invalid | ✅ | float/ifta | ✅ APG listbox multi | `multiselect.md` |
| `ino-radio` (+`-group`) | ✅ | ✅ RN+Fl | standalone + group | checked, disabled, roving focus | ✅ | `ino-label` | ✅ APG radio group | `radio-group.md` |
| `ino-select` | ✅ | ✅ RN+Fl | custom listbox (not native select) | open/closed, option states, invalid, disabled | ✅ | float/ifta | ✅ APG combobox | `select.md` |
| `ino-textarea` | ✅ | ✅ RN+Fl | `outline \| filled` | hover/focus/disabled/invalid/readonly | ✅ | full W0-3 | ✅ | `textarea.md` |
| `ino-toggle` | ✅ | ✅ RN+Fl | single | on/off, disabled, focus | ✅ | `ino-label` | ✅ `role="switch"` | `toggle.md` |
| `ino-icon-field` | ✅ **new (INO-318)** | web-only (for now) | leading/trailing icon slots | inherits host input states | ✅ | pass-through to input label | ✅ decorative-icon contract | `icon-field.md` + `SPEC.md` |
| `ino-input-group` | ✅ **new (INO-318)** | web-only (for now) | prefix/suffix addons | inherits host input states | ✅ | addon aria contract | ✅ | `input-group.md` + `SPEC.md` |

### Button

| Component | Implemented | Mobile | Variants/Structure | States | Sizing | Labels | a11y | Notes |
|---|---|---|---|---|---|---|---|---|
| `button[ino-button]` / `a[ino-button]` | ✅ | ✅ RN+Fl (declared `onDanger` divergence, INO-171) | `primary \| secondary \| ghost \| icon \| danger` | hover/active/focus/disabled/loading | ✅ | icon variant requires `aria-label` (documented MUST) | ✅ native-tag semantics | `button.md` |

### Data

| Component | Implemented | Mobile | Variants/Structure | States | Sizing | Labels | a11y | Notes |
|---|---|---|---|---|---|---|---|---|
| `ino-table` | ✅ | web-only (for now — mobile idiom TBD, TO_DO §3.4) | sort, filter, selection, expansion, grouping | row hover/selected/expanded, sort, empty | ✅ + dense | header + caption contract | ✅ sort announcements | `table.md` — KYB risk-report surface |
| `ino-paginator` | ✅ | web-only (for now) | page-size options | current/disabled nav | ✅ | aria page labels | ✅ | `paginator.md` |
| `ino-timeline` | ✅ | web-only (by design, INO-134) | vertical/horizontal, alternate align | static + roving-tabindex mode | ✅ | `ariaLabel` inputs | ✅ | `timeline.md` |
| `ino-virtual-scroller` | ✅ | web-only (by design, INO-129 — native lists virtualize natively) | fixed + variable size, both orientations | loading/lazy, scroll restore | ✅ | `itemRole`/`ariaLabel` | ✅ | `virtual-scroller.md` |

### Panel

| Component | Implemented | Mobile | Variants/Structure | States | Sizing | Labels | a11y | Notes |
|---|---|---|---|---|---|---|---|---|
| `ino-card` | ✅ | ✅ RN+Fl | `default \| sunken \| overlay` + slots | n/a (non-interactive) | ✅ + padding | heading-slot contract | ✅ | `card.md` |
| `ino-tabs` | ✅ **new (INO-318)** | web-only (for now) | tab list + lazy panels | active/hover/focus/disabled tab | ✅ | tab labelling contract | ✅ APG tabs keyboard map | `tabs.md` + `SPEC.md` |
| `ino-stepper` | ✅ **new (INO-318)** | web-only (for now) | linear/non-linear steps | active/complete/error/disabled step | ✅ | step label contract | ✅ | `stepper.md` + `SPEC.md` |

### Overlay

| Component | Implemented | Mobile | Variants/Structure | States | Sizing | Labels | a11y | Notes |
|---|---|---|---|---|---|---|---|---|
| `ino-modal` | ✅ | ✅ RN+Fl | maximize, drag, projection | open/closed/maximized | ✅ | `aria-labelledby` | ✅ FocusTrap, APG dialog | `modal.md` |
| `ino-confirm-dialog` | ✅ | **idiom**: `ConfirmActionSheet` on RN+Fl (INO-148 desktop-idiom rule) | `severity` | pending/confirmed/rejected | ✅ | severity-labelled actions | ✅ | `confirm-dialog.md` |
| `ino-confirm-popup` | ✅ | **idiom**: same action sheet | anchored position | open/closed | ✅ | | ✅ | `confirm-popup.md` |
| `ino-drawer` | ✅ | ✅ RN+Fl | 4 edges, modal & non-modal | open/closed | ✅ | `aria-labelledby` | ✅ | `drawer.md` |
| `ino-popover` | ✅ | web-only (by design — no hover anchor on touch) | anchored position | open/closed | ✅ | | ✅ | `popover.md` |
| `ino-tooltip` | ✅ | web-only (by design — hover/focus idiom) | position | visible/hidden, hover **and** focus | ✅ | `aria-describedby` | ✅ | `tooltip.md` |

### Menu / Messages / File

| Component | Implemented | Mobile | Variants/Structure | States | Sizing | Labels | a11y | Notes |
|---|---|---|---|---|---|---|---|---|
| `ino-nav` (Menubar) | ✅ | web-only (mobile uses native navigation shell) | links + CTA + submenus | hover/open/active-route | ✅ | | ✅ `role="menubar"`, roving tabindex | `ino-nav.md` |
| `ino-toast-container` + `ToastService` | ✅ | web-only (for now) | position input; severity ×4 | enter/exit, timed dismiss | n/a (by design) | | ✅ `aria-live` | `alert.md` |
| `ino-alert` (Message) | ✅ | web-only (for now) | `inline \| banner \| toast` × 4 severities | static | n/a (by design) | | ✅ role/`aria-live` per severity | `alert.md` |
| `ino-file-upload` | ✅ | ✅ RN+Fl | mode, captureMode, controlled items | idle/dragover/uploading/error | ✅ + density | | ✅ | `file-upload.md` — KYB document intake |

### Misc

| Component | Implemented | Mobile | Variants/Structure | States | Sizing | Labels | a11y | Notes |
|---|---|---|---|---|---|---|---|---|
| `ino-skeleton` | ✅ | ✅ RN+Fl | shape axis | is the loading state | ✅ | | ✅ AT-hidden | `skeleton.md` |
| `ino-focus-trap` | ✅ | web-only (a11y primitive; native focus differs) | component + directive | active/paused | n/a | | ✅ | `focus-trap.md` |
| `ino-progress-spinner` | ✅ | ✅ RN+Fl | determinate/indeterminate | spinning/complete | ✅ | | ✅ `aria-busy` | `progress-spinner.md` |
| `ino-progress-bar` | ✅ **new (INO-318)** | web-only (for now) | determinate/indeterminate | value/complete | ✅ | value labelling | ✅ `role="progressbar"` | `progress-bar.md` + `SPEC.md` |
| `ino-tag` | ✅ | ✅ RN+Fl | severity tiers (RAG risk flags) | static | ✅ | | ✅ not color-only | `tag.md` |
| `ino-meter-group` | ✅ | ✅ RN+Fl | orientation, legend template | static | ✅ | | ✅ | `meter-group.md` — composite risk score |

### INOVIXUX-only (marketing, no PrimeNG counterpart)

`ino-feature-grid`, `ino-footer`, `ino-hero`, `ino-metric-panel`, `ino-tier-card` — web-only by
nature (corporate site), same token/a11y/3-theme CI contract.

**Native-port tally:** 21 of 43 ported to RN+Flutter, 2 covered by a deliberate native idiom,
6 web-only by written decision, 14 web-only pending a port/decline decision (§3.4). All 43 run
on the Capacitor track with 3 themes.

---

## 2. Portal — PrimeNG-style component showcase

**Built (INO-317, commit `1b3c8c0`).** What the dev team gets, mirroring the primeng.org flow:

- **`/docs/components`** — component picker: every shipped component, grouped, with disposition
  cross-checked live against the manifest (a component that ships later auto-moves out of the
  "unbuilt" list — no hand-maintained status).
- **`/docs/components/<slug>`** — per-component page: **props/API table generated from source**
  (the manifest, never hand-authored), **live rendered example** (NgComponentOutlet against the
  real component class), **theme switcher** (dark/light/high-contrast), **a11y contract** and
  **deliberate omissions** extracted from the narrative docs.
- The 65 not-yet-shipped PrimeNG components appear with their tier disposition
  (`component-disposition.json`), so "can I use X?" has one answer surface.
- Usage docs + sample code also live per component in `docs/brand/06-angular-components/*.md`
  and `web/src/app/components/<name>/SPEC.md`.

**Hosting status — the one caveat:** GitHub Pages deploys on push to `main`
(`deploy-pages.yml`). The portal is committed on branch `INO-31-brand-architecture-identity-creation`
and pushed to GitHub; it goes live on the public Pages URL as soon as the PR to `main` merges
(TO_DO §3.1 — awaiting board review, per the INO-278 ship gate).

**Portal gaps still open (TO_DO §3.5):** copyable code snippets per variant/state (today one
live example + spec link, not a per-variant gallery), search/filter on the index, and a stub
detail page per Tier-2 component.

---

## 3. TO_DO — all pending items, with implementation plan

Nothing remains in "committed but unbuilt" — Tier-1 debt is cleared. Pending work, in priority
order:

### 3.1 Ship what's built to `main` (portal goes live) — **immediate, ~0 d**
PR from `INO-31-brand-architecture-identity-creation` → `main` (audit doc 24, portal INO-317,
five Tier-1 components INO-318, this doc). Merge triggers the Pages deploy; the portal URL then
works for the dev team. Gate: board/CTO review per INO-278.

### 3.2 Tier-2 stub specs on the portal — **~2 d**
The tier itemization is written (disposition JSON, 49 Tier-2 rows). Remaining F-2 debt: a stub
`SPEC.md` per Tier-2 component and a stub detail page in the portal ("not built — here is the
committed API shape when it is"), so the dev team never designs against a guess.

### 3.3 Tier-2 build waves — **the big block; propose scheduling by KYB need**
Per-component pace observed on Tier-1: ~0.5–1 d simple, 2–3 d complex (component + SPEC + doc +
registry + parity gates). Proposed waves, each a child issue on the INO-278 gate:

| Wave | Components | Driver | Est. |
|---|---|---|---|
| A — form completion | InputNumber, InputPassword (dedicated builds), InputMask, AutoComplete, Slider, SelectButton, ToggleButton, Listbox | KYB data-entry surfaces | ~9 d |
| B — structure | Accordion, Panel, Divider, Fieldset, Toolbar, Splitter, ScrollPanel/ScrollArea | dashboard layout | ~6 d |
| C — navigation | Menu, Breadcrumb, ContextMenu, TieredMenu, PanelMenu, Sidebar, MegaMenu, CommandMenu | app shell | ~8 d |
| D — data | Tree, TreeTable, DataView, PickList, OrderList | entity hierarchies in risk reports | ~9 d |
| E — misc/directives | Avatar, Badge, Chip, BlockUI, Inplace, ScrollTop, Fluid, AnimateOnScroll, AutoFocus, KeyFilter, StyleClass, ClassNames, Bind, InputTags, InputColor, CascadeSelect, TreeSelect, SpeedDial, SplitButton, DynamicDialog | long tail — build on first product demand | ~12 d |

Recommendation: schedule Wave A now (KYB MVP touches it), gate B–E on actual product pull rather
than building 49 components speculatively — that is what Tier-2 ("specify, don't build") was for.

### 3.4 Mobile-port decisions for the 14 "web-only (for now)" components — **~1 d decide, ports separate**
alert/toast, table, paginator, tabs, stepper, progress-bar, icon-field, input-group, nav (+5
marketing components which stay web by nature). For each: port (≈0.5–1 d × 2 tracks), substitute
a native idiom (as confirm-dialog did), or decline in writing (as timeline/virtual-scroller did).
The parity registry makes any undeclared gap a CI failure, so this list cannot silently grow.

### 3.5 Portal polish — **~2–3 d**
Copyable sample-code blocks per variant/state, index search/filter, per-variant example gallery.

### 3.6 Tier-3 — no work
15 components formally declined in writing (doc 17): Knob, Rating, ColorPicker, Editor, OrgChart,
Dock, Terminal, Ripple, DragDrop, media/gallery family ×6. Revisit only on explicit product need.
