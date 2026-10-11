# `<ino-inputmask>` — Input mask

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B1 row
> `ino-inputmask` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377).
> Preview: [`previews/inputmask.html`](previews/inputmask.html).
> Decisions record: `web/src/app/components/inputmask/SPEC.md`.

Pattern-masked text entry, promoted (INO-404) from the bare `<ino-input>` partial. Ships five
India-stack presets (PAN, GSTIN, IFSC, phone, date), an arbitrary `mask` grammar for anything else,
a derived `incomplete` state, and the mask format announced via `aria-describedby`.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Rendered as a real `<label for>` |
| `mask` | `string` | `''` | Explicit mask pattern (see [Mask grammar](#mask-grammar)); ignored when `preset` is set |
| `preset` | `'pan' \| 'gstin' \| 'ifsc' \| 'phone' \| 'date' \| ''` | `''` | India-stack preset; takes precedence over `mask`/`placeholderChar` |
| `placeholderChar` | `string` | `'_'` | Character shown in unfilled editable slots |
| `value` | `string` | `''` | Banana-in-a-box with `valueChange`; **compact** raw string (literals excluded) |
| `hint` | `string` | `''` | Rendered below the field; hidden while `error` is set |
| `error` | `string` | `''` | Sets `aria-invalid` + `aria-describedby`; rendered as a `role="alert"` message |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Height / padding-inline / font-size from the Wave 0 control-size scale |
| `required` | `boolean` | `false` | Native `required` |
| `disabled` | `boolean` | `false` | Native `disabled` — removed from focus order |
| `readonly` | `boolean` | `false` | Native `readonly` — stays focusable, value stays announced/copyable |
| `loading` | `boolean` | `false` | Spinner + `aria-busy`; keydown/paste ignored while true |

`valueChange: EventEmitter<string>` fires on every commit (keydown edit, paste, or resync).
`maskComplete: EventEmitter<string>` fires once, the moment every required slot holds a character.

### Mask grammar

`9` required digit · `a` required letter · `A` required letter, auto-uppercased · `*` required
letter-or-digit · `?` marks everything after it optional (doesn't consume a slot) · `\` escapes the
next character as a literal (e.g. `\9` for a literal digit `9`) · anything else is a literal
separator, auto-inserted and never typed (unless the user types that exact character there, which
is accepted).

### India-stack presets

| Preset | Mask | Example |
|---|---|---|
| `pan` | `AAAAA9999A` | `ABCDE1234F` |
| `gstin` | `99AAAAA9999A9Z*` | `22ABCDE1234F1Z5` |
| `ifsc` | `AAAA0******` | `HDFC0001234` |
| `phone` | `+\91 99999 99999` | `+91 98765 43210` |
| `date` | `99/99/9999` | `31/01/2026` |

```html
<ino-inputmask label="PAN" preset="pan" [(value)]="pan" />
```

### Size and density

`size` reads the same three Wave 0 control-size aliases as `ino-input` —
`--ino-control-height`, `--ino-control-padding-inline`, `--ino-control-font-size`. Density
(`[data-density="dense"|"fluid"]`) and `--ino-row-min-height` fall out for free from those tokens,
same as every other sized component — no component-level branch.

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
| Incomplete | derived — some but not all required slots filled | Border → `--ino-color-warning`, cleared once complete or emptied |
| Loading/busy | `loading` input set | Spinner, `aria-busy="true"`, keydown/paste ignored |

`incomplete` is never combined with `error`'s red — `error` (caller-driven, e.g. a failed checksum)
always wins visually, since a caller sets `error` only once completeness has already been
validated. See `SPEC.md` §4.

---

## Motion

The border transition on state changes uses `--ino-motion-duration-fast` +
`--ino-motion-easing-standard`, collapsing to no animation under `prefers-reduced-motion: reduce`.

---

## Labels and fields

`label` renders through the shared `ino-label` leaf, same contract as `ino-input`: a real `<label
for>`, `[required]` for the decorative `*` marker, `[invalid]="!!error"` for the danger-token
treatment. `hint`/`error` render as a paragraph below the field — `error` wins when both are set —
wired via `aria-describedby`, alongside the mask format description (below).

---

## Accessibility contract

**Role / ARIA** — a real `<label for>` gives the accessible name. `aria-invalid` reflects `error`;
`aria-describedby` points at the error message (`role="alert"`) or hint text, plus a
visually-hidden format description built from the mask (e.g. *"Format: 5 letters, 4 digits, 1
letter. Empty characters shown as \"_\"."*) — always present, appended rather than replacing
hint/error.

**Keyboard / caret management** — typing a character advances the caret past any trailing literal
run to the next editable slot; Backspace/Delete clear the previous/next editable slot (or the full
selection) and land the caret there; paste threads the clipboard text through the mask and places
the caret just past the last slot filled; focusing an empty field jumps the caret to the first
empty editable slot. Arrows/Tab/Home/End use native caret movement unchanged.

**Contrast** — text/placeholder/border pairs are the existing audited roles shared with `ino-input`.
The incomplete state's `--ino-color-warning` border is a pre-existing audited role
(`check-theme-parity.mjs`), not a new value.

**Target size** — the control clears `min-block-size: var(--ino-control-height)` at every size rung,
same as `ino-input`.

**RTL** — logical properties only (`inline-size`, `padding-inline`); no `left`/`right`/`top`/`bottom`
anywhere in the stylesheet.

---

## Deliberate omissions

- **Pluggable mask grammar extension.** The token set (`9`/`a`/`A`/`*`/`?`/`\`) is fixed; a caller
  who needs a different token vocabulary composes it from literals and the existing tokens rather
  than the component accepting custom token definitions — see `SPEC.md` §2.
- **Checksum/format validation.** The component enforces the *shape* of a PAN/GSTIN/etc., never the
  checksum — `error` is caller-driven for that (SPEC.md §3, same split `ino-password`'s strength
  meter vs. policy panel draws).

## Mobile parity

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView.
- **React Native** — `mobile/react-native/src/components/InoInputMask.tsx`. Re-derives the mask's
  slot set from `onChangeText`'s raw string each change rather than intercepting `keydown` (RN has
  no reliable per-keystroke interception); carries the incomplete/invalid visual states and the
  format description as `accessibilityHint`.
- **Flutter** — `mobile/flutter/lib/widgets/ino_inputmask.dart`. Same re-derive-on-change approach
  via `TextEditingController`; format description exposed as `Semantics.hint`.
