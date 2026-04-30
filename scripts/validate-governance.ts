import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "ops/governance/governance-runbook.yaml",
  "docs/governance/nightly-validation-checklist.md",
  "docs/governance/nightly-report-template.md",
  "docs/governance/README.md",
  "scripts/run-governance.ts",
  "workflows/nightly-governance-validation.json"
];

const requiredReportSections = [
  "# DAILY GOVERNANCE REPORT",
  "# EVIDENCE",
  "# PROPOSED CHANGES",
  "# RISKS OR UNCERTAINTIES",
  "# NEXT SAFE ACTIONS"
];

const requiredChecklistSections = [
  "## A) Run Integrity",
  "## B) Input Availability",
  "## C) Evidence Quality",
  "## D) Classification Correctness",
  "## E) Duplicate Safety",
  "## F) Compliance Gaps",
  "## G) Proposed Changes Completeness",
  "## H) Report Format Compliance",
  "## I) Final Gate"
];

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function fail(message: string) {
  console.error(`Governance validation failed: ${message}`);
  process.exitCode = 1;
}

for (const file of requiredFiles) {
  if (!existsSync(path.join(root, file))) {
    fail(`missing required file: ${file}`);
  }
}

if (process.exitCode) {
  process.exit();
}

const runbook = read("ops/governance/governance-runbook.yaml");
for (const key of ["status", "type", "group", "next_action"]) {
  const populatedEnum = new RegExp(`\\n\\s{2}${key}:\\n\\s{4}- `);
  if (!populatedEnum.test(runbook)) {
    fail(`allowed_values.${key} must contain at least one enum value`);
  }
}

const reportTemplate = read("docs/governance/nightly-report-template.md");
let previousIndex = -1;
for (const section of requiredReportSections) {
  const index = reportTemplate.indexOf(section);
  if (index === -1) {
    fail(`report template missing section: ${section}`);
  }
  if (index < previousIndex) {
    fail(`report template section order is incorrect at: ${section}`);
  }
  previousIndex = index;
}

const checklist = read("docs/governance/nightly-validation-checklist.md");
for (const section of requiredChecklistSections) {
  if (!checklist.includes(section)) {
    fail(`checklist missing section: ${section}`);
  }
}

const workflow = JSON.parse(read("workflows/nightly-governance-validation.json")) as {
  workflow?: { id?: string; agents?: unknown[] };
};

if (workflow.workflow?.id !== "nightly-governance-validation") {
  fail("workflow id must be nightly-governance-validation");
}

if (!Array.isArray(workflow.workflow?.agents) || workflow.workflow.agents.length < 5) {
  fail("workflow must define at least five agent steps");
}

if (!process.exitCode) {
  console.log("Governance artifacts validated.");
}
