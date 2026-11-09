# `<ino-picklist>` — PickList

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B3 row
> `ino-orderlist + ino-picklist` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377).
> Preview: [`previews/picklist.html`](previews/picklist.html).
> Decisions record: `web/src/app/components/picklist/SPEC.md`.

A dual-list transfer: two independent checkbox-listbox panes with a four-button transfer rail
between them (`To target →`, `All →`, `← All`, `← To source`), plus `Alt+ArrowRight`/
`Alt+ArrowLeft` keyboard equivalents. Web-only per doc 26 §5's disposition for this row.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `sourceLabel` | `string` | `'Available'` | Label for the left/source pane |
| `targetLabel` | `string` | `'Selected'` | Label for the right/target pane |
| `source` | `InoPickListOption[]` | `[]` | `{ label, value, disabled? }` — items currently in the source pane |
| `target` | `InoPickListOption[]` | `[]` | Items currently in the target pane |
| `sourceSelection` | `string[]` | `[]` | Checked rows in the source pane (independent of membership) |
| `targetSelection` | `string[]` | `[]` | Checked rows in the target pane |
| `hint` | `string` | `''` | Rendered below the field; hidden while `error` is set |
| `error` | `string` | `''` | Sets `role="alert"` message |
| `size` | `'compact' \| 'comfortable'` | `'comfortable'` | Applies to both panes at once |
| `required` | `boolean` | `false` | Decorative `*` marker on both pane labels |
| `disabled` | `boolean` | `false` | Removes every row/button from the focus order |
| `readonly` | `boolean` | `false` | Rows stay focusable; selection/transfer cannot change |
| `loading` | `boolean` | `false` | Interaction ignored while true |

`sourceChange`/`targetChange: EventEmitter<InoPickListOption[]>` fire after every transfer.
`sourceSelectionChange`/`targetSelectionChange: EventEmitter<string[]>` fire on every checkbox
toggle, and are cleared for any value a transfer just moved out of that pane.

```html
<ino-picklist
  sourceLabel="Available checks" targetLabel="Selected checks"
  [source]="available" [target]="selected"
  (sourceChange)="available = $event" (targetChange)="selected = $event"
/>
```

### Transfer buttons

| Button | Action |
|---|---|
| `To <target> →` | Moves every checked **source** row into the target pane |
| `All →` | Moves every enabled source row into the target pane, regardless of selection |
| `← All` | Moves every enabled target row back into the source pane |
| `← To <source>` | Moves every checked **target** row back into the source pane |

See `SPEC.md` §1 for why there is no drag-and-drop alternative to document — buttons and keyboard
are the complete implementation.

---

## Variants / Structure

One structural variant: two panes + the transfer rail above. Each pane is its own independent
roving-`tabindex` listbox (not two instances of `<ino-listbox>` — see `SPEC.md` §2 for why the
core is re-implemented directly here).

---

## Sizing

`size="compact"` re-points both panes' row-height/padding/font-size aliases to the `-sm` tier at
once; `comfortable` (default) reads the unsuffixed aliases. See `SPEC.md` §5 (shared with
`ino-orderlist`).

---

## Labels

Doc 26 §5 calls for "list labels ×2" on this pair — this is the component it describes: one
`<ino-label>` per pane (`sourceLabel`/`targetLabel`), each wired to that pane's listbox via
`for`/`id`. `hint`/`error` render once, below both panes.

---

## States

| State | Trigger | Visual |
|---|---|---|
| Default | — | Bordered list shell per pane, `surface-sunken` fill |
| Hover | `:hover` on a row | Row background → `surface-raised` |
| Focus-visible | `:focus-visible` on a row (roving `tabindex`, per-pane) | `--ino-focus-ring` |
| Disabled | `disabled` input | `opacity: 0.5`; every row/button removed from focus order |
| Readonly | `readonly` input | Rows stay focusable; toggle/transfer handlers no-op |
| Invalid | `error` input set | `role="alert"` message below the panes |
| Loading/busy | `loading` input set | Interaction ignored |
| **Selected** | a row is checked, in either pane | `.ino-picklist__option--selected` — accent text + bold |
| **Moved-flash** | a row just arrived in a pane via transfer | `.ino-picklist__option--moved-flash` for 600ms on the **arrival** pane only — see `SPEC.md` §4 |

`selected`/`moved-flash` are this component's states beyond the §2 standard set (doc 26 §5).

---

## Accessibility contract

**Role / ARIA** — each pane is its own `role="listbox"` `aria-multiselectable="true"` container;
each row is `role="option"` with `aria-selected` reflecting its pane's checked state.

**Keyboard** —

| Key | Action |
|---|---|
| `Tab` / `Shift+Tab` | Moves focus between the two panes' roving tab stops and the button rail |
| `ArrowDown` / `ArrowUp` | Move the roving tab stop within the focused pane (focus only) |
| `Home` / `End` | Jump focus to the first/last row in the focused pane |
| `Space` / `Enter` | Toggle the focused row's checked state |
| `Alt+ArrowRight` (source row) | Move that row — or the whole source selection if the focused row is part of it — to the target pane |
| `Alt+ArrowLeft` (target row) | Same, in reverse |

**Contrast** — selected-row text (`--ino-color-accent-text-safe`) and the moved-flash outline
(`--ino-color-accent`) are existing audited roles (`check-theme-parity.mjs`), across all 3 themes.

**Target size** — every row and button clears `min-block-size`/`--ino-target-comfortable` at every
size rung.

**RTL** — logical properties only (`padding-inline`, `inset-inline-*`, `min-inline-size`); no
`left`/`right` anywhere in the stylesheet.

---

## Deliberate omissions

- **Native HTML5 drag-and-drop.** Same reasoning as `ino-orderlist` — see `SPEC.md` §1.
- **Composing two `<ino-listbox>` instances.** Re-implemented directly to colocate per-pane roving
  focus, selection, and moved-flash state in one component. See `SPEC.md` §2.
- **Mobile port.** Doc 26 §5 marks this row Web-only; no React Native / Flutter implementation.

## Mobile parity

Not ported — doc 26 §5 disposition for this row is explicitly Web-only.
