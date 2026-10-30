# `<ino-command-menu>` — Command Menu

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B2 row
> `ino-command-menu` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377). Issue: [INO-433](/INO/issues/INO-433).
> Parity benchmark: none — PrimeNG has no `⌘K` command-palette component; this one is modeled on
> the reference implementations named in `SPEC.md` (VS Code, Linear, GitHub, Raycast), not on
> PrimeNG. Nothing here imports PrimeNG.
> Decisions record: `web/src/app/components/command-menu/SPEC.md`.

A global `⌘K`/`Ctrl+K` command palette: a focus-trapped dialog containing a search box, grouped
results, and a "Recent" section shown only while the query is empty. Implements the combobox
pattern — the search input stays focused for the entire interaction, and the highlighted row is
tracked via `aria-activedescendant`, the same model `<ino-autocomplete>` uses.

```html
<ino-command-menu
  [open]="menuOpen"
  (openChange)="menuOpen = $event"
  [groups]="commandGroups"
  [recentItems]="recentCommands"
  (select)="runCommand($event)"
></ino-command-menu>
```

```typescript
commandGroups: InoCommandMenuGroup[] = [
  {
    heading: 'Navigation',
    items: [
      { id: 'home', label: 'Go to home', shortcutLabel: '⌘H' },
      { id: 'settings', label: 'Go to settings', description: 'Account preferences' },
    ],
  },
];
```

The component's host element stays mounted even while closed — only the dialog markup inside is
`*ngIf`'d — so the global `⌘K`/`Ctrl+K` listener can open it from anywhere in the app. No wiring
is required beyond mounting the component once.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `open` | `boolean` | `false` | Whether the palette is currently open |
| `label` | `string` | `'Command menu'` | Accessible name for the `dialog` landmark |
| `searchLabel` | `string` | `'Search commands'` | Accessible name for the search `combobox` — the spec row's "search label" |
| `placeholder` | `string` | `'Type a command or search…'` | Search input placeholder |
| `groups` | `InoCommandMenuGroup[]` | `[]` | The command catalog, pre-grouped into sections |
| `recentItems` | `InoCommandMenuItem[]` | `[]` | Leading, unfiltered group shown only while the query is empty |
| `recentHeading` | `string` | `'Recent'` | Heading text for the recent-items group |
| `emptyMessage` | `string` | `'No results found.'` | Message shown when nothing matches the query |
| `loading` | `boolean` | `false` | Swaps the empty-state message to `'Searching…'` while an async `search`-triggered fetch is in flight |
| `closeOnSelect` | `boolean` | `true` | Closes the palette after a row is activated |
| `closeOnBackdrop` | `boolean` | `true` | Closes the palette on scrim click |
| `closeOnEscape` | `boolean` | `true` | Closes the palette on Escape |
| `hotkey` | `boolean` | `true` | Registers the document-level `⌘K`/`Ctrl+K` open/close toggle; set `false` to opt out |

| Output | Payload | Fires |
|---|---|---|
| `openChange` | `boolean` | Whenever `open` changes, on any path (hotkey, backdrop, Escape, selection, `requestClose()`) |
| `opened` | `void` | Once per real open transition |
| `closed` | `void` | Once per real close transition |
| `select` | `InoCommandMenuItem` | When a row is activated (click, or Enter while active) — the full item, not just its `id` |
| `search` | `string` | `250ms` after the last keystroke in the query — the async-datasource hook, same contract as `<ino-autocomplete>`'s `search` output |

| Method | Signature | Description |
|---|---|---|
| `openMenu()` | `void` | Opens the palette |
| `requestClose()` | `void` | Closes the palette |

### `InoCommandMenuItem` interface

```typescript
export interface InoCommandMenuItem {
  id: string;              // Value carried by `select`
  label: string;           // Visible text — matched by the filter
  description?: string;    // Secondary text — also matched by the filter
  shortcutLabel?: string;  // Right-aligned hint text (e.g. '⌘S'), decorative only, aria-hidden
  disabled?: boolean;      // Renders inert; skipped by keyboard navigation and click
}
```

### `InoCommandMenuGroup` interface

```typescript
export interface InoCommandMenuGroup {
  heading?: string;           // Optional — an un-headed group still renders its items
  items: InoCommandMenuItem[];
}
```

---

## Variants

