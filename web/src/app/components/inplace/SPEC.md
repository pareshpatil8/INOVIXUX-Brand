# `<ino-inplace>` — component spec

Contract: INO-497 (INO-31 Phase B5), doc 26 §5 row `ino-inplace`:

> display slot ↔ edit slot swap; close on blur/Enter; lazy content |
> display, editing | inherits content | edit affordance labeled |
> button semantics on display; focus moves into editor and returns | Web-only

This file records the contract decisions that aren't obvious from the source; the class doc
comment in `ino-inplace.component.ts` carries the implementation-level ones.

## 1. Content model — directive-per-slot, not a value/template-ref pair

`inoInplaceDisplay` / `inoInplaceEdit` (`ino-inplace.templates.ts`) are the same directive-per-slot
shape `ino-dataview`/`ino-timeline`/`ino-virtual-scroller` use, rather than PrimeNG's
`pTemplate="…"` string-ref convention, which a local `#ref` + `@ContentChild('name')` pair can't
check at compile time. Both contexts are `void` — the projected content is the consumer's own
template, not a per-item render; the component has nothing to hand back through the outlet.

## 2. `editing` owns the swap, two-way bound

`editing: boolean` + `editingChange` is the single source of truth for which slot is mounted —
the same `value`/`valueChange` banana-in-a-box convention every other INO-31 control uses, applied
to a boolean instead of a value. A caller can drive it externally (e.g. an "edit all" toolbar
action across several `ino-inplace` instances) without reaching into the component's internals.

## 3. Lazy content — the edit template never pre-mounts

The row says "lazy content" explicitly. `@if (editing) { … *ngTemplateOutlet="editDef?.template" }`
means the edit template's component tree (and any heavy control it contains — a rich editor, a
date picker) is created only on the transition into editing and destroyed again on the transition
out, never created up front and hidden with CSS. This also means the edit template's own
`ngOnInit` runs fresh every time editing opens — a deliberate reset, not a bug, for the common
case of an edit field that should start from the current display value each time.

## 4. Display trigger is a native `<button>`, not a styled `<div>` with `role="button"`

