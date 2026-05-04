# Zynx MCP — Connection Guide

**MCP Server URL (Cloud Run / Singapore):**
```
https://zynx-agent-platform-lt4fvc2txa-as.a.run.app/sse
```

Available endpoints:
| Path | Transport | Use with |
|------|-----------|----------|
| `/sse` | SSE | Claude Desktop, Cursor, Windsurf, Cline, most MCP clients |
| `/mcp` | Streamable HTTP | Claude.ai Web, Zed |
| `/health` | REST | Health check |
| `/` | Web | Dashboard UI |

---

## Claude Desktop

**Config file:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "zynx-platform": {
      "url": "https://zynx-agent-platform-lt4fvc2txa-as.a.run.app/sse"
    }
  }
}
```

---

## Cursor

**Config file:** `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "zynx-platform": {
      "url": "https://zynx-agent-platform-lt4fvc2txa-as.a.run.app/sse"
    }
  }
}
```

---

## Windsurf

**Settings → MCP Servers → Add** → paste URL:
```
https://zynx-agent-platform-lt4fvc2txa-as.a.run.app/sse
```

---

## VS Code (Copilot / GitHub Copilot Chat)

**`.vscode/mcp.json`** in your workspace:

```json
{
  "servers": {
    "zynx-platform": {
      "type": "sse",
      "url": "https://zynx-agent-platform-lt4fvc2txa-as.a.run.app/sse"
    }
  }
}
```

---

## Zed Editor

In `~/.config/zed/settings.json`:

```json
{
  "context_servers": {
    "zynx-platform": {
      "transport": {
        "type": "http",
        "url": "https://zynx-agent-platform-lt4fvc2txa-as.a.run.app/mcp"
      }
    }
  }
}
```

---

## OpenAI GPTs / Custom GPT

Use the `/mcp` endpoint as the **Action Server URL**:
```
https://zynx-agent-platform-lt4fvc2txa-as.a.run.app/mcp
```

---

## Available Tools after connecting

| Tool | Description |
|------|-------------|
| `invoke_agent` | สั่งรัน Agent (deeja, task-planner, orchestrator, validator, reviewer) |
| `get_agent_health` | ดูสถานะ uptime / latency / memory ของ Agent |
| `list_agents` | ดูรายการ Agent ทั้งหมดใน Registry |
