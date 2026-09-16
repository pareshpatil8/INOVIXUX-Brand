# `<ino-icon-field>` — Icon field

> Parity benchmark: PrimeNG 22.1.1 `IconField` (`specs/primeng/llms-22.1.1.txt`).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Gap register: closes the `IconField` uplift row tracked as **INO-138** (INO-31 Wave 1, T-16,
> Form group).
> Preview: [`previews/icon-field.html`](previews/icon-field.html).
> Decision record: [`../../../web/src/app/components/icon-field/SPEC.md`](../../../web/src/app/components/icon-field/SPEC.md).

The sanctioned icon-slot mechanism for Tier-1 form controls — a wrapper component around a
projected control, **not** an `@Input() icon` re-implemented on every individual control. Other
Tier-1 form components (e.g. the future InputGroup, T-17) reference this component as the one
audited place a leading/trailing icon gets added, rather than inventing their own icon padding.

```html
<ino-icon-field>
  <svg iconLeading aria-hidden="true">…</svg>
  <ino-input placeholder="Search" />
</ino-icon-field>

<ino-icon-field>
  <ino-input type="password" />
  <svg iconTrailing aria-hidden="true">…</svg>
</ino-icon-field>

<ino-icon-field>
  <svg iconLeading aria-hidden="true">…</svg>
  <ino-input placeholder="Amount" />
  <svg iconTrailing aria-hidden="true">…</svg>
</ino-icon-field>
```

The projected control goes in the **default** slot (no attribute). `iconLeading` / `iconTrailing`
are plain attribute selectors matched against `<ng-content>` — not sub-components — so any element
works, typically an inline `<svg>`.

---

## Layout — side-by-side CSS Grid, not overlapping (see SPEC.md §1–2)

Unlike PrimeNG's `IconField`, which positions its icon absolutely *inside* the wrapped `<input>`'s
own padding, `<ino-icon-field>` lays the icon slots and the projected control out side-by-side in a
3-column CSS Grid (`auto minmax(0, 1fr) auto`). Every control in this repo (`ino-input`,
`ino-select`, …) is already a fully self-styled leaf component with its own
border/background/height; reaching into one of those boxes to overlap an icon would couple this
wrapper to each control's internal padding. The side-by-side layout works with any current or
future control with zero knowledge of its internals, and — because the icons never sit inside the
control's box — this wrapper never needs `overflow: hidden` and never puts the control's own focus
ring at risk of being clipped.

Grid, specifically, rather than flexbox: this repo's `check-ds-adherence.mjs` bans `::ng-deep`
(no sanctioned escape hatch yet), and stretching a *projected* child to fill a flex row's remaining
space needs `flex-grow` set on that exact child — a selector Angular's Emulated encapsulation can
never let this stylesheet write, since projected content carries the consumer template's scoping
attribute. CSS Grid's default `stretch` behavior is a property of the *container*, so both the
control slot and each icon slot are themselves nested single-track grids — whatever lands inside
them via content projection becomes that grid's one item and stretches to fill it automatically, no
selector targeting the projected element required. See SPEC.md §2 for the full reasoning
(including the flex-based draft that failed the lint).

Grid column order, like flexbox row order, is an inline-axis concept, so under `dir="rtl"` the
`iconLeading` slot (column 1, first in template order) automatically renders at the trailing edge
of the reversed row — no `inset-inline-*` bookkeeping needed for ordering.

---

## Variants

| Slots filled | Renders as |
|---|---|
| `iconLeading` only | Icon, then control |
| `iconTrailing` only | Control, then icon |
| Both | Icon, control, icon |
| Neither | Bare control (the wrapper adds nothing visually) |

An icon slot with nothing projected into it collapses to zero footprint (`:empty { display: none;
}`) — the three/four cases above fall out of one template, no conditional branching.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Wave 0 control-size scale (INO-124); re-points only `--ino-control-icon-size` and `--ino-control-gap` — see below |
| `disabled` | `boolean` | `false` | Dims the icons and sets `aria-disabled` on the wrapper; does **not** disable the projected control — set `[disabled]` on that control too (see SPEC.md §5) |

