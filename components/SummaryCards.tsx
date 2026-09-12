"use client";

import { formatCurrency, formatPercent } from "@/lib/format";

interface SummaryCardsProps {
  totalStockValue: number;
  totalCash: number;
  totalCost: number;
  realizedPnl: number;
  unrealizedPnl: number;
  confirmedDividends: number;
  expectedDividends: number;
  totalPnl: number; // realized + unrealized + confirmed dividends
  totalPnlPercent: number;
  dayChange: number;
  dayChangePercent: number;
  bestSymbol: string | null;
  bestPercent: number;
  worstSymbol: string | null;
  worstPercent: number;
  currency: string;
  targetAmount: number | null;
  totalDeposited: number;
}

function deltaColorClass(value: number): string {
  if (value > 0) return "text-status-good";
  if (value < 0) return "text-status-critical";
  return "text-ink-muted";
}

function Tile({
  label,
  value,
  valueClassName = "",
  sub,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-line-hairline bg-surface p-4 dark:border-line-hairline-dark dark:bg-surface-dark">
      <div className="text-sm text-ink-secondary dark:text-ink-secondary-dark">{label}</div>
      <div
        className={`mt-1 text-2xl font-semibold tabular-nums text-ink-primary dark:text-ink-primary-dark ${valueClassName}`}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-sm text-ink-muted">{sub}</div>}
    </div>
  );
}

function ProgressRow({
  label,
  current,
  target,
  currency,
}: {
  label: string;
  current: number;
  target: number;
  currency: string;
}) {
  const percent = target > 0 ? (current / target) * 100 : 0;
  return (
    <div className="rounded-lg border border-line-hairline bg-surface p-4 dark:border-line-hairline-dark dark:bg-surface-dark">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-1 text-sm">
        <span className="text-ink-secondary dark:text-ink-secondary-dark">{label}</span>
        <span className="tabular-nums text-ink-primary dark:text-ink-primary-dark">
          {formatCurrency(current, currency)} / {formatCurrency(target, currency)} (
          {formatPercent(percent, 1)})
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded bg-series-1/15">
        <div
          className="h-full rounded bg-series-1"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}

export function SummaryCards({
  totalStockValue,
  totalCash,
  totalCost,
  realizedPnl,
  unrealizedPnl,
  confirmedDividends,
  expectedDividends,
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
  totalDeposited,
}: SummaryCardsProps) {
  const totalAssets = totalStockValue + totalCash;

  return (
    <div className="flex flex-col gap-4">
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
        </div>

        <Tile
          label="총 평가금액 (주식만)"
          value={formatCurrency(totalStockValue, currency)}
          sub={totalCash > 0 ? `예수금 ${formatCurrency(totalCash, currency)} 별도` : undefined}
        />

        <Tile
          label="총 매입금액"
          value={formatCurrency(totalCost, currency)}
          sub="누적 매수 기준 (매도분 포함)"
        />

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
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="실현손익 (매도)"
          value={`${realizedPnl >= 0 ? "+" : ""}${formatCurrency(realizedPnl, currency)}`}
          valueClassName={deltaColorClass(realizedPnl)}
        />
        <Tile
          label="평가손익 (미실현)"
          value={`${unrealizedPnl >= 0 ? "+" : ""}${formatCurrency(unrealizedPnl, currency)}`}
          valueClassName={deltaColorClass(unrealizedPnl)}
        />
        <Tile
          label="누적 배당금 (확정)"
          value={formatCurrency(confirmedDividends, currency)}
          sub={
            expectedDividends > 0
              ? `예상(미확정) ${formatCurrency(expectedDividends, currency)}`
              : undefined
          }
        />
        <Tile
          label="누적손익 (실현+평가+배당)"
          value={`${totalPnl >= 0 ? "+" : ""}${formatCurrency(totalPnl, currency)}`}
          valueClassName={deltaColorClass(totalPnl)}
          sub={formatPercent(totalPnlPercent)}
        />
      </div>

      {targetAmount != null && targetAmount > 0 && (
        <ProgressRow
          label="올해 목표금액 달성률 (총자산 기준)"
          current={totalAssets}
          target={targetAmount}
          currency={currency}
        />
      )}

      {totalDeposited > 0 && (
        <ProgressRow
          label="계좌투입금 대비 총자산 비율"
          current={totalAssets}
          target={totalDeposited}
          currency={currency}
        />
      )}
    </div>
  );
}
