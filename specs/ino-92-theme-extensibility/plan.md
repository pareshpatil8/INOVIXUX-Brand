# Implementation plan

1. Inspect inherited partial changes against the accepted Paperclip plan; retain canonical CSS theme design.
2. Complete mobile palette and selection routing; preserve explicit dark attributes so OS preference cannot override selection; synchronize web/Capacitor pre-paint restoration.
3. Use a dependency-free Node verifier to resolve CSS variables and compare every mobile color field plus shared scalar tokens. Measure WCAG sRGB pair ratios from source values, with quantized alpha tolerance only for Dart.
4. Run focused theme regression tests, RN typecheck and Angular compilation using installed tooling; obtain QA validation for browser/native surfaces and Flutter SDK checks if unavailable locally.
5. Publish recipe, index/checklist and verification evidence. Commit only issue-scoped paths/hunks and hand off to QA/CTO for board review.
