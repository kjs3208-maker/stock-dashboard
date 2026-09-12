"use client";

import { Holding, Quote } from "@/lib/types";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";

export interface HoldingRow {
  holding: Holding;
  quote: Quote | null;
  quantity: number;
  avgCost: number;
  marketValue: number;
  unrealizedPnl: number;
  totalReturnPercent: number;
  accountName: string | null;
}

interface HoldingsTableProps {
  rows: HoldingRow[];
  selectedSymbol: string | null;
  onSelect: (symbol: string) => void;
  onEdit: (holding: Holding) => void;
  onDelete: (holding: Holding) => void;
  onAnalyze: (holding: Holding) => void;
}

function deltaColorClass(value: number): string {
  if (value > 0) return "text-status-good";
  if (value < 0) return "text-status-critical";
  return "text-ink-muted";
}

export function HoldingsTable({
  rows,
  selectedSymbol,
  onSelect,
  onEdit,
  onDelete,
  onAnalyze,
}: HoldingsTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line-hairline p-8 text-center text-sm text-ink-muted dark:border-line-hairline-dark">
        아직 보유 종목이 없습니다. &quot;종목 추가&quot; 버튼으로 첫 종목을 등록해 보세요.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-line-hairline dark:border-line-hairline-dark">
      <table className="w-full min-w-[820px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line-hairline text-left text-ink-secondary dark:border-line-hairline-dark dark:text-ink-secondary-dark">
            <th className="px-4 py-3 font-medium">종목</th>
            <th className="px-4 py-3 text-right font-medium">수량</th>
            <th className="px-4 py-3 text-right font-medium">평균단가</th>
            <th className="px-4 py-3 text-right font-medium">현재가</th>
            <th className="px-4 py-3 text-right font-medium">평가금액</th>
            <th className="px-4 py-3 text-right font-medium">평가손익</th>
            <th className="px-4 py-3 text-right font-medium">누적수익률</th>
            <th className="px-4 py-3 text-right font-medium">관리</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { holding, quote, quantity, avgCost, marketValue, unrealizedPnl, totalReturnPercent, accountName } = row;
            const isSelected = holding.symbol === selectedSymbol;
            return (
              <tr
                key={holding.id}
                onClick={() => onSelect(holding.symbol)}
                className={`cursor-pointer border-b border-line-hairline last:border-0 hover:bg-plane dark:border-line-hairline-dark dark:hover:bg-plane-dark ${
                  isSelected ? "bg-plane dark:bg-plane-dark" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <div
                    className="font-medium text-ink-primary dark:text-ink-primary-dark"
                    title={holding.note || undefined}
                  >
                    {holding.name}
                    {holding.note && <span className="ml-1 text-ink-muted">📝</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-1 text-xs text-ink-muted">
                    <span>{holding.symbol}</span>
                    {quantity === 0 && holding.transactions.length > 0 && (
                      <span
                        title="전량 매도되어 실현손익만 남은 종목입니다"
                        className="rounded bg-ink-muted/20 px-1 text-ink-secondary dark:text-ink-secondary-dark"
                      >
                        청산완료
                      </span>
                    )}
                    {accountName && (
                      <span className="rounded bg-ink-muted/10 px-1 text-ink-secondary dark:text-ink-secondary-dark">
                        {accountName}
                      </span>
                    )}
                    {quote?.isManual && (
                      <span
                        title="사용자가 직접 입력한 현재가입니다"
                        className="rounded bg-series-1/20 px-1 text-series-1"
                      >
                        수동입력
                      </span>
                    )}
                    {quote?.isMock && (
                      <span
                        title="실시간 데이터 연동 실패 - 모의 데이터 표시 중"
                        className="rounded bg-status-warning/20 px-1 text-status-warning"
                      >
                        MOCK
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatNumber(quantity, 0)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatCurrency(avgCost, holding.currency)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {quote ? formatCurrency(quote.price, quote.currency) : "-"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatCurrency(marketValue, holding.currency)}
                </td>
                <td className={`px-4 py-3 text-right tabular-nums ${deltaColorClass(unrealizedPnl)}`}>
                  {unrealizedPnl >= 0 ? "+" : ""}
                  {formatCurrency(unrealizedPnl, holding.currency)}
                </td>
                <td className={`px-4 py-3 text-right tabular-nums ${deltaColorClass(totalReturnPercent)}`}>
                  {formatPercent(totalReturnPercent)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAnalyze(holding);
                      }}
                      className="rounded px-2 py-1 text-xs text-series-1 hover:bg-series-1/10"
                    >
                      AI 분석
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(holding);
                      }}
                      className="rounded px-2 py-1 text-xs text-series-1 hover:bg-series-1/10"
                    >
                      수정
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(holding);
                      }}
                      className="rounded px-2 py-1 text-xs text-status-critical hover:bg-status-critical/10"
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
