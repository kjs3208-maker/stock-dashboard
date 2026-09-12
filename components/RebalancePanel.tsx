"use client";

import { formatCurrency, formatPercent } from "@/lib/format";

export interface RebalanceSuggestion {
  symbol: string;
  name: string;
  currency: string;
  currentWeightPercent: number;
  targetWeightPercent: number;
  diffValueNative: number; // positive = buy more, negative = sell some
  diffQuantity: number | null;
}

interface RebalancePanelProps {
  suggestions: RebalanceSuggestion[];
}

function deltaColorClass(value: number): string {
  if (value > 0) return "text-status-good";
  if (value < 0) return "text-status-critical";
  return "text-ink-muted";
}

export function RebalancePanel({ suggestions }: RebalancePanelProps) {
  if (suggestions.length === 0) {
    return (
      <div className="text-sm text-ink-muted">
        종목 추가/수정 화면에서 &quot;목표 비중 %&quot;를 설정하면 리밸런싱 제안이 여기에 표시됩니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line-hairline text-left text-ink-secondary dark:border-line-hairline-dark dark:text-ink-secondary-dark">
            <th className="px-3 py-2 font-medium">종목</th>
            <th className="px-3 py-2 text-right font-medium">현재 비중</th>
            <th className="px-3 py-2 text-right font-medium">목표 비중</th>
            <th className="px-3 py-2 text-right font-medium">제안 금액</th>
            <th className="px-3 py-2 text-right font-medium">제안 수량</th>
          </tr>
        </thead>
        <tbody>
          {suggestions.map((s) => (
            <tr
              key={s.symbol}
              className="border-b border-line-hairline last:border-0 dark:border-line-hairline-dark"
            >
              <td className="px-3 py-2 text-ink-primary dark:text-ink-primary-dark">{s.name}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatPercent(s.currentWeightPercent, 1)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatPercent(s.targetWeightPercent, 1)}
              </td>
              <td className={`px-3 py-2 text-right tabular-nums ${deltaColorClass(s.diffValueNative)}`}>
                {s.diffValueNative >= 0 ? "+" : ""}
                {formatCurrency(s.diffValueNative, s.currency)}
              </td>
              <td className={`px-3 py-2 text-right tabular-nums ${deltaColorClass(s.diffValueNative)}`}>
                {s.diffQuantity != null
                  ? `${s.diffValueNative >= 0 ? "매수 " : "매도 "}${Math.abs(s.diffQuantity).toFixed(2)}주`
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-ink-muted">
        현재 평가금액 기준의 단순 계산이며, 세금/수수료는 반영되지 않습니다.
      </p>
    </div>
  );
}
