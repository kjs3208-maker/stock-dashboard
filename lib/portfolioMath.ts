import { Account, Holding, HistoryPoint, Quote, Transaction } from "./types";
import { YearlyReturnOverrides } from "./storage";

export interface HoldingPosition {
  quantity: number;
  avgCost: number;
  realizedPnl: number;
  totalInvested: number; // gross cost of every buy, ever
  totalProceeds: number; // gross proceeds of every sell, ever
  firstBuyDate: string | null;
}

const EMPTY_POSITION: HoldingPosition = {
  quantity: 0,
  avgCost: 0,
  realizedPnl: 0,
  totalInvested: 0,
  totalProceeds: 0,
  firstBuyDate: null,
};

/**
 * Moving-average-cost walk over a holding's buy/sell transactions - the
 * method most Korean brokerage apps use for "평균단가". A sell realizes
 * gain/loss against the average cost at that moment; it never changes the
 * average cost of the shares still held.
 */
function walkTransactions(transactions: Transaction[]): HoldingPosition {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let quantity = 0;
  let avgCost = 0;
  let realizedPnl = 0;
  let totalInvested = 0;
  let totalProceeds = 0;
  let firstBuyDate: string | null = null;

  for (const t of sorted) {
    if (t.type === "buy") {
      if (firstBuyDate == null || new Date(t.date) < new Date(firstBuyDate)) {
        firstBuyDate = t.date;
      }
      totalInvested += t.quantity * t.price;
      const newQuantity = quantity + t.quantity;
      avgCost = newQuantity > 0 ? (quantity * avgCost + t.quantity * t.price) / newQuantity : 0;
      quantity = newQuantity;
    } else {
      const sellQuantity = Math.min(t.quantity, quantity);
      realizedPnl += (t.price - avgCost) * sellQuantity;
      totalProceeds += t.price * sellQuantity;
      quantity -= sellQuantity;
    }
  }

  return { quantity, avgCost, realizedPnl, totalInvested, totalProceeds, firstBuyDate };
}

export function computeHoldingPosition(holding: Holding): HoldingPosition {
  return walkTransactions(holding.transactions);
}

function computeHoldingPositionAsOf(holding: Holding, cutoff: Date): HoldingPosition {
  const relevant = holding.transactions.filter((t) => new Date(t.date).getTime() <= cutoff.getTime());
  return relevant.length > 0 ? walkTransactions(relevant) : EMPTY_POSITION;
}

export interface HoldingMetrics {
  quantity: number;
  avgCost: number;
  marketValue: number;
  costBasis: number; // remaining shares' cost, at current average cost
  unrealizedPnl: number;
  realizedPnl: number;
  totalInvested: number;
  totalPnl: number; // realized + unrealized
  totalReturnPercent: number; // cumulative return since the first ever buy
  dayChange: number;
  dayChangePercent: number;
}

export function computeHoldingMetrics(holding: Holding, quote: Quote | null): HoldingMetrics {
  const position = computeHoldingPosition(holding);
  const costBasis = position.quantity * position.avgCost;

  if (!quote) {
    return {
      quantity: position.quantity,
      avgCost: position.avgCost,
      marketValue: 0,
      costBasis,
      unrealizedPnl: 0,
      realizedPnl: position.realizedPnl,
      totalInvested: position.totalInvested,
      totalPnl: position.realizedPnl,
      totalReturnPercent:
        position.totalInvested > 0 ? (position.realizedPnl / position.totalInvested) * 100 : 0,
      dayChange: 0,
      dayChangePercent: 0,
    };
  }

  const marketValue = position.quantity * quote.price;
  const unrealizedPnl = marketValue - costBasis;
  const totalPnl = unrealizedPnl + position.realizedPnl;
  const totalReturnPercent =
    position.totalInvested > 0 ? (totalPnl / position.totalInvested) * 100 : 0;
  const dayChange = position.quantity * (quote.price - quote.previousClose);
  const dayChangePercent =
    quote.previousClose > 0
      ? ((quote.price - quote.previousClose) / quote.previousClose) * 100
      : 0;

  return {
    quantity: position.quantity,
    avgCost: position.avgCost,
    marketValue,
    costBasis,
    unrealizedPnl,
    realizedPnl: position.realizedPnl,
    totalInvested: position.totalInvested,
    totalPnl,
    totalReturnPercent,
    dayChange,
    dayChangePercent,
  };
}

/**
 * A manually-entered price (for tickers a live provider doesn't cover, e.g.
 * K-OTC) always wins over any fetched quote. Day-over-day change is unknown
 * for a manual price, so it's reported as flat (0%) rather than guessed.
 */