A single structural variant per the spec row: "⌘K palette: search, grouped results, recent,
keyboard-first." There is no flat/ungrouped mode — pass a single `groups` entry with no `heading`
to render a flat list. See `SPEC.md` §1 for why `groups` is a nested array rather than
`<ino-select>`/`<ino-autocomplete>`'s flat-array-plus-`group`-field shape.

---

## States

Beyond the §2 standard set (default, hover, focus-visible, active, disabled):

**Open** — The palette is mounted, the search input is focused, and the first enabled row (if any)
is active.

**Closed** — Nothing is rendered; only the document-level hotkey listener remains active (when
`hotkey` is `true`).

**Row active** (`aria-selected`) — Tracked by `aria-activedescendant`, moved via `ArrowUp`/
`ArrowDown`/`Home`/`End`, mouse `mouseenter`, or reset to the first enabled row on every open and
on every query change.

**Row disabled** (per-item) — `InoCommandMenuItem.disabled` renders the row as inert text, skipped
by keyboard navigation and ignored on click.

**`empty-results`** — The spec row's extra state beyond the §2 standard set. When no row matches
the current query, the listbox renders a single non-interactive message row instead of any
`role="option"` content: `'Searching…'` while `loading` is `true`, else `emptyMessage`. See
`SPEC.md` §8.

**Loading** — `loading` swaps the empty-state message to `'Searching…'`; it does not suppress or
disable the input or existing rows.

---

## Sizing

"Sizing: fixed" per the spec row — one fixed footprint (`max-inline-size: 640px`,
`max-block-size: min(70vh, 480px)`), not a `sm`/`default`/`lg` axis. A command palette's width is a
single product decision, not something callers pick per invocation. Composes with dense/fluid
density the same way every other control's fixed dimensions do, through the shared
`--ino-control-height`/`--ino-space-*` tokens. See `SPEC.md` §7.

---

## Labels

- **Search label** — `searchLabel` (`aria-label` on the search `combobox`), per the spec row's
  "Labels: search label."
- **Dialog label** — `label` (`aria-label` on the `role="dialog"` panel).
- **Group headings** — `heading` on each `InoCommandMenuGroup`, rendered as a `role="presentation"`
  row above its first item; an un-headed group renders no heading row.
- **Recent heading** — `recentHeading`, same rendering as a group heading.
- **Row label/description truncation** — both `ino-command-menu__option-label` and
  `ino-command-menu__option-description` use `text-overflow: ellipsis` over `white-space: nowrap`;
  the label flexes to fill available width before the description.
- **RTL** — logical properties only (`padding-inline`, `margin-inline-start`,
  `inset-inline-start`); no `left`/`right` in the stylesheet.

---

## Accessibility contract

**Role / ARIA** — Panel is `<div role="dialog" aria-modal="true" [aria-label]="label">`. Search
input is `<input role="combobox" aria-haspopup="listbox" [aria-controls]="listboxId"
aria-expanded="true" aria-autocomplete="list" [aria-activedescendant]="...">`. Results container is
`<div role="listbox">`. Rows are `<div role="option" [aria-selected]="..." [aria-disabled]="...">`.
Group headings are `role="presentation"`.

**Keyboard** — `ArrowDown`/`ArrowUp` move the active row (clamped at the first/last enabled row,
skipping disabled ones). `Home`/`End` jump to the first/last enabled row. `Enter` activates the
active row. `Escape` closes the palette (when `closeOnEscape` is `true`). `Tab` is deliberately
unhandled: the search input is the only tabbable element inside the trap, so `Tab` hits the focus
trap's sentinel and wraps back to itself — see `SPEC.md` §3.

**Combobox + `aria-activedescendant`, not roving-`tabindex`** — The search input stays focused for
the entire interaction; rows are never individually focusable. This is `<ino-autocomplete>`'s
model, chosen so `[inoFocusTrap]` needs zero command-menu-specific logic — it already does the
right thing for a container with exactly one tabbable child. See `SPEC.md` §3.

**Focus trap** — `[inoFocusTrap]` (directive reuse, not `<ino-modal>` composition) on the panel;
Tab/Shift+Tab cycle within the dialog. Closing by any path restores focus to the element that had
it before the palette opened. See `SPEC.md` §4.

