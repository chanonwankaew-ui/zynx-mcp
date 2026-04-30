import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type WorkflowFile = {
  workflow: {
    id: string;
    name: string;
    goal: string;
    artifacts: {
      runbook: string;
      checklist: string;
      report_template: string;
      report_output_dir: string;
    };
    agents: Array<{
      step: number;
      id: string;
      name: string;
      role: string;
      category: string;
    }>;
  };
};

const root = process.cwd();
const workflowPath = "workflows/nightly-governance-validation.json";
const runId = `governance-${formatLocalDate(new Date(), "Asia/Bangkok").replaceAll("-", "")}-${Date.now()}`;

function absolute(relativePath: string) {
  return path.join(root, relativePath);
}

function read(relativePath: string) {
  return readFileSync(absolute(relativePath), "utf8");
}

function formatLocalDate(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatLocalTimestamp(date: Date, timeZone: string) {
  const datePart = formatLocalDate(date, timeZone);
  const timePart = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date);
  return `${datePart} ${timePart} ${timeZone}`;
}

function replaceAll(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (content, [key, value]) => content.replaceAll(`{{${key}}}`, value),
    template
  );
}

function missingFiles(paths: string[]) {
  return paths.filter(file => !existsSync(absolute(file)));
}

function extractIndentedYamlList(yaml: string, sectionName: string, indent: number) {
  const lines = yaml.split("\n");
  const sectionPrefix = `${" ".repeat(indent)}${sectionName}:`;
  const start = lines.findIndex(line => line === sectionPrefix);
  if (start === -1) return [];

  const values: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() && !line.startsWith(" ".repeat(indent + 2))) break;
    const match = line.match(/^\s+-\s+(.+)$/);
    if (match) values.push(match[1].replace(/^"|"$/g, ""));
  }
  return values;
}

const workflow = JSON.parse(read(workflowPath)) as WorkflowFile;
const { artifacts } = workflow.workflow;
const runbook = read(artifacts.runbook);
const template = read(artifacts.report_template);

const requiredGovernanceFiles = extractIndentedYamlList(runbook, "required", 2);
const governanceArtifactFiles = [
  artifacts.runbook,
  artifacts.checklist,
  artifacts.report_template,
  workflowPath
];
const missingGovernanceFiles = missingFiles(requiredGovernanceFiles);
const missingArtifacts = missingFiles(governanceArtifactFiles);
const runState = missingArtifacts.length
  ? "BlockedMissingIndex"
  : missingGovernanceFiles.length
    ? "PartialCompletion"
    : "ReportGenerated";

const reportDate = formatLocalDate(new Date(), "Asia/Bangkok");
const reportPath = path.join(artifacts.report_output_dir, `${reportDate}-daily-governance-report.md`);
const workflowSteps = workflow.workflow.agents
  .sort((a, b) => a.step - b.step)
  .map(agent => `${agent.step}. ${agent.name} (${agent.id}) - ${agent.role}`)
  .join("\n");

const accessScope = [
  "Local filesystem only",
  "No repository deletion",
  "No patch application",
  "Human approval required for duplicate or archive-sensitive decisions"
].join("; ");

const filesRead = governanceArtifactFiles
  .map(file => `- ${file}`)
  .join("\n");

const risks = [
  missingGovernanceFiles.length
    ? `Required governance index files are missing or not yet initialized: ${missingGovernanceFiles.join(", ")}`
    : "Required governance index files are present.",
  "This first executor only generates a report; it does not query remote repository hosting yet.",
  "Duplicate analysis and manifest updates remain proposed-only until human review."
].join("\n- ");

const report = replaceAll(template, {
  run_id: runId,
  timestamp_local: formatLocalTimestamp(new Date(), "Asia/Bangkok"),
  run_state: runState,
  master_index_repo: missingGovernanceFiles.length ? "UNRESOLVED_LOCAL_INDEX" : "LOCAL_ZYNX_MCP",
  access_scope_summary: accessScope,
  reviewed_count: "1",
  unverifiable_count: missingGovernanceFiles.length ? String(missingGovernanceFiles.length) : "0",
  visible_repo_source: "/Users/kant/zynx-mcp",
  manifest_path: missingGovernanceFiles.includes("repo-manifest.csv") ? "MISSING: repo-manifest.csv" : "repo-manifest.csv",
  files_read_list: `\n${filesRead}`,
  repo_name: "zynx-mcp",
  branch_or_na: "N/A",
  sha_or_na: "N/A",
  pr_or_na: "N/A",
  file_paths_or_na: governanceArtifactFiles.join(", "),
  finding: `Generated first-pass governance report from ${workflowPath}. Run state: ${runState}.`,
  verified_or_partial_or_unverifiable: missingGovernanceFiles.length ? "partial" : "verified",
  new_repos: "Not scanned in first executor pass",
  renames: "None verified",
  missing_from_manifest: missingGovernanceFiles.includes("repo-manifest.csv") ? "repo-manifest.csv" : "None",
  missing_from_visibility: "Not scanned in first executor pass",
  proposed_manifest_rows: missingGovernanceFiles.includes("repo-manifest.csv")
    ? "canonical_repo,status,type,group,purpose,next_action,notes\nzynx-mcp,ACTIVE,SERVICE,ZYNX_CORE,Zynx MCP workspace and agentic workflow planner,KEEP,Seed row proposed by governance executor"
    : "No manifest row proposed.",
  proposed_duplicate_analysis_block: "No duplicate family was analyzed in this first executor pass.",
  proposed_decision_log_block: `- ${reportDate}: Generated first-pass nightly governance report. State=${runState}. No destructive action taken.`,
  proposed_daily_log_block: `- ${reportDate}: Ran ${workflow.workflow.name}. Output=${reportPath}.`,
  status: "ACTIVE",
  type: "SERVICE",
  group: "ZYNX_CORE",
  canonical_repo: "zynx-mcp",
  next_action: missingGovernanceFiles.length ? "VERIFY_EVIDENCE" : "KEEP",
  family_id: "N/A",
  canonical_candidate: "N/A",
  variant_list: "N/A",
  duplicate_outcome: "REVIEW_MANUALLY",
  rationale: "Duplicate scan is not implemented in the first executor pass.",
  risk_1: risks.split("\n- ")[0],
  risk_2: risks.split("\n- ")[1],
  risk_3: risks.split("\n- ")[2]
});

const reportWithRuntimeAppendix = `${report}

# RUNTIME APPENDIX
## Workflow
- ID: ${workflow.workflow.id}
- Goal: ${workflow.workflow.goal}

## Agent Plan
${workflowSteps}

## Missing Required Governance Files
${missingGovernanceFiles.length ? missingGovernanceFiles.map(file => `- ${file}`).join("\n") : "- None"}

## Executor Mode
- Non-destructive
- Report generation only
- No remote repository mutation
- No automatic archive/delete action
`;

mkdirSync(absolute(artifacts.report_output_dir), { recursive: true });
writeFileSync(absolute(reportPath), reportWithRuntimeAppendix);

console.log(`Governance report generated: ${reportPath}`);
console.log(`Run state: ${runState}`);
