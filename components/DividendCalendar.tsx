"use client";

import { Holding } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

interface DividendCalendarProps {
  holdings: Holding[];
}

export function DividendCalendar({ holdings }: DividendCalendarProps) {
  const entries = holdings
    .flatMap((h) => h.dividends.map((d) => ({ holding: h, dividend: d })))
    .sort((a, b) => new Date(a.dividend.date).getTime() - new Date(b.dividend.date).getTime());

  if (entries.length === 0) {
    return (
      <div className="text-sm text-ink-muted">
        등록된 배당금이 없습니다. 종목을 선택해 배당금을 추가해 보세요.
      </div>
    );
  }

  const groups = new Map<string, typeof entries>();
  for (const entry of entries) {
    const monthKey = entry.dividend.date.slice(0, 7); // YYYY-MM
    const group = groups.get(monthKey) ?? [];
    group.push(entry);
    groups.set(monthKey, group);
  }

  return (
    <div className="flex flex-col gap-4">
      {Array.from(groups.entries()).map(([month, group]) => (
        <div key={month}>
          <h3 className="mb-2 text-xs font-semibold text-ink-muted">{month}</h3>
          <ul className="flex flex-col gap-1.5">
            {group.map(({ holding, dividend }) => (
              <li
                key={dividend.id}
                className="flex items-center justify-between gap-2 rounded border border-line-hairline px-3 py-2 text-sm dark:border-line-hairline-dark"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                      dividend.status === "confirmed"
                        ? "bg-status-good/10 text-status-good"
                        : "bg-status-warning/10 text-status-warning"
                    }`}
                  >
                    {dividend.status === "confirmed" ? "확정" : "예상"}
                  </span>
                  <span className="text-ink-primary dark:text-ink-primary-dark">
                    {holding.name}
                  </span>
                  <span className="text-xs text-ink-muted">{formatDate(dividend.date)}</span>
                </div>
                <span className="tabular-nums text-ink-primary dark:text-ink-primary-dark">
                  {formatCurrency(dividend.confirmedAmount ?? dividend.expectedAmount, holding.currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
