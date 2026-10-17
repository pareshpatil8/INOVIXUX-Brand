# `<ino-select-button>` — Select Button (Segmented Control)

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B1 row
> `ino-select-button` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377). Issue: [INO-410](/INO/issues/INO-410).
> Parity benchmark: PrimeNG 22.1.1 `SelectButton` (`specs/primeng/llms-22.1.1.txt`) — PrimeNG is a
> benchmark, **not a runtime dependency**; nothing here imports it.
> Preview: [`previews/select-button.html`](previews/select-button.html).
> Decisions record: `web/src/app/components/select-button/SPEC.md`.

A segmented control for single or multiple selection from a horizontally-arranged button group.
Implements WAI-ARIA radiogroup pattern (single-select) or a group of checkboxes (multi-select).
Visually styled as connected buttons with accent fill for selected options.

The component is split into two parts: `<ino-select-button>` (container/group) and
`<ino-select-button-option>` (individual buttons). The parent manages group semantics, ARIA roles,
and selection state; each option is a presentational component bound to that state.

---

## API

### `<ino-select-button>` (group container)

| Input | Type | Default | Notes |
|---|---|---|---|
| `options` | `InoSelectButtonOption[]` | `[]` | Array of option definitions — each requires `label` and `value`, optional `icon`, `disabled`, `ariaLabel` |
| `value` | `string \| string[]` | `''` | Two-way bindable via `[(value)]`. Single string in radio mode, array in checkbox mode |
| `name` | `string` | auto-generated | Shared `name` attribute for radio grouping; auto-generated if not provided |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Full control-size scale (height/padding/font) |
| `multiple` | `boolean` | `false` | `false` → radiogroup with `<input type="radio">`, `true` → group with `<input type="checkbox">` |
| `disabled` | `boolean` | `false` | Disables entire group; individual options can also be disabled via `InoSelectButtonOption.disabled` |
| `readonly` | `boolean` | `false` | Prevents selection changes; currently web-only (see [Deliberate omissions](#deliberate-omissions)) |
| `iconOnly` | `boolean` | `false` | Hides text labels, displays only icons; requires `ariaLabel` on each option |
| `equalWidth` | `boolean` | `false` | Distributes options with equal flex-basis; default respects natural content width |
| `groupLabel` | `string` | `''` | Visible label rendered above the button group; auto-wired to `aria-labelledby` |
| `ariaLabel` | `string` | `''` | Accessible name for the group when no `groupLabel` is visible |
| `ariaLabelledby` | `string` | `''` | Explicit `aria-labelledby` override; takes precedence over `groupLabel` |

| Output | Payload | Fires |
|---|---|---|
| `valueChange` | `string \| string[]` | On every user-driven selection change |

### `InoSelectButtonOption` interface

```typescript
export interface InoSelectButtonOption {
  label: string;        // Visible text (required, but hidden in iconOnly mode)
  value: string;        // Submitted value (required)
  icon?: string;        // Optional glyph rendered before/instead of label
  disabled?: boolean;   // Per-option disable
  ariaLabel?: string;   // Accessible name for icon-only options (required when iconOnly=true)
}
```

### Size API

Reads the standard `--ino-control-*` token set (`-height`, `-padding-inline`, `-padding-block`,
`-font-size`) — the same set `ino-button` and `ino-toggle-button` read. `size="default"` resolves
to 44px height. Icon-only mode adjusts padding to maintain square `aspect-ratio: 1` buttons.

### Icon-only mode

When `iconOnly=true`, the component hides all `label` text and renders only `icon` glyphs
(marked `aria-hidden="true"`). **Callers must provide `ariaLabel` on every option** to give each
input an accessible name — the component will emit a dev-time warning if `iconOnly` is enabled
but any option lacks an `ariaLabel`. Without this, screen readers would announce each option as
unlabeled, violating WCAG 4.1.2.

Pattern borrowed from `ino-toggle-button` (`[attr.aria-label]="!label && ariaLabel ? ariaLabel : null"`).

### Single vs. multiple selection

**Single-select (`multiple=false`)**: host carries `role="radiogroup"`, options render
`<input type="radio">`. Native radio semantics give screen readers "one-of-N selected" count
automatically. The bound `value` is a single string.

**Multi-select (`multiple=true`)**: host carries `role="group"`, options render
`<input type="checkbox">`. The bound `value` is a `string[]`. Each checkbox operates
independently — toggling one does not deselect others.

The component automatically switches input type and ARIA role based on the `multiple` property.

---

## States

**Default** — Options render with `background: var(--ino-color-surface-raised)`,
`color: var(--ino-color-on-surface)`, and a 1px `--ino-color-border` stroke. The first option
receives `border-inline-start-width: 1px` and start radii; all others have their start border
suppressed to create the visually-connected segmented appearance. Cursor is `pointer` for all
non-disabled options.

**Checked (selected)** — Checked options (`:has(.ino-select-button-option__input:checked)`) apply
`background: var(--ino-gradient-accent)`, `color: var(--ino-color-on-accent)`, and
`border-color: var(--ino-color-accent)`. Elevated `z-index: 1` ensures the accent border remains
visible over adjacent unselected options.

**Hover** — Unselected options on hover receive `background: var(--ino-color-surface-sunken)` with
an inset `box-shadow` border (`1px var(--ino-color-on-surface-muted)`), ensuring hover affordance
remains visible in high-contrast mode where surface luminance shifts are minimal. Selected options
on hover apply `filter: brightness(1.1)` to the accent gradient. Hover is suppressed on disabled
options. Elevated `z-index: 2` ensures the hover border sits above adjacent default options.

**Focus-visible** — When the contained input receives keyboard focus (`:has(:focus-visible)`), the
label receives `outline: var(--ino-focus-ring)` with
`outline-offset: var(--ino-focus-ring-offset)`. Elevated `z-index: 3` ensures the focus ring
remains visible over hover and selected states. Native radio/checkbox focus behavior applies — Tab
enters the group, Arrow keys navigate between options (radio mode), Space toggles (checkbox) or
selects (radio).

**Active (pressed)** — Unselected options on pointer-down (`:has(:active)`) receive
`background: var(--ino-color-surface-sunken)` with `border-color: var(--ino-color-accent-active)`.
Selected options on pointer-down apply `background: var(--ino-color-accent-active)`. This mirrors
the pressed-state pattern used across field components (`ino-input`, `ino-select`, `ino-multiselect`)
— hover fill + accent-active border.

**Disabled (per-option)** — Individual options can be disabled via `InoSelectButtonOption.disabled`.
Disabled options (`:has(:disabled)`) receive `color: var(--ino-color-on-surface-muted)`,
`opacity: 0.6`, and `cursor: not-allowed`. Hover and active states are suppressed. Background
remains `--ino-color-surface-raised` (unselected) or keeps the accent gradient (selected-but-disabled).
Native `[disabled]` attribute on the input prevents interaction and announces the disabled state to
assistive technology.

**Disabled (group-level)** — When `[disabled]="true"` is set on the `<ino-select-button>` container,
all options receive `[disabled]` on their inputs, applying the per-option disabled styling to every
option in the group.

**Readonly** — When `[readonly]="true"` is set on the container, all option components receive the
`ino-select-button-option--readonly` host class. Readonly options display `cursor: default`,
`opacity: 0.8`, and suppressed hover effects (background remains unchanged on hover, no brightness
filter on selected options). The component's click handler returns early when readonly, preventing
selection changes by pointer *and* by arrow key — a native radio group selects on arrow, so that
second path matters. Tab navigation and screen reader access to the current selection are
preserved; the group stays focusable, unlike `disabled`. `aria-readonly="true"` is announced from
whichever element's role supports it — the `radiogroup` host in single-select mode, each
`<input type="checkbox">` in multi-select mode (see the accessibility contract below).
Currently web-only — see [Deliberate omissions](#deliberate-omissions).

---

## Accessibility contract

**Role / ARIA** — `role="radiogroup"` (single-select) or `role="group"` (multi-select) on the
container. Each option is a native `<input type="radio">` or `<input type="checkbox">` inside
a `<label>`, so checked/unchecked state is natively announced. When `iconOnly=true`, the
`ariaLabel` from each `InoSelectButtonOption` is applied to the input via `[attr.aria-label]`,
ensuring every input has an accessible name even without visible text.

`groupLabel` auto-wires `aria-labelledby` to a generated ID; `ariaLabel` is the fallback for
groups without a visible label. `ariaLabelledby` allows callers to override the auto-wiring.

**`aria-readonly` placement** — mode-dependent, because no single element can carry it in both
modes. In single-select the attribute sits on the `role="radiogroup"` host, which supports it; the
`radio` role on the individual inputs does **not** (the rule `ino-checkbox` settled, naming `radio`
as its counter-example). In multi-select the host is `role="group"`, which does not support it
either, so each option's native `checkbox` role carries it instead. The attribute is omitted
entirely — never `"false"` — when `readonly` is off. There is deliberately no `aria-pressed` in
either mode: it is invalid on a checkbox and would double-announce against the native checked
state.

**Keyboard** — Tab into the group (first/selected option receives focus), Arrow keys to navigate
between options (radio mode only — browser-native radiogroup behavior), Space to toggle (checkbox
mode) or select (radio mode). All native `<input>` keyboard support, no custom handlers.

**Contrast and targets** — `size="default"` resolves to 44px (`--ino-target-comfortable`), always
>= 32px even in dense mode via the control-height scale. Focus ring, selected-state gradient, and
border colors resolve through tokens audited across all three themes by
`node scripts/check-theme-parity.mjs`. Selected options use `--ino-gradient-accent` with
`--ino-color-on-accent` text for 4.5:1+ contrast.

**RTL** — logical properties only (`border-inline-start-width`, `border-start-start-radius`,
`border-end-start-radius`). No `left`/`right`/`top`/`bottom` anywhere in the stylesheets. The
first option's start border and start radii, and the last option's end radii, correctly flip
under `dir="rtl"`.

**State announcements** — Checked/unchecked (radio/checkbox native), disabled (native `[disabled]`),
group label (via `aria-labelledby` or `aria-label`), readonly (via `aria-readonly="true"` when
`readonly=true`).

---

## Deliberate omissions

**PrimeNG mapping.** PrimeNG 22.1.1 `SelectButton`'s `[(ngModel)]`, `options`, `optionLabel`,
`optionValue`, `optionDisabled`, `multiple`, `disabled` map onto this component's `[(value)]`,
`options` array (with `label`/`value`/`disabled` fields), `multiple`, and `disabled`. PrimeNG's
`unselectable` (allows deselecting in single-select mode) is not carried over — standard radio
semantics require exactly one option selected at all times after the first selection. PrimeNG's
`allowEmpty` is similarly omitted.

**`readonly` is web-only.** On the web the @Input is fully implemented — interaction blocked
(pointer and arrow key), a visual treatment (0.8 opacity, default cursor, hover and pointer-down
affordances withdrawn) that keeps the group legible and focusable, and `aria-readonly="true"` on
the element whose role supports it. Neither mobile port implements it: there is no `readOnly` prop
on `InoSelectButton.tsx` or `ino_select_button.dart`, so a readonly segmented control has no
cross-platform equivalent yet. The ARIA placement is mode-dependent and is *not* a copy of
`ino-toggle-button`'s unconditional per-input attribute — that component is a single control, not a
group; see `SPEC.md` §9 for the rule and its counter-example.

**No invalid/error state.** The §2 standard state set includes invalid/error, but segmented
controls are typically selection-first UI (filtering, view modes) rather than form-validation
fields, so error states are rare. `ino-toggle-button` supports `error` (string input →
`aria-invalid` + `role="alert"` message + invalid ring), but that component is often used as a
boolean form field. If select-button needs form-validation error states in the future, the
`ino-toggle-button` pattern (error message via `aria-describedby`, invalid ring from
`--ino-invalid-ring`) is ready to apply. Not implemented in B1.

**Icon-only mode is web-only.** The mobile ports (Flutter/RN) do not implement `iconOnly` because
there is no standard icon system in the mobile layer yet. When a cross-platform icon library
lands, the ports can add `iconOnly` support mirroring the web implementation.

---

## Mobile parity

Both ports ship (per the issue's "Port both" disposition).

- **React Native** — `mobile/react-native/src/components/InoSelectButton.tsx`.
  `accessibilityRole="button"` + `accessibilityState={{ selected: isSelected, disabled }}` per
  option. The `radiogroup` ARIA distinction has no direct RN equivalent — each option announces
  as a button with selected state, matching the pattern established in `InoSelect`.
  `ScrollView horizontal` wraps the button row for touch-friendly overflow.

- **Flutter** — `mobile/flutter/lib/widgets/ino_select_button.dart`. `Semantics(button: true,
  selected: isSelected)` per option, inside a horizontal `Row` that scrolls on overflow.
  `InkWell`-wrapped `Container` items apply `InoTokens` border radii and accent gradient for
  selected state.

Both ports support single/multiple selection modes, sm/default/lg sizing, per-option `disabled`,
`groupLabel`, and `equalWidth` mode. `readonly`, `iconOnly`, and error states are web-only for
this B1 issue (see [Deliberate omissions](#deliberate-omissions)).
