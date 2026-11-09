# `[inoAutofocus]` / `<ino-autofocus>` — Autofocus

> Parity benchmark: PrimeNG 22.1.1 `pAutoFocus` (`specs/primeng/llms-22.1.1.txt`).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Spec seed: doc 26 §5 (B4) — "directive; initial-focus management", a11y note "documented
> interplay with focus-trap + route change", mobile disposition "Web + both mobile equivalents."
> Preview: [`previews/autofocus.html`](previews/autofocus.html).
> Full Definition-of-Done disposition: `web/src/app/components/autofocus/SPEC.md`.

A **behaviour-only primitive**. It renders no box, no background, no border and has no intrinsic
size — its entire output is a one-time change in where keyboard focus sits. It exists because the
native `autofocus` attribute only ever fires once, at parse time, for a document the browser is
still constructing — content Angular inserts afterward (an `*ngIf` panel, a route component, a tab
switching in) never gets it at all.

---

## Two forms, one implementation

| Form | Use it when |
|---|---|
| `[inoAutofocus]` **directive** | You already own the element to focus — an input, a button, a heading given `tabindex="-1"` as a route-change landing target. Preferred; this is the common case. |
| `<ino-autofocus>` **component** | You want to wrap a block of projected content and let the directive find the first focusable element inside it. |

The component applies the directive through `hostDirectives`, so it introduces **no wrapper
node** — the directive operates on the `<ino-autofocus>` host itself. The two forms cannot drift,
because there is only one implementation behind them. Same shape as `[inoFocusTrap]` /
`<ino-focus-trap>`.

```ts
import { InoAutofocusDirective } from './components/autofocus/ino-autofocus.directive';
// or
import { InoAutofocusComponent } from './components/autofocus/ino-autofocus.component';
```

There is no barrel file; import by path, as with the other components in `web/src/app/components/`.

```html
<!-- Directive form -->
<ino-input label="Account holder" inoAutofocus></ino-input>

<!-- Element form — focuses the first focusable descendant it finds -->
<ino-autofocus>
  <ino-input label="Account holder"></ino-input>
</ino-autofocus>
```

---

## API

| Input (directive) | Component alias | Type | Default | Behaviour |
|---|---|---|---|---|
| `inoAutofocus` | `inoAutofocus` | `boolean` | `true` | Selector and on/off switch in one — the bare attribute defaults `true`. Set `false` to suppress a single instance of a shared template without restructuring it. |
| `inoAutofocusTarget` | `target` | `string` | `''` | CSS selector resolved **within** the host. Falls back to the host itself if focusable, then the host's first focusable descendant. |
| `inoAutofocusPreventScroll` | `preventScroll` | `boolean` | `false` | Forwarded to the native `focus({ preventScroll })` option. |
| `inoAutofocusTrigger` | `trigger` | `unknown` | `undefined` | Changing this value **after** the first activation re-runs focus placement — the route-change mechanism below. No effect on the very first activation. |

| Method | Notes |
|---|---|
| `focusNow()` | Re-runs focus placement imperatively — for a re-run driven by something that isn't itself a bound input (an async HTTP response, a WebSocket event). |

The two boolean inputs use Angular's `booleanAttribute` transform, so the bare attribute form and
the bound form behave alike, matching `[inoFocusTrap]`'s own inputs. `inoAutofocus` itself is the
**selector**; it activates on init unless set `false`.

### Variants

PrimeNG's `pAutoFocus` ships one option (`autofocus`); there is no variant axis to match. We ship
that plus the three inputs above, which the directive's own consumers (route-landing headings,
dialog-adjacent fields outside a trap, prefilled forms) need.

---

## States

The directive has **no visual state of its own**. It renders nothing, owns no host styling, and
adds no class or attribute that CSS could key off — so there is no `default`, `:hover`,
`:focus-visible`, `:active`, `:disabled`, `:readonly` or `:invalid` treatment to document. Any
state you see after it runs belongs to the element it focused, which keeps its own `:focus-visible`
ring from that component's contract.

What it has instead is **activation behaviour**:

| Condition | Behaviour |
|---|---|
| `inoAutofocus` is `true` (default) on init | Resolves the target and focuses it once, deferred a microtask so projected content and `@if` branches are laid out first |
| `inoAutofocus` is `false` | Inert — no focus call, no side effect. Re-checked inside the deferred callback too, so flipping it off in the same tick cancels the pending focus |
| Any bound input changes after the first activation | Re-runs placement. `inoAutofocusTrigger` is the input that exists purely to drive this; `ngOnInit` owns the first activation, so a trigger present from the start does not double-focus |
| `focusNow()` called | Same placement, run imperatively for a re-run that isn't a bound-input change (an async response callback) |
| Host is inside `[inoFocusTrap]` / `<ino-focus-trap>` | **Stands down entirely** — the trap owns initial focus. This is a guard, not a race; see the Accessibility contract below |
| `inoAutofocusTarget` omitted | Focuses the host if the host is itself focusable, else its first focusable descendant |
| `inoAutofocusTarget` set but matching nothing focusable | Focuses **nothing** — there is no fallback to the host in this branch, on the grounds that an explicit selector is a statement of intent and silently focusing something else would be worse than focusing nothing. Never throws |
| `inoAutofocusPreventScroll` is `true` | Focuses with `{ preventScroll: true }`, so the page does not jump to the target |

