"use client";

import { useState } from "react";
import { YearlyReturnOverrides } from "@/lib/storage";

interface YearlyReturnOverrideFormProps {
  years: number[];
  overrides: YearlyReturnOverrides;
  onChange: (year: number, value: number | null) => void;
}

export function YearlyReturnOverrideForm({
  years,
  overrides,
  onChange,
}: YearlyReturnOverrideFormProps) {
  const [drafts, setDrafts] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const year of years) {
      if (overrides[year] != null) initial[year] = String(overrides[year]);
    }
    return initial;
  });

  function commit(year: number, raw: string) {
    if (raw.trim() === "") {
      onChange(year, null);
      return;
    }
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) onChange(year, parsed);
  }

  return (
    <div className="mt-3 border-t border-line-hairline pt-3 dark:border-line-hairline-dark">
      <p className="mb-2 text-xs text-ink-secondary dark:text-ink-secondary-dark">
        연도별 수익률 직접 입력 (비워두면 자동 계산값 사용)
      </p>
      <div className="flex flex-wrap gap-3">
        {years.map((year) => (
          <label key={year} className="flex items-center gap-1.5 text-xs">
            <span className="text-ink-muted">{year}년</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={drafts[year] ?? ""}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [year]: e.target.value }))}
              onBlur={(e) => commit(year, e.target.value)}
              placeholder="%"
              className="w-20 rounded border border-line-hairline bg-transparent px-2 py-1 text-right tabular-nums dark:border-line-hairline-dark"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
