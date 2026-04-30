export type AgentMeta = {
  id: string;
  name: string;
  status: "published" | "deployed" | "deprecated";
  tenantScope: "global" | "scoped" | "private";
  allowedTenants?: string[];
  allowedRoles: string[];
  role: string;
  category: string;
  color: string;
  estimatedDuration: number;
  mcpTool: "invoke_agent";
  backendRoute: string;
};

const CATEGORY_COLORS: Record<string, string> = {
  core: "#7F77DD",
  ui: "#1D9E75",
  data: "#378ADD",
  worker: "#3B6D11",
  biz: "#D85A30",
  output: "#185FA5"
};

function agent(
  id: string,
  name: string,
  role: string,
  category: string,
  estimatedDuration: number,
  status: AgentMeta["status"] = "published"
): AgentMeta {
  return {
    id,
    name,
    status,
    tenantScope: "global",
    allowedRoles: ["user", "admin"],
    role,
    category,
    color: id === "logger" ? "#5F5E5A" : CATEGORY_COLORS[category] ?? "#888780",
    estimatedDuration,
    mcpTool: "invoke_agent",
    backendRoute: `/agents/${id}/invoke`
  };
}

export const AGENT_REGISTRY: AgentMeta[] = [
  agent("orchestrator", "Zynx Orchestrator", "Master coordinator", "core", 2),
  agent("task-planner", "Task Planner", "Job decomposer", "core", 3),
  agent("router", "LLM Router", "Model selector", "core", 1),
  agent("memory", "Memory Manager", "Context store", "core", 2),
  agent("scheduler", "Job Scheduler", "Cron & queue manager", "core", 2),
  agent("auth", "Auth Guard", "JWT / RBAC enforcement", "core", 1),
  agent("deeja", "Deeja", "Thai UI agent", "ui", 3),
  agent("dashboard-ui", "Dashboard Agent", "Renders master dashboard", "ui", 4),
  agent("form-builder", "Form Builder", "Dynamic form generator", "ui", 3),
  agent("chat-ui", "Chat Interface", "Conversational UI layer", "ui", 2),
  agent("data-ingest", "Data Ingestion", "ETL pipeline", "data", 5),
  agent("validator", "Schema Validator", "Zod / JSON Schema check", "data", 2),
  agent("transformer", "Data Transformer", "Shape & map payloads", "data", 3),
  agent("vector-store", "Vector Store", "Embedding & retrieval", "data", 4),
  agent("db-agent", "DB Agent", "PostgreSQL / multi-tenant", "data", 3),
  agent("cache", "Cache Agent", "Redis layer", "data", 1),
  agent("code-gen", "Code Generator", "TypeScript / Python", "worker", 6),
  agent("doc-writer", "Doc Writer", "OpenAPI / Markdown", "worker", 4),
  agent("reviewer", "Code Reviewer", "Quality & lint check", "worker", 3),
  agent("test-gen", "Test Generator", "Unit & integration tests", "worker", 4),
  agent("refactor", "Refactor Agent", "Code improvement", "worker", 3),
  agent("api-builder", "API Builder", "REST / GraphQL scaffolder", "worker", 5),
  agent("prompt-eng", "Prompt Engineer", "Prompt optimization", "worker", 2),
  agent("rag-agent", "RAG Agent", "Retrieval-augmented gen", "worker", 4),
  agent("sales-bot", "Sales Bot", "CRM & lead scoring", "biz", 4),
  agent("hr-agent", "HR Agent", "Recruitment & onboarding", "biz", 5),
  agent("finance-agent", "Finance Agent", "Invoicing & reporting", "biz", 4),
  agent("ops-agent", "Ops Agent", "Infra & deployment ops", "biz", 3),
  agent("marketing", "Marketing Agent", "Campaign automation", "biz", 5),
  agent("support-bot", "Support Bot", "Customer helpdesk", "biz", 3),
  agent("touchscreen", "Touchscreen Operator", "Kiosk / POS interface", "biz", 2),
  agent("notifier", "Notifier", "Slack / email / LINE", "output", 1),
  agent("logger", "Logger", "Audit trail", "output", 1),
  agent("report-gen", "Report Generator", "PDF / Excel output", "output", 3),
  agent("webhook", "Webhook Dispatcher", "External event push", "output", 1)
];

export function findAgent(agentId: string) {
  return AGENT_REGISTRY.find(agent => agent.id === agentId);
}
