# PrimeNG baseline snapshots

Pinned copies of PrimeNG's machine-readable documentation index, used as the parity baseline for
`docs/brand/16-design-system-parity-vs-echeque-reference.md`.

## Why this is pinned

PrimeNG's MCP server (`@primeng/mcp`) is a live service against a moving target. Every ✅/❌ in doc 16 is
a claim about a **specific PrimeNG version**. Without a pinned snapshot, a future revision cannot tell
the difference between "we regressed" and "PrimeNG added components."

The snapshot also lets the design-system adherence lint (register item H-5) run in CI without network
access or Node 22.

## Files

| File | Source | Fetched | Bytes | MD5 |
|---|---|---|---|---|
| `llms-22.1.1.txt` | `https://primeng.dev/llms/llms.txt` | 2026-09-14 | 16,984 | `aeae681d0cb70afbd138eff6a047f3fe` |

## Contents of the snapshot

132 lines — 18 guide routes plus **103 component/API routes** (101 components and directives, plus
`FilterService` and the `Overlay` API). This is the 101-component baseline used in doc 16 §3.

## Refreshing

```sh
curl -sL https://primeng.dev/llms/llms.txt -o specs/primeng/llms-<version>.txt
```

Add a new file per version rather than overwriting — the diff between snapshots is the input to the next
doc 16 revision.

## Per-component documentation

Appending `.md` to any documentation route returns clean Markdown:

```sh
curl -sL https://primeng.dev/llms/components/button.md
```

Verified across 16 routes on 2026-09-14 — all returned HTTP 200.

## Related AI tooling

| Option | Use for |
|---|---|
| **Plugin** (`pnpm @primeui/cli plugin install --tool claude --library primeng`) | Interactive work. Bundles the MCP server plus 7 skills. Recommended. |
| **MCP server** (`@primeng/mcp`, Node 22+) | Live queries: `list`, `search`, `get_component`, `get_guide`, `get_example`, `get_setup`, `validate_usage`, `version` |
| **These snapshots** | CI, the adherence lint, and reproducible parity claims |

See doc 16 §2 for the full comparison and the adoption decision.
