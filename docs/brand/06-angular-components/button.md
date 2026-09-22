# `<button ino-button>` / `<a ino-button>` — Button

> Parity benchmark: PrimeNG 22.1.1 `Button` (`specs/primeng/llms-22.1.1.txt`).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Gap register: closes the `Button` uplift row tracked as **INO-156** (INO-31 Wave 1, U-1).
> Preview: [`previews/button.html`](previews/button.html).

Attribute-selector component applied to a native `<button>` or `<a>`, not a wrapper element — kept
on the native tag (same pattern as Angular Material's `mat-button`) so `type="submit"`, `disabled`,
`href`, and native keyboard/focus behavior all keep working for free.

---

## Variants

| `variant` | Fill / text roles | Use it for |
|---|---|---|
| `primary` | `--ino-gradient-accent` / `--ino-color-on-accent` | The one primary call-to-action in a view |
| `secondary` | `--ino-color-surface-raised` (bordered) / `--ino-color-on-surface` | The non-primary action in a pair |
| `ghost` | transparent until hover / `--ino-color-on-surface-muted` | Tertiary/low-emphasis actions |
| `icon` | square, no visible label / `--ino-color-on-surface-muted` | Icon-only — caller MUST supply a native `aria-label` (or `aria-labelledby`) directly on the host; this component does not infer one |
| `danger` | `--ino-color-danger` / `--ino-color-on-danger` | Destructive KYB actions — reject, revoke |

`variant` is a closed union bound only to token-derived styles — never a raw color. An unlisted
string is a compile error, not a silently-unstyled button.

### Why `danger` (INO-156)

The union used to stop at `icon`, which left every destructive action (reject an entity, revoke
access) with no visual register of its own. `secondary` under-signals the consequence; reaching for
`primary` would make the destructive action visually compete with the page's real call-to-action.
`danger` is deliberately the **same shape** as `primary` — flat fill, same hover/press mechanics,
same weight — just re-pointed at `--ino-color-danger` instead of the accent gradient, so it reads as
"equally weighted, different consequence" rather than a fourth visual language. It has no gradient
on purpose: `--ino-color-danger` is a single audited contrast pair per theme
(`onDanger`/`danger` ≥ 7:1, asserted by `check-theme-parity.mjs`), and a gradient would turn that
into a range with no single ratio to assert.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'icon' \| 'danger'` | `'primary'` | See table above |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Wave 0 control-size scale (INO-124); carries no pixel values of its own — see below |
| `disabled` | `boolean` | `false` | Reflected as the real `disabled` attribute |
| `loading` | `boolean` | `false` | Shows an inert spinner in place of an icon slot; blocks interaction via `[attr.disabled]` (not the DOM property, so it applies correctly to `<a>` too) without removing the label from the DOM |

### Size API (INO-124 adoption)

`size` re-points six `--ino-control-*` aliases on the host (`height`, `padding-inline-roomy`,
`font-size`, `icon-size`, `gap`); every rule in the component reads only those aliases, never a
per-size literal. `size="default"` resolves to exactly the values this component hardcoded before
adoption (44px / `--ino-space-5` / body), so it was a pixel-for-pixel no-op for every existing call
site. Density-relative: under `[data-density="dense"]` the same three size classes resolve to
28px/36px/40px instead of 36/44/52, because the `-sm`/`-lg` tokens they point at are themselves
re-resolved by the density block — this component adds no density logic of its own.

### Anchor-as-button caveat

`[attr.disabled]` on `<a>` blocks pointer clicks via CSS (`pointer-events: none`) but does not stop
keyboard activation the way real `disabled` does on `<button>` — if a disabled/loading state needs
to be keyboard-safe on an anchor, guard the `(click)` handler in the consuming template too.

---

## States

| State | Mechanism |
|---|---|
| default | base variant rule |
| hover | `filter: brightness(1.08)` (primary/danger) or a border/background shift (secondary/ghost/icon) |
| **active / pressed** | `--ino-color-accent-active` flat fill for `primary` (Wave 0 / INO-123); danger uses `filter: brightness(0.92)` — no new token, since `web/src/tokens.css` is frozen after Wave 0 and a filter reaches the same "flat, no gradient, obviously pressed" result without one |
| focus-visible | `outline: var(--ino-focus-ring)` + `outline-offset: var(--ino-focus-ring-offset)` — never hand-rolled |
| disabled | `opacity: 0.5`, `cursor: not-allowed`, `pointer-events: none` |
| readonly | not applicable — a button has no readonly concept; see Deliberate omissions |
| invalid | not applicable — a button has no validity state; see Deliberate omissions |
| loading / busy | spinner in the icon slot, label drops to `opacity: 0.6`, `aria-busy="true"`, interaction blocked |

`:active` and the focus ring both come from Wave 0 tokens (`--ino-color-accent-active`,
`--ino-focus-ring`) — this component never hand-rolls either.

---

## Motion

Background/border-color/color/filter/opacity transition on `--ino-motion-duration-fast` +
`--ino-motion-easing-standard`. `primary` and `danger` additionally lift 1px on hover and settle
back to the resting plane on press, gated behind `@media (prefers-reduced-motion: no-preference)`
so the translateY step disappears (not just slows down) under `reduce`. The loading spinner's
rotation is gated the same way — under `reduce` it renders as a static ring, still legible as "busy"
without anything on screen moving.

---

## Accessibility contract

**Role / ARIA**

- Native `<button>` or `<a>` — no custom role needed.
- `icon` variant: caller MUST supply `aria-label` (or `aria-labelledby`) directly on the host; this
  component does not infer one from content.
- `loading`: `aria-busy="true"` on the host; the accessible label stays in the DOM (only its opacity
  changes) so the button's name doesn't disappear mid-action for a screen-reader user.
- `disabled`/`loading`: reflected as the real `disabled` attribute on `<button>`; on `<a>` reflected
  via `[attr.disabled]` + `pointer-events: none` — see the anchor caveat above for the keyboard gap.

**Keyboard**

| Key | Action |
|---|---|
| `Tab` / `Shift+Tab` | Moves focus to/from the button |
| `Enter` / `Space` (`<button>`) | Activates — native behavior, not re-implemented |
| `Enter` (`<a>`) | Activates — native behavior; `Space` does not activate an anchor, which is standard platform behavior, not a defect |

**Contrast (WCAG 2.2 AA text + SC 1.4.11 non-text)** — measured, not assumed; full tables in
`docs/brand/02-design-tokens/README.md` §Contrast:

| Theme | `on-danger` on `danger` fill | `on-accent` on `accent-active` (pressed primary) |
|---|---|---|
| dark (`:root`) | 4.76:1 | 5.83:1 |
| light | 6.59:1 | 8.07:1 |
| high-contrast | 7.57:1 (AAA) | 11.56:1 (AAA) |

`danger` is audited at the AA text minimum (≥4.5:1) in dark/light, same budget as `ino-alert`'s
severity fills — high-contrast is the theme `check-theme-parity.mjs` holds to the ≥7:1 AAA bar.

`node scripts/check-theme-parity.mjs` asserts the `onDanger`/`danger` ≥ 7:1 pair and the
`accent-active` pressed-fill budget (4.5:1 dark/light, 7:1 high-contrast against `on-accent`, 3:1
against every surface) on every run.

**Targets** — `size="default"` is `--ino-target-comfortable` (44px); `size="sm"` in fluid density is
36px, still above the 24px SC 2.5.8 floor (`check-theme-parity.mjs` asserts the floor holds for
every size × density rung).

**RTL** — `padding-inline` (not `padding: 0 …`) throughout; no `left`/`right` anywhere in the
component. Mirrors under `dir="rtl"` with no second stylesheet.

---

## Deliberate omissions

Recorded here rather than silently dropped (DoD §6):

- **`readonly` / `invalid` states.** Two of the eleven-row DoD's eight states don't apply to a
  button: a button has no notion of a read-only or invalid value the way a form field does. Both
  rows are marked "not applicable" above rather than faked with a stub input.
- **Component registry line in `check-theme-parity.mjs` (DoD row 11).** That registry does not
  exist — confirmed against the live script (265 lines, read in full) during `virtual-scroller`'s
  SPEC.md and re-confirmed here. The script is a *token-contract* audit (CSS ↔ RN ↔ Flutter parity),
  not a per-component manifest; inventing one here would put a new shared structure in a file every
  remaining Wave 1/2 issue touches, which is exactly the merge-conflict surface the "append-only
  registry" rule exists to avoid. Filed as a Wave 0 amendment candidate against INO-31 rather than
  added ad hoc in this issue.
- **Tinted/outlined danger style.** PrimeNG's `Button` has `severity="danger" outlined text`
  variants layered on top of severity. Ours fills solidly, same reasoning as `ino-alert`'s severity
  tiers: the audited `--ino-color-danger`/`--ino-color-on-danger` pair applies unmodified, and a
  tinted background would need a new token per severity per theme — `web/src/tokens.css` is frozen
  after Wave 0.

---

## Mobile parity

| Track | Status | Notes |
|---|---|---|
| Capacitor | Not a port | Renders the same Angular component and the same CSS (INO-31 plan rev 9 §5 rule) — done the moment the web component passes. |
| React Native | Real port | `mobile/react-native/src/components/InoButton.tsx`. Reads `control[size]` + theme-role names from `mobile/react-native/src/theme/tokens.ts`, never a literal. `hover` and the `:focus-visible` ring are dropped (no pointer, no keyboard-vs-touch focus distinction on touch hardware); `:active` (pressed, via `Pressable`'s render-prop), `loading` (`ActivityIndicator` in the icon slot), and `disabled` all carry over. |
| Flutter | Real port | `mobile/flutter/lib/widgets/ino_button.dart`. Reads `InoControlSize` + `context.inoColors` role names from `mobile/flutter/lib/theme/tokens.dart` / `app_theme.dart`. Same hover/focus omissions as RN. Loading spinner respects `MediaQuery.disableAnimations` (Flutter's reduced-motion signal) by swapping the spinning `CircularProgressIndicator` for a static ring. |

All three tracks ship `primary` / `secondary` / `ghost` / `icon` / `danger` and the `sm`/`default`/
`lg` size API; RN and Flutter read the FLUID column of the control-size scale only (mobile is always
fluid, per `13-mobile-app-patterns.md` §3), same rule the scale itself already documents.