### Size API (INO-124 adoption)

`size` re-points the two `--ino-control-*` aliases this component actually renders with
(`icon-size`, `gap`); every rule reads only those aliases, never a per-size literal. Density-
relative: under `[data-density="dense"]` the same size classes resolve to the dense rungs of the
same tokens — this component adds no density logic of its own (same pattern as `ino-button` /
`ino-tag`).

---

## States

| State | Mechanism |
|---|---|
| default | base rule — icons at `--ino-color-on-surface-muted` |
| focus-within | icons recolor to `--ino-color-accent` while the projected control has focus — a color echo, not a second ring (SPEC.md §7) |
| disabled | icons drop to `opacity: 0.5`; wrapper gets `aria-disabled="true"` |
| readonly | not applicable — this wrapper has no value of its own; see the control it wraps |
| invalid | not applicable — validity lives on the wrapped control, not this wrapper |

The wrapped control's own `:focus-visible` ring is unaffected by this wrapper at every state —
see "Layout" above.

---

## Motion

None. `<ino-icon-field>` is a pure layout wrapper present for the lifetime of its projected
control — there is no enter/exit state of its own to animate (SPEC.md §6). The one `transition`
declaration in the component (icon `color`, `--ino-motion-duration-fast`) is the focus-within
recolor easing, gated behind `@media (prefers-reduced-motion: reduce)` → `transition: none` per the
Wave 0 motion contract (INO-127).

---

## Accessibility contract

**Role / ARIA**

- Both icon slots sit inside a `<span aria-hidden="true">` in this component's own template — icons
  are hidden from assistive technology by the wrapper itself, not left to each call site to
  remember.
- The wrapped control (e.g. `<ino-input>`) carries the real `<label for>`, accessible name, and any
  `aria-invalid`/`aria-describedby` wiring — `<ino-icon-field>` adds no role, `tabindex`, or other
  interactive semantics of its own; it is not focusable or activatable.
- `disabled`: reflected as `aria-disabled` on the wrapper. It does not propagate to the projected
  control — set `[disabled]` on that control directly.

**Keyboard**

`<ino-icon-field>` is not in the tab order — it adds no focusable element. Keyboard behavior is
entirely the projected control's own (`Tab`/`Shift+Tab` to/from it, activation keys per that
control's own contract).

**RTL** — pure flexbox row (an inline-axis, not physical, direction); no `left`/`right` anywhere in
the component, and no `inset-inline-*` needed for icon ordering since the row itself reverses under
`dir="rtl"`.

**Icon sizing** — icons render at `--ino-control-icon-size` (16px `sm` dense floor per
`14-icon-system.md` §2, 20px default, 24px `lg`) — never smaller than the repo-wide icon floor at
any size × density rung.

---

## Deliberate omissions

Recorded here rather than silently dropped (DoD §6) — see `SPEC.md` for the full reasoning:

- **Icon-overlaps-input layout (PrimeNG's actual mechanism).** Replaced with a side-by-side flex
  row — SPEC.md §1.
- **`readonly` / `invalid` states.** Not applicable to a wrapper with no value of its own — both
  live on the control this wraps.
- **Component registry line in `check-theme-parity.mjs` (DoD row 11).** That registry does not
  exist — confirmed against the live (408-line) script, same finding as `tag/SPEC.md` §8 and
  `button.md`'s "Deliberate omissions" section.

---

## Mobile parity

| Track | Status | Notes |
|---|---|---|
| Capacitor | Not a port | Renders the same Angular component and the same CSS (INO-31 plan rev 9 §5 rule); no browser-only API is used anywhere in this component. |
| React Native | No widget | A leading/trailing icon beside a text field is composed directly in the screen's own layout (`View`/`Icon`/`TextInput`) on this track, not through a shared wrapper — no native primitive to port, no existing call site asking for one. |
| Flutter | No widget | Same reasoning as React Native. |
