// Setup type definitions for built‑in Supabase Runtime APIs
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { McpServer } from 'npm:@modelcontextprotocol/sdk@1.25.3/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from 'npm:@modelcontextprotocol/sdk@1.25.3/server/webStandardStreamableHttp.js'
import { Hono } from 'npm:hono@^4.9.7'
import { z } from 'npm:zod@^4.1.13'

// Create Hono app
const app = new Hono()

// Create your MCP server
const server = new McpServer({
  name: 'mcp',
  version: '0.1.0',
})

// Register a simple addition tool
server.registerTool(
  'add',
  {
    title: 'Addition Tool',
    description: 'Add two numbers together',
    inputSchema: { a: z.number(), b: z.number() },
  },
  ({ a, b }) => ({
    content: [{ type: 'text', text: String(a + b) }],
  })
)

// Handle MCP requests
app.all('*', async (c) => {
  const transport = new WebStandardStreamableHTTPServerTransport()
  await server.connect(transport)
  return transport.handleRequest(c.req.raw)
})

Deno.serve(app.fetch)
