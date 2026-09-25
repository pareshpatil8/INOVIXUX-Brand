# `[inoFocusTrap]` / `<ino-focus-trap>` — FocusTrap

> Parity benchmark: PrimeNG 22.1.1 `FocusTrap` (`specs/primeng/llms-22.1.1.txt`).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Gap register: closes **P-1** in `docs/brand/16-design-system-parity-vs-echeque-reference.md`
> (modal focus trap, WCAG 2.2 SC 2.1.2).
> Preview: [`previews/focus-trap.html`](previews/focus-trap.html).
> Full Definition-of-Done disposition: `web/src/app/components/focus-trap/SPEC.md`.

A **behaviour-only primitive**. It renders no box, no background, no border and has no intrinsic
size — its entire output is a change in where keyboard focus can go. It exists as a standalone
component because four surfaces need identical behaviour: `<ino-modal>` (U-7), Drawer (T-24),
Popover (T-23) and ConfirmDialog (T-25). Before it, the only implementation was hand-rolled inside
`<ino-modal>`, asserted in a document and never tested.

---

## Two forms, one implementation

| Form | Use it when |
|---|---|
| `[inoFocusTrap]` **directive** | You already own the container element. Preferred. |
| `<ino-focus-trap>` **component** | You want to wrap projected content and do not own a container. |

The component applies the directive through `hostDirectives`, so it introduces **no wrapper node** —
the trap operates on the `<ino-focus-trap>` host itself. The two forms cannot drift, because there
is only one implementation behind them.

```ts
import { InoFocusTrapDirective } from './components/focus-trap/ino-focus-trap.directive';
// or
import { InoFocusTrapComponent } from './components/focus-trap/ino-focus-trap.component';
```

There is no barrel file; import by path, as with the other components in `web/src/app/components/`.

```html
<!-- Directive form — <ino-modal> puts it straight on the panel, keeping the role="dialog"
     element and its content adjacent rather than separated by an extra node. -->
<div class="ino-modal__panel" role="dialog" aria-modal="true" inoFocusTrap>
  …
</div>

<!-- Element form -->
<ino-focus-trap initialFocus="#confirm" [disabled]="!open">
  <button type="button" id="confirm">Confirm</button>
  <button type="button">Cancel</button>
</ino-focus-trap>
```

---

## API

| Input (directive) | Component alias | Type | Default | Behaviour |
|---|---|---|---|---|
| `inoFocusTrapDisabled` | `disabled` | `boolean` | `false` | Suspends containment without removing the directive. One-for-one counterpart of PrimeNG's `pFocusTrapDisabled`. Flipping back to `false` re-activates **and re-runs auto-focus** — what a Drawer wants on re-open. |
| `inoFocusTrapAutoFocus` | `autoFocus` | `boolean` | `true` | Moves focus into the container on activation. Defaults `true`: every consumer is a dialog-like surface, and the WAI-ARIA APG modal pattern requires initial focus to land inside. Set `false` only when the consumer places focus itself. |
| `inoFocusTrapInitialFocus` | `initialFocus` | `string` | `''` | CSS selector resolved **within** the container. Falls back to the first tabbable element, then the container itself. Prefer this over the `autofocus` attribute, which browsers apply inconsistently to dynamically inserted DOM. |
| `inoFocusTrapRestoreFocus` | `restoreFocus` | `boolean` | `true` | On deactivate or destroy, returns focus to whatever held it before activation (SC 2.4.3). |

| Method | Notes |
|---|---|
| `refresh()` | Re-reads tabbable content after a DOM change the host's own `childList` observer cannot see — e.g. a descendant several levels down becoming enabled. Sentinel placement is maintained automatically and never needs this call. |

The three boolean inputs use Angular's `booleanAttribute` transform, so the bare attribute form
(`inoFocusTrapAutoFocus`) and the bound form (`[inoFocusTrapAutoFocus]="true"`) behave alike.
`inoFocusTrap` itself is the **selector**, not an input — it takes no value, and the trap activates
on init unless `inoFocusTrapDisabled` is set.

### Variants

PrimeNG's `FocusTrap` ships one behaviour and exactly one option (`pFocusTrapDisabled`) — there is
no variant axis to match. We ship that option plus the three above, which the four consuming
surfaces need. **`size` and density inputs are deliberately omitted**: the component has no height,
padding or text, so they would change nothing observable. Recorded in `SPEC.md` §2 rows 3–4 rather
than silently dropped.

---

