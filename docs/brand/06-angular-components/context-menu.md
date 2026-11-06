# `<ino-context-menu>` — Context Menu

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B2 row
> `ino-context-menu` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377). Issue: [INO-427](/INO/issues/INO-427).
> Parity benchmark: PrimeNG 22.1.1 `ContextMenu` (`specs/primeng/llms-22.1.1.txt`) — PrimeNG is a
> benchmark, **not a runtime dependency**; nothing here imports it.
> Decisions record: `web/src/app/components/context-menu/SPEC.md`.

A right-click (or long-press) triggered overlay menu with nested submenu support. Implements the
WAI-ARIA APG menu pattern: `role="menu"` container with roving `tabindex` focus management,
Arrow-key navigation, and explicit focus return to the invoking element on close.

---

## API

### Directive

| Directive | Selector | Description |
|---|---|---|
| `inoContextMenu` | `[inoContextMenu]` | Attaches a context menu to the host element; opens on right-click/contextmenu event |

| Input | Type | Default | Notes |
|---|---|---|---|
| `inoContextMenu` | `InoContextMenuItem[]` | — | Menu items to display (required) |
| `inoContextMenuAriaLabel` | `string` | `'Context menu'` | Accessible label for the menu container |

### Component (programmatic use)

| Input | Type | Default | Notes |
|---|---|---|---|
| `items` | `InoContextMenuItem[]` | `[]` | Menu items to display |
| `ariaLabel` | `string` | `'Context menu'` | Accessible label for the menu container |
| `visible` | `boolean` | `false` | Whether the menu is currently open |

| Output | Payload | Fires |
|---|---|---|
| `visibleChange` | `boolean` | When menu opens or closes |
| `itemClick` | `{ originalEvent: Event; item: InoContextMenuItem }` | When a menu item is activated |

| Method | Signature | Description |
|---|---|---|
| `show(event: MouseEvent, returnFocus?: HTMLElement)` | `void` | Opens the menu at cursor position; stores return-focus element |
| `hide()` | `void` | Closes the menu and returns focus to the invoking element |

### `InoContextMenuItem` interface

```typescript
export interface InoContextMenuItem {
  label?: string;             // Visible text
  icon?: string;              // Optional glyph rendered before label, aria-hidden
  command?: (event: { originalEvent: Event; item: InoContextMenuItem }) => void;  // Callback on activation
  disabled?: boolean;         // Renders as inert text with aria-disabled; skipped by keyboard nav
  separator?: boolean;        // Renders a divider line instead of an actionable item
  children?: InoContextMenuItem[];  // Nested submenu items
  data?: any;                 // Arbitrary user data
}
```

### Size API

"Sizing: compact" per the spec row — no `sm`/`default`/`lg` axis. Reads
`--ino-control-height-compact`, `--ino-control-gap-compact`, `--ino-control-font-size-compact`,
and `--ino-control-padding-inline-compact` unconditionally. Context menus are always
space-efficient overlays; they do not compose with dense/fluid density modes (see `SPEC.md` §9).

### Positioning

Opens at the exact cursor position (`event.clientX`, `event.clientY`) where the right-click
occurred, using `position: fixed`. Viewport-edge collision detection flips the menu leftward or
upward if it would overflow the right or bottom edge. See `SPEC.md` §2 for why this differs from
popover/dropdown anchor-to-element positioning.

### Nested submenus

Items with `children: InoContextMenuItem[]` render a `›` chevron and open a nested submenu.
On desktop (pointer-fine), the submenu opens on `mouseenter` after a 200ms delay; on touch
(pointer-coarse), the first tap opens the submenu without activating the item itself. Submenus
anchor to the right edge of the parent menu (flipping leftward on viewport overflow) and support
unbounded nesting depth. See `SPEC.md` §4.

---

## States

**Default** — Menu items render `color: var(--ino-color-on-surface)` with no background.

**Hover** — Non-disabled items receive `background: var(--ino-color-surface-sunken)` and
`color: var(--ino-color-accent)`.

**Focus-visible** — The focused item (roving `tabindex="0"`) receives
`outline: var(--ino-focus-ring)` with `outline-offset: var(--ino-focus-ring-offset)`, plus the
same sunken background as hover.

**Active (pressed)** — Non-disabled items receive `color: var(--ino-color-accent-active)` on
pointer-down.

**Open** — The spec row's additional state beyond the §2 standard set. The menu overlay is
visible, anchored at the cursor position, and the first item is focused (unless all items are
disabled/separators).

**Disabled (per-item)** — Items with `disabled: true` render as
`color: var(--ino-color-on-surface-muted)`, `opacity: 0.6`, `cursor: not-allowed`, with
`aria-disabled="true"`. Skipped by keyboard navigation (roving `tabindex` never lands on them).

**Separator** — Items with `separator: true` render a `<div role="separator">` horizontal rule
(1px `background: var(--ino-color-border)`). Not focusable; skipped by keyboard navigation.

**Submenu indicator** — Items with non-empty `children` render a `›` chevron at the trailing edge
(`color: var(--ino-color-on-surface-muted)`). Chevron is `aria-hidden`; the presence of a submenu
is communicated via keyboard behavior (Right Arrow opens it).

