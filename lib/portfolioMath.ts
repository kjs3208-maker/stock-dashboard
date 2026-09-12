import { Holding, HistoryPoint, Quote } from "./types";

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

export interface HoldingMetrics {
  marketValue: number;
  costBasis: number;
  pnl: number;
  pnlPercent: number;
  dayChange: number;
  dayChangePercent: number;
}

export function computeHoldingMetrics(
  holding: Holding,
  quote: Quote | null
): HoldingMetrics {
  const costBasis = holding.quantity * holding.avgBuyPrice;
  if (!quote) {
    return { marketValue: 0, costBasis, pnl: 0, pnlPercent: 0, dayChange: 0, dayChangePercent: 0 };
  }
  const marketValue = holding.quantity * quote.price;
  const pnl = marketValue - costBasis;
  const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
  const dayChange = holding.quantity * (quote.price - quote.previousClose);
  const dayChangePercent =
    quote.previousClose > 0
      ? ((quote.price - quote.previousClose) / quote.previousClose) * 100
      : 0;
  return { marketValue, costBasis, pnl, pnlPercent, dayChange, dayChangePercent };
}

export interface YearlyReturnPoint {
  year: number;
  returnPercent: number;
}

/**
 * Approximate portfolio-level yearly return, mixing every holding's raw
 * currency amounts without FX conversion. Fine for a single-currency
 * portfolio; callers should surface a caveat when holdings span more than
 * one currency.
 */
export function computeYearlyReturns(
  holdings: Holding[],
  historyBySymbol: Record<string, HistoryPoint[]>
): YearlyReturnPoint[] {
  if (holdings.length === 0) return [];

  const currentYear = new Date().getFullYear();
  const earliestYear = Math.min(
    ...holdings.map((h) => new Date(h.buyDate).getFullYear())
  );

  function closeOnOrBefore(points: HistoryPoint[], cutoff: Date): number | null {
    let result: number | null = null;
    for (const p of points) {
      const d = new Date(p.date);
      if (d.getTime() <= cutoff.getTime()) {
        result = p.close;
      } else {
        break;
      }
    }
    return result;
  }

  const results: YearlyReturnPoint[] = [];

  for (let year = earliestYear; year <= currentYear; year++) {
    const yearEndCutoff = new Date(year, 11, 31, 23, 59, 59);
    const prevYearEndCutoff = new Date(year - 1, 11, 31, 23, 59, 59);

    let totalStart = 0;
    let totalEnd = 0;

    for (const holding of holdings) {
      const buyYear = new Date(holding.buyDate).getFullYear();
      if (buyYear > year) continue; // not held yet in this year

      const points = historyBySymbol[holding.symbol] ?? [];

      const startValue =
        buyYear === year
          ? holding.quantity * holding.avgBuyPrice
          : (() => {
              const close = closeOnOrBefore(points, prevYearEndCutoff);
              return close != null ? holding.quantity * close : null;
            })();

      const endClose = closeOnOrBefore(points, yearEndCutoff);
      const endValue = endClose != null ? holding.quantity * endClose : null;

      if (startValue != null) totalStart += startValue;
      if (endValue != null) totalEnd += endValue;
    }

    if (totalStart > 0) {
      results.push({
        year,
        returnPercent: ((totalEnd - totalStart) / totalStart) * 100,
      });
    }
  }

  return results;
}
