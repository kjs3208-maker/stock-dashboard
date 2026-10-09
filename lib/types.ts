export interface AccountDeposit {
  id: string;
  date: string; // ISO date
  amount: number;
  note?: string;
}

export interface Account {
  id: string;
  name: string; // e.g. "키움증권-일반", "연금저축"
  currency: string; // currency the cash balance is held in
  cashBalance: number; // 예수금 - cash currently sitting in the account
  totalDeposited: number; // 계좌투입금 - cumulative capital ever put into the account.
  // Manually edited when `deposits` is empty; once `deposits` has entries,
  // this becomes derived (their sum) instead - see effectiveTotalDeposited().
  deposits?: AccountDeposit[]; // dated log of individual deposits, for
  // accounts that receive contributions continuously over time rather than
  // as a single lump sum
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
  sector?: string; // free-text sector/theme tag (e.g. "반도체"), for concentration warnings
  updatedAt?: string; // ISO date - bumped whenever the holding or its transactions change,
  // so the holdings table can show "최근 수정일" before the user re-enters something
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

export type NetWorthAssetCategory = "부동산" | "RSU" | "성과급(OPI)" | "현금성" | "기타";

export interface NetWorthAsset {
  id: string;
  category: NetWorthAssetCategory;
  name: string; // e.g. "자가주택", "전세보증금", "삼성전자 RSU"
  grossValue: number; // 세전 평가액/예정액, KRW - ignored when rsuQuantity is set and a live
  // price is available (see resolveNetWorthAssetGrossValue)
  rsuQuantity?: number; // RSU 전용(선택): 보유/예정 수량. 설정하면 평가액을 현재가 × 수량으로
  // 실시간 계산한다 (연동할 종목 시세가 없으면 grossValue로 대체)
  vestDate?: string; // RSU/OPI 전용(선택): 베스팅/지급 예정일, 참고 표시용
  taxRatePercent: number; // 적용 세율(%) - RSU/OPI는 근로소득세 한계세율, 그 외는 보통 0
  note?: string;
  updatedAt: string; // ISO date
}

export interface NetWorthGoalSettings {
  totalTargetAmount: number; // 전체 순자산 목표 (KRW), e.g. 100억
  stockTargetAmount: number; // 그중 주식 포트폴리오 목표 (KRW), e.g. 50억
  assumedAnnualReturnPercent: number; // 주식 포트폴리오 가정 연수익률(%)
  assumedAnnualStockContribution: number; // 주식 계좌 연간 추가납입 가정액 (KRW)
  otherAssetAnnualGrowthPercent: number; // 주식 외 자산(부동산 등) 가정 연성장률(%)
}

export interface EmergencyFundSettings {
  monthlyEssentialExpense: number; // 월 필수 생활비 (KRW)
  targetMonths: number; // 목표 개월수 (예: 6)
}

export type ResearchNoteCategory = "종목분석" | "인사이트" | "일반";

export interface ResearchNote {
  id: string;
  title: string;
  content: string; // markdown
  category: ResearchNoteCategory;
  symbol?: string; // optional link to a holding/watchlist symbol
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}
