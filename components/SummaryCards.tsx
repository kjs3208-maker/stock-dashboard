"use client";

import { formatCurrency, formatPercent } from "@/lib/format";

interface SummaryCardsProps {
  totalValue: number;
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
}

function deltaColorClass(value: number): string {
  if (value > 0) return "text-status-good";
  if (value < 0) return "text-status-critical";
  return "text-ink-muted";
}

export function SummaryCards({
  totalValue,
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
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border border-line-hairline bg-surface p-4 dark:border-line-hairline-dark dark:bg-surface-dark">
        <div className="text-sm text-ink-secondary dark:text-ink-secondary-dark">
          총 평가금액
        </div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-ink-primary dark:text-ink-primary-dark">
          {formatCurrency(totalValue, currency)}
        </div>
        <div className={`mt-1 text-sm tabular-nums ${deltaColorClass(dayChange)}`}>
          {dayChange >= 0 ? "▲" : "▼"} {formatCurrency(Math.abs(dayChange), currency)} (
          {formatPercent(dayChangePercent)}) 오늘
        </div>
      </div>

      <div className="rounded-lg border border-line-hairline bg-surface p-4 dark:border-line-hairline-dark dark:bg-surface-dark">
        <div className="text-sm text-ink-secondary dark:text-ink-secondary-dark">
          총 매입금액
        </div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-ink-primary dark:text-ink-primary-dark">
          {formatCurrency(totalCost, currency)}
        </div>
        <div className="mt-1 text-sm text-ink-muted">누적 매입 기준</div>
      </div>

      <div className="rounded-lg border border-line-hairline bg-surface p-4 dark:border-line-hairline-dark dark:bg-surface-dark">
        <div className="text-sm text-ink-secondary dark:text-ink-secondary-dark">
          평가손익
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
          최고 / 최저 수익률 종목
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
    </div>
  );
}
