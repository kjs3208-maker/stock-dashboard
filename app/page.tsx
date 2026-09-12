"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Account, Holding, HistoryPoint, NewsItem, Quote, Transaction, WatchlistItem } from "@/lib/types";
import {
  BackupData,
  createDividendId,
  createHoldingId,
  createTransactionId,
  createWatchlistId,
  importBackup,
  loadAccounts,
  loadHoldings,
  loadTargetAmount,
  loadWatchlist,
  loadYearlyReturnOverrides,
  saveAccounts,
  saveHoldings,
  saveTargetAmount,
  saveWatchlist,
  saveYearlyReturnOverrides,
  YearlyReturnOverrides,
} from "@/lib/storage";
import { fetchFxRates, fetchHistory, fetchNews, fetchQuotes } from "@/lib/marketData";
import { convertFromKRW, convertToKRW } from "@/lib/fx";
import {
  applyYearlyOverrides,
  computeHoldingMetrics,
  computeYearlyReturns,
  getEffectiveQuote,
} from "@/lib/portfolioMath";
import { SummaryCards } from "@/components/SummaryCards";
import { HoldingsTable, HoldingRow } from "@/components/HoldingsTable";
import { HoldingFormModal, HoldingFormValues } from "@/components/HoldingFormModal";
import { AllocationChart } from "@/components/AllocationChart";
import { PriceHistoryChart } from "@/components/PriceHistoryChart";
import { YearlyReturnChart } from "@/components/YearlyReturnChart";
import { YearlyReturnOverrideForm } from "@/components/YearlyReturnOverrideForm";
import { NewsPanel } from "@/components/NewsPanel";
import { AccountManagerModal } from "@/components/AccountManagerModal";
import { TargetAmountModal } from "@/components/TargetAmountModal";
import { TransactionsPanel } from "@/components/TransactionsPanel";
import { DividendsPanel } from "@/components/DividendsPanel";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { DividendCalendar } from "@/components/DividendCalendar";
import { RebalancePanel } from "@/components/RebalancePanel";
import { AnalysisModal } from "@/components/AnalysisModal";
import { BackupControls } from "@/components/BackupControls";

const DISPLAY_CURRENCY = "KRW";
const ALL_ACCOUNTS = "all";

