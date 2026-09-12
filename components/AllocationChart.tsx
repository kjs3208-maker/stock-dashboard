"use client";

import { useMemo, useState } from "react";
import { formatCurrency, formatPercent } from "@/lib/format";

export interface AllocationSlice {
  symbol: string;
  name: string;
  value: number; // market value in the holding's own currency
  currency: string;
}

interface AllocationChartProps {
  slices: AllocationSlice[];
}

const SERIES_COLORS = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#4a3aa7",
  "#e34948",
];

const MAX_SLOTS = 8;

export function AllocationChart({ slices }: AllocationChartProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const { segments, mixedCurrency } = useMemo(() => {
    const sorted = [...slices].sort((a, b) => b.value - a.value);
    const currencies = new Set(sorted.map((s) => s.currency));
    const total = sorted.reduce((sum, s) => sum + s.value, 0);

    let visible = sorted;
    let other: AllocationSlice | null = null;
    if (sorted.length > MAX_SLOTS) {
      visible = sorted.slice(0, MAX_SLOTS - 1);
      const rest = sorted.slice(MAX_SLOTS - 1);
      other = {
        symbol: "OTHER",
        name: "기타",
        value: rest.reduce((sum, s) => sum + s.value, 0),
        currency: rest[0]?.currency ?? "",
      };
    }
    const all = other ? [...visible, other] : visible;

    return {
      segments: all.map((s, i) => ({
        ...s,
        percent: total > 0 ? (s.value / total) * 100 : 0,
        color: SERIES_COLORS[i % SERIES_COLORS.length],
      })),
      mixedCurrency: currencies.size > 1,
    };
  }, [slices]);

  if (segments.length === 0) {
    return (
      <div className="text-sm text-ink-muted">표시할 보유 종목이 없습니다.</div>
    );
  }

  return (
    <div>
      <div className="flex h-8 w-full overflow-hidden rounded" role="img" aria-label="종목별 자산 배분 비율">
        {segments.map((seg, i) => (
          <div
            key={seg.symbol}
            style={{
              width: `${seg.percent}%`,
              backgroundColor: seg.color,
              marginLeft: i === 0 ? 0 : "2px",
            }}
            className="relative h-full transition-opacity"
            onMouseEnter={() => setHovered(seg.symbol)}
            onMouseLeave={() => setHovered(null)}
            tabIndex={0}
            onFocus={() => setHovered(seg.symbol)}
            onBlur={() => setHovered(null)}
          >
            {hovered === seg.symbol && (
              <div className="absolute -top-16 left-1/2 z-10 w-max -translate-x-1/2 rounded border border-line-hairline bg-surface px-2 py-1 text-xs shadow-md dark:border-line-hairline-dark dark:bg-surface-dark">
                <div className="font-semibold tabular-nums text-ink-primary dark:text-ink-primary-dark">
                  {formatPercent(seg.percent, 1)}
                </div>
                <div className="text-ink-secondary dark:text-ink-secondary-dark">
                  {seg.name} ({seg.symbol})
                </div>
                {seg.symbol !== "OTHER" && (
                  <div className="tabular-nums text-ink-muted">
                    {formatCurrency(seg.value, seg.currency)}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
        {segments.map((seg) => (
          <div key={seg.symbol} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-ink-primary dark:text-ink-primary-dark">
              {seg.name}
            </span>
            <span className="tabular-nums text-ink-muted">
              {formatPercent(seg.percent, 1)}
            </span>
          </div>
        ))}
      </div>

      {mixedCurrency && (
        <div className="mt-2 text-xs text-status-warning">
          여러 통화가 섞여 있어 환율 미반영 근사치입니다.
        </div>
      )}
    </div>
  );
}
