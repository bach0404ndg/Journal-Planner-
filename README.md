# Journal Project

A Cloudflare Pages planner with:

- A monthly calendar with day notes
- Month-specific goal sections
- A simple journal and gratefulness log
- Browser local storage persistence
- Optional private Cloudflare sync and an authenticated MCP connector for AI clients

## Run locally

Open `public/index.html` directly, or run a static server from the `public` folder.

## Deploy to Cloudflare Pages

The project uses Pages Functions for `/api/planner` and `/mcp`. Deploy with Wrangler (Git-connected Pages builds also include the root `functions/` directory).

### Enable private AI access

1. Create a D1 database in Cloudflare named `journal-planner-data`.
2. In the `journal-project` Pages project, add a D1 binding named `PLANNER_DB` and select that database.
3. Apply `migrations/0001_planner_state.sql` to the database.
4. Set a Pages secret named `PLANNER_API_TOKEN` to a long random value. The same value is entered in the planner's **AI access** menu and in the AI client's bearer-token configuration. Never commit the token.
5. Redeploy the Pages project after adding the binding and secret.
6. Open the planner and choose **Send local data** to create the private cloud copy. This is an explicit action; local data is not uploaded on page load. Use **Load cloud data** to pull AI edits back to this browser; it saves a local safety copy before replacing the current browser data.

The MCP endpoint is `https://<your-pages-domain>/mcp`. It provides `get_planner_data` and `update_planner_data`; updates use a version check to reject stale writes. The REST sync endpoint is `/api/planner` and uses the same bearer token.

For Muse Code, use the **Copy Muse setup** button in the AI access menu. It copies a `streamable_http` MCP server configuration with the endpoint and bearer header. Keep that config private because it contains the access key. ChatGPT custom MCP writes require a plan/workspace that supports write actions; see OpenAI's current custom MCP availability.

To provision the database with Wrangler, run `npx wrangler d1 create journal-planner-data`, then bind its returned ID to `PLANNER_DB` in the Pages project configuration or Cloudflare dashboard. Apply the schema with `npx wrangler d1 execute journal-planner-data --remote --file=migrations/0001_planner_state.sql`.
