// INO-301 gate: audits the review gates (INO-186 / INO-278 "Gate 1..4") that are carried as
// Paperclip `executionPolicy` stages on issues. Two things can go wrong with a gate, and only
// one of them is visible to the naive check:
//
//   1. A participant does not resolve to a real agent -> the stage can never be approved.
//   2. The participants all resolve, the policy looks correct, and the gate is still INERT
//      because the platform completes the policy on the first approval instead of advancing
//      to stage 1. A stage-1 (CTO) gate then never arms and nobody notices. This is outcome
//      (b) in INO-301, and it is the reason this script exists rather than an eyeball check.
//
// Run:  PAPERCLIP_API_URL=... PAPERCLIP_API_KEY=... PAPERCLIP_COMPANY_ID=... \
//         node scripts/verify-gate-participants.mjs [INO-301 INO-278 ...]
// With no arguments it audits every issue in the company that carries an executionPolicy.
//
// IMPORTANT (measured 2026-09-24, INO-301): the company issue-list endpoint
// `/api/companies/{id}/issues` returns `executionPolicy: null` and `executionState: null` for
// EVERY issue, including issues that demonstrably carry a policy. An audit built on the list
// endpoint reports zero gate coverage fleet-wide and passes vacuously. Policy fields are only
// hydrated by the single-issue `GET /api/issues/{id}`, so this script fans out per issue.

const base = (process.env.PAPERCLIP_API_URL ?? '').replace(/\/$/, '').replace(/\/api$/, '');
const key = process.env.PAPERCLIP_API_KEY;
const companyId = process.env.PAPERCLIP_COMPANY_ID;
if (!base || !key) {
  console.error('FAIL: PAPERCLIP_API_URL and PAPERCLIP_API_KEY must be set.');
  process.exit(2);
}

const api = async path => {
  const res = await fetch(`${base}/api${path}`, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`GET ${path} -> HTTP ${res.status}`);
  return res.json();
};

const agentLabel = (agents, id) => agents.get(id)?.name ?? agents.get(id)?.nameKey ?? id;

// A stage participant is "resolved" when it names an agent (or user) the company still has.
function unresolvedParticipants(stage, agents) {
  return (stage.participants ?? []).filter(p => {
    if (p.type === 'agent') return !p.agentId || !agents.has(p.agentId);
    if (p.type === 'user') return !p.userId;
    return true;
  });
}

// Outcome (b) from INO-301: a multi-stage policy that reported complete having only ever
// completed stage 0. The later stages never armed, so their participants were never asked.
function isInertMultiStage(policy, state) {
  const stages = policy.stages ?? [];
  if (stages.length < 2) return false;
  if (state?.status !== 'completed') return false;
  const completed = state.completedStageIds ?? [];
  return completed.length < stages.length;
}

// `--self-test` exercises the inert-gate detector against synthetic executionState shapes.
// The condition it detects has never been observed on this board, so without this the branch
// would ship unexecuted. Runs offline; no API credentials needed.
if (process.argv.includes('--self-test')) {
  const { strict: assert } = await import('node:assert');
  const twoStage = { stages: [{ id: 's0', type: 'review' }, { id: 's1', type: 'review' }] };
  const oneStage = { stages: [{ id: 's0', type: 'approval' }] };

  // Outcome (b): completed after approving stage 0 only -> stage 1 never armed.
  assert.equal(isInertMultiStage(twoStage, {
    status: 'completed', completedStageIds: ['s0'], lastDecisionOutcome: 'approved',
  }), true, 'must flag a 2-stage policy that completed with only stage 0 done');

  // Outcome (a): both stages completed -> the gate worked.
  assert.equal(isInertMultiStage(twoStage, {
    status: 'completed', completedStageIds: ['s0', 's1'], lastDecisionOutcome: 'approved',
  }), false, 'must not flag a 2-stage policy that completed both stages');

  // Still in flight at stage 0 -> not yet evidence of anything.
  assert.equal(isInertMultiStage(twoStage, {
    status: 'pending', completedStageIds: [], currentStageIndex: 0,
  }), false, 'must not flag a policy that is still pending');

  // A single-stage gate completing after one approval is correct behaviour, not inertness.
  assert.equal(isInertMultiStage(oneStage, {
    status: 'completed', completedStageIds: ['s0'], lastDecisionOutcome: 'approved',
  }), false, 'must not flag a correctly-completed single-stage policy');

  console.log('PASS: inert-gate detector self-test (4 cases).');
  process.exit(0);
}

