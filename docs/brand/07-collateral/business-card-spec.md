# INOVIXUX — Business Card Production Spec (Verified Line)

**Status:** Design intent, ready for a print vendor quote. Not a print-ready press file (no
`.ai`/`.indd`/PDF-X output) — that final artwork step needs the real vector mark from workstream A
(blocked on Figma/a designer). Everything below is precise enough for a vendor to quote and for a
designer to build the actual press file against once the mark exists.

Matches concept A's original spec (`../01-brand-architecture-concepts.md`): *"matte-black business
card with the resolved-checkmark B2C mark."*

---

## 1. Dimensions

| Region | Size | Notes |
|---|---|---|
| **India / APAC standard** | 90mm × 54mm | Default — matches the brief's India/APAC context |
| US standard (alt run) | 89mm × 51mm (3.5in × 2in) | Only if a US print run is needed |
| Bleed | +2mm every edge | 94mm × 58mm total artboard (India spec) |
| Safe area | 4mm inset from trim on all sides | No text/logo inside this margin |
| Corners | Square (no rounding) | Matches the system's minimal-geometry language — no radius tokens used on the identity mark itself |

## 2. Stock & finish

| Property | Spec |
|---|---|
| Stock | Matte black, 32pt (≈600–700gsm) rigid card stock |
| Front finish | Single-color **foil (silver or Signal-Blue-matched foil)** OR **blind emboss** for the mark — pick one, not both; foil for higher-contrast legibility, blind emboss for the most minimal/tactile read. Foil is the safer default for RAG/regulator-facing exchanges where the mark must be legible at a glance in low light. |
| Back finish | Matte black, no print (or, optionally, the traced-line motif in blind emboss only — no foil on the back) |
| No spot-UV, no gradients, no full-bleed color fields | Matches the "no gradients" constraint from the original concept brief across all three retired concepts and carried into Verified Line |

## 3. Layout — front

```
┌──────────────────────────────────────────┐
│  4mm safe margin                          │
│                                            │
│   [Verified Line mark — resolved          │
│    checkmark form, foil/emboss]           │
│                                            │
│                                            │
│                                            │
│                              INOVIXUX      │  ← wordmark, bottom-right,
│                                            │    small, same foil/emboss
└──────────────────────────────────────────┘
```

- Mark placement: **top-left**, sized so its longest edge = 9mm (small — this is a card, not a
  billboard; the mark should read as a maker's mark, not a hero lockup).
- Wordmark: bottom-right, 7pt equivalent, same finish as the mark, tracked +2% (matches
  `--ino-type-label-tracking` intent, scaled for foil-stamp legibility at small size).
- Everything else on the front stays empty black — the card's negative space *is* the "Resilience
  & Governance" tone claim from the brief, not a decoration to fill.

## 4. Layout — back

```
┌──────────────────────────────────────────┐
│  4mm safe margin                          │
│                                            │
│   NAME                                    │  ← Geist, 9pt, weight 600, white ink
│   Title                                   │  ← Geist, 7.5pt, weight 400, #8C8C8E-equiv gray ink
│                                            │
│   email@inovixux.com                      │  ← Geist Mono, 7pt, white ink
│   +91 [phone]                             │
│   inovixux.com                            │
│                                            │
└──────────────────────────────────────────┘
```

- All back-of-card text is **printed ink** (not foil/emboss) — white and neutral-gray inks only,
  matching `--ino-color-on-surface` / `--ino-color-on-surface-muted` roles from `tokens.css` at
  their nearest print-ink equivalents.
- Typography: Geist for name/title (display role), Geist Mono for contact details/URL (mono role)
  — same font-role split as the digital system, so the card and the product UI read as one voice.
- Left-aligned block, vertically centered, same 4mm safe margin as the front.

## 5. Color specification (for the vendor quote)

| Token | Value | Use on card |
|---|---|---|
| `--ino-primitive-black` | `#0A0A0A` | Stock color (closest matte-black card stock match) |
| `--ino-color-on-surface` | `#F5F5F4` | Back text ink (name/title) |
| `--ino-color-on-surface-muted` | `#8C8C8E` | Back text ink (title/role line) |
| `--ino-color-accent` | `#3B6EF6` (Signal Blue) | **Not used on the card itself** — the mark ships as foil/emboss (silver or black-on-black), not printed blue. Reserve the accent color for digital surfaces and the letterhead's single rule; a card is a tactile object, not a screen, and foil reads as more premium than a spot blue on black. Flagging this as a deliberate choice for your sign-off, since it's a deviation from "the accent shows everywhere." |

## 6. What the vendor needs from us before a press-ready file exists

1. Final vector mark (`.svg`/`.eps`) from workstream A — currently blocked on Figma authorization
   or a human designer pass (see `../04-activity-plan-and-visual-samples.md`, workstream A).
2. Confirmed name/title roster for the first print run (who gets cards).
3. A decision on foil vs. blind-emboss finish (§2) — both are viable; this spec doesn't force one,
   it flags the trade-off for your call.

Until #1 lands, this document is the full design brief a print vendor needs to quote turnaround
and cost — it does not block getting quotes today.
