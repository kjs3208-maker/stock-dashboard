"use client";

import { FormEvent, useState } from "react";
import { Holding } from "@/lib/types";

interface HoldingFormModalProps {
  open: boolean;
  initial?: Holding | null;
  onClose: () => void;
  onSave: (values: Omit<Holding, "id"> & { id?: string }) => void;
}

const CURRENCIES = ["KRW", "USD", "JPY", "EUR", "HKD"];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function HoldingFormModal({
  open,
  initial,
  onClose,
  onSave,
}: HoldingFormModalProps) {
  // The parent remounts this component (via a changing `key`) every time the
  // modal opens, so these initializers - not an effect - are what "resets"
  // the form for a new add/edit target.
  const [symbol, setSymbol] = useState(initial?.symbol ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [quantity, setQuantity] = useState(initial ? String(initial.quantity) : "");
  const [avgBuyPrice, setAvgBuyPrice] = useState(initial ? String(initial.avgBuyPrice) : "");
  const [currency, setCurrency] = useState(initial?.currency ?? "KRW");
  const [buyDate, setBuyDate] = useState(initial?.buyDate ?? todayIso());
  const [useManualPrice, setUseManualPrice] = useState(initial?.manualPrice != null);
  const [manualPrice, setManualPrice] = useState(
    initial?.manualPrice != null ? String(initial.manualPrice) : ""
  );
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedSymbol = symbol.trim().toUpperCase();
    const trimmedName = name.trim();
    const qty = Number(quantity);
    const price = Number(avgBuyPrice);

    if (!trimmedSymbol) {
      setError("종목 코드(티커)를 입력해 주세요. 예: AAPL, 005930.KS");
      return;
    }
    if (!trimmedName) {
      setError("종목명을 입력해 주세요.");
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("수량은 0보다 큰 숫자여야 합니다.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError("매입가는 0보다 큰 숫자여야 합니다.");
      return;
    }

    let manualPriceValue: number | undefined;
    if (useManualPrice) {
      manualPriceValue = Number(manualPrice);
      if (!Number.isFinite(manualPriceValue) || manualPriceValue <= 0) {
        setError("현재가는 0보다 큰 숫자여야 합니다.");
        return;
      }
    }

    onSave({
      id: initial?.id,
      symbol: trimmedSymbol,
      name: trimmedName,
      quantity: qty,
      avgBuyPrice: price,
      currency,
      buyDate,
      manualPrice: manualPriceValue,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg border border-line-hairline bg-surface p-5 shadow-lg dark:border-line-hairline-dark dark:bg-surface-dark">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-primary dark:text-ink-primary-dark">
            {initial ? "종목 수정" : "종목 추가"}
          </h2>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-ink-muted hover:bg-plane dark:hover:bg-plane-dark"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-secondary dark:text-ink-secondary-dark">
              종목 코드 (티커)
            </span>
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="예: AAPL, 005930.KS"
              disabled={!!initial}
              className="rounded border border-line-hairline bg-transparent px-3 py-2 disabled:opacity-60 dark:border-line-hairline-dark"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-secondary dark:text-ink-secondary-dark">종목명</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: Apple Inc."
              className="rounded border border-line-hairline bg-transparent px-3 py-2 dark:border-line-hairline-dark"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-secondary dark:text-ink-secondary-dark">수량</span>
              <input
                type="number"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="rounded border border-line-hairline bg-transparent px-3 py-2 tabular-nums dark:border-line-hairline-dark"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-secondary dark:text-ink-secondary-dark">
                평균 매입가
              </span>
              <input
                type="number"
                inputMode="decimal"
                value={avgBuyPrice}
                onChange={(e) => setAvgBuyPrice(e.target.value)}
                className="rounded border border-line-hairline bg-transparent px-3 py-2 tabular-nums dark:border-line-hairline-dark"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-secondary dark:text-ink-secondary-dark">통화</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="rounded border border-line-hairline bg-transparent px-3 py-2 dark:border-line-hairline-dark"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-secondary dark:text-ink-secondary-dark">매수일</span>
              <input
                type="date"
                value={buyDate}
                onChange={(e) => setBuyDate(e.target.value)}
                className="rounded border border-line-hairline bg-transparent px-3 py-2 dark:border-line-hairline-dark"
              />
            </label>
          </div>

          <div className="rounded border border-line-hairline p-3 dark:border-line-hairline-dark">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useManualPrice}
                onChange={(e) => setUseManualPrice(e.target.checked)}
              />
              <span className="text-ink-secondary dark:text-ink-secondary-dark">
                현재가 직접 입력 (K-OTC 등 자동 시세 조회가 안 되는 종목용)
              </span>
            </label>
            {useManualPrice && (
              <input
                type="number"
                inputMode="decimal"
                value={manualPrice}
                onChange={(e) => setManualPrice(e.target.value)}
                placeholder="예: 12500"
                className="mt-2 w-full rounded border border-line-hairline bg-transparent px-3 py-2 tabular-nums dark:border-line-hairline-dark"
              />
            )}
            {useManualPrice && (
              <p className="mt-1 text-xs text-ink-muted">
                이 종목은 실시간 조회 대신 여기 입력한 가격으로 손익이 계산되며, 값이 바뀌면 직접 수정해 주셔야 합니다.
              </p>
            )}
          </div>

          {error && <div className="text-sm text-status-critical">{error}</div>}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-line-hairline px-4 py-2 text-sm dark:border-line-hairline-dark"
            >
              취소
            </button>
            <button
              type="submit"
              className="rounded bg-series-1 px-4 py-2 text-sm text-white hover:opacity-90"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
