import {
  llmProvider,
  llmRequireProvider,
  llmTimeoutMs,
  openaiBaseUrl,
  openaiModel
} from "./config.js";

type ProviderStatus = "disabled" | "completed" | "fallback" | "error";

export type ProviderTextRequest = {
  instructions: string;
  input: string;
  fallbackText: string;
  maxOutputTokens?: number;
  metadata?: Record<string, string>;
  runtime?: ProviderRuntimeConfig;
};

export type ProviderTextResult = {
  text: string;
  provider: "local" | "openai";
  status: ProviderStatus;
  modelUsed: string;
  tokensUsed: number;
  usedRemoteProvider: boolean;
  error?: string;
};

export type ProviderRuntimeConfig = {
  provider?: string;
  requireProvider?: boolean;
  timeoutMs?: number;
  openaiBaseUrl?: string;
  openaiModel?: string;
  openaiApiKey?: string;
  traceId?: string;
};

type ResponseContentPart = {
  type?: unknown;
  text?: unknown;
};

type ResponseOutputItem = {
  content?: unknown;
};

type OpenAIResponseBody = {
  output_text?: unknown;
  output?: unknown;
  usage?: {
    total_tokens?: unknown;
  };
  model?: unknown;
  error?: {
    message?: unknown;
  };
};

function providerDisabledResult(fallbackText: string, error?: string): ProviderTextResult {
  return {
    text: fallbackText,
    provider: "local",
    status: error ? "fallback" : "disabled",
    modelUsed: "local-deterministic-handler",
    tokensUsed: 0,
    usedRemoteProvider: false,
    error
  };
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [redacted]");
}

function sanitizeMetadata(metadata: Record<string, string> | undefined) {
  if (!metadata) return undefined;

  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      key.slice(0, 64),
      value.slice(0, 512)
    ])
  );
}

function extractOutputText(body: OpenAIResponseBody): string {
  if (typeof body.output_text === "string" && body.output_text.trim()) {
    return body.output_text.trim();
  }

  if (!Array.isArray(body.output)) return "";

  const chunks: string[] = [];
  for (const item of body.output as ResponseOutputItem[]) {
    if (!Array.isArray(item.content)) continue;

    for (const part of item.content as ResponseContentPart[]) {
      if (part.type === "output_text" && typeof part.text === "string") {
        chunks.push(part.text);
      }
    }
  }

  return chunks.join("\n").trim();
}

function runtimeRequireProvider(runtime: ProviderRuntimeConfig | undefined) {
  return runtime?.requireProvider ?? llmRequireProvider;
}

function runtimeProvider(runtime: ProviderRuntimeConfig | undefined) {
  return (runtime?.provider || llmProvider || "local").toLowerCase();
}

function runtimeOpenAIBaseUrl(runtime: ProviderRuntimeConfig | undefined) {
  return (runtime?.openaiBaseUrl || openaiBaseUrl).replace(/\/$/, "");
}

function runtimeOpenAIModel(runtime: ProviderRuntimeConfig | undefined) {
  return runtime?.openaiModel || openaiModel;
}

function runtimeOpenAIKey(runtime: ProviderRuntimeConfig | undefined) {
  return runtime?.openaiApiKey || process.env.OPENAI_API_KEY || "";
}

function runtimeTimeoutMs(runtime: ProviderRuntimeConfig | undefined) {
  return runtime?.timeoutMs ?? llmTimeoutMs;
}

