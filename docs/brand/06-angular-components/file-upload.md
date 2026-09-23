# `<ino-file-upload>` — FileUpload

> Parity benchmark: PrimeNG 22.1.1 `FileUpload` (`specs/primeng/llms-22.1.1.txt`,
> route `https://primeng.dev/fileupload`) — benchmark only, **not a runtime dependency**.
>
> Preview: [`previews/file-upload.html`](previews/file-upload.html).
> Decisions record: `web/src/app/components/file-upload/SPEC.md`.

Labeled multi-file picker (INO-145, INO-31 T-5, File group) with a basic mode (single "Choose"
affordance) and an advanced mode (dropzone + per-file list with preview/progress/cancel/retry).
Follows this repo's `@Input() items` / `@Output() itemsChange` banana-in-a-box convention (the
array-shaped form of `ino-input`'s `value`/`valueChange` — see its class doc comment) rather than
performing uploads itself: the host owns the upload transport and pushes updated item state back
in. Full contract: [Controlled `items`](#controlled-items).

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Rendered via `<ino-label>`, associated to the hidden file input by `for`/`id` |
| `mode` | `'basic' \| 'advanced'` | `'advanced'` | See [Variants](#variants) |
| `multiple` | `boolean` | `false` | Allows selecting/dropping more than one file |
| `accept` | `string` | `''` | Native `accept` grammar: comma-separated MIME types, wildcards (`image/*`), or extensions (`.pdf`) |
| `maxFileSize` | `number` | `0` | Bytes; `0` = unlimited |
| `maxFiles` | `number` | `0` | Counted against `items.length` at accept-time; `0` = unlimited |
| `items` | `InoFileUploadItem[]` | `[]` | Banana-in-a-box with `itemsChange` — see [Controlled `items`](#controlled-items) |
| `hint` | `string` | `''` | Hidden while `error` is set |
| `error` | `string` | `''` | Sets `aria-invalid` + `aria-describedby`; rendered as `role="alert"` |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Choose-button height / padding-inline / font-size — see [Size API](#size-api) |
| `required` | `boolean` | `false` | Adds a visible `*` marker on the label (decorative, `aria-hidden`) |
| `disabled` | `boolean` | `false` | Choose button + item action buttons removed from focus order |
| `readonly` | `boolean` | `false` | Choose/dropzone stay focusable but the OS picker never opens; `Remove` disabled, `Cancel`/`Retry` still work — see `SPEC.md` §2 |
| `loading` | `boolean` | `false` | Inert spinner + `aria-busy`; picker disabled for the duration |
| `dragDrop` | `boolean` | `true` | Advanced mode only — disables the drop target without removing "Choose" |
| `chooseLabel` | `string` | `'Choose files'` | Button text |
| `dropHint` | `string` | `'or drag and drop files here'` | Visible instructions text next to the dropzone button |
| `captureMode` | `'user' \| 'environment' \| ''` | `''` | Sets the native `capture` attribute — mobile camera affordance, no plugin required, see `SPEC.md` §3 |

`itemsChange: EventEmitter<InoFileUploadItem[]>` fires whenever the item list changes (new files
accepted, a file removed).
`upload: EventEmitter<InoFileUploadItem[]>` fires with the newly-accepted items only — the host's
cue to start an upload.
`cancel` / `retry: EventEmitter<InoFileUploadItem>` fire per-item intents; the component does not
change `status` itself.
`remove: EventEmitter<InoFileUploadItem>` fires after the item has already been spliced out of
`items`.
`rejected: EventEmitter<InoFileUploadRejection[]>` fires whenever any file is turned away by
`accept`/`maxFileSize`/`maxFiles` validation.

### Controlled `items`

`InoFileUploadItem` is `{ id, file, status: 'idle' | 'uploading' | 'success' | 'error', progress?,
error? }`. This component never performs a network request — it only ever *proposes* new items
(via `(upload)`) and *intents* (`(cancel)`/`(retry)`/`(remove)`); the host owns the actual upload
transport (XHR with progress events, `fetch`, a resumable/chunked protocol) and is responsible for
writing `status`/`progress`/`error` back into `items` as the real upload proceeds. Full reasoning:
`SPEC.md` §1.

### Size API

Reads the same `--ino-control-height` / `--ino-control-padding-inline-roomy` /
`--ino-control-font-size` alias set as `ino-input`/`ino-datepicker`, applied to the **Choose
button** only. Per-file list rows do not scale with `size` — they track `--ino-row-min-height`
directly (see [Density](#density)), since even `size="sm"` still needs a legible file row.

### Density

`[data-density="dense"|"fluid"]` re-resolves `--ino-row-min-height` (32px dense / 44px fluid,
tokens.css §10), which each `.ino-fu__item` row's `min-block-size` reads with a fallback to
`--ino-control-height`, then `--ino-target-comfortable`, outside any density ancestor — the same
fallback chain `ino-input`'s control wrap uses.

### Variants

| Axis | Values |
|---|---|
| Mode | `basic` (single "Choose" button + filename — PrimeNG `mode="basic"`), `advanced` (dropzone + per-file list — PrimeNG's default mode) |
| Drop target | `dragDrop` toggles the drag-and-drop surface in advanced mode without removing the "Choose" button |
| Preview | Image files (`file.type` starting `image/`) render an object-URL thumbnail; everything else renders a generic file icon |

---

## States

| State | Trigger | Visual |
|---|---|---|
| Default | — | Choose button: `surface-raised` fill, `border` outline. Dropzone: dashed `border`, `surface-sunken` fill |
| Hover | `:hover` | Choose/item-action buttons: border darkens, fill shifts to `surface-sunken` |
| Active/pressed | `:active` | Border → `accent-active` (mousedown-before-focus-settles flash, matching `ino-input`) |
| Focus-visible | `:focus-visible` | `--ino-focus-ring` / `--ino-focus-ring-offset` on the Choose button and every per-item action button — never a hand-rolled outline |
| Disabled | `disabled` input | Choose button and item-action buttons `opacity: 0.5`, removed from focus order |
| Readonly | `readonly` input | Choose/dropzone stay focusable; OS picker never opens (`onInputClick` guard); `Remove` disabled, `Cancel`/`Retry` still active — `SPEC.md` §2 |
| Invalid | `error` input set | Dropzone border → `--ino-color-danger`; error text rendered as `role="alert"` |
| Loading/busy | `loading` input | Trailing spinner on the Choose button, `aria-busy` on the host, picker disabled |

---

## Motion

Dragover highlight (border/background shifting to the accent-tinted pairing) uses
`--ino-motion-duration-base` / `--ino-motion-easing-standard` — the "something is about to happen"
pace, not the `-fast` micro-interaction pace hover/active use. A newly-accepted or removed file row
fades/translates in on `--ino-motion-duration-base` / `--ino-motion-easing-decelerate`. The
progress-bar fill transitions its `inline-size` on `--ino-motion-duration-base` /
`--ino-motion-easing-standard`. The loading spinner uses `--ino-motion-duration-slow` linear
rotation, matching `ino-input`/`ino-button`. Every one of the above is disabled or made instant
under `@media (prefers-reduced-motion: reduce)`.

---

## Accessibility contract

**Role / ARIA** — the hidden `<input type="file">` keeps a real `<label for>` association via
`<ino-label>` (its accessible name), even though it is removed from the tab order
(`tabindex="-1"`) in favor of the visible "Choose" button as the actual keyboard entry point. The
Choose button carries `aria-describedby` pointing at the same hint/error/rejections chain the
input does. The dropzone is `role="group"` with visible instructions text (`dropHint`), not a
purely-visual drag target. Per-item status is rendered as real text next to an `aria-live="polite"`
region, not colour alone (WCAG 1.4.1); rejected files render inside a `role="alert"` block
(`rejectionsId`). Per-item progress bars are `role="progressbar"` with `aria-valuenow`/`aria-
valuemin`/`aria-valuemax`.

**Keyboard** — Tab reaches the Choose button (and, in advanced mode, each per-file action button in
document order); Enter/Space activates the focused button. There is no roving-tabindex grid — this
is a flat list of ordinary buttons, not a 2D widget.

**Contrast** — text/border pairs reuse the existing audited roles (`on-surface`,
`on-surface-muted`, `border`, `accent`/`on-accent`, `danger`/`danger-text-safe`); the error/status
text pairing is the same `danger-text-safe` role `ino-input`/`ino-datepicker` already use for
invalid state, not the raw `danger` fill (which fails AA as small text in dark mode — see
`tokens.css` §2).

**Target size** — the Choose button clears `--ino-control-height-default` (44px, comfortable) at
`default`/`lg` sizes; every per-item action button clears the WCAG 2.2 SC 2.5.8 24px floor
(`--ino-target-min`).

**RTL** — logical properties only (`padding-inline`, `margin-inline-start`, `inset-inline-start`,
`border-inline-*`); no `left`/`right`/`top`/`bottom` anywhere in the stylesheet.

---

## Deliberate omissions

- **A separate "Upload all" / "Cancel all" toolbar** (PrimeNG advanced mode). Not carried — this
  component's `(upload)` intent already fires per newly-accepted batch, so there is no "pending,
  not yet started" state left for a batch toolbar to act on. Full reasoning: `SPEC.md` §5.
- **Chunked/resumable upload, retry-with-backoff, or any actual network call.** Out of scope by
  design — the component is presentational/controlled; the host owns the transport. `SPEC.md` §1.

## Mobile parity

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView ("Capacitor is not a port," plan rev 9 §5), satisfied by DoD rows 1–8 plus the 44px
  touch-target check already covered by `--ino-control-height-default`. `captureMode` is the one
  place this component actively benefits from running inside a phone WebView, at zero extra cost.
- **React Native** — `mobile/react-native/src/components/InoFileUpload.tsx`. No drag-and-drop (no
  touch equivalent) and no bundled document/image picker (would require a new native dependency);
  instead exposes an `onChoose` callback the host wires to whatever picker the app already uses.
  Preview thumbnails, per-item status/progress, and Cancel/Retry/Remove are fully ported. Full
  reasoning: `SPEC.md` §9.
- **Flutter** — `mobile/flutter/lib/widgets/ino_file_upload.dart`. Same reduced scope as the React
  Native port (no drag-and-drop, no bundled picker, `onChoose` callback), same list UI.