export default function DashboardPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [targetAmount, setTargetAmount] = useState<number | null>(null);
  const [yearlyOverrides, setYearlyOverrides] = useState<YearlyReturnOverrides>({});
  const [hydrated, setHydrated] = useState(false);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [historyBySymbol, setHistoryBySymbol] = useState<Record<string, HistoryPoint[]>>({});
  const [historyMockBySymbol, setHistoryMockBySymbol] = useState<Record<string, boolean>>({});
  const [newsBySymbol, setNewsBySymbol] = useState<Record<string, NewsItem[]>>({});
  const [newsMockBySymbol, setNewsMockBySymbol] = useState<Record<string, boolean>>({});
  const newsFetchingRef = useRef<Set<string>>(new Set());
  const [userSelectedSymbol, setUserSelectedSymbol] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(ALL_ACCOUNTS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [fxRates, setFxRates] = useState<Record<string, number>>({ KRW: 1 });
  const [fxIsMock, setFxIsMock] = useState(false);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [holdingPrefill, setHoldingPrefill] = useState<
    { symbol: string; name: string; currency: string } | undefined
  >(undefined);
  const convertingWatchlistIdRef = useRef<string | null>(null);
  const [analysisTarget, setAnalysisTarget] = useState<{ symbol: string; name: string } | null>(
    null
  );

  // Fetch exchange rates once - used to combine holdings/accounts that
  // aren't all in the same currency into one meaningful total.
  useEffect(() => {
    let cancelled = false;
    fetchFxRates()
      .then((result) => {
        if (cancelled) return;
        setFxRates(result.ratesToKRW);
        setFxIsMock(result.isMock);
      })
      .catch(() => {
        if (!cancelled) setFxIsMock(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load persisted state once on mount (client-only: localStorage isn't
  // available during SSR, so the first render is intentionally empty). This
  // syncs from an external, non-reactive store; there's no render-time
  // equivalent that stays SSR-safe, so the lint rule is disabled here.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setHoldings(loadHoldings());
    setAccounts(loadAccounts());
    setTargetAmount(loadTargetAmount());
    setYearlyOverrides(loadYearlyReturnOverrides());
    setWatchlist(loadWatchlist());
    /* eslint-enable react-hooks/set-state-in-effect */
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveHoldings(holdings);
  }, [holdings, hydrated]);
  useEffect(() => {
    if (hydrated) saveAccounts(accounts);
  }, [accounts, hydrated]);
  useEffect(() => {
    if (hydrated) saveTargetAmount(targetAmount);
  }, [targetAmount, hydrated]);
  useEffect(() => {
    if (hydrated) saveYearlyReturnOverrides(yearlyOverrides);
  }, [yearlyOverrides, hydrated]);
  useEffect(() => {
    if (hydrated) saveWatchlist(watchlist);
  }, [watchlist, hydrated]);

  // Fall back to the first holding whenever the user's pick is unset or no
  // longer exists - derived directly in render, no effect needed.
  const selectedSymbol =
    userSelectedSymbol && holdings.some((h) => h.symbol === userSelectedSymbol)
      ? userSelectedSymbol
      : (holdings[0]?.symbol ?? null);

  const filteredHoldings = useMemo(
    () =>
      selectedAccountId === ALL_ACCOUNTS
        ? holdings
        : holdings.filter((h) => h.accountId === selectedAccountId),
    [holdings, selectedAccountId]
  );

  const symbols = useMemo(
    () =>
      Array.from(
        new Set([...holdings.map((h) => h.symbol), ...watchlist.map((w) => w.symbol)])
      ),
    [holdings, watchlist]
  );

  // Fetch current quotes for every held symbol (across all accounts, so
  // switching the account filter never needs a refetch).
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
      filteredHoldings.map((holding) => {
        const quote = getEffectiveQuote(holding, quotes);
        const metrics = computeHoldingMetrics(holding, quote, fxRates);
        const accountName = accounts.find((a) => a.id === holding.accountId)?.name ?? null;
        return {
          holding,
          quote,
          quantity: metrics.quantity,
          avgCost: metrics.avgCost,
          marketValue: metrics.marketValue,
          unrealizedPnl: metrics.unrealizedPnl,
          totalReturnPercent: metrics.totalReturnPercent,
          accountName,
        };
      }),
    [filteredHoldings, quotes, accounts, fxRates]
  );

  const relevantAccounts = useMemo(
    () =>
      selectedAccountId === ALL_ACCOUNTS
        ? accounts
        : accounts.filter((a) => a.id === selectedAccountId),
    [accounts, selectedAccountId]
  );

  const cashTotal = useMemo(
    () =>
      relevantAccounts.reduce((sum, a) => sum + convertToKRW(a.cashBalance, a.currency, fxRates), 0),
    [relevantAccounts, fxRates]
  );

  const depositedTotal = useMemo(
    () =>
      relevantAccounts.reduce(
        (sum, a) => sum + convertToKRW(a.totalDeposited, a.currency, fxRates),
        0
      ),
    [relevantAccounts, fxRates]
  );

  const manualRealizedPnlTotal = useMemo(
    () =>
      relevantAccounts.reduce(
        (sum, a) => sum + convertToKRW(a.manualRealizedPnl ?? 0, a.currency, fxRates),
        0
      ),
    [relevantAccounts, fxRates]
  );

  const summary = useMemo(() => {
    let totalStockValue = 0;
    let totalInvested = 0;
    let realizedPnl = 0;
    let unrealizedPnl = 0;
    let confirmedDividends = 0;
    let expectedDividends = 0;
    let totalPnl = 0;
    let dayChange = 0;
    let best: { symbol: string; percent: number } | null = null;
    let worst: { symbol: string; percent: number } | null = null;

    for (const holding of filteredHoldings) {
      const quote = getEffectiveQuote(holding, quotes);
      const metrics = computeHoldingMetrics(holding, quote, fxRates);
      const toKRW = (amount: number) => convertToKRW(amount, holding.currency, fxRates);
      totalStockValue += toKRW(metrics.marketValue);
      totalInvested += toKRW(metrics.totalInvested);
      realizedPnl += toKRW(metrics.realizedPnl);
      unrealizedPnl += toKRW(metrics.unrealizedPnl);
      confirmedDividends += toKRW(metrics.confirmedDividends);
      expectedDividends += toKRW(metrics.expectedDividends);
      totalPnl += toKRW(metrics.totalPnl);
      dayChange += toKRW(metrics.dayChange);
      // Per-holding return % is a same-currency ratio, so it needs no FX
      // conversion - only the portfolio-wide totals above do.
      if (quote) {
        if (!best || metrics.totalReturnPercent > best.percent) {
          best = { symbol: holding.symbol, percent: metrics.totalReturnPercent };
        }
        if (!worst || metrics.totalReturnPercent < worst.percent) {
          worst = { symbol: holding.symbol, percent: metrics.totalReturnPercent };
        }
      }
    }

    const totalCost = totalInvested;
    const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
    const prevTotalValue = totalStockValue - dayChange;
    const dayChangePercent = prevTotalValue > 0 ? (dayChange / prevTotalValue) * 100 : 0;

    return {
      totalStockValue,
      totalCost,
      realizedPnl,
      unrealizedPnl,
      confirmedDividends,
      expectedDividends,
      totalPnl,
      totalPnlPercent,
      dayChange,
      dayChangePercent,
      bestSymbol: best ? (best as { symbol: string }).symbol : null,
      bestPercent: best ? (best as { percent: number }).percent : 0,
      worstSymbol: worst ? (worst as { symbol: string }).symbol : null,
      worstPercent: worst ? (worst as { percent: number }).percent : 0,
    };
  }, [filteredHoldings, quotes, fxRates]);

  const yearlyReturnsComputed = useMemo(
    () => computeYearlyReturns(filteredHoldings, historyBySymbol, fxRates),
    [filteredHoldings, historyBySymbol, fxRates]
  );
  const yearlyReturns = useMemo(
    () => applyYearlyOverrides(yearlyReturnsComputed, yearlyOverrides),
    [yearlyReturnsComputed, yearlyOverrides]
  );
  const overrideYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = new Set<number>([
      ...yearlyReturnsComputed.map((p) => p.year),
      ...Object.keys(yearlyOverrides).map(Number),
      2024,
      2025,
    ]);
    return Array.from(years)
      .filter((y) => y <= currentYear)
      .sort((a, b) => a - b);
  }, [yearlyReturnsComputed, yearlyOverrides]);

  const allocationSlices = useMemo(
    () =>
      rows
        .filter((r) => r.marketValue > 0)
        .map((r) => ({
          symbol: r.holding.symbol,
          name: r.holding.name,
          value: r.marketValue,
          currency: r.holding.currency,
          valueInBase: convertToKRW(r.marketValue, r.holding.currency, fxRates),
        })),
    [rows, fxRates]
  );

  const rebalanceSuggestions = useMemo(() => {
    const totalValueInBase = rows.reduce(
      (sum, r) => sum + convertToKRW(r.marketValue, r.holding.currency, fxRates),
      0
    );
    return rows
      .filter((r) => r.holding.targetWeightPercent != null)
      .map((r) => {
        const valueInBase = convertToKRW(r.marketValue, r.holding.currency, fxRates);
        const currentWeightPercent =
          totalValueInBase > 0 ? (valueInBase / totalValueInBase) * 100 : 0;
        const targetWeightPercent = r.holding.targetWeightPercent as number;
        const targetValueInBase = (targetWeightPercent / 100) * totalValueInBase;
        const diffValueInBase = targetValueInBase - valueInBase;
        const diffValueNative = convertFromKRW(diffValueInBase, r.holding.currency, fxRates);
        const price = r.quote?.price ?? null;
        return {
          symbol: r.holding.symbol,
          name: r.holding.name,
          currency: r.holding.currency,
          currentWeightPercent,
          targetWeightPercent,
          diffValueNative,
          diffQuantity: price && price > 0 ? diffValueNative / price : null,
        };
      });
  }, [rows, fxRates]);

  function handleSave(values: HoldingFormValues) {
    setHoldings((prev) => {
      if (values.id) {
        return prev.map((h) =>
          h.id === values.id
            ? {
                ...h,
                name: values.name,
                currency: values.currency,
                accountId: values.accountId,
                manualPrice: values.manualPrice,
                note: values.note,
                targetWeightPercent: values.targetWeightPercent,
              }
            : h
        );
      }
      const transactions: Transaction[] = values.initialTransaction
        ? [{ id: createTransactionId(), type: "buy", ...values.initialTransaction }]
        : [];
      return [
        ...prev,
        {
          id: createHoldingId(),
          symbol: values.symbol,
          name: values.name,
          currency: values.currency,
          accountId: values.accountId,
          manualPrice: values.manualPrice,
          note: values.note,
          targetWeightPercent: values.targetWeightPercent,
          transactions,
          dividends: [],
        },
      ];
    });
    if (!values.id && convertingWatchlistIdRef.current) {
      const convertedId = convertingWatchlistIdRef.current;
      setWatchlist((prev) => prev.filter((w) => w.id !== convertedId));
      convertingWatchlistIdRef.current = null;
    }
    setModalOpen(false);
    setEditingHolding(null);
    setHoldingPrefill(undefined);
  }

  function handleAddWatchlistItem(item: { symbol: string; name: string; currency: string }) {
    setWatchlist((prev) => [
      ...prev,
      { ...item, id: createWatchlistId(), addedDate: new Date().toISOString().slice(0, 10) },
    ]);
  }

  function handleDeleteWatchlistItem(id: string) {
    setWatchlist((prev) => prev.filter((w) => w.id !== id));
  }

  function handleConvertWatchlistItem(item: WatchlistItem) {
    convertingWatchlistIdRef.current = item.id;
    setHoldingPrefill({ symbol: item.symbol, name: item.name, currency: item.currency });
    setEditingHolding(null);
    setModalOpen(true);
  }

  function handleDelete(holding: Holding) {
    if (!window.confirm(`${holding.name} (${holding.symbol}) 종목을 삭제할까요?`)) return;
    setHoldings((prev) => prev.filter((h) => h.id !== holding.id));
  }

  function handleAddTransaction(holdingId: string, transaction: Omit<Transaction, "id">) {
    setHoldings((prev) =>
      prev.map((h) =>
        h.id === holdingId
          ? { ...h, transactions: [...h.transactions, { ...transaction, id: createTransactionId() }] }
          : h
      )
    );
  }

  function handleDeleteTransaction(holdingId: string, transactionId: string) {
    setHoldings((prev) =>
      prev.map((h) =>
        h.id === holdingId
          ? { ...h, transactions: h.transactions.filter((t) => t.id !== transactionId) }
          : h
      )
    );
  }

  function handleAddDividend(
    holdingId: string,
    dividend: { date: string; expectedAmount: number; currency: string }
  ) {
    setHoldings((prev) =>
      prev.map((h) =>
        h.id === holdingId
          ? {
              ...h,
              dividends: [
                ...h.dividends,
                { ...dividend, id: createDividendId(), status: "expected" as const },
              ],
            }
          : h
      )
    );
  }

  function handleConfirmDividend(holdingId: string, dividendId: string, confirmedAmount: number) {
    setHoldings((prev) =>
      prev.map((h) =>
        h.id === holdingId
          ? {
              ...h,
              dividends: h.dividends.map((d) =>
                d.id === dividendId ? { ...d, status: "confirmed" as const, confirmedAmount } : d
              ),
            }
          : h
      )
    );
  }

  function handleDeleteDividend(holdingId: string, dividendId: string) {
    setHoldings((prev) =>
      prev.map((h) =>
        h.id === holdingId
          ? { ...h, dividends: h.dividends.filter((d) => d.id !== dividendId) }
          : h
      )
    );
  }

  function handleYearlyOverrideChange(year: number, value: number | null) {
    setYearlyOverrides((prev) => {
      const next = { ...prev };
      if (value == null) delete next[year];
      else next[year] = value;
      return next;
    });
  }

  function handleImportBackup(data: BackupData) {
    importBackup(data);
    setHoldings(data.holdings ?? []);
    setAccounts(data.accounts ?? []);
    setTargetAmount(data.targetAmount ?? null);
    setYearlyOverrides(data.yearlyReturnOverrides ?? {});
    setWatchlist(data.watchlist ?? []);
  }

  const selectedHolding = holdings.find((h) => h.symbol === selectedSymbol) ?? null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-primary dark:text-ink-primary-dark">
            주식 관리 대시보드
          </h1>
          <p className="text-sm text-ink-secondary dark:text-ink-secondary-dark">
            보유 종목, 손익 현황, 포트폴리오 통계를 한눈에 확인하세요.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BackupControls onImported={handleImportBackup} />
          <button
            onClick={() => setTargetModalOpen(true)}
            className="rounded border border-line-hairline px-3 py-2 text-sm dark:border-line-hairline-dark"
          >
            목표금액 설정
          </button>
          <button
            onClick={() => setAccountModalOpen(true)}
            className="rounded border border-line-hairline px-3 py-2 text-sm dark:border-line-hairline-dark"
          >
            계좌 관리
          </button>
          <button
            onClick={() => {
              setEditingHolding(null);
              setHoldingPrefill(undefined);
              convertingWatchlistIdRef.current = null;
              setModalOpen(true);
            }}
            className="rounded bg-series-1 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            + 종목 추가
          </button>
        </div>
      </div>

      {accounts.length > 0 && (
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-ink-secondary dark:text-ink-secondary-dark">계좌</span>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="rounded border border-line-hairline bg-transparent px-3 py-1.5 dark:border-line-hairline-dark"
            >
              <option value={ALL_ACCOUNTS}>전체 계좌</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {fxIsMock && filteredHoldings.length > 0 && (
        <div className="mb-4 rounded border border-status-warning/40 bg-status-warning/10 px-3 py-2 text-xs text-status-warning">
          환율 실시간 연동 실패 - 근사 환율로 통화를 환산한 값입니다.
        </div>
      )}

      <div className="mb-6">
        <SummaryCards
          totalStockValue={summary.totalStockValue}
          totalCash={cashTotal}
          totalCost={summary.totalCost}
          realizedPnl={summary.realizedPnl + manualRealizedPnlTotal}
          manualRealizedPnl={manualRealizedPnlTotal}
          unrealizedPnl={summary.unrealizedPnl}
          confirmedDividends={summary.confirmedDividends}
          expectedDividends={summary.expectedDividends}
          totalPnl={summary.totalPnl + manualRealizedPnlTotal}
          totalPnlPercent={
            summary.totalCost > 0
              ? ((summary.totalPnl + manualRealizedPnlTotal) / summary.totalCost) * 100
              : 0
          }
          dayChange={summary.dayChange}
          dayChangePercent={summary.dayChangePercent}
          bestSymbol={summary.bestSymbol}
          bestPercent={summary.bestPercent}
          worstSymbol={summary.worstSymbol}
          worstPercent={summary.worstPercent}
          currency={DISPLAY_CURRENCY}
          targetAmount={selectedAccountId === ALL_ACCOUNTS ? targetAmount : null}
          totalDeposited={depositedTotal}
        />
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
          onAnalyze={(h) => setAnalysisTarget({ symbol: h.symbol, name: h.name })}
        />
      </section>

      <section className="mb-6 rounded-lg border border-line-hairline p-4 dark:border-line-hairline-dark">
        <h2 className="mb-3 text-sm font-semibold text-ink-secondary dark:text-ink-secondary-dark">
          관심종목
        </h2>
        <WatchlistPanel
          items={watchlist}
          quotes={quotes}
          onAdd={handleAddWatchlistItem}
          onDelete={handleDeleteWatchlistItem}
          onConvert={handleConvertWatchlistItem}
          onAnalyze={setAnalysisTarget}
        />
      </section>

      {selectedHolding && (
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-line-hairline p-4 dark:border-line-hairline-dark">
            <h2 className="mb-3 text-sm font-semibold text-ink-secondary dark:text-ink-secondary-dark">
              {selectedHolding.name} ({selectedHolding.symbol}) 거래 내역
            </h2>
            <TransactionsPanel
              holding={selectedHolding}
              onAdd={(t) => handleAddTransaction(selectedHolding.id, t)}
              onDelete={(txId) => handleDeleteTransaction(selectedHolding.id, txId)}
            />
          </section>

          <section className="rounded-lg border border-line-hairline p-4 dark:border-line-hairline-dark">
            <h2 className="mb-3 text-sm font-semibold text-ink-secondary dark:text-ink-secondary-dark">
              {selectedHolding.name} 배당금
            </h2>
            <DividendsPanel
              holding={selectedHolding}
              onAdd={(d) => handleAddDividend(selectedHolding.id, d)}
              onConfirm={(id, amount) => handleConfirmDividend(selectedHolding.id, id, amount)}
              onDelete={(id) => handleDeleteDividend(selectedHolding.id, id)}
            />
          </section>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-line-hairline p-4 dark:border-line-hairline-dark">
          <h2 className="mb-3 text-sm font-semibold text-ink-secondary dark:text-ink-secondary-dark">
            자산 배분
          </h2>
          <AllocationChart slices={allocationSlices} fxIsMock={fxIsMock} />
        </section>

        <section className="rounded-lg border border-line-hairline p-4 dark:border-line-hairline-dark">
          <h2 className="mb-3 text-sm font-semibold text-ink-secondary dark:text-ink-secondary-dark">
            리밸런싱 제안
          </h2>
          <RebalancePanel suggestions={rebalanceSuggestions} />
        </section>
      </div>

      <section className="mb-6 rounded-lg border border-line-hairline p-4 dark:border-line-hairline-dark">
        <h2 className="mb-3 text-sm font-semibold text-ink-secondary dark:text-ink-secondary-dark">
          배당 캘린더
        </h2>
        <DividendCalendar holdings={holdings} />
      </section>

      {selectedHolding && (
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
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

      <section className="mb-6 rounded-lg border border-line-hairline p-4 dark:border-line-hairline-dark">
        <h2 className="mb-3 text-sm font-semibold text-ink-secondary dark:text-ink-secondary-dark">
          연도별 포트폴리오 수익률
        </h2>
        <YearlyReturnChart data={yearlyReturns} />
        <YearlyReturnOverrideForm
          years={overrideYearOptions}
          overrides={yearlyOverrides}
          onChange={handleYearlyOverrideChange}
        />
      </section>

      <HoldingFormModal
        key={`${modalOpen}:${editingHolding?.id ?? "new"}`}
        open={modalOpen}
        initial={editingHolding}
        accounts={accounts}
        prefill={holdingPrefill}
        onClose={() => {
          setModalOpen(false);
          setEditingHolding(null);
          setHoldingPrefill(undefined);
          convertingWatchlistIdRef.current = null;
        }}
        onSave={handleSave}
      />

      <AccountManagerModal
        key={`accounts:${accountModalOpen}`}
        open={accountModalOpen}
        accounts={accounts}
        onClose={() => setAccountModalOpen(false)}
        onSave={(next) => {
          setAccounts(next);
          setAccountModalOpen(false);
        }}
      />

      <TargetAmountModal
        key={`target:${targetModalOpen}`}
        open={targetModalOpen}
        currentValue={targetAmount}
        currency={DISPLAY_CURRENCY}
        onClose={() => setTargetModalOpen(false)}
        onSave={(value) => {
          setTargetAmount(value);
          setTargetModalOpen(false);
        }}
      />

      <AnalysisModal target={analysisTarget} onClose={() => setAnalysisTarget(null)} />
    </main>
  );
}
