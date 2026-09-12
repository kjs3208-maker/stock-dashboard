"use client";

import { useState } from "react";
import { Account } from "@/lib/types";
import { createAccountId } from "@/lib/storage";

interface AccountManagerModalProps {
  open: boolean;
  accounts: Account[];
  onClose: () => void;
  onSave: (accounts: Account[]) => void;
}

const CURRENCIES = ["KRW", "USD", "JPY", "EUR", "HKD"];

export function AccountManagerModal({
  open,
  accounts,
  onClose,
  onSave,
}: AccountManagerModalProps) {
  // Remounted (via parent `key`) each time it opens, so this local copy -
  // not an effect - is what resets the draft to the latest saved accounts.
  const [draft, setDraft] = useState<Account[]>(accounts);

  if (!open) return null;

  function updateRow(id: string, patch: Partial<Account>) {
    setDraft((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function addRow() {
    setDraft((prev) => [
      ...prev,
      { id: createAccountId(), name: "", currency: "KRW", cashBalance: 0, totalDeposited: 0 },
    ]);
  }

  function removeRow(id: string) {
    setDraft((prev) => prev.filter((a) => a.id !== id));
  }

  function handleSave() {
    const cleaned = draft
      .map((a) => ({ ...a, name: a.name.trim() }))
      .filter((a) => a.name.length > 0);
    onSave(cleaned);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg border border-line-hairline bg-surface p-5 shadow-lg dark:border-line-hairline-dark dark:bg-surface-dark">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-primary dark:text-ink-primary-dark">
            계좌 관리
          </h2>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-ink-muted hover:bg-plane dark:hover:bg-plane-dark"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <p className="mb-3 text-xs text-ink-muted">
          예수금은 지금 계좌에 남아있는 현금, 계좌투입금은 지금까지 이 계좌에 넣은 총 금액입니다.
          둘은 따로 관리되며, 총자산·투입금 대비 달성률 계산에 각각 쓰입니다.
        </p>

        <div className="flex flex-col gap-3">
          {draft.map((a) => (
            <div key={a.id} className="rounded border border-line-hairline p-2 dark:border-line-hairline-dark">
              <div className="flex items-center gap-2">
                <input
                  value={a.name}
                  onChange={(e) => updateRow(a.id, { name: e.target.value })}
                  placeholder="계좌 이름 (예: 키움-일반)"
                  className="min-w-0 flex-1 rounded border border-line-hairline bg-transparent px-2 py-1.5 text-sm dark:border-line-hairline-dark"
                />
                <select
                  value={a.currency}
                  onChange={(e) => updateRow(a.id, { currency: e.target.value })}
                  className="rounded border border-line-hairline bg-transparent px-2 py-1.5 text-sm dark:border-line-hairline-dark"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => removeRow(a.id)}
                  className="rounded px-2 py-1.5 text-xs text-status-critical hover:bg-status-critical/10"
                >
                  삭제
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-ink-secondary dark:text-ink-secondary-dark">예수금</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={a.cashBalance}
                    onChange={(e) => updateRow(a.id, { cashBalance: Number(e.target.value) })}
                    className="rounded border border-line-hairline bg-transparent px-2 py-1.5 text-right text-sm tabular-nums dark:border-line-hairline-dark"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-ink-secondary dark:text-ink-secondary-dark">
                    계좌투입금 (누적)
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={a.totalDeposited}
                    onChange={(e) => updateRow(a.id, { totalDeposited: Number(e.target.value) })}
                    className="rounded border border-line-hairline bg-transparent px-2 py-1.5 text-right text-sm tabular-nums dark:border-line-hairline-dark"
                  />
                </label>
              </div>
            </div>
          ))}
          {draft.length === 0 && (
            <div className="rounded border border-dashed border-line-hairline p-4 text-center text-sm text-ink-muted dark:border-line-hairline-dark">
              등록된 계좌가 없습니다. 아래에서 추가해 보세요.
            </div>
          )}
        </div>

        <button
          onClick={addRow}
          className="mt-3 rounded border border-line-hairline px-3 py-1.5 text-sm text-series-1 hover:bg-series-1/10 dark:border-line-hairline-dark"
        >
          + 계좌 추가
        </button>

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