**Dismissal** — Scrim click closes when `closeOnBackdrop` is `true`; Escape closes when
`closeOnEscape` is `true`.

**Global hotkey** — `⌘K`/`Ctrl+K` (without `Alt`/`Shift`) toggles open/closed from anywhere in the
document when `hotkey` is `true`; `event.preventDefault()` is called only on a keystroke this
component recognizes, so other modifier combinations are left untouched. See `SPEC.md` §5.

**Contrast** — Panel background, row colors, hover/active/focus states, and disabled rows all
resolve through tokens audited across all three themes by `node scripts/check-theme-parity.mjs`.

**RTL** — Logical properties only; see Labels above.

**State announcements** — Disabled rows (`aria-disabled="true"`), the busy search/listbox
(`aria-busy` while `loading`), and the active row (`aria-activedescendant` + `aria-selected`).

---

## Deliberate omissions

**No whole-component `disabled`/`readonly`/`invalid`.** The §2 standard state set includes these,
but none apply at the whole-component level: this is an action surface, closer in kind to
`<ino-menu>` than to `<ino-select>` — it has no bound value to validate, disable, or make
read-only. Per-item `disabled` exists instead. See `SPEC.md` §7.

**No flat/ungrouped input shape.** Unlike `<ino-select>`/`<ino-autocomplete>`/`<ino-listbox>`
(flat array + per-option `group` field), the catalog is always `InoCommandMenuGroup[]` — a small,
curated, statically-composed set of sections, not a large flat list inferring run-boundary
headings from adjacency. See `SPEC.md` §1.

**No filtered "Recent."** `recentItems` renders only while the query is empty and never
participates in the filter — it drops out entirely the moment the user types one character. See
`SPEC.md` §2.

**Filter excludes `shortcutLabel`.** The substring filter matches `label` and `description` only;
`shortcutLabel` is a decorative, `aria-hidden` hint, not searchable text. See `SPEC.md` §6.

**No `<ino-modal>` composition.** The dialog shell applies `[inoFocusTrap]` directly to its own
panel rather than wrapping `<ino-modal>` as a whole — a command palette has no header/footer/drag/
maximize chrome to inherit, and it anchors near the top of the viewport (`padding-block-start:
12vh`) rather than centering, matching every reference `⌘K` implementation. See `SPEC.md` §4.

---

## Mobile parity

Web-only — the doc 26 §5 row disposition ("Web-only; flagship portal feature"). A `⌘K`-style
global command palette is a desktop/keyboard-driven idiom with no mobile equivalent in this repo's
ported component set; no RN/Flutter component reaches for a global hardware-keyboard shortcut.
Mirrors `ino-dynamic-dialog`/`ino-toolbar`'s web-only disposition in the same table. Doc 26 §6
additionally names this component as the eventual engine behind the docs portal's own search —
wiring that integration is out of scope for this issue, which delivers the reusable component
itself against the §2 contract. See `SPEC.md` §9.

---

## Usage examples

### Grouped catalog with "Recent"

```html
<ino-command-menu
  [open]="open"
  (openChange)="open = $event"
  [groups]="groups"
  [recentItems]="recent"
  (select)="onSelect($event)"
></ino-command-menu>
```

```typescript
groups: InoCommandMenuGroup[] = [
  {
    heading: 'Navigation',
    items: [
      { id: 'home', label: 'Go to home' },
      { id: 'settings', label: 'Go to settings', description: 'Account preferences' },
    ],
  },
  {
    heading: 'Actions',
    items: [
      { id: 'logout', label: 'Log out', shortcutLabel: '⌘L' },
      { id: 'archive', label: 'Archive item', disabled: true },
    ],
  },
];
recent: InoCommandMenuItem[] = [{ id: 'recent-1', label: 'Reopen last report' }];

onSelect(item: InoCommandMenuItem) {
  console.log('Activated:', item.id);
}
```

### Async search

```html
<ino-command-menu [open]="open" [groups]="groups" [loading]="loading" (search)="onSearch($event)">
</ino-command-menu>
```

```typescript
async onSearch(query: string) {
  this.loading = true;
  this.groups = await this.fetchResultsFor(query);
  this.loading = false;
}
```

### Opting out of the global hotkey

```html
<ino-command-menu [hotkey]="false" [open]="open" [groups]="groups"></ino-command-menu>
```