A native `<button type="button">` gives "button semantics on display" (the row's a11y line) for
free — role, keyboard activation (Space/Enter), and disabled-state semantics all come from the
browser rather than a hand-rolled `keydown` handler. This is the same reasoning `ino-rating` and
`ino-toggle-button` already apply: prefer the native element over re-implementing its contract.

## 5. Close on blur/Enter — the exact semantics

- **Enter** closes immediately, *except* when the event target is a `<textarea>` — there, Enter
  inserts a newline (the universal multi-line convention) and the editor stays open. A caller
  whose single-line edit template genuinely wants Enter to insert rather than commit can still
  intercept the keydown itself before it reaches this handler (template event bindings run before
  a parent component's host listener in Angular's DOM order) — not a case this component special-
  cases further.
- **Blur** closes only when focus leaves the editor subtree *entirely* — `focusout`'s
  `relatedTarget` is checked against the editor container with `Node.contains`, so moving focus
  between two fields inside a multi-field edit template (e.g. a "first name" / "last name" pair)
  does not close it mid-edit. This is the same relatedTarget-containment check overlay/popover
  components in this library already use to distinguish "focus moved elsewhere inside" from
  "focus left".
- `closeOnBlur` (default `true`) is an opt-out for an edit template that ships its own explicit
  commit/cancel buttons and wants to manage the close itself by calling the component's public
  `close()` — not exposed as a bare `@Input` method call target but reachable via a template
  reference variable (`#inplace` → `inplace.close()`), the same pattern `ino-overlay` uses for its
  imperative `open()`/`close()` pair.

## 6. Focus management

Opening moves focus to the first native-focusable descendant of the editor container
(`input, textarea, select, button, [href], [tabindex]:not([tabindex="-1"])`), falling back to the
editor container itself — which always carries `tabindex="-1"` for exactly this fallback, so focus
never has nowhere to go even before the consumer's edit template has mounted any focusable control
of its own (e.g. a template that renders a focusable field only after an async lookup resolves).
Closing returns focus to the trigger button unconditionally — the one place focus can always land,
regardless of which affordance triggered the close (click, Enter, blur, or an external
`editing = false` write from the caller).

Focus is applied in `ngAfterViewChecked`, gated by one-shot flags (`pendingFocusEditor` /
`pendingFocusTrigger`) set when `open()`/`close()` run — not in the event handler itself, because
the editor/trigger element the flag targets doesn't exist in the DOM yet until Angular's next
change-detection pass re-renders the `@if` block that just flipped.

## 7. Sizing — "inherits content", no size scale

Unlike `ino-rating`/`ino-knob` (which define a local three-rung glyph scale) or the text-entry
controls (which use `--ino-control-height`), `ino-inplace` defines no sizing scale at all: the row
says "inherits content" and the component contributes no intrinsic dimensions beyond
`display: inline-block` — the trigger and editor both size to whatever is projected into them.
There is deliberately no `size` `@Input`.

## 8. Edit affordance labeling

`ariaLabel` (default `'Edit'`) names the trigger button for assistive technology — the row's "edit
affordance labeled" requirement — independent of whatever the display content itself says, because
display content is consumer-supplied and may be a bare value with no label of its own (e.g. a
price, a username). `editIcon` (default `'✎'`, a plain `aria-hidden` text glyph, the same
no-icon-component-dependency precedent `ino-rating`'s `iconFilled`/`iconEmpty` set) renders next to
the display content as a visible affordance signal; set it to `''` when the display content is
already self-evidently editable (e.g. it already renders its own pencil icon).

## 9. Deliberate omissions

- **No outside-pointer-click detection separate from blur.** Clicking anywhere outside the editor
  moves focus there (or to nothing focusable, which still fires `focusout` on the previously
  focused element) — the existing blur handling already covers the "click away to close" gesture
  without a second, redundant document-click listener.
- **No built-in commit/cancel buttons or value model.** `ino-inplace` owns only the display/edit
  toggle, not a `value`/`valueChange` pair — the projected edit template is free to bind to
  whatever model it wants (a plain input, a form group, a child component) and is responsible for
  its own commit/cancel UI if it wants one beyond "Enter closes, blur closes". This mirrors the row
  itself, which never names a value type.
- **No readonly value-display variant beyond `readonly` blocking entry.** `readonly` behaves like
  `disabled` for the purpose of "can this be opened" (both guard `open()`), but renders without the
  opacity drop — matching every other INO-31 control's disabled-vs-readonly visual contract — since
  `ino-inplace` has no value of its own to additionally mark non-interactive.

**PrimeNG mapping:** PrimeNG `Inplace` → `ino-inplace`; its `pTemplate="display"`/
`pTemplate="content"` string-ref slots become the compile-time-checked `inoInplaceDisplay`/
`inoInplaceEdit` directives; its `active`/`activeChange` pair becomes `editing`/`editingChange`;
its `closable` + explicit close icon is replaced by the close-on-blur/Enter gesture the row names
instead (no dedicated close icon, same "one gesture, not an extra affordance" reasoning
`ino-rating`'s cancelable toggle already uses).

## 10. Accessibility contract (WCAG 2.2 AA)

- Display trigger: native `<button type="button">`, `aria-label` = `ariaLabel`. `disabled` sets
  the native `disabled` attribute (removes it from the tab order, `aria-disabled` implied).
  `readonly` sets `aria-readonly="true"` without removing it from the tab order or dropping
  opacity — it stays reachable and legible, just non-activating.
  `editIcon` is `aria-hidden` — a decorative glyph, not a second accessible name.
- Editor container: no ARIA role of its own (it is a plain focus-landing wrapper around
  consumer-supplied content, which carries whatever semantics it needs); `tabindex="-1"` so it is
  always programmatically focusable as the fallback target in §6, but never reachable by Tab.
- Keyboard: Tab reaches the trigger when closed (one stop) or whatever the edit template's own
  focusable controls are when open; Enter closes except inside a `<textarea>` (§5); Escape is
  deliberately **not** bound to close — the row names only "blur/Enter", and Escape inside a rich
  edit template (e.g. a date picker popup) commonly needs to mean "close the inner popup, not the
  whole editor" — binding it here would race that.
- Focus: `:focus-visible` draws the standard `--ino-focus-ring` on both the trigger and (as a
  fallback target) the editor container; focus always moves into the editor on open and back to
  the trigger on close (§6), so a keyboard user is never left with focus on a now-hidden trigger
  or a now-unmounted editor.
- Contrast: WCAG 2.2 AA in all 3 themes, gated by `check-theme-parity`; the trigger's hover/active
  surfaces reuse `--ino-color-surface-sunken` / `--ino-color-accent-active`, the same roles
  `ino-button`'s ghost variant already uses and is already audited under.
- RTL: logical properties only in CSS; no directional keyboard behavior to mirror (unlike
  `ino-rating`/`ino-knob`'s Arrow-key axes, this component has none).

## 11. Mobile — Web-only

Doc 26 §5 row disposition: "Web-only". No React Native or Flutter port. Capacitor renders the same
Angular component and CSS unchanged (INO-31 plan rev 9 §5 rule) — not a separate port, done the
moment the web component passes.

## 12. Testing and QA validation (§2 contract row 8)

`ino-inplace.spec.ts` pins: the display/edit template swap via `editing`, lazy mounting of the
edit template (not created until `editing` is true), click-to-open and the resulting focus move
into the editor, Enter-closes (and the `<textarea>` carve-out), focus-leaves-subtree closes
(`closeOnBlur`), focus-stays-inside-subtree does not close, close returns focus to the trigger,
and disabled/readonly blocking `open()`. The §2 point-8 QA sign-off (QALead) validates the
rendered docs page — 3 themes × dense/fluid, keyboard-only walkthrough — per doc 26 §2.1.
