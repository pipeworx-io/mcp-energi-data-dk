interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Energi Data Service (Energinet) MCP — Denmark's official open energy data.
 * Keyless. Electricity day-ahead spot prices by bidding zone, real-time grid
 * CO2 emission intensity, and production/consumption. DK1 = west Denmark,
 * DK2 = east Denmark.
 */


const BASE = 'https://api.energidataservice.dk';
const UA = 'pipeworx/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'spot_prices',
    description:
      'Day-ahead electricity spot prices from Energi Data Service (Energinet, Denmark/Nordic). ' +
      'Prices per bidding zone (PriceArea) in DKK and EUR per MWh, hourly. ' +
      'Bidding zones: DK1 (west Denmark), DK2 (east Denmark), DE (Germany), NO2, SE3, SE4, and others. ' +
      'Omit "area" to get all zones. Keyless official open data.',
    inputSchema: {
      type: 'object',
      properties: {
        area: { type: 'string', description: 'Bidding zone, e.g. "DK1", "DK2", "DE". Omit for all areas.' },
        limit: { type: 'number', description: 'Max records (default 24, i.e. last 24 hourly rows).' },
        start: { type: 'string', description: 'ISO date/time lower bound, e.g. "2026-06-01" or "2026-06-01T00:00".' },
        end: { type: 'string', description: 'ISO date/time upper bound.' },
      },
    },
  },
  {
    name: 'co2_intensity',
    description:
      'Real-time grid CO2 emission intensity (grams CO2 per kWh) from Energi Data Service (Energinet, Denmark), ' +
      'sampled every 5 minutes per bidding zone. Areas: DK1 (west Denmark), DK2 (east Denmark). ' +
      'Lower values mean cleaner electricity right now. Keyless official open data.',
    inputSchema: {
      type: 'object',
      properties: {
        area: { type: 'string', description: 'Bidding zone "DK1" or "DK2". Omit for both.' },
        limit: { type: 'number', description: 'Max records (default 12, i.e. last hour at 5-min resolution).' },
      },
    },
  },
  {
    name: 'query_dataset',
    description:
      'Generic escape hatch for any of the ~100 Energi Data Service (Energinet, Denmark) datasets. ' +
      'Examples: "ProductionConsumptionSettlement" (production/consumption by type per area+hour), ' +
      '"CO2EmisProg" (CO2 prognosis), "Elspotprices", "CO2Emis". ' +
      'Returns the raw records array for the dataset. Keyless official open data.',
    inputSchema: {
      type: 'object',
      properties: {
        dataset: { type: 'string', description: 'Dataset name, e.g. "ProductionConsumptionSettlement".' },
        limit: { type: 'number', description: 'Max records (default 20).' },
        sort: { type: 'string', description: 'Sort expression, e.g. "HourUTC DESC".' },
        start: { type: 'string', description: 'ISO date/time lower bound.' },
        end: { type: 'string', description: 'ISO date/time upper bound.' },
        filter: {
          type: 'object',
          description: 'Column→value[] filter, e.g. {"PriceArea":["DK1"]}. Values are arrays.',
        },
      },
      required: ['dataset'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case 'spot_prices': {
        const area = optStr(args.area);
        const limit = optNum(args.limit, 24);
        const params = new URLSearchParams();
        params.set('limit', String(limit));
        params.set('sort', 'HourUTC DESC');
        if (area) params.set('filter', JSON.stringify({ PriceArea: [area] }));
        const start = optStr(args.start);
        const end = optStr(args.end);
        if (start) params.set('start', start);
        if (end) params.set('end', end);
        const data = await edsGet('Elspotprices', params);
        const records = recordsOf(data);
        return {
          count: records.length,
          prices: records.map((r) => ({
            hour_utc: r.HourUTC,
            hour_dk: r.HourDK,
            area: r.PriceArea,
            price_dkk: r.SpotPriceDKK,
            price_eur: r.SpotPriceEUR,
          })),
        };
      }
      case 'co2_intensity': {
        const area = optStr(args.area);
        const limit = optNum(args.limit, 12);
        const params = new URLSearchParams();
        params.set('limit', String(limit));
        params.set('sort', 'Minutes5UTC DESC');
        if (area) params.set('filter', JSON.stringify({ PriceArea: [area] }));
        const data = await edsGet('CO2Emis', params);
        const records = recordsOf(data);
        return {
          count: records.length,
          emissions: records.map((r) => ({
            time_utc: r.Minutes5UTC,
            area: r.PriceArea,
            co2_g_per_kwh: r.CO2Emission,
          })),
        };
      }
      case 'query_dataset': {
        const dataset = optStr(args.dataset);
        if (!dataset) return { error: 'Required argument "dataset" is missing. Pass a dataset name like "ProductionConsumptionSettlement".' };
        const limit = optNum(args.limit, 20);
        const params = new URLSearchParams();
        params.set('limit', String(limit));
        const sort = optStr(args.sort);
        const start = optStr(args.start);
        const end = optStr(args.end);
        if (sort) params.set('sort', sort);
        if (start) params.set('start', start);
        if (end) params.set('end', end);
        const filter = args.filter;
        if (filter && typeof filter === 'object') params.set('filter', JSON.stringify(filter));
        const data = await edsGet(dataset, params);
        const records = recordsOf(data);
        return { dataset, count: records.length, records };
      }
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

async function edsGet(dataset: string, params: URLSearchParams): Promise<unknown> {
  // URLSearchParams.toString() encodes all values (filter JSON, spaces in sort, etc.).
  const url = `${BASE}/dataset/${encodeURIComponent(dataset)}?${params.toString()}`;
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Energi Data Service: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

function recordsOf(data: unknown): Array<Record<string, any>> {
  if (data && typeof data === 'object' && Array.isArray((data as any).records)) {
    return (data as any).records as Array<Record<string, any>>;
  }
  return [];
}

function optStr(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function optNum(v: unknown, def: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : def;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
