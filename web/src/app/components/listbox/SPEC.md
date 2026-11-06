# `<ino-listbox>` — component spec

**Issue:** [INO-414](/INO/issues/INO-414) (INO-31 Phase B1, doc 26 §5 row `ino-listbox`)
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5
(rev-2 amendment `a21a93c`). Board approval `f55baa72` on [INO-377](/INO/issues/INO-377).

This file records the decisions the Component Publish Contract (doc 26 §2) requires to be written
down rather than silently made.

---

## 1. Lineage — what's reused vs. built fresh

A listbox is the one Tier-1 selection control that is **always visible**: no trigger button, no
overlay, no collapsed state. That single structural fact is why this is a new component rather
than a mode flag on an existing one, but almost everything *inside* it is reuse:

- **Option grouping** (`group` field, run-boundary heading rows) and **filter predicate**
  (trim → lowercase → substring match) are copied verbatim from `ino-select`
  (`web/src/app/components/select/ino-select.component.ts`).
- **Virtualization threshold and integration** (`<ino-virtual-scroller>` at ≥100 options) matches
  `ino-select`/`ino-multiselect`/`ino-autocomplete`'s own default and wiring.
- **Multi-select toggle-without-closing membership model** — a row click/`Space` toggles
  membership and nothing else changes — is `ino-multiselect`'s model, because there is no "stay
  open" concept to borrow (there's no panel to close in the first place).

What is **not** reused: `ino-select`'s trigger/overlay/combobox core and its
`aria-activedescendant` focus model. See §2.

---

## 2. ARIA pattern: roving `tabindex`, not `aria-activedescendant`

`ino-select` uses `aria-activedescendant` because, under `<ino-virtual-scroller>`, most option
rows are **absent from the DOM** most of the time — real focus has to stay on the combobox input,
and the "active" row is only ever a logical pointer. A listbox has no combobox input to park focus
on; real DOM focus has to live somewhere, and APG's Listbox pattern offers exactly one answer for
that: roving `tabindex` (`role="option"` rows take real focus one at a time; exactly one carries
`tabindex="0"`, every other row `tabindex="-1"`).

This creates a genuine tension with virtualization: a row can't receive real DOM focus if it isn't
rendered. `focusActiveOption()` resolves it by always moving the virtual scroller's window first
(`scrollToIndex()`), then looking the row up by id on the next microtask once change detection has
re-rendered the window. This is strictly sequenced — the row is guaranteed to exist by the time
the lookup runs — so roving `tabindex` works even though most rows are off-DOM most of the time.

The row lookup uses an attribute selector (`[id="…"]`) rather than `#${CSS.escape(id)}` — the
generated ids (`<listboxId>-opt-<index>`) are always plain alphanumeric-and-hyphen strings that
never need escaping, and `CSS.escape` isn't implemented in every runtime (notably: not in jsdom,
which this component's own unit tests run under).

---

## 3. `value: string | string[]` — one component, not two

`ino-select`/`ino-multiselect` are two separate components with two separate value types.
`ino-autocomplete` instead uses one component with a `multiple` flag and a union value type. This
component follows the `ino-autocomplete` precedent: single/multiple is one flag away, not a
different import, because — unlike select vs. multiselect, which differ in trigger chrome (single
value text vs. chip row) — a listbox's single-vs-multiple rendering difference is small (a
checkbox per row, `aria-multiselectable`) and doesn't justify a second component.

`valuesArray` (a getter) normalizes `value` to an array regardless of `multiple`, so every
selection/membership check in the component has exactly one read path.

---

## 4. Filter box is always visible, and defaults on

`ino-select`'s filter lives *inside* the dropdown panel — it only exists while the panel is open.
A listbox has no panel to gate it behind, so the filter box renders above the list unconditionally
whenever `filter` is `true`. Doc 26 §5 lists "filter box" as part of this component's *baseline*
structure (not an opt-in extra, the way it reads for some other rows), so `filter` defaults to
`true` rather than `false`.

