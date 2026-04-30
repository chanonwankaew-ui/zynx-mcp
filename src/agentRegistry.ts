export type AgentMeta = {
  id: string;
  name: string;
  status: "published" | "deployed" | "deprecated";
  tenantScope: "global" | "scoped" | "private";
  allowedTenants?: string[];
  allowedRoles: string[];
  role: string;
  category: string;
  mcpTool: "invoke_agent";
  backendRoute: string;
};

function agent(
  id: string,
  name: string,
  role: string,
  category: string,
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
    mcpTool: "invoke_agent",
    backendRoute: `/agents/${id}/invoke`
  };
}

export const AGENT_REGISTRY: AgentMeta[] = [
  agent("orchestrator", "Zynx Orchestrator", "Master coordinator", "core"),
  agent("task-planner", "Task Planner", "Job decomposer", "core"),
  agent("router", "LLM Router", "Model selector", "core"),
  agent("memory", "Memory Manager", "Context store", "core"),
  agent("scheduler", "Job Scheduler", "Cron & queue manager", "core"),
  agent("auth", "Auth Guard", "JWT / RBAC enforcement", "core"),
  agent("deeja", "Deeja", "Thai UI agent", "ui"),
  agent("dashboard-ui", "Dashboard Agent", "Renders master dashboard", "ui"),
  agent("form-builder", "Form Builder", "Dynamic form generator", "ui"),
  agent("chat-ui", "Chat Interface", "Conversational UI layer", "ui"),
  agent("data-ingest", "Data Ingestion", "ETL pipeline", "data"),
  agent("validator", "Schema Validator", "Zod / JSON Schema check", "data"),
  agent("transformer", "Data Transformer", "Shape & map payloads", "data"),
  agent("vector-store", "Vector Store", "Embedding & retrieval", "data"),
  agent("db-agent", "DB Agent", "PostgreSQL / multi-tenant", "data"),
  agent("cache", "Cache Agent", "Redis layer", "data"),
  agent("code-gen", "Code Generator", "TypeScript / Python", "worker"),
  agent("doc-writer", "Doc Writer", "OpenAPI / Markdown", "worker"),
  agent("reviewer", "Code Reviewer", "Quality & lint check", "worker"),
  agent("test-gen", "Test Generator", "Unit & integration tests", "worker"),
  agent("refactor", "Refactor Agent", "Code improvement", "worker"),
  agent("api-builder", "API Builder", "REST / GraphQL scaffolder", "worker"),
  agent("prompt-eng", "Prompt Engineer", "Prompt optimization", "worker"),
  agent("rag-agent", "RAG Agent", "Retrieval-augmented gen", "worker"),
  agent("sales-bot", "Sales Bot", "CRM & lead scoring", "biz"),
  agent("hr-agent", "HR Agent", "Recruitment & onboarding", "biz"),
  agent("finance-agent", "Finance Agent", "Invoicing & reporting", "biz"),
  agent("ops-agent", "Ops Agent", "Infra & deployment ops", "biz"),
  agent("marketing", "Marketing Agent", "Campaign automation", "biz"),
  agent("support-bot", "Support Bot", "Customer helpdesk", "biz"),
  agent("touchscreen", "Touchscreen Operator", "Kiosk / POS interface", "biz"),
  agent("notifier", "Notifier", "Slack / email / LINE", "output"),
  agent("logger", "Logger", "Audit trail", "output"),
  agent("report-gen", "Report Generator", "PDF / Excel output", "output"),
  agent("webhook", "Webhook Dispatcher", "External event push", "output")
];

export function findAgent(agentId: string) {
  return AGENT_REGISTRY.find(agent => agent.id === agentId);
}
