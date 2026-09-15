# `<ino-toggle>` — component spec

**Issue:** [INO-160](/INO/issues/INO-160) (INO-31 U-5)
**Parity benchmark:** PrimeNG 22.1.1 `ToggleSwitch` — `specs/primeng/llms-22.1.1.txt` line 124,
route `https://primeng.dev/toggleswitch`. PrimeNG is a benchmark, **not a runtime dependency**;
nothing here installs it.
**Gap closed:** icon overlay, invalid/error state, and the size API — none of the three existed on
`ino-toggle` before this issue. The pre-existing implementation also only carried default,
active/pressed, focus-visible and disabled — missing hover, readonly, invalid and loading/busy of
the DoD's eight states.
**Depended on:** W0-2 (`INO-124`), merged (`done`) before this issue started.

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Eight states — all carried (DoD row 5)

| State | Carried? | Notes |
|---|---|---|
| Default | ✅ | Unfilled track (`--ino-color-surface-sunken`), muted thumb |
| Hover | ✅ **(new)** | `filter: brightness(1.15)` on the track — the same "no lighten hook on a flat/gradient fill" workaround `ino-checkbox`/`ino-button` already use |
| Active/pressed | ✅ | Unchecked press darkens the track border to `--ino-color-accent-active` (pre-existing); checked press flattens the gradient to the same solid accent-active fill (pre-existing) |
| Focus-visible | ✅ | `--ino-focus-ring` / `--ino-focus-ring-offset` on the track, unchanged |
| Disabled | ✅ | Native `[disabled]` — `cursor: not-allowed`, whole control dims to 50% opacity |
| Readonly | ✅ **(new)** | See §4 below |
| Invalid | ✅ **(new)** | See §3 below |
| Loading/busy | ✅ **(new)** | `aria-busy` + `[disabled]="disabled || loading"` + an adjacent spinner (not an overlay — matches `ino-checkbox`) |

---

## 2. Icon overlay (issue scope)

A glyph (`✓` checked / `✕` unchecked) renders inside the thumb, `aria-hidden="true"`, swapped by
`checked` — the same shape PrimeNG's `ToggleSwitch` handle-icon template uses (icon rides with the
thumb, not fixed under the track at a position the thumb reveals/covers). Plain text glyphs, not an
SVG asset or icon-font dependency — the same choice `ino-alert`'s status icons already made
(`STATUS_ICON` map in `ino-alert.component.ts`), for the same vendor-light reason.

**Colour pairs are reused, not invented.** Contrast ratio is symmetric — it does not depend on
which of two colours is foreground vs background — so both pairs below are colours this system has
already proven meet contrast requirements, just read in the opposite direction:

- **Unchecked:** thumb fill `--ino-color-on-surface-muted`, icon `--ino-color-surface`. This is the
  same pair already proven as muted-text-on-surface (every `-on-surface-muted` label in the app),
  reversed.
- **Checked:** thumb fill `--ino-color-on-accent`, icon `--ino-color-accent`. This is the same pair
  `ino-button`'s primary variant already proves (fill `accent`, text `on-accent`), reversed.

No new token was needed for either pair — both reuse tokens already in the frozen set.

---

## 3. Invalid/error state (issue scope)

