"use client";

import { useState } from "react";
import { Quote, WatchlistItem } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/format";

interface WatchlistPanelProps {
  items: WatchlistItem[];
  quotes: Record<string, Quote>;
  onAdd: (item: { symbol: string; name: string; currency: string }) => void;
  onDelete: (id: string) => void;
  onConvert: (item: WatchlistItem) => void;
  onAnalyze: (item: { symbol: string; name: string }) => void;
}

const CURRENCIES = ["KRW", "USD", "JPY", "EUR", "HKD"];

function deltaColorClass(value: number): string {
  if (value > 0) return "text-status-good";
  if (value < 0) return "text-status-critical";
  return "text-ink-muted";
}

export function WatchlistPanel({
  items,
  quotes,
  onAdd,
  onDelete,
  onConvert,
  onAnalyze,
}: WatchlistPanelProps) {
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("KRW");
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    const trimmedSymbol = symbol.trim().toUpperCase();
    const trimmedName = name.trim();
    if (!trimmedSymbol || !trimmedName) {
      setError("종목 코드와 종목명을 모두 입력해 주세요.");
      return;
    }
    setError(null);
    onAdd({ symbol: trimmedSymbol, name: trimmedName, currency });
    setSymbol("");
    setName("");
  }

  return (
    <div>
      {items.length === 0 ? (
        <div className="mb-3 text-sm text-ink-muted">관심종목이 없습니다.</div>
      ) : (
        <ul className="mb-3 flex flex-col gap-1.5 text-sm">
          {items.map((item) => {
            const quote = quotes[item.symbol];
            const dayChangePercent =
              quote && quote.previousClose > 0
                ? ((quote.price - quote.previousClose) / quote.previousClose) * 100
                : null;
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-line-hairline px-3 py-2 dark:border-line-hairline-dark"
              >
                <div>
                  <div className="font-medium text-ink-primary dark:text-ink-primary-dark">
                    {item.name}
                  </div>
                  <div className="text-xs text-ink-muted">{item.symbol}</div>
                </div>
                <div className="text-right">
                  <div className="tabular-nums text-ink-primary dark:text-ink-primary-dark">
                    {quote ? formatCurrency(quote.price, quote.currency) : "-"}
                  </div>
                  {dayChangePercent != null && (
                    <div className={`text-xs tabular-nums ${deltaColorClass(dayChangePercent)}`}>
                      {formatPercent(dayChangePercent)}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => onAnalyze({ symbol: item.symbol, name: item.name })}
                    className="rounded px-2 py-1 text-xs text-series-1 hover:bg-series-1/10"
                  >
                    AI 분석
                  </button>
                  <button
                    onClick={() => onConvert(item)}
                    className="rounded px-2 py-1 text-xs text-status-good hover:bg-status-good/10"
                  >
                    매수 전환
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="rounded px-2 py-1 text-xs text-status-critical hover:bg-status-critical/10"
                  >
                    삭제
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2 border-t border-line-hairline pt-3 dark:border-line-hairline-dark">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-ink-secondary dark:text-ink-secondary-dark">종목 코드</span>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="예: TSLA"
            className="w-28 rounded border border-line-hairline bg-transparent px-2 py-1.5 text-sm dark:border-line-hairline-dark"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-ink-secondary dark:text-ink-secondary-dark">종목명</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: Tesla Inc."
            className="w-36 rounded border border-line-hairline bg-transparent px-2 py-1.5 text-sm dark:border-line-hairline-dark"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-ink-secondary dark:text-ink-secondary-dark">통화</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="rounded border border-line-hairline bg-transparent px-2 py-1.5 text-sm dark:border-line-hairline-dark"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={handleAdd}
          className="rounded bg-series-1 px-3 py-1.5 text-sm text-white hover:opacity-90"
        >
          + 관심종목 추가
        </button>
      </div>
      {error && <div className="mt-1 text-xs text-status-critical">{error}</div>}
    </div>
  );
}
