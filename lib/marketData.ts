import { FxRates } from "./fx";
import { HistoryResult, NewsResult, Quote } from "./types";

export async function fetchQuote(symbol: string): Promise<Quote> {
  const res = await fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`);
  if (!res.ok) throw new Error(`quote fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchQuotes(symbols: string[]): Promise<Record<string, Quote>> {
  const unique = Array.from(new Set(symbols));
  const results = await Promise.all(
    unique.map(async (symbol) => {
      try {
        const quote = await fetchQuote(symbol);
        return [symbol, quote] as const;
      } catch {
        return [symbol, null] as const;
      }
    })
  );
  const map: Record<string, Quote> = {};
  for (const [symbol, quote] of results) {
    if (quote) map[symbol] = quote;
  }
  return map;
}

export async function fetchHistory(
  symbol: string,
  years = 5
): Promise<HistoryResult> {
  const res = await fetch(
    `/api/history?symbol=${encodeURIComponent(symbol)}&years=${years}`
  );
  if (!res.ok) throw new Error(`history fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchNews(symbol: string, name: string): Promise<NewsResult> {
  const res = await fetch(
    `/api/news?symbol=${encodeURIComponent(symbol)}&name=${encodeURIComponent(name)}`
  );
  if (!res.ok) throw new Error(`news fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchFxRates(): Promise<FxRates> {
  const res = await fetch("/api/fx");
  if (!res.ok) throw new Error(`fx fetch failed: ${res.status}`);
  return res.json();
}
