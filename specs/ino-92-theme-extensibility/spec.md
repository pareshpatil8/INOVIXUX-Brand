# INO-92 — Theme extensibility specification

2026-09-10. Implements the existing Paperclip plan revision 1 and CTO bounded-capacity decision.

## Success conditions

- Preserve dark/light semantic values except verified port drift corrections.
- Add explicit, persistent high-contrast selection to web, style guide, React Native and Flutter; Capacitor shares web tokens/service but must expose selection and restore it before paint.
- Components consume existing semantic roles. High-contrast active text pairs meet 7:1; essential boundaries meet 3:1. This is a token-pair audit, not whole-product WCAG certification.
- Executable checks detect CSS mirror drift, missing/incorrect mobile color roles across all three themes, and shared mobile geometry/motion drift.
- Document the addition recipe, measured results, limits and reproducible QA steps. Logo/font scope stays separate.

## Constraints

Sequential single-agent implementation, no new dependencies/vendors, scoped commits preserving INO-85 changes. Record usage at checkpoints no longer than 30 minutes. Stop on actual provider budget/quota error.

## Workflow availability

The repository has no .specify/memory/constitution.md, spec-kit slash-command templates, or approved-tools.md; the installed skill catalog contains no spec-kit workflow. These spec/plan/tasks artifacts preserve the requested specify → plan → tasks → implement audit sequence using existing tools; no company-wide installation or framework selection is made.