---

## Accessibility contract

**Role / ARIA** — Root overlay is `<div role="menu" aria-label="Context menu">` (or the
`ariaLabel` override). Menu items are `<div role="menuitem">` (or `role="separator"` for
dividers). No `aria-activedescendant` — roving `tabindex` is used instead (see `SPEC.md` §6).

**Keyboard** — Arrow keys (Up/Down) move roving focus between navigable items (skipping separators
and disabled items). Right Arrow opens a submenu (if the focused item has `children`); Left Arrow
closes the current submenu. Home/End jump to the first/last navigable item. Enter/Space activate
the focused item. Escape closes the menu (or the current submenu if nested), returning focus to
the invoking element.

**Focus trap** — Tab/Shift+Tab cycle within the menu's items rather than escaping to the rest of
the page. The menu is the only interactive surface while open (click-outside closes it).

**Focus return** — On close (Escape, click-outside, or item activation), focus explicitly returns
to the element that invoked the menu — the `inoContextMenu` directive's host element, captured
via `document.activeElement` before the menu opens. See `SPEC.md` §3.

**Separators skip navigation** — Items with `separator: true` are `role="separator"` and never
receive focus. Arrow keys skip over them. See `SPEC.md` §13.

**Contrast** — Menu background, item colors, hover/focus states, and disabled items all resolve
through tokens audited across all three themes by `node scripts/check-theme-parity.mjs`.

**RTL** — Logical properties only (`inset-inline-start`, `inset-inline-end`,
`padding-inline`). No `left`/`right` in the stylesheet; submenus anchor to the inline-end edge
(right in LTR, left in RTL).

**State announcements** — Disabled items (`aria-disabled="true"`), separators (`role="separator"`),
menu container (`aria-label` on `role="menu"`).

---

## Deliberate omissions

**PrimeNG mapping.** PrimeNG 22.1.1 `ContextMenu`'s `model` (`MenuItem[]`) maps directly onto
this component's `items: InoContextMenuItem[]`. PrimeNG's `target` input (for attaching the menu
to an element by query selector) is replaced here by the `inoContextMenu` directive, which is
more declarative and type-safe.

**No `readonly` or `loading` states.** Context menus are ephemeral overlays triggered by user
action — they do not have a persistent "loading items" or "display-only" mode the way form
controls do. See `SPEC.md` §7.

**No `invalid`/`error` state.** A context menu is not a form control and has no bound value to
validate. See `SPEC.md` §8.

**No TemplateRef support (B2 scope).** The `inoContextMenu` directive accepts only
`InoContextMenuItem[]` arrays in this B2 implementation. PrimeNG's template-driven menu structure
(`ng-template pTemplate="item"`) is omitted — the array API covers the primary use case and keeps
the directive simple. Template support may be added in a later phase if a product screen requires
custom per-item rendering beyond `label`/`icon`/`children`.

---

## Mobile parity

No mobile ports (per the spec row's "Web-only" disposition). Mobile platforms have native
context-menu equivalents (iOS long-press action sheets, Android context menus) that are not
implemented as web overlays. See `SPEC.md` §10 for full rationale.

---

## Usage examples

### Basic context menu

```html
<div
  [inoContextMenu]="menuItems"
  style="padding: 2rem; border: 1px solid var(--ino-color-border);"
>
  Right-click me to open the context menu
</div>
```

```typescript
menuItems: InoContextMenuItem[] = [
  {
    label: 'New',
    icon: '+',
    command: () => console.log('New clicked'),
  },
  {
    label: 'Open',
    icon: '📁',
    command: () => console.log('Open clicked'),
  },
  { separator: true },
  {
    label: 'Delete',
    icon: '🗑',
    disabled: true,
  },
];
```

### Nested submenus

```html
<div [inoContextMenu]="nestedMenu">
  Right-click for nested menu
</div>
```

```typescript
nestedMenu: InoContextMenuItem[] = [
  {
    label: 'File',
    children: [
      { label: 'New File', command: () => console.log('New file') },
      { label: 'Open File', command: () => console.log('Open file') },
      { separator: true },
      {
        label: 'Recent',
        children: [
          { label: 'Document 1.txt' },
          { label: 'Document 2.txt' },
        ],
      },
    ],
  },
  {
    label: 'Edit',
    children: [
      { label: 'Cut' },
      { label: 'Copy' },
      { label: 'Paste' },
    ],
  },
];
```

### Programmatic control

```html
<ino-context-menu
  #contextMenu
  [items]="items"
  [visible]="isMenuVisible"
  (visibleChange)="isMenuVisible = $event"
  (itemClick)="onItemClick($event)"
></ino-context-menu>

<button (click)="showMenuAt($event)">
  Show menu (programmatically)
</button>
```

```typescript
@ViewChild('contextMenu') contextMenu!: InoContextMenuComponent;
isMenuVisible = false;
items: InoContextMenuItem[] = [
  { label: 'Action 1' },
  { label: 'Action 2' },
];

showMenuAt(event: MouseEvent) {
  this.contextMenu.show(event);
}

onItemClick(event: { originalEvent: Event; item: InoContextMenuItem }) {
  console.log('Item clicked:', event.item.label);
}
```
