import { createMcpHandler } from "agents/mcp/server";
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { authorized, readPlanner, writePlanner } from "./_shared/planner.js";

function createServer(env) {
  const server = new McpServer({ name: "Your Planner", version: "1.0.0" });
  server.registerTool("get_planner_data", {
    description: "Read the connected planner's calendar tasks, goals, journal entries, labels, and time logs.",
    inputSchema: {},
  }, async () => {
    const saved = await readPlanner(env);
    if (!saved) return { content: [{ type: "text", text: "No planner data has been synced yet." }] };
    return { content: [{ type: "text", text: JSON.stringify(saved) }] };
  });
  server.registerTool("update_planner_data", {
    description: "Update the full planner data object. Read it first and preserve fields that should not change. The expected version prevents overwriting newer edits.",
    inputSchema: {
      data: z.record(z.string(), z.unknown()),
      expectedVersion: z.number().int().nonnegative(),
    },
  }, async ({ data, expectedVersion }) => {
    const result = await writePlanner(env, data, expectedVersion);
    if (result.conflict) return { isError: true, content: [{ type: "text", text: `Version conflict. Current version is ${result.version}; read the planner again before updating.` }] };
    return { content: [{ type: "text", text: `Planner updated. New version: ${result.version}.` }] };
  });
  return server;
}

export async function onRequest(context) {
  if (!authorized(context.request, context.env)) {
    return new Response("Unauthorized", { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  }
  return createMcpHandler(() => createServer(context.env))(context.request, context.env, context);
}
