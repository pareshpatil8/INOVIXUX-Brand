# `<ino-orderlist>` — OrderList

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B3 row
> `ino-orderlist + ino-picklist` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377).
> Preview: [`previews/orderlist.html`](previews/orderlist.html).
> Decisions record: `web/src/app/components/orderlist/SPEC.md`.

A single reorderable list: check one or more rows, then move them with a visibly-labelled
Top/Up/Down/Bottom button rail (or the matching `Alt+Arrow`/`Alt+Home`/`Alt+End` keyboard
shortcuts). Web-only per doc 26 §5's disposition for this row.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Rendered as a real `<label for>` via `ino-label` |
| `options` | `InoOrderListOption[]` | `[]` | `{ label, value, disabled? }` — array order **is** list order |
| `value` | `string[]` | `[]` | Checked rows (Tier-1 selection contract), independent of order — see `SPEC.md` §2 |
| `hint` | `string` | `''` | Rendered below the field; hidden while `error` is set |
| `error` | `string` | `''` | Sets `aria-invalid` + a `role="alert"` message |
| `size` | `'compact' \| 'comfortable'` | `'comfortable'` | Doc 26 §5's own axis for list/menu-shaped components (not the `sm`/`default`/`lg` scale) |
| `required` | `boolean` | `false` | Decorative `*` marker via `ino-label` |
| `disabled` | `boolean` | `false` | Removes every row and button from the focus order |
| `readonly` | `boolean` | `false` | Rows stay focusable; selection/reorder cannot change |
| `loading` | `boolean` | `false` | Interaction ignored while true |

`valueChange: EventEmitter<string[]>` fires on every checkbox toggle.
`optionsChange: EventEmitter<InoOrderListOption[]>` fires after every move (button or keyboard).

```html
<ino-orderlist label="Queue order" [options]="items" [(value)]="checked" (optionsChange)="items = $event" />
```

### Reorder buttons

| Button | Action |
|---|---|
| `⤒ Top` | Moves every checked row to the front, preserving their relative order |
| `↑ Up` | Moves every checked row up one position (contiguous blocks move together) |
| `↓ Down` | Moves every checked row down one position |
| `⤓ Bottom` | Moves every checked row to the end, preserving their relative order |

All four are disabled when nothing is checked. See `SPEC.md` §1 for why there is no drag-and-drop
alternative to document — the buttons and keyboard shortcuts below are the complete
implementation, not a fallback for one.

---

## Variants / Structure

There is one structural variant: the listbox + button-rail layout above. `ino-orderlist` has no
filter box and no virtualization (unlike its `ino-listbox` core's own defaults) — see `SPEC.md`
§3 for why a filter was deliberately left out of a reorder list.

---

## Sizing

`size="compact"` re-points `--ino-orderlist-row-height` / `-row-padding-inline` / `-font-size` to
the `-sm` tier of the shared control-size aliases; `comfortable` (default) reads the unsuffixed
aliases. Both compose under `[data-density="dense"|"fluid"]` for free. See `SPEC.md` §5.

---

## Labels

`label` renders through the shared `ino-label` leaf — a real `<label for>`, `[required]` for the
decorative marker, `[invalid]="!!error"`. `hint`/`error` render below the field, `error` winning
when both are set. This component has one list, so one label (contrast `ino-picklist`'s two).

---

## States

| State | Trigger | Visual |
|---|---|---|
| Default | — | Bordered list shell, `surface-sunken` fill |
| Hover | `:hover` on a row | Row background → `surface-raised` |
| Focus-visible | `:focus-visible` on a row (roving `tabindex`) | `--ino-focus-ring` |
| Disabled | `disabled` input | `opacity: 0.5`; every row/button removed from focus order |
| Readonly | `readonly` input | Rows stay focusable; toggle/move handlers no-op |
| Invalid | `error` input set | `aria-invalid="true"`, `role="alert"` message below the field |
| Loading/busy | `loading` input set | Interaction ignored |
| **Selected** | a row is checked | `.ino-orderlist__option--selected` — accent text + bold, same visual language as `ino-listbox`'s selected rows |
| **Moved-flash** | a row just finished a move | `.ino-orderlist__option--moved-flash` for 600ms — background/outline flash, see `SPEC.md` §4 |

`selected`/`moved-flash` are this component's states beyond the §2 standard set (doc 26 §5).

---

## Accessibility contract

**Role / ARIA** — `role="listbox"` `aria-multiselectable="true"` container; each row
`role="option"` with `aria-selected` reflecting its checked state; `aria-disabled`/`aria-busy`
mirror `disabled`/`loading`.

**Keyboard** —

| Key | Action |
|---|---|
| `Tab` / `Shift+Tab` | Moves focus onto/off the one row carrying `tabindex="0"`, and through the button rail |
| `ArrowDown` / `ArrowUp` | Move the roving tab stop (focus only — does not change selection) |
| `Home` / `End` | Jump focus to the first/last row |
| `Space` / `Enter` | Toggle the focused row's checked state |
| `Alt+ArrowUp` / `Alt+ArrowDown` | Move the checked row(s) up/down one position — same as the `Up`/`Down` buttons |
| `Alt+Home` / `Alt+End` | Move the checked row(s) to the top/bottom — same as the `Top`/`Bottom` buttons |

**Contrast** — selected-row text (`--ino-color-accent-text-safe`) and the moved-flash outline
(`--ino-color-accent`) are existing audited roles (`check-theme-parity.mjs`), across all 3 themes.

**Target size** — every row and button clears `min-block-size`/`--ino-target-comfortable` at every
size rung.

**RTL** — logical properties only (`padding-inline`, `inset-inline-*`); no `left`/`right` anywhere
in the stylesheet.

---

## Deliberate omissions

- **Native HTML5 drag-and-drop.** The button rail + `Alt+Arrow` keyboard shortcuts are the
  complete reorder implementation, not a fallback for a drag interaction this component doesn't
  build. See `SPEC.md` §1.
- **Filter box / virtualization.** Both exist on `ino-listbox` (this component's structural core)
  but are deliberately not carried over — a filter that hides rows mid-reorder makes "move up"
  ambiguous. See `SPEC.md` §3.
- **Mobile port.** Doc 26 §5 marks this row Web-only; no React Native / Flutter implementation.

## Mobile parity

Not ported — doc 26 §5 disposition for this row is explicitly Web-only.
