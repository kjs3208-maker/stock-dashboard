"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { HistoryPoint } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

interface PriceHistoryChartProps {
  points: HistoryPoint[];
  currency: string;
  isMock: boolean;
}

function CustomTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  currency: string;
}) {
  if (!active || !payload || payload.length === 0 || !label) return null;
  return (
    <div className="rounded border border-line-hairline bg-surface px-3 py-2 text-xs shadow-md dark:border-line-hairline-dark dark:bg-surface-dark">
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-0.5 w-3 rounded bg-series-1" />
        <span className="tabular-nums font-semibold text-ink-primary dark:text-ink-primary-dark">
          {formatCurrency(payload[0].value, currency)}
        </span>
      </div>
      <div className="mt-0.5 text-ink-muted">{formatDate(label)}</div>
    </div>
  );
}

export function PriceHistoryChart({
  points,
  currency,
  isMock,
}: PriceHistoryChartProps) {
  if (points.length === 0) {
    return <div className="text-sm text-ink-muted">가격 데이터가 없습니다.</div>;
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e1e0d9" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => formatDate(v)}
            tick={{ fontSize: 11, fill: "#898781" }}
            axisLine={{ stroke: "#c3c2b7" }}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#898781" }}
            axisLine={false}
            tickLine={false}
            width={56}
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => formatCurrency(v, currency)}
          />
          <Tooltip
            content={<CustomTooltip currency={currency} />}
            cursor={{ stroke: "#c3c2b7", strokeWidth: 1 }}
          />
          <Line
            type="monotone"
            dataKey="close"
            stroke="#2a78d6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: "#fcfcfb", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
      {isMock && (
        <div className="mt-1 text-xs text-status-warning">
          실시간 데이터 연동 실패 - 모의 데이터로 표시 중입니다.
        </div>
      )}
    </div>
  );
}
