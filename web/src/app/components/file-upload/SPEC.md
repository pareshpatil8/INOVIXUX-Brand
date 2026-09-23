# `<ino-file-upload>` — component spec

**Issue:** INO-145 (INO-31 T-5, Tier 1 / File group)
**Parity benchmark:** PrimeNG 22.1.1 `FileUpload` — `specs/primeng/llms-22.1.1.txt`, route
`https://primeng.dev/fileupload`. PrimeNG is a benchmark, **not a runtime dependency**; nothing
here installs it.
**Resolves DoD rows:** 1–11 (full component DoD, `docs/brand/17-phase-2-implementation-program.md`
plan rev 9 §2), 3-day estimate per that doc line 139.
**Depends on:** W0-1 (`tokens.css` frozen scale — dark/light/high-contrast + density), T-19
(`ino-label`, reused for the field label) — both `done` before this issue started.

This file records the decisions the DoD requires to be written down rather than silently made.

---

## 1. Controlled `items`/`itemsChange` — the host owns the upload transport

There is one `@Input() items: InoFileUploadItem[]` / `@Output() itemsChange`, the array-shaped
form of this repo's `value`/`valueChange` banana-in-a-box convention (see `ino-input`'s class doc
comment). The component never performs a network request: `(upload)` emits newly-accepted items
as an intent, `(cancel)`/`(retry)` emit per-item intents, `(remove)` emits a removal intent, and
the host is responsible for actually calling into whatever upload transport the real KYB app uses
(XHR with progress events, `fetch`, a resumable/chunked protocol, a pre-signed-URL flow) and
pushing the resulting `status`/`progress`/`error` back in via `items`. This is a deliberate
divergence from PrimeNG's `FileUpload`, which owns an XHR call itself (`url`/`customUpload`) —
this repo has no fixed backend contract yet (KYB document intake will likely need resumable/
chunked upload for large files), so baking in a fetch/XHR call now would be guessing at a transport
this component has no business owning.

## 2. `readonly` cannot use the native `readonly` attribute

`<input type="file">` has no native `readonly` semantic (the platform only supports `disabled`).
`readonly` is implemented as a `(click)` guard (`onInputClick`) that calls `event.preventDefault()`
on the input's own click — reached whether the click originated on the input directly or was
proxied via the visible "Choose" button calling `fileInput.click()` in the template — which blocks
the OS picker dialog from opening while leaving the input (and the "Choose"/dropzone affordances)
in the tab order and the existing item list fully visible and interactive for read (not
write): the per-item `Remove` button is separately disabled under `readonly` in the template, but
`Cancel`/`Retry` are not, since those reflect an in-flight upload's own lifecycle rather than a new
edit to the file list. This matches `ino-input`/`ino-select`'s "readonly never means disabled" rule
— see those components' class doc comments — extended to a control that has no native readonly
DOM attribute to hang the state off.

## 3. `captureMode` — camera affordance without a new vendor dependency

Setting the native `capture` attribute (`'user' | 'environment'`) on the hidden `<input
type="file">` is what gives mobile Chrome/Safari (and Capacitor's WebView, since Capacitor is not a
port — see §9) a direct "take a photo" affordance for zero additional cost: no native plugin, no
new permission prompt wiring, no new vendor dependency this issue would otherwise have to flag.
This is strictly a progressive enhancement — browsers/platforms that ignore `capture` just fall
back to the ordinary file picker, so leaving it at `''` (the default) is always safe.

## 4. Validation rejects before an item is ever created

`accept` (comma-separated MIME types / wildcards / extensions, the same grammar as the native
`accept` attribute) and `maxFileSize`/`maxFiles` are checked the moment files are chosen or
dropped, before any `InoFileUploadItem` is constructed. Rejected files never enter `items` — they
surface via `(rejected)` and an inline `role="alert"` list (`rejectionsId`, wired into the hidden
input's `aria-describedby` via the `describedBy` getter), so a screen reader hears exactly which
file failed and why, not just a generic "some files were rejected." `maxFiles` is counted against
`items.length` at accept-time (not a static ceiling check up front), so files already accepted (or
already removed) are correctly reflected as the running total changes.

## 5. Basic vs. advanced mode — both benchmarked against PrimeNG, one deliberate omission

`mode` (`'basic' | 'advanced'`, default `'advanced'`) picks between:

- **basic** — a single "Choose" button plus the chosen filename (`singleFileName`, first item
  only) — PrimeNG `FileUpload`'s `mode="basic"`.
- **advanced** — a dropzone (drag-and-drop, `dragDrop` input to disable it without removing the
  "Choose" affordance) plus a per-file list with preview thumbnail (images only, object-URL,
  revoked on removal/destroy), status text, progress bar, and Cancel/Retry/Remove actions —
  PrimeNG `FileUpload`'s default (advanced) mode.

**Deliberately not carried:** PrimeNG advanced mode's separate "Upload"/"Cancel all" toolbar
buttons that batch-trigger every pending file at once. This component's controlled `(upload)`
intent already fires per-batch-of-newly-accepted-files the moment they're chosen or dropped (see
§1) — there is no "pending, not yet started" state for a toolbar to act on, so a redundant
"Upload all" button would have nothing left to do. A host that wants explicit user confirmation
before uploading can simply not start the network call until it chooses to, entirely on its own
side of the `(upload)` intent; nothing here needs to change to support that.

