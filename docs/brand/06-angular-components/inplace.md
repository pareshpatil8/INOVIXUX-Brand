# `<ino-inplace>` — Inplace

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B5 row
> `ino-inplace`. Board approval `f55baa72` on [INO-377](/INO/issues/INO-377). Issue:
> [INO-497](/INO/issues/INO-497).
> Parity benchmark: PrimeNG 22.1.1 `Inplace` (`specs/primeng/llms-22.1.1.txt`) — PrimeNG is a
> benchmark, **not a runtime dependency**; nothing here imports it.
> Decisions record: `web/src/app/components/inplace/SPEC.md`.

A display value that swaps for an editor on click. Click (or Space/Enter on) the display content
to open the editor; press Enter to commit and close (except inside a multi-line `<textarea>`), or
move focus anywhere outside the editor to close it the same way. The edit content is mounted only
once editing starts — never created up front and hidden.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `editing` | `boolean` | `false` | Banana-in-a-box with `editingChange`; which slot is mounted |
| `ariaLabel` | `string` | `'Edit'` | Accessible name for the display trigger — the row's "edit affordance labeled" requirement |
| `editIcon` | `string` | `'✎'` | Decorative `aria-hidden` glyph next to the display content; plain text, not an icon-font dependency (same precedent as `ino-rating`'s `iconFilled`/`iconEmpty`). Set `''` to omit |
| `disabled` | `boolean` | `false` | Blocks opening; native `disabled` on the trigger, `0.5` opacity |
| `readonly` | `boolean` | `false` | Blocks opening; `aria-readonly` on the trigger, stays in the tab order, no opacity drop |
| `closeOnBlur` | `boolean` | `true` | Close when focus leaves the editor subtree entirely; set `false` for an edit template that manages its own close via a template-reference `close()` call |

`editingChange: EventEmitter<boolean>` fires on every open and close.

### Variants / structure (anatomy)

| Part | Element | Notes |
|---|---|---|
| Display slot | `button.ino-inplace__trigger` (native `<button type="button">`) | Shown while `!editing`; wraps the `inoInplaceDisplay` template content plus the optional `editIcon` glyph |
| Edit slot | `div.ino-inplace__editor` | Shown while `editing`; wraps the `inoInplaceEdit` template content; `tabindex="-1"` fallback focus target |

Content is supplied via two structural directives (`ino-inplace.templates.ts`), the same
directive-per-slot shape `ino-dataview`/`ino-timeline`/`ino-virtual-scroller` use rather than
PrimeNG's string `pTemplate` convention:

```html
<ino-inplace [(editing)]="editing">
  <ng-template inoInplaceDisplay>{{ user.name }}</ng-template>
  <ng-template inoInplaceEdit>
    <input [(ngModel)]="user.name" />
  </ng-template>
</ino-inplace>
```

The edit template mounts only when `editing` becomes `true` and unmounts again on close — the
row's "lazy content" variant — so a heavy edit control (a rich text editor, a date picker) never
pays its construction cost until the user actually opens the editor.

### Sizing

"Inherits content" per the row — there is no `size` input and no `InoControlSize` scale; both
slots size to whatever is projected into them. Density: no dense/fluid-specific geometry of its
own, for the same reason.

---

## States

| State | Surface |
|---|---|
| display (default) | Trigger renders the display template + edit glyph; `:hover`/`:active` draw the standard ghost-button surfaces |
| editing | Editor mounted; focus moved into its first focusable descendant (or the editor container itself as a fallback) |
| hover | Trigger background → `--ino-color-surface-sunken` |
| focus-visible | Standard `--ino-focus-ring` on the trigger (closed) or the editor container (as the programmatic-focus fallback) |
| active | Trigger label color → `--ino-color-accent-active` on press |
| disabled | `0.5` opacity on the trigger; native `disabled`, click/keyboard blocked |
| readonly | Trigger stays legible and tabbable; `aria-readonly`, click/keyboard blocked |

`ino-inplace` has no form value of its own, so invalid/loading/empty states are not applicable —
any validation state belongs to whatever control the `inoInplaceEdit` template projects.

---

## Labels and fields

There is no visible `label` input — the display slot's own projected content is the label. The
trigger's accessible name comes from `ariaLabel` (default `'Edit'`), independent of the display
content, since that content may be a bare value (a price, a username) with no label of its own.
The `editIcon` glyph is a decorative, `aria-hidden` visual cue that the display content is
editable; it carries no accessible text of its own.

---

## Accessibility contract

**Role / ARIA** — the display slot is a native `<button type="button">`, giving it button
semantics (role, keyboard activation, disabled state) for free — no hand-rolled `role="button"` +
keydown handler. `aria-label` comes from `ariaLabel`. `readonly` sets `aria-readonly="true"`
without removing the button from the tab order; `disabled` sets the native `disabled` attribute,
which does remove it. The editor container carries no ARIA role of its own — it is a plain
focus-landing wrapper around consumer-supplied content, which brings whatever semantics it needs —
but always carries `tabindex="-1"` so it is reachable programmatically even before any focusable
child has mounted.

**Keyboard** —

| Key | Behavior |
|---|---|
| Space / Enter (on the trigger) | Opens the editor; focus moves into it |
| Tab | One stop for the trigger when closed; whatever focusable controls the edit template exposes when open |
| Enter (inside the editor, not a `<textarea>`) | Closes and returns focus to the trigger |
| Enter (inside a `<textarea>`) | Inserts a newline — does **not** close, the universal multi-line carve-out |
| Escape | Not bound — deliberately. See [Deliberate omissions](#deliberate-omissions) |

**Focus behavior** — opening moves focus to the first native-focusable descendant of the editor
(`input, textarea, select, button, [href], [tabindex]:not([tabindex="-1"])`), falling back to the
editor container itself. Closing — by Enter, by blur, or by an external `editing = false` write —
always returns focus to the trigger button, so a keyboard user is never left with focus on a now-
unmounted element.

**Blur** — closes when `focusout`'s `relatedTarget` is outside the editor subtree
(`Node.contains`), so moving focus between two fields inside a multi-field edit template does not
close it mid-edit. Gated by `closeOnBlur` (default on).

**Contrast** — WCAG 2.2 AA in all 3 themes, gated by `check-theme-parity`. The trigger's hover/
active surfaces reuse `--ino-color-surface-sunken` / `--ino-color-accent-active`, the same roles
`ino-button`'s ghost variant is already audited under.

**RTL** — logical properties only in CSS; no directional keyboard axis to mirror.

Full contract: `SPEC.md` §10.

---

## Deliberate omissions

- **No separate outside-click listener** — the existing blur handling (focus leaving the editor
  subtree) already covers "click away to close" without a redundant document-level listener.
- **No built-in commit/cancel buttons or value model** — `ino-inplace` owns only the display/edit
  toggle; the projected edit template is free to bind to whatever model it wants and is
  responsible for its own commit/cancel UI if it wants one beyond "Enter closes, blur closes".
- **No Escape-to-close** — the row names only "blur/Enter"; binding Escape here would race a rich
  edit template's own popup (e.g. a date picker) that needs Escape to mean "close the inner
  popup", not "close the whole editor".
- **No readonly value-display variant beyond blocking entry** — `readonly` blocks `open()` like
  `disabled` does, but renders without the opacity drop, matching every other INO-31 control's
  disabled-vs-readonly visual contract; there is no additional "readonly value" rendering because
  the component has no value of its own.

**PrimeNG mapping:** PrimeNG `Inplace` → `ino-inplace`; its `pTemplate="display"`/
`pTemplate="content"` string-ref slots become the compile-time-checked `inoInplaceDisplay`/
`inoInplaceEdit` directives; its `active`/`activeChange` pair becomes `editing`/`editingChange`;
its `closable` + dedicated close icon is replaced by the close-on-blur/Enter gesture the row names
instead.

---

## Mobile parity

| Track | Status | Notes |
|---|---|---|
| Capacitor | Not a port | Renders the same Angular component and the same CSS (INO-31 plan rev 9 §5 rule) — done the moment the web component passes. |
| React Native | Not ported | Web-only per doc 26 §5 row specification |
| Flutter | Not ported | Web-only per doc 26 §5 row specification |
