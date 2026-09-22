# `<ino-card>` — Card

> Parity benchmark: PrimeNG 22.1.1 `Card` (`specs/primeng/llms-22.1.1.txt`, line 38).
> PrimeNG is a benchmark, **not a runtime dependency** — nothing here installs it.
>
> Prerequisite for decomposing `ino-metric-panel` into `Tag` + `MeterGroup` (register item M-14) —
> not attempted in this issue.
> Preview: [`previews/card.html`](previews/card.html).
> Decisions record: `web/src/app/components/card/SPEC.md`.

The generic surface container — bento-grid tiles, KYB report/finding cards, mobile app list cards,
dashboard widgets. Pre-existed this issue with `variant`/`padding`/`interactive` and header/footer
content slots; this uplift adds a full-bleed `media` slot (closing the PrimeNG parity gap), a
`size` API, and `disabled`/`loading` states.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `variant` | `'default' \| 'sunken' \| 'overlay'` | `'default'` | Surface role — see [Surface roles](#surface-roles) |
| `padding` | `'sm' \| 'md' \| 'lg'` | `'md'` | Body content padding (`--ino-space-4/6/8`) — independent of `size` |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Header/footer chrome sizing from the Wave 0 control-size scale — see [Size API](#size-api) |
| `interactive` | `boolean` | `false` | Hover/press/focus elevation for a card that is itself a click/tap target — caller still owns the actual interactive element/role/keyboard handling |
| `disabled` | `boolean` | `false` | Dims the whole card; combined with `interactive`, also drops hover/press/focus and blocks pointer events |
| `loading` | `boolean` | `false` | Dims body content and shows a centered spinner; header/footer/media stay visible |

Content slots (all optional):

| Selector | Position | Notes |
|---|---|---|
| `[ino-card-media]` | First, full-bleed | **New.** Image/visual, clipped to the card's own corner radius — PrimeNG `Card`'s `header` template shape |
| `[ino-card-header]` | Below media | Pre-existing — title/eyebrow bar |
| *(default)* | Body | Pre-existing — main content |
| `[ino-card-footer]` | Last | Pre-existing — actions bar |

### Surface roles

`variant` binds to one of three surface roles (tokens.css §2), never a raw background value:

- **`default`** (`--ino-color-surface-raised`) — a normal card on a page/section background.
- **`sunken`** (`--ino-color-surface-sunken`) — an inset panel, e.g. a card nested inside another
  card, or a code/data block that should read as recessed.
- **`overlay`** (`--ino-color-surface-raised` + `--ino-elevation-2`) — a modal/sheet/popover body;
  pair with the `--ino-color-overlay-scrim` backdrop token separately, not via this component.

### Size API

`size="sm" | "default" | "lg"` reads the Wave 0 control-size scale's `--ino-control-padding-inline-
roomy` (applied to **both** the header/footer bars' inline and block padding — there is no
`--ino-control-height` for a chrome bar to carry the block dimension instead), plus
`--ino-control-font-size`/`-gap`/`-icon-size` for the bar's type and loading spinner. It does not
touch body padding — that stays on the pre-existing `padding` input. Full reasoning for the split:
`SPEC.md` §3.

---

## Variants

| Named in the benchmark / issue | Shipped | Surface |
|---|---|---|
| Media (PrimeNG `header` template) | ✅ **new** | `[ino-card-media]`, full-bleed |
| Header (title/eyebrow bar) | ✅ (pre-existing) | `[ino-card-header]` |
| Footer (actions) | ✅ (pre-existing) | `[ino-card-footer]` |
| Body / default content | ✅ (pre-existing) | Default `<ng-content>` |
| Surface roles | ✅ (pre-existing, this repo's own token-role system) | `variant` |

PrimeNG's separate `title`/`subtitle` templates are not built here — this repo's existing
`[ino-card-header]` already serves as one freeform title bar at every call site. Full reasoning:
`SPEC.md` §5.

---

## Motion

Hover/press lift and the disabled/loading opacity fade use `--ino-motion-duration-base` +
`--ino-motion-easing-standard`. The loading spinner uses `--ino-motion-duration-slow` linear
rotation, matching `ino-button`/`ino-radio`/`ino-tag`'s spinner treatment. Both collapse to no
animation under `prefers-reduced-motion: reduce`. No component-owned mount/unmount transition — the
card never toggles its own presence in the DOM.

---

## Accessibility contract

**Role / ARIA** — no explicit role; `<article>`'s implicit role is unchanged from before this issue.
`aria-disabled="true"` reflects `disabled`; `aria-busy="true"` reflects `loading` — both ARIA-only,
since `<article>` has no native `disabled` IDL attribute to use instead.

**Keyboard** — none owned by this component. `interactive` only supplies the visual hover/press/
focus state; a caller making a card clickable wraps it in a real `<a>`/`<button>` or supplies its
own `tabindex`/`(keydown)` handling.

**Contrast and targets** — border/background/focus-ring pairs are pre-existing tokens, audited
across all three themes by `node scripts/check-theme-parity.mjs`. SC 2.5.8 does not apply to the
card shell itself — any clickable surface is caller-supplied, per the keyboard note above.

**RTL** — logical properties throughout (`padding-block`/`padding-inline`, `border-block-start`/
`-end`, `border-inline-start-color`); no `left`/`right`/`top`/`bottom` anywhere in the stylesheet.

---

## Deliberate omissions

Recorded here rather than silently dropped (full detail in `SPEC.md` §2):

- **Readonly state.** Not carried — a card has no value of its own to lock.
- **Invalid state.** Not carried — "invalid" is a form-control validity concept; a card carries no
  value to fail validation.

## Mobile parity

All three tracks ship (per the issue).

- **Capacitor** — not a separate port; the same Angular component/CSS render in the Capacitor
  WebView (plan rev 9 §5, "Capacitor is not a port"). Every existing Capacitor page already
  consuming `<ino-card>` is unaffected — `padding` and the pre-existing slots are untouched.
- **React Native** — `mobile/react-native/src/components/InoCard.tsx`. `media`/`header`/`footer`
  are explicit `ReactNode` props (RN has no content-projection equivalent), not slots.
- **Flutter** — `mobile/flutter/lib/widgets/ino_card.dart`, same explicit-widget-prop approach.

Neither mobile port renders a shadow/elevation — the mobile token files carry no elevation values
(a pre-existing gap, noted in `theme/tokens.ts`) — so mobile cards differentiate `variant`s by fill
color and border only. Full reasoning: `SPEC.md` §8.
