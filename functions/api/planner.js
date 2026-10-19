import { authorized, json, readPlanner, writePlanner } from "../_shared/planner.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (!authorized(request, env)) return json({ error: "Unauthorized" }, 401);

  if (request.method === "GET") {
    const saved = await readPlanner(env);
    return saved ? json(saved) : json({ error: "No cloud copy exists yet." }, 404);
  }

  if (request.method !== "PUT") return json({ error: "Method not allowed" }, 405);
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > 4_000_000) return json({ error: "Planner data is too large." }, 413);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }
  if (!Number.isInteger(body.expectedVersion) || body.expectedVersion < 0) {
    return json({ error: "expectedVersion is required." }, 400);
  }
  try {
    const result = await writePlanner(env, body.data, body.expectedVersion);
    if (result.conflict) return json({ error: "Version conflict.", version: result.version }, 409);
    return json(result);
  } catch (error) {
    return json({ error: error.message || "Could not save planner data." }, 400);
  }
}
