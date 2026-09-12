"use client";

import { useState } from "react";
import { Dividend, Holding } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

interface DividendsPanelProps {
  holding: Holding;
  onAdd: (dividend: { date: string; expectedAmount: number }) => void;
  onConfirm: (dividendId: string, confirmedAmount: number) => void;
  onDelete: (dividendId: string) => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DividendsPanel({ holding, onAdd, onConfirm, onDelete }: DividendsPanelProps) {
  const [date, setDate] = useState(todayIso());
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmAmount, setConfirmAmount] = useState("");

  const sorted = [...holding.dividends].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  function handleAdd() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("배당금은 0보다 큰 숫자여야 합니다.");
      return;
    }
    setError(null);
    onAdd({ date, expectedAmount: value });
    setAmount("");
  }

  function startConfirm(d: Dividend) {
    setConfirmingId(d.id);
    setConfirmAmount(String(d.confirmedAmount ?? d.expectedAmount));
  }

  function commitConfirm(d: Dividend) {
    const value = Number(confirmAmount);
    if (!Number.isFinite(value) || value <= 0) return;
    onConfirm(d.id, value);
    setConfirmingId(null);
  }

  return (
    <div>
      {sorted.length === 0 ? (
        <div className="mb-3 text-sm text-ink-muted">등록된 배당금이 없습니다.</div>
      ) : (
        <ul className="mb-3 flex max-h-56 flex-col gap-1 overflow-y-auto text-sm">
          {sorted.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-2 rounded border border-line-hairline px-2 py-1.5 dark:border-line-hairline-dark"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                    d.status === "confirmed"
                      ? "bg-status-good/10 text-status-good"
                      : "bg-status-warning/10 text-status-warning"
                  }`}
                >
                  {d.status === "confirmed" ? "확정" : "예상"}
                </span>
                <span className="text-ink-muted">{formatDate(d.date)}</span>
              </div>

              {confirmingId === d.id ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={confirmAmount}
                    onChange={(e) => setConfirmAmount(e.target.value)}
                    className="w-24 rounded border border-line-hairline bg-transparent px-2 py-1 text-right text-sm tabular-nums dark:border-line-hairline-dark"
                  />
                  <button
                    onClick={() => commitConfirm(d)}
                    className="rounded bg-series-1 px-2 py-1 text-xs text-white hover:opacity-90"
                  >
                    확인
                  </button>
                  <button
                    onClick={() => setConfirmingId(null)}
                    className="rounded px-2 py-1 text-xs text-ink-muted hover:bg-plane dark:hover:bg-plane-dark"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="tabular-nums text-ink-primary dark:text-ink-primary-dark">
                    {formatCurrency(d.confirmedAmount ?? d.expectedAmount, holding.currency)}
                  </span>
                  {d.status === "expected" && (
                    <button
                      onClick={() => startConfirm(d)}
                      className="rounded px-1.5 py-0.5 text-xs text-series-1 hover:bg-series-1/10"
                    >
                      확정
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(d.id)}
                    className="rounded px-1.5 py-0.5 text-xs text-status-critical hover:bg-status-critical/10"
                  >
                    삭제
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2 border-t border-line-hairline pt-3 dark:border-line-hairline-dark">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-ink-secondary dark:text-ink-secondary-dark">예상 지급일</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded border border-line-hairline bg-transparent px-2 py-1.5 text-sm dark:border-line-hairline-dark"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-ink-secondary dark:text-ink-secondary-dark">예상 배당금</span>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-28 rounded border border-line-hairline bg-transparent px-2 py-1.5 text-sm tabular-nums dark:border-line-hairline-dark"
          />
        </label>
        <button
          onClick={handleAdd}
          className="rounded bg-series-1 px-3 py-1.5 text-sm text-white hover:opacity-90"
        >
          + 예상 배당금 추가
        </button>
      </div>
      {error && <div className="mt-1 text-xs text-status-critical">{error}</div>}
    </div>
  );
}
