# ino-chip — Component Specification

**Issue:** INO-462 (INO-31 Phase B4)
**Contract:** doc 26 §2 Component Publish Contract (all 8 points)
**PrimeNG mapping:** Chip (22.1.1) — the component `ino-tag`'s own doc explicitly named as
"not-yet-built" (`ino-tag.component.ts` header comment). `ino-inputtags`' per-tag chip
(`.ino-inputtags__tag` + `.ino-inputtags__tag-remove`) is the same visual/a11y idiom promoted
here to a standalone, reusable component — doc 26 line 243 pairs the two explicitly
("removable = button-in-group contract (shares inputtags spec)").

---

## 1. Variants/Structure

### Content
- `label` (required visually — "own label" per doc 26 §5): the chip's text.
- One optional leading visual, projected content: `[icon]` **or** `[avatar]`. Each slot renders
  only when it has projected content (`:empty { display: none; }`, the same idiom `ino-tag`'s
  `.ino-tag__icon` already uses) — the component does not police mutual exclusivity in code; it
  is the caller's responsibility to project only one. The `avatar` slot is for projecting an
  `<ino-avatar>` (any size the caller chooses); `ino-chip` does not resize or otherwise manage it.

### Static vs interactive
- **static** (default): renders as a non-interactive `<span>`, exactly `ino-tag`'s precedent —
  no `tabindex`, no click handling on the label/icon/avatar content itself.
- **interactive** (`interactive: boolean`): the chip's main body renders as a `<button type="button">`
  instead of a `<span>`. Clicking it emits `chipClick`. Optionally pairs with `pressed` (boolean,
  `aria-pressed`) for toggle-style filter chips — same WAI-ARIA "toggle button" pattern
  `ino-toggle-button` already uses, not the `role="switch"` pattern.

### Removable
- `removable: boolean` adds a trailing remove control — a `<button aria-label="Remove {label}">`
  with an "x" glyph, identical markup/behavior to `ino-inputtags`' per-tag remove button.
- **Button-in-group contract:** a `<button>` cannot contain another `<button>` (invalid HTML,
  broken a11y). When `removable` is combined with `interactive`, the two buttons (main + remove)
  are **siblings**, not nested, wrapped in one non-interactive `<span role="group" [attr.aria-label]="label">`.
  When `removable` is combined with `static`, the wrapper holds the plain label content (a `<span>`,
  not a button) plus the remove `<button>` sibling — exactly `ino-inputtags`' existing per-tag
  structure. The wrapper only exists when `removable` is true; a non-removable chip is a single
  element (one `<span>` or one `<button>`), no wrapper.

---

## 2. States (beyond §2 standard set)

Standard set carried: default, hover, focus-visible, active, disabled, readonly.
**N/A for this component** (same reasoning as `ino-tag` SPEC.md §1/§2):
- invalid/error — a chip is not a form control and has no validation state of its own.
- loading — no async content; a loading chip is a skeleton, not this component.
- empty — `label` is always required content; there is no empty-chip rendering.

**Additional states specific to ino-chip (doc 26 §5):**

### focus
Only reachable when the chip has at least one interactive element (`interactive` and/or
`removable`). A fully-static, non-removable chip has no focusable element and therefore no
focus state — same as `ino-tag`. `:focus-visible` on the main button and/or the remove button,
`--ino-focus-ring` / `--ino-focus-ring-offset` (tokens.css §12), matching every other
interactive component in the tree.

### removing
Transitional state entered when the remove button is activated. The chip does not disappear
instantly:
1. `removing` flips true; `.ino-chip--removing` class drives a fade+scale-out animation.
2. A screen-reader-only `role="status" aria-live="polite"` node (still mounted during the
   animation) announces "Removing {label}".
3. After the animation ends (`animationend`) — or immediately, synchronously, when
   `prefers-reduced-motion: reduce` (same `matchMedia` idiom `ino-scrolltop` already uses, since
   `animationend` never fires for an animation that was never started) — `remove` is emitted.
   The consumer's `(remove)` handler is where the item actually leaves the backing array/DOM.
4. Both the main button and the remove button are disabled for the duration of `removing` (no
   double-fire, no interacting with a chip that is on its way out).

---

## 3. Sizing

