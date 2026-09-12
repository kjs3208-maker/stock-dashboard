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
import { formatPercent } from "@/lib/format";

interface YearlyReturnChartProps {
  data: YearlyReturnPoint[];
}

const GOOD = "#0ca30c";
const CRITICAL = "#d03b3b";

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: YearlyReturnPoint }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const color = point.returnPercent >= 0 ? GOOD : CRITICAL;
  return (
    <div className="rounded border border-line-hairline bg-surface px-3 py-2 text-xs shadow-md dark:border-line-hairline-dark dark:bg-surface-dark">
      <div className="flex items-center gap-1.5">
        <span
          className="inline-block h-2.5 w-2.5 rounded-sm"
          style={{ backgroundColor: color }}
        />
        <span className="tabular-nums font-semibold text-ink-primary dark:text-ink-primary-dark">
          {formatPercent(point.returnPercent)}
        </span>
      </div>
      <div className="mt-0.5 text-ink-muted">{point.year}년</div>
    </div>
  );
}

export function YearlyReturnChart({ data }: YearlyReturnChartProps) {
  if (data.length === 0) {
    return (
      <div className="text-sm text-ink-muted">
        연도별 수익을 계산하려면 가격 히스토리 데이터가 필요합니다.
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
          width={48}
          tickFormatter={(v: number) => `${v}%`}
        />
        <ReferenceLine y={0} stroke="#c3c2b7" />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(137,135,129,0.08)" }} />
        <Bar dataKey="returnPercent" maxBarSize={40} radius={[4, 4, 4, 4]}>
          {data.map((d) => (
            <Cell key={d.year} fill={d.returnPercent >= 0 ? GOOD : CRITICAL} />
          ))}
          <LabelList
            dataKey="returnPercent"
            position="top"
            formatter={(v: unknown) => (typeof v === "number" ? formatPercent(v, 1) : "")}
            style={{ fontSize: 11, fill: "#52514e" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
