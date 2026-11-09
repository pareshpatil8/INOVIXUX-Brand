# `<ino-megamenu>` — Mega Menu

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B5 row
> `ino-megamenu` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377). Issue: [INO-495](/INO/issues/INO-495).
> Parity benchmark: PrimeNG 22.1.1 `MegaMenu` (`specs/primeng/llms-22.1.1.txt`). PrimeNG is a
> benchmark, **not a runtime dependency**; nothing here imports it.
> Decisions record: `web/src/app/components/megamenu/SPEC.md`.

A menubar whose top-level items open multi-column panels of grouped links — the WAI-ARIA APG
**Menubar** pattern, with each open panel laid out as labelled columns of links rather than a flat
list.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `items` | `InoMegaMenuItem[]` | `[]` | Top-level entries; any item with `columns` is a panel trigger |
| `ariaLabel` | `string` | `'Main menu'` | Accessible name for the `menubar` |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Which arrow pair moves the bar vs. opens a panel. See [Keyboard](#keyboard) |
| `size` | `'compact' \| 'comfortable'` | `'comfortable'` | Re-points the **bar's** control tokens only — composes with dense/fluid density. The panel always uses the fixed overlay-compact scale. See [Size API](#size-api) |
| `activeHref` | `string \| undefined` | `undefined` | `href` of the current top-level item or panel link — drives `aria-current="page"` + bold styling |
| `readonly` | `boolean` | `false` | Renders every leaf as inert text; panels still open/close |
| `loading` | `boolean` | `false` | Renders a skeleton bar instead of `items` |
| `emptyLabel` | `string` | `'No items'` | Message shown when `items` is empty and not `loading` |

| Output | Payload | Fires |
|---|---|---|
| `itemClick` | `InoMegaMenuItem \| InoMegaMenuLink` | When a navigable or command leaf (top-level or panel) is activated |

### Data shape

```typescript
export interface InoMegaMenuLink {
  label: string;
  icon?: string;
  description?: string;        // One-line supporting text under the label
  href?: string;
  command?: (link: InoMegaMenuLink) => void;
  disabled?: boolean;
}

export interface InoMegaMenuColumn {
  heading?: string;             // Omit for an unlabelled (still role="group") column
  items: InoMegaMenuLink[];
}

export interface InoMegaMenuItem {
  label: string;
  icon?: string;
  href?: string;
  command?: (item: InoMegaMenuItem) => void;
  disabled?: boolean;
  columns?: InoMegaMenuColumn[]; // Presence makes this item a panel trigger
}
```

A top-level item or panel link with `href` navigates via Angular Router; without `href` but with
`command`, it only emits `(itemClick)`. A top-level item with `columns` never navigates itself —
it is a panel trigger only.

### Size API

"Sizing: compact/comfortable" per the spec row applies to the bar only. `comfortable` (default)
reads the unsuffixed `--ino-control-height`/`-gap`/`-padding-inline-roomy`/`-font-size`/
`-icon-size` aliases; `[data-size="compact"]` re-points them to the `-sm` tier, the same shape
`ino-panel-menu` uses, re-declared inside both `tokens.css` §10 dense/fluid blocks so density
composes on top. The open panel's link rows always read `--ino-control-*-compact` (tokens.css §12)
regardless of `size` — see `SPEC.md` §4 for why the bar and the panel deliberately use two
different sizing models.

### Keyboard

**Top-level bar** — one roving tab stop:

| Key | Effect |
|---|---|
| `ArrowRight`/`ArrowLeft` (horizontal) or `ArrowDown`/`ArrowUp` (vertical) | Move to the next/previous non-disabled top-level item, wrapping |
| `Home`/`End` | Jump to the first/last non-disabled top-level item |
| `ArrowDown` (horizontal) / `ArrowRight` (vertical), `Enter`, `Space` | Open the focused item's panel (if it has one) and focus its first link |
| `Escape` | Close this item's open panel |

**Open panel** — one roving 2D tab stop:

| Key | Effect |
|---|---|
| `ArrowDown`/`ArrowUp` | Move within the current column, wrapping |
| `ArrowRight`/`ArrowLeft` | Move to the adjacent column; at the panel's edge, move to and open the adjacent top-level item's panel |
| `Home`/`End` | Jump to the first/last link in the current column |
| `Escape` | Close the panel, return focus to its trigger |

---

## States

**Default** — Triggers and panel links render `color: var(--ino-color-on-surface)`, no background.

**Hover** — `background: var(--ino-color-surface-sunken)` on the hovered trigger/link.

**Focus-visible** — `outline: var(--ino-focus-ring)` / `outline-offset: var(--ino-focus-ring-offset)`.

**Active (pressed)** — Same `--ino-color-surface-sunken` fill as hover, on pointer-down.

**Open-panel** — The spec row's additional state. `aria-expanded` on the trigger, panel rendered
with `role="menu"` and `aria-labelledby` pointing back at the trigger.

**Active-item** — The spec row's second additional state. `activeHref` match renders
`aria-current="page"` plus bold `on-surface` text (not an accent color — see `SPEC.md` §5).

**Disabled (per top-level item)** — `item.disabled` renders native `disabled`/`aria-disabled` and
removes the item from Arrow-key navigation.

**Readonly (whole menu)** — `[readonly]="true"` renders every leaf as inert text; panels still
open and close. See `SPEC.md` §6.

**Loading** — `[loading]="true"` swaps the bar for three decorative skeleton bars.

**Empty** — `items.length === 0` and not `loading` renders `emptyLabel`.

---

## Accessibility contract

**Role / ARIA** — WAI-ARIA APG **Menubar**: `ul[role="menubar"][aria-label][aria-orientation]`,
every trigger and panel link `role="menuitem"`, an open panel `role="menu"` with
`aria-labelledby` pointing at its trigger's id, each column `role="group"` (`aria-labelledby` its
heading id when one is given). A panel trigger carries `aria-haspopup="menu"` and
`aria-expanded`.

