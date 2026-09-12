export const BASE_CURRENCY = "KRW";

/** Approximate KRW-per-1-unit rates, used only when the live FX lookup
 * fails. Rough order-of-magnitude values - good enough to make cross-
 * currency totals directionally sane, not for precise accounting. */
export const FALLBACK_FX_TO_KRW: Record<string, number> = {
  KRW: 1,
  USD: 1380,
  JPY: 9.2,
  EUR: 1490,
  GBP: 1750,
  HKD: 177,
};

export const FX_CURRENCIES = Object.keys(FALLBACK_FX_TO_KRW).filter((c) => c !== "KRW");

export interface FxRates {
  ratesToKRW: Record<string, number>;
  isMock: boolean;
}

/** Converts an amount in `currency` to its KRW-equivalent using the given
 * rate table, falling back to the static approximation for any currency
 * the table doesn't cover. */
export function convertToKRW(amount: number, currency: string, rates: Record<string, number>): number {
  if (currency === BASE_CURRENCY) return amount;
  const rate = rates[currency] ?? FALLBACK_FX_TO_KRW[currency] ?? 1;
  return amount * rate;
}

/** Inverse of convertToKRW - turns a KRW amount back into `currency`. */
export function convertFromKRW(amountInKRW: number, currency: string, rates: Record<string, number>): number {
  if (currency === BASE_CURRENCY) return amountInKRW;
  const rate = rates[currency] ?? FALLBACK_FX_TO_KRW[currency] ?? 1;
  return rate > 0 ? amountInKRW / rate : 0;
}
