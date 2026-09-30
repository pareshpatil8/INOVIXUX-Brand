# `<ino-hero>` — Hero

> Marketing-only component — no PrimeNG counterpart, so there is no parity benchmark line.
> One of the 5 components doc 26 §4 A4 flagged with "no docs at all" (INO-374, doc 26 §6 C5).
> No static preview and no `SPEC.md` exist for this component; both predate this doc.

Page-top hero shell: an eyebrow + headline + lead copy block, plus a projected-content region for
whatever comes below (a CTA, a dashboard preview, a risk-trace illustration). The shell
deliberately knows nothing about what it contains — content projection keeps live dashboard/
risk-table markup out of this component, per its own class-level doc comment.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `eyebrow` | `string` | `''` | Small label above the headline; row is `*ngIf`-gated, omitted when empty |
| `headline` | `string` | `''` | Rendered as the page's `<h1>` — a hero is expected to own the page's single top-level heading |
| `lead` | `string` | `''` | Supporting paragraph below the headline; `*ngIf`-gated, omitted when empty |

Content slot:

| Selector | Position | Notes |
|---|---|---|
| *(default)* | Below the copy block | Caller-supplied — CTA buttons, a dashboard preview, an illustration; the hero has no opinion on its contents |

---

## Variants / Structure

One structural form: `<section>` → copy block (`eyebrow` → `headline` → `lead`) → projected-content
region. There is no alternate layout (e.g. split-image hero) — a caller wanting a two-column hero
composes it via the projected-content region's own markup, not a component `@Input`.

---

## States

Presentational and non-interactive — the hero itself owns no hover/focus/disabled/invalid state.

- **Full copy** — `eyebrow`, `headline`, and `lead` all supplied.
- **Headline only** — `eyebrow`/`lead` omitted (falsy/empty string); their rows collapse instead of
  leaving empty space, since both are `*ngIf`-gated rather than always-rendered-but-empty.
- **No projected content** — an empty default slot renders an empty `.ino-hero__content` wrapper;
  the component does not require at least one projected child.

---

## Accessibility contract

**Role / ARIA** — `<section>`'s implicit generic-section role is unchanged; no `aria-label` is added
because the visible `headline` (an `<h1>`) already gives the section an accessible name via the
standard heading-labels-section pattern. **Callers must not project their own `<h1>`** inside the
default slot — this component already renders the page's one `<h1>` from `headline`.

**Keyboard** — none owned by this component. Any interactive projected content (a CTA button, a
form) owns its own keyboard contract independently.

**Contrast** — eyebrow/headline/lead text-color tokens are pre-existing tokens, audited across all
three themes by `node scripts/check-theme-parity.mjs`.

**RTL** — logical properties only (`padding-inline`/`padding-block`, flow-relative flex direction);
no `left`/`right`/`top`/`bottom` in the stylesheet.

---

## Deliberate omissions

- **Background media (image/video).** Not carried — a hero needing a background image/video
  composes it into the projected-content region or wraps `<ino-hero>` itself; the shell owns no
  `background`/`media` input.
- **Built-in CTA button(s).** Not carried — CTAs are always caller-supplied projected content
  (typically `ino-button`), so the hero never hard-codes button copy, variant, or `href`/`routerLink`.
- **Readonly / invalid states.** Not carried — the hero has no value of its own to lock or fail
  validation.

## Notes / mobile disposition

Web-only. This is a marketing/landing-page component, not part of the mobile app shell — no React
Native or Flutter port exists or is planned; nothing in doc 26's component backlog (§5) calls for
one.