`ArrowDown` in the filter box moves real focus into the list (there is no
`aria-activedescendant` relationship from the filter input to the rows to lean on, so "enter the
list" has to be an explicit focus move). `Escape` clears the query when non-empty; a second
`Escape` is not intercepted (no panel to close).

---

## 5. Keyboard map and focus/selection coupling

| Key | Single-selection | Multi-selection |
|---|---|---|
| `ArrowDown`/`ArrowUp` | Move roving tabindex **and** select the newly-focused row (clamped, no wrap) | Move roving tabindex only |
| `Home`/`End` | Jump to first/last enabled row, select it | Jump to first/last enabled row, focus only |
| `Space`/`Enter` | Select the focused row | Toggle membership of the focused row |
| Printable character | Typeahead: jump to next row whose label starts with the buffered string (500 ms reset window, matching `ino-select`'s own buffer) | Same — typeahead only moves focus, consistent with Arrow keys |
| Click | Select (replace) | Toggle membership |

The single-selection focus/selection coupling on Arrow/Home/End is deliberate: APG's Listbox
pattern couples focus and selection for single-select listboxes using arrow keys. Multi-selection
keeps them decoupled — `Space` is the only key that changes `value`, matching `ino-multiselect`'s
toggle model, where arrowing through options to *look* at them must not silently add every row
you pass over to the selection.

---

## 6. States: `selected` / `filtered-empty`

Beyond the §2 standard state set (default/hover/focus-visible/active/disabled/readonly/invalid/
loading), doc 26 §5 calls out two states specific to this component:

- **`selected`** (`.ino-listbox--selected` host class, `valuesArray.length > 0`) — styling hook for
  contexts that want to visually distinguish "a choice has been made" at the component level, not
  just on the individual row.
- **`filtered-empty`** (`.ino-listbox--filtered-empty` host class) — a *non-empty* query narrowed
  the list to nothing. Deliberately distinct from the plain empty-options starting state (empty
  `options` input, no query): the empty message text differs ("No options match your filter." vs.
  "No options.") and only the filtered case is a state a user action produced.

---

## 7. Fixed-height sizing (doc 26 §5 "Sizing: fixed-height scales")

The list viewport is a fixed 8 rows tall at every size — the same row count `ino-select`'s own
overlay panel already uses — via `--ino-listbox-scroll-height: calc(var(--ino-control-height) *
8)`. The row count is constant; only the per-row height changes with density
(`--ino-control-height` itself, from the shared sm/default/lg control-size tokens). This value
feeds both the non-virtualized `<ul>`'s `max-block-size` and the virtualized path's
`scrollHeight` input, so the viewport height never depends on whether virtualization kicked in.

---

## 8. Mobile: full-screen sheet, reusing `ino-multiselect`'s port

Doc 26 §5 calls for "mobile = full-screen sheet reuse of multiselect." An always-visible inline
list is a web-only layout: a phone screen has no room to dedicate to a permanently-expanded
listbox alongside the rest of a form. Both mobile ports therefore render a **trigger** (same
shape as `InoMultiSelect`'s: a tappable field showing the current selection) that opens a
near-full-height modal sheet containing the filterable, scrollable option list — i.e. the mobile
port is structurally `InoMultiSelect`'s sheet, not `InoSelect`'s (which is a shorter sheet sized to
content). Single-selection mode closes the sheet immediately on row tap (no explicit confirm step,
matching `InoSelect`'s own close-on-select); multiple-selection mode keeps the sheet open across
taps and requires an explicit dismiss, matching `InoMultiSelect`.

**Flutter** (`mobile/flutter/lib/widgets/ino_listbox.dart`) and **React Native**
(`mobile/react-native/src/components/InoListbox.tsx`) both port: single/multiple selection, the
always-rendered filter box (inside the sheet, not above an inline list — there is no inline list
on mobile), disabled rows, and sm/md/lg sizing on the trigger. **Not ported**: option groups and
virtual scrolling — same omissions `InoMultiSelect`'s own SPEC documents, for the same reason
(no shared build graph, and mobile option lists in this product are short enough that a plain
`ListView.builder`/`FlatList` is sufficient).
