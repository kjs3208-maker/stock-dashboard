"use client";

import { useState } from "react";
import { Holding, Transaction, TransactionType } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

interface TransactionsPanelProps {
  holding: Holding;
  onAdd: (transaction: Omit<Transaction, "id">) => void;
  onDelete: (transactionId: string) => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionsPanel({ holding, onAdd, onDelete }: TransactionsPanelProps) {
  const [type, setType] = useState<TransactionType>("buy");
  const [date, setDate] = useState(todayIso());
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [fee, setFee] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sorted = [...holding.transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  function handleAdd() {
    const qty = Number(quantity);
    const p = Number(price);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("수량은 0보다 큰 숫자여야 합니다.");
      return;
    }
    if (!Number.isFinite(p) || p <= 0) {
      setError("가격은 0보다 큰 숫자여야 합니다.");
      return;
    }
    const feeValue = fee.trim() === "" ? undefined : Number(fee);
    if (feeValue != null && (!Number.isFinite(feeValue) || feeValue < 0)) {
      setError("수수료는 0 이상의 숫자여야 합니다.");
      return;
    }
    setError(null);
    onAdd({ type, date, quantity: qty, price: p, fee: feeValue });
    setQuantity("");
    setPrice("");
    setFee("");
  }

  return (
    <div>
      {sorted.length === 0 ? (
        <div className="mb-3 text-sm text-ink-muted">거래 내역이 없습니다.</div>
      ) : (
        <ul className="mb-3 flex max-h-52 flex-col gap-1 overflow-y-auto text-sm">
          {sorted.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-2 rounded border border-line-hairline px-2 py-1.5 dark:border-line-hairline-dark"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                    t.type === "buy"
                      ? "bg-status-critical/10 text-status-critical"
                      : "bg-status-good/10 text-status-good"
                  }`}
                >
                  {t.type === "buy" ? "매수" : "매도"}
                </span>
                <span className="text-ink-muted">{formatDate(t.date)}</span>
              </div>
              <div className="tabular-nums text-ink-primary dark:text-ink-primary-dark">
                {t.quantity}주 · {formatCurrency(t.price, holding.currency)}
                {t.fee ? (
                  <span className="text-ink-muted"> (수수료 {formatCurrency(t.fee, holding.currency)})</span>
                ) : null}
              </div>
              <button
                onClick={() => onDelete(t.id)}
                className="rounded px-1.5 py-0.5 text-xs text-status-critical hover:bg-status-critical/10"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2 border-t border-line-hairline pt-3 dark:border-line-hairline-dark">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-ink-secondary dark:text-ink-secondary-dark">구분</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TransactionType)}
            className="rounded border border-line-hairline bg-transparent px-2 py-1.5 text-sm dark:border-line-hairline-dark"
          >
            <option value="buy">매수</option>
            <option value="sell">매도</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-ink-secondary dark:text-ink-secondary-dark">날짜</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded border border-line-hairline bg-transparent px-2 py-1.5 text-sm dark:border-line-hairline-dark"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-ink-secondary dark:text-ink-secondary-dark">수량</span>
          <input
            type="number"
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-20 rounded border border-line-hairline bg-transparent px-2 py-1.5 text-sm tabular-nums dark:border-line-hairline-dark"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-ink-secondary dark:text-ink-secondary-dark">가격</span>
          <input
            type="number"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-24 rounded border border-line-hairline bg-transparent px-2 py-1.5 text-sm tabular-nums dark:border-line-hairline-dark"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-ink-secondary dark:text-ink-secondary-dark">
            수수료 (선택)
          </span>
          <input
            type="number"
            inputMode="decimal"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            className="w-24 rounded border border-line-hairline bg-transparent px-2 py-1.5 text-sm tabular-nums dark:border-line-hairline-dark"
          />
        </label>
        <button
          onClick={handleAdd}
          className="rounded bg-series-1 px-3 py-1.5 text-sm text-white hover:opacity-90"
        >
          + 거래 추가
        </button>
      </div>
      {error && <div className="mt-1 text-xs text-status-critical">{error}</div>}
    </div>
  );
}