async function callAnthropic(request: ProviderTextRequest): Promise<ProviderTextResult> {
  const apiKey = runtimeOpenAIKey(request.runtime) || process.env.ANTHROPIC_API_KEY || "";
  const model = runtimeOpenAIModel(request.runtime) || "claude-3-haiku-20240307";

  if (!apiKey) {
    const message = "Anthropic API key is not configured.";
    if (runtimeRequireProvider(request.runtime)) throw new Error(message);
    return providerDisabledResult(request.fallbackText, message);
  }

  const traceId = request.runtime?.traceId || "no-trace";
  console.log(`[LLM][${traceId}] Calling Anthropic: ${model}`);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    signal: AbortSignal.timeout(runtimeTimeoutMs(request.runtime)),
    body: JSON.stringify({
      model,
      system: request.instructions,
      messages: [{ role: "user", content: request.input }],
      max_tokens: request.maxOutputTokens ?? 1024
    })
  });

  const body = await response.json() as any;
  if (!response.ok) {
    const errorMsg = body.error?.message || `Anthropic error: ${response.status}`;
    console.error(`[LLM][${traceId}] Anthropic failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const result = {
    text: body.content?.[0]?.text || "",
    provider: "openai" as any, // mapping for internal compatibility
    status: "completed" as const,
    modelUsed: body.model || model,
    tokensUsed: (body.usage?.input_tokens || 0) + (body.usage?.output_tokens || 0),
    usedRemoteProvider: true
  };
  console.log(`[LLM][${traceId}] Anthropic success: ${result.tokensUsed} tokens`);
  return result;
}

async function callStandardOpenAI(request: ProviderTextRequest): Promise<ProviderTextResult> {
  const apiKey = runtimeOpenAIKey(request.runtime);
  const model = runtimeOpenAIModel(request.runtime);
  const baseUrl = runtimeOpenAIBaseUrl(request.runtime);

  if (!apiKey || !model) {
    const missing = !apiKey ? "API_KEY" : "MODEL";
    const message = `${runtimeProvider(request.runtime)} provider is missing ${missing}.`;
    if (runtimeRequireProvider(request.runtime)) throw new Error(message);
    return providerDisabledResult(request.fallbackText, message);
  }

  const traceId = request.runtime?.traceId || "no-trace";
  console.log(`[LLM][${traceId}] Calling ${runtimeProvider(request.runtime)}: ${model} at ${baseUrl}`);

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    signal: AbortSignal.timeout(runtimeTimeoutMs(request.runtime)),
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: request.instructions },
        { role: "user", content: request.input }
      ],
      max_tokens: request.maxOutputTokens ?? 1024
    })
  });

  const body = await response.json() as any;
  if (!response.ok) {
    const errorMsg = body.error?.message || `Provider error: ${response.status}`;
    console.error(`[LLM][${traceId}] Provider failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const result = {
    text: body.choices?.[0]?.message?.content || "",
    provider: "openai" as any,
    status: "completed" as const,
    modelUsed: body.model || model,
    tokensUsed: body.usage?.total_tokens || 0,
    usedRemoteProvider: true
  };
  console.log(`[LLM][${traceId}] Provider success: ${result.tokensUsed} tokens`);
  return result;
}

async function callOpenAI(request: ProviderTextRequest): Promise<ProviderTextResult> {
  const apiKey = runtimeOpenAIKey(request.runtime);
  const model = runtimeOpenAIModel(request.runtime);
  if (!apiKey || !model) {
    const missing = !apiKey ? "OPENAI_API_KEY" : "OPENAI_MODEL";
    const message = `OpenAI provider is selected but ${missing} is not configured.`;
    if (runtimeRequireProvider(request.runtime)) throw new Error(message);
    return providerDisabledResult(request.fallbackText, message);
  }

  // Detect if this is the custom /responses gateway or standard OpenAI
  const baseUrl = runtimeOpenAIBaseUrl(request.runtime);
  if (!baseUrl.includes("api.openai.com") && !baseUrl.includes("v1")) {
     // Use the custom gateway format
      const response = await fetch(`${baseUrl}/responses`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`
        },
        signal: AbortSignal.timeout(runtimeTimeoutMs(request.runtime)),
        body: JSON.stringify({
          model,
          instructions: request.instructions,
          input: request.input,
          max_output_tokens: request.maxOutputTokens ?? 512,
          metadata: sanitizeMetadata(request.metadata),
          store: false
        })
      });

      const text = await response.text();
      const body = text ? JSON.parse(text) as OpenAIResponseBody : {};

      if (!response.ok) {
        const message = typeof body.error?.message === "string"
          ? body.error.message
          : `OpenAI provider returned HTTP ${response.status}.`;
        throw new Error(message);
      }

      const outputText = extractOutputText(body);
      if (!outputText) {
        throw new Error("OpenAI provider returned no output text.");
      }

      return {
        text: outputText,
        provider: "openai",
        status: "completed",
        modelUsed: typeof body.model === "string" ? body.model : model,
        tokensUsed: typeof body.usage?.total_tokens === "number" ? body.usage.total_tokens : 0,
        usedRemoteProvider: true
      };
  }

  // Otherwise use standard OpenAI format
  return callStandardOpenAI(request);
}

export async function generateProviderText(request: ProviderTextRequest): Promise<ProviderTextResult> {
  const provider = runtimeProvider(request.runtime);
  
  if (provider === "anthropic") {
    try {
      return await callAnthropic(request);
    } catch (error) {
      const message = safeErrorMessage(error);
      if (runtimeRequireProvider(request.runtime)) throw new Error(message);
      return providerDisabledResult(request.fallbackText, message);
    }
  }

  if (provider !== "openai" && provider !== "gemini") {
    if (runtimeRequireProvider(request.runtime)) {
      throw new Error(`Unsupported required ZYNX_LLM_PROVIDER "${provider}".`);
    }
    return providerDisabledResult(request.fallbackText);
  }

  try {
    return await callOpenAI(request);
  } catch (error) {
    const message = safeErrorMessage(error);
    if (runtimeRequireProvider(request.runtime)) throw new Error(message);
    return providerDisabledResult(request.fallbackText, message);
  }
}

// ─── Provider Status ───────────────────────────────────────────────────────────

export type ProviderConfigStatus = {
  provider: string;
  configured: boolean;
  hasApiKey: boolean;
  hasModel: boolean;
  requireProvider: boolean;
  baseUrl: string;
  readyForLLM: boolean;
};

/**
 * Return current provider configuration state.
 * Never exposes key values — only boolean presence flags.
 */
export function getProviderStatus(): ProviderConfigStatus {
  const provider = (llmProvider || "local").toLowerCase();
  const hasApiKey = Boolean(process.env.OPENAI_API_KEY?.trim());
  const hasModel = Boolean(openaiModel?.trim());
  const configured = provider === "openai";
  const readyForLLM = configured && hasApiKey && hasModel;

  return {
    provider,
    configured,
    hasApiKey,
    hasModel,
    requireProvider: llmRequireProvider,
    baseUrl: openaiBaseUrl,
    readyForLLM,
  };
}
