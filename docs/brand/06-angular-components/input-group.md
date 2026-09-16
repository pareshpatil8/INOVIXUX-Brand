# `<ino-input-group>` — Input group

> Parity benchmark: PrimeNG 22.1.1 `InputGroup` (`specs/primeng/llms-22.1.1.txt`).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Gap register: closes the `InputGroup` uplift row tracked as **INO-139** (INO-31 Wave 1, T-17,
> Form group).
> Preview: [`previews/input-group.html`](previews/input-group.html).
> Decision record: [`../../../web/src/app/components/input-group/SPEC.md`](../../../web/src/app/components/input-group/SPEC.md).

The general prefix/suffix ADDON mechanism for form controls: static text, buttons, checkboxes/
radios, or several of any of those, glued to the start and/or end of a projected control and
presented as one visually-bordered unit — the classic "input group" pattern (Bootstrap's
`.input-group`, PrimeNG's `InputGroup`/`InputGroupAddon`).

**Not the same component as `<ino-icon-field>`** (T-16/INO-138): IconField is a lightweight
icon-only wrapper for a single leading/trailing `<svg>`. InputGroup is the general mechanism for
gluing separate INTERACTIVE elements (text labels, buttons, checkboxes, radios — one or many per
side) to a control.

```html
<!-- Text addon -->
<ino-input-group>
  <span groupAddonStart>$</span>
  <ino-input placeholder="0.00" />
  <span groupAddonEnd>.00</span>
</ino-input-group>

<!-- Button addon -->
<ino-input-group>
  <ino-input placeholder="Search companies" />
  <button groupAddonEnd type="button" ino-button variant="primary" aria-label="Search">Go</button>
</ino-input-group>

<!-- Checkbox addon -->
<ino-input-group label="Select and rename entity">
  <input groupAddonStart type="checkbox" aria-label="Select this entity" />
  <ino-input placeholder="Entity legal name" />
</ino-input-group>

<!-- Multi-addon: two buttons on the same side -->
<ino-input-group>
  <ino-input value="a1B2c3D4-copy-me" readonly />
  <button groupAddonEnd type="button" ino-button variant="ghost" aria-label="Copy">Copy</button>
  <button groupAddonEnd type="button" ino-button variant="ghost" aria-label="Clear">Clear</button>
</ino-input-group>
```

The projected control goes in the **default** slot (no attribute). `groupAddonStart` /
`groupAddonEnd` are plain attribute selectors matched against `<ng-content>` — not sub-components —
so any real element works: a `<span>` of text, a native `<button>`/`ino-button`, a native
`<input type="checkbox">`/`<input type="radio">`, a `<select>`. Angular projects **every** element
that matches a given selector into that one outlet, in template order, so marking more than one
element with the same attribute is all "multi-addon" needs — no separate array API.

---

## Layout and the border-collapsing trade-off (see SPEC.md §1–4)

Unlike Bootstrap's `.input-group` or PrimeNG's `InputGroup`/`InputGroupAddon` — both of which strip
the touching border-radius off adjacent children to render one seamless hairline — `<ino-input-group>`
does **not** reach into projected addons to alter their own border/radius. Under Angular's Emulated
view encapsulation, content projected via `<ng-content>` carries the CONSUMER template's scoping
attribute, not this component's, so a selector authored here can never match a projected element
(the same structural fact `<ino-icon-field>`'s SPEC.md documents), and this repo's
`check-ds-adherence.mjs` bans `::ng-deep`/`::part()` outright (no sanctioned escape hatch yet).

Instead, `<ino-input-group>` draws **one shared frame on its own host** — the same
`--ino-color-border` / `--ino-radius-md` / `--ino-color-surface-sunken` tokens `ino-input`'s own
control shell reads — so the group is a visual superset of a bare control's own border treatment.
A nested control that carries its own border (e.g. `<ino-input>`) renders as a nested frame inside
the group's frame rather than a single collapsed hairline. See SPEC.md §1 for the full reasoning.

Two mechanisms that DO cross the projection boundary and this component relies on instead:
- **Inherited typography.** `color`/`font-family`/`font-size` set on this component's own addon
  wrapper are inherited CSS properties, so a plain projected text addon picks up the right look for
  free, with no selector targeting it.
- **Layout containers it owns.** The addon slots are `display: flex` rows (laid out at each
  addon's own intrinsic size — correct for zero, one, or several addons); the control slot is a
  single-track CSS Grid so the one projected control stretches to fill it, same technique
  `<ino-icon-field>` uses for its icon boxes.

---

## Variants (DoD row 6)

| Configuration | Renders as |
|---|---|
| Text addon, start or end | `<span groupAddonStart>$</span>` / `<span groupAddonEnd>.com</span>` — a plain text segment, styled via inherited typography, no border/background of its own |
| Button addon, start or end | A real `<button>` (native or `ino-button`) — keeps its own native semantics, focus ring, and click handling; the group supplies layout only |
| Checkbox/radio addon (start only, by convention) | A real `<input type="checkbox">`/`<input type="radio">` — same native-semantics contract as button addons |
| Multi-addon, same side | Two or more elements marked with the same `groupAddonStart`/`groupAddonEnd` attribute — laid out in one flex row, no extra API (SPEC.md §3) |
| Both sides | Any of the above combined on `groupAddonStart` and `groupAddonEnd` simultaneously |

An addon slot with nothing projected into it collapses to zero footprint (`:empty { display: none;
}`), so "start only" / "end only" / "both" fall out of one template with no conditional branching.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Wave 0 control-size scale (INO-124); re-points `--ino-control-height`, `--ino-control-padding-inline`, `--ino-control-gap`, `--ino-control-font-size` |
| `label` | `string` | `''` | Optional accessible name for the GROUP as a whole. Only when set does the host get `role="group"` + `aria-label` — see Accessibility below |
| `disabled` | `boolean` | `false` | Caller-mirrored — dims the shared frame; does not disable the projected control/addons |
| `readonly` | `boolean` | `false` | Caller-mirrored — flattens the frame's background; content stays fully legible |
| `invalid` | `boolean` | `false` | Caller-mirrored — recolors the frame border to `--ino-color-danger` |
| `loading` | `boolean` | `false` | Caller-mirrored — reflected as `aria-busy` on the host; `cursor: progress` |

### Size API (INO-124 adoption)

`size` re-points only the `--ino-control-*` aliases this component actually renders with; every
rule reads only those aliases, never a per-size literal. Density-relative: under
`[data-density="dense"]` the same size classes resolve to the dense rungs of the same tokens — no
density logic of its own (same pattern as `ino-button`/`ino-icon-field`).

---

## States

| State | Mechanism |
|---|---|
| default | base frame — `--ino-color-border` / `--ino-radius-md` / `--ino-color-surface-sunken` |
| hover | frame darkens to `--ino-color-on-surface-muted`, mirroring `ino-input`'s own hover border |
| active/pressed | not implemented on the group — belongs to whichever addon `<button>` is pressed (its own native `:active`); see SPEC.md §5 |
| focus-visible | approximated via `:focus-within` (the host itself is never directly focusable) — frame recolors to `--ino-color-accent` plus a real focus ring, same tokens `ino-input`'s own `:focus-visible` reads |
| disabled | `disabled` input; frame dims to `opacity: 0.5`; `aria-disabled` reflected |
| readonly | `readonly` input; background flattens from sunken to flat surface |
| invalid | `invalid` input; frame border recolors to `--ino-color-danger` |
| loading/busy | `loading` input; `aria-busy` reflected; `cursor: progress` |

---

## Motion

One transition: `border-color` on the shared frame, at `--ino-motion-duration-fast` /
`--ino-motion-easing-standard` — the hover/focus-within/invalid recolors above are all the same
property changing. This is a state-transition color echo, not an enter/exit animation (this
component has no mount/unmount visual state of its own). Gated behind
`@media (prefers-reduced-motion: reduce) { transition: none; }` per the Wave 0 motion contract
(INO-127). See SPEC.md §6.

---

## Accessibility contract

**Role / ARIA**

- `role="group"` and `aria-label` are only added when a caller supplies `label` — a bare
  `role="group"` with no accessible name is worse than no role, and the projected control almost
  always already carries the real accessible name (its own `<label for>`). `label` exists for the
  rarer case where the GROUP as a whole needs naming, e.g. a "select this row" checkbox next to a
  company-name input.
- `disabled` → `aria-disabled`; `loading` → `aria-busy`, both reflected on the host.
- Addon `<button>`s/`<input>`s are real native elements the caller writes directly — this component
  renders none of its own interactive elements, so their own `aria-*`/native semantics are
  untouched.

**Keyboard**

Every addon is a real `<button>`/`<input>` (never a `<div onclick>`), so `Tab`/`Shift+Tab` and each
element's own activation keys work exactly as they would unwrapped. `<ino-input-group>` itself adds
no tab stop.

**Contrast / targets (WCAG 2.2 AA)**

- The shared frame border is `--ino-color-border` (non-text, SC 1.4.11 ≥ 3:1) in every theme,
  recoloring to `--ino-color-accent`/`--ino-color-danger` on focus-within/invalid — both already
  audited pairs (`check-theme-parity.mjs`).
- The internal seam between an addon segment and the control is `--ino-color-border-soft` — an
  internal divider inside one already-bordered unit, not the unit's own outer boundary.
- Addon buttons inherit the 44px `--ino-target-comfortable` height at `size="default"` and never
  fall below the 24px `--ino-target-min` floor at `size="sm"` in dense density.

**RTL** — CSS logical properties only (`border-inline-start`/`-end`, `padding-inline`, CSS Grid
column order, which is an inline-axis, not physical, concept). No `left`/`right` anywhere in the
component.

---

## Deliberate omissions

Recorded here rather than silently dropped (DoD §6) — see `SPEC.md` for the full reasoning:

- **Border-collapsing/corner-stripping between addons and the control (Bootstrap's/PrimeNG's
  actual mechanism).** Replaced with one shared frame on the group's own host — SPEC.md §1.
- **`active`/`pressed` state on the group itself.** Not applicable to a wrapper with no native
  activation of its own — lives entirely on whichever addon button is pressed. SPEC.md §5.
- **Component registry line in `check-theme-parity.mjs` (DoD row 11).** That registry does not
  exist — confirmed against the live script, same finding as `tag/SPEC.md` §8 and
  `button.md`'s "Deliberate omissions" section.

---

## Mobile parity

| Track | Status | Notes |
|---|---|---|
| Capacitor | Not a port | Renders the same Angular component and the same CSS (INO-31 plan rev 9 §5 rule); no browser-only API is used anywhere in this component. |
| React Native | No widget | Gluing a button/checkbox/text label next to a text field is composed directly in the screen's own layout (`View`/`Row` mixing `TextInput` with a sibling `Button`/`Checkbox`/`Text`) on this track, not through a shared wrapper — no native primitive to port, no existing call site asking for one. |
| Flutter | No widget | Same reasoning as React Native. |
