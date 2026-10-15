# `<ino-password>` — Password

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B1 row
> `ino-password` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377).
> Preview: [`previews/password.html`](previews/password.html).
> Decisions record: `web/src/app/components/password/SPEC.md`.

Labeled password control, promoted (INO-406) from the bare `<ino-input type="password">` partial.
Adds a labeled reveal toggle, an `aria-live="polite"` strength meter (on by default), an opt-in
policy hint panel, and a Caps Lock warning — none of which the partial had.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Rendered as a real `<label for>` |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Height / padding-inline / font-size from the Wave 0 control-size scale |
| `placeholder` | `string` | `''` | |
| `value` | `string` | `''` | Banana-in-a-box with `valueChange` |
| `hint` | `string` | `''` | Rendered below the field; hidden while `error` is set |
| `error` | `string` | `''` | Sets `aria-invalid` + `aria-describedby`; rendered as a `role="alert"` message |
| `required` | `boolean` | `false` | Adds a visible `*` marker (decorative, `aria-hidden`) |
| `disabled` | `boolean` | `false` | Native `disabled` — removed from focus order |
| `readonly` | `boolean` | `false` | Native `readonly` — stays focusable, value stays announced/copyable |
| `autocomplete` | `string` | `'new-password'` | Pass `'current-password'` on login surfaces; the default fits this component's headline signup/change-password/reset surfaces |
| `showStrengthMeter` | `boolean` | `true` | See [Strength meter](#strength-meter) |
| `policyRules` | `InoPasswordPolicyRule[]` | `[]` | See [Policy hint panel](#policy-hint-panel); empty hides the panel |

`valueChange: EventEmitter<string>` fires on every native `input` event.

### Size and density

`size` reads the same three Wave 0 control-size aliases as `ino-input` —
`--ino-control-height`, `--ino-control-padding-inline`, `--ino-control-font-size`. Density
(`[data-density="dense"|"fluid"]`) and `--ino-row-min-height` fall out for free from those
tokens, same as every other sized component — no component-level branch. **Fluid (100% width
toggle)** is out of scope for this issue, same as `ino-input`'s SPEC.md §1: the rebaselined
target is a separate `Fluid` layout component, not yet built.

### Strength meter

On by default — the spec row names it as the headline structural variant, not an opt-in extra.
Renders a 4-segment bar plus a text label (`Too weak`/`Weak`/`Fair`/`Good`/`Strong`) from a fixed
built-in heuristic (length ≥ 8, upper+lower case, a digit, a symbol, plus a length ≥ 12 bonus,
capped at 4). Both the bar and label live inside an `aria-live="polite"` region so the label
change is announced as the user types.

### Policy hint panel

`policyRules: { label: string; test: (value: string) => boolean }[]` — empty by default, which
hides the panel. Pass the named export `INO_PASSWORD_DEFAULT_POLICY_RULES`
(length/case/digit/symbol) for a sane default, or author your own rules for a real product policy.
Each row re-evaluates live and shows a met/unmet checkmark. This is deliberately a **different**
signal from the strength meter (see SPEC.md §2) — a password can satisfy every policy row while
the meter still reads "Fair".

```ts
import { INO_PASSWORD_DEFAULT_POLICY_RULES } from '.../password/ino-password.component';
```

```html
<ino-password label="New password" [policyRules]="INO_PASSWORD_DEFAULT_POLICY_RULES" />
```

### Reveal toggle

A real `<button type="button">` at the trailing edge of the control, toggling the underlying
`<input>` between `password`/`text`. `aria-label` flips between `"Show password"`/`"Hide
password"`; `aria-pressed` reflects the revealed state.

### Caps Lock warning

Shown while the field has caps lock on during typing (`keydown`/`keyup`), cleared on blur. Renders
as `role="status"` — announced once when it appears, not on every keystroke.

---

## States

| State | Trigger | Visual |
|---|---|---|
| Default | — | Border/fill unchanged from `ino-input`'s outline variant |
| Hover | `:hover` | Border darkens toward `on-surface-muted` |
| Active/pressed | `:active` | Border → `--ino-color-accent-active` |
| Focus-visible | `:focus-visible` | `--ino-focus-ring` / `--ino-focus-ring-offset` |
| Disabled | `disabled` input | `opacity: 0.5`, `cursor: not-allowed`, removed from focus order |
| Readonly | `readonly` input | `surface-raised` fill, `cursor: default`, stays focusable |
| Invalid | `error` input set | Border → `--ino-color-danger`, `aria-invalid="true"` |
| Caps-lock warning | Caps Lock on while typing | `role="status"` message, `--ino-color-warning` |
| Loading/busy | — | **Deliberately omitted** — no async-fetch state applies to a password field; see SPEC.md §6 |

---

## Motion

The border transition on state changes uses `--ino-motion-duration-fast` +
`--ino-motion-easing-standard`, collapsing to no animation under `prefers-reduced-motion: reduce`.
The strength meter segments transition color on the same duration/easing.

---

## Labels and fields

`label` renders through the shared `ino-label` leaf, same contract as `ino-input`: a real `<label
for>`, `[required]` for the decorative `*` marker, `[invalid]="!!error"` for the danger-token
treatment. `hint`/`error` render as a paragraph below the field — `error` wins when both are set —
wired via `aria-describedby`.

---

## Accessibility contract

**Role / ARIA** — a real `<label for>` gives the accessible name. `aria-invalid` reflects `error`;
`aria-describedby` points at the error message (`role="alert"`) when present, else the hint text,
then appends the strength meter and policy panel ids (when shown) so both stay programmatically
associated with the input for a screen reader user who navigates straight to the field. The
reveal toggle is a real `<button>` with `aria-label`/`aria-pressed` — never an icon-only
element with no accessible name. The strength meter sits in `aria-live="polite"` so its label
change is announced without interrupting typing. The Caps Lock warning uses `role="status"`
(implicit polite live region), announced once on appearance.

**Keyboard** — standard text-field keyboard model: `Tab`/`Shift+Tab` moves focus between the field
and the reveal toggle; `Enter`/`Space` activates the toggle while it has focus; native caret
navigation while the field is focused and not `readonly`.

**Contrast** — text/placeholder/border pairs are the existing audited roles shared with
`ino-input`. The strength meter's danger/warning/success segment colors and the Caps Lock
warning's `--ino-color-warning` text are all pre-existing audited roles (`check-theme-parity.mjs`),
not new values.

**Target size** — the reveal toggle button is `28×28px`; the control itself clears
`min-block-size: var(--ino-control-height)` at every size rung same as `ino-input`.

**RTL** — logical properties only (`inline-size`, `padding-inline-end`, `inset-inline-end` for the
toggle); no `left`/`right`/`top`/`bottom` anywhere in the stylesheet.

---

## Deliberate omissions

- **Loading/busy state.** Not applicable — a password field has no async-fetch state comparable to
  `ino-input`'s remote-validation `loading`. See SPEC.md §6.
- **Pluggable strength scoring.** The meter's heuristic is fixed, not a caller-supplied function —
  see SPEC.md §2 for why that's kept separate from `policyRules`.

**Mobile parity:**

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView.
- **React Native** — `mobile/react-native/src/components/InoPassword.tsx`. Carries the reveal
  toggle and strength meter; the Caps Lock warning is web-only (no reliable modifier-state signal
  on a touch keyboard).
- **Flutter** — `mobile/flutter/lib/widgets/ino_password.dart`. Same scope as the RN port.
