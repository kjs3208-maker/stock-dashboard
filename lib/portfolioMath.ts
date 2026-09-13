import { Account, Dividend, Holding, Quote, Transaction } from "./types";
import { YearlyReturnOverrides } from "./storage";
import { convertFromKRW, convertToKRW } from "./fx";

/**
 * An account's 계좌투입금 (cumulative capital ever deposited): once the
 * account has a dated deposit log, that log is the source of truth (so
 * continuous, ongoing contributions are just another logged entry rather
 * than a number the user has to remember to bump by hand); otherwise falls
 * back to the plain manually-edited `totalDeposited` field.
 */
export function effectiveTotalDeposited(account: Account): number {
  if (account.deposits && account.deposits.length > 0) {
    return account.deposits.reduce((sum, d) => sum + d.amount, 0);
  }
  return account.totalDeposited;
}

export interface HoldingPosition {
  quantity: number;
  avgCost: number;
  realizedPnl: number;
  totalInvested: number; // gross cost of every buy, ever
  totalProceeds: number; // gross proceeds of every sell, ever
  firstBuyDate: string | null;
}

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
    const fee = t.fee ?? 0;
    if (t.type === "buy") {
      if (firstBuyDate == null || new Date(t.date) < new Date(firstBuyDate)) {
        firstBuyDate = t.date;
      }
      const buyCost = t.quantity * t.price + fee;
      totalInvested += buyCost;
      const newQuantity = quantity + t.quantity;
      avgCost = newQuantity > 0 ? (quantity * avgCost + buyCost) / newQuantity : 0;
      quantity = newQuantity;
    } else {
      const sellQuantity = Math.min(t.quantity, quantity);
      const proceeds = t.price * sellQuantity - fee;
      realizedPnl += proceeds - avgCost * sellQuantity;
      totalProceeds += proceeds;
      quantity -= sellQuantity;
    }
  }

  return { quantity, avgCost, realizedPnl, totalInvested, totalProceeds, firstBuyDate };
}

export function computeHoldingPosition(holding: Holding): HoldingPosition {
  return walkTransactions(holding.transactions);
}

export interface DividendTotals {
  confirmedTotal: number;
  expectedTotal: number; // pending, not yet confirmed
}

/**
 * Sums a holding's dividends into its own currency. A dividend recorded in
 * a different currency than the holding (e.g. a USD stock's dividend paid
 * out in KRW) is converted via `fxRates` first, so the total is never a
 * meaningless mix of currencies.
 */
export function computeDividendTotals(
  dividends: Dividend[],
  holdingCurrency: string,
  fxRatesToKRW: Record<string, number> = {}
): DividendTotals {
  let confirmedTotal = 0;
  let expectedTotal = 0;
  for (const d of dividends) {
    const amount = d.status === "confirmed" ? d.confirmedAmount ?? d.expectedAmount : d.expectedAmount;
    const converted =
      d.currency === holdingCurrency
        ? amount
        : convertFromKRW(convertToKRW(amount, d.currency, fxRatesToKRW), holdingCurrency, fxRatesToKRW);
    if (d.status === "confirmed") confirmedTotal += converted;
    else expectedTotal += converted;
  }
  return { confirmedTotal, expectedTotal };
}

export interface HoldingMetrics {
  quantity: number;
  avgCost: number;
  marketValue: number;
  costBasis: number; // remaining shares' cost, at current average cost
  unrealizedPnl: number;
  realizedPnl: number; // trading gains/losses from sells only, excludes dividends
  confirmedDividends: number;
  expectedDividends: number;
  totalInvested: number;
  totalPnl: number; // realized + unrealized + confirmed dividends
  totalReturnPercent: number; // cumulative return since the first ever buy
  dayChange: number;
  dayChangePercent: number;
}

export function computeHoldingMetrics(
  holding: Holding,
  quote: Quote | null,
  fxRatesToKRW: Record<string, number> = {}
): HoldingMetrics {
  const position = computeHoldingPosition(holding);
  const costBasis = position.quantity * position.avgCost;
  const { confirmedTotal: confirmedDividends, expectedTotal: expectedDividends } =
    computeDividendTotals(holding.dividends, holding.currency, fxRatesToKRW);

  if (!quote) {
    const totalPnl = position.realizedPnl + confirmedDividends;
    return {
      quantity: position.quantity,
      avgCost: position.avgCost,
      marketValue: 0,
      costBasis,
      unrealizedPnl: 0,
      realizedPnl: position.realizedPnl,
      confirmedDividends,
      expectedDividends,
      totalInvested: position.totalInvested,
      totalPnl,
      totalReturnPercent:
        position.totalInvested > 0 ? (totalPnl / position.totalInvested) * 100 : 0,
      dayChange: 0,
      dayChangePercent: 0,
    };
  }

  const marketValue = position.quantity * quote.price;
  const unrealizedPnl = marketValue - costBasis;
  const totalPnl = unrealizedPnl + position.realizedPnl + confirmedDividends;
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
    confirmedDividends,
    expectedDividends,
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
  amount: number; // realized P&L (매도 실현손익) for that year, in the base currency
  isManual?: boolean;
}