export function getEffectiveQuote(
  holding: Holding,
  quotesBySymbol: Record<string, Quote>
): Quote | null {
  if (holding.manualPrice != null) {
    return {
      symbol: holding.symbol,
      price: holding.manualPrice,
      previousClose: holding.manualPrice,
      currency: holding.currency,
      isMock: false,
      isManual: true,
      asOf: new Date().toISOString(),
    };
  }
  return quotesBySymbol[holding.symbol] ?? null;
}

export interface YearlyReturnPoint {
  year: number;
  returnPercent: number;
  isManual?: boolean;
}

/**
 * Approximate portfolio-level yearly return, mixing every holding's raw
 * currency amounts without FX conversion. Mid-year buys/sells are folded
 * into the start/end totals as if held all year (a simplification, not a
 * true time-weighted return) - fine for a personal dashboard, not for
 * precise performance reporting.
 */
export function computeYearlyReturns(
  holdings: Holding[],
  historyBySymbol: Record<string, HistoryPoint[]>
): YearlyReturnPoint[] {
  const positions = holdings.map((h) => ({ holding: h, position: computeHoldingPosition(h) }));
  const withBuys = positions.filter((p) => p.position.firstBuyDate != null);
  if (withBuys.length === 0) return [];

  const currentYear = new Date().getFullYear();
  const earliestYear = Math.min(
    ...withBuys.map((p) => new Date(p.position.firstBuyDate as string).getFullYear())
  );

  function closeOnOrBefore(points: HistoryPoint[], cutoff: Date): number | null {
    let result: number | null = null;
    for (const p of points) {
      if (new Date(p.date).getTime() <= cutoff.getTime()) {
        result = p.close;
      } else {
        break;
      }
    }
    return result;
  }

  const results: YearlyReturnPoint[] = [];

  for (let year = earliestYear; year <= currentYear; year++) {
    const prevYearEndCutoff = new Date(year - 1, 11, 31, 23, 59, 59);
    const yearEndCutoff = new Date(year, 11, 31, 23, 59, 59);
    const yearStartBoundary = new Date(year, 0, 1);

    let totalStart = 0;
    let totalEnd = 0;

    for (const { holding } of withBuys) {
      const points = historyBySymbol[holding.symbol] ?? [];
      const posStart = computeHoldingPositionAsOf(holding, prevYearEndCutoff);
      const posEnd = computeHoldingPositionAsOf(holding, yearEndCutoff);

      const startPrice = closeOnOrBefore(points, prevYearEndCutoff) ?? posStart.avgCost;
      const endPrice = closeOnOrBefore(points, yearEndCutoff) ?? posEnd.avgCost;

      const startValue = posStart.quantity * startPrice;
      const endValue = posEnd.quantity * endPrice;

      const buysDuringYear = holding.transactions
        .filter(
          (t) =>
            t.type === "buy" &&
            new Date(t.date).getTime() >= yearStartBoundary.getTime() &&
            new Date(t.date).getTime() <= yearEndCutoff.getTime()
        )
        .reduce((sum, t) => sum + t.quantity * t.price, 0);

      const sellsDuringYear = holding.transactions
        .filter(
          (t) =>
            t.type === "sell" &&
            new Date(t.date).getTime() >= yearStartBoundary.getTime() &&
            new Date(t.date).getTime() <= yearEndCutoff.getTime()
        )
        .reduce((sum, t) => sum + t.quantity * t.price, 0);

      totalStart += startValue + buysDuringYear;
      totalEnd += endValue + sellsDuringYear;
    }

    if (totalStart > 0) {
      results.push({ year, returnPercent: ((totalEnd - totalStart) / totalStart) * 100 });
    }
  }

  return results;
}

/** Manual per-year overrides always win; they can also add years the
 * computed series has no data for (e.g. returns from before this app). */
export function applyYearlyOverrides(
  computed: YearlyReturnPoint[],
  overrides: YearlyReturnOverrides
): YearlyReturnPoint[] {
  const byYear = new Map<number, YearlyReturnPoint>();
  for (const point of computed) byYear.set(point.year, point);
  for (const [yearStr, value] of Object.entries(overrides)) {
    const year = Number(yearStr);
    if (!Number.isFinite(value)) continue;
    byYear.set(year, { year, returnPercent: value, isManual: true });
  }
  return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
}

export function totalCashBalance(accounts: Account[]): number {
  return accounts.reduce((sum, a) => sum + a.cashBalance, 0);
}