const issueIds = new Map(); // identifier -> uuid
const wanted = process.argv.slice(2).map(s => s.toUpperCase());

const [agentList, issueList] = await Promise.all([
  api(`/companies/${companyId}/agents`).catch(() => []),
  api(`/companies/${companyId}/issues`),
]);
const agents = new Map((Array.isArray(agentList) ? agentList : []).map(a => [a.id, a]));
for (const i of issueList) issueIds.set(i.identifier, i.id);

const targets = wanted.length
  ? wanted.map(id => {
      if (!issueIds.has(id)) {
        console.error(`FAIL: ${id} is not an issue in this company.`);
        process.exit(2);
      }
      return { identifier: id, id: issueIds.get(id) };
    })
  : issueList.map(i => ({ identifier: i.identifier, id: i.id }));

// Per-issue fetch is mandatory -- see the list-endpoint note at the top of this file.
const audited = [];
for (const t of targets) {
  const issue = await api(`/issues/${t.id}`);
  if (!issue.executionPolicy) continue;
  audited.push(issue);
}

const failures = [];
const warnings = [];

for (const issue of audited) {
  const { executionPolicy: policy, executionState: state } = issue;
  const stages = policy.stages ?? [];

  stages.forEach((stage, index) => {
    const bad = unresolvedParticipants(stage, agents);
    for (const p of bad) {
      failures.push(
        `${issue.identifier} stage ${index} (${stage.type}): participant ${JSON.stringify(p)} does not resolve to a live agent -- this stage can never be approved.`
      );
    }
  });

  if (isInertMultiStage(policy, state)) {
    failures.push(
      `${issue.identifier}: INERT MULTI-STAGE GATE -- policy has ${stages.length} stages but reported ` +
        `status=completed with only ${(state.completedStageIds ?? []).length} stage(s) completed ` +
        `(lastDecisionOutcome=${state.lastDecisionOutcome}). Stages after the first never armed, so ` +
        `their participants (${stages.slice((state.completedStageIds ?? []).length).map(s => (s.participants ?? []).map(p => agentLabel(agents, p.agentId)).join('/')).join(', ')}) ` +
        `were never asked to review. This is INO-301 outcome (b): keep the child-issue fallback.`
    );
  }

  if (stages.length > 1 && state?.status === 'pending') {
    const idx = state.currentStageIndex ?? 0;
    warnings.push(
      `${issue.identifier}: multi-stage gate in flight at stage ${idx}/${stages.length - 1}, ` +
        `awaiting ${(state.currentParticipant?.agentId && agentLabel(agents, state.currentParticipant.agentId)) ?? 'unknown'}. ` +
        `Advance is not yet observed on this issue.`
    );
  }
}

for (const w of warnings) console.log(`WARN: ${w}`);
for (const f of failures) console.error(`FAIL: ${f}`);

const multi = audited.filter(i => (i.executionPolicy.stages ?? []).length > 1);
if (failures.length) {
  console.error(`\nFAIL: ${failures.length} gate problem(s) across ${audited.length} policied issue(s).`);
  process.exit(1);
}
console.log(
  `PASS: ${audited.length} issue(s) carry an executionPolicy; every stage participant resolves to a live agent. ` +
    `${multi.length} multi-stage; none show the inert-gate signature.`
);
