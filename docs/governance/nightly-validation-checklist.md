# Nightly Governance Validation Checklist

## A) Run Integrity
- [ ] Run started at 00:00 local time (or documented scheduler delay).
- [ ] Run state is one of: Running, BlockedMissingIndex, PartialCompletion, ReportGenerated.
- [ ] Master index repository identified, or missing-index branch executed.

## B) Input Availability
- [ ] If index missing: emitted exact initialization file list and skipped normal flow.
- [ ] If index exists: attempted to read required governance files.
- [ ] Missing files are explicitly listed as missing (not silently ignored).

## C) Evidence Quality
- [ ] Every finding includes direct evidence OR is marked unverifiable.
- [ ] No claim of completion exists without proof (repo, branch, SHA, PR, path).
- [ ] Rename claims include concrete linkage evidence; otherwise marked uncertain.

## D) Classification Correctness
- [ ] Every new/unclassified repo has exactly one status.
- [ ] Every new/unclassified repo has exactly one type.
- [ ] Every new/unclassified repo has exactly one group.
- [ ] canonical_repo, purpose, next_action, notes are present.
- [ ] All assigned values are in allowed enums.

## E) Duplicate Safety
- [ ] Each duplicate family has one canonical candidate and variant list.
- [ ] Each family has exactly one allowed recommendation outcome.
- [ ] Uncertain families are marked REVIEW_MANUALLY.
- [ ] No delete action is proposed as automatic execution.

## F) Compliance Gaps
- [ ] Checked status, type, group, and canonical mapping for each reviewed repo.
- [ ] Checked README status block presence for each reviewed repo.
- [ ] Every gap has an exact proposed patch/content block.
- [ ] No patch is reported as applied unless verified by evidence.

## G) Proposed Changes Completeness
- [ ] repo-manifest.csv proposed rows included.
- [ ] duplicate-analysis.md proposed append included.
- [ ] decision-log.md proposed append included.
- [ ] daily-governance-log.md proposed append included.

## H) Report Format Compliance
- [ ] Sections appear in exact order:
      DAILY GOVERNANCE REPORT -> EVIDENCE -> PROPOSED CHANGES -> RISKS OR UNCERTAINTIES -> NEXT SAFE ACTIONS
- [ ] Access limitations are declared.
- [ ] Unverifiable repositories are explicitly listed.
- [ ] Human approval gates are explicitly called out where required.

## I) Final Gate
- [ ] If any checklist item fails: set run state to PartialCompletion or BlockedMissingIndex and publish with clear blockers.
- [ ] If all pass: set run state to ReportGenerated and publish.
