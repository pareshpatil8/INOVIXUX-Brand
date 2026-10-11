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

## Accessibility contract

**Role / ARIA** — `role="radiogroup"` (single-select) or `role="group"` (multi-select) on the
container. Each option is a native `<input type="radio">` or `<input type="checkbox">` inside
a `<label>`, so checked/unchecked state is natively announced. When `iconOnly=true`, the
`ariaLabel` from each `InoSelectButtonOption` is applied to the input via `[attr.aria-label]`,
ensuring every input has an accessible name even without visible text.

`groupLabel` auto-wires `aria-labelledby` to a generated ID; `ariaLabel` is the fallback for
groups without a visible label. `ariaLabelledby` allows callers to override the auto-wiring.

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

**`readonly` implementation.** The `readonly` @Input prevents selection changes at the interaction
level (click handler returns early), emits `aria-readonly="true"` on each option's input, and
applies a visual treatment (reduced opacity, default cursor, no hover state changes) to indicate
non-interactive state while preserving readability. This follows the pattern established in
`ino-toggle-button`.

**No invalid/error state.** The §2 standard state set includes invalid/error, but segmented
controls are typically selection-first UI (filtering, view modes) rather than form-validation
fields, so error states are rare. `ino-toggle-button` supports `error` (string input →
`aria-invalid` + `role="alert"` message + invalid ring), but that component is often used as a
boolean form field. If select-button needs form-validation error states in the future, the
`ino-toggle-button` pattern (error message via `aria-describedby`, invalid ring from
`--ino-color-error`) is ready to apply. Not implemented in B1.

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
