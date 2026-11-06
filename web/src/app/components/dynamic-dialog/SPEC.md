# `<ino-dynamic-dialog>` — component spec

**Issue:** [INO-447](/INO/issues/INO-447) (INO-31 Phase B2, doc 26 §5 row `ino-dynamic-dialog`)
**Spec source:** `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5
(rev-2 amendment `a21a93c`). Board approval `f55baa72` on [INO-377](/INO/issues/INO-377).
**Parity benchmark:** PrimeNG 22.1.1 `DynamicDialogModule` / `DialogService` — a benchmark only;
nothing here imports it.

This file records the decisions the Component Publish Contract (doc 26 §2) requires to be
written down rather than silently made.

---

## 1. No stylesheet, and no new DOM of its own

Doc 26 §5's row text is explicit: "service-opened dialog reusing `ino-modal`... inherits modal
contract" for every column (states, sizing, labels, a11y). There is accordingly nothing for this
component to style — `ino-dynamic-dialog.component.ts` has no `styleUrl`/`styles`, the same
precedent `ino-tab-panel`/`ino-step` already set for a structural component that composes another
component's visuals wholesale rather than adding any of its own. The template is one `<ino-modal>`
element; every colour/space/radius/motion/theme/density/RTL behavior a reviewer would check is
`../modal/SPEC.md`'s to answer, not this file's.

---

## 2. `NgComponentOutlet`, not `ViewContainerRef.createComponent()`

This is the first consumer in the catalog that mounts a caller-supplied, not-known-ahead-of-time
component type from an injectable service rather than from a directive that already holds a
`ViewContainerRef` in scope (`[inoTooltip]`, `[inoContextMenu]`). Two ways to do that were
considered:

- **Imperative `createComponent()`** (the tooltip/context-menu pattern) — the service would need
  an `EnvironmentInjector` and either a root-level anchor `ViewContainerRef` or `ApplicationRef`
  attachment, plus manual `ComponentRef` lifecycle (`.destroy()` on close, re-create on reopen).
  Nothing in this codebase does root-level `createComponent()` yet; building that plumbing for a
  single in-DOM swap is the "re-implementing a convention the platform already has" shape
  `focus-trap/SPEC.md` and `virtual-scroller/SPEC.md` both decline for their own imperative
  temptations.
- **`NgComponentOutlet` in a template that already exists** (chosen) — `<ino-dynamic-dialog>`
  already renders a template (the `<ino-modal>` host), so the dynamic content is just another
  binding (`*ngComponentOutlet="e.component; injector: contentInjector()!"`) inside it. Angular
  owns creation/destruction entirely: the outlet tears the hosted component down the instant
  `entry()` goes back to `null` (service `dismiss()`/`close()`), exactly when `<ino-modal>` itself
  unmounts its `*ngIf="open"` panel — one state (`InoDynamicDialogService.current`) drives both,
  so they can never disagree about whether something is still mounted. OnPush/zoneless-safe for
  free: `contentInjector` is a `computed()` over the same signal `entry` reads, so both update on
  the same change-detection pass `ino-modal`'s own `[open]` binding does.

## 3. The DI surface the opened component gets: `InoDynamicDialogRef` + `INO_DYNAMIC_DIALOG_DATA`

The opened component has no `@Input()`s wired to it by `<ino-dynamic-dialog>` — `NgComponentOutlet`
has no input-binding surface for an arbitrary unknown type, and inventing one would mean every
caller's component shares one guessed input name. Instead, `contentInjector()` (a child `Injector`
whose parent is `<ino-dynamic-dialog>`'s own, so everything else in the app — `ThemeService`,
router, etc. — still resolves normally) provides exactly two tokens, the same two-token shape
Angular Material's `MatDialogRef`/`MAT_DIALOG_DATA` and PrimeNG's `DynamicDialogRef`/
`DynamicDialogConfig` both use:

- `InoDynamicDialogRef` (class token) — the **same instance** `InoDynamicDialogService.open()`
  returned to the caller. Calling `.close(result)` from inside the opened component resolves the
  caller's `onClose` promise and tears the dialog down in one call — the opened component never
  touches `<ino-modal>` or the service's `current` signal directly.
- `INO_DYNAMIC_DIALOG_DATA` — `config.data`, untyped (`unknown`) at the token boundary. A caller
  injecting it casts to its own data type, the same pattern `MAT_DIALOG_DATA` uses; there is no way
  for a shared token to carry a generic parameter through DI.

**Why a `Promise`, not an `Observable` (doc 26 §5 row: "result promise").** A dynamic dialog opens
once and settles once — there is no repeat-emission case here the way there is for, say, a form
value stream. `await dialogService.open(Component).onClose` is the entire call-site shape this
API is built for.

**Why only one dialog at a time.** `InoDynamicDialogService` tracks a single `current` entry, not
a stack. `open()` while one is already showing resolves the previous `onClose` with `undefined`
(the same "superseded" semantics a second `showDialog()` call gets on most platforms) before
opening the new one. Stacking a dynamic dialog over another *is* still possible — nothing stops a
caller from opening a declarative `<ino-modal>` or `<ino-confirm-dialog>` on top of a dynamic one,
and `[inoFocusTrap]`'s trap stack (focus-trap/SPEC.md) handles that by DOM order regardless of
which API opened which panel — but two *dynamic* dialogs stacked on each other is out of scope for
this "minimal UI" API layer. The stale-`closeFn` id guard (`ino-dynamic-dialog.service.ts`) exists
so a superseded dialog's async close handler, if one is still in flight, can never resolve or tear
down the dialog that replaced it.

---

## 4. Focus-return for the service flow

The doc 26 §5 row calls this out explicitly as the one a11y item this component must document
over and above "inherits modal contract." No extra code exists for it: `[inoFocusTrap]`, placed on
`<ino-modal>`'s panel, captures `document.activeElement` the instant the panel's host element
mounts (`activate()`, `focus-trap/ino-focus-trap.directive.ts`). That happens on the same
change-detection pass as `InoDynamicDialogService.open()` flipping `current` from `null` to an
entry — i.e. still inside the synchronous continuation of whatever click/keydown handler called
`dialogService.open(...)`. `document.activeElement` at that point is therefore the control that
triggered the call, exactly the same guarantee a declarative `<ino-modal [(open)]="flag">` caller
already relies on (`../modal/SPEC.md` §2, "Delegated entirely to `[inoFocusTrap]`"). Closing the
dialog — by `ref.close()` from inside the opened component, by `<ino-modal>`'s own
Escape/backdrop/close-button paths calling `InoDynamicDialogService.dismiss()`, or by a second
`open()` superseding it — restores focus to that same control via the trap's existing
`inoFocusTrapRestoreFocus` teardown. Nothing about the service indirection changes that contract;
it only changes *what* calls `open()`/`close()`, not when the panel mounts/unmounts.

---

## 5. Mobile

None — doc 26 §5 row disposition is "Web-only; API layer, minimal UI." There is no RN/Flutter
port: `InoDynamicDialogService`'s API (an injectable service returning a component-type-driven,
promise-resolving ref) has no analogue in either mobile stack's navigation model, where the
equivalent is presenting a screen/route, not opening an overlay component by type. This mirrors
`ino-command-menu`/`ino-toolbar`'s web-only disposition in the same doc 26 §5 table, not a gap.

---

## 6. PrimeNG mapping

`DialogService.open(Component, config)` → `InoDynamicDialogService.open(Component, config)`.
`DynamicDialogRef`/`DynamicDialogConfig` → `InoDynamicDialogRef`/`InoDynamicDialogConfig` +
`INO_DYNAMIC_DIALOG_DATA`. PrimeNG's `onClose: Observable` is this API's `onClose: Promise` (§3
above). `<p-dynamicDialog>` (the mount-once host) → `<ino-dynamic-dialog>`.

---

## 7. Verification run for this issue

| Check | Result |
|---|---|
| `ng build` (web) | ✅ passes |
| `node scripts/check-theme-parity.mjs` | ✅ passes (unmodified — no new colour role; the component has no stylesheet) |
| `node scripts/check-ds-adherence.mjs --json`, filtered to `components/dynamic-dialog/` | ✅ zero violations |
| Unit test | `ino-dynamic-dialog.service.spec.ts` — `open()`/`close()` resolves `onClose` with the given result; unresolved `open()` superseded by a second `open()` resolves the first with `undefined`; a stale `close()` call from an already-superseded entry is a no-op (doesn't resolve or affect the new entry); `dismiss()` with nothing open is a no-op |
| Hardcoded colour/space/radius/duration/font-size | none — no stylesheet (§1) |
| `[data-theme]` branch in the component | none |
