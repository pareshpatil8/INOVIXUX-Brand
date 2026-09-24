# `<ino-textarea>` — Textarea

> Parity benchmark: PrimeNG 22.1.1 `Textarea` (`specs/primeng/llms-22.1.1.txt`, line 119).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Gap analysis: `docs/brand/16-design-system-parity-vs-echeque-reference.md` line 176.
> Preview: [`previews/textarea.html`](previews/textarea.html).
> Decisions record: `web/src/app/components/textarea/SPEC.md`.

Labeled multi-line text control (INO-147, INO-31 T-7). Sibling to `<ino-input>` (INO-157) — same
label/hint/error/size/variant/disabled/readonly/loading contract, plus auto-resize, fixed rows, and
a character counter, the variants this issue's scope named.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | `''` | Rendered as a real `<label for>` |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Padding-inline / font-size from the Wave 0 control-size scale — see [Size API](#size-api) |
| `variant` | `'outline' \| 'filled'` | `'outline'` | Same treatment as `ino-input`'s `filled` variant |
| `placeholder` | `string` | `''` | |
| `value` | `string` | `''` | Banana-in-a-box with `valueChange` |
| `hint` | `string` | `''` | Rendered below the control; hidden while `error` is set |
| `error` | `string` | `''` | Sets `aria-invalid` + `aria-describedby`; rendered as a `role="alert"` message |
| `rows` | `number` | `3` | Native `rows` attribute — fixed-height mode's row count |
| `autoResize` | `boolean` | `false` | Grows with content via `scrollHeight`, bounded by `minRows`/`maxRows` — see [Auto-resize](#auto-resize-vs-fixed-rows) |
| `minRows` | `number` | `2` | Auto-resize floor, in rows |
| `maxRows` | `number` | `10` | Auto-resize ceiling, in rows — content beyond this scrolls |
| `maxLength` | `number \| null` | `null` | Native `maxlength`; also the character counter's denominator |
| `showCount` | `boolean` | `false` | Renders a `{count}/{maxLength}` counter — no-op without `maxLength` |
| `required` | `boolean` | `false` | Adds a visible `*` marker (decorative, `aria-hidden`) |
| `disabled` | `boolean` | `false` | Native `disabled` — removed from focus order |
| `readonly` | `boolean` | `false` | Native `readonly` — stays focusable, value stays announced/copyable |
| `loading` | `boolean` | `false` | Inert spinner + `aria-busy`; control becomes non-editable for the duration |

`valueChange: EventEmitter<string>` fires on every native `input` event.

### Size API

Reads two of the Wave 0 control-size aliases — `--ino-control-padding-inline`,
`--ino-control-font-size` — not `--ino-control-height`, which is a single-line control's box height
and doesn't apply to a multi-line control sized by `rows`/auto-resize instead; see SPEC.md §3.
Density (`[data-density="dense"|"fluid"]`) still applies as a `--ino-row-min-height` floor.

### Auto-resize vs. fixed rows

| Mode | `autoResize` | Sizing | Manual resize handle |
|---|---|---|---|
| Fixed rows (default) | `false` | Native `rows` attribute | On (`resize: vertical`) |
| Auto-resize | `true` | `scrollHeight`-measured height, clamped to `[minRows, maxRows]` | Off (`resize: none` — JS owns the height) |

See [SPEC.md §1](../../../web/src/app/components/textarea/SPEC.md#1-auto-resize-is-computed-from-scrollheight-in-js-not-css-only-dod-scope-auto-resize)
for why this is computed in JS rather than a CSS-only trick, and how the shrink-back-down and
lineHeight-relative clamp bugs common to naive implementations are avoided.

### Character counter

`maxLength` sets native `maxlength` (browser-enforced clipping); `showCount` opts into rendering
the `{count}/{maxLength}` text, wired into `aria-describedby` alongside hint/error so it's announced
on focus, with `aria-live="polite"` so updates are announced as the user types. Colour switches to
`--ino-color-danger` once the count reaches the limit — see SPEC.md §2.

### Variants

| `variant` | Look |
|---|---|
| `outline` (default) | All-round 1px border, `surface-sunken` fill |
| `filled` | `surface-raised` fill, flat bottom corners, single `border-block-end` rule that thickens/recolors on hover and focus — identical token progression to `ino-input`'s filled variant |

---

## States

| State | Trigger | Visual |
|---|---|---|
| Default | — | Border/fill per variant |
| Hover | `:hover` | Border (or base rule, filled) darkens toward `on-surface-muted` |
| Active/pressed | `:active` | Border/base-rule → `--ino-color-accent-active` |
| Focus-visible | `:focus-visible` | `--ino-focus-ring` / `--ino-focus-ring-offset`, never a hand-rolled outline |
| Disabled | `disabled` input | `opacity: 0.5`, `cursor: not-allowed`, resize handle off, removed from focus order |
| Readonly | `readonly` input | `surface-raised` fill (outline) / `surface-sunken` fill (filled), `cursor: default`, **stays focusable** |
| Invalid | `error` input set | Border/base-rule → `--ino-color-danger`, `aria-invalid="true"` |
| Loading/busy | `loading` input | Trailing spinner (top-anchored), `aria-busy` on host, control made non-editable (same mechanism as readonly) |

---

## Motion

The border/background transition on state changes uses `--ino-motion-duration-fast` +
`--ino-motion-easing-standard`. The loading spinner uses `--ino-motion-duration-slow` linear
rotation, matching `ino-input`'s spinner. Both collapse to no animation under
`prefers-reduced-motion: reduce`. Auto-resize height changes are not animated (an animated
scroll-height transition would visibly lag behind fast typing).

---

## Accessibility contract

**Role / ARIA** — a real `<label for>` gives the accessible name. `aria-invalid` reflects `error`;
`aria-describedby` points at the error message (`role="alert"`), the hint text, and/or the counter
(whichever are present) so all are announced on focus, not just shown visually. `aria-busy` is set
on the `ino-textarea` host (not the native `<textarea>`) while `loading`.

**Keyboard** — standard multi-line text-field keyboard model: `Tab`/`Shift+Tab` to move focus in/out
(no in-control `Tab` trap — `Tab` moves focus, it does not insert a tab character), native caret
navigation, `Enter` inserts a newline, and native text editing while focused and not
`readonly`/`loading`.

**Contrast** — text/placeholder/border pairs are the existing audited roles shared with `ino-input`.

**Target size** — `min-block-size: var(--ino-row-min-height, var(--ino-target-comfortable))` clears
the WCAG 2.2 SC 2.5.8 24px floor and the 44px comfortable recommendation at every size rung by
default (`rows="3"` is well above either floor in practice).

**RTL** — logical properties only (`inline-size`, `padding-inline`, `border-block-end`,
`inset-inline-end`/`top` for the spinner, `border-end-start-radius`/`border-end-end-radius` for the
filled variant's flat corners); no `left`/`right`/`bottom` anywhere in the stylesheet.

---

## Deliberate omissions

- **`--ino-control-height` re-point.** Not read at all — a multi-line control's height is owned by
  `rows`/auto-resize, not the single-line control-height rung; see SPEC.md §3.

## Mobile parity

All three tracks ship (Tier-1 form control, per `17-phase-2-implementation-program.md` §5):

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView ("Capacitor is not a port").
- **React Native** — `mobile/react-native/src/components/InoTextarea.tsx`. Fixed-rows sizing via
  `numberOfLines`; auto-resize approximated via RN's own `onContentSizeChange` (no `scrollHeight`
  primitive exists on `TextInput`).
- **Flutter** — `mobile/flutter/lib/widgets/ino_textarea.dart`. Auto-resize maps directly onto
  `TextField(maxLines: null)`, which grows to fit content natively.

Both native ports carry `size`, `variant` (outline/filled), `disabled`/`readOnly`/`loading` states,
and the character counter, using their own token files (`theme/tokens.ts` / `theme/tokens.dart`).
