"use client";

import { useState } from "react";

interface TargetAmountModalProps {
  open: boolean;
  currentValue: number | null;
  currency: string;
  onClose: () => void;
  onSave: (value: number | null) => void;
}

export function TargetAmountModal({
  open,
  currentValue,
  currency,
  onClose,
  onSave,
}: TargetAmountModalProps) {
  const [value, setValue] = useState(currentValue != null ? String(currentValue) : "");

  if (!open) return null;

  function handleSave() {
    if (value.trim() === "") {
      onSave(null);
      return;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    onSave(parsed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg border border-line-hairline bg-surface p-5 shadow-lg dark:border-line-hairline-dark dark:bg-surface-dark">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-primary dark:text-ink-primary-dark">
            올해 목표금액 설정
          </h2>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-ink-muted hover:bg-plane dark:hover:bg-plane-dark"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-secondary dark:text-ink-secondary-dark">
            목표 총자산 ({currency})
          </span>
          <input
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="비워두면 목표 진행률이 표시되지 않습니다"
            className="rounded border border-line-hairline bg-transparent px-3 py-2 tabular-nums dark:border-line-hairline-dark"
          />
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded border border-line-hairline px-4 py-2 text-sm dark:border-line-hairline-dark"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="rounded bg-series-1 px-4 py-2 text-sm text-white hover:opacity-90"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
