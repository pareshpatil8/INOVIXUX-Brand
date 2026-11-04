# `<ino-colorpicker>` — Color Picker

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B5 row
> `ino-colorpicker`. Board approval `f55baa72` on [INO-377](/INO/issues/INO-377). Issue:
> [INO-473](/INO/issues/INO-473).
> Parity benchmark: PrimeNG 22.1.1 `ColorPicker`
> (`specs/primeng/llms-22.1.1.txt`) — PrimeNG is a benchmark, **not a runtime dependency**;
> nothing here imports it.
> Decisions record: `web/src/app/components/colorpicker/SPEC.md`.

An HSB color picker — a saturation/brightness panel, hue and alpha bars, hex and R/G/B text
entry, and optional preset swatches — rendered inline or inside a popover dialog. Web-only
(theming/admin surfaces); no mobile port.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | |
| `hint` | `string` | `''` | |
| `error` | `string` | `''` | See [Accessibility contract](#accessibility-contract) |
| `placeholder` | `string` | `'Select color'` | Trigger hex field placeholder |
| `swatchSize` | `'sm' \| 'md'` | `'md'` | See [Sizing](#sizing) |
| `inline` | `boolean` | `false` | See [Variants / Structure](#variants--structure) |
| `showAlpha` | `boolean` | `true` | Hides the alpha bar and drops the alpha suffix from the emitted hex when `false` |
| `presets` | `string[]` | `[]` | Any CSS color string — see [Variants / Structure](#variants--structure) |
| `value` | `string \| null` | `null` | Hex (`#rrggbb`/`#rrggbbaa`) or `null` — see `SPEC.md` §1 |
| `required` | `boolean` | `false` | |
| `disabled` | `boolean` | `false` | |
| `readonly` | `boolean` | `false` | |
| `closeOnEscape` | `boolean` | `true` | Popover mode only |
| `closeOnBackdrop` | `boolean` | `true` | Popover mode only |
| `appendTo` | `'self' \| 'body'` | `'self'` | `'body'` reparents the popover past a clipping/scrolling ancestor — same escape hatch `ino-datepicker` documents |

| Output | Type | Notes |
|---|---|---|
| `valueChange` | `EventEmitter<string \| null>` | Fires on commit, not per drag pixel — see `SPEC.md` §5 |
| `openChange` | `EventEmitter<boolean>` | Popover mode only |

No content-projection slots.

---

## Variants / Structure

Two structural variants (doc 26 §5 row: "inline vs popover"):

- **Popover** (default) — a trigger (swatch button + typeable hex field) that opens a
  `role="dialog"` panel anchored beneath it.
- **Inline** (`inline={true}`) — the picker body renders directly, no trigger/overlay.

The picker body itself, in both variants:

1. **Saturation/brightness panel** — a 2-D draggable area; the base fill is the current hue at
   full saturation/brightness, overlaid with white-to-transparent and transparent-to-black
   gradients (the standard SB-panel idiom).
2. **Hue bar** — a 1-D horizontal bar, a static 360° rainbow.
3. **Alpha bar** (hidden when `showAlpha={false}`) — a checkerboard overlaid with a
   transparent-to-current-color gradient.
4. **Hex field** + **R/G/B number fields** — typeable alternates to dragging, kept in sync with
   the SB/hue/alpha thumbs in both directions.
5. **Preset swatches** (shown when `presets` is non-empty) — click-to-select buttons. Presets are
   any CSS color string; a hex preset re-derives the SB/hue/alpha thumb positions, a non-hex
   preset (e.g. `var(--ino-color-accent)`, as this page's own demo uses) is still selectable and
   emitted, just without moving the thumbs. Full reasoning: `SPEC.md` §4.

Full structural/interaction reasoning (overlay mechanics, pointer capture, `appendTo`
positioning): `SPEC.md` §2–§5.

---

## Sizing

Two steps (doc 26 §5 row: "swatch sm/md") for the trigger swatch button's diameter — a local,
narrower scale than the fleet-wide `InoControlSize`, same precedent `<ino-slider>`'s
`InoSliderTrackSize` sets for its own two-rung spec row. No density split for the swatch itself
(the shared `--ino-target-min` tap-target floor already applies regardless of `swatchSize`); the
text fields inside the panel and the trigger's hex field follow the ambient page density like
every other text input. Full reasoning: `SPEC.md` §7.

---

## Labels

Full label set (doc 26 §5 row): `label`, `required` marker, `hint` text, `error` text — the
standard `ino-label` + `<p>` hint/error pattern every Tier-1 form control uses. No float/IFTA
label integration (this component has no such mode to integrate with). RTL spot-check: see this
page's own demo section rendered with `dir="rtl"`.

---

## States

Doc 26 §5's own state row is "open, dragging, invalid-hex", layered on top of the §2 standard
set (default, hover, focus-visible, active, disabled, readonly, invalid/error). `loading` and
`empty` are N/A — this is a synchronous, always-rendered control, never fetched.

- **Open** — the popover panel is mounted (`panelOpen`); N/A in inline mode (always "open").
- **Dragging** — host class `.ino-colorpicker--dragging`, set for the duration of a pointer drag
  on the SB panel or either bar; the swatch/thumbs update live, but `valueChange` does not fire
  until release. Full reasoning: `SPEC.md` §5.
- **Invalid-hex** — host class `.ino-colorpicker--invalid-hex`, true only while the hex text
  field currently holds unparseable text; independent of the standard `error` input (a caller can
  have both set at once). Full reasoning: `SPEC.md` §6.

---

## Accessibility contract

**Dialog/combobox hybrid** (doc 26 §5 a11y row, named explicitly):

- The trigger's hex text field is `role="combobox"`, `aria-haspopup="dialog"`, `aria-expanded` —
  typeable directly, and focusing it opens the panel, the same idiom `ino-autocomplete`'s input
  uses for its own listbox.
- The trigger's swatch button is the primary `aria-haspopup="dialog"` / `aria-expanded` /
  `aria-controls` trigger; the panel is `role="dialog"` with `aria-modal="true"`, composing
  `InoFocusTrapDirective` for Tab containment and return-focus-on-close (the same primitive
  `ino-datepicker`/`ino-modal`/`ino-popover`/`ino-confirm-dialog` already use).

**Slider semantics per bar** (doc 26 §5 a11y row, named explicitly):

- Hue bar: `role="slider"`, `aria-valuemin="0"`, `aria-valuemax="360"`, `aria-valuenow`,
  `aria-label="Hue"`. Keyboard: Arrow Left/Down −1, Right/Up +1, PageDown/PageUp ∓/±10, Home/End
  to 0/360.
- Alpha bar: `role="slider"`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-valuenow`,
  `aria-label="Alpha"`. Keyboard: Arrow Left/Down −1, Right/Up +1, Home/End to 0/100.
- Saturation/brightness panel: the same `role="slider"` treatment, with `aria-valuetext`
  carrying both axes ("Saturation N%, brightness N%") since `aria-valuenow` can only hold one
  number. Deliberately not `role="application"` — see `SPEC.md` §6 for why. Keyboard: Arrow
  Left/Right adjust saturation ∓/±1, Up/Down adjust brightness ±1/∓1, Home sets both to 0, End
  sets both to 100.

**Value announced on commit** (doc 26 §5 a11y row, named explicitly): a visually-hidden
`aria-live="polite"` region announces "Color set to #…" exactly once per commit — drag release,
keyboard step, hex/RGB field blur, or preset click — never per intermediate drag pixel. Full
reasoning: `SPEC.md` §5.

**Contrast** — every static (non-data) color in this component reads an existing role audited in
every theme by `node scripts/check-theme-parity.mjs`. The dynamic swatch/thumb/gradient fills are
the caller/user's own picked color; their contrast is a data-entry concern, not a themed-role
question this component audits (same as native `<input type="color">`'s own swatch).

**RTL** — logical properties only (`inline-size`/`block-size`/`inset-inline-*`/`inset-block-*`);
no `left`/`right`/`top`/`bottom`/`width`/`height` anywhere in the stylesheet.

---

## Deliberate omissions

**No default `presets` array.** A brand preset palette is an admin/theming-surface decision for
the caller to supply; this component does not bake one in — doing so would also mean hardcoding
raw colour literals in this component's own source. Full reasoning: `SPEC.md` §4 and §8.

**No `rgb()`/`hsl()` CSS color functions anywhere in this component's source**, including for the
hue-bar rainbow gradient, which a typical implementation would write as `hsl()` stops. Every
dynamic fill is computed to a hex string instead, so the design-system-adherence lint's raw-colour
scan — a plain text match with no way to distinguish a hardcoded brand decision from a
runtime-computed, caller/user-chosen value — has nothing to flag. Full reasoning: `SPEC.md` §8.

**No general CSS-color-string parser.** Preset swatches accept any CSS color for display and
selection, but only a hex preset re-derives the SB/hue/alpha thumb positions; a named color or
`rgb()` string preset is still selectable and emitted, just without moving the thumbs. Full
reasoning: `SPEC.md` §4.

**No continuous `valueChange` during drag.** A deliberate divergence from `<ino-slider>`'s
continuous-commit convention — see [States](#states) and `SPEC.md` §5.

---

## Mobile parity

**Web-only** (doc 26 §5 row disposition: "Web-only (theming/admin surfaces)"). An HSB color
picker with hue/alpha drag bars is an admin/theming-surface control, not part of this repo's
ported mobile component set — no RN/Flutter component in this design system exposes raw color
authoring today. Mirrors `ino-command-menu`/`ino-dynamic-dialog`/`ino-toolbar`'s web-only
disposition in the same table.
