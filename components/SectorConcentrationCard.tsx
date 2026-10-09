"use client";

import { SectorExposure } from "@/lib/portfolioMath";
import { formatCurrency, formatPercent } from "@/lib/format";

interface SectorConcentrationCardProps {
  exposures: SectorExposure[];
  warnThresholdPercent: number;
  currency: string;
}

export function SectorConcentrationCard({
  exposures,
  warnThresholdPercent,
  currency,
}: SectorConcentrationCardProps) {
  if (exposures.length === 0) {
    return (
      <div className="text-sm text-ink-muted">
        종목 추가/수정 화면에서 &quot;섹터/테마&quot;를 입력하면, 섹터별 비중과 집중도 경고가 여기
        표시됩니다. (예: 반도체, 전력인프라, 화장품)
      </div>
    );
  }

  const over = exposures.filter((e) => e.percent > warnThresholdPercent);

  return (
    <div className="flex flex-col gap-3">
      {over.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {over.map((e) => (
            <div
              key={e.sector}
              className="rounded border border-status-critical/30 bg-status-critical/10 px-3 py-2 text-xs text-status-critical"
            >
              ⚠️ &quot;{e.sector}&quot; 비중이 {formatPercent(e.percent, 1)}로 경고 기준(
              {warnThresholdPercent}%)을 넘었습니다.
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-2">
        {exposures.map((e) => (
          <div key={e.sector}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-ink-primary dark:text-ink-primary-dark">{e.sector}</span>
              <span className="tabular-nums text-ink-muted">
                {formatCurrency(e.valueInBase, currency)} ({formatPercent(e.percent, 1)})
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded bg-series-1/15">
              <div
                className={`h-full rounded transition-all ${
                  e.percent > warnThresholdPercent ? "bg-status-critical" : "bg-series-1"
                }`}
                style={{ width: `${Math.min(100, e.percent)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
