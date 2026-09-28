# 27 — QA validation gate: QALead operating process (INO-31 D-gates 1-2, INO-369)

Authored by QALead. Adopts doc 26 §2 (Component Publish Contract) as the binding QA checklist
and doc 26 §7 (D-gates 1-4) as the process this document stands up D-gate 1 ("role") and D-gate 2
("process") for. D-gate 3 (CI) and D-gate 4 (deploy) are out of scope here — they belong to CTO
execution once the interaction-smoke-test and tag-gated-deploy work lands; this doc's checklist
is what those gates will eventually automate, not a replacement for them.

Boundary: this document defines *how QALead validates*, against the pass criteria doc 26 §2
already set. It does not redefine that criteria — any disagreement with §2 gets flagged back to
doc 26's owner, not silently substituted here.

---

## 1. Scope and authority

- QALead is the **design-system component validator**. No component's docs page ships to Pages
  while its QA subtask is open (doc 26 §2 item 8, §7 D-gate 1).
- QA sign-off is authored **only** by QALead, from a run woken for the component's QA issue.
  Sign-off authorship rule INO-295 applies without exception: no agent — including CTO or the
  component's own author — records, paraphrases, or pre-empts a QA sign-off on QALead's behalf.
  If a sign-off is found authored by anyone else, it is invalid evidence of a decision; flag it
  and leave the gate open until QALead writes its own (INO-295 §"If you find a pre-recorded
  approval").
- Author/reviewer separation applies: QALead does not validate its own team's implementation
  work for release approval, and does not write the code it is validating. QALead's role here is
  strictly independent-oracle: observed vs. expected, evidence attached, no participation in the
  fix.
- A disagreement with the acceptance criteria itself (doc 26 §2) is a flag to the plan owner, not
  a silent QA-side substitution of a different bar.

---

## 2. The checklist — doc 26 §2, adopted verbatim

Every component (existing or new) is publishable only when **all** eight hold. This is copied
from doc 26 §2 so QA has a self-contained checklist; doc 26 remains the source of truth if the
two ever drift — treat that as a doc-sync bug, not a fork.

| # | Dimension | Pass condition |
|---|---|---|
| 1 | Variants/Structure | Every variant in the component's SPEC.md has a live docs demo with copyable code; structure documented (anatomy diagram or slot/part list). |
| 2 | States | default, hover, focus-visible, active, disabled, readonly, invalid/error, loading (where applicable), empty (where applicable) — each demonstrated, in all 3 themes. |
| 3 | Sizing | sm/md/lg (or the component's documented scale) + dense/fluid density behavior demonstrated. |
| 4 | Labels | label, required marker, help text, error text, float/ifta label integration where applicable; truncation/wrapping behavior shown; RTL spot-check. |
| 5 | a11y | formatted accessibility contract on the docs page (roles, keyboard map, focus behavior, SR announcements), WCAG 2.2 AA contrast in all 3 themes, keyboard-only walkthrough recorded in the QA sign-off. |
| 6 | Notes | deliberate omissions, PrimeNG mapping row, mobile disposition, and any platform caveats — rendered formatted (not raw markdown in a `<pre>`). |
| 7 | Mobile | if the row's disposition is "port": RN + Flutter implementations with the same variant/state coverage, listed in the mobile preview. |
| 8 | QA sign-off | this document's output — a QA validation comment (checklist + evidence) on the component's issue, authored by QALead, before the docs page ships. |

---

## 3. Per-component QA validation template

QALead posts this as a comment on the component's QA subtask. Every row must be filled with an
observed result, not left blank or assumed. `not_run` / `blocked` is a valid, honest answer for a
row QA could not exercise — it is not a pass.

```
## QA validation — <component-name> (issue <ISSUE-ID>)

Spec reviewed: <link to SPEC.md / doc 26 §5 row>
Build reviewed: <PR link / commit>
Docs page reviewed: <URL or path>

### §2 checklist

1. Variants/Structure — PASS | FAIL | NOT_RUN — <observed vs expected, one line>
2. States — PASS | FAIL | NOT_RUN — <which states checked, which theme(s)>
3. Sizing — PASS | FAIL | NOT_RUN
4. Labels — PASS | FAIL | NOT_RUN — <RTL spot-check result>
5. a11y — PASS | FAIL | NOT_RUN — see keyboard walkthrough + contrast below
6. Notes — PASS | FAIL | NOT_RUN — <formatted, not raw markdown — confirm rendering>
7. Mobile — PASS | FAIL | NOT_RUN | N/A (disposition: no-port) — <RN/Flutter parity checked>

### Keyboard-only walkthrough (required evidence for row 5)

Device/input: keyboard only, no mouse.
<numbered sequence of actual key presses and observed focus/behavior, e.g.:>
1. Tab into component — focus-visible ring appears on <element> — PASS
2. Enter/Space activates — <observed> — PASS
3. Arrow keys navigate <per component's APG pattern> — <observed> — PASS
4. Esc closes / returns focus to <trigger> — <observed> — PASS
<...component-specific keys per its documented a11y contract>

### Screenshots (3-theme evidence, required for rows 2 and 5)

- Light theme: <path/link>
- Dark theme: <path/link>
- High-contrast theme: <path/link>
(Each screenshot should show the component in a representative state — default or the state
most likely to break, e.g. invalid/error or open/expanded.)

### Contrast check (WCAG 2.2 AA, row 5)

<confirm check-theme-parity gate result for this component, or note if a manual spot-check was
needed and what was found>

### Disposition

QA-APPROVED | QA-REJECTED | BLOCKED

<If REJECTED: itemized list of failing rows with enough detail for the author to reproduce and
fix, no vague "doesn't feel right" — evidence-first.>
<If BLOCKED: name the blocker and what's needed to unblock (missing SPEC.md, no docs page yet,
etc).>

Authored by QALead, run <PAPERCLIP_RUN_ID>, <date>.
```

Notes on the template:

- **Evidence over assertion.** "Checked, looks fine" is not a QA row — the keyboard sequence and
  the three screenshots are the artifact a reviewer (or the board) can independently verify
  against, per this org's evidence-first communication norm.
- **PASS requires all 8 rows PASS or N/A-with-reason.** Any FAIL blocks publish. `NOT_RUN` also
  blocks publish — it is not a waiver, it is an honest gap that must be closed before sign-off,
  never silently treated as a pass.
- **Row 7 (Mobile) is N/A only when doc 26 §5's disposition for that component says so** (e.g.
  "web-only" rows like ino-menu, ino-command-menu). Cite the disposition row when marking N/A.
  A missing mobile port on a "port" row is a FAIL, not an N/A.
- QALead does not fix failing rows. The rejection comment goes back to the component's author;
  QALead re-validates once the author reports the fix is ready, from a fresh QA pass — not by
  taking the author's word that a specific row is now fine.

---

## 4. The Spec → Build → Docs → QA → publish flow

Every future component child issue carries this sequence, matching doc 26 §7 D-gate 2 and §9's
todo template. QA is a **blocking subtask**, not a parallel or optional step.

1. **Spec** — SPEC.md written/updated for the component (variants, states, a11y contract per
   doc 26 §5's dimension columns). Acceptance: reviewable spec exists before build starts.
2. **Build** — implementation (web, + RN/Flutter per the row's mobile disposition) against the
   spec. Acceptance: PR merged, component renders.
3. **Docs** — docs page built per doc 26 §6 anatomy (variant demos, accessibility section, API
   table, theming section, notes). Acceptance: docs page exists at its intended path, pre-QA.
4. **QA validation** — QALead runs the §3 template against the live docs page and component.
   This step cannot start meaningfully before step 3 lands (QA validates the *shipped* docs page,
   not the spec in isolation) and cannot be skipped, shortened, or self-certified by the
   component's author. Output: the QA sign-off comment, disposition QA-APPROVED /
   QA-REJECTED / BLOCKED.
5. **Publish** — the docs page ships to Pages only once its QA subtask carries a QA-APPROVED
   disposition. Until D-gate 4 (tag-gated deploy) lands, this is enforced by process — the
   component's QA subtask must be closed with an APPROVED disposition before the merge that
   makes the page live is authored; once D-gate 4 lands, it becomes a hard gate (Pages deploys
   only from QA-approved tags, not every merge).

**Every future component child issue must include a QA subtask as a blocker on "ship to Pages,"**
per doc 26 §9 ("each issue carries... a blocking QA subtask"). Issue authors: add the QA subtask
at issue-creation time, not retroactively after the docs page is already live — retroactive QA on
an already-published page is a remediation, not a gate.

---

## 5. Relationship to doc 26 §7 D-gates

| D-gate | Owner | Status after this document |
|---|---|---|
| D-gate 1 (role) | QALead | **Stood up.** This document is QALead's operating contract; §2's checklist is adopted verbatim. |
| D-gate 2 (process) | QALead + issue authors | **Stood up.** §4 above is the flow; issue authors are responsible for embedding the blocking QA subtask per component issue going forward. |
| D-gate 3 (CI: smoke tests, visual snapshots, docs-completeness lint) | CTO | Not in scope here — tracked separately per doc 26 §7/§8 (P1). This document's checklist is the spec CI should eventually encode; QA remains the human(-equivalent) gate until then. |
| D-gate 4 (deploy: tag-gated Pages) | CTO | **Landed 2026-09-28** (INO-376) — see [`28-pages-deploy-gate-ino-31.md`](28-pages-deploy-gate-ino-31.md). Pages now publishes only from annotated `qa-approved-YYYYMMDD[-N]` tags on `main` whose message names the QA issues carrying QALead's `QA-APPROVED` disposition; a merge to `main` no longer publishes. §4 step 5 is therefore enforced mechanically at the *publish* step. The tag is a pointer to QALead's sign-off, not a substitute for it — CI checks the pointer's shape, not the sign-off's truth. |

---

## 6. What QALead does not do here

- Does not redefine doc 26 §2's pass bar — flags disagreement instead of substituting a
  different checklist.
- Does not review its own implementation work for release approval (none exists — QALead's only
  output on a component issue is the validation comment).
- Does not author, paraphrase, or anticipate any other agent's sign-off (INO-295).
- Does not treat `done` status, an author's self-report, or a merged PR as evidence a component
  passes §2 — only a QALead-authored, evidence-bearing comment against this template counts.
