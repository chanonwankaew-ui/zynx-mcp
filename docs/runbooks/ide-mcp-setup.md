# Zynx MCP IDE Setup

This runbook connects local IDE MCP clients to the canonical Zynx MCP wrapper in `/Users/kant/zynx-mcp`.

## Supported Local Surfaces

| Surface | Entry point | Use case |
|---|---|---|
| Stdio MCP | `/Users/kant/zynx-mcp/dist/stdio.js` | Cursor, Windsurf, VS Code, Claude Code subprocess setup |
| Streamable HTTP MCP | `/Users/kant/zynx-mcp/dist/http.js` | Local MCP HTTP server at `http://localhost:3000/mcp` |
| Agent backend | `/Users/kant/zynx-mcp/dist/backend.js` | Backend router for `/agents/:agentId/invoke` |

## Step 1 - Build

```bash
cd /Users/kant/zynx-mcp
npm run build
```

## Step 2 - Start the Agent Backend

The MCP wrapper forwards tool calls to the backend configured by `ZYNX_API_BASE_URL`.

```bash
cd /Users/kant/zynx-mcp
ZYNX_BACKEND_PORT=8790 npm run dev:backend
```

Use `http://localhost:8790` in IDE env config when running this command. If you use the default backend port, set `ZYNX_API_BASE_URL=http://localhost:8787` instead.

## Step 3 - Configure IDE MCP

For stdio/subprocess MCP, use `dist/stdio.js`. Do not use `dist/http.js` for stdio config; that file starts an HTTP MCP server.

### Cursor / Windsurf

Add a server in MCP settings:

```json
{
  "mcpServers": {
    "zynx-agi": {
      "command": "node",
      "args": ["/Users/kant/zynx-mcp/dist/stdio.js"],
      "env": {
        "ZYNX_API_BASE_URL": "http://localhost:8790",
        "ZYNX_DEFAULT_TENANT_ID": "dev",
        "ZYNX_DEFAULT_USER_ID": "ide-mcp",
        "ZYNX_LLM_PROVIDER": "openai",
        "OPENAI_MODEL": "gpt-4.1-mini",
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

### VS Code

Create `.vscode/mcp.json` in the project where you want VS Code to load the MCP server:

```json
{
  "servers": {
    "zynx-agi": {
      "type": "stdio",
      "command": "node",
      "args": ["/Users/kant/zynx-mcp/dist/stdio.js"],
      "env": {
        "ZYNX_API_BASE_URL": "http://localhost:8790",
        "ZYNX_DEFAULT_TENANT_ID": "dev",
        "ZYNX_DEFAULT_USER_ID": "vscode-mcp",
        "ZYNX_LLM_PROVIDER": "openai",
        "OPENAI_MODEL": "gpt-4.1-mini",
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

### Claude Code

Basic stdio registration:

```bash
claude mcp add zynx-agi node /Users/kant/zynx-mcp/dist/stdio.js
```

Set the same environment values in your shell or Claude Code MCP env settings:

```bash
export ZYNX_API_BASE_URL=http://localhost:8790
export ZYNX_DEFAULT_TENANT_ID=dev
export ZYNX_DEFAULT_USER_ID=claude-code-mcp
export ZYNX_LLM_PROVIDER=openai
export OPENAI_MODEL=gpt-4.1-mini
export OPENAI_API_KEY=sk-...
```

## Optional - Streamable HTTP MCP

If your IDE supports MCP over HTTP directly, start:

```bash
cd /Users/kant/zynx-mcp
MCP_PORT=3000 npm run start:http
```

Then configure the IDE with:

```text
http://localhost:3000/mcp
```

## Available Tools

| MCP tool | Backend route |
|---|---|
| `invoke_agent` | `POST /agents/:agentId/invoke` |
| `get_agent_health` | `GET /agents/:agentId/health` |
| `list_agents` | `GET /agents` |

## Available Prompts

| Prompt | Purpose |
|---|---|
| `/invoke-deeja` | Few-shot template for invoking Deeja |
| `/invoke-task-planner` | Few-shot template for workflow planning |
| `/invoke-validator` | Template for validation requests |
| `/invoke-reviewer` | Template for review requests |
| `/agent-health-check` | Template for checking one or more agents |

Examples:

```text
/invoke-deeja goal="สรุปสถานะ workflow runs วันนี้"
```

```text
/invoke-task-planner goal="build governance report" agents="data-ingest,validator,report-gen"
```

```text
/agent-health-check agents="deeja,task-planner,validator"
```

## Runtime Flow

```text
IDE prompt or tool call
  -> Zynx MCP stdio server
  -> invoke_agent / get_agent_health / list_agents
  -> Zynx agent backend at ZYNX_API_BASE_URL
  -> /agents/:agentId/invoke or health route
  -> IDE chat response
```

## Security

Never commit a real `OPENAI_API_KEY` to this repo. Keep secrets in IDE MCP env settings, shell environment, `.env`, or a local secret manager.