## Accessibility contract

**Role / ARIA.** The trap declares **none of its own**, by design. It is a mechanism, not content.
`role="dialog"`, `aria-modal="true"` and the accessible name belong to the consuming surface — that
is the element a screen reader announces, and putting a role on the trap would produce a second,
redundant landmark.

**Keyboard map.**

| Key | Result |
|---|---|
| `Tab` | Next tabbable element. From the last, wraps to the first. |
| `Shift+Tab` | Previous tabbable element. From the first, wraps to the last. |
| everything else | Untouched — the browser's native tab order and the consumer's own handlers. |

The trap deliberately does **not** handle `Esc`. Dismissal is the consuming surface's decision and
its handler, because only the consumer knows whether closing is currently permitted (a
ConfirmDialog mid-submit may refuse).

**SC 2.1.2 (No Keyboard Trap) — both directions.** Focus is *contained* while the trap is active
and *released* when it is disabled or destroyed. The release half is what hand-rolled traps
usually miss, and it is the half the success criterion is actually named after: a trap with no
exit is the failure, not the goal. Both directions have tests.

**SC 2.4.3 (Focus Order).** `restoreFocus` returns focus to the control that opened the surface,
not to the top of the document. It restores only if the trap still holds focus — if something else
has already moved focus on (a toast action, the next dialog in a wizard), yanking it back would be
the bug.

**Sentinels are invisible to assistive tech.** The two tab stops that perform the wrap are
`aria-hidden="true"` spans at zero opacity with `pointer-events: none`. A virtual-cursor user never
encounters them, and they are not pointer targets — so SC 2.5.8 (target size) has nothing to
measure here.

**Contrast.** Nothing is painted, so there is no text or non-text contrast pair to audit. The trap
never touches the focus ring of the elements it contains: those keep whatever `--ino-focus-ring`
their own component paints, which is how the ring stays correct across dark, light and
high-contrast for free. The single `outline: none` in the stylesheet is scoped to
`:host([tabindex='-1']:focus)` — the programmatic container-fallback focus used when a container
holds no tabbable content at all, which the user cannot reach by keyboard and has nothing to act on.

**RTL.** The sentinel's structural style uses `inset-block-start` / `inset-inline-start`, never
`top` / `left`. There is no other positioned element.

---

## Behaviour notes

**Nesting.** Active traps form a stack and only the topmost enforces containment, so a
ConfirmDialog opened over an open Modal takes over cleanly and hands control back on close instead
of the two fighting over `document.activeElement`. A single shared document listener serves every
trap.

**Why sentinels rather than a `Tab` keydown handler.** A `keydown` handler cannot see focus it
never receives a keydown for — focus moved by browser chrome (address bar, Find bar, devtools), by
an `<iframe>`'s internal tab order, or programmatically by third-party script. Two `tabindex="0"`
sentinels seated as the container's first and last child let the browser's native tab order do the
work: focus landing on a sentinel *means* "you tabbed off the end", so wrapping is a plain focus
move rather than a cancelled keystroke. A capture-phase document `focusin` guard covers the rest.

**Late content.** A `MutationObserver` re-seats the sentinels as the true first and last children
when content is projected in after activation — a Drawer rendering its body, a dialog appending a
footer — which would otherwise land *after* the trailing sentinel and fall outside the trap.

**Tab order fidelity.** Positive `tabindex` values come first in ascending order, then
`tabindex="0"` elements in document order: the order the browser itself uses. A naive
`querySelectorAll` order would wrap to the wrong element whenever a consumer uses a positive
`tabindex`.

**Empty containers.** If a container holds no tabbable content, focus must still stay inside, so
the container itself takes it via `tabindex="-1"`.

---

## Mobile

**Web-only**, by explicit decision — not a deferred port. Neither mobile platform has the construct
this component exists for: React Native has no DOM tab order (the equivalent is
`accessibilityViewIsModal` / `importantForAccessibility`, declarative flags on the overlay), and
Flutter scopes focus by construction through `FocusScope` on a modal route. The mobile counterpart
is a different component with a different API and gets its own issue in a later wave. Reasoning in
full: `web/src/app/components/focus-trap/SPEC.md` §5.

---

## Verification

| Gate | Result |
|---|---|
| `npx ng test --watch=false` | 15/15 pass |
| `npx ng build` | passes |
| `node scripts/check-theme-parity.mjs` | PASS |
| `node scripts/check-ds-adherence.mjs` | zero violations in this component's directory |
