"use client";

import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { NetWorthAsset, NetWorthAssetCategory, NetWorthGoalSettings } from "@/lib/types";
import {
  findGoalCrossingYear,
  netWorthAssetNetValue,
  projectNetWorth,
  sumNetWorthAssets,
} from "@/lib/portfolioMath";
import { formatCurrency, formatPercent } from "@/lib/format";

interface NetWorthGoalPanelProps {
  stockTotalAssets: number; // this dashboard's own tracked total (주식+예수금), KRW
  assets: NetWorthAsset[];
  goal: NetWorthGoalSettings;
  onAddAsset: (asset: {
    category: NetWorthAssetCategory;
    name: string;
    grossValue: number;
    taxRatePercent: number;
    note?: string;
  }) => void;
  onDeleteAsset: (id: string) => void;
  onUpdateGoal: (patch: Partial<NetWorthGoalSettings>) => void;
}

const CATEGORIES: NetWorthAssetCategory[] = ["부동산", "RSU", "성과급(OPI)", "현금성", "기타"];

const CATEGORY_COLORS: Record<string, string> = {
  "주식(대시보드)": "#2a78d6",
  부동산: "#eb6834",
  RSU: "#1baf7a",
  "성과급(OPI)": "#eda100",
  현금성: "#4a3aa7",
  기타: "#898781",
};

const PROJECTION_YEARS = 20;

function GoalGauge({
  label,
  current,
  target,
  currency,
  etaYear,
}: {
  label: string;
  current: number;
  target: number;
  currency: string;
  etaYear: number | null;
}) {
  const percent = target > 0 ? (current / target) * 100 : 0;
  return (
    <div className="rounded-lg border border-line-hairline bg-surface p-4 dark:border-line-hairline-dark dark:bg-surface-dark">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-1 text-sm">
        <span className="text-ink-secondary dark:text-ink-secondary-dark">{label}</span>
        <span className="tabular-nums text-ink-primary dark:text-ink-primary-dark">
          {formatCurrency(current, currency)} / {formatCurrency(target, currency)} (
          {formatPercent(percent, 1)})
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded bg-series-1/15">
        <div
          className="h-full rounded bg-series-1 transition-all"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-ink-muted">
        {etaYear == null
          ? `현재 가정으로는 ${PROJECTION_YEARS}년 내 도달하지 못합니다.`
          : etaYear === 0
          ? "이미 달성했습니다."
          : `현재 가정(수익률·납입액) 유지 시 약 ${etaYear}년 후 도달 예상`}
      </div>
    </div>
  );
}

