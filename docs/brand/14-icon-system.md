# 14 — Icon System (closes checklist §1 "Iconography system")

**Responds to:** `12-branding-completeness-checklist.md` §1 ("Iconography system — ⬜") and §8 build
order item 5, and the icon-system half of INO-85. Decided now because it was blocking build order
item 5 ("needed by buttons/forms/nav before those look finished") and the mobile empty-state
template in `13-mobile-app-patterns.md` §2.

**Status:** Decided — this is a design-system call (which glyph set + sizing/color contract to
standardize on), not a spend or roadmap commitment, so it doesn't need a board confirmation gate
the way the mobile framework choice does (see `13-mobile-app-patterns.md` §5).

---

## 1. Decision: adopt Lucide as the icon set

**[Lucide](https://lucide.dev)** (MIT-licensed, ISC-era Feather fork, actively maintained,
~1,500+ glyphs), consumed as inline SVG (or the Angular wrapper package if one is added to
`06-angular-components/`), not an icon font.

**Why this one, not a custom-drawn set or an alternative library (Phosphor, Heroicons, Material
Symbols):**

- **The brand's own mark already draws in this exact register.** The IX monogram
  (`10-logo-redesign-ix-verified-node.md`) is stroke-only, round cap, round join, ~2px stroke at a
  20px viewBox (scales to 2.3px at 32px, 3.1px at favicon crop). Lucide's default glyph is drawn on
  a 24px grid with a 2px stroke, round caps and joins — the same construction rule, not a
  coincidence to reconcile. A filled/duotone set (Material Symbols default, Phosphor's fill
  variant) would fight the mark's line-only identity; Lucide doesn't.
- **No icon font.** Icon fonts fail WCAG 2.2 non-text contrast auditing the way this repo already
  treats every other surface (`11-…mobile-accessibility.md`), and can't take `currentColor`/token
  color per-glyph the way inline SVG can. Every icon here inherits color from CSS custom
  properties, same pattern as the mark's gradient token swap.
- **MIT license, tree-shakeable, works identically in the web app (Angular) and whichever mobile
  framework is chosen** (`13-mobile-app-patterns.md` §5) — plain SVG has no framework coupling, so
  this decision doesn't get re-litigated once the framework choice lands.

## 2. Sizing scale (maps to existing tokens, no new ones needed)

| Icon size | Use | Token it pairs with |
|---|---|---|
| 16px | Inline with body/label text, dense-mode list rows | `--ino-type-body-size` line-height box |
| 20px | Default UI icon — buttons, form fields, list rows (fluid) | `--ino-row-min-height` (44px) fluid row |
| 24px | Nav bar / tab bar icons | `--ino-target-comfortable` (44px) — icon sits inside the 44px target, not the target itself |
| 32px | Empty-state / illustration slot centerpiece | Empty-state template, `13-mobile-app-patterns.md` §2 |

Stroke width stays at the library default (2px) at every size above — do not thin it down at 16px
(fails the same non-text contrast floor the mark itself is held to) and do not thicken it at 32px
(reads as a different family from the 16–24px UI icons next to it).

## 3. Color contract

Icons are **non-text UI elements** — they use the **non-text AA floor (3:1)**, not the 4.5:1 text
floor, exactly like `--ino-color-accent`'s existing doc comment in `tokens.css` already says
("gradients/glow/**icons**/large text only"). No new tokens; reuse:

| State | Token |
|---|---|
| Default / inactive | `--ino-color-on-surface-muted` |
| Active / selected (e.g. current tab) | `--ino-color-accent` |
| On a filled/accent-colored surface (e.g. primary button) | `--ino-color-on-accent` |
| Destructive action | `--ino-color-danger` |
| Decorative-only (never conveys state alone) | `--ino-color-on-surface-subtle` |

`--ino-color-on-surface-subtle` is explicitly "decorative/disabled only, fails AA as text at any
size" per its own token comment — icons using it must never be the *only* signal for an
interactive or status change (pair with label text or a status color elsewhere), same rule already
in force for the RAG chip dots.

## 4. Usage rules

- **Nav = icon + label, always** — already stated as a WCAG 2.2 target-identification rule in
  `13-mobile-app-patterns.md` §1; this doc doesn't relax it. Icon-only is permitted elsewhere only
  with a visible `aria-label`/tooltip (buttons/form-control icon triggers, e.g. a password
  show/hide toggle).
- **One glyph per concept, reused everywhere.** Don't pick a different "settings" glyph on web vs.
  mobile — same SVG symbol, sized per §2's table for the surface it's on.
- **No mixing libraries.** If a concept genuinely doesn't exist in Lucide's set, draw one glyph by
  hand at the same construction rule (24px grid, 2px stroke, round cap/join) rather than pulling a
  single icon from a different library — a one-off from Phosphor/Heroicons will visibly mismatch
  stroke weight next to Lucide's.

## 5. What this unblocks

- Buttons + form controls (checklist §3, build order item 1) can now spec icon-bearing variants
  (icon-leading button, input clear/show-password affordance) without a placeholder glyph.
- The mobile empty-state template (`13-mobile-app-patterns.md` §2, "Icon system is currently ⬜")
  is unblocked — use the 32px size row above.
- Nav/tab-bar icons (`13-mobile-app-patterns.md` §1) have a concrete glyph source now.

## 6. What this does NOT decide

- **No icons have been implemented as an Angular component yet** — this is the sizing/color/source
  contract, same as `13-mobile-app-patterns.md` is a token contract without built screens. Wiring
  a Lucide import into `06-angular-components/` is part of the buttons/forms work (checklist §3,
  build order item 1), not this doc.
- Does not touch imagery/photography direction (checklist §1, still ⬜, separate and lower
  priority per that row's own note).
