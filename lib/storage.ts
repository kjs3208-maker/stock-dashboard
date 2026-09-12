import { Holding } from "./types";

const STORAGE_KEY = "stock-dashboard.holdings.v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadHoldings(): Holding[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Holding[];
  } catch {
    return [];
  }
}

export function saveHoldings(holdings: Holding[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
  } catch {
    // localStorage unavailable (private mode, quota) - fail silently
  }
}

export function createHoldingId(): string {
  if (isBrowser() && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }
  return `h_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
