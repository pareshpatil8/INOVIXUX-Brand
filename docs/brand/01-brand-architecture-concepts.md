# INO-31 — Brand Architecture Matrix
## Three Structural Concepts for Human Sign-Off

**⚠️ HITL GUARDRAIL — STOP STATE:** These are structural pitches only. No design tokens, CSS
variables, final logo artwork, or asset packs have been produced or compiled. Nothing here has
been applied to any surface. Execution of the selected direction begins only after explicit
approval.

**Scope once approved:** Corporate Website, Core SaaS Products, Pitch Presentations, MVPs
(starting with the KYB vendor underwriting tool), System Documentation, Letterhead, Business
Cards.

**Shared constraints across all three concepts:**
- One master B2B logo; every B2C mark is a *mechanical derivation* of it (never a separate design).
- Token values must map cleanly to Angular CSS custom properties.
- Verbal core: "Resilience," "Governance," "Verification," "Augmented Control." No hype words.
- Must support **Dense Mode** (B2B/G2B risk dashboards, RAG semantic alerts) and **Fluid Mode**
  (B2C low-friction consumer surfaces) from the same system.
- WCAG 2.2 AA minimum, with fallback sans-serif routing to Arial/Helvetica.

---

## Concept 1: The Sovereign Monolith
*(21st.dev Minimalist Edit)*

**Visual Design:** Monolithic, clean geometric typography as the master mark. The B2C icon is
defined as a direct mathematical subtraction from the B2B master logo — remove elements, don't
redraw them — so the consumer mark is legible at a glance as "the same company, less of it."

**Color Core:** 70% Dark Slate / Deep Space Black background layers, 30% Currency Green semantic
accents (reserved for confirmations, positive risk signals, and CTA states — not decoration).

**Tone Focus:** Absolute *Resilience & Governance*. This is the concept that reads most like
critical infrastructure — the visual equivalent of "this system does not go down and does not
overreach."

**Asset Implementation:**
- Matte black premium business cards, single-color foil or blind-emboss mark — no gradients.
- Minimal silver-accented letterhead; heavy whitespace, single rule line.
- Maximum data-density Angular risk tables: monolithic type carries the dense mode without
  needing decorative color to differentiate rows — green accent reserved strictly for RAG
  "green" state, avoiding accidental semantic collisions.

**Best fit if:** the priority audience is banks/regulators who need to trust the system *more*
than they need to be delighted by it.

---

## Concept 2: The Adaptive Synapse
*(21st.dev Motion Edit)*

**Visual Design:** Fluid, vector-based network line-work representing tech connectivity across
DPI rails. The B2C icon is a dynamic, mobile-optimized *subset* of the main logo's line system —
fewer nodes, same connective logic, not a redraw.

**Color Core:** 60% Rich Obsidian Black, 40% Deep Tech Violet and Electric Indigo ambient glow
fields, used for motion/state emphasis rather than static blocks of color.

**Tone Focus:** System-driven *Augmented Control* — the most literal expression of "the system
surfaces signal, the human decides." Motion is used to show data moving through verification
steps, not for decoration.

**Asset Implementation:**
- Linear-gradient presentation deck backdrops for pitch decks.
- High-fidelity dark-mode developer documentation portals — this concept is the strongest fit
  for system docs and API references aimed at integrator engineers.
- Fluid dashboard animations (Framer-Motion-equivalent transitions in Angular via the Web
  Animations API/Angular Animations) signaling state changes in the risk-flag pipeline.

**Risk to flag now:** glow/gradient ambient fields are the easiest of the three concepts to
accidentally fail WCAG 2.4.11 (focus visibility) and contrast checks on dense tables — Phase 2
would need to budget explicit review time for this if Concept 2 is chosen.

**Best fit if:** the priority audience is technical buyers/integrators evaluating the platform
as infrastructure to build on, not just a report to read.

---

## Concept 3: The Ecosystem Anchor
*(21st.dev Bento Edit)*

**Visual Design:** Heavy typographic wordmark emphasizing permanence and institutional weight.
The B2C mark is an isolated glyph pulled straight from the typography grid — not simplified,
*extracted* — reinforcing that the consumer product is a literal piece of the same institution.

**Color Core:** 60% Midnight Steel Navy, 40% Safe Clinical Teals and Gold accents — a palette
drawn from regulatory/health/finance-adjacent visual conventions rather than generic tech-brand
color.

**Tone Focus:** Scalable *Verification & DPI Compliance*. This is the calmest, least "dashboard,"
most institutional of the three — closer in register to trust-first, high-whitespace design
languages than to a dark developer-tool aesthetic.

**Asset Implementation:**
- Structured bento-grid layouts for both the public landing page and print collateral —
  the one concept where print and web share a literal grid logic, not just a color palette.
- Clean, text-heavy letterheads suited to formal compliance/regulatory correspondence.
- Explicit WCAG 2.2 AA accessible components built in from the grid stage, not retrofitted —
  this concept has the most headroom for accessibility by construction.

**Best fit if:** the priority audience is regulators, DPI ecosystem partners, and enterprise
compliance stakeholders where "calm and institutional" outperforms "sharp and technical."

---

## Decision You Need to Make

Pick one of the three as the master direction (the other two get retired, not blended — per
the brief this is a *single* master identity). Reply via the confirmation request on this issue,
or comment directly with your choice and any requested changes. Once you confirm, Phase 2
(design tokens → Angular theme contract) starts as the next tracked step.
