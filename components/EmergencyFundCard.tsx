"use client";

import { EmergencyFundSettings } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/format";

interface EmergencyFundCardProps {
  settings: EmergencyFundSettings;
  cashLikeTotal: number; // KRW - account 예수금 + 순자산의 "현금성" 자산 합
  onUpdate: (patch: Partial<EmergencyFundSettings>) => void;
}

function statusColorClass(months: number, target: number): string {
  if (months >= target) return "text-status-good";
  if (months >= target / 2) return "text-status-warning";
  return "text-status-critical";
}

export function EmergencyFundCard({ settings, cashLikeTotal, onUpdate }: EmergencyFundCardProps) {
  const months =
    settings.monthlyEssentialExpense > 0 ? cashLikeTotal / settings.monthlyEssentialExpense : null;
  const percentOfTarget =
    months != null && settings.targetMonths > 0 ? (months / settings.targetMonths) * 100 : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 text-xs">
        <label className="flex flex-col gap-1">
          <span className="text-ink-secondary dark:text-ink-secondary-dark">월 필수 생활비</span>
          <input
            type="number"
            value={settings.monthlyEssentialExpense}
            onChange={(e) =>
              onUpdate({ monthlyEssentialExpense: Number(e.target.value) || 0 })
            }
            className="rounded border border-line-hairline bg-transparent px-2 py-1.5 tabular-nums dark:border-line-hairline-dark"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-ink-secondary dark:text-ink-secondary-dark">목표 개월수</span>
          <input
            type="number"
            value={settings.targetMonths}
            onChange={(e) => onUpdate({ targetMonths: Number(e.target.value) || 0 })}
            className="rounded border border-line-hairline bg-transparent px-2 py-1.5 tabular-nums dark:border-line-hairline-dark"
          />
        </label>
      </div>

      <div className="rounded-lg border border-line-hairline bg-surface p-4 dark:border-line-hairline-dark dark:bg-surface-dark">
        <div className="text-sm text-ink-secondary dark:text-ink-secondary-dark">
          현재 보유 현금성 자산 (계좌 예수금 + 순자산 &quot;현금성&quot; 항목)
        </div>
        <div className="mt-1 text-xl font-semibold tabular-nums text-ink-primary dark:text-ink-primary-dark">
          {formatCurrency(cashLikeTotal, "KRW")}
        </div>
        {months != null ? (
          <>
            <div className={`mt-1 text-sm tabular-nums ${statusColorClass(months, settings.targetMonths)}`}>
              목표 {settings.targetMonths}개월치 중 약 {months.toFixed(1)}개월치 확보 (
              {formatPercent(percentOfTarget, 0)})
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded bg-series-1/15">
              <div
                className={`h-full rounded transition-all ${
                  months >= settings.targetMonths
                    ? "bg-status-good"
                    : months >= settings.targetMonths / 2
                    ? "bg-status-warning"
                    : "bg-status-critical"
                }`}
                style={{ width: `${Math.min(100, percentOfTarget)}%` }}
              />
            </div>
          </>
        ) : (
          <div className="mt-1 text-sm text-ink-muted">
            월 필수 생활비를 입력하면 몇 개월치가 확보돼 있는지 계산됩니다.
          </div>
        )}
      </div>

      <p className="text-xs text-ink-muted">
        맞벌이가 같은 회사·같은 업황에 걸려 있으면(예: 부부 모두 반도체 업종) 소득이 동시에
        흔들릴 수 있어, 일반적인 3~6개월보다 여유 있게(6~12개월) 잡는 걸 권장합니다.
      </p>
    </div>
  );
}
