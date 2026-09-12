"use client";

import { formatCurrency, formatPercent } from "@/lib/format";

interface SummaryCardsProps {
  totalStockValue: number;
  totalCash: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPercent: number;
  dayChange: number;
  dayChangePercent: number;
  bestSymbol: string | null;
  bestPercent: number;
  worstSymbol: string | null;
  worstPercent: number;
  currency: string;
  targetAmount: number | null;
}

function deltaColorClass(value: number): string {
  if (value > 0) return "text-status-good";
  if (value < 0) return "text-status-critical";
  return "text-ink-muted";
}

export function SummaryCards({
  totalStockValue,
  totalCash,
  totalCost,
  totalPnl,
  totalPnlPercent,
  dayChange,
  dayChangePercent,
  bestSymbol,
  bestPercent,
  worstSymbol,
  worstPercent,
  currency,
  targetAmount,
}: SummaryCardsProps) {
  const totalAssets = totalStockValue + totalCash;
  const targetPercent =
    targetAmount != null && targetAmount > 0 ? (totalAssets / targetAmount) * 100 : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border border-line-hairline bg-surface p-4 dark:border-line-hairline-dark dark:bg-surface-dark">
        <div className="text-sm text-ink-secondary dark:text-ink-secondary-dark">
          총자산 (주식+예수금)
        </div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-ink-primary dark:text-ink-primary-dark">
          {formatCurrency(totalAssets, currency)}
        </div>
        <div className={`mt-1 text-sm tabular-nums ${deltaColorClass(dayChange)}`}>
          {dayChange >= 0 ? "▲" : "▼"} {formatCurrency(Math.abs(dayChange), currency)} (
          {formatPercent(dayChangePercent)}) 오늘
        </div>
        {totalCash > 0 && (
          <div className="mt-1 text-xs text-ink-muted">
            주식 {formatCurrency(totalStockValue, currency)} · 예수금{" "}
            {formatCurrency(totalCash, currency)}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-line-hairline bg-surface p-4 dark:border-line-hairline-dark dark:bg-surface-dark">
        <div className="text-sm text-ink-secondary dark:text-ink-secondary-dark">
          총 매입금액
        </div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-ink-primary dark:text-ink-primary-dark">
          {formatCurrency(totalCost, currency)}
        </div>
        <div className="mt-1 text-sm text-ink-muted">누적 매수 기준 (매도분 포함)</div>
      </div>

      <div className="rounded-lg border border-line-hairline bg-surface p-4 dark:border-line-hairline-dark dark:bg-surface-dark">
        <div className="text-sm text-ink-secondary dark:text-ink-secondary-dark">
          누적손익 (실현+평가)
        </div>
        <div className={`mt-1 text-2xl font-semibold tabular-nums ${deltaColorClass(totalPnl)}`}>
          {totalPnl >= 0 ? "+" : ""}
          {formatCurrency(totalPnl, currency)}
        </div>
        <div className={`mt-1 text-sm tabular-nums ${deltaColorClass(totalPnlPercent)}`}>
          {formatPercent(totalPnlPercent)}
        </div>
      </div>

      <div className="rounded-lg border border-line-hairline bg-surface p-4 dark:border-line-hairline-dark dark:bg-surface-dark">
        <div className="text-sm text-ink-secondary dark:text-ink-secondary-dark">
          최고 / 최저 누적수익률 종목
        </div>
        <div className="mt-1 flex flex-col gap-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-ink-primary dark:text-ink-primary-dark">
              {bestSymbol ?? "-"}
            </span>
            <span className="tabular-nums text-status-good">
              {bestSymbol ? formatPercent(bestPercent) : "-"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-primary dark:text-ink-primary-dark">
              {worstSymbol ?? "-"}
            </span>
            <span className="tabular-nums text-status-critical">
              {worstSymbol ? formatPercent(worstPercent) : "-"}
            </span>
          </div>
        </div>
      </div>

      {targetPercent != null && (
        <div className="rounded-lg border border-line-hairline bg-surface p-4 dark:border-line-hairline-dark dark:bg-surface-dark sm:col-span-2 lg:col-span-4">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-ink-secondary dark:text-ink-secondary-dark">
              올해 목표금액 달성률
            </span>
            <span className="tabular-nums text-ink-primary dark:text-ink-primary-dark">
              {formatCurrency(totalAssets, currency)} / {formatCurrency(targetAmount ?? 0, currency)}
              {" "}({formatPercent(targetPercent, 1)})
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded bg-series-1/15">
            <div
              className="h-full rounded bg-series-1"
              style={{ width: `${Math.min(100, Math.max(0, targetPercent))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