interface RealizedPnlEvent {
  date: string;
  amount: number; // in the holding's own currency
}

/** Same moving-average-cost walk as `walkTransactions`, but also records
 * each sell's realized gain/loss with its date, so it can be bucketed by
 * year - `walkTransactions` only exposes the cumulative total. */
function walkTransactionsRealizedEvents(transactions: Transaction[]): RealizedPnlEvent[] {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let quantity = 0;
  let avgCost = 0;
  const events: RealizedPnlEvent[] = [];

  for (const t of sorted) {
    const fee = t.fee ?? 0;
    if (t.type === "buy") {
      const buyCost = t.quantity * t.price + fee;
      const newQuantity = quantity + t.quantity;
      avgCost = newQuantity > 0 ? (quantity * avgCost + buyCost) / newQuantity : 0;
      quantity = newQuantity;
    } else {
      const sellQuantity = Math.min(t.quantity, quantity);
      const proceeds = t.price * sellQuantity - fee;
      events.push({ date: t.date, amount: proceeds - avgCost * sellQuantity });
      quantity -= sellQuantity;
    }
  }

  return events;
}

/**
 * Yearly realized P&L (실현손익 기준) - sums each holding's sell-realized
 * gains/losses by the calendar year the sell happened in, converting every
 * holding's own-currency amount to KRW via `fxRatesToKRW` first so
 * mixed-currency portfolios combine correctly (pass {} to skip conversion).
 * Years with no sells at all are omitted; use `applyYearlyOverrides` to
 * fill in years whose transactions were never entered individually.
 */
export function computeYearlyReturns(
  holdings: Holding[],
  fxRatesToKRW: Record<string, number> = {}
): YearlyReturnPoint[] {
  const totalsByYear = new Map<number, number>();

  for (const holding of holdings) {
    const events = walkTransactionsRealizedEvents(holding.transactions);
    for (const event of events) {
      const year = new Date(event.date).getFullYear();
      const converted = convertToKRW(event.amount, holding.currency, fxRatesToKRW);
      totalsByYear.set(year, (totalsByYear.get(year) ?? 0) + converted);
    }
  }

  return Array.from(totalsByYear.entries())
    .map(([year, amount]) => ({ year, amount }))
    .sort((a, b) => a.year - b.year);
}

/** Manual per-year overrides always win; they can also add years the
 * computed series has no data for (e.g. realized gains from before this
 * app, or years whose individual buy/sell transactions weren't entered). */
export function applyYearlyOverrides(
  computed: YearlyReturnPoint[],
  overrides: YearlyReturnOverrides
): YearlyReturnPoint[] {
  const byYear = new Map<number, YearlyReturnPoint>();
  for (const point of computed) byYear.set(point.year, point);
  for (const [yearStr, value] of Object.entries(overrides)) {
    const year = Number(yearStr);
    if (!Number.isFinite(value)) continue;
    byYear.set(year, { year, amount: value, isManual: true });
  }
  return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
}

const FOREIGN_CAPITAL_GAINS_EXEMPTION_KRW = 2_500_000; // 해외주식 양도소득 연간 기본공제
const FOREIGN_CAPITAL_GAINS_TAX_RATE = 0.22; // 양도소득세 20% + 지방소득세 2%

export interface ForeignCapitalGainsTaxEstimate {
  year: number;
  realizedGain: number; // that year's realized gain on non-KRW holdings, from transactions only
  exemption: number;
  taxableAmount: number;
  estimatedTax: number;
}

/**
 * Rough estimate of Korean 해외주식(외화표시 주식) 양도소득세 for one year:
 * (해외주식 실현손익 - 연 250만원 기본공제) x 22%, floored at 0. Only
 * counts realized gains from holdings whose currency isn't KRW (KRW-listed
 * stocks are ordinarily exempt for retail investors) and only from actual
 * transaction history - lump-sum manual realized-P&L overrides aren't
 * currency-tagged, so they're excluded here. Not tax advice: doesn't model
 * 대주주 status, loss carryforward/통산 across years, or withholding.
 */
export function estimateForeignCapitalGainsTax(
  holdings: Holding[],
  year: number,
  fxRatesToKRW: Record<string, number> = {}
): ForeignCapitalGainsTaxEstimate {
  let realizedGain = 0;
  for (const holding of holdings) {
    if (holding.currency === "KRW") continue;
    const events = walkTransactionsRealizedEvents(holding.transactions);
    for (const event of events) {
      if (new Date(event.date).getFullYear() === year) {
        realizedGain += convertToKRW(event.amount, holding.currency, fxRatesToKRW);
      }
    }
  }
  const taxableAmount = Math.max(0, realizedGain - FOREIGN_CAPITAL_GAINS_EXEMPTION_KRW);
  const estimatedTax = taxableAmount * FOREIGN_CAPITAL_GAINS_TAX_RATE;
  return {
    year,
    realizedGain,
    exemption: FOREIGN_CAPITAL_GAINS_EXEMPTION_KRW,
    taxableAmount,
    estimatedTax,
  };
}
