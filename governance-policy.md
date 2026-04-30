# Governance Policy

Date: 2026-04-30
Master Index Repository: `/Users/kant/zynx-mcp`

## Scope

This index tracks local Zynx ecosystem repositories using evidence from local git metadata and repository files.

## Evidence Rules

1. Never mark work as completed without exact evidence (file path, branch, commit SHA, PR number when available).
2. Treat drafts as drafts and completed actions as completed actions.
3. If evidence is incomplete, mark the item explicitly as unverifiable or review-needed.

## Safety Rules

1. Never delete repositories automatically.
2. Default action is classify, document, recommend, and archive rather than delete.
3. Do not merge code automatically for duplicate families.
4. Preserve portfolio, historical, and learning value.

## Governance Model

### Allowed Status

- ACTIVE
- MAINTAINED
- SHOWCASE
- EXPERIMENT
- DORMANT
- ARCHIVED
- MERGED
- TEMPLATE

### Allowed Type

- product-app
- website
- docs
- infra
- tooling
- agent-system
- prompt-pack
- starter-template
- experiment
- archive-record

### Allowed Group

- zynx-core
- deeja-family
- docs-content
- infra-tools
- agent-systems
- experiments
- starter-templates
- personal-showcase

### Allowed next_action

- MAINTAIN
- REVIEW
- SHOWCASE
- ARCHIVE
- MERGE
- CLASSIFY
- UPDATE_README
- VERIFY_CANONICAL
- NO_CHANGE

## Compliance Checks

For each repository ensure one status, one type, one group, one canonical mapping, and README status block presence.

## Current Limits

- Current run used local filesystem evidence only.
- Remote hosting metadata, PR links, and rename history are not fully verified in this index.
