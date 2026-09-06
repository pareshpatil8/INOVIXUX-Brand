# INO-31 — Design System Foundation v5
## Building on Vetra's structure directly (not just referencing it)

**Your instruction, quoted plainly:** *"refer this https://github.com/Shreyas-29/vetra and lets
start building hour own Brand and Design system on top of this but with out tech stack."*

**What changes from v4:** every round through v4 was a text pitch — three named concepts,
described in prose, illustrated with isolated snippets (a hero, a table, a business card). You've
now said, twice, that abstract pitches aren't enough to judge and that you want the real thing.
This revision stops pitching concepts and starts **building the actual page**, using Vetra's real
section-by-section anatomy as the literal structural foundation — not a mood reference in a
paragraph.

**"Without tech stack," read as it's written:** Vetra runs on Next.js 15 + React + Shadcn UI +
Framer Motion. None of that runs on our rail (Java/Spring Boot + Angular). So this build reuses
Vetra's *page structure and interaction moves* — not one line of its code or its
framework — implemented as plain HTML/CSS plus ~15 lines of vanilla JS. That is intentional: it
proves the structure is framework-agnostic before Phase 2 ports it into actual Angular components.

---

## What was built

**File:** [`docs/brand/mockups/foundation-v5-verified-line.html`](mockups/foundation-v5-verified-line.html)
(screenshot: `foundation-v5-verified-line.png`)

One full, scrollable page — not fragments — skinned in the **Verified Line** identity (the
strongest narrative fit for a human-in-the-loop KYB product: a line that only resolves to a
checkmark once a person closes the case). Section-by-section, mapped directly against the live
Vetra site:

| # | Vetra section (live site) | This build | What changed / stayed |
|---|---|---|---|
| 1 | Nav: logo, menu, "Get Started" CTA | Nav: logo, Platform/KYB/Docs/Deployment, Sign in + Request demo | Structure identical; copy is ours |
| 2 | Hero: headline + subhead + CTA + full-width dashboard mockup image | Hero: headline + subhead + CTA + **live-rendered** trace/reviewer-queue dashboard (not a static image) | Upgraded: ours is real markup, not a screenshot-in-a-screenshot |
| 3 | "Trusted by leading brands" logo bar | "Rails this system reconciles against" — UPI / ABDM / GSTIN / MCA21 / AA / e-KYC | Reframed honestly: infra rails we integrate *against*, not claimed partners/customers |
| 4 | 4-column feature grid | 4-column feature grid (One master line / Resolved not decided / Dense-mode / Fluid-mode) | Structure identical, content is our product logic |
| 5 | Campaign Insights + Audience Metrics (2 panels, counter + table each) | Verification Throughput + Human Reviews Closed (2 panels, counter + table each) | Structure identical; Number Flow counters → vanilla `requestAnimationFrame` count-up (same visual effect, zero React dependency) |
| 6 | Integration/Social callout | Tech-stack translation callout (Tailwind/Shadcn/Framer Motion → Tailwind/spartan-ui/Angular Animations) | Repurposed the same layout slot to do real Phase-2 documentation work instead of marketing filler |
| 7 | Pricing (2-tier cards + monthly/annual toggle) | Deployment tiers (Standard/Enterprise + self-hosted/managed toggle), explicitly labeled **not real pricing** | Structure identical; toggle reimplemented in ~6 lines of vanilla JS instead of a React state hook — no commercial claim is made (INO-14 hold respected) |
| 8 | Language grid (20+ flag icons) | Compliance/geography grid (India, APAC markets, DPI/ABDM/GSTIN/MCA21, WCAG 2.2 AA) | Same grid pattern, marked **illustrative** |
| 9 | Final CTA | Final CTA, explicitly non-commercial ("not a sales page") | Same slot, honest framing |
| 10 | Footer, multi-column | Footer, multi-column (Platform/Docs/Company/Legal) | Structure identical |

**Interaction parity, framework-free:** the count-up metrics and the tier toggle are the two
dynamic moves Vetra uses Framer Motion / React state for. Both are reproduced here in vanilla JS
(visible at the bottom of the HTML file) — proof that "Vetra's structure without Vetra's tech
stack" is not just a claim, it's working in the file you can open right now.

**Brand discipline preserved, not reopened:** monochrome black/off-white base, one functional
accent color, no ambient glow/gradient fields — the Apple/SpaceX correction from v2 stands. Vetra
is the *skeleton* (layout, section order, interaction moves); it is not the *surface* (we did not
bring back Vetra's own dark-glow palette).

**Token-swappable, not hard-coded to one concept:** every color in the file routes through a
single `--accent` CSS custom property. The same HTML/layout works unchanged for the other two
surviving structural marks by swapping one value:

| Concept | `--accent` | Display / body type |
|---|---|---|
| A — Verified Line *(built, shown above)* | `#3B6EF6` (Signal Blue) | Geist / Geist Mono |
| B — Aperture Mark | `#B98A3C` (warm bronze) | Bricolage Grotesque / Inter |
| C — Ledger Seal | `#C2914B` (foil ochre) | Source Serif 4 / Public Sans |

This is deliberate: rather than building three full pages again (the exact pattern you rejected
in v1–v4), this proves the *system* once, in depth, with one concept — and the token table above
is the receipt that the other two are a palette/type swap away, not a rebuild, once you tell us
which mark should carry the identity.

---

## Angular translation checklist (Phase 2, not started — still inside the HITL guardrail)

No production tokens, Angular components, or code have been written. This is the concrete list
Phase 2 will execute once a direction is confirmed:

- [ ] `--bg`, `--ink`, `--sub`, `--line`, `--accent`, RAG dots → Angular theme CSS custom properties
- [ ] Nav / Hero / Feature-grid / Metrics-panel / Tier-card / Footer → standalone Angular components
- [ ] `spartan/ui` in place of Shadcn UI for the card/table/tabs primitives (same Tailwind classes)
- [ ] Angular Animations API (or Motion One) for scroll-reveal, replacing Framer Motion
- [ ] Count-up → a small `CountUpDirective` (the vanilla JS here ports directly)
- [ ] Geist / Geist Mono self-hosted (OFL license) for offline/air-gapped KYB deployments, with
      `system-ui, Arial, Helvetica` fallback already in the CSS

---

## Decision needed

This is not a new three-way pick. It's one question: **does this foundation — Vetra's real
section structure, our monochrome/human-in-the-loop brand logic, framework-free — read as the
right base to build the actual product and marketing site on?**

- **Yes, keep going on Verified Line** → Phase 2 starts: Angular componentization per the checklist
  above.
- **Yes to the structure, but swap the mark** → say Aperture Mark or Ledger Seal; the token table
  above means that's a palette/type swap on the same file, not a new build.
- **No** → say specifically what's still wrong (a section, a proportion, a density) — at this
  point we have a real page to point at, not a paragraph.

Committed to GitHub alongside this document:
`docs/brand/mockups/foundation-v5-verified-line.html` / `.png`.
