# `[inoKeyfilter]` / `<ino-keyfilter>` — KeyFilter

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B1 row
> `ino-keyfilter` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377). Issue: [INO-420](/INO/issues/INO-420).
> Parity benchmark: PrimeNG 22.1.1 `pKeyFilter` (`specs/primeng/llms-22.1.1.txt`) — PrimeNG is a
> benchmark, **not a runtime dependency**; nothing here imports it.
> Preview: [`previews/keyfilter.html`](previews/keyfilter.html).
> Full Definition-of-Done disposition: `web/src/app/components/keyfilter/SPEC.md`.

A **behaviour-only primitive**, same category as `[inoFocusTrap]` (`focus-trap.md`): it renders
nothing of its own and has no visual states, sizing, or label API — doc 26 §5's row for this
component records Variants/States/Sizing/Labels as `n/a (directive)` for exactly that reason.
It blocks keystrokes — and, optionally, pastes — that don't match a preset or a custom `pattern`,
on whatever `<input>`/`<textarea>` it's attached to. Unlike `<ino-inputmask>`, it never rewrites
or reformats the field's value: a key either lands unchanged or doesn't land at all. Callers who
need masking/formatting want `<ino-inputmask>`; this is for a plain field that just needs to
refuse the wrong character class (amount fields, numeric IDs, name fields).

---

## Two forms, one implementation

| Form | Use it when |
|---|---|
| `[inoKeyfilter]` **directive** | You already own the field element. Preferred. |
| `<ino-keyfilter>` **component** | The docs portal's manifest-driven live example (below). Not a recommended usage pattern — it exists only because the manifest generator indexes `*.component.ts` files, not directive files; see SPEC.md §1/§4. |

The component applies the directive through `hostDirectives`, so it introduces **no wrapper
node** — the directive's listeners attach to the `<ino-keyfilter>` host itself, and since both
`keydown` and `paste` bubble, the handler's `event.target` is still the projected field. The two
forms cannot drift, because there is only one implementation.

```ts
import { InoKeyfilterDirective } from './components/keyfilter/ino-keyfilter.directive';
// or
import { InoKeyfilterComponent } from './components/keyfilter/ino-keyfilter.component';
```

There is no barrel file; import by path, as with the other components in `web/src/app/components/`.

```html
<!-- Directive form — attach directly to the field you already render. -->
<ino-input label="Amount" inoKeyfilter="num"></ino-input>

<!-- Custom pattern (preset="regex") -->
<input [inoKeyfilter]="'regex'" pattern="[a-f0-9]" />
```

---

## API

| Input (directive) | Component alias | Type | Default | Behaviour |
|---|---|---|---|---|
| `inoKeyfilter` | `preset` | `'int' \| 'num' \| 'alpha' \| 'alphanum' \| 'regex'` | `'int'` | Named preset. `'regex'` defers to `pattern`. |
| `pattern` | `pattern` | `string \| RegExp` | `''` | Custom per-character pattern, used only when `preset === 'regex'`. Tested one character at a time, same as every built-in preset. |
| `validateOnPaste` | `validateOnPaste` | `boolean` | `true` | When a paste contains disallowed characters: strip them and insert the rest (default), or reject the whole paste when `false`. Either way `inoKeyfilterReject` fires once. |

Output: `inoKeyfilterReject: EventEmitter<string>` — fires with the rejected character (keydown)
or the full rejected clipboard text (paste).

### Presets

| Preset | Allows |
|---|---|
| `int` | Digits, plus a leading `-` (once, only at position 0, only while the field has no `-` yet) |
| `num` | Everything `int` allows, plus one `.` |
| `alpha` | `/^[a-zA-Z]$/` — the same ASCII class `<ino-inputmask>`'s `a`/`A` mask tokens use |
| `alphanum` | `/^[a-zA-Z0-9]$/` — the same ASCII class `<ino-inputmask>`'s `*` mask token uses |
| `regex` | Whatever `pattern` matches, tested one character at a time |

### Variants

PrimeNG's `pKeyFilter` ships five equivalent presets (`int`, `num`, `alpha`, `alphanum`, custom
regex) and no other option. We ship the same five plus `validateOnPaste`, which PrimeNG's
directive doesn't separately expose. **`size` and density inputs are deliberately omitted**: the
directive has no height, padding or text, so they would change nothing observable — recorded in
`SPEC.md` §2 rather than silently dropped, same posture `[inoFocusTrap]` takes for the same reason.

---

## Accessibility contract

**Role / ARIA.** None of its own, by design. It is a mechanism, not content — same posture as
`[inoFocusTrap]`.

