# restockcheck-mcp

A lightweight, read-only [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server exposing public Apple Store pickup availability, restock summaries, and CC BY 4.0 service reliability telemetry from [RestockCheck](https://restockcheck.com).

Calls only anonymous, read-only `/api/stock/public/...` JSON endpoints — no API keys, no user accounts, no credentials, and no write actions.

## Tools

| Tool | What it does |
| --- | --- |
| `list_monitored_apple_stores` | Lists monitored hub Apple Stores (filterable by `country`: `us`, `gb`, `jp`, `cn`, and `onlyActive`) with polling tier, check interval, and live pickup availability summary. |
| `get_store_pickup_status` | Fetches live pickup status, per-configuration availability, reliability rate, and recent restock events for a specific monitored store (`country`, `slug`). |
| `get_restock_summary` | Returns live global and per-country in-stock store counts, 24h and 7d restock totals, latest restocks, and observation freshness quantiles. |
| `get_service_reliability_report` | Returns CC BY 4.0 check interval and observation age quantiles (`P50`/`P90`/`P95`), sample sizes, alert dispatch latency, and optional per-store health status. |

## Quick Start

### Option 1: Run from Source (Claude Desktop / Cursor / Windsurf)

Clone and build with `pnpm`:

```bash
git clone https://github.com/yangjwlove-dev/restockcheck-mcp.git
cd restockcheck-mcp
pnpm install
pnpm build
```

Add to your MCP client config (for example `claude_desktop_config.json` or `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "restockcheck-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/restockcheck-mcp/dist/cli.js"]
    }
  }
}
```

### Option 2: Run with Docker (stdio)

```bash
docker build -t restockcheck-mcp . && docker run -i --rm restockcheck-mcp
```

### Option 3: MCPB Bundle (Claude Desktop)

This repository includes `manifest.json` for packaging as a `.mcpb` desktop extension bundle (attached to GitHub Releases).

### Example Prompts

- *"List monitored US Apple Stores and show which ones are actively polled right now."*
- *"Check live pickup availability at `soho-r032` in the US and show any in-stock configurations."*
- *"Summarize current Apple Store restocks across US, UK, Japan, and China over the last 24 hours."*
- *"Show the CC BY 4.0 service reliability report with P50/P90/P95 check intervals and alert latency."*

## Local Development

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm test
```

Run the live public API smoke test over stdio:

```bash
pnpm smoke
```

Inspect tools interactively with MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/cli.js
```

## Public Endpoints & Privacy

- Reads strictly from public anonymous JSON routes: `/api/stock/public/stores`, `/api/stock/public/store/<country>/<slug>`, `/api/stock/public/summary`, and `/api/stock/public/service-report`.
- Zero authentication tokens, zero environment variables required, and zero write operations.
- Service reliability telemetry is published under CC BY 4.0 by [RestockCheck](https://restockcheck.com).

## License

[MIT](./LICENSE)
