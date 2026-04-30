# Decision Log

## Decision: Use zynx-mcp as master governance index

Date: 2026-04-30
Status: CONFIRMED
Repository / Family: zynx-mcp
Evidence:

- `/Users/kant/zynx-mcp/docs/governance/README.md` defines governance artifacts and nightly process.
- `/Users/kant/zynx-mcp/ops/governance/governance-runbook.yaml` requires governance index files.

Decision: Treat `zynx-mcp` as the local master repository index and store all master governance files in its root.

Reason: Governance runbook, templates, and reports already live in this repository.

Next step: Keep `repo-manifest.csv`, `duplicate-analysis.md`, `decision-log.md`, and `daily-governance-log.md` updated daily.

## Decision: Record 2026-04-30 baseline from local git evidence

Date: 2026-04-30
Status: CONFIRMED
Repository / Family: Zynx ecosystem local discovery
Evidence:

- `/tmp/zynx_repo_inventory_2026-04-30.psv` contains branch, commit, remote, and README status-block checks.
- `repo-manifest.csv` now includes 40 unique repositories derived from that evidence.

Decision: Accept this manifest as baseline classification for local governance tracking.

Reason: No prior `repo-manifest.csv` existed; baseline is required for change detection in future runs.

Next step: On next run, diff against this manifest to detect true new/missing repositories.

## Decision: Keep duplicate-family actions as recommendations only

Date: 2026-04-30
Status: CONFIRMED
Repository / Family: duplicate families
Evidence:

- `duplicate-analysis.md` documents 8 families and their evidence.
- Variant repositories include matching-commit and divergent-commit cases.

Decision: Keep outcomes as proposed (`MARK_AS_MERGED`, `REVIEW_MANUALLY`) without destructive actions.

Reason: Non-negotiable safety policy forbids automatic deletion/merge without human instruction.

Next step: Review each family manually before archive/merge actions.
