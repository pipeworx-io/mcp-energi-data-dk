# mcp-energi-data-dk

Energi Data Service (Energinet) MCP — Denmark's official open energy data.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

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

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Energi Data Dk data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
