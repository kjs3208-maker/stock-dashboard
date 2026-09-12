export interface Holding {
  id: string;
  symbol: string; // e.g. "AAPL", "005930.KS"
  name: string;
  quantity: number;
  avgBuyPrice: number;
  currency: string; // e.g. "USD", "KRW"
  buyDate: string; // ISO date, first purchase date
  manualPrice?: number; // user-entered current price, e.g. for K-OTC stocks Yahoo doesn't cover
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

export type Sentiment = "positive" | "neutral" | "negative";

export interface NewsItem {
  id: string;
  symbol: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string; // ISO date
  sentiment: Sentiment;
}

export interface NewsResult {
  symbol: string;
  items: NewsItem[];
  isMock: boolean;
}
