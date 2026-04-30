# Governance Automation

This module contains the source artifacts for the Zynx nightly repository governance process.

## Purpose

The nightly governance process reviews repository visibility, manifest coverage, duplicate families, evidence quality, and proposed governance updates without applying destructive changes automatically.

## Files

- `ops/governance/governance-runbook.yaml`: schedule, policy, allowed values, run states, and workflow steps.
- `docs/governance/nightly-validation-checklist.md`: final validation checklist before publishing a report.
- `docs/governance/nightly-report-template.md`: required report format.
- `workflows/nightly-governance-validation.json`: Agentic workflow blueprint for the Planner UI and future executor.
- `reports/governance/`: generated daily reports.

## Safety Rules

- Never delete repositories automatically.
- Treat generated patches as proposed until verified.
- Mark missing evidence as unverifiable instead of guessing.
- Require human approval before duplicate merges, archive-sensitive decisions, or deletion-sensitive decisions.

## Local Validation

Run:

```bash
npm run governance:validate
```

This checks that the governance artifacts exist, report sections are in the required order, checklist gates are present, and runbook enums are populated.

## Generate A Report

Run:

```bash
npm run governance:run
```

The first executor is intentionally non-destructive. It reads the workflow, runbook, checklist, and report template, then writes a dated report under `reports/governance/`. If the master governance index files are missing, the report is generated with `PartialCompletion` and explicit blockers.

## Next Runtime Step

The next implementation step is remote repository discovery plus duplicate-family analysis. That should remain proposed-only until human approval gates are implemented.
