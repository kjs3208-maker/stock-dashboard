// Server-side only helpers for talking to Yahoo Finance's unofficial,
// unauthenticated endpoints. These are undocumented and can change or be
// rate-limited at any time - every caller must treat a failure here as
// routine and fall back to mock data rather than surfacing an error.

const FETCH_TIMEOUT_MS = 6000;

interface YahooChartMeta {
  regularMarketPrice?: number;
  previousClose?: number;
  chartPreviousClose?: number;
  currency?: string;
}

interface YahooChartResult {
  meta: YahooChartMeta;
  timestamp?: number[];
  indicators?: {
    quote?: { close?: (number | null)[] }[];
  };
}

interface YahooChartResponse {
  chart: {
    result?: YahooChartResult[];
    error?: unknown;
  };
}

export interface YahooChartData {
  currency: string;
  regularMarketPrice: number;
  previousClose: number;
  points: { date: string; close: number }[];
}

function withTimeout(): AbortSignal {
  return AbortSignal.timeout(FETCH_TIMEOUT_MS);
}

export async function fetchYahooChart(
  symbol: string,
  range: string,
  interval: string
): Promise<YahooChartData | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?range=${range}&interval=${interval}`;
    const res = await fetch(url, {
      signal: withTimeout(),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; StockDashboard/1.0)" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as YahooChartResponse;
    const result = data.chart?.result?.[0];
    if (!result || !result.timestamp || !result.indicators?.quote?.[0]) return null;

    const closes = result.indicators.quote[0].close ?? [];
    const points = result.timestamp
      .map((ts, i) => ({ ts, close: closes[i] }))
      .filter((p): p is { ts: number; close: number } => typeof p.close === "number")
      .map((p) => ({
        date: new Date(p.ts * 1000).toISOString().slice(0, 10),
        close: Math.round(p.close * 100) / 100,
      }));

    if (points.length === 0) return null;

    const meta = result.meta;
    const previousClose = meta.previousClose ?? meta.chartPreviousClose ?? points[points.length - 2]?.close ?? points[points.length - 1].close;

    return {
      currency: meta.currency ?? "USD",
      regularMarketPrice: meta.regularMarketPrice ?? points[points.length - 1].close,
      previousClose,
      points,
    };
  } catch {
    return null;
  }
}

interface YahooSearchNewsItem {
  uuid?: string;
  title?: string;
  link?: string;
  publisher?: string;
  providerPublishTime?: number;
}

interface YahooSearchResponse {
  news?: YahooSearchNewsItem[];
}

export interface YahooNewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
}

export async function fetchYahooNews(symbol: string): Promise<YahooNewsItem[] | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
      symbol
    )}&newsCount=8&quotesCount=0`;
    const res = await fetch(url, {
      signal: withTimeout(),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; StockDashboard/1.0)" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as YahooSearchResponse;
    if (!data.news || data.news.length === 0) return null;

    return data.news
      .filter((n) => n.title && n.link)
      .map((n) => ({
        title: n.title as string,
        url: n.link as string,
        source: n.publisher || "Yahoo Finance",
        publishedAt: n.providerPublishTime
          ? new Date(n.providerPublishTime * 1000).toISOString()
          : new Date().toISOString(),
      }));
  } catch {
    return null;
  }
}
