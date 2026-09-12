"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
  LabelList,
} from "recharts";
import { YearlyReturnPoint } from "@/lib/portfolioMath";
import { formatCurrency } from "@/lib/format";

interface YearlyReturnChartProps {
  data: YearlyReturnPoint[];
  currency: string;
}

const GOOD = "#0ca30c";
const CRITICAL = "#d03b3b";

function CustomTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: { payload: YearlyReturnPoint }[];
  currency: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const color = point.amount >= 0 ? GOOD : CRITICAL;
  return (
    <div className="rounded border border-line-hairline bg-surface px-3 py-2 text-xs shadow-md dark:border-line-hairline-dark dark:bg-surface-dark">
      <div className="flex items-center gap-1.5">
        <span
          className="inline-block h-2.5 w-2.5 rounded-sm"
          style={{ backgroundColor: color }}
        />
        <span className="tabular-nums font-semibold text-ink-primary dark:text-ink-primary-dark">
          {point.amount >= 0 ? "+" : ""}
          {formatCurrency(point.amount, currency)}
        </span>
      </div>
      <div className="mt-0.5 text-ink-muted">
        {point.year}년 실현손익{point.isManual ? " · 직접입력" : ""}
      </div>
    </div>
  );
}

export function YearlyReturnChart({ data, currency }: YearlyReturnChartProps) {
  if (data.length === 0) {
    return (
      <div className="text-sm text-ink-muted">
        연도별 실현손익을 계산하려면 매도 거래내역이 필요합니다. 아래에서 직접 입력할 수도
        있습니다.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 20, right: 12, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="year"
          tick={{ fontSize: 11, fill: "#898781" }}
          axisLine={{ stroke: "#c3c2b7" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#898781" }}
          axisLine={false}
          tickLine={false}
          width={64}
          tickFormatter={(v: number) => formatCurrency(v, currency)}
        />
        <ReferenceLine y={0} stroke="#c3c2b7" />
        <Tooltip
          content={<CustomTooltip currency={currency} />}
          cursor={{ fill: "rgba(137,135,129,0.08)" }}
        />
        <Bar dataKey="amount" maxBarSize={40} radius={[4, 4, 4, 4]}>
          {data.map((d) => (
            <Cell key={d.year} fill={d.amount >= 0 ? GOOD : CRITICAL} />
          ))}
          <LabelList
            dataKey="amount"
            position="top"
            formatter={(v: unknown) => (typeof v === "number" ? formatCurrency(v, currency) : "")}
            style={{ fontSize: 11, fill: "#52514e" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
