import { Account, Holding, Transaction } from "./types";

const HOLDINGS_KEY = "stock-dashboard.holdings.v1";
const ACCOUNTS_KEY = "stock-dashboard.accounts.v1";
const TARGET_AMOUNT_KEY = "stock-dashboard.targetAmount.v1";
const YEARLY_OVERRIDES_KEY = "stock-dashboard.yearlyReturnOverrides.v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function createId(prefix: string): string {
  if (isBrowser() && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createHoldingId(): string {
  return createId("h");
}

export function createTransactionId(): string {
  return createId("t");
}

export function createAccountId(): string {
  return createId("a");
}

// Pre-transactions holdings stored a single quantity/avgBuyPrice/buyDate.
// Anything already read from storage without a `transactions` array is that
// older shape - fold it into one synthetic "buy" transaction so existing
// portfolios keep working after this upgrade.
interface LegacyHolding {
  id: string;
  symbol: string;
  name: string;
  currency: string;
  quantity?: number;
  avgBuyPrice?: number;
  buyDate?: string;
  manualPrice?: number;
  accountId?: string;
  transactions?: Transaction[];
}

function migrateHolding(raw: LegacyHolding): Holding {
  if (Array.isArray(raw.transactions)) {
    return {
      id: raw.id,
      symbol: raw.symbol,
      name: raw.name,
      currency: raw.currency,
      accountId: raw.accountId,
      manualPrice: raw.manualPrice,
      transactions: raw.transactions,
    };
  }
  const transactions: Transaction[] =
    raw.quantity != null && raw.avgBuyPrice != null
      ? [
          {
            id: createTransactionId(),
            type: "buy",
            quantity: raw.quantity,
            price: raw.avgBuyPrice,
            date: raw.buyDate ?? new Date().toISOString().slice(0, 10),
          },
        ]
      : [];
  return {
    id: raw.id,
    symbol: raw.symbol,
    name: raw.name,
    currency: raw.currency,
    accountId: raw.accountId,
    manualPrice: raw.manualPrice,
    transactions,
  };
}

export function loadHoldings(): Holding[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(HOLDINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as LegacyHolding[]).map(migrateHolding);
  } catch {
    return [];
  }
}

export function saveHoldings(holdings: Holding[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(HOLDINGS_KEY, JSON.stringify(holdings));
  } catch {
    // localStorage unavailable (private mode, quota) - fail silently
  }
}

export function loadAccounts(): Account[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Account[];
  } catch {
    return [];
  }
}

export function saveAccounts(accounts: Account[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // ignore
  }
}

export function loadTargetAmount(): number | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(TARGET_AMOUNT_KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveTargetAmount(value: number | null): void {
  if (!isBrowser()) return;
  try {
    if (value == null) {
      window.localStorage.removeItem(TARGET_AMOUNT_KEY);
    } else {
      window.localStorage.setItem(TARGET_AMOUNT_KEY, String(value));
    }
  } catch {
    // ignore
  }
}

export type YearlyReturnOverrides = Record<number, number>;

export function loadYearlyReturnOverrides(): YearlyReturnOverrides {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(YEARLY_OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as YearlyReturnOverrides;
  } catch {
    return {};
  }
}

export function saveYearlyReturnOverrides(overrides: YearlyReturnOverrides): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(YEARLY_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    // ignore
  }
}
