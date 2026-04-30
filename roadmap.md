# Governance Roadmap

## Phase 1: Baseline Index (Completed 2026-04-30)

- Establish master index location in `zynx-mcp`.
- Create required governance master files.
- Build first complete local repo manifest with evidence references.

## Phase 2: Compliance Lift (Next)

- Add README status blocks to canonical repositories first.
- Validate every manifest row against allowed status/type/group values.
- Flag missing canonical mappings and unresolved clone duplication.

## Phase 3: Automation Hardening

- Extend governance run script to read `repo-manifest.csv` and compute deltas.
- Add rename detection heuristics and explicit unverifiable tracking.
- Emit machine-readable patch proposals for review workflow.

## Phase 4: Remote Evidence Expansion

- Add remote-host verification (PR numbers, default branches, archived flags) when credentials/session tools are available.
- Keep local-only and remote-verified evidence separate in reports.
