# `<ino-tier-card>` — Tier card

> Marketing-only component — no PrimeNG counterpart, so there is no parity benchmark line.
> One of the 5 components doc 26 §4 A4 flagged with "no docs at all" (INO-374, doc 26 §6 C5).
> No static preview and no `SPEC.md` exist for this component; both predate this doc.

Deployment tier card (dense/fluid rollout tiers), **not** commercial pricing. Renders a tier
`name`, `description`, and a bullet `features` list; when `highlighted` is set, it also renders a
visible non-commercial disclaimer. The INO-14 hold still applies — no commercial/pricing
validation sign-off until the KYB MVP is verified — and this component's disclaimer exists
specifically to carry that framing forward wherever the card is used (see the component's own
class-level doc comment).

---

## API

| Input | Type | Default | Notes |
|---|---|---|---|
| `name` | `string` | `''` | Tier name (e.g. "Standard", "Scale") |
| `description` | `string` | `''` | One-line tier description |
| `features` | `string[]` | `[]` | Plain bullet list — no per-feature icon/included/excluded state |
| `highlighted` | `boolean` | `false` | Visible highlight treatment **and** renders the "illustrative, not commercial" disclaimer — see [States](#states) |

---

## Variants / Structure

One structural form: `<article>` → `<h3>` name → description → `<ul>` features → conditional
disclaimer paragraph. There is no separate "compact" or "comparison-table" variant — a tier
comparison layout is composed by a caller rendering multiple `<ino-tier-card>`s side by side, not a
component `@Input`.

---

## States

- **Default** — `highlighted: false` (the default); no disclaimer, standard surface treatment.
- **Highlighted** — `highlighted: true` renders `.ino-tier-card--highlighted` styling **and** the
  mandatory disclaimer paragraph: *"Illustrative deployment tier — not a commercial offer. INO-14
  hold applies until the KYB MVP is verified; a human still approves every underwriting decision."*
  This text is intentionally not editable via an `@Input` — see [Deliberate omissions](#deliberate-omissions).
- **No features** — `features: []` renders an empty `<ul>` with no placeholder row.

---

## Accessibility contract

**Role / ARIA** — no explicit role; `<article>`'s implicit role is unchanged. No ARIA is added to
mark `highlighted` — the visual highlight is a styling affordance, and the disclaimer paragraph
that accompanies it is plain readable text, already exposed to assistive tech in document order.

**Keyboard** — none owned by this component. The card is never focusable or activatable on its own;
a caller making a tier card a click/tap target (e.g. "select this tier") wraps it in its own
interactive element and owns that contract, the same pattern `ino-card`'s `interactive` input
documents.

**Contrast** — surface/border/highlight-accent token pairs are pre-existing tokens, audited across
all three themes by `node scripts/check-theme-parity.mjs`. The disclaimer text uses the same body
text-color token as `description`, not a lower-contrast "fine print" treatment — the note is meant
to be read, not hidden.

**RTL** — logical properties throughout (`padding-inline`/`padding-block`, `border-inline-start`);
no `left`/`right`/`top`/`bottom` in the stylesheet.

---

## Deliberate omissions

- **Price / billing-period fields.** Not carried — this is explicitly a deployment-tier card, not a
  pricing card; adding a `price`/`period` `@Input` would misrepresent it as a commercial offer,
  which is exactly what the INO-14 hold and the `highlighted` disclaimer exist to prevent. Do not
  add these fields without a signed-off commercial-pricing decision superseding INO-14.
- **Per-feature included/excluded state.** Not carried — `features` is a flat bullet list; a
  checkmark/cross comparison matrix is a different, not-yet-built component.
- **Disclaimer text as an `@Input`.** Not carried on purpose — making the non-commercial framing
  editable per call site would let a caller quietly drop or soften it. The text is fixed in the
  component so it cannot be accidentally removed "to make the card look more finished" (the
  component's own class-level doc comment calls this out explicitly as a non-goal).
- **Readonly / invalid states.** Not carried — the card has no value of its own to lock or fail
  validation.

## Notes / mobile disposition

Web-only. This is a marketing/landing-page component, not part of the mobile app shell — no React
Native or Flutter port exists or is planned; nothing in doc 26's component backlog (§5) calls for
one.
