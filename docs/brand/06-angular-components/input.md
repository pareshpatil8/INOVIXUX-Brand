# `<ino-input>` — Input

> Parity benchmark: PrimeNG 22.1.1 `InputText` (`specs/primeng/llms-22.1.1.txt`, line 78).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Gap analysis: `docs/brand/16-design-system-parity-vs-echeque-reference.md` §7.
> Preview: [`previews/input.html`](previews/input.html).
> Decisions record: `web/src/app/components/input/SPEC.md`.

Labeled single-line text control. This uplift (INO-157, INO-31 U-2) adds the size API, a `filled`
variant, and explicit `readonly`/`loading` states on top of the existing label/hint/error contract.
Icon slots and prefix/suffix addons are **not** `@Input`s on this component — wrap it with
`<ino-icon-field>` (T-16) or `<ino-input-group>` (T-17) instead; see [SPEC.md §1](../../../web/src/app/components/input/SPEC.md#1-icon-slots-are-a-wrapper-not-an-input-icon-dod-row-6)
for why.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Rendered as a real `<label for>` |
| `type` | `'text' \| 'email' \| 'password' \| 'number' \| 'search' \| 'tel' \| 'url'` | `'text'` | |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Height / padding-inline / font-size from the Wave 0 control-size scale — see [Size API](#size-api) |
| `variant` | `'outline' \| 'filled'` | `'outline'` | See [Variants](#variants) |
| `placeholder` | `string` | `''` | |
| `value` | `string` | `''` | Banana-in-a-box with `valueChange` |
| `hint` | `string` | `''` | Rendered below the control; hidden while `error` is set |
| `error` | `string` | `''` | Sets `aria-invalid` + `aria-describedby`; rendered as a `role="alert"` message |
| `required` | `boolean` | `false` | Adds a visible `*` marker (decorative, `aria-hidden`) |
| `disabled` | `boolean` | `false` | Native `disabled` — removed from focus order |
| `readonly` | `boolean` | `false` | Native `readonly` — stays focusable, value stays announced/copyable |
| `loading` | `boolean` | `false` | Inert spinner + `aria-busy`; control becomes non-editable for the duration |

`valueChange: EventEmitter<string>` fires on every native `input` event.

### Size API

Reads three of the Wave 0 control-size aliases — `--ino-control-height`,
`--ino-control-padding-inline`, `--ino-control-font-size` — the subset a text control needs (no
icon/gap aliases, since this component ships no icon of its own; see SPEC.md §1). Density
(`[data-density="dense"|"fluid"]`) and `--ino-row-min-height` fall out for free, same as every
other sized component.

### Variants

| `variant` | Look |
|---|---|
| `outline` (default) | All-round 1px border, `surface-sunken` fill — unchanged from the pre-uplift component |
| `filled` | `surface-raised` fill, flat bottom corners, single `border-block-end` rule that thickens/recolors on hover and focus — Material-style filled field, the precondition the gap analysis named for float/IFTA-style labels |

---

## States

| State | Trigger | Visual |
|---|---|---|
| Default | — | Border/fill per variant |
| Hover | `:hover` | Border (or base rule, filled) darkens toward `on-surface-muted` |
| Active/pressed | `:active` | Border/base-rule → `--ino-color-accent-active` |
| Focus-visible | `:focus-visible` | `--ino-focus-ring` / `--ino-focus-ring-offset`, never a hand-rolled outline |
| Disabled | `disabled` input | `opacity: 0.5`, `cursor: not-allowed`, removed from focus order |
| Readonly | `readonly` input | `surface-raised` fill (outline) / `surface-sunken` fill (filled), `cursor: default`, **stays focusable** |
| Invalid | `error` input set | Border/base-rule → `--ino-color-danger`, `aria-invalid="true"` |
| Loading/busy | `loading` input | Trailing spinner, `aria-busy` on host, control made non-editable (same mechanism as readonly) |

---

## Motion

The border/background transition on state changes uses `--ino-motion-duration-fast` +
`--ino-motion-easing-standard`. The loading spinner uses `--ino-motion-duration-slow` linear
rotation, matching `ino-button`'s spinner. Both collapse to no animation under
`prefers-reduced-motion: reduce`.

---

## Accessibility contract

**Role / ARIA** — a real `<label for>` (not a placeholder-only control) gives the accessible name.
`aria-invalid` reflects `error`; `aria-describedby` points at the error message (`role="alert"`)
when present, else the hint text — so the description is announced on focus either way, not just
shown visually via a red border. `aria-busy` is set on the `ino-input` host (not the native
`<input>`, which has no valid busy state) while `loading`.

**Keyboard** — standard text-field keyboard model: `Tab`/`Shift+Tab` to move focus, native caret
navigation and text editing while focused and not `readonly`/`loading`.

**Contrast** — text/placeholder/border pairs are the existing audited roles; the `filled` variant's
`surface-raised` fill and `border-block-end` progression reuse those same roles, so no new contrast
pair needed auditing.

**Target size** — `min-block-size: var(--ino-control-height)` clears the WCAG 2.2 SC 2.5.8 24px
floor at every size rung (`sm` = 36px, `default`/`lg` above 44px), and clears the 44px comfortable
recommendation at `default`/`lg`.

**RTL** — logical properties only (`inline-size`, `padding-inline`, `border-block-end`,
`inset-inline-end` for the spinner, `border-end-start-radius`/`border-end-end-radius` for the
filled variant's flat corners); no `left`/`right`/`top`/`bottom` anywhere in the stylesheet.

---

## Deliberate omissions

- **Fluid (100% width toggle).** Not carried in this issue — the gap analysis rebaselines this onto
  a separate `Fluid` layout component (not yet built). The control keeps its existing
  always-100%-width behavior.
- **Icon slots / prefix-suffix addons as `@Input`s.** Not carried by design — use `<ino-icon-field>`
  / `<ino-input-group>` instead. See [SPEC.md §1](../../../web/src/app/components/input/SPEC.md#1-icon-slots-are-a-wrapper-not-an-input-icon-dod-row-6).

## Mobile parity

All three tracks ship (Tier-1 form control, per `17-phase-2-implementation-program.md` §5):

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView ("Capacitor is not a port").
- **React Native** — `mobile/react-native/src/components/InoInput.tsx`.
- **Flutter** — `mobile/flutter/lib/widgets/ino_input.dart`.

Both native ports carry `size`, `variant` (outline/filled), and `disabled`/`readOnly`/`loading`
states using their own token files (`theme/tokens.ts` / `theme/tokens.dart`); neither carries an
icon-slot prop, matching the web component's scope (§1) — T-16/T-17 are Capacitor-only per the
porting rule, so there is no RN/Flutter wrapper to compose with yet.
