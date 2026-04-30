export type InvokeAgentInput = {
  agentId: string;
  input: Record<string, unknown>;
  sessionId?: string;
  streaming?: boolean;
  options?: {
    timeoutMs?: number;
    maxTokens?: number;
  };
};

export type GetAgentHealthInput = {
  agentId: string;
};

export type ListAgentsResult = {
  agents: Array<{
    id: string;
    name: string;
    status?: string;
    tenantScope?: string;
    allowedRoles?: string[];
  }>;
};

const baseUrl = () => {
  const value = process.env.ZYNX_API_BASE_URL;
  if (!value) throw new Error("Missing ZYNX_API_BASE_URL");
  return value.replace(/\/$/, "");
};

const serviceHeaders = () => {
  const headers: Record<string, string> = {
    "content-type": "application/json"
  };

  if (process.env.ZYNX_SERVICE_TOKEN) {
    headers.authorization = `Bearer ${process.env.ZYNX_SERVICE_TOKEN}`;
  }

  if (process.env.ZYNX_DEFAULT_TENANT_ID) {
    headers["x-zynx-tenant-id"] = process.env.ZYNX_DEFAULT_TENANT_ID;
  }

  if (process.env.ZYNX_DEFAULT_USER_ID) {
    headers["x-zynx-user-id"] = process.env.ZYNX_DEFAULT_USER_ID;
  }

  return headers;
};

async function parseJsonResponse(res: Response) {
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  if (!res.ok) {
    const message = typeof body === "object" && body && "error" in body
      ? String((body as { error?: unknown }).error)
      : `HTTP ${res.status}`;
    throw new Error(message);
  }

  return body;
}

export async function invokeAgent(input: InvokeAgentInput) {
  const { agentId, ...payload } = input;
  const res = await fetch(`${baseUrl()}/agents/${encodeURIComponent(agentId)}/invoke`, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify(payload)
  });
  return parseJsonResponse(res);
}

export async function getAgentHealth(input: GetAgentHealthInput) {
  const res = await fetch(`${baseUrl()}/agents/${encodeURIComponent(input.agentId)}/health`, {
    method: "GET",
    headers: serviceHeaders()
  });
  return parseJsonResponse(res);
}

export async function listAgents(): Promise<unknown> {
  const res = await fetch(`${baseUrl()}/agents`, {
    method: "GET",
    headers: serviceHeaders()
  });
  return parseJsonResponse(res);
}
