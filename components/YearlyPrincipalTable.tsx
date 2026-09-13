"use client";

import { YearlyReturnPoint } from "@/lib/portfolioMath";
import { formatCurrency, formatPercent } from "@/lib/format";

interface YearlyPrincipalRow {
  year: number;
  principal: number;
}

interface YearlyPrincipalTableProps {
  returns: YearlyReturnPoint[];
  principal: YearlyPrincipalRow[];
  currency: string;
}

function deltaColorClass(value: number): string {
  if (value > 0) return "text-status-good";
  if (value < 0) return "text-status-critical";
  return "text-ink-muted";
}

export function YearlyPrincipalTable({ returns, principal, currency }: YearlyPrincipalTableProps) {
  const principalByYear = new Map(principal.map((p) => [p.year, p.principal]));
  const years = Array.from(new Set([...returns.map((r) => r.year), ...principalByYear.keys()])).sort(
    (a, b) => a - b
  );

  if (years.length === 0) return null;

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="border-b border-line-hairline text-left text-xs text-ink-muted dark:border-line-hairline-dark">
            <th className="py-1.5 pr-3 font-normal">연도</th>
            <th className="py-1.5 pr-3 font-normal">실현손익</th>
            <th className="py-1.5 pr-3 font-normal">총 투입원금 (누적)</th>
            <th className="py-1.5 font-normal">수익률 (실현손익/투입원금)</th>
          </tr>
        </thead>
        <tbody>
          {years.map((year) => {
            const amount = returns.find((r) => r.year === year)?.amount ?? 0;
            const principalValue = principalByYear.get(year) ?? 0;
            const returnPercent = principalValue > 0 ? (amount / principalValue) * 100 : null;
            return (
              <tr
                key={year}
                className="border-b border-line-hairline last:border-0 dark:border-line-hairline-dark"
              >
                <td className="py-1.5 pr-3 text-ink-secondary dark:text-ink-secondary-dark">
                  {year}
                </td>
                <td className={`py-1.5 pr-3 tabular-nums ${deltaColorClass(amount)}`}>
                  {amount >= 0 ? "+" : ""}
                  {formatCurrency(amount, currency)}
                </td>
                <td className="py-1.5 pr-3 tabular-nums text-ink-primary dark:text-ink-primary-dark">
                  {formatCurrency(principalValue, currency)}
                </td>
                <td className={`py-1.5 tabular-nums ${deltaColorClass(returnPercent ?? 0)}`}>
                  {returnPercent != null ? formatPercent(returnPercent) : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
