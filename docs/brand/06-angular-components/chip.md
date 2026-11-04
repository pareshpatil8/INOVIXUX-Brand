# `<ino-chip>` — Chip

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B4 row
> `ino-chip` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377). Issue: [INO-462](/INO/issues/INO-462).
> Parity benchmark: PrimeNG 22.1.1 `Chip` — named as "not-yet-built" in `ino-tag`'s own header
> comment; PrimeNG is a benchmark, **not a runtime dependency**; nothing here imports it.
> Decisions record: `web/src/app/components/chip/SPEC.md`.

A compact, removable label — the standalone promotion of the per-tag chip idiom
`<ino-inputtags>` already uses internally (doc 26 §5: "removable = button-in-group contract
(shares inputtags spec)"). Static (a non-interactive label, like `<ino-tag>`) or interactive (a
real toggle button), optionally removable via a trailing × button. Ports to React Native and
Flutter.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | The chip's text — see [Labels](#labels) |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | See [Sizing](#sizing) |
| `interactive` | `boolean` | `false` | Renders the main body as a `<button>` instead of a `<span>` |
| `removable` | `boolean` | `false` | Adds a trailing remove button — see [Variants / Structure](#variants--structure) |
| `pressable` | `boolean` | `false` | Only meaningful when `interactive`; enables the toggle-button `aria-pressed` pattern |
| `pressed` | `boolean` | `false` | Toggle-button state; ignored when `pressable` is false |
| `disabled` | `boolean` | `false` | Disables all interactive elements, dims the chip |
| `readonly` | `boolean` | `false` | Blocks `chipClick`/`remove` from firing; dims less than `disabled` |

| Output | Payload | Fires |
|---|---|---|
| `chipClick` | `void` | Main-button activation (`interactive` only) |
| `pressedChange` | `boolean` | A `pressable` chip's pressed state flips |
| `remove` | `void` | Once the removing transition completes (or immediately under `prefers-reduced-motion: reduce`) |

Two content-projection slots: `[icon]` and `[avatar]` — project one or the other (not both) as the
chip's leading visual. Full reasoning: `SPEC.md` §1, §7.

---

## Variants / Structure

Doc 26 §5 row: "label+icon+avatar; removable; interactive vs static".

**Content:** `label` (always), plus one optional leading visual — a projected `[icon]` or a
projected `[avatar]` (e.g. an `<ino-avatar>`). Each slot only occupies space when it actually has
projected content (`:empty { display: none }`, the same idiom `<ino-tag>`'s icon slot uses).

**Static vs. interactive:** a static chip (the default) renders a non-interactive `<span>` — no
`tabindex`, no click handling, same precedent as `<ino-tag>`. An `interactive` chip renders a real
`<button type="button">` and emits `chipClick`. Pairing `interactive` with `pressable` turns it
into a toggle button (`aria-pressed`) — the same WAI-ARIA pattern `<ino-toggle-button>` already
uses, not the `role="switch"` pattern.

**Removable — button-in-group contract:** a `<button>` cannot contain another `<button>` (invalid
HTML). When `removable` is set, the main content and a trailing remove `<button
aria-label="Remove {label}">` render as **siblings**, wrapped in one non-interactive
`<span role="group" aria-label="{label}">` — never nested. This is exactly the shape
`<ino-inputtags>`'s own per-tag markup already uses; `<ino-chip>` promotes it to a standalone,
reusable component. A non-removable chip is a single element (one `<span>` or one `<button>`), no
wrapper.

---

## Sizing

`size`: `'sm' | 'default' | 'lg'` — the shared Wave 0 `InoControlSize` scale (INO-124), the same
three-alias subset (`font-size` / `padding-inline` / `gap`) `<ino-tag>` reads. Not the full
`--ino-control-height` scale — a chip is an inline label/action, not a form control, so forcing a
44px-tall chip into a dense filter bar or table cell would be wrong (same reasoning `<ino-tag>`
already documents). The `--ino-row-min-height` density floor (32px dense / 44px fluid) still
applies underneath, clearing the WCAG 2.2 §2.5.8 24px target-size minimum at every size.

---

## Labels

Only "own label" (doc 26 §5) — the chip's `label` text input. No `<ino-label>`/hint/error
integration; a chip is not a form field, same precedent as `<ino-tag>` and `<ino-avatar>`. The
label text ellipsizes past 20 characters with the full text available via the native `title`
attribute. RTL: logical properties only (`padding-inline`, no physical `left`/`right`).

---

## States

Standard set: default, hover, focus-visible, active, disabled, readonly.
**N/A** (no form-control semantics of its own, same as `<ino-tag>`): invalid/error, loading,
empty.

**Additional states (doc 26 §5 row):**

- **focus** — only reachable when the chip has at least one interactive element (`interactive`
  and/or `removable`); a fully-static, non-removable chip has no focus state at all.
- **removing** — entered when the remove button (or Delete/Backspace on a focused removable chip)
  is activated. The chip fades and scales out, a screen-reader-only live region announces
  "Removing {label}", and `remove` fires once the transition ends — or immediately, synchronously,
  under `prefers-reduced-motion: reduce`. Both the main and remove buttons are disabled for the
  duration so a chip on its way out can't be double-removed or clicked.

---

## Accessibility contract

**Roles:**
- Static, non-removable: plain `<span>`, no role, no tabindex.
- Removable: outer `<span role="group" aria-label="{label}">` wrapping the main content/button and
  the remove `<button aria-label="Remove {label}">`.
- Interactive, non-removable: `<button type="button" aria-pressed="…">` (when `pressable`).

**Keyboard map:**
- **Tab** — moves focus to the main button (if `interactive`) and/or the remove button (if
  `removable`) independently; both are plain tab stops, not a roving-tabindex composite.
- **Enter / Space** — activates whichever button has focus (native button semantics).
- **Delete / Backspace** — when the main chip element has focus and `removable` is true, triggers
  the same removal path as clicking the remove button (mirrors `<ino-inputtags>`'s existing
  Backspace-removes-last-tag pattern, applied per-chip).

**Screen reader announcements:**
- Removal: "Removing {label}" announced via `role="status" aria-live="polite"` the moment the
  removing transition starts.
- Accessible names never rely on visual-only icon content — the remove button's
  `aria-label="Remove {label}"` and the group wrapper's `aria-label="{label}"` both carry the
  label text explicitly.

**WCAG 2.2 AA:**
- Contrast: `--ino-color-on-surface` / `--ino-color-accent` on `--ino-color-surface-raised`,
  verified AA in all 3 themes by `check-theme-parity`.
- Target size: the `--ino-row-min-height` floor plus `--ino-target-min` (24px) on the remove
  button meet the §2.5.8 minimum.
- Focus indicators: `--ino-focus-ring` / `--ino-focus-ring-offset` on every real button in the
  component — never on the non-interactive `role="group"` wrapper itself.

---

## Deliberate omissions

- **No drag-to-reorder.** A chip is a display/removal primitive, not a sortable list item. If
  ordering matters, the caller's own array order is authoritative.
- **No built-in overflow/"+N more" collapsing.** `<ino-chip>` renders exactly one chip; a
  wrapping/overflow chip *group* is a separate, not-yet-built component. Callers lay out multiple
  chips with their own flex-wrap container (the same pattern `<ino-inputtags>`'s internal tag list
  already uses).
- **No roving-tabindex composite widget.** Two independent tab stops (main, remove) rather than
  one ARIA-managed composite — matches `<ino-inputtags>`'s existing per-tag shape.

### Contrast with PrimeNG Chip
- PrimeNG `removable` → same name here. PrimeNG `(onRemove)` → our `remove` (fires after the
  removing transition completes, not synchronously on click).
- PrimeNG's Chip has no `interactive`/toggle-button mode; that half of this component's contract
  has no direct PrimeNG analogue and is modeled on `<ino-toggle-button>`'s `aria-pressed` pattern
  instead.

---

## Mobile parity

**Port both** (doc 26 §5): React Native (`mobile/react-native/src/components/InoChip.tsx`) and
Flutter (`mobile/flutter/lib/widgets/ino_chip.dart`) implementations carry the same
label/icon/avatar/removable/interactive contract. Mobile platforms get:
- Native chip rendering (Material `Chip` idiom on Android, iOS-native chip affordance)
- Platform touch-target sizing — each port uses its own platform minimum (the web
  `--ino-row-min-height` tokens don't exist on mobile), documented in the port's own file header
- Accessibility: TalkBack/VoiceOver announce the remove action and, for interactive chips, the
  pressed state