export function NetWorthGoalPanel({
  stockTotalAssets,
  assets,
  goal,
  onAddAsset,
  onDeleteAsset,
  onUpdateGoal,
}: NetWorthGoalPanelProps) {
  const [form, setForm] = useState({
    category: "부동산" as NetWorthAssetCategory,
    name: "",
    grossValue: "",
    taxRatePercent: "0",
    note: "",
  });

  const otherAssetsTotal = useMemo(() => sumNetWorthAssets(assets), [assets]);
  const totalNetWorth = stockTotalAssets + otherAssetsTotal;

  const projection = useMemo(
    () => projectNetWorth(stockTotalAssets, otherAssetsTotal, goal, PROJECTION_YEARS),
    [stockTotalAssets, otherAssetsTotal, goal]
  );
  const stockEta =
    stockTotalAssets >= goal.stockTargetAmount
      ? 0
      : findGoalCrossingYear(projection, goal.stockTargetAmount, (p) => p.stockValue);
  const totalEta =
    totalNetWorth >= goal.totalTargetAmount
      ? 0
      : findGoalCrossingYear(projection, goal.totalTargetAmount, (p) => p.totalValue);

  const donutData = useMemo(() => {
    const byCategory = new Map<string, number>();
    byCategory.set("주식(대시보드)", stockTotalAssets);
    for (const asset of assets) {
      const net = netWorthAssetNetValue(asset);
      byCategory.set(asset.category, (byCategory.get(asset.category) ?? 0) + net);
    }
    return [...byCategory.entries()]
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [assets, stockTotalAssets]);

  function handleAdd() {
    const grossValue = Number(form.grossValue);
    const taxRatePercent = Number(form.taxRatePercent);
    if (!form.name.trim() || !Number.isFinite(grossValue) || grossValue <= 0) return;
    onAddAsset({
      category: form.category,
      name: form.name.trim(),
      grossValue,
      taxRatePercent: Number.isFinite(taxRatePercent) ? taxRatePercent : 0,
      note: form.note.trim() || undefined,
    });
    setForm({ category: form.category, name: "", grossValue: "", taxRatePercent: "0", note: "" });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-ink-secondary dark:text-ink-secondary-dark">전체 순자산 목표</span>
          <input
            type="number"
            value={goal.totalTargetAmount}
            onChange={(e) => onUpdateGoal({ totalTargetAmount: Number(e.target.value) || 0 })}
            className="rounded border border-line-hairline bg-transparent px-2 py-1.5 tabular-nums dark:border-line-hairline-dark"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-ink-secondary dark:text-ink-secondary-dark">그중 주식 목표</span>
          <input
            type="number"
            value={goal.stockTargetAmount}
            onChange={(e) => onUpdateGoal({ stockTargetAmount: Number(e.target.value) || 0 })}
            className="rounded border border-line-hairline bg-transparent px-2 py-1.5 tabular-nums dark:border-line-hairline-dark"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-ink-secondary dark:text-ink-secondary-dark">가정 연수익률(주식, %)</span>
          <input
            type="number"
            value={goal.assumedAnnualReturnPercent}
            onChange={(e) =>
              onUpdateGoal({ assumedAnnualReturnPercent: Number(e.target.value) || 0 })
            }
            className="rounded border border-line-hairline bg-transparent px-2 py-1.5 tabular-nums dark:border-line-hairline-dark"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-ink-secondary dark:text-ink-secondary-dark">연간 주식 추가납입액</span>
          <input
            type="number"
            value={goal.assumedAnnualStockContribution}
            onChange={(e) =>
              onUpdateGoal({ assumedAnnualStockContribution: Number(e.target.value) || 0 })
            }
            className="rounded border border-line-hairline bg-transparent px-2 py-1.5 tabular-nums dark:border-line-hairline-dark"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-ink-secondary dark:text-ink-secondary-dark">
            주식 외 자산 가정 연성장률(%)
          </span>
          <input
            type="number"
            value={goal.otherAssetAnnualGrowthPercent}
            onChange={(e) =>
              onUpdateGoal({ otherAssetAnnualGrowthPercent: Number(e.target.value) || 0 })
            }
            className="rounded border border-line-hairline bg-transparent px-2 py-1.5 tabular-nums dark:border-line-hairline-dark"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <GoalGauge
          label="주식 포트폴리오 목표"
          current={stockTotalAssets}
          target={goal.stockTargetAmount}
          currency="KRW"
          etaYear={stockEta}
        />
        <GoalGauge
          label="전체 순자산 목표"
          current={totalNetWorth}
          target={goal.totalTargetAmount}
          currency="KRW"
          etaYear={totalEta}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">
            자산 구성 (세후 기준)
          </h3>
          {donutData.length === 0 ? (
            <div className="text-sm text-ink-muted">표시할 자산이 없습니다.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {donutData.map((d) => (
                    <Cell key={d.name} fill={CATEGORY_COLORS[d.name] ?? "#898781"} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: unknown, name: unknown) => [
                    formatCurrency(typeof value === "number" ? value : 0, "KRW"),
                    String(name),
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {donutData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: CATEGORY_COLORS[d.name] ?? "#898781" }}
                />
                <span className="text-ink-primary dark:text-ink-primary-dark">{d.name}</span>
                <span className="tabular-nums text-ink-muted">
                  {formatPercent((d.value / (totalNetWorth || 1)) * 100, 1)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">
            주식 외 자산 (부동산 · RSU · 성과급 등)
          </h3>
          <div className="flex flex-col gap-2">
            {assets.length === 0 && (
              <div className="text-sm text-ink-muted">등록된 자산이 없습니다.</div>
            )}
            {assets.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-2 rounded border border-line-hairline px-3 py-2 text-sm dark:border-line-hairline-dark"
              >
                <div>
                  <div className="text-ink-primary dark:text-ink-primary-dark">
                    [{a.category}] {a.name}
                  </div>
                  <div className="text-xs tabular-nums text-ink-muted">
                    세전 {formatCurrency(a.grossValue, "KRW")}
                    {a.taxRatePercent > 0 && (
                      <>
                        {" "}
                        · 세율 {a.taxRatePercent}% · 세후{" "}
                        {formatCurrency(netWorthAssetNetValue(a), "KRW")}
                      </>
                    )}
                    {a.note && <> · {a.note}</>}
                  </div>
                </div>
                <button
                  onClick={() => onDeleteAsset(a.id)}
                  className="shrink-0 rounded px-2 py-1 text-xs text-status-critical hover:bg-status-critical/10"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 rounded border border-line-hairline p-3 text-xs dark:border-line-hairline-dark sm:grid-cols-5">
            <select
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value as NetWorthAssetCategory }))
              }
              className="rounded border border-line-hairline bg-transparent px-2 py-1.5 dark:border-line-hairline-dark"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              placeholder="이름 (예: 자가주택)"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="rounded border border-line-hairline bg-transparent px-2 py-1.5 dark:border-line-hairline-dark"
            />
            <input
              type="number"
              placeholder="세전 금액(원)"
              value={form.grossValue}
              onChange={(e) => setForm((f) => ({ ...f, grossValue: e.target.value }))}
              className="rounded border border-line-hairline bg-transparent px-2 py-1.5 tabular-nums dark:border-line-hairline-dark"
            />
            <input
              type="number"
              placeholder="세율(%)"
              value={form.taxRatePercent}
              onChange={(e) => setForm((f) => ({ ...f, taxRatePercent: e.target.value }))}
              className="rounded border border-line-hairline bg-transparent px-2 py-1.5 tabular-nums dark:border-line-hairline-dark"
            />
            <button
              onClick={handleAdd}
              className="rounded bg-series-1 px-2 py-1.5 text-white hover:opacity-90"
            >
              + 추가
            </button>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            RSU·성과급(OPI)은 세율에 예상 근로소득세 한계세율(예: 41.8, 49.5)을 입력하면 세후
            금액이 자동 반영됩니다. 부동산·현금성은 보통 0으로 두면 됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
