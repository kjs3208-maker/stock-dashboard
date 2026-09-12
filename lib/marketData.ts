import { FxRates } from "./fx";
import { HistoryResult, Quote } from "./types";

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

export async function fetchFxRates(): Promise<FxRates> {
  const res = await fetch("/api/fx");
  if (!res.ok) throw new Error(`fx fetch failed: ${res.status}`);
  return res.json();
}

export interface AnalysisResult {
  analysis?: string;
  error?: string;
}

export async function fetchAnalysis(symbol: string, name: string): Promise<AnalysisResult> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol, name }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data?.error ?? `분석 요청 실패 (${res.status})` };
  }
  return data;
}
