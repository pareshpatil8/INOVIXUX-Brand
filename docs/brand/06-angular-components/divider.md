# `<ino-divider>` — Divider

> Spec source: `docs/brand/26-quality-remediation-and-completion-plan-ino-31.md` §5 Phase B2 row
> `ino-divider` (rev-2 amendment `a21a93c`). Board approval `f55baa72` on
> [INO-377](/INO/issues/INO-377). Issue: [INO-441](/INO/issues/INO-441).
> Parity benchmark: PrimeNG 22.1.1 `Divider` (`specs/primeng/llms-22.1.1.txt`) — PrimeNG is a
> benchmark, **not a runtime dependency**; nothing here imports it.
> Preview: [`previews/divider.html`](previews/divider.html).
> Decisions record: `web/src/app/components/divider/SPEC.md`.

A line that groups or separates content, WAI-ARIA `separator` pattern (`role="separator"` on the
host). Horizontal or vertical; the horizontal form optionally carries a centered label.

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Drives layout direction and `aria-orientation` — see [Accessibility contract](#accessibility-contract) |
| `thickness` | `'hairline' \| 'thick'` | `'hairline'` | Reads `--ino-border-width-{hairline,thick}` (tokens.css §6b) — see [Sizing](#sizing) |
| `label` | `string` | `''` | Centered caption; horizontal orientation only — see [Labels](#labels) |

No outputs — the component is presentational, no interactive state (doc 26 §5 row: `St: n/a`).

### Sizing

`thickness` is the component's only sizing axis (no sm/md/lg scale — doc 26 §5 row). It reads the
shared `--ino-border-width-hairline` (1px) / `--ino-border-width-thick` (2px) tokens added with
this component, rather than a divider-local value, and is **not** repointed by
`[data-density='dense']` — a divider's line weight is a visual choice, not a control-comfort
trade-off. Full reasoning: `SPEC.md` §3.

### Labels

`label` renders centered text between two line segments, horizontal orientation only — passing a
`label` with `orientation="vertical"` is silently ignored (no established layout exists for a
label mid-way down a vertical rule in either the PrimeNG benchmark or Material's divider). Full
reasoning: `SPEC.md` §1.

---

## Accessibility contract

**Role / ARIA** — `role="separator"` on the host, always. `aria-orientation="vertical"` is written
only for the vertical form; horizontal is `separator`'s APG default, so the attribute is omitted
rather than redundantly set to `"horizontal"`. The role stays `separator` even when `label` is
set — the label is a caption on the boundary, not owned content, so there is no switch to
`role="group"`. Full reasoning: `SPEC.md` §2.

**Keyboard** — none; the component is not focusable and has no interactive state.

**Contrast** — the line resolves through `--ino-color-border`; the label (when present) resolves
through `--ino-color-on-surface-muted` — both audited across all three themes by
`node scripts/check-theme-parity.mjs`.

**RTL** — logical properties only (`border-block-start` / `border-inline-start`, `margin-inline`);
no `top`/`left`/`right`/`bottom` anywhere in the stylesheet.

---

## Deliberate omissions

**PrimeNG mapping.** `Divider`'s `layout` (`'horizontal' | 'vertical'`) maps 1:1 onto
`orientation`; `type` (`'solid' | 'dashed' | 'dotted'`) and `align` (label position along the
line) are not carried over — doc 26 §5's row only calls for "horizontal/vertical; with centered
label," and no first-party page in the catalog currently needs a dashed/dotted rule or an
off-center label. Add on a real consumer, not speculatively.

**No vertical label.** See [Labels](#labels) / `SPEC.md` §1.

---

## Mobile parity

Both ports ship (per the issue's "Port both (trivial)" disposition).

- **React Native** — `mobile/react-native/src/components/InoDivider.tsx`. The bare line is
  `accessible={false}` (RN has no `separator` role; a purely decorative rule is correctly hidden
  from the accessibility tree); the label `Text`, when present, stays in the tree as real content.
- **Flutter** — `mobile/flutter/lib/widgets/ino_divider.dart`. A `Row`/`Column` with a bordered
  `Container` line and, when labelled, a `Text` between two flex-expanded line segments.

Both ports support `orientation` and `thickness`; `label` renders in the horizontal form only,
matching web. Full reasoning: `SPEC.md` §5.
