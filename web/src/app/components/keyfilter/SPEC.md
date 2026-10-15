# KeyFilter — INO-31 Phase B1 / INO-420 component spec

Parity benchmark: PrimeNG 22.1.1 `pKeyFilter` (`specs/primeng/llms-22.1.1.txt`). PrimeNG is a
benchmark, **not a runtime dependency** — nothing in this directory imports it.

Spec seed: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 (rev-2 amendment
`a21a93c`) — Variants/Structure: directive presets (`int`/`num`/`alpha`/`alphanum`/`regex`);
States/Sizing/Labels: `n/a (directive)`; A11y: must not block IME/AT input, document
screen-reader behavior; Mobile: web directive + RN/Flutter formatter equivalents.

---

## 1. What this component is

A **behaviour-only primitive**, same category as `[inoFocusTrap]` (`../focus-trap/`): it renders
nothing of its own and has no visual states, sizing, or label API. Unlike `<ino-inputmask>`, a
keystroke the `keydown` path allows always lands unchanged — it either lands as typed or doesn't
land at all. (The paste path is the one exception: when `validateOnPaste` is true, §3's `onPaste`
writes the filtered survivors into the field itself.) It blocks keystrokes (and optionally filters
pastes) that don't match a preset or a custom `pattern`, on whatever `<input>`/`<textarea>` it's
attached to.

Two forms ship, backed by one implementation, for the same reason `[inoFocusTrap]` ships two:

| Form | Use when |
|---|---|
| `[inoKeyfilter]` directive | You already own the field element. Preferred — attach it directly to `<ino-input>` or a plain `<input>`. |
| `<ino-keyfilter>` component | The docs portal's manifest-driven live example needs a `*.component.ts` to walk (`scripts/generate-design-system-manifest.mjs` only indexes component files, not directive files) — this wrapper exists for that, not because a real consumer needed a wrapping node. |

The component applies the directive via `hostDirectives`, so it adds **no wrapper node**: the
`(keydown)`/`(paste)` host listeners attach to the `<ino-keyfilter>` host itself, and since both
events bubble, `event.target` inside the handler is still the projected field. The two forms
cannot drift because there is only one implementation.

---

## 2. Definition-of-Done disposition (doc 26 §2, all eight points)

| # | Point | Disposition |
|---|---|---|
| 1 | Variants/Structure | **Satisfied.** Five presets — `int`, `num`, `alpha`, `alphanum`, `regex` (custom `pattern`) — each with a live docs demo. No anatomy/slot diagram: the component has no DOM structure of its own to diagram, matching the `n/a (directive)` disposition the spec seed records. |
| 2 | States | **Deliberate omission, recorded per the spec seed.** The directive paints nothing, so it has no hover/focus-visible/active/disabled/readonly/invalid/loading/empty states of its own — those all belong to the field it's attached to (`<ino-input>` already demonstrates them in its own theme matrix). Adding a typed `disabled` input here would duplicate the host field's own `disabled`, which already stops `keydown` from firing. |
| 3 | Sizing | **Deliberate omission, recorded per the spec seed.** No height, padding or text; sm/md/lg and dense/fluid would change nothing observable. |
| 4 | Labels | **Deliberate omission, recorded per the spec seed.** No label, help text or error text of its own — those belong to the field. |
| 5 | A11y | **Satisfied — this is the point the spec seed calls out by name.** Full contract in §3 below and on the docs page. Summary: filtering happens only in `keydown`, only for a single printable character with no modifier held, and only when `!event.isComposing && event.keyCode !== 229` — an IME composing non-Latin text is never tested against the Latin/numeric preset regexes, so composition is never interrupted. Non-printable and modifier-combo keys (Tab, Backspace, arrows, Ctrl/Cmd/Alt shortcuts) are never intercepted, so assistive technology keeps every key it needs. No role or ARIA of its own — it is a mechanism, not content. Nothing is announced to assistive technology on rejection by default (§3). |
| 6 | Notes | **Satisfied.** PrimeNG mapping (`pKeyFilter`), deliberate omissions (points 2–4 above), and mobile disposition (§5) all recorded here and mirrored on the docs page. |
| 7 | Mobile | **Satisfied — port, not web-only.** Per the spec seed ("Web directive + RN/Flutter formatter equivalents"), unlike `[inoFocusTrap]`'s web-only disposition. See §5. |
| 8 | QA sign-off | **Tracked separately**, as the blocking subtask on INO-420 — the docs page does not ship to Pages until QALead signs off (doc 26 §2 point 8 / D-gate 2/4). |

---

## 3. API and accessibility contract

| Input (directive / component alias) | Type | Default | Behaviour |
|---|---|---|---|
| `inoKeyfilter` / `preset` | `'int' \| 'num' \| 'alpha' \| 'alphanum' \| 'regex'` | `'int'` | Named preset. `'regex'` defers to `pattern`. |
| `pattern` | `string \| RegExp` | `''` | Custom per-character pattern, used only when `preset === 'regex'`. Tested one character at a time like every built-in preset — no anchors needed. |
| `validateOnPaste` | `boolean` | `true` | When a paste contains disallowed characters: strip them and insert the rest (`true`, default), or reject the whole paste (`false`). Either way `inoKeyfilterReject` fires once. |

Output: `inoKeyfilterReject` fires with the rejected character (keydown) or the full rejected
clipboard text (paste).

**Preset rules** (`keyfilter-presets.ts`): `int` allows digits and a leading `-` (once, at
position 0, on an empty-of-minus value); `num` additionally allows one `.`; `alpha` is
`/^[a-zA-Z]$/`; `alphanum` is `/^[a-zA-Z0-9]$/` — the same ASCII classes `../inputmask/mask-tokens.ts`
uses for its `a`/`A`/`*` tokens, one definition of "a letter" across the design system rather than
two. Deliberately narrow, not Unicode-aware (`\p{L}`) — see the IME contract below for why a
non-Latin script is never run against these at all.

