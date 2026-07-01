import assert from "node:assert/strict";
import test from "node:test";
import { integrationStatus, loadEnvironment } from "./env.js";

test("loads safe development defaults", () => {
  const env = loadEnvironment({});
  assert.equal(env.NODE_ENV, "development");
  assert.equal(env.PORT, 3001);
  assert.equal(env.MCP_PATH, "/mcp");
});

test("rejects an MCP path without a leading slash", () => {
  assert.throws(
    () => loadEnvironment({ MCP_PATH: "mcp" }),
    /MCP_PATH must start with \/$/
  );
});

test("requires Supabase URL and anon key together", () => {
  assert.throws(
    () => loadEnvironment({ SUPABASE_URL: "https://example.supabase.co" }),
    /must be configured together/
  );
});

test("reports unconfigured providers without exposing credentials", () => {
  const env = loadEnvironment({});
  assert.deepEqual(integrationStatus(env), {
    supabase: "NOT_CONFIGURED",
    github: "NOT_CONFIGURED",
    vercel: "NOT_CONFIGURED",
    zynxInternal: "NOT_CONFIGURED"
  });
});