`size: InoControlSize` (`'sm' | 'default' | 'lg'`) — the shared Wave 0 scale (INO-124), same
alias set `ino-tag` reads: `--ino-control-font-size`, `--ino-control-padding-inline`,
`--ino-control-gap`. Like `ino-tag`, **not** the full `--ino-control-height` — a chip is an
inline label/action, not a form control, and forcing a 44px-tall chip into a dense filter bar
or a table cell would be wrong (same reasoning `ino-tag` SPEC.md §3 already states). The
`--ino-row-min-height` density floor (32px dense / 44px fluid fallback 32px) still applies, so
every size still clears the WCAG 2.2 §2.5.8 24px target-size minimum.

---

## 4. Labels

Only "own label" (doc 26 §5) — the chip's `label` text input. No `ino-label`/hint/error
integration; a chip is not a form field, same precedent as `ino-tag` and `ino-avatar`.
Truncation: `label` text ellipsizes past `20ch` (one character wider than `ino-inputtags`'
`16ch`, since a chip typically carries less surrounding chrome) with the full text available via
the native `title` attribute. RTL: logical properties only (`padding-inline`, `margin-inline`,
`border-inline-start`), no physical `left`/`right` — verified by spot-check in the live docs
page RTL toggle.

---

## 5. Accessibility

### Roles and semantics
- Static, non-removable: `<span class="ino-chip">` — no role, no tabindex, plain inline content
  (matches `ino-tag`).
- Removable (static or interactive): outer `<span role="group" [attr.aria-label]="label">`
  wrapping the main content/button and the remove `<button aria-label="Remove {label}">`.
  `role="group"` (not `role="listitem"`) because a single chip is not itself a list item — the
  list semantics, when a caller renders many chips, belong to the caller's own wrapping markup
  (same as `ino-tag`, which is also list-position-agnostic).
- Interactive, non-removable: `<button type="button" class="ino-chip" [attr.aria-pressed]="pressable ? pressed : null">`.

### Keyboard map
- **Tab**: moves focus to the main button (if `interactive`) and/or the remove button (if
  `removable`) — both are real, independently-tabbable buttons, not a single composite widget
  with arrow-key roving (a two-button group is small enough that roving tabindex would be
  over-engineering; this matches `ino-inputtags`' own per-tag remove buttons, which are plain
  tab stops too).
- **Enter/Space**: activates whichever button has focus (native button semantics — no custom
  keydown handling needed for this).
- **Delete/Backspace**: when the main chip element (button or static span, if focusable via
  `removable`) has focus and `removable` is true, triggers the same removal path as clicking the
  remove button. This mirrors `ino-inputtags`' existing Backspace-removes-last-tag pattern,
  applied per-chip instead of per-field.
- **Escape**: not handled by the chip itself — no transient surface to dismiss (no SPEC parity
  concern; `ino-chip` has no popover/overlay).

### Screen reader announcements
- Removal: "Removing {label}" announced via `role="status" aria-live="polite"` the moment the
  `removing` transition starts (see §2), same wording style as `ino-inputtags`' "Removed {tag}".
