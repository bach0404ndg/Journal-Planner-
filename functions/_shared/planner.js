const ROW_ID = 1;

export function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function authorized(request, env) {
  const expected = env.PLANNER_API_TOKEN;
  const supplied = request.headers.get("Authorization") || "";
  return Boolean(expected && supplied === `Bearer ${expected}`);
}

export async function readPlanner(env) {
  const row = await env.PLANNER_DB.prepare(
    "SELECT data, version, updated_at FROM planner_state WHERE id = ?",
  ).bind(ROW_ID).first();
  if (!row) return null;
  return { data: JSON.parse(row.data), version: row.version, updatedAt: row.updated_at };
}

export async function writePlanner(env, data, expectedVersion) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Planner data must be an object.");
  }
  const current = await readPlanner(env);
  const version = current?.version || 0;
  if (expectedVersion !== version) return { conflict: true, version };
  const serialized = JSON.stringify(data);
  if (serialized.length > 4_000_000) throw new Error("Planner data is too large.");
  const nextVersion = version + 1;
  const updatedAt = new Date().toISOString();
  await env.PLANNER_DB.prepare(
    `INSERT INTO planner_state (id, data, version, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET data = excluded.data, version = excluded.version, updated_at = excluded.updated_at`,
  ).bind(ROW_ID, serialized, nextVersion, updatedAt).run();
  return { data, version: nextVersion, updatedAt };
}