**Keyboard** — Full Arrow/Esc map per [Keyboard](#keyboard) above — the spec row's explicit
requirement. One tab stop on the bar (roving `tabindex`), a second roving 2D tab stop inside an
open panel; `Tab`/focus-out closes the panel.

**Focus behavior** — Opening a panel via keyboard moves focus to its first link; `Escape` returns
focus to the trigger that opened it. Clicking a panel link closes the panel without moving focus
elsewhere (the navigation itself takes over).

**Contrast** — Trigger/link text, hover, active, and disabled colors resolve through tokens
audited across all three themes by `node scripts/check-theme-parity.mjs`.

**RTL** — All spacing (`padding-inline`, `inset-inline-start`) uses logical properties; the panel
flips sides correctly under `dir="rtl"`.

**State announcements** — `aria-expanded`/`aria-haspopup`/`aria-controls` per trigger,
`aria-current="page"` on the active item/link, `aria-disabled="true"` on a disabled top-level item
or inert panel link, `aria-busy="true"` on the `nav` landmark while `loading`.

---

## Deliberate omissions

**PrimeNG mapping.** PrimeNG 22.1.1 `MegaMenu`'s `model` (`MegaMenuItem[]`, each with an
`items: MegaMenuItem[][]` grid of columns) maps onto this component's `items`/`columns`/
`column.items`, flattened to exactly two levels (column → link) rather than PrimeNG's own
arbitrarily-nested `items` grid cells.

**No invalid/error state.** The §2 standard state set includes invalid/error, but a mega menu has
no bound value to validate — it is a navigation structure, not a form control. See `SPEC.md` §7
(same reasoning `ino-breadcrumb`'s and `ino-panel-menu`'s own `SPEC.md`s record).

**No hover-to-open.** Deliberately click/keyboard-only — see `SPEC.md` §8 for why a hover-intent
timer was not implemented.

---

## Mobile parity

**Web-only** per the spec row's Notes/mobile disposition — the same disposition doc 26 gives
`ino-context-menu`/`ino-toolbar` for the same reason (a desktop/wide-viewport site-header idiom).
No React Native or Flutter port ships with this issue.
