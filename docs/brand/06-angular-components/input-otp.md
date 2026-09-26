# `<ino-input-otp>` — Input OTP

> Parity benchmark: PrimeNG 22.1.1 `InputOtp` (`specs/primeng/llms-22.1.1.txt`, line 91).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Preview: [`previews/input-otp.html`](previews/input-otp.html).
> Decisions record: `web/src/app/components/input-otp/SPEC.md`.

One-time-password entry: `length` single-character boxes with roving keyboard focus, paste-across-
boxes, and platform SMS/OTP autofill. Built for KYB verification flows (INO-146, INO-31 T-6).

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Group label — `aria-labelledby`, not `<label for>` (a `for` can only target one control) |
| `length` | `number` | `6` | Number of boxes |
| `mask` | `boolean` | `false` | Renders each box as `type="password"` — see [SPEC.md §1](../../../web/src/app/components/input-otp/SPEC.md#1-one-real-input-per-box-not-one-input-with-a-segmented-overlay-dod-row-1-8-9) for the autofill trade-off |
| `integerOnly` | `boolean` | `true` | Digits only, numeric keyboard (`inputmode="numeric"`) — KYB codes are numeric by default |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Height / font-size from the Wave 0 control-size scale (boxes are square) |
| `value` | `string` | `''` | Banana-in-a-box with `valueChange` |
| `hint` | `string` | `''` | Rendered below the boxes; hidden while `error` is set |
| `error` | `string` | `''` | Sets `aria-invalid` on every box + `aria-describedby`; rendered as a `role="alert"` message |
| `required` | `boolean` | `false` | Adds a visible `*` marker on the group label (decorative, `aria-hidden`) |
| `disabled` | `boolean` | `false` | Native `disabled` on every box — removed from focus order |
| `readonly` | `boolean` | `false` | Native `readonly` — boxes stay focusable, values stay announced/copyable |
| `loading` | `boolean` | `false` | Trailing spinner + `aria-busy`; boxes become non-editable for the duration |
| `autofocus` | `boolean` | `false` | Focuses the first empty box on init — opt-in so a page with more than one field never steals focus unasked |

`valueChange: EventEmitter<string>` fires on every box edit. `complete: EventEmitter<string>` fires
once, the moment every box holds a character.

---

## States

| State | Trigger | Visual |
|---|---|---|
| Default | — | 1px border, `surface-sunken` fill, per box |
| Hover | `:hover` | Border darkens toward `on-surface-muted` |
| Active/pressed | `:active` | Border → `--ino-color-accent-active` |
| Focus-visible | `:focus-visible` | `--ino-focus-ring` / `--ino-focus-ring-offset` |
| Disabled | `disabled` input | `opacity: 0.5`, `cursor: not-allowed`, removed from focus order |
| Readonly | `readonly` input | `surface-raised` fill, `cursor: default`, **stays focusable** |
| Invalid | `error` input set | Border → `--ino-color-danger`, `aria-invalid="true"` on every box |
| Loading/busy | `loading` input | Trailing spinner, `aria-busy` on host, boxes made non-editable |

---

## Motion

Border/background transitions use `--ino-motion-duration-fast` + `--ino-motion-easing-standard`,
same as `ino-input`. The loading spinner uses `--ino-motion-duration-slow` linear rotation. Both
collapse to no animation under `prefers-reduced-motion: reduce`.

---

## Accessibility contract

**Role / ARIA** — the box row is `role="group"`, labelled via `aria-labelledby` pointing at
`<ino-label>` (or a static `aria-label="One-time code"` fallback when no `label` is set — see
SPEC.md §4). Each box carries its own `aria-label="Digit N of length"` for position announcement
while navigating box-to-box. A visually-hidden `aria-live="polite"` region announces
`"Digit N of length entered."` / `"...cleared."` per keystroke and `"Code complete."` once every box
is filled — the accessible per-cell announcement pattern the issue calls for.

**Keyboard** — `Tab`/`Shift+Tab` moves focus in/out of the whole group (native tab order, one stop
per box); `←`/`→` move between boxes without leaving the group; typing a character auto-advances to
the next box; `Backspace` on an empty box deletes the previous box's character and moves focus back
to it (same pattern PrimeNG's own docs describe).

**Paste** — pasting anywhere in the group distributes the pasted string across boxes starting at the
focused box; `integerOnly` strips non-digits first. See SPEC.md §3.

**Autofill** — every box carries `autocomplete="one-time-code"` and shares one `name`, the mechanism
Safari/iOS spreads an SMS-autofilled or long-pressed-paste code across adjacent boxes. See SPEC.md §1.

**Contrast** — same audited roles as `ino-input` (`border`, `on-surface-muted`, `accent`,
`accent-active`, `danger`); no new pair to audit.

**Target size** — boxes are square at `--ino-control-height` (36/44/52px across `sm`/`default`/`lg`),
clearing the WCAG 2.2 SC 2.5.8 24px floor at every size and the 44px comfortable recommendation at
`default`/`lg`.

**RTL** — logical properties only (`inline-size`, `inset-inline-end` for the spinner); no
`left`/`right`/`top`/`bottom` anywhere in the stylesheet.

---

## Deliberate omissions

- **Custom template.** No content-projection API — every existing Tier-1 form control in this repo
  is a closed, non-templated leaf; see SPEC.md §8.
- **Filled variant.** `ino-input`'s single-box Material treatment doesn't obviously generalize to N
  discrete boxes; deferred to a future issue. See SPEC.md §8.

## Mobile parity

All three tracks ship (Tier-1 form control, per `17-phase-2-implementation-program.md` §5) —
explicitly required by the issue for KYB verification flows:

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView.
- **React Native** — `mobile/react-native/src/components/InoInputOtp.tsx`.
- **Flutter** — `mobile/flutter/lib/widgets/ino_input_otp.dart`.

Both native ports carry `length`, `mask`, `integerOnly`, `size`, and `disabled`/`readOnly`/`loading`
states, plus their own platform SMS/OTP-autofill hint (`textContentType="oneTimeCode"` on RN,
`AutofillHints.oneTimeCode` on Flutter) and a platform-native per-cell announcement
(`AccessibilityInfo.announceForAccessibility` / `SemanticsService.announce`). See SPEC.md §10.
