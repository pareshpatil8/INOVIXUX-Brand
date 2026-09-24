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
| 3. QA approval advances or completes | **Not yet observed.** Awaiting a real QALead approval on INO-301, which only QALead can author (INO-295). | — |

Step 3 decides the disposition:

- **(a) advances** — `currentStageIndex` moves to 1, `currentParticipant` becomes CTO, the issue
  stays `in_review`. Gate 4 works as designed; drop the child-issue fallback.
- **(b) completes** — the policy reports `status: completed` on the first approval and the issue
  closes or returns to `returnAssignee`. Gate 4 is **inert in a way a participants-only check still
  passes**, because both participants resolve fine. Keep the fallback permanently and file the
  platform defect. `scripts/verify-gate-participants.mjs` detects this signature
  (`stages.length > 1 && status === 'completed' && completedStageIds.length < stages.length`)
  and fails; the branch is covered by `--self-test` because the condition has never been seen live.

**Until step 3 reports (a), Gate 4 runs with the child-issue fallback** — the engineer files a CTO
review issue alongside the QA one, as on PR #38 (INO-267/268/276) and PR #48 (INO-277/280). Do not
report Gate 4 coverage from the mere presence of a two-stage policy before then.

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
