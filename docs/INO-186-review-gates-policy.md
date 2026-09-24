# Review gates policy (INO-186 / INO-278)

Status of this file: created 2026-09-24 under INO-301. The `docs/INO-186-review-gates-policy.md`
referenced by INO-301 did not exist in the repository or anywhere in its git history — the run that
was recorded as having touched it (`a241e370`) died on a session limit before committing. This file
records what has actually been **observed** about the gate mechanism, and is deliberately narrow:
it does not restate the Gate 1–4 definitions, which live in INO-186 and INO-278.

## How a gate is carried

A gate is a Paperclip `executionPolicy` on an issue:

```jsonc
{
  "mode": "normal",
  "commentRequired": true,
  "stages": [
    { "type": "review", "approvalsNeeded": 1, "participants": [{ "type": "agent", "agentId": "<QALead>" }] },
    { "type": "review", "approvalsNeeded": 1, "participants": [{ "type": "agent", "agentId": "<CTO>" }] }
  ]
}
```

Attach it with `PATCH /api/issues/{id}`. Audit it with `scripts/verify-gate-participants.mjs`.

## Open risk — Gate 4 advance (INO-301)

Gate 4 (CTO architecture/merge-hygiene review) is adopted as a **second** `review` stage after the
QA stage. Before INO-301, no multi-stage `executionPolicy` had ever been set at INOVIXUX: the nine
Gate-1 issues, the four Gate-3 issues and INO-52 all carried exactly one stage, and Gate 2 was
drafted as a second stage in INO-186 v1 and never applied. The advance was therefore **asserted
from the API shape, not observed.**

INO-301 is running the observation on itself as the test vehicle, rather than on a live component
issue, so that a broken gate cannot strand a delivery. Recorded so far:

| Step | Observation | Date |
| --- | --- | --- |
| 1. Two-stage policy accepted | **Yes.** `PATCH` returned HTTP 200 with both stages persisted and server-assigned stage ids. First multi-stage policy in this board's history. | 2026-09-24 |
| 2. Stage arms on transition | **Yes — confirms Finding 6.** While `status=in_progress`, `executionState` stayed `null` despite the policy being attached. On `PATCH {"status":"in_review"}` it materialised as `currentStageIndex: 0`, `currentStageType: "review"`, `currentParticipant: QALead`, `completedStageIds: []`, `returnAssignee: CTO`. **The policy must be attached before the transition, or the gate does not arm at all.** | 2026-09-24 |
| 3. QA approval advances or completes | **(a) advances — but only when the return assignee is not the stage-1 reviewer.** On INO-301 itself the approval could not be made at all: it fails with HTTP 422. Root-caused below. | 2026-09-24 |

### Step 3: outcome (a), with a precondition

Driving the **shipped server module** (`@paperclipai/server/dist/services/issue-execution-policy.js`,
`applyIssueExecutionPolicyTransition`) with INO-301's live policy verbatim and QA's
`PATCH {"status":"done"}`:

| Return assignee | Result |
| --- | --- |
| **CTO** (INO-301 as it actually is) | `HTTP 422 No eligible review participant is configured for this issue` |
| **an engineer** | **Advances.** `decision.outcome: approved`, `currentStageIndex: 1`, `currentParticipant: CTO`, stage 1 `pending`, issue stays `in_review` |

So the multi-stage mechanism is **not inert** — outcome (b) is ruled out, and Gate 4 does what it
was designed to do. What defeated it on INO-301 is a **return-assignee collision**.

**Root cause** (`issue-execution-policy.js:627-633`). On approving a stage the server picks the next
stage's participant with:

```js
const participant = selectStageParticipant(nextStage, {
  preferred: explicitAssignee,
  exclude: existingState?.returnAssignee ?? null,   // <-- unconditional filter
});
if (!participant) throw unprocessable(`No eligible ${nextStage.type} participant is configured for this issue`);
```

`exclude` is applied *before* `preferred` is consulted. Gate 4's stage 1 has exactly one
participant, the CTO. INO-301 was being implemented by the CTO, so `returnAssignee` was also the
CTO — the filter emptied the candidate list and the approval threw.

Three things make this defect hard to read, and all three cost QALead a heartbeat on INO-301:

- **The error names the wrong stage.** It fires while approving stage 0 and says "this issue", so it
  reads as *QA* being ineligible — even though `executionState.currentParticipant.agentId` is an
  exact match for the caller. It is stage **1** that is misconfigured.
- **Naming the CTO in the PATCH does not help.** `requestedAssigneePatch.assigneeAgentId = CTO`
  still 422s; `exclude` has already removed the CTO before `preferred` is read.
- **It is not `reviewPolicy: null`.** That was the standing hypothesis from the INO-137/INO-133
  `in_review` failures; it is unrelated to this one.

**Precondition for Gate 4: the return assignee must not be the stage-1 reviewer.** `returnAssignee`
is captured from the issue's assignee when stage 0 arms, so in practice: **Gate 4 works on any
component issue implemented by an engineer, and breaks precisely when the CTO is the implementer.**
INO-301 hit it because it made itself the test vehicle, and the CTO owns INO-301.

Do **not** work around it by adding a second participant to stage 1. That makes the approval
succeed, but `selectStageParticipant` then returns the *other* participant — the gate advances to
the wrong reviewer and the CTO review silently never happens. Verified against the same module.

`scripts/verify-gate-participants.mjs` now detects the collision statically, from the policy plus
the return assignee (predicted from the current assignee before the stage arms), so it is caught at
policy-attach time rather than at approval time. Its `--self-test` covers 7 cases for this detector,
and its three predictions are cross-checked against the real server module. The outcome-(b)
inert-gate detector is retained as a regression guard even though (b) did not occur.

**Gate 4 rollout is unblocked for engineer-implemented issues**, which is every in-flight INO-31
component issue. The child-issue fallback is still required for CTO-implemented issues until the
platform defect is fixed upstream — the engineer files a CTO review issue alongside the QA one, as
on PR #38 (INO-267/268/276) and PR #48 (INO-277/280).

## Trap: the issue-list endpoint hides every policy

`GET /api/companies/{id}/issues` returns `executionPolicy: null` **and** `executionState: null` for
every issue, including issues that demonstrably carry a policy. Only the single-issue
`GET /api/issues/{id}` hydrates them. Measured 2026-09-24 on INO-301, same issue, seconds apart:

```
via company issue LIST : {"identifier":"INO-301","executionPolicy":null,"executionState":null}
via single issue GET   : {"identifier":"INO-301","stages":2,"currentStageIndex":0}
```

Any gate-coverage audit built on the list endpoint reports **zero gate coverage fleet-wide and
passes vacuously**. `verify-gate-participants.mjs` fans out per issue for this reason. This is the
mirror image of the INO-301 outcome-(b) risk: one hides a broken gate behind a passing check, the
other hides every working gate behind an empty one.

## Rollout

Attach Gate 4 + Gate 1 at **creation**, not at pickup — pickup-time convention is what produced
Finding 7 over ~40 issues, and step 2 above is the mechanical reason it fails: a policy attached
after the `in_review` transition never arms. Apply to the in-flight G-2 (INO-188) and Overlay/Data
(INO-187) component issues as they are created, honouring the 20-cross-issue-writes-per-heartbeat
cap rather than bulk-writing dormant backlog.
