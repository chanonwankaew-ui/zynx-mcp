import dotenv from "dotenv";

dotenv.config();

function numberFromEnv(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const mcpHttpPort = numberFromEnv("MCP_PORT", numberFromEnv("PORT", 3000));
export const agentBackendPort = numberFromEnv("ZYNX_BACKEND_PORT", numberFromEnv("PORT", 8787));
export const mcpPath = process.env.MCP_PATH || "/mcp";
export const mcpHost = process.env.MCP_HOST || "0.0.0.0";
export const mcpAllowedHosts = process.env.MCP_ALLOWED_HOSTS
  ? process.env.MCP_ALLOWED_HOSTS.split(",").map((host) => host.trim()).filter(Boolean)
  : (process.env.NODE_ENV === "production" ? undefined : ["localhost", "127.0.0.1"]);

function booleanFromEnv(name: string, fallback = false) {
  const value = process.env[name];
  if (!value) return fallback;

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export const llmProvider = (process.env.ZYNX_LLM_PROVIDER || "local").toLowerCase();
export const llmRequireProvider = booleanFromEnv("ZYNX_LLM_REQUIRE_PROVIDER");
export const llmTimeoutMs = numberFromEnv("ZYNX_LLM_TIMEOUT_MS", 30000);
export const openaiBaseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
export const openaiModel = process.env.OPENAI_MODEL || "";

export const sslKeyPath = process.env.SSL_KEY_PATH;
export const sslCertPath = process.env.SSL_CERT_PATH;
