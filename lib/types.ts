export interface Account {
  id: string;
  name: string; // e.g. "키움증권-일반", "연금저축"
  currency: string; // currency the cash balance is held in
  cashBalance: number; // 예수금 - cash currently sitting in the account
  totalDeposited: number; // 계좌투입금 - cumulative capital ever put into the account
  manualRealizedPnl?: number; // 실현손익 일괄 입력 - a lump sum for gains/losses already
  // realized on trades whose individual buy/sell transactions were never
  // entered per holding; added on top of any per-holding realized P&L
  manualConfirmedDividends?: number; // 배당금 일괄 입력 - a lump sum for dividends already
  // received but never entered per holding/date; added on top of any
  // per-holding confirmed dividend total
}

export type TransactionType = "buy" | "sell";

export interface Transaction {
  id: string;
  type: TransactionType;
  quantity: number;
  price: number;
  date: string; // ISO date
  fee?: number; // 수수료 (+ any transfer tax on sells)
}

export type DividendStatus = "expected" | "confirmed";

export interface Dividend {
  id: string;
  date: string; // ISO date - expected or actual pay date
  expectedAmount: number;
  currency: string; // may differ from the holding's own currency, e.g. a
  // USD stock's dividend paid out (and recorded) in KRW
  status: DividendStatus;
  confirmedAmount?: number; // may differ from expectedAmount once confirmed
}

export interface Holding {
  id: string;
  symbol: string; // e.g. "AAPL", "005930.KS"
  name: string;
  currency: string; // e.g. "USD", "KRW"
  accountId?: string;
  manualPrice?: number; // user-entered current price, e.g. for K-OTC stocks Yahoo doesn't cover
  transactions: Transaction[];
  dividends: Dividend[];
  note?: string; // free-text - why bought, thesis, reminders
  targetWeightPercent?: number; // desired allocation share, for rebalancing suggestions
}

export interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  currency: string;
  note?: string;
  addedDate: string; // ISO date
}

export interface Quote {
  symbol: string;
  price: number;
  previousClose: number;
  currency: string;
  isMock: boolean;
  isManual?: boolean; // true when derived from Holding.manualPrice rather than a live/mock lookup
  asOf: string;
}

export interface HistoryPoint {
  date: string; // ISO date
  close: number;
}

export interface HistoryResult {
  symbol: string;
  points: HistoryPoint[];
  isMock: boolean;
}

export interface NewsItem {
  id: string;
  symbol: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string; // ISO date
}

export interface NewsResult {
  symbol: string;
  items: NewsItem[];
  isMock: boolean;
}
