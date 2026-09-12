"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Holding, HistoryPoint, NewsItem, Quote } from "@/lib/types";
import { createHoldingId, loadHoldings, saveHoldings } from "@/lib/storage";
import { fetchHistory, fetchNews, fetchQuotes } from "@/lib/marketData";
import { computeHoldingMetrics, computeYearlyReturns, getEffectiveQuote } from "@/lib/portfolioMath";
import { SummaryCards } from "@/components/SummaryCards";
import { HoldingsTable, HoldingRow } from "@/components/HoldingsTable";
import { HoldingFormModal } from "@/components/HoldingFormModal";
import { AllocationChart } from "@/components/AllocationChart";
import { PriceHistoryChart } from "@/components/PriceHistoryChart";
import { YearlyReturnChart } from "@/components/YearlyReturnChart";
import { NewsPanel } from "@/components/NewsPanel";

export default function DashboardPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [historyBySymbol, setHistoryBySymbol] = useState<Record<string, HistoryPoint[]>>({});
  const [historyMockBySymbol, setHistoryMockBySymbol] = useState<Record<string, boolean>>({});
  const [newsBySymbol, setNewsBySymbol] = useState<Record<string, NewsItem[]>>({});
  const [newsMockBySymbol, setNewsMockBySymbol] = useState<Record<string, boolean>>({});
  const newsFetchingRef = useRef<Set<string>>(new Set());
  const [userSelectedSymbol, setUserSelectedSymbol] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);

  // Load persisted holdings once on mount (client-only: localStorage isn't
  // available during SSR, so the first render is intentionally empty). This
  // syncs from an external, non-reactive store; there's no render-time
  // equivalent that stays SSR-safe, so the lint rule is disabled here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHoldings(loadHoldings());
    setHydrated(true);
  }, []);

  // Persist on every change (after initial hydration).
  useEffect(() => {
    if (hydrated) saveHoldings(holdings);
  }, [holdings, hydrated]);

  // Fall back to the first holding whenever the user's pick is unset or no
  // longer exists - derived directly in render, no effect needed.
  const selectedSymbol =
    userSelectedSymbol && holdings.some((h) => h.symbol === userSelectedSymbol)
      ? userSelectedSymbol
      : (holdings[0]?.symbol ?? null);

  const symbols = useMemo(
    () => Array.from(new Set(holdings.map((h) => h.symbol))),
    [holdings]
  );

  // Fetch current quotes for every held symbol.
  useEffect(() => {
    if (symbols.length === 0) return;
    let cancelled = false;
    fetchQuotes(symbols).then((map) => {
      if (!cancelled) setQuotes((prev) => ({ ...prev, ...map }));
    });
    return () => {
      cancelled = true;
    };
  }, [symbols]);

  // Fetch history for symbols not yet cached (used by both the price chart
  // and the yearly-return aggregate calculation).
  useEffect(() => {
    const missing = symbols.filter((s) => !(s in historyBySymbol));
    if (missing.length === 0) return;
    let cancelled = false;
    missing.forEach((symbol) => {
      fetchHistory(symbol, 5).then((result) => {
        if (cancelled) return;
        setHistoryBySymbol((prev) => ({ ...prev, [symbol]: result.points }));
        setHistoryMockBySymbol((prev) => ({ ...prev, [symbol]: result.isMock }));
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols]);

  // Fetch news lazily for the currently selected symbol.
  useEffect(() => {
    if (!selectedSymbol || selectedSymbol in newsBySymbol) return;
    if (newsFetchingRef.current.has(selectedSymbol)) return;
    const holding = holdings.find((h) => h.symbol === selectedSymbol);
    if (!holding) return;
    newsFetchingRef.current.add(selectedSymbol);
    fetchNews(selectedSymbol, holding.name).then((result) => {
      newsFetchingRef.current.delete(selectedSymbol);
      setNewsBySymbol((prev) => ({ ...prev, [selectedSymbol]: result.items }));
      setNewsMockBySymbol((prev) => ({ ...prev, [selectedSymbol]: result.isMock }));
    });
  }, [selectedSymbol, holdings, newsBySymbol]);

  const rows: HoldingRow[] = useMemo(
    () =>
      holdings.map((holding) => {
        const quote = getEffectiveQuote(holding, quotes);
        const metrics = computeHoldingMetrics(holding, quote);
        return {
          holding,
          quote,
          marketValue: metrics.marketValue,
          pnl: metrics.pnl,
          pnlPercent: metrics.pnlPercent,
        };
      }),
    [holdings, quotes]
  );

  const summary = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    let dayChange = 0;
    let best: { symbol: string; percent: number } | null = null;
    let worst: { symbol: string; percent: number } | null = null;

    for (const holding of holdings) {
      const quote = getEffectiveQuote(holding, quotes);
      const metrics = computeHoldingMetrics(holding, quote);
      totalValue += metrics.marketValue;
      totalCost += metrics.costBasis;
      dayChange += metrics.dayChange;
      if (quote) {
        if (!best || metrics.pnlPercent > best.percent) {
          best = { symbol: holding.symbol, percent: metrics.pnlPercent };
        }
        if (!worst || metrics.pnlPercent < worst.percent) {
          worst = { symbol: holding.symbol, percent: metrics.pnlPercent };
        }
      }
    }

    const totalPnl = totalValue - totalCost;
    const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
    const prevTotalValue = totalValue - dayChange;
    const dayChangePercent = prevTotalValue > 0 ? (dayChange / prevTotalValue) * 100 : 0;
    const currencies = new Set(holdings.map((h) => h.currency));
    const primaryCurrency = holdings[0]?.currency ?? "KRW";

    return {
      totalValue,
      totalCost,
      totalPnl,
      totalPnlPercent,
      dayChange,
      dayChangePercent,
      bestSymbol: best ? (best as { symbol: string }).symbol : null,
      bestPercent: best ? (best as { percent: number }).percent : 0,
      worstSymbol: worst ? (worst as { symbol: string }).symbol : null,
      worstPercent: worst ? (worst as { percent: number }).percent : 0,
      currency: primaryCurrency,
      mixedCurrency: currencies.size > 1,
    };
  }, [holdings, quotes]);

  const yearlyReturns = useMemo(
    () => computeYearlyReturns(holdings, historyBySymbol),
    [holdings, historyBySymbol]
  );

  const allocationSlices = useMemo(
    () =>
      rows
        .filter((r) => r.marketValue > 0)
        .map((r) => ({
          symbol: r.holding.symbol,
          name: r.holding.name,
          value: r.marketValue,
          currency: r.holding.currency,
        })),
    [rows]
  );

  function handleSave(values: Omit<Holding, "id"> & { id?: string }) {
    setHoldings((prev) => {
      if (values.id) {
        return prev.map((h) => (h.id === values.id ? { ...h, ...values, id: h.id } : h));
      }
      return [...prev, { ...values, id: createHoldingId() }];
    });
    setModalOpen(false);
    setEditingHolding(null);
  }

  function handleDelete(holding: Holding) {
    if (!window.confirm(`${holding.name} (${holding.symbol}) 종목을 삭제할까요?`)) return;
    setHoldings((prev) => prev.filter((h) => h.id !== holding.id));
  }

  const selectedHolding = holdings.find((h) => h.symbol === selectedSymbol) ?? null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-primary dark:text-ink-primary-dark">
            주식 관리 대시보드
          </h1>
          <p className="text-sm text-ink-secondary dark:text-ink-secondary-dark">
            보유 종목, 손익 현황, 포트폴리오 통계를 한눈에 확인하세요.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingHolding(null);
            setModalOpen(true);
          }}
          className="rounded bg-series-1 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + 종목 추가
        </button>
      </div>

      {summary.mixedCurrency && holdings.length > 0 && (
        <div className="mb-4 rounded border border-status-warning/40 bg-status-warning/10 px-3 py-2 text-xs text-status-warning">
          여러 통화의 종목을 함께 보유하고 있어 요약 지표는 환율 미반영 근사치입니다.
        </div>
      )}

      <div className="mb-6">
        <SummaryCards {...summary} />
      </div>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-ink-secondary dark:text-ink-secondary-dark">
          보유 종목 목록 및 손익 현황
        </h2>
        <HoldingsTable
          rows={rows}
          selectedSymbol={selectedSymbol}
          onSelect={setUserSelectedSymbol}
          onEdit={(h) => {
            setEditingHolding(h);
            setModalOpen(true);
          }}
          onDelete={handleDelete}
        />
      </section>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-line-hairline p-4 dark:border-line-hairline-dark">
          <h2 className="mb-3 text-sm font-semibold text-ink-secondary dark:text-ink-secondary-dark">
            자산 배분
          </h2>
          <AllocationChart slices={allocationSlices} />
        </section>

        <section className="rounded-lg border border-line-hairline p-4 dark:border-line-hairline-dark">
          <h2 className="mb-3 text-sm font-semibold text-ink-secondary dark:text-ink-secondary-dark">
            연도별 포트폴리오 수익률
          </h2>
          <YearlyReturnChart data={yearlyReturns} />
        </section>
      </div>

      {selectedHolding && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-line-hairline p-4 dark:border-line-hairline-dark">
            <h2 className="mb-3 text-sm font-semibold text-ink-secondary dark:text-ink-secondary-dark">
              {selectedHolding.name} ({selectedHolding.symbol}) 가격 추이
            </h2>
            <PriceHistoryChart
              points={historyBySymbol[selectedHolding.symbol] ?? []}
              currency={quotes[selectedHolding.symbol]?.currency ?? selectedHolding.currency}
              isMock={historyMockBySymbol[selectedHolding.symbol] ?? false}
            />
          </section>

          <section className="rounded-lg border border-line-hairline p-4 dark:border-line-hairline-dark">
            <h2 className="mb-3 text-sm font-semibold text-ink-secondary dark:text-ink-secondary-dark">
              {selectedHolding.name} 관련 최근 뉴스
            </h2>
            <NewsPanel
              items={newsBySymbol[selectedHolding.symbol] ?? []}
              isLoading={!(selectedHolding.symbol in newsBySymbol)}
              isMock={newsMockBySymbol[selectedHolding.symbol] ?? false}
            />
          </section>
        </div>
      )}

      <HoldingFormModal
        key={`${modalOpen}:${editingHolding?.id ?? "new"}`}
        open={modalOpen}
        initial={editingHolding}
        onClose={() => {
          setModalOpen(false);
          setEditingHolding(null);
        }}
        onSave={handleSave}
      />
    </main>
  );
}
