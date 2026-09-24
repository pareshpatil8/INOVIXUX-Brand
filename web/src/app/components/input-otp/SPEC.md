# `<ino-input-otp>` — component spec

**Issue:** [INO-146](/INO/issues/INO-146) (INO-31 T-6, Tier 1 / Form group)
**Parity benchmark:** PrimeNG 22.1.1 `InputOtp` — `specs/primeng/llms-22.1.1.txt` line 91, route
`https://primeng.dev/inputotp`. PrimeNG is a benchmark, **not a runtime dependency**; nothing here
installs it.
**Depended on:** W0-2 (control-size scale), W0-3 (form-label tokens) — both `done` before this
issue started.

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. One real `<input>` per box, not one input with a segmented overlay (DoD row 1, 8, 9)

`length` boxes are `length` independent native `<input maxlength="1">` elements with roving focus
managed in the component (arrow keys / backspace / auto-advance), not a single hidden `<input>`
with `length` decorative boxes painted over it. A single-input-plus-overlay design would need to
fake caret position, fake per-box focus styling, and fake paste-into-the-middle behavior — all
things the browser already does correctly for N real inputs.

This choice is also what makes `autocomplete="one-time-code"` (the issue's explicit requirement)
actually work: Safari/iOS's SMS-code autofill targets a *sequence* of adjacent inputs sharing the
same `name` and `autocomplete="one-time-code"`, spreading the autofilled/pasted code across them
one character per box. There is no single-input equivalent of this behavior for a segmented code
field, so the multi-input design is the mechanism, not an implementation detail — same reasoning
the mobile ports carry forward with `textContentType="oneTimeCode"` (RN) /
`AutofillHints.oneTimeCode` (Flutter).

**Trade-off, written down:** combining `mask` (visual masking, `type="password"`) with OTP autofill
is not guaranteed to work identically across browsers — some autofill heuristics are keyed off
`type="text"`/`type="tel"`. This is a known, accepted trade-off: `mask` is opt-in and off by
default, and unmasked (the default) gets the full autofill/paste behavior with no caveats.

---

## 2. `integerOnly` defaults to `true` (numeric-only, DoD row 6 / issue description)

The issue is explicit that this component is for KYB verification flows, which are numeric SMS/TOTP
codes. `integerOnly` defaults `true`: each box sets `inputmode="numeric"` (mobile numeric keypad)
and rejects non-digit characters on both typed input and paste. Setting `integerOnly="false"`
switches to `inputmode="text"` and accepts any single character, for the (currently unused, but
PrimeNG-parity) alphanumeric-code case.

---

## 3. Paste handling (DoD row 6 / issue description)

A paste landing on any box distributes the pasted string across boxes starting at that box's index
— pasting the full code into the first box (the common case) fills all boxes; pasting into the
middle box (e.g. after partially typing, then pasting the rest) overwrites from that point forward.
`integerOnly` strips non-digit characters from the pasted string before distributing;
non-`integerOnly` strips whitespace only. The native paste event is prevented outright (rather than
letting the browser's default multi-character paste-into-a-`maxlength="1"`-input behavior run,
which browsers clip to one character and silently drop the rest).

---

## 4. Per-cell accessible announcement (DoD row 8 / issue description)

A visually-hidden `aria-live="polite"` region (`.ino-otp-field__sr-only`, same sr-only clip pattern
as `ino-progress-spinner`/`ino-alert`) announces after every keystroke: `"Digit N of length
entered."` on a filled box, `"Digit N of length cleared."` on a Backspace-driven clear, and `"Code
complete."` once every box holds a character (superseding the per-digit message on that keystroke).
This exists because a sighted user sees the caret advance box-to-box as a visible signal that input
landed; a screen-reader user gets no other feedback that a keystroke did anything without this
region — same rationale `ino-progress-spinner`'s SPEC documents for its own live region.

Each box additionally carries its own `aria-label="Digit N of length"` (static, not the live
region) so that navigating box-to-box with a screen reader's own controls, not just typing,
announces position — this is the "uses InputText internally, inheriting its accessibility support"
posture PrimeNG's own docs describe, adapted to real per-box ARIA rather than relying on native
`<input>` semantics alone since there's no visible `<label for>` per box.

The group itself is `role="group"` `aria-labelledby` the `<ino-label>` (when `label` is set) or a
static `aria-label="One-time code"` fallback (when it is not) — a native `<label for>` can only
target one control, so a single label cannot associate with `length` boxes the way `ino-input`
associates its label with its one input.

---

## 5. `readonly`/`loading` reuse `ino-input`'s native-readonly contract (DoD row 5)

Same mechanism as `ino-input` SPEC.md §2/§3: `readonly` sets the native `readonly` attribute (not
`disabled`) so boxes stay focusable and their values stay announced/selectable/copyable; `loading`
sets the same native `readonly` plus a single trailing spinner (after the last box, not per-box) and
`aria-busy` on the host.

---

## 6. Size API (DoD row 3)

`size="sm" | "default" | "lg"` reads two of the Wave 0 control-size aliases —
`--ino-control-height` (reused for both the box's height *and* width, making each box square — no
separate width alias exists, and inventing one would violate the tokens.css freeze) and
`--ino-control-font-size`. No padding-inline alias is read: a single centered character needs no
inline padding the way a left-aligned text run does.

---

## 7. Eight states (DoD row 5)

| State | Carried? | Mechanism |
|---|---|---|
| Default | ✅ | unchanged |
| Hover | ✅ | `:hover:not(:disabled):not(:read-only)` per box |
| Active/pressed | ✅ | `:active:not(:disabled):not(:read-only)`, `--ino-color-accent-active` |
| Focus-visible | ✅ | `--ino-focus-ring` / `--ino-focus-ring-offset`, never a hand-rolled outline |
| Disabled | ✅ | `disabled` input, `:disabled` per box |
| Readonly | ✅ | native `readonly`, `:read-only:not(:disabled)` — see §5 |
| Invalid | ✅ | `error` input, `aria-invalid` per box, `role="alert"` message |
| Loading/busy | ✅ | trailing spinner + `aria-busy` on host + native `readonly` — see §5 |

---

## 8. Variants built (DoD row 6)

| Named in PrimeNG's route | Shipped |
|---|---|
| Configurable length | ✅ `length` input, default `6` |
| Masked / unmasked | ✅ `mask` input — `type="password"` per box when set |
| Integer only | ✅ `integerOnly` input, defaults `true` — see §2 |
| Sizes (sm/lg) | ✅ `size` input, shared control-size scale |
| Custom template | ❌ deliberately deferred — no content-projection API in this issue; every existing Tier-1 form control (`ino-input`, `ino-select`) is likewise a closed, non-templated leaf, and adding one is a separate, larger API surface decision |
| Filled variant | ❌ deliberately deferred — `ino-input`'s `filled` variant is a single-box Material-style treatment (flat bottom corners, base-rule underline); it does not obviously generalize to N discrete square boxes, and the issue does not call it out as required. A future issue can add it once a design direction exists. |

---

## 9. Motion (DoD row 7)

Border/background transition on state changes uses `--ino-motion-duration-fast` +
`--ino-motion-easing-standard`, same as `ino-input`. The loading spinner uses
`--ino-motion-duration-slow` linear rotation, matching `ino-input`/`ino-button`'s spinner contract.
Both collapse to no animation under `prefers-reduced-motion: reduce`. No enter/exit transition is
needed beyond this: like `ino-tag`/`ino-input` (SPEC precedent), this is a non-overlay leaf control
with no mount/unmount animation of its own.

---

## 10. Mobile parity (DoD row 9)

Ships on all three tracks per `docs/brand/17-phase-2-implementation-program.md` §5 — explicitly
required by the issue for KYB verification flows:

- **Capacitor** — not a real port; renders the same Angular component + CSS.
- **React Native** — `mobile/react-native/src/components/InoInputOtp.tsx`. One `TextInput` per box
  with `useRef`-managed focus, `textContentType="oneTimeCode"` (iOS SMS autofill),
  `AccessibilityInfo.announceForAccessibility` for the per-cell announcement (RN has no `aria-live`
  primitive).
- **Flutter** — `mobile/flutter/lib/widgets/ino_input_otp.dart`. One `TextField` per box with its
  own `FocusNode`, `autofillHints: [AutofillHints.oneTimeCode]` (Android SMS Retriever/autofill),
  `SemanticsService.sendAnnouncement` for the per-cell announcement.

Both native ports carry `length`, `mask`, `integerOnly`, `size`, and `disabled`/`readOnly`/`loading`
states using their own token files. Neither carries the (web-deferred, §8) custom-template or
filled-variant surfaces.

**Flutter announcement API migration (INO-302).** All three per-cell calls (`_commit`, digit
entered/cleared/code-complete) migrated from the deprecated `SemanticsService.announce` to
`SemanticsService.sendAnnouncement(View.of(context), ...)`, matching `ino_datepicker.dart`'s
migration in the same change. Checked against the Flutter SDK source
(`semantics_service.dart`): both build the identical `AnnounceSemanticsEvent` and default to
`Assertiveness.polite`; `sendAnnouncement` only adds the explicit `FlutterView` parameter that
`announce` inferred from `PlatformDispatcher.instance.implicitView` (incompatible with multiple
windows). No change to announcement politeness/liveness — the screen reader hears the same
"Digit N of length entered/cleared." / "Code complete." text the same way.

---

## 11. Merge hygiene (DoD row 11)

Touches only `web/src/app/components/input-otp/**`, `mobile/react-native/src/components/InoInputOtp.tsx`,
`mobile/flutter/lib/widgets/ino_input_otp.dart`, this issue's docs page + preview, and one
alphabetically-inserted entry in `scripts/check-theme-parity.mjs`'s `COMPONENT_REGISTRY` (S-9 /
INO-171 — the per-component registry, not the token-layer checks above it, which this issue does
not touch). No change to `web/src/tokens.css` (frozen after Wave 0 — every value this component
needed already existed).