**Must-not-block-IME/AT contract.** Filtering happens *only* in the `keydown` handler, and only
for a single printable character (`event.key.length === 1`) with no modifier held
(`ctrlKey`/`metaKey`/`altKey`). The handler returns immediately whenever `event.isComposing` (or
the legacy `keyCode === 229` some browsers/WebViews still use instead of a reliable `isComposing`)
is true. An IME composing non-Latin text is therefore never tested against the preset regexes,
and the composed result is never retroactively stripped once committed — there is deliberately no
`input`-event resync filter the way `<ino-inputmask>` has one, because a resync filter is exactly
the mechanism that would strip IME-composed text after the fact. Non-printable and modifier-combo
keys (Tab, Backspace, Delete, arrows, Home/End, Enter, Ctrl/Cmd/Alt shortcuts — copy, paste,
undo, select-all, screen-reader command keys) are never intercepted, so assistive technology
retains every key it needs.

**Screen-reader behavior.** The directive declares no role or ARIA of its own — it is a
mechanism, not content, same posture as `[inoFocusTrap]`. A blocked keystroke is silent by
default: no `aria-live` region announces the rejection, because a region owned by this directive
would be a second, uncoordinated announcement competing with whatever the host field's own
`<ino-input>`/hint/error text already says. A caller that wants rejections announced wires its own
`aria-live` region to `inoKeyfilterReject` — the output exists for exactly that, and for any other
caller-side reaction (shake animation, toast).

**Paste.** `onPaste` reads `event.clipboardData`, filters the pasted text one character at a time
against the same per-character test the keydown path uses, and either lets the native paste
proceed unmodified (every character already allowed — no `preventDefault()`, no DOM write) or
writes the filtered survivors into the field itself at the original caret position and dispatches
a synthetic `input` event so other listeners (`ngModel`, reactive forms) observe the change.

---

## 4. Implementation decisions worth recording

**Why a directive, not a component that renders its own `<input>`.** Unlike `<ino-inputmask>`
(which hijacks every keystroke to rewrite `input.value` into a formatted shape, so it must own
rendering), key-filtering is a pure allow/deny decision on the native key the browser is about to
insert — there is nothing to render differently. A directive lets it attach to any existing field,
including `<ino-input>`, without introducing a second component in the field's place.

**Why `<ino-keyfilter>` exists at all, given the point above.** Solely so the docs portal has a
`*.component.ts` to walk for its manifest/live-example machinery (§1) — the same reason
`<ino-focus-trap>` exists alongside `[inoFocusTrap]`. It is not a recommended usage pattern; the
docs page leads with the directive form.

**Test harness: `defaultPrevented`, not `.value`.** jsdom does not simulate the browser's native
"insert the typed key" default action for `keydown`, so there is no DOM mutation to assert on for
the keydown path (unlike paste, which the directive writes itself). `event.defaultPrevented`
is the faithful assertion: `false` means the directive let the browser's native action proceed,
`true` means it blocked the keystroke — exactly the contract this directive promises. Signal-based
host fixtures need `fixture.detectChanges()` after every `.set()` call for the same zoneless
reason `../focus-trap/SPEC.md` §7 records — a plain signal write does not retroactively re-run a
template binding already evaluated by a prior `detectChanges()`.

---

## 5. Mobile: RN/Flutter formatter equivalents

**Decision: ported, as formatters, not widgets.** Neither mobile platform has an Angular-style
attribute directive, but both have an idiomatic non-visual "reject this keystroke" primitive:

- **Flutter**: `TextInputFormatter.withFunction`, passed to a `TextField`'s `inputFormatters:`
  list — the framework's own per-edit interception point, applied to `TextEditingValue` rather
  than a single keystroke (Flutter's text-input channel does not expose raw key events the way
  DOM `keydown` does). `mobile/flutter/lib/widgets/ino_keyfilter.dart`.
- **React Native**: a plain hook, `useInoKeyfilter(preset, options)`, returning an `onKeyPress`
  handler (same single-character, non-composing guard as web — RN's `onKeyPress` fires per native
  key on both platforms) plus an `onChangeText` guard for IME-composed/autocomplete-inserted text
  that never produced a `onKeyPress` call. `mobile/react-native/src/components/InoKeyfilter.ts`
  (no JSX, so `.ts` not `.tsx`, matching `keyfilter-presets.ts`'s own split from the directive).

Both ports share the exact same preset semantics as `keyfilter-presets.ts` (leading `-`, single
`.`, the ASCII alpha/alphanum classes) — re-implemented per-platform rather than imported, since
neither mobile runtime can import a web TypeScript module, the same boundary every other port in
this codebase crosses.

**IME parity.** Flutter's `TextInputFormatter` runs on committed `TextEditingValue`, after IME
composition resolves — composition itself is handled below the formatter by the platform text
input plugin, so it is structurally impossible for a formatter to see or interrupt a composing
run. RN's `onKeyPress` does not fire during IME composition on either native platform; the
`onChangeText` guard exists only to reject an already-composed insert the same way `onPaste` does
on web, never to interrupt composition in progress.

---

## 6. Verification

| Gate | Result |
|---|---|
| `npx ng test --include='**/keyfilter/**'` | 22/22 pass (20 directive + 2 component form) |
| `npx ng build` | passes |
| `node scripts/check-ds-adherence.mjs` | zero violations in this component's directory |
| `dart analyze` (Flutter port) | no issues |
| `tsc --noEmit` (RN port) | clean |
