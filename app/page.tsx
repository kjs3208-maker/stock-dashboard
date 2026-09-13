"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Account,
  Holding,
  HistoryPoint,
  Quote,
  ResearchNote,
  ResearchNoteCategory,
  Transaction,
  WatchlistItem,
} from "@/lib/types";
import {
  BackupData,
  createAccountDepositId,
  createDividendId,
  createHoldingId,
  createResearchNoteId,
  createTransactionId,
  createWatchlistId,
  importBackup,
  loadAccounts,
  loadHoldings,
  loadResearchNotes,
  loadTargetAmount,
  loadWatchlist,
  loadYearlyReturnOverrides,
  saveAccounts,
  saveHoldings,
  saveResearchNotes,
  saveTargetAmount,
  saveWatchlist,
  saveYearlyReturnOverrides,
  YearlyReturnOverrides,
} from "@/lib/storage";
import { fetchFxRates, fetchHistory, fetchQuotes } from "@/lib/marketData";
import { convertFromKRW, convertToKRW } from "@/lib/fx";
import {
  checkRemoteSync,
  clearSyncPasscode,
  loadSyncPasscode,
  pushRemoteState,
  saveSyncPasscode,
  SyncStatus,
} from "@/lib/sync";
import {
  applyYearlyOverrides,
  computeHoldingMetrics,
  computeYearlyPrincipal,
  computeYearlyReturns,
  effectiveTotalDeposited,
  estimateForeignCapitalGainsTax,
  getEffectiveQuote,
} from "@/lib/portfolioMath";
import { SummaryCards } from "@/components/SummaryCards";
import { HoldingsTable, HoldingRow } from "@/components/HoldingsTable";
import { HoldingFormModal, HoldingFormValues } from "@/components/HoldingFormModal";
import { AllocationChart } from "@/components/AllocationChart";
import { PriceHistoryChart } from "@/components/PriceHistoryChart";
import { YearlyReturnChart } from "@/components/YearlyReturnChart";
import { YearlyPrincipalTable } from "@/components/YearlyPrincipalTable";
import { YearlyReturnOverrideForm } from "@/components/YearlyReturnOverrideForm";
import { AccountManagerModal } from "@/components/AccountManagerModal";
import { TargetAmountModal } from "@/components/TargetAmountModal";
import { TransactionsPanel } from "@/components/TransactionsPanel";
import { DividendsPanel } from "@/components/DividendsPanel";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { DividendCalendar } from "@/components/DividendCalendar";
import { RebalancePanel } from "@/components/RebalancePanel";
import { AnalysisModal } from "@/components/AnalysisModal";
import { BackupControls } from "@/components/BackupControls";
import { TaxEstimatePanel } from "@/components/TaxEstimatePanel";
import { ResearchNotesPanel } from "@/components/ResearchNotesPanel";
import { InsightCollector } from "@/components/InsightCollector";
import { ReportUploadPanel } from "@/components/ReportUploadPanel";
import { AccountDepositsPanel } from "@/components/AccountDepositsPanel";

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
  const [syncStatus, setSyncStatus] = useState<SyncStatus | "checking">("checking");
  const [syncPasscodeInput, setSyncPasscodeInput] = useState("");
  const [syncBusy, setSyncBusy] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [researchNotes, setResearchNotes] = useState<ResearchNote[]>([]);

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
    setResearchNotes(loadResearchNotes());
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
  useEffect(() => {
    if (hydrated) saveResearchNotes(researchNotes);
  }, [researchNotes, hydrated]);

  // Once local state is loaded, see if server-side sync (Upstash + a shared
  // passcode) is configured at all. If it is and this device already knows
  // the passcode, pull whatever's stored remotely and adopt it as this
  // device's state, so every device converges on the same data.
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    checkRemoteSync(loadSyncPasscode()).then((result) => {
      if (cancelled) return;
      if (result.status === "unlocked") {
        if (result.payload) {
          importBackup(result.payload.data);
          setHoldings(result.payload.data.holdings ?? []);
          setAccounts(result.payload.data.accounts ?? []);
          setTargetAmount(result.payload.data.targetAmount ?? null);
          setYearlyOverrides(result.payload.data.yearlyReturnOverrides ?? {});
          setWatchlist(result.payload.data.watchlist ?? []);
          setResearchNotes(result.payload.data.researchNotes ?? []);
          setLastSyncedAt(result.payload.updatedAt);
        }
      }
      setSyncStatus(result.status);
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  // Push this device's state to the shared store shortly after any change,
  // once unlocked - so other devices see it the next time they check in.
  useEffect(() => {
    if (!hydrated || syncStatus !== "unlocked") return;
    const passcode = loadSyncPasscode();
    const data: BackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      holdings,
      accounts,
      targetAmount,
      yearlyReturnOverrides: yearlyOverrides,
      watchlist,
      researchNotes,
    };
    const timeout = setTimeout(() => {
      pushRemoteState(passcode, data).then((ok) => {
        if (ok) setLastSyncedAt(data.exportedAt);
      });
    }, 1500);
    return () => clearTimeout(timeout);
  }, [
    holdings,
    accounts,
    targetAmount,
    yearlyOverrides,
    watchlist,
    researchNotes,
    hydrated,
    syncStatus,
  ]);

  async function handleUnlockSync() {
    const passcode = syncPasscodeInput.trim();
    if (!passcode) return;
    setSyncBusy(true);
    const result = await checkRemoteSync(passcode);
    setSyncBusy(false);
    if (result.status === "unlocked") {
      saveSyncPasscode(passcode);
      setSyncPasscodeInput("");
      if (result.payload) {
        importBackup(result.payload.data);
        setHoldings(result.payload.data.holdings ?? []);
        setAccounts(result.payload.data.accounts ?? []);
        setTargetAmount(result.payload.data.targetAmount ?? null);
        setYearlyOverrides(result.payload.data.yearlyReturnOverrides ?? {});
        setWatchlist(result.payload.data.watchlist ?? []);
        setResearchNotes(result.payload.data.researchNotes ?? []);
        setLastSyncedAt(result.payload.updatedAt);
      } else {
        const data: BackupData = {
          version: 1,
          exportedAt: new Date().toISOString(),
          holdings,
          accounts,
          targetAmount,
          yearlyReturnOverrides: yearlyOverrides,
          watchlist,
          researchNotes,
        };
        pushRemoteState(passcode, data).then((ok) => {
          if (ok) setLastSyncedAt(data.exportedAt);
        });
      }
      setSyncStatus("unlocked");
    } else if (result.status === "locked") {
      alert("비밀번호가 올바르지 않습니다.");
    } else {
      alert("동기화 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  function handleDisconnectSync() {
    clearSyncPasscode();
    setLastSyncedAt(null);
    setSyncStatus("locked");
  }

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
        (sum, a) => sum + convertToKRW(effectiveTotalDeposited(a), a.currency, fxRates),
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

  const manualConfirmedDividendsTotal = useMemo(
    () =>
      relevantAccounts.reduce(
        (sum, a) => sum + convertToKRW(a.manualConfirmedDividends ?? 0, a.currency, fxRates),
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
    () => computeYearlyReturns(filteredHoldings, fxRates),
    [filteredHoldings, fxRates]
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

  const yearlyPrincipal = useMemo(
    () => computeYearlyPrincipal(relevantAccounts, overrideYearOptions, fxRates),
    [relevantAccounts, overrideYearOptions, fxRates]
  );

  const foreignTaxEstimate = useMemo(
    () => estimateForeignCapitalGainsTax(filteredHoldings, new Date().getFullYear(), fxRates),
    [filteredHoldings, fxRates]
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
    setResearchNotes(data.researchNotes ?? []);
  }

  function handleAddResearchNote(note: {
    title: string;
    content: string;
    category: ResearchNoteCategory;
    symbol?: string;
  }) {
    const now = new Date().toISOString();
    setResearchNotes((prev) => [
      ...prev,
      { id: createResearchNoteId(), createdAt: now, updatedAt: now, ...note },
    ]);
  }

  function handleUpdateResearchNote(
    id: string,
    patch: { title: string; content: string; category: ResearchNoteCategory; symbol?: string }
  ) {
    setResearchNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n))
    );
  }

  function handleDeleteResearchNote(id: string) {
    setResearchNotes((prev) => prev.filter((n) => n.id !== id));
  }

  function handleAddAccountDeposit(
    accountId: string,
    deposit: { date: string; amount: number; note?: string }
  ) {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === accountId
          ? { ...a, deposits: [...(a.deposits ?? []), { id: createAccountDepositId(), ...deposit }] }
          : a
      )
    );
  }

  function handleDeleteAccountDeposit(accountId: string, depositId: string) {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === accountId
          ? { ...a, deposits: (a.deposits ?? []).filter((d) => d.id !== depositId) }
          : a
      )
    );
  }

  const selectedHolding = holdings.find((h) => h.symbol === selectedSymbol) ?? null;
  const selectedAccount =
    selectedAccountId === ALL_ACCOUNTS ? null : accounts.find((a) => a.id === selectedAccountId) ?? null;

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

      {selectedAccount && (
        <section className="mb-6 rounded-lg border border-line-hairline p-4 dark:border-line-hairline-dark">
          <h2 className="mb-3 text-sm font-semibold text-ink-secondary dark:text-ink-secondary-dark">
            {selectedAccount.name} 입금 내역
          </h2>
          <AccountDepositsPanel
            account={selectedAccount}
            onAdd={(d) => handleAddAccountDeposit(selectedAccount.id, d)}
            onDelete={(depositId) => handleDeleteAccountDeposit(selectedAccount.id, depositId)}
          />
        </section>
      )}

      {fxIsMock && filteredHoldings.length > 0 && (
        <div className="mb-4 rounded border border-status-warning/40 bg-status-warning/10 px-3 py-2 text-xs text-status-warning">
          환율 실시간 연동 실패 - 근사 환율로 통화를 환산한 값입니다.
        </div>
      )}

      {syncStatus === "locked" && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded border border-line-hairline bg-plane px-3 py-2 text-xs dark:border-line-hairline-dark dark:bg-plane-dark">
          <span className="text-ink-secondary dark:text-ink-secondary-dark">
            ☁️ 기기 간 자동 동기화가 설정되어 있습니다. 비밀번호를 입력하면 이 기기에서도 같은
            데이터를 볼 수 있어요.
          </span>
          <input
            type="password"
            value={syncPasscodeInput}
            onChange={(e) => setSyncPasscodeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleUnlockSync();
            }}
            placeholder="동기화 비밀번호"
            className="rounded border border-line-hairline bg-transparent px-2 py-1 dark:border-line-hairline-dark"
          />
          <button
            onClick={handleUnlockSync}
            disabled={syncBusy}
            className="rounded bg-series-1 px-3 py-1 text-white hover:opacity-90 disabled:opacity-50"
          >
            연결
          </button>
        </div>
      )}

      {syncStatus === "unlocked" && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded border border-status-good/30 bg-status-good/10 px-3 py-2 text-xs text-status-good">
          <span>
            ☁️ 동기화 켜짐
            {lastSyncedAt ? ` · 마지막 동기화 ${new Date(lastSyncedAt).toLocaleString("ko-KR")}` : ""}
          </span>
          <button
            onClick={handleDisconnectSync}
            className="rounded px-2 py-1 text-ink-muted hover:bg-plane dark:hover:bg-plane-dark"
          >
            연결 해제
          </button>
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
          confirmedDividends={summary.confirmedDividends + manualConfirmedDividendsTotal}
          manualConfirmedDividends={manualConfirmedDividendsTotal}
          expectedDividends={summary.expectedDividends}
          totalPnl={summary.totalPnl + manualRealizedPnlTotal + manualConfirmedDividendsTotal}
          totalPnlPercent={
            summary.totalCost > 0
              ? ((summary.totalPnl + manualRealizedPnlTotal + manualConfirmedDividendsTotal) /
                  summary.totalCost) *
                100
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

      <section className="mb-6 rounded-lg border border-line-hairline p-4 dark:border-line-hairline-dark">
        <h2 className="mb-3 text-sm font-semibold text-ink-secondary dark:text-ink-secondary-dark">
          키워드 인사이트 수집
        </h2>
        <InsightCollector
          onSaveAsNote={(note) =>
            handleAddResearchNote({ ...note, category: "인사이트" })
          }
        />
      </section>

      <section className="mb-6 rounded-lg border border-line-hairline p-4 dark:border-line-hairline-dark">
        <h2 className="mb-3 text-sm font-semibold text-ink-secondary dark:text-ink-secondary-dark">
          리포트 분석 (PDF 업로드)
        </h2>
        <ReportUploadPanel
          onSaveAsNote={(note) =>
            handleAddResearchNote({ ...note, category: "종목분석" })
          }
        />
      </section>

      <section className="mb-6 rounded-lg border border-line-hairline p-4 dark:border-line-hairline-dark">
        <h2 className="mb-3 text-sm font-semibold text-ink-secondary dark:text-ink-secondary-dark">
          리서치 노트
        </h2>
        <ResearchNotesPanel
          notes={researchNotes}
          onAdd={handleAddResearchNote}
          onUpdate={handleUpdateResearchNote}
          onDelete={handleDeleteResearchNote}
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
        <section className="mb-6 rounded-lg border border-line-hairline p-4 dark:border-line-hairline-dark">
          <h2 className="mb-3 text-sm font-semibold text-ink-secondary dark:text-ink-secondary-dark">
            {selectedHolding.name} ({selectedHolding.symbol}) 가격 추이
          </h2>
          <PriceHistoryChart
            points={historyBySymbol[selectedHolding.symbol] ?? []}
            currency={quotes[selectedHolding.symbol]?.currency ?? selectedHolding.currency}
            isMock={historyMockBySymbol[selectedHolding.symbol] ?? false}
          />
        </section>
      )}

      <section className="mb-6 rounded-lg border border-line-hairline p-4 dark:border-line-hairline-dark">
        <h2 className="mb-3 text-sm font-semibold text-ink-secondary dark:text-ink-secondary-dark">
          연도별 실현손익
        </h2>
        <YearlyReturnChart data={yearlyReturns} currency={DISPLAY_CURRENCY} />
        <YearlyPrincipalTable
          returns={yearlyReturns}
          principal={yearlyPrincipal}
          currency={DISPLAY_CURRENCY}
        />
        <YearlyReturnOverrideForm
          key={hydrated ? "hydrated" : "loading"}
          years={overrideYearOptions}
          overrides={yearlyOverrides}
          onChange={handleYearlyOverrideChange}
        />
      </section>

      <section className="mb-6 rounded-lg border border-line-hairline p-4 dark:border-line-hairline-dark">
        <h2 className="mb-3 text-sm font-semibold text-ink-secondary dark:text-ink-secondary-dark">
          해외주식 양도소득세 추정 (참고용)
        </h2>
        <TaxEstimatePanel estimate={foreignTaxEstimate} currency={DISPLAY_CURRENCY} />
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