## 6. Rendering the rejections list is not tied to any one mode

`rejections`/`(rejected)`/the `role="alert"` block render identically in basic and advanced mode —
a rejected file is exactly as important to announce whether the picker is a single button or a
full dropzone, and duplicating the block per-mode would be the kind of drift this repo's shared
`.ino-field`-shell components (`ino-input`/`ino-select`) already avoid.

## 7. Accessible name for a hidden `<input type="file">`

The hidden input keeps its `id` set to `uploadId` so `<ino-label [for]="uploadId">` gives it a real
accessible name via the native `<label for>` mechanism (not `aria-label`, which this repo reserves
for icon-only controls with no visible text — see `ino-label`'s doc comment), even though the input
itself is removed from the tab order (`tabindex="-1"`) in favor of the visible "Choose" button as
the actual keyboard entry point. This is deliberate: a screen reader inspecting the DOM (not just
tabbing through it) still finds a properly-named file input, and the visible button carries its own
`aria-describedby` pointing at the same hint/error/rejections chain (`describedBy`) so voice-over
users landing on either element hear the same context.

## 8. `anyComponentStyle` budget

No local `--_x` alias layer was needed here (contrast `ino-datepicker`'s SPEC.md §8) — the
component has far fewer repeated button-like parts (one `.ino-fu__choose`, one
`.ino-fu__item-btn` base reused across Cancel/Retry/Remove) and comes in comfortably under
Angular's 8kB budget without it.

## 9. Mobile parity (per plan rev 9 §5)

- **Capacitor** — not a separate port. The same Angular component/CSS renders in the Capacitor
  WebView ("Capacitor is not a port," plan rev 9 §5); satisfied automatically once DoD rows 1–8
  pass plus the 44px touch-target check, which `--ino-control-height-default` /
  `--ino-target-comfortable` already cover. `captureMode` (§3) is the one place this component
  actively takes advantage of running inside a WebView on a phone, at zero extra port cost.
- **React Native** (`mobile/react-native/src/components/InoFileUpload.tsx`) and **Flutter**
  (`mobile/flutter/lib/widgets/ino_file_upload.dart`) are real ports, scoped down from the web
  component:
  - **No drag-and-drop.** Neither platform has a drag-and-drop gesture for the OS file/photo
    picker; the dropzone visual is dropped entirely rather than faked as a non-functional
    decoration. This is a platform-capability gap, not a broken port.
  - **No in-app file/document picker.** Adding one would mean pulling in a new native dependency
    (`react-native-document-picker`, `image_picker`, …), which this repo's porting rule doesn't
    sanction mid-component (no other ported component reaches for a new vendor package — see
    `InoDatepicker`'s and `InoButton`'s doc comments, which both note RN/Flutter drop native-only
    affordances rather than add a dependency to fake them). Instead, both ports take an
    `onChoose`/`onPick: () => void` callback prop the **host** wires to whatever picker the app
    already uses (the same "host owns the transport" shape as `(upload)` in §1) — the component
    itself only renders the trigger button, the list, and validation/status UI.
  - **Validation is ported.** `accept` (MIME-prefix match only — neither platform's basic picker
    API reliably exposes extensions the way the web `accept` grammar does) and `maxFileSize`/
    `maxFiles` are still checked against whatever `File`-shaped objects the host's picker hands
    back, with the same rejection messages surfaced as inline text (not a `role="alert"` — neither
    platform's accessibility tree has that ARIA role; both use an accessible live-region-equivalent
    instead, see each file's doc comment).
  - **Preview thumbnails, progress, and status text are ported** — the core "list of files with a
    status line and a progress bar" UI is the expensive part and is fully carried over, matching
    the ~40% porting-cost target the same way `InoDatepicker`'s day-grid math is fully ported while
    its month/year views are not.
  - Hover and `:focus-visible` are dropped on both native ports — no pointer/keyboard-focus
    distinction on touch hardware, the same rule `InoButton`'s RN/Flutter doc comments already
    state; pressed/disabled/loading carry over.

## 10. Registry entry

`scripts/check-theme-parity.mjs`'s `COMPONENT_REGISTRY` gets one new alphabetically-inserted entry
(between `datepicker` and `focus-trap`) declaring the web color roles this component's `.scss`
reads and the roles the RN/Flutter ports read, with divergences recorded for the roles the ports
don't reach (e.g. `accentActive`, dropped on both native ports for the same "no pointer-down-
before-focus phase on touch" reason `input`/`datepicker` already document).

---

## Files touched

- `web/src/app/components/file-upload/ino-file-upload.component.ts` (pre-existing, unmodified)
- `web/src/app/components/file-upload/ino-file-upload.component.html`
- `web/src/app/components/file-upload/ino-file-upload.component.scss`
- `web/src/app/components/file-upload/SPEC.md` (this file)
- `mobile/react-native/src/components/InoFileUpload.tsx`
- `mobile/flutter/lib/widgets/ino_file_upload.dart`
- `docs/brand/06-angular-components/file-upload.md`
- `docs/brand/06-angular-components/previews/file-upload.html`
- `scripts/check-theme-parity.mjs` (one appended `COMPONENT_REGISTRY` entry)
