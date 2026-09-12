import { HistoryPoint, NewsItem, Sentiment } from "./types";

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic base price in [20, 520) derived from the symbol, so the
 * same ticker always produces a plausible, stable-looking mock price. */
function basePriceFor(symbol: string): number {
  const seed = hashString(symbol.toUpperCase());
  const rng = mulberry32(seed);
  return 20 + rng() * 500;
}

export function generateMockHistory(
  symbol: string,
  days: number
): HistoryPoint[] {
  const seed = hashString(symbol.toUpperCase());
  const rng = mulberry32(seed);
  let price = basePriceFor(symbol);
  const today = new Date();

  // Walk forward from well before `today` so weekday-only sampling never
  // has to cross into the future to gather `days` worth of points.
  const calendarDaysBack = Math.ceil((days * 7) / 5) + 14;
  const cursor = new Date(today);
  cursor.setDate(cursor.getDate() - calendarDaysBack);

  const dailyPoints: { date: Date; close: number }[] = [];
  while (cursor.getTime() <= today.getTime()) {
    cursor.setDate(cursor.getDate() + 1);
    if (cursor.getTime() > today.getTime()) break;
    const day = cursor.getDay();
    if (day === 0 || day === 6) continue; // skip weekends
    const drift = 0.0002; // slight upward drift long-term
    const volatility = 0.018;
    const change = drift + (rng() - 0.5) * volatility * 2;
    price = Math.max(1, price * (1 + change));
    dailyPoints.push({ date: new Date(cursor), close: Math.round(price * 100) / 100 });
  }

  const trimmed =
    dailyPoints.length > days ? dailyPoints.slice(dailyPoints.length - days) : dailyPoints;

  return trimmed.map((p) => ({
    date: p.date.toISOString().slice(0, 10),
    close: p.close,
  }));
}

export function generateMockQuote(symbol: string): {
  price: number;
  previousClose: number;
} {
  const history = generateMockHistory(symbol, 5);
  const last = history[history.length - 1];
  const prev = history[history.length - 2] ?? last;
  return { price: last.close, previousClose: prev.close };
}

const HEADLINE_TEMPLATES: { text: string; sentiment: Sentiment }[] = [
  { text: "{name}, 시장 예상치 상회하는 분기 실적 발표", sentiment: "positive" },
  { text: "{name}, 신규 제품 라인업 공개... 투자자 기대감 확대", sentiment: "positive" },
  { text: "애널리스트, {name} 목표 주가 상향 조정", sentiment: "positive" },
  { text: "{name}, 업계 파트너십 체결로 사업 확장", sentiment: "positive" },
  { text: "{name} 주가, 거시경제 우려 속 보합권 마감", sentiment: "neutral" },
  { text: "{name}, 신제품 출시 일정 공개", sentiment: "neutral" },
  { text: "{name} 관련 업계 컨퍼런스 개최 예정", sentiment: "neutral" },
  { text: "{name}, 공급망 이슈로 단기 실적 우려 제기", sentiment: "negative" },
  { text: "규제 리스크 부각... {name} 주가 압박", sentiment: "negative" },
  { text: "애널리스트, {name} 목표 주가 하향 조정", sentiment: "negative" },
];

const SOURCES = ["연합인포맥스", "한국경제", "매일경제", "Bloomberg", "Reuters", "이데일리"];

export function generateMockNews(symbol: string, name: string): NewsItem[] {
  const seed = hashString(`news:${symbol.toUpperCase()}`);
  const rng = mulberry32(seed);
  const count = 4 + Math.floor(rng() * 3); // 4-6 items
  const items: NewsItem[] = [];
  const usedIdx = new Set<number>();

  for (let i = 0; i < count; i++) {
    let idx = Math.floor(rng() * HEADLINE_TEMPLATES.length);
    let attempts = 0;
    while (usedIdx.has(idx) && attempts < 10) {
      idx = Math.floor(rng() * HEADLINE_TEMPLATES.length);
      attempts++;
    }
    usedIdx.add(idx);
    const template = HEADLINE_TEMPLATES[idx];
    const daysAgo = Math.floor(rng() * 10);
    const publishedAt = new Date();
    publishedAt.setDate(publishedAt.getDate() - daysAgo);
    const source = SOURCES[Math.floor(rng() * SOURCES.length)];

    items.push({
      id: `${symbol}-mock-${i}`,
      symbol,
      title: template.text.replace("{name}", name || symbol),
      source,
      url: "#",
      publishedAt: publishedAt.toISOString(),
      sentiment: template.sentiment,
    });
  }

  return items.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}