- Accessible name: the remove button's `aria-label="Remove {label}"` and the group wrapper's
  `aria-label="{label}"` both carry the label text explicitly — never relying on visual-only
  icon content for the accessible name (same rule enforced on `ino-avatar`'s icon fallback form).

### WCAG 2.2 AA
- Contrast: `--ino-color-on-surface` / `--ino-color-accent` on `--ino-color-surface-raised`,
  verified AA in all 3 themes by `check-theme-parity`.
- Target size: `--ino-row-min-height` floor (§3) plus `--ino-target-min` (24px) on the remove
  button, same token `ino-inputtags__tag-remove` already reads.
- Focus indicators: `--ino-focus-ring` / `--ino-focus-ring-offset` on every real button in the
  component (main and/or remove), never on the non-interactive wrapper `<span role="group">`.

---

## 6. Notes

### Deliberate omissions
- **No drag-to-reorder**: chips are a display/removal primitive, not a sortable list. If ordering
  matters, the caller's own array order is authoritative; file a follow-up if drag-reorder is
  needed.
- **No built-in overflow/"+N more" collapsing**: unlike some chip-group components, `ino-chip`
  renders exactly one chip; a wrapping/overflow chip *group* is a separate, not-yet-built
  component. Callers lay out multiple chips with their own flex-wrap container (same pattern
  `ino-inputtags__tags` already uses internally).
- **No roving-tabindex composite widget**: see §5 Keyboard map — two independent tab stops
  (main, remove) rather than one ARIA-managed composite, matching `ino-inputtags`' existing
  per-tag shape rather than inventing a new one.

### PrimeNG mapping
- PrimeNG component: **Chip** (22.1.1).
- PrimeNG `removable` → same name here.
- PrimeNG `(onRemove)` → our `remove` output (fires after the removing transition completes, not
  synchronously on click — see §2).
- **Difference**: PrimeNG's Chip has no `interactive`/toggle-button mode; that half of this
  component's contract (doc 26 §5 "interactive vs static") has no direct PrimeNG analogue and is
  modeled on `ino-toggle-button`'s `aria-pressed` pattern instead.

### Mobile disposition
**Port both** (doc 26 §5): React Native and Flutter implementations with the same
label/icon/avatar/removable/interactive contract. Mobile platforms get:
- Native chip rendering (Material `Chip` on Android/RN-Android, iOS-native chip affordance)
- Platform touch-target sizing (not the web `--ino-row-min-height` tokens, which don't exist on
  mobile — each port uses its own platform minimum, documented in the port's own file header)
- Accessibility: TalkBack/VoiceOver announce the remove action and, for `interactive` chips, the
  pressed state

---

## 7. API Surface

### Inputs
- `label: string` — the chip's text (required visually).
- `size: InoControlSize` — `'sm' | 'default' | 'lg'`.
- `interactive: boolean` — default `false`. Renders the main body as a `<button>`.
- `removable: boolean` — default `false`. Adds the trailing remove button.
- `pressable: boolean` — default `false`. Only meaningful when `interactive`; renders
  `aria-pressed` on the main button and lets `pressed` drive a visual "selected" state.
- `pressed: boolean` — default `false`. Toggle-button state; ignored when `pressable` is false.
- `disabled: boolean` — disables all interactive elements, dims the chip.
- `readonly: boolean` — blocks `chipClick`/`remove` from firing but keeps the chip's visual
  weight (not dimmed like `disabled`), same disabled/readonly split `ino-inputtags` already uses.

### Outputs
- `chipClick: EventEmitter<void>` — emitted on main-button activation (`interactive` only).
- `pressedChange: EventEmitter<boolean>` — emitted when a `pressable` chip's pressed state flips.
- `remove: EventEmitter<void>` — emitted once the `removing` transition completes (or
  immediately under `prefers-reduced-motion: reduce`).

### Content projection
- `[icon]` — leading icon content.
- `[avatar]` — leading avatar content (e.g. a projected `<ino-avatar>`). Project one or the
  other, not both — see §1.

### Types
```typescript
export type InoChipSize = InoControlSize; // 'sm' | 'default' | 'lg'
```

---

## 8. Implementation notes

### Removing transition
`removing` is a local boolean, not an Angular `animate.leave` structural binding (contrast with
`ino-toast-container`, where the *parent* owns the array and animates the host element's own
removal from the DOM). Here, the component owns its own exit animation because doc 26 §5 lists
`removing` as `ino-chip`'s **own** state, not something every consumer must wire up independently
via `*ngFor` + `animate.leave`. The consumer still owns the backing array — `remove` only fires
once the chip has finished visually leaving, so the consumer's `(remove)="chips = chips.filter(...)"`
handler never has to coordinate timing with the animation itself.

### Button-in-group, not nested buttons
See §1. This is the one correctness-critical implementation detail: the template must never place
the remove `<button>` inside the main `<button>` when `interactive && removable` — the two are
always siblings under the `role="group"` wrapper.

---

## 9. Testing checklist (QA sign-off gate)

Per doc 26 §2, the QA validation subtask on INO-462 (INO-463) signs off on:
- [ ] All 3 themes (light, dark, high-contrast) render correctly in dense + fluid
- [ ] Sizing (sm/default/lg) tested
- [ ] Variants: label-only, label+icon, label+avatar; static and interactive; removable on/off
- [ ] States: default, hover, focus-visible, active, disabled, readonly, removing
- [ ] Keyboard: Tab reaches main/remove buttons independently, Enter/Space activates, Delete/
      Backspace on a focused removable chip removes it
- [ ] Screen reader: "Removing {label}" announced, remove button's accessible name correct,
      interactive chip's pressed state announced
- [ ] Button-in-group: verify no nested `<button>` in the rendered DOM when interactive+removable
- [ ] Contrast: AA in all 3 themes (automated via `check-theme-parity`)
- [ ] Mobile ports: React Native + Flutter implementations tested
