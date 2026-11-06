# `<ino-menu>` — Menu

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B2 row
> `ino-menu` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377). Issue: [INO-425](/INO/issues/INO-425).
> Parity benchmark: PrimeNG 22.1.1 `Menu` (flat case) / `TieredMenu` (nested-submenu case)
> (`specs/primeng/llms-22.1.1.txt`) — benchmarks only, **not a runtime dependency**; nothing here
> imports either.
> Decisions record: `web/src/app/components/menu/SPEC.md`.

A vertical menu, rendered either inline (`mode="static"`, e.g. a sidebar) or as a popup opened
from a trigger button (`mode="popup"`). Absorbs PrimeNG `Menu` (flat case) and `TieredMenu`
(nested-submenu case) into one component. Implements the WAI-ARIA APG menu/menubutton pattern:
`role="menu"` container, `role="menuitem"` entries, roving `tabindex` focus management, and the
full Arrow/Home/End/Escape/typeahead keyboard map doc 26 §5's row calls for.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `items` | `InoMenuItem[]` | `[]` | Flat (or recursively nested, via `children`) item list. Ignored entirely when `sections` is non-`null` — see [`sections` precedence](#sections-is-non-null-takes-precedence) |
| `sections` | `InoMenuSection[] \| null` | `null` | Grouped rendering. When non-`null` (including `[]`), takes exclusive precedence over `items` |
| `mode` | `'static' \| 'popup'` | `'static'` | `static` renders inline as `role="menu"` on the host; `popup` renders nothing until opened, then a `position: fixed` panel anchored to a trigger |
| `open` | `boolean` | `false` | Popup-mode visibility. Two-way via `openChange`; prefer the imperative `show()`/`hide()`/`toggle()` methods from a trigger's click handler |
| `anchor` | `HTMLElement \| ElementRef<HTMLElement> \| null` | `null` | Popup-mode anchor element. When omitted, inferred from the triggering event's `currentTarget` passed to `show()`/`toggle()` |
| `position` | `InoOverlayPosition` | `'bottom'` | Popup placement relative to `anchor`, via the shared `computeOverlayPlacement` primitive (viewport-collision aware) |
| `size` | `'compact' \| 'comfortable'` | `'comfortable'` | Re-points the bare `--ino-control-*` aliases to the `-compact` tier. See [Size API](#size-api) |
| `ariaLabel` | `string` | `'Menu'` | Accessible name for the `role="menu"` container |
| `emptyLabel` | `string` | `'No items'` | Placeholder text when the resolved item list has zero entries |

| Output | Payload | Fires |
|---|---|---|
| `openChange` | `boolean` | When the popup opens or closes (programmatically or via `[open]` binding) |

| Method | Signature | Description |
|---|---|---|
| `show(event?: Event)` | `void` | Opens the popup. `event?.currentTarget` supplies the anchor when `[anchor]` wasn't bound |
| `hide()` | `void` | Closes the popup and returns focus to the anchor |
| `toggle(event?: Event)` | `void` | Opens if closed, closes if open — the typical trigger-button click handler |

### `InoMenuItem` interface

```typescript
export interface InoMenuItem {
  label: string;
  icon?: string;                          // Leading glyph, aria-hidden
  href?: string;                           // In-app route, bound via [routerLink]
  command?: (item: InoMenuItem) => void;   // Activation callback
  disabled?: boolean;                      // Inert; skipped by keyboard nav, typeahead and clicks
  children?: InoMenuItem[];                // Nested submenu — unbounded depth
}
```

### `InoMenuSection` interface

```typescript
export interface InoMenuSection {
  label?: string;        // Omit for an unlabelled group
  items: InoMenuItem[];
}
```

### `sections` is non-null-takes-precedence

`sections` and `items` are not merged. Whenever `sections !== null` — including the degenerate
case `sections = []` — the grouped view renders exclusively and `items` is ignored, even if
non-empty. An explicitly-passed empty array is read as "I'm managing sections, there are zero of
them right now," not as "fall back to `items`." A caller who wants the flat form simply doesn't
bind `[sections]` (its default is `null`). See `SPEC.md` §1.

### Size API

Per the spec row, there is no `sm`/`default`/`lg` axis — only `compact`/`comfortable`.
`comfortable` (the default, unmarked tier) reads the bare `--ino-control-height/-padding-inline/
-font-size/-icon-size/-gap` aliases; `[data-size='compact']` re-points those same five aliases to
the `--ino-control-*-compact` tier. Declared on `:host`, so the popup panel and every nested
submenu — all DOM descendants of the host even though they render `position: fixed` — inherit the
correct tier for free. See `SPEC.md` §7.

### Positioning

Popup-mode placement and nested-submenu placement both call `computeOverlayPlacement`
(`../overlay/overlay-position.ts`) directly rather than wrapping `<ino-popover>` — a popover's
mandatory `role="dialog"` + accessible-heading contract is the wrong semantic shape for an APG
`role="menu"`. Nested submenus anchor to the parent item's right edge (`align: 'start'`), recomputed
against the parent item's real bounding rect and the submenu's own rendered size at open time. See
`SPEC.md` §2, §12.

---

## States

**Default** — Items render `color: var(--ino-color-on-surface)` with no background.

**Hover** — Non-disabled items receive `background: var(--ino-color-surface-sunken)` and
`color: var(--ino-color-accent)`.

**Focus-visible** — The roving-`tabindex="0"` item receives `outline: var(--ino-focus-ring)` with
`outline-offset: var(--ino-focus-ring-offset, -2px)`, plus the same sunken background as hover.

**Active (pressed)** — Non-disabled items receive `color: var(--ino-color-accent-active)` on
pointer-down.

**Open** — The spec row's additional state beyond the §2 standard set. In `popup` mode, the panel
is visible, positioned against `anchor`, and the first non-disabled item is focused. A submenu's
own "open" is tracked independently per depth (`openPath`).

**Active-item** — The spec row's other additional state: whichever item currently holds the
roving `tabindex="0"` at its depth — rendered identically to focus-visible since the two always
coincide (roving tabindex never detaches from real DOM focus).

**Disabled (per-item)** — Items with `disabled: true` render at `opacity: 0.6`,
`color: var(--ino-color-on-surface-muted)`, `cursor: not-allowed`, `aria-disabled="true"`, and
`pointer-events: none`; skipped entirely by keyboard navigation and typeahead.

**Empty** — When the resolved item list (root level, after flattening `sections`/`items`) has zero
entries, one inert `role="menuitem" aria-disabled="true"` entry reading `emptyLabel` renders
instead of an empty `role="menu"` — see `SPEC.md` §8.

---

## Sizing &amp; density

`compact`/`comfortable` per the spec row (see [Size API](#size-api)), composing with the page's
dense/fluid density mode the same way every other `--ino-control-*`-driven component does — no
component-local density override.

---

## Accessibility contract

**Role / ARIA** — `role="menu"` on the host (`static` mode) or the popup/submenu panel (`popup`
mode); `aria-label` carries `ariaLabel`. Each actionable entry is a single `<a role="menuitem">`
regardless of whether it has `href`, a `command`, or `children` — an item's accessible role never
changes shape across those three cases (see `SPEC.md` §3). Items with `children` carry
`aria-haspopup="menu"` and `aria-expanded` reflecting whether their submenu is open. Section
groups (when `sections` is used) render `role="group"` with `aria-label` (no visible heading text
— see `SPEC.md` §6); separators between sections are `role="separator"`.

**Keyboard** — Full map, roving `tabindex` throughout (not `aria-activedescendant` — `SPEC.md`
§4):

| Key | Behavior |
|---|---|
| `ArrowDown` / `ArrowUp` | Move roving focus to the next/previous non-disabled item in the current level, wrapping |
| `ArrowRight` | Open the focused item's submenu (if it has `children`) and focus its first enabled child |
| `ArrowLeft` | Close the current submenu level (depth > 0) and return focus to its parent; no-op at depth 0 |
| `Home` / `End` | Jump to the first/last enabled item in the current level |
| `Enter` / `Space` | Open the submenu (if `children`); otherwise call `command` and navigate `href` |
| `Escape` | Close the deepest open submenu, one level at a time; with nothing open, close the whole popup (no-op in `static` mode) |
| any printable character | Type-ahead — see below |

**Type-ahead.** Case-insensitive buffer resetting 500ms after the last keystroke; moves focus
within the current level only (never crossing submenu boundaries) to the next enabled item whose
label starts with the buffer, wrapping forward from the focused item. Repeating one character
(`"mmm"`) cycles through every match for that letter rather than requiring literal
label-starts-with-`"mmm"`. See `SPEC.md` §5.

**Focus return (popup mode)** — Three independent triggers close an open popup, all returning
focus to `anchor` (or the event's `currentTarget` when `show()`/`toggle()` inferred it): click
outside the panel and anchor, focus leaving the panel tree (`focusout` with a `relatedTarget`
outside the panel — covers AT-driven Tab-out with no pointer event), and `Escape` with nothing
open. `static` mode has none of this wiring — nothing to click away from or tab out of that would
mean "close." See `SPEC.md` §11.

**Contrast** — Item colors, hover/focus/active states, and disabled items all resolve through
tokens audited across all three themes by `node scripts/check-theme-parity.mjs`.

**RTL** — Logical properties only (`inset-inline-start`/`-end`, `padding-inline`,
`margin-inline`). No `left`/`right` in the stylesheet.

---

## Deliberate omissions

**PrimeNG mapping.** PrimeNG 22.1.1 `Menu`'s flat `model: MenuItem[]` maps onto `items`; grouped
`model: MenuItem[]` (with `items`-in-`items` groups) maps onto `sections`; `TieredMenu`'s nested
`items` maps onto `InoMenuItem.children` at any depth. One component absorbs both PrimeNG
components per doc 26 §5's row.

**No `readonly`/`loading` states.** A menu's `items`/`sections` are an ephemeral, data-driven
snapshot, not a bound form value with its own read-only/loading lifecycle — a menu whose items
aren't ready simply isn't rendered with `[items]` bound yet (`static`) or isn't `show()`n yet
(`popup`). See `SPEC.md` §9.

**No `invalid`/`error` state.** A menu is not a form control and has no bound value to validate
against. See `SPEC.md` §10.

**No hover-to-open for submenus.** Unlike `ino-context-menu`'s submenus (hover-opened, appropriate
to a right-click overlay), `ino-menu` opens a submenu only via click, `Enter`/`Space`, or
`ArrowRight` — a vertical sidebar menu staying open on casual mouse-over would be a worse default
than requiring a deliberate action. See `SPEC.md` §12.

---

## Mobile parity

No mobile ports (per the spec row's "Web-only (mobile uses action sheets)" disposition). Neither
React Native nor Flutter has a standard "anchored dropdown menu with nested submenus" idiom; both
platforms' idiomatic equivalent for "open a menu of actions" is a bottom/full-screen action sheet
— a different component shape (no nesting, no anchored positioning, typically modal) out of scope
for this ticket. See `SPEC.md` §13.

---

## Usage examples

### Static sidebar menu with sections

```html
<ino-menu [sections]="sidebarSections" ariaLabel="Account navigation"></ino-menu>
```

```typescript
sidebarSections: InoMenuSection[] = [
  { label: 'Account', items: [
    { label: 'Profile', icon: '◉', href: '/account/profile' },
    { label: 'Security', icon: '◈', href: '/account/security' },
  ] },
  { label: 'Billing', items: [
    { label: 'Invoices', href: '/account/invoices' },
    { label: 'Payment methods', href: '/account/payment-methods' },
  ] },
];
```

### Popup menu from a trigger button

```html
<button type="button" (click)="actionsMenu.toggle($event)">Actions</button>
<ino-menu #actionsMenu mode="popup" [items]="actions"></ino-menu>
```

```typescript
actions: InoMenuItem[] = [
  { label: 'Rename', command: (item) => this.rename() },
  { label: 'Duplicate', command: (item) => this.duplicate() },
  {
    label: 'Export',
    children: [
      { label: 'Export as CSV', command: () => this.exportCsv() },
      { label: 'Export as PDF', command: () => this.exportPdf() },
    ],
  },
  { label: 'Delete', disabled: true },
];
```