**Must not block IME or assistive-technology input.** Filtering happens *only* in the `keydown`
handler, and only for a single printable character (`event.key.length === 1`) with no modifier
held (`ctrlKey`/`metaKey`/`altKey`). The handler returns immediately whenever
`event.isComposing` — or the legacy `keyCode === 229` some browsers/WebViews still use instead of
a reliable `isComposing` — is true. An IME composing non-Latin text is therefore never tested
against the (inherently Latin/numeric) preset regexes, so composition is never interrupted and
the composed result is never retroactively stripped. There is deliberately no `input`-event
resync filter the way `<ino-inputmask>` has one — a resync filter is exactly the mechanism that
would strip IME-composed text after the fact. Non-printable and modifier-combo keys (Tab,
Backspace, Delete, arrows, Home/End, Enter, Ctrl/Cmd/Alt shortcuts — copy, paste, undo,
select-all, screen-reader command keys) are never intercepted, so assistive technology retains
every key it needs.

**Screen-reader behavior on rejection.** Silent by default — no `aria-live` region announces a
blocked keystroke, because one owned by this directive would be a second, uncoordinated
announcement competing with whatever the host field's own hint/error text already says.
`inoKeyfilterReject` exists for a caller that wants its own reaction (an `aria-live` region, a
shake animation, a toast):

```html
<ino-input inoKeyfilter="int" (inoKeyfilterReject)="announce($event)"></ino-input>
<div aria-live="polite" class="sr-only">{{ liveMessage() }}</div>
```

**Contrast / target size.** Nothing is painted, so there is no text or non-text contrast pair, and
no pointer target, to audit — same as `[inoFocusTrap]`.

---

## States

**`n/a (directive)`** — doc 26 §5's row for this component records this explicitly, same
disposition `[inoFocusTrap]`'s SPEC.md records for the identical reason: the directive paints
nothing, so it has no hover/focus-visible/active/disabled/readonly/invalid/loading/empty states of
its own. Every one of those belongs to the field it's attached to — `<ino-input>` already
demonstrates its own full state set in its own doc. A typed `disabled` input here would just
duplicate the host field's own `disabled`, which already stops `keydown` from firing before this
directive ever sees the event. Recorded here per doc 26 §2 point 6 rather than silently dropped.

---

## Deliberate omissions

**States, Sizing, and Labels** (doc 26 §2 points 2–4) are recorded `n/a` — see §"States" above and
`SPEC.md` §2 for the full row-by-row disposition.

**PrimeNG mapping.** `pKeyFilter`'s five presets map 1:1 onto `int`/`num`/`alpha`/`alphanum`/custom
regex above.

**Mobile: ported, as formatters rather than widgets** (doc 26 §2 point 6). Neither mobile platform
has an Angular-style attribute directive, so each port is the idiomatic non-visual "reject this
edit" primitive for its runtime instead of a component:

- **Flutter** — `InoKeyfilterFormatter`, a `TextInputFormatter` passed to a `TextField`'s
  `inputFormatters:` list (`mobile/flutter/lib/widgets/ino_keyfilter.dart`).
- **React Native** — `useInoKeyfilter(preset, options)`, a hook returning a `filterChangeText`
  function wired ahead of the caller's own `onChangeText`
  (`mobile/react-native/src/components/InoKeyfilter.ts`).

Both re-implement the preset semantics rather than importing the web module (neither runtime can
import web TypeScript), and both get the IME guarantee for free: a composed run commits as one
already-resolved edit on both platforms, so there is no intermediate composing state either port
could interrupt. Nothing is deferred or dropped here — the full per-row reasoning is in §"Mobile"
below and `SPEC.md` §5.

---

## Mobile

**Ported, as formatters, not widgets** — unlike `[inoFocusTrap]`'s web-only disposition, per the
spec seed ("Web directive + RN/Flutter formatter equivalents"). Neither mobile platform has an
Angular-style attribute directive, but both have an idiomatic non-visual "reject this edit"
primitive:

- **Flutter**: `InoKeyfilterFormatter`, a `TextInputFormatter` passed to a `TextField`'s
  `inputFormatters:` list — `mobile/flutter/lib/widgets/ino_keyfilter.dart`.
- **React Native**: `useInoKeyfilter(preset, options)`, a hook returning a `filterChangeText`
  function wired ahead of the caller's own `onChangeText` — `mobile/react-native/src/components/InoKeyfilter.ts`.

Both re-implement the exact preset semantics above rather than importing the web module (neither
mobile runtime can import web TypeScript), and both resolve IME composition the same way: a
composed run commits as a single already-resolved edit on both platforms, so there is no
intermediate composing state either port could see or interrupt — composition can never be
blocked, by construction, matching the web directive's explicit guard. Full reasoning:
`SPEC.md` §5.

---

## Verification

| Gate | Result |
|---|---|
| `npx ng test --include='**/keyfilter/**'` | 22/22 pass (20 directive + 2 component form) |
| `npx ng build` | passes |
| `node scripts/check-ds-adherence.mjs` | zero violations in this component's directory |
| `dart analyze` (Flutter port) | no issues |
| `tsc --noEmit` (RN port) | clean |
