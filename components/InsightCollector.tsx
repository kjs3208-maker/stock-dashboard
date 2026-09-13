"use client";

import { useState } from "react";
import { fetchInsights, InsightsResult } from "@/lib/marketData";
import { formatDate } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";

interface InsightCollectorProps {
  onSaveAsNote: (note: { title: string; content: string; symbol?: string }) => void;
}

export function InsightCollector({ onSaveAsNote }: InsightCollectorProps) {
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [stockCode, setStockCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InsightsResult | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleCollect() {
    const trimmedSymbol = symbol.trim();
    const trimmedName = name.trim() || trimmedSymbol;
    if (!trimmedSymbol && !trimmedName) return;
    setLoading(true);
    setResult(null);
    setSaved(false);
    const res = await fetchInsights(
      trimmedSymbol || trimmedName,
      trimmedName,
      stockCode.trim() || undefined
    );
    setLoading(false);
    setResult(res);
  }

  function handleSave() {
    if (!result?.insight) return;
    const refs: string[] = [];
    if (result.disclosures && result.disclosures.length > 0) {
      refs.push(
        "\n\n### 참고 - 공시\n" +
          result.disclosures.map((d) => `- [${d.reportedAt}] ${d.title} (${d.submitter})`).join("\n")
      );
    }
    if (result.news && result.news.length > 0) {
      refs.push(
        "\n\n### 참고 - 뉴스\n" + result.news.map((n) => `- ${n.title} (${n.source})`).join("\n")
      );
    }
    onSaveAsNote({
      title: `${result.name ?? name} 인사이트 (${formatDate(new Date().toISOString())})`,
      content: result.insight + refs.join(""),
      symbol: result.symbol,
    });
    setSaved(true);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-ink-secondary dark:text-ink-secondary-dark">종목코드/티커</span>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="예: 138080.KQ, AMAT"
            className="w-32 rounded border border-line-hairline bg-transparent px-2 py-1.5 text-sm dark:border-line-hairline-dark"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-ink-secondary dark:text-ink-secondary-dark">종목명/키워드</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 오이솔루션"
            className="w-36 rounded border border-line-hairline bg-transparent px-2 py-1.5 text-sm dark:border-line-hairline-dark"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-ink-secondary dark:text-ink-secondary-dark">
            DART 종목코드 (선택, 6자리)
          </span>
          <input
            value={stockCode}
            onChange={(e) => setStockCode(e.target.value)}
            placeholder="예: 138080"
            className="w-32 rounded border border-line-hairline bg-transparent px-2 py-1.5 text-sm dark:border-line-hairline-dark"
          />
        </label>
        <button
          onClick={handleCollect}
          disabled={loading || (!symbol.trim() && !name.trim())}
          className="rounded bg-series-1 px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "수집 중..." : "인사이트 수집"}
        </button>
      </div>

      {result?.error && (
        <div className="mt-3 rounded border border-status-critical/40 bg-status-critical/10 p-3 text-sm text-status-critical">
          {result.error}
        </div>
      )}

      {result && !result.error && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2 text-xs text-ink-muted">
            <span>
              공시: {result.dartConfigured ? `${result.disclosures?.length ?? 0}건` : "DART_API_KEY 미설정"}
            </span>
            <span>·</span>
            <span>
              뉴스 소스:{" "}
              {result.newsSource === "naver"
                ? "네이버 뉴스"
                : result.newsSource === "yahoo"
                  ? "Yahoo"
                  : "예시 데이터"}
            </span>
          </div>

          {result.insight && (
            <div
              className="md-note rounded border border-line-hairline p-4 dark:border-line-hairline-dark"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(result.insight) }}
            />
          )}

          {result.disclosures && result.disclosures.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">
                최근 공시
              </h3>
              <ul className="flex flex-col gap-1 text-sm">
                {result.disclosures.slice(0, 6).map((d, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="shrink-0 text-xs text-ink-muted">{d.reportedAt}</span>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-ink-primary hover:underline dark:text-ink-primary-dark"
                    >
                      {d.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.news && result.news.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">
                최근 뉴스
              </h3>
              <ul className="flex flex-col gap-1 text-sm">
                {result.news.slice(0, 6).map((n, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-ink-primary hover:underline dark:text-ink-primary-dark"
                    >
                      {n.title}
                    </a>
                    <span className="shrink-0 text-xs text-ink-muted">{n.source}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <button
              onClick={handleSave}
              disabled={saved || !result.insight}
              className="rounded border border-line-hairline px-3 py-1.5 text-sm text-series-1 hover:bg-series-1/10 disabled:opacity-50 dark:border-line-hairline-dark"
            >
              {saved ? "저장됨" : "리서치 노트로 저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
