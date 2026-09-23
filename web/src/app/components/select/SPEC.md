# `<ino-select>` — component spec

**Issue:** INO-152 (INO-31 T-9, Tier 1 / Form group)
**Parity benchmark:** PrimeNG 22.1.1 `Select` — `specs/primeng/llms-22.1.1.txt`, route
`https://primeng.dev/select`. PrimeNG is a benchmark, **not a runtime dependency**; nothing here
installs it.
**Resolves DoD rows:** 1–11 (full component DoD, `docs/brand/17-phase-2-implementation-program.md`
plan rev 9 §2).
**Depends on:** W0-2 (INO-124, control-size scale), T-11 (INO-130, `InoFocusTrapDirective` —
evaluated and **not used**, see §3) — both `done` before this issue started.

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Scope: `Select` only, not the whole PrimeNG family

The issue frames this as "the highest-leverage single decision in Phase 2" because a native
`<select>` makes 4 of PrimeNG's 5 `Select`-family variants (Select, MultiSelect, AutoComplete,
Listbox) structurally impossible, and rewriting as a custom listbox unlocks all four. This issue
builds **only `Select`** (single-selection, one trigger + overlay). Deliberately **not** built
here, each left as a separate not-yet-filed follow-up issue against the same shared core:

- **MultiSelect** — checkbox options, chip-list value display, "select all" — a different value
  shape (`string[]`) and a materially different trigger rendering, not a boolean flag on this
  component.
- **AutoComplete** — server-side/async suggestion source, multiple free-text tokens, debounced
  fetch — a different data contract (`options` as a live-filtered async result, not a static array)
  from this component's synchronous client-side filter.
- **Listbox** — always-visible, no trigger/overlay/combobox semantics at all — the *inverse* of
  this component's core interaction, not an extension of it.

Building all four in one issue would mean no single variant ships at reviewable, ship-ready
quality. What this issue does establish, so each follow-up is materially smaller: the overlay
positioning, the `aria-activedescendant` keyboard/ARIA contract (§2), option-group rendering,
in-panel filter, and `<ino-virtual-scroller>` integration for long lists (§4).

## 2. ARIA: `aria-activedescendant`, not roving `tabindex`, and not `InoFocusTrapDirective`

WAI-ARIA APG "Collapsible Dropdown Listbox" allows either a roving-`tabindex` popup (real DOM
focus moves between options) or an `aria-activedescendant` popup (DOM focus stays on the
combobox input/button; the active option is referenced by id). This component uses
**`aria-activedescendant` throughout** — trigger button, editable trigger `<input>`, and the
in-panel filter `<input>` (whichever currently owns the keystroke) all carry
`aria-activedescendant` pointing at `${listboxId}-opt-${index}`; `role="option"` elements never
receive real focus.

This is not a stylistic choice: it is the only model that also works through
`<ino-virtual-scroller>` (§4), where most options are not present in the DOM at all — a
roving-tabindex implementation cannot move real focus onto an element that does not exist yet.

**`InoFocusTrapDirective` (T-11) is deliberately not used here**, even though every other Tier-1
overlay (Modal, Drawer, Popover, ConfirmDialog) composes it. Focus-trapping is for `role="dialog"`
`aria-modal="true"` surfaces where DOM focus genuinely moves inside a container and must be
contained there (WCAG SC 2.1.2). This listbox's `role="listbox"` popup is not a dialog: DOM focus
never leaves the trigger/filter input by design (previous paragraph), so there is nothing for a
focus trap to contain — adding one would fight the `aria-activedescendant` model, not support it.

### Keyboard map

| Key | Closed | Open |
|---|---|---|
| `ArrowDown` / `ArrowUp` | Opens panel, activates first/last enabled option | Moves `aria-activedescendant` to next/previous enabled option (clamped, no wrap) |
| `Home` / `End` | — | Jumps to first/last enabled option |
| `Enter` / `Space`* | Opens panel | Selects the active option, closes, returns focus to trigger |
| `Escape` | — | Closes panel without changing `value`, returns focus to trigger |
| `Tab` | — | Closes panel (no value change), lets focus move to the next tabbable element natively |
| Printable character | Typeahead: jumps to next option whose label starts with the typed buffer (buffer resets 500 ms after the last keystroke) | Same, only when both `editable` and `filter` are `false` — otherwise the character is text input |

\* `Space` is excluded from the editable trigger's key handling (it is a valid character to type).

## 3. Grouping — flat array with a `group` field, not nested children

`InoSelectOption.group?: string` groups **consecutive** options sharing the same value under one
`role="presentation"` heading; a run boundary (a different `group` value, including `undefined`)
starts a new heading. Chosen over PrimeNG's nested `{ label, items: [...] }` shape because it
keeps `InoSelectOption[]` a single flat type the filter (§5) and the virtual-scroll integration
(§4) can both operate on directly — a nested shape would need flattening back to indices for both
anyway. The caller owns keeping equal-group options adjacent; the component does not sort.

