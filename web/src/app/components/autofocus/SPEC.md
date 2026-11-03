# Autofocus — INO-31 B4 / INO-466 component spec

Parity benchmark: PrimeNG 22.1.1 `pAutoFocus` ("AutoFocus manages focus on focusable element on
load", `specs/primeng/llms-22.1.1.txt`). PrimeNG is a benchmark, **not a runtime dependency** —
nothing in this directory imports it.

Spec seed: doc 26 §5 row "ino-autofocus" — directive; initial-focus management; a11y note
"documented interplay with focus-trap + route change"; mobile disposition "Web + both mobile
equivalents." This file, `docs/brand/06-angular-components/autofocus.md`, and the mobile ports in
`mobile/react-native/src/components/InoAutofocus.ts` /
`mobile/flutter/lib/widgets/ino_autofocus.dart` are the three deliverables that row requires.

---

## 1. What this component is

A **behaviour-only primitive**, the same category as `[inoFocusTrap]` (`../focus-trap/SPEC.md`).
It renders no box, no background, no border, no text and has no intrinsic size. Its entire output
is a one-time (per activation) change in where keyboard focus sits.

That fact determines most of this document, the same way it determined `focus-trap/SPEC.md`.
Several rows of the doc 26 §2 Definition-of-Done are written for components that *paint*. Rather
than invent visual API to satisfy them, each is recorded below as satisfied, vacuous, or a
deliberate omission with a reason — a vacuous row is recorded, not silently dropped (row 6).

Two forms ship, backed by one implementation:

| Form | Use when |
|---|---|
| `[inoAutofocus]` directive | You already own the element to focus — an input, a button, a heading given `tabindex="-1"` as a route-change landing target. Preferred; this is the common case. |
| `<ino-autofocus>` component | You want to wrap a block of projected content and let the directive find the first focusable element inside it, without you needing to know which element that is. |

The component applies the directive via `hostDirectives`, so it adds **no wrapper node** — the
directive operates on the `<ino-autofocus>` host itself. The two forms cannot drift, because there
is only one implementation.

**Why no separate "wrap and focus first descendant" codepath exists for the component form.**
`[inoFocusTrap]` needed its own first-tabbable walk because a trap must maintain a full ordered
list to support Tab wrapping. This directive never wraps anything — it needs exactly one target —
so the same `resolveTarget()` method serves both forms unchanged: given a host, it tries an
explicit `inoAutofocusTarget` selector, then the host itself, then the host's first focusable
descendant via one `querySelector`. No ordering logic exists to duplicate from the trap.

---

## 2. Definition-of-Done disposition (doc 26 §2, all eight points)

| # | Row | Disposition |
|---|---|---|
| 1 | Variants/Structure | **Satisfied, per the spec seed's own row.** The spec seed names no variant axis ("directive; initial-focus management"); the one structural choice — directive vs. element form — is documented in §1 above and demonstrated on the docs page. |
| 2 | States | **Deliberate omission, recorded per row 6.** Default, hover, active, readonly, invalid, loading and empty have no meaning for a primitive that paints nothing and has no interaction surface of its own — the same disposition `[inoFocusTrap]` records for the same reason, and the same one `[inoKeyfilter]` records ("every one of those belongs to the field it's attached to"). `inoAutofocus` (on/off) is the one real, binary state, and it is demonstrated. Focus-visible belongs to whatever element is focused — this directive never paints a ring of its own, so the focused element's own `--ino-focus-ring` is what appears, correct in all three themes for free. |
| 3 | Sizing (sm/md/lg + dense/fluid) | **Deliberate omission,** same reasoning as rows 2–4 of `focus-trap/SPEC.md`. The directive has no height, padding or text; a size input would be a typed input that changes nothing observable, and would misleadingly imply the Wave 0 control-height scale applies here. |
| 4 | Labels | **Deliberate omission.** No label, help text or error text of its own — whatever is focused keeps its own. |
| 5 | a11y | **Satisfied — this row is the component.** Full contract in §3 below and on the docs page: the focus-trap interplay rule, the route-change (`NavigationEnd`) mechanism for SC 2.4.3, and the WCAG success criteria this closes. No role or ARIA of its own — a mechanism, not content. |
| 6 | Notes | **Satisfied by this document.** Rows 2–4's omissions are recorded here rather than dropped silently, per this row's own requirement. PrimeNG mapping: §0 above. Platform caveat: §5 below (mobile has no attribute-directive concept; both ports are idiomatic non-visual equivalents, not forced widget ports — same call `[inoKeyfilter]`'s ports made). |
| 7 | Mobile | **Ported.** Unlike `[inoFocusTrap]` (an explicit web-only decision — neither mobile platform has a DOM tab order to contain), the spec seed for this row explicitly calls for "Web + both mobile equivalents," and both platforms have an idiomatic non-visual focus-placement primitive to port to. See §5. |
| 8 | QA sign-off | Tracked on the gate subtask of INO-466, assigned to QALead per doc 26 §2.1 — not closed by this directory's builder. |

---

## 3. API and accessibility contract

| Input (directive / component alias) | Type | Default | Behaviour |
|---|---|---|---|
| `inoAutofocus` | `boolean` | `true` | Selector and on/off switch in one — the bare attribute defaults `true`. Set `false` to suppress a single instance of a shared template without restructuring it. |
| `inoAutofocusTarget` / `target` | `string` | `''` | CSS selector resolved **within** the host. Falls back to the host itself if focusable, then the host's first focusable descendant. |
| `inoAutofocusPreventScroll` / `preventScroll` | `boolean` | `false` | Forwarded to the native `focus({ preventScroll })` option. |
| `inoAutofocusTrigger` / `trigger` | `unknown` | `undefined` | Changing this value **after** the first activation re-runs focus placement — the route-change mechanism; see below. Has no effect on the very first activation, which `ngOnInit` already owns. |

| Method | Notes |
|---|---|
| `focusNow()` | Re-runs focus placement imperatively — the alternative to `inoAutofocusTrigger` for a re-run driven by something that is not itself a bound input (an async HTTP response, a WebSocket event). |

The two boolean inputs use Angular's `booleanAttribute` transform, so the bare attribute form and
the bound form behave alike, matching `[inoFocusTrap]`'s own inputs.

### Interplay with `[inoFocusTrap]` — binding, not advisory

If the host sits inside an ancestor `[inoFocusTrap]` / `<ino-focus-trap>` (found via `closest()`
at activation time), this directive is a **no-op, unconditionally** — including while that trap is
`disabled`. Both primitives defer their first focus move to the same `queueMicrotask` tick; running
both inside the same trap would make the outcome a race rather than a contract. Point the trap's
own `inoFocusTrapInitialFocus` selector at the element you would otherwise have put
`[inoAutofocus]` on — it performs the identical "selector within the container" lookup, and it
already re-runs on every trap re-activation (`inoFocusTrapDisabled` flipping back to `false`),
which this directive's own `inoAutofocusTrigger` would otherwise have to duplicate.

### Interplay with route changes — the mechanism doc 26 §5 asks for

Angular's `Router` does not move focus on navigation. That silence is exactly the gap WCAG 2.2 SC
2.4.3 (Focus Order) requires an SPA to close for itself, since a full document load gives a user
agent an automatic focus reset that a client-side route transition does not. `ngOnInit` cannot be
the whole answer: the router **reuses** a component instance across a navigation that re-resolves
the same route definition — a detail page keyed by a path parameter, a tab inside a persistent
shell — so `ngOnInit` runs exactly once no matter how many times the user navigates through that
route. Bind `inoAutofocusTrigger` to a value that changes on every navigation worth re-focusing for
(a `Router.events` `NavigationEnd` id, the resolved url, a route param), and this directive re-runs
focus placement on every change after the first — the same reset a full page load gives a document
for free. The docs page demo exercises this with a "simulate navigation" control.

### What this directive deliberately does not check

It does not check whether something else already holds focus before moving it, and does not walk
visibility the way `[inoFocusTrap]`'s `tabbables()` does. Native `autofocus` makes neither check
either, and a hidden or already-focused target silently declining to move focus would be a harder
defect to notice than focus visibly landing somewhere unexpected during development. It is the
caller's responsibility to gate `inoAutofocus` (or the `inoAutofocusTrigger` value) on whatever
condition makes "move focus now" correct for that surface.

### Why no `Esc`/dismissal handling

There is nothing to dismiss. This directive performs one focus move per activation and then does
nothing else — compare `[inoFocusTrap]`, which must own containment for as long as it is active and
therefore does need a suspend/resume/restore lifecycle. Autofocus has no such ongoing lifecycle.

### Contrast and RTL

Nothing is painted, so there is no text or non-text contrast pair to audit, and no positioned
element whose logical-vs-physical direction could be wrong. The directive never touches the focus
ring of the element it focuses — that element keeps whatever `--ino-focus-ring` it already paints.

---

## 4. Verification

| Gate | Result |
|---|---|
| `npx ng test --watch=false` (scoped to this directory's spec file) | 11/11 pass (9 directive + 2 component form) |
| `node scripts/check-ds-adherence.mjs --json` | zero violations under `web/src/app/components/autofocus/` |
| `node scripts/check-theme-parity.mjs` | runs clean against this directory — no colour role is read here, so there is no per-theme contrast pair contributed |
| `npx ng build` | passes (see issue comment for the exact invocation and log) |

**Full-suite note.** `npx ng test --watch=false` run across the whole project at the time of this
build reports pre-existing failures in `accordion`, `panel-menu`, `stepper` and `tabs` unrelated to
this directory, plus a separate pre-existing compile break in
`web/src/app/components/scrolltop/ino-scrolltop.spec.ts` (that file uses Jasmine's
`spyOn`/`jasmine.createSpy`, but `tsconfig.spec.json` declares only `"types": ["vitest/globals"]`
— the project's actual unit-test runner). Neither is introduced by this change; both are reported
on the components' own tracks rather than fixed here, per the standing "don't fix what you must
approve" / whole-app-build-break rule.

---

## 5. Mobile: ported, as idiomatic non-visual equivalents

**Decision: ported**, per the spec seed's "Web + both mobile equivalents" disposition — the one
difference in kind from `[inoFocusTrap]`'s explicit web-only decision (`focus-trap/SPEC.md` §5).
Neither mobile platform has an Angular-style attribute directive, but both have — like the
`[inoKeyfilter]` port before this one (`../keyfilter/SPEC.md` §5) — an idiomatic non-visual
primitive to carry the same behaviour:

- **React Native**: a plain hook, `useInoAutofocus(ref, options)`, returning nothing but an effect
  that calls `ref.current?.focus()` on mount and again whenever `options.trigger` changes — the
  same route-change mechanism as the web directive's `inoAutofocusTrigger`, since React Navigation
  reuses screen instances across param-only navigations exactly the way Angular's `Router` reuses
  component instances. `mobile/react-native/src/components/InoAutofocus.ts` (no JSX, so `.ts` not
  `.tsx`, matching `InoKeyfilter.ts`'s own split from a widget).
- **Flutter**: `InoAutofocus`, a small `StatefulWidget` wrapping a `FocusNode` and a `child`
  builder, requesting focus in `initState` and again in `didUpdateWidget` when a `trigger` value
  changes. Flutter's own `autofocus: true` property (already used by `ino_input.dart` and others)
  only ever fires once, on the widget's first build — it has no equivalent to a route-change
  re-run, which is the actual gap this port exists to close, the same way `FocusScope` already
  covers what `[inoFocusTrap]` would otherwise have needed to port (`focus-trap/SPEC.md` §5).
  `mobile/flutter/lib/widgets/ino_autofocus.dart`.

**No focus-trap interplay to port.** `[inoFocusTrap]` was never ported to either mobile platform —
React Native has no DOM tab order and Flutter scopes focus by construction through `FocusScope` on
a modal route (`focus-trap/SPEC.md` §5) — so there is no ancestor-trap race for either mobile port
to guard against. Both mobile ports are therefore simpler than the web directive by construction,
not by omission.

**Preset/logic parity note does not apply here.** Unlike `[inoKeyfilter]`, this directive carries
no per-character test table to keep byte-for-byte equivalent across three languages — "focus this
ref/node, again on trigger change" is the entire behaviour, so there is nothing further to port
beyond the mechanism itself.

| Gate | Result |
|---|---|
| `tsc --noEmit` (RN port, from `mobile/react-native/`) | clean |
| `dart analyze` (Flutter port, from `mobile/flutter/`) | no issues |
