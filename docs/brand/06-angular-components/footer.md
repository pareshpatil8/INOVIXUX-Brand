# `<ino-footer>` — Footer

> Marketing-only component — no PrimeNG counterpart, so there is no parity benchmark line.
> One of the 5 components doc 26 §4 A4 flagged with "no docs at all" (INO-374, doc 26 §6 C5).
> No static preview and no `SPEC.md` exist for this component; both predate this doc.

Site/app footer: a mark column plus up to N link-column groups, 5-column layout (a 1.4fr mark
column + 4 link columns) matching the v5 marketing HTML exactly. Every link renders through
`routerLink` (INO-84) — `columns[].links[].href` is an in-app route path, not an arbitrary URL.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `columns` | `InoFooterColumn[]` | `[]` | `{ heading: string; links: { label: string; href: string }[] }[]` |

Content slots:

| Selector | Position | Notes |
|---|---|---|
| `[logo]` | First, mark column | Caller-supplied mark/wordmark markup — the component has no built-in logo |

---

## Variants / Structure

One structural form: `<footer>` → mark column (`[logo]` projection) + one `<div class="ino-footer__col">`
per `columns` entry, each with an `<h4>` heading and a `<ul>` of `routerLink` anchors. There is no
alternate layout (e.g. single-column mobile stack is CSS reflow, not a component `@Input`).

---

## States

Presentational and non-interactive — the footer itself owns no hover/focus/disabled/invalid state;
individual links carry their browser-native focus-visible state, not a component-level one.

- **Populated** — any number of columns; each column's link list can be any length.
- **No columns** — `columns: []` renders only the mark column, no placeholder link groups.
- **No logo content** — omitting `[logo]` projected content leaves the mark column empty; the
  component does not render a fallback wordmark.

---

## Accessibility contract

**Role / ARIA** — `<footer>`'s implicit `contentinfo` landmark role is unchanged; each link list is
a plain `<ul>`/`<li>` with no additional ARIA. No `aria-label` is added to disambiguate multiple
`<nav>`-like lists because the lists are not marked up as `<nav>` — they are footer link groups,
matching the v5 HTML structure exactly.

**Keyboard** — none owned by the component beyond the browser-native link focus/activation that
`routerLink` anchors already provide; there is no roving-tabindex or custom key handling.

**Contrast** — heading/link/hover-underline token pairs are pre-existing tokens, audited across all
three themes by `node scripts/check-theme-parity.mjs`.

**RTL** — the grid uses `gap`/logical `grid-template-columns` flow; no `left`/`right` positioning in
the stylesheet, so the column order mirrors correctly under `dir="rtl"`.

---

## Deliberate omissions

- **Social/legal link row.** Not carried — the v5 marketing HTML's footer only ever used the mark +
  4 link-column shape; a bottom legal/social bar is a separate concern this component does not own.
- **Column count enforcement.** No minimum/maximum on `columns.length` — a caller passing 1 or 6
  columns gets exactly that many; the 5-column layout is a CSS default, not a clamp.
- **Readonly / invalid states.** Not carried — the footer has no value of its own to lock or fail
  validation.

## Notes / mobile disposition

Web-only. This is a marketing/site-shell component, not part of the mobile app shell — no React
Native or Flutter port exists or is planned; nothing in doc 26's component backlog (§5) calls for
one.
