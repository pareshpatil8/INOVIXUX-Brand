# `<ino-panel-menu>` — Panel Menu

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B2 row
> `ino-panel-menu` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377). Issue: [INO-431](/INO/issues/INO-431).
> Parity benchmark: PrimeNG 22.1.1 `PanelMenu` (`specs/primeng/llms-22.1.1.txt`) — "a hybrid of
> Accordion and Tree components." PrimeNG is a benchmark, **not a runtime dependency**; nothing
> here imports it.
> Decisions record: `web/src/app/components/panel-menu/SPEC.md`.

A vertical, recursive navigation menu: top-level nodes behave as accordion panels (section-labelled,
single-open by default), and any node may itself nest further groups to arbitrary depth — the
"hybrid of Accordion and Tree" PrimeNG's own docs describe this component as.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `items` | `InoPanelMenuItem[]` | `[]` | The tree, root to leaves |
| `ariaLabel` | `string` | `'Panel menu'` | Accessible name for the `nav` landmark |
| `size` | `'compact' \| 'comfortable'` | `'comfortable'` | Re-points to the `-sm` / unsuffixed control tiers respectively — composes with dense/fluid density. See [Size API](#size-api) |
| `multiple` | `boolean` | `false` | Allows more than one **top-level** panel open at once. Nested groups below the top level are always independently toggleable regardless of this flag |
| `readonly` | `boolean` | `false` | Renders every leaf as inert text; group expand/collapse still works |
| `loading` | `boolean` | `false` | Renders skeleton rows instead of `items`; host `nav` carries `aria-busy="true"` |
| `emptyLabel` | `string` | `'No items'` | Message shown when `items` is empty and not `loading` |

| Output | Payload | Fires |
|---|---|---|
| `itemClick` | `InoPanelMenuItem` | When a leaf (navigable or command) is activated |

### `InoPanelMenuItem` interface

```typescript
export interface InoPanelMenuItem {
  label: string;
  icon?: string;              // Optional glyph rendered before the label, aria-hidden
  href?: string;               // In-app route path for a leaf, bound via [routerLink]
  disabled?: boolean;          // Renders as inert; a disabled group can never be expanded
  children?: InoPanelMenuItem[]; // Presence makes the node a group (its own accordion panel)
}
```

A leaf with `href` navigates via Angular Router; a leaf without `href` is a command node that only
emits `(itemClick)`. A node with `children` is a group — never navigates itself, and its own
`label` doubles as that group's section label.

### Size API

"Sizing: compact/comfortable" per the spec row — `comfortable` (default) reads the unsuffixed
`--ino-control-height` / `-gap` / `-padding-inline-roomy` / `-font-size` / `-icon-size` aliases;
`[data-size="compact"]` re-points every one of them to its `-sm` tier counterpart, the same
re-pointing shape `ino-nav`'s `.ino-nav--sm` uses. Both tiers are re-declared inside `tokens.css`
§10's `[data-density="dense"|"fluid"]` blocks, so dense/fluid density composes on top regardless of
`size` — see `SPEC.md` §5 for why this deliberately does **not** reuse the separate,
density-invariant `--ino-control-*-compact` tier `ino-context-menu` consumes.

### Accordion behaviour

- **Top level**: opening one panel closes whichever other top-level panel was open (`multiple`
  lifts this).
- **Nested groups**: always independently toggleable, at any depth, regardless of `multiple`.
- **Collapsing never clears nested expand state.** Re-opening a panel restores whichever of its
  own descendants were expanded before it closed — see `SPEC.md` §3.

---

## States

**Default** — Group headers and leaves render `color: var(--ino-color-on-surface)`, no background.

**Hover** — `background: var(--ino-color-surface-sunken)` on the hovered header/leaf.

**Focus-visible** — `outline: var(--ino-focus-ring)` / `outline-offset: var(--ino-focus-ring-offset)`
on the focused header, link, or command button.

**Active (pressed)** — Same `--ino-color-surface-sunken` fill as hover, on pointer-down.

**Expanded per node** — The spec row's additional state beyond the §2 standard set. Each group
header carries `aria-expanded` reflecting its own `path`-keyed entry in the `expanded` set — see
`SPEC.md` §3 for the full per-node expand-state model.

**Disabled (per-item)** — `InoPanelMenuItem.disabled: true` renders the header/leaf
`color: var(--ino-color-on-surface-subtle)`, `cursor: not-allowed`, native `disabled`/
`aria-disabled="true"`. On a group, this also makes `children` permanently unreachable through the
UI — see `SPEC.md` §6.

**Readonly (whole tree)** — `[readonly]="true"` renders every leaf as plain, unfocusable text;
group expand/collapse is unaffected, so the tree stays browsable. See `SPEC.md` §7.

**Loading** — `[loading]="true"` swaps the real tree for three decorative skeleton bars; host `nav`
carries `aria-busy="true"`.

**Empty** — `items.length === 0` and not `loading` renders `emptyLabel` in place of the list (the
`nav` landmark still renders, unlike `ino-breadcrumb`'s "render nothing" choice — a persistent nav
rail stays in the layout even while its contents resolve to empty).

---

## Accessibility contract

**Role / ARIA** — `nav[aria-label]` wraps real nested `ul[role="list"]`s (one per expanded group,
present in the DOM only while expanded). Each group is a WAI-ARIA APG **Disclosure** control:
`button[aria-expanded][aria-controls]` pointing at its own content container's id. **Deliberately
not** `role="tree"`/`"treeitem"` — see `SPEC.md` §4 for the full reasoning (in short: this is a
navigation structure with no selection model, not a single-tab-stop picker like `ino-treeselect`).

**Keyboard** — Native tab order through every header button, leaf link, and leaf command button, in
document order. Enter/Space activate a focused header (toggle) or leaf (navigate/emit) — native
`<button>`/`<a>` behavior, no custom keydown handling. A collapsed group's descendants are not in
the DOM, so they are simply absent from the tab order until expanded.

**Contrast** — Header/leaf text, hover, and disabled colors resolve through tokens audited across
all three themes by `node scripts/check-theme-parity.mjs`.

**RTL** — Indentation (`padding-inline-start`) and the nested-group border (`border-inline-start`)
are logical properties only; both flip correctly under `dir="rtl"`.

**State announcements** — `aria-expanded`/`aria-controls` per group header, `aria-disabled="true"`
on a disabled header/leaf, `aria-busy="true"` on the `nav` landmark while `loading`.

---

## Deliberate omissions

**PrimeNG mapping.** PrimeNG 22.1.1 `PanelMenu`'s `model` (`MenuItem[]`) maps onto this component's
`items`; PrimeNG's `multiple` input maps directly onto this component's own `multiple` input
(top-level panels only, in both implementations).

**No invalid/error state.** The §2 standard state set includes invalid/error, but a panel menu has
no bound value to validate — it is a navigation structure, not a form control. Not implemented;
see `SPEC.md` §8 (same reasoning `ino-breadcrumb`'s `SPEC.md` §7 recorded).

**No WAI-ARIA Tree View semantics.** See `SPEC.md` §4 — a deliberate choice, not an omission by
oversight.

---

## Mobile parity

**Web-only** per the spec row's Notes/mobile disposition — the same disposition doc 26 itself gives
other desktop-idiom components (ContextMenu, Toolbar). No React Native or Flutter port ships with
this issue.
