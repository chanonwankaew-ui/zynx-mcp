# DAILY GOVERNANCE REPORT
- Run ID: {{run_id}}
- Timestamp (local): {{timestamp_local}}
- Run state: {{run_state}}
- Master index repo: {{master_index_repo}}
- Access scope: {{access_scope_summary}}
- Repositories reviewed: {{reviewed_count}}
- Repositories unverifiable: {{unverifiable_count}}

# EVIDENCE
## Verified Inputs
- Visible repository source: {{visible_repo_source}}
- Manifest source: {{manifest_path}}
- Governance files read: {{files_read_list}}

## Evidence Records
- Repo: {{repo_name}}
  - Branch: {{branch_or_na}}
  - Commit SHA: {{sha_or_na}}
  - PR: {{pr_or_na}}
  - File path(s): {{file_paths_or_na}}
  - Finding: {{finding}}
  - Evidence quality: {{verified_or_partial_or_unverifiable}}

## Discovery Deltas
- New repositories: {{new_repos}}
- Possible renames (evidence-backed only): {{renames}}
- Missing from manifest: {{missing_from_manifest}}
- Missing from visibility: {{missing_from_visibility}}

# PROPOSED CHANGES
## repo-manifest.csv (rows)
```csv
{{proposed_manifest_rows}}
```

## duplicate-analysis.md (append block)
```md
{{proposed_duplicate_analysis_block}}
```

## decision-log.md (append block)
```md
{{proposed_decision_log_block}}
```

## daily-governance-log.md (append block)
```md
{{proposed_daily_log_block}}
```

## Classification Updates
- Repo: {{repo_name}} -> status={{status}}, type={{type}}, group={{group}}, canonical_repo={{canonical_repo}}, next_action={{next_action}}

## Duplicate Family Recommendations
- Family: {{family_id}}
  - Canonical candidate: {{canonical_candidate}}
  - Variants: {{variant_list}}
  - Recommended outcome: {{duplicate_outcome}}
  - Rationale: {{rationale}}

# RISKS OR UNCERTAINTIES
- {{risk_1}}
- {{risk_2}}
- {{risk_3}}

# NEXT SAFE ACTIONS
- [ ] Human review for duplicate merge proposals
- [ ] Human review for any archive/delete-sensitive decision
- [ ] Apply approved governance patches
- [ ] Re-run validation after patch application
- [ ] Confirm evidence links (SHA, PR, path) for any item marked completed
