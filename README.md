# mcp-energi-data-dk

Energi Data Service (Energinet) MCP — Denmark's official open energy data.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `spot_prices` | Day-ahead electricity spot prices from Energi Data Service (Energinet, Denmark/Nordic). Prices per bidding zone (PriceArea) in DKK and EUR per MWh, hourly. Bidding zones: DK1 (west Denmark), DK2 (east Denmark), DE (Germany), NO2, SE3, SE4, and others. Omit "area" to get all zones. Keyless official open data. |
| `co2_intensity` | Real-time grid CO2 emission intensity (g CO2/kWh) from Energinet Denmark, sampled every 5 minutes per bidding zone (DK1=west, DK2=east); defaults to the last 12 readings (~1 hour). Lower values mean cleaner electricity.sampled every 5 minutes per bidding zone. Areas: DK1 (west Denmark), DK2 (east Denmark). Lower values mean cleaner electricity right now. Keyless official open data. |
| `query_dataset` | Generic escape hatch for any of the ~100 Energi Data Service (Energinet, Denmark) datasets. Examples: "ProductionConsumptionSettlement" (production/consumption by type per area+hour), "CO2EmisProg" (CO2 prognosis), "Elspotprices", "CO2Emis". Returns the raw records array for the dataset. Keyless official open data. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "energi-data-dk": {
      "url": "https://gateway.pipeworx.io/energi-data-dk/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/energi-data-dk/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Energi Data Dk data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/spot_prices \
  -H 'Content-Type: application/json' \
  -d '{"area":"DK1","limit":24}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/spot_prices`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.