## 4. Virtual scrolling — flat lists only, reuses T-3 unmodified

`virtualScrollThreshold` (default `100`) switches option rendering from a plain `*ngFor` to
`<ino-virtual-scroller>` (INO-129, T-3) once the **filtered** option count reaches it, via the
`inoVirtualScrollerItem` template slot — no fork or wrapper component. Because `role="option"`
elements inside the scroller are not persistently in the DOM, `aria-activedescendant` (§2) is what
makes this legal per ARIA: a screen reader is told "the option with this id is active" by
reference, not by focus, so it does not matter that the id briefly does not exist in the DOM
between renders the same way any virtualized listbox's activedescendant already works.

Grouped **and** virtualized is not supported in this issue: `<ino-virtual-scroller>`'s plain-array
model has no group-heading row concept, and building one is scope belonging to whichever future
ticket needs a genuinely large grouped list (none of this repo's current consumers do). A grouped
`options` array under the virtual-scroll threshold renders correctly (plain `*ngFor` path, §3); a
grouped array at or above the threshold still virtualizes but group headings are dropped — this is
a deliberate, documented omission (DoD row 6), not a crash.

## 5. Filter vs. editable — two different inputs, not one flag

PrimeNG's `Select` exposes both `filter` (an in-panel search box that narrows the visible list
without touching `value`) and `editable` (the trigger itself becomes free-text). This component
keeps them as separate booleans because they solve different problems and can combine:
`editable` alone lets typed text become the value verbatim when nothing matches; `filter` alone
never changes `value` from typing, only which options are visible. Turning both on is legal
(the editable trigger's own typed text also drives the option filter — see `onEditableInput`);
turning `filter` on with a non-editable trigger opens a **separate** search input inside the panel
so the trigger itself is never a text field.

## 6. No `ControlValueAccessor`

Same `@Input() value` / `@Output() valueChange` banana-in-a-box convention as every other Tier-1
form control in this repo (see `ino-input`'s doc comment) — no Reactive/Template-driven Forms
module is wired up anywhere yet.

## 7. Overlay panel — anchored, not centered; `--ino-elevation-neutral-3`

`position: absolute` under the trigger (`inset-block-start: calc(100% + var(--ino-space-2))`),
matching `ino-datepicker`'s overlay anchoring rather than `ino-modal`'s viewport-centered dialog —
a field-attached control, not a page-level interruption. Uses `--ino-elevation-neutral-3`
(tokens.css: "dropdown, popover" — the role's own doc comment names this exact use case), not the
`--ino-elevation-1/-2` pair Modal/Drawer use for page-level surfaces.

## 8. `anyComponentStyle` budget

This component's compiled SCSS is ~6.2 kB against Angular's 4 kB default `anyComponentStyle`
warning budget — a **warning**, not a build failure (`ng build` passes; see `ino-datepicker`,
`ino-paginator`, `ino-timeline`, all already over the same budget in this repo, confirming the
budget is informational here rather than enforced). Not restructured further for this issue; a
future pass could extract the `.ino-field__option`/`.ino-field__control` shared rules the way
`ino-datepicker`'s SPEC.md §8 documents for its own button-like parts, if the budget is ever made
build-blocking.

## 9. Mobile parity (per plan rev 9 §5) — web-only for this issue, scoped native ports filed separately

- **Capacitor** — not a separate port. The same Angular component/CSS renders in the Capacitor
  WebView; satisfied automatically once DoD rows 1–8 pass plus the 44px touch-target check
  (`--ino-control-height-default` / `--ino-target-comfortable`).
- **React Native and Flutter** — **not shipped in this issue.** This issue used its scope on the
  web core (§1) that three future variants extend; building lower-fidelity native ports in the
  same pass would mean re-touching this component a third time once MultiSelect/AutoComplete
  patterns exist to port consistently with. A follow-up child issue is filed for scoped
  single-selection ports (trigger, filter, clearable, loading, disabled — no groups, no custom
  templates, no virtual scroll, mirroring `ino-datepicker`'s single-selection-only precedent in
  its own SPEC.md §9) once created; see the parent issue thread for the link. Declared `web-only`
  in `scripts/check-theme-parity.mjs`'s component registry with this reasoning, per DoD row 9's
  explicit "record a web-only decision with a reason" path.

## 10. Registry

`scripts/check-theme-parity.mjs`'s `COMPONENT_REGISTRY` (added by INO-131/INO-155) has one
alphabetically-inserted entry for `select`, declared `web-only` on both mobile platforms per §9.

---

## Files touched

- `web/src/app/components/select/ino-select.component.ts`
- `web/src/app/components/select/ino-select.component.html`
- `web/src/app/components/select/ino-select.component.scss`
- `web/src/app/components/select/SPEC.md` (this file)
- `docs/brand/06-angular-components/select.md`
- `docs/brand/06-angular-components/previews/select.html`
- `scripts/check-theme-parity.mjs` (one appended registry entry, DoD row 11)