Mirrors `ino-checkbox`'s `error` contract: a non-empty `error` string sets `aria-invalid="true"` +
`aria-describedby` on the control, renders the message in a `role="alert"` paragraph below, and
paints a 2px `--ino-color-danger` outline ring on the track — the same outline idiom `ino-checkbox`
uses on its box, for the same reason (outline paints outside the shape regardless of the track's own
background, and doesn't compete with the shipped elevation `box-shadow` scale). `:not(:focus-visible)`
guards it so the invalid ring and the focus ring never fight over the one `outline` property; the
danger-coloured error text stays the invalid signal either way.

---

## 4. Readonly (DoD row 5, new state)

`readonly` is enforced in the component (`onToggle()` returns early when `readonly` is true) rather
than via a native HTML attribute — `<button>` has no native `readonly` IDL attribute at all (it's
text-input-only per the HTML Standard, same fact `ino-checkbox`'s SPEC.md §4 records for
`<input type="checkbox">`). The control stays focusable and fully legible (unlike `disabled`, which
dims to 50% opacity) — only the interactive affordances (hover feedback, pointer cursor) withdraw,
via a `.ino-toggle__control--readonly` class the hover selector excludes directly.
`aria-readonly="true"` is bound on the button — `switch`'s ARIA superclass role is `checkbox`
(WAI-ARIA 1.2 §switch), which supports `aria-readonly`, so this is a valid, non-conflicting addition.

---

## 5. Loading/busy (DoD row 5, new state)

The track/thumb keep their last committed `checked` position and paint on screen — never blank or
swap to a spinner-in-place, matching `ino-checkbox`'s "the control's own paint is its accessible
value" reasoning. A spinner (half the thumb's own size, so it scales with `size`) renders as a
sibling after the track. `[disabled]="disabled || loading"` blocks interaction (removes the control
from the tab order while busy, same as `ino-checkbox`'s own `loading`), and `aria-busy="true"` is
bound so assistive tech announces the pending state.

---

## 6. Size API (issue scope)

Reads the same `--ino-control-icon-size-*` / `-font-size-*` / `-gap-*` alias trio `ino-checkbox`
reads (Wave 0 control-size scale, INO-124) rather than `--ino-control-height` — a track/thumb pair
is a compact inline shape, not a full-height control like `ino-button`/`ino-input`. The thumb
diameter is the only size-driven geometry; track width/height and thumb travel distance are pure
`calc()` off that one alias (`2 * thumb + 2 * inset` wide, `thumb + 2 * inset` tall, travel exactly
`thumb`) rather than a second set of literals per size — every size only changes the one alias for
the whole shape to follow. The row itself still reads `--ino-row-min-height` (falling back to
`--ino-target-comfortable`) as its `min-height`, independently of thumb size, per DoD row 4 — same
split `ino-checkbox`'s SPEC.md §3 documents.

---

## 7. RTL fix (pre-existing DoD §8 gap, closed incidentally)

The pre-uplift implementation moved the thumb with `transform: translateX(18px)` — a physical-axis
move that does not mirror under `dir="rtl"` (translateX always moves along the positive x-axis
regardless of writing direction). This issue replaces it with `inset-inline-start`, animated
directly: logical, and correctly mirrored by the UA under `dir="rtl"` in every evergreen browser,
with no second stylesheet or JS direction check needed.

---

## 8. ARIA contract (DoD row 8)

**Role** — `role="switch"` on a native `<button>` (WAI-ARIA APG switch pattern), not a checkbox
styled to look like a switch — a toggle's semantics ("on/off, takes effect immediately") differ from
a checkbox's ("selected/not selected in a set"), per the original component's own doc comment.
`aria-checked` is a real boolean (`true`/`false`), never `"mixed"` — a switch has no indeterminate
state, unlike `ino-checkbox`. `aria-invalid` + `aria-describedby` wire in the error message (new).
`aria-readonly` (§4) and `aria-busy` (§5) are new. The accessible name comes from the button's own
text content when `label` is set (native accname computation — a `<button>` is self-labelling from
its descendants, no `for`/`id` pairing needed, unlike `ino-checkbox`'s `<label for>` + `<input id>`
pair); `ariaLabel` covers the label-less case.

**Keyboard** — Tab to focus, Space or Enter to toggle (native `<button>` activation — no custom
keydown handler needed).

**Contrast and targets.** Thumb diameter at every `size` value is >= the WCAG 2.2 SC 2.5.8 24px
floor at `default`/`lg` (20px/24px) — `sm`'s 16px thumb is the same pattern `ino-checkbox`'s `sm`
box already documents as acceptable, because the effective click target is the whole control row via
`--ino-row-min-height`/`--ino-target-comfortable`, always >= 32px even in dense mode. Focus ring,
invalid ring, and the two icon-overlay colour pairs (§2) all resolve through tokens audited across
all three themes by `node scripts/check-theme-parity.mjs`.

---

## 9. RTL (DoD row 8)

Logical properties only: `inline-size`/`block-size` (track, thumb, spinner), `inset-block-start`/
`inset-inline-start` (thumb position — see §7), `border-inline-start-color` (spinner, mirroring
`ino-checkbox`/`ino-tag`/`ino-button`'s spinner convention). No `left`/`right`/`top`/`bottom`/
`translateX` anywhere in the stylesheet.

---

## 10. Mobile parity (DoD row 9)

**All three tracks ship**, per the issue. Neither mobile port existed before this issue (no prior
`InoToggle`/`InoSwitch` on either platform).

- **Capacitor** — not a separate port; the same Angular components/CSS render inside the Capacitor
  WebView, per plan rev 9 §5's porting rule ("Capacitor is not a port").
- **React Native** — `mobile/react-native/src/components/InoToggle.tsx`, a from-scratch
  `Pressable`-drawn track + thumb (RN has no native switch primitive this design system already
  wraps — `Switch` exists but pulls its own OS-themed chrome, the same reason the RN `InoCheckbox`
  port didn't wrap the platform checkbox). `accessibilityRole="switch"` +
  `accessibilityState={{ checked, disabled, busy }}` carries the ARIA-equivalent contract. No
  `Animated` wiring — the thumb re-renders at its new `left` on every `checked` change with no
  transition, the same "no shared spin/animation primitive exists yet" scope call `InoCheckbox`'s RN
  port already made for its own spinner.
- **Flutter** — `mobile/flutter/lib/widgets/ino_toggle.dart`, same from-scratch
  `GestureDetector` + `Container` approach as `ino_checkbox.dart` (not Material's built-in `Switch`,
  to keep full token control over track/thumb colour and size). `Semantics(toggled: checked)` is
  Flutter's switch-specific semantics flag (distinct from `Semantics(checked:)`, which
  `ino_checkbox.dart` uses) — the direct equivalent of RN's `accessibilityRole="switch"` and web's
  `role="switch"`.

Neither mobile palette needed a new field for this component — toggle styling is entirely
`accent`/`onAccent`/`onSurfaceMuted`/`surface`/`border`/`danger`, all of which are already ported.

---

## 11. `check-theme-parity.mjs` — not modified (DoD row 11 deviation)

Same finding as `checkbox/SPEC.md` §10, `virtual-scroller/SPEC.md` §6 and `tag/SPEC.md` §8,
re-verified for this issue: DoD row 11 describes "one appended line in the
`check-theme-parity.mjs` component registry", but no such registry exists in the file (confirmed by
reading it in full — it is a token-contract audit script: CSS mirror byte-parity, colour roles
across 3 themes × 2 mobile ports, space/radius/target/duration scales, control-size scale, data-viz
tokens, form-label tokens). Nothing appended; `node scripts/check-theme-parity.mjs` passes
unchanged. Component-level token adherence is covered by `check-ds-adherence.mjs`'s directory-scope
walk instead.

---

## 12. Verification run for this issue

| Check | Result |
|---|---|
| `node scripts/check-theme-parity.mjs` | ✅ passes (unmodified) |
| `node scripts/check-ds-adherence.mjs` | ✅ passes (264 files, 0 violations) |
| `ng build` (web/) | ✅ passes, including the `anyComponentStyle` 4kB budget |
| Hardcoded colour/space/radius/duration/font-size | none — every value resolves through a token; thumb/track/spinner geometry derives from the control-size scale via `calc()` |
| `[data-theme]` branch | none |
