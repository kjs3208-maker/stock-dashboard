import { NextRequest, NextResponse } from "next/server";
import { fetchYahooNews } from "@/lib/yahoo";
import { generateMockNews } from "@/lib/mockData";
import { analyzeSentiment } from "@/lib/sentiment";
import { NewsItem, NewsResult } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  const name = req.nextUrl.searchParams.get("name") ?? symbol ?? "";
  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  const live = await fetchYahooNews(symbol);
  if (live && live.length > 0) {
    const items: NewsItem[] = live.map((n, i) => ({
      id: `${symbol}-${i}`,
      symbol,
      title: n.title,
      source: n.source,
      url: n.url,
      publishedAt: n.publishedAt,
      sentiment: analyzeSentiment(n.title),
    }));
    const result: NewsResult = { symbol, items, isMock: false };
    return NextResponse.json(result);
  }

  const result: NewsResult = {
    symbol,
    items: generateMockNews(symbol, name),
    isMock: true,
  };
  return NextResponse.json(result);
}
