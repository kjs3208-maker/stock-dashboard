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

export interface InsightNewsItem {
  title: string;
  description?: string;
  url: string;
  source: string;
  publishedAt: string;
}

export interface InsightDisclosure {
  title: string;
  reportedAt: string;
  url: string;
  submitter: string;
}

export interface InsightsResult {
  symbol?: string;
  name?: string;
  disclosures?: InsightDisclosure[];
  dartConfigured?: boolean;
  naverConfigured?: boolean;
  news?: InsightNewsItem[];
  newsSource?: "naver" | "yahoo" | "mock";
  insight?: string;
  error?: string;
}

export async function fetchInsights(
  symbol: string,
  name: string,
  stockCode?: string
): Promise<InsightsResult> {
  const res = await fetch("/api/insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol, name, stockCode }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data?.error ?? `인사이트 수집 실패 (${res.status})` };
  }
  return data;
}

export interface ReportAnalysisResult {
  insight?: string;
  textLength?: number;
  fileName?: string;
  error?: string;
}

export async function fetchReportAnalysis(
  file: File,
  symbol?: string,
  name?: string
): Promise<ReportAnalysisResult> {
  const formData = new FormData();
  formData.append("file", file);
  if (symbol) formData.append("symbol", symbol);
  if (name) formData.append("name", name);
  const res = await fetch("/api/report-analysis", { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) {
    return { error: data?.error ?? `분석 요청 실패 (${res.status})` };
  }
  return data;
}
