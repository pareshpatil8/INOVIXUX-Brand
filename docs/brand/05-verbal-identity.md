# INO-31 — Verbal Identity Guide (Brand Language)

**Status:** First draft, delivered unprompted alongside the Phase 3 activity plan
(`04-activity-plan-and-visual-samples.md`) — this is workstream D, which has no dependency on
Angular/Figma access, so it didn't need to wait.

**Concept carried:** Verified Line. Voice is written to match what the v5 mockup already sounds
like (`mockups/foundation-v5-verified-line.html`) — this doc makes that voice explicit and
repeatable instead of something only inferable from one file.

---

## 1. The one-sentence brief

**We describe a system that surfaces evidence for a human to act on. We never describe a system
that decides.** Every sentence this brand produces should survive the question: *"does this imply
the software made the call, or that a person did?"* If a sentence implies the software decided,
it's wrong — not just off-brand, factually wrong per the INO-14 hold and the "human still approves
everything" mandate.

## 2. Anchor vocabulary (use these; they're load-bearing, not decoration)

| Word | Use it for | Don't substitute with |
|---|---|---|
| **Resilience** | System/infra reliability, uptime, audit trails | "robust," "bulletproof" |
| **Governance** | Compliance posture, audit-readiness, DPI alignment | "control" (implies automation) |
| **Verification** | The core product action — checking, cross-referencing, tracing | "validation" (implies approval, which is the human's job) |
| **Augmented Control** | The human-in-the-loop relationship between reviewer and system | "automation," "AI-powered decisioning" |
| **Traced / resolved** | What happens to a data point as it moves through the system | "flagged and closed" (too final — implies the system closed it) |

## 3. Banned words and why

Not a generic "avoid hype" list — each of these fails a specific, named test:

| Banned | Fails because |
|---|---|
| Disruptive, revolutionary, game-changing | Explicit brief instruction; also reads as commercial hype during the INO-14 hold |
| AI-powered, intelligent decisioning, autonomous | Implies the system decides — contradicts "human still approves everything" |
| Seamless, effortless (applied to risk review) | Understates the seriousness of a KYB underwriting decision; reviewers should feel supported, not that the task is trivial |
| Launch, live, available now (in any external-facing copy) | INO-14 hold — nothing is commercially validated yet; this is a working-direction demo, not a sales claim |
| Partner, customer, trusted by (unless literally true and named) | The v5 mockup already renamed Vetra's "trusted by brands" bar to "rails this system reconciles against" for exactly this reason — don't regress that discipline in new copy |

## 4. Voice by surface

The same verbal identity flexes by audience without becoming a different brand — same rule as
the visual system's dense/fluid split.

| Surface | Register | Example (real line, already shipped) |
|---|---|---|
| **Dense-mode dashboard microcopy** (B2B/G2B risk tables) | Terse, factual, no adjectives. States what was checked and what state it's in. | *"Beneficial-owner gap — Escalate"* |
| **Fluid-mode / B2C surfaces** | Slightly warmer, still factual, whitespace does the work instead of copy density | *(not yet built — first candidate for the B2C companion page)* |
| **Marketing / hero headline** | Declarative, short, names the mechanism not the benefit | *"One line, traced to a verified state."* |
| **Pitch deck / investor-facing** | Same anchor vocabulary, allowed to state scale/ambition, still zero commercial claims pre-MVP validation | Not yet drafted — flagged in the activity plan (workstream E) |
| **Legal / compliance / audit-facing** | Maximally literal, no metaphor at all (no "line," no "resolves") — a regulator reads this, not a prospect | Not yet drafted |

## 5. The mark's story, told the same way every time

One canonical version of why the logo looks the way it does, so nobody improvises a different
one later:

> "The Verified Line traces every step a piece of vendor data takes through the system. It only
> resolves into a checkmark once a human reviewer closes the case. The mark doesn't celebrate a
> decision — it records that one was made, by a person."

Use this verbatim (or a direct translation) in: about pages, pitch decks, onboarding docs, and
any press or partner-facing material. Don't let each surface reinvent it.

## 6. Taglines — three candidates for you to pick from (not yet chosen)

1. **"One line, traced to a verified state."** *(currently in the v5 hero — already live in the
   mockup, functioning as the de facto pick until you confirm or override it)*
2. **"Evidence, not verdicts."**
3. **"Every flag, closed by a person."**

Recommendation: keep #1 — it's already doing double duty as both tagline and product
description, and it's the line every reviewer of the mockup so far has seen first.

## 7. What's still open

- No B2C-register copy exists yet (only dense-mode/dashboard and marketing-hero copy has been
  written) — first gap to close once a B2C surface is actually scoped.
- No legal/compliance-register copy exists yet — needed before this touches anything a regulator
  or bank compliance officer reads directly.
- Tagline is not formally confirmed — treat §6 item 1 as a placeholder default, not a locked
  decision.
