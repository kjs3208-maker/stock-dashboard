"use client";

import { useState } from "react";
import { Account } from "@/lib/types";
import { effectiveTotalDeposited } from "@/lib/portfolioMath";
import { formatCurrency, formatDate } from "@/lib/format";

interface AccountDepositsPanelProps {
  account: Account;
  onAdd: (deposit: { date: string; amount: number; note?: string }) => void;
  onDelete: (depositId: string) => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AccountDepositsPanel({ account, onAdd, onDelete }: AccountDepositsPanelProps) {
  const [date, setDate] = useState(todayIso());
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const deposits = account.deposits ?? [];
  const sorted = [...deposits].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  function handleAdd() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("입금액은 0보다 큰 숫자여야 합니다.");
      return;
    }
    setError(null);
    onAdd({ date, amount: value, note: note.trim() || undefined });
    setAmount("");
    setNote("");
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-ink-secondary dark:text-ink-secondary-dark">
          누적 계좌투입금{deposits.length > 0 ? " (입금 내역 합계)" : " (직접 입력값)"}
        </span>
        <span className="font-medium tabular-nums text-ink-primary dark:text-ink-primary-dark">
          {formatCurrency(effectiveTotalDeposited(account), account.currency)}
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="mb-3 text-sm text-ink-muted">
          등록된 입금 내역이 없습니다. 계속 넣으실 금액이 있다면 아래에서 건별로 추가해 보세요.
        </div>
      ) : (
        <ul className="mb-3 flex max-h-52 flex-col gap-1 overflow-y-auto text-sm">
          {sorted.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-2 rounded border border-line-hairline px-2 py-1.5 dark:border-line-hairline-dark"
            >
              <div className="flex items-center gap-2">
                <span className="text-ink-muted">{formatDate(d.date)}</span>
                {d.note && <span className="text-xs text-ink-muted">{d.note}</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="tabular-nums text-ink-primary dark:text-ink-primary-dark">
                  {formatCurrency(d.amount, account.currency)}
                </span>
                <button
                  onClick={() => onDelete(d.id)}
                  className="rounded px-1.5 py-0.5 text-xs text-status-critical hover:bg-status-critical/10"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2 border-t border-line-hairline pt-3 dark:border-line-hairline-dark">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-ink-secondary dark:text-ink-secondary-dark">입금일</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded border border-line-hairline bg-transparent px-2 py-1.5 text-sm dark:border-line-hairline-dark"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-ink-secondary dark:text-ink-secondary-dark">입금액</span>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-32 rounded border border-line-hairline bg-transparent px-2 py-1.5 text-sm tabular-nums dark:border-line-hairline-dark"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-ink-secondary dark:text-ink-secondary-dark">메모 (선택)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="예: 월 적립"
            className="w-32 rounded border border-line-hairline bg-transparent px-2 py-1.5 text-sm dark:border-line-hairline-dark"
          />
        </label>
        <button
          onClick={handleAdd}
          className="rounded bg-series-1 px-3 py-1.5 text-sm text-white hover:opacity-90"
        >
          + 입금 추가
        </button>
      </div>
      {error && <div className="mt-1 text-xs text-status-critical">{error}</div>}
      {deposits.length > 0 && (
        <p className="mt-2 text-xs text-ink-muted">
          입금 내역이 하나라도 있으면 계좌투입금은 이 내역들의 합계로 자동 계산되며, 계좌 관리의
          &quot;계좌투입금 (누적)&quot; 직접 입력값은 더 이상 쓰이지 않습니다.
        </p>
      )}
    </div>
  );
}