Because focus placement is a one-shot mechanism rather than a rendered state, the `disabled`
question lands on the *target*: `isFocusable()` screens disabled elements out during resolution, so
a disabled target resolves to `null` rather than being focused.

---

## Accessibility contract

**Role / ARIA.** None of its own — a mechanism, not content.

**Interplay with `[inoFocusTrap]` — read this before combining them.** If the host sits inside an
ancestor `[inoFocusTrap]` / `<ino-focus-trap>` (found via `closest()`), `[inoAutofocus]` is a
**no-op, unconditionally — including while that trap is `disabled`.** Both primitives defer their
first focus move to the same microtask tick; running both inside the same trap would make the
outcome a race, not a contract. **Point the trap's own `inoFocusTrapInitialFocus` at the element
you would otherwise have put `[inoAutofocus]` on** instead of stacking both — it performs the
identical lookup and already re-runs on every trap re-activation.

**Interplay with route changes — WCAG 2.2 SC 2.4.3 (Focus Order).** Angular's `Router` does not
move focus on navigation, and `ngOnInit` alone cannot close that gap: the router **reuses** a
component instance across a navigation that re-resolves the same route (a detail page keyed by a
path parameter, a tab inside a persistent shell), so `ngOnInit` runs exactly once no matter how
many times the user navigates through it. Bind `inoAutofocusTrigger` to a value that changes on
every navigation worth re-focusing for — a `Router.events` `NavigationEnd` id, the resolved url, a
route param — and the directive re-runs focus placement on every change after the first, the same
reset a full page load gives a document for free.

**What it deliberately does not check.** It does not check whether something else already holds
focus before moving it, and it does not walk visibility. Native `autofocus` makes neither check
either — a hidden or already-focused target silently declining to move focus would be a harder
defect to notice during development than focus visibly landing somewhere unexpected. Gate
`inoAutofocus` (or the trigger value) on whatever condition makes "move focus now" correct.

**No dismissal keys.** There is nothing to dismiss — this directive performs one focus move per
activation and then does nothing else. Compare `[inoFocusTrap]`, which owns containment for as
long as it is active and therefore does need a suspend/resume/restore lifecycle.

**Contrast / RTL.** Nothing is painted, so there is no text or non-text contrast pair to audit, and
no positioned element to get RTL-wrong. The directive never touches the focus ring of whatever it
focuses — that element keeps whatever `--ino-focus-ring` it already paints.

---

## Deliberate omissions

States, sizing and labels — n/a (directive).

Recorded, not omitted (doc 26 §2 row 6; full reasoning in `SPEC.md` §2). This is a behaviour-only
primitive with no hover / focus-visible / active / disabled / readonly / invalid / loading state of
its own, no size scale, and no label API — every one of those belongs to whatever element ends up
focused. Same disposition `[inoFocusTrap]` and `[inoKeyfilter]` record, for the same reason.

---

## Mobile parity

**Ported** — the one disposition that differs from `[inoFocusTrap]`'s explicit web-only decision.
Neither mobile platform has an Angular-style attribute directive, but both have an idiomatic
non-visual focus-placement primitive:

- **React Native**: `useInoAutofocus(ref, options)`, a hook that focuses `ref.current` on mount and
  again whenever `options.trigger` changes — the same route-change mechanism, since React
  Navigation reuses screen instances across param-only navigations the way Angular's `Router`
  reuses component instances. `mobile/react-native/src/components/InoAutofocus.ts`.
- **Flutter**: `InoAutofocus`, a small widget wrapping a `FocusNode` that requests focus in
  `initState` and again in `didUpdateWidget` when its `trigger` changes. Flutter's own
  `autofocus: true` property only ever fires once, on first build — this port exists to close
  exactly that gap. `mobile/flutter/lib/widgets/ino_autofocus.dart`.

Neither port carries a focus-trap interplay rule: `[inoFocusTrap]` itself was never ported to
either platform (React Native has no DOM tab order; Flutter scopes focus by construction through
`FocusScope`), so there is no ancestor-trap race for a mobile port to guard against. Full reasoning:
`web/src/app/components/autofocus/SPEC.md` §5.

---

## Verification

| Gate | Result |
|---|---|
| `npx ng test --watch=false` (this directory's spec) | 11/11 pass (9 directive + 2 component form) |
| `node scripts/check-ds-adherence.mjs --json` | zero violations under `autofocus/` |
| `node scripts/check-theme-parity.mjs` | clean — no colour role read here |
| `tsc --noEmit` (RN port) | clean |
| `dart analyze` (Flutter port) | no issues |
