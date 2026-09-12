import { NextRequest, NextResponse } from "next/server";
import { fetchYahooChart } from "@/lib/yahoo";
import { generateMockQuote } from "@/lib/mockData";
import { Quote } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  const live = await fetchYahooChart(symbol, "5d", "1d");
  if (live) {
    const quote: Quote = {
      symbol,
      price: live.regularMarketPrice,
      previousClose: live.previousClose,
      currency: live.currency,
      isMock: false,
      asOf: new Date().toISOString(),
    };
    return NextResponse.json(quote);
  }

  const mock = generateMockQuote(symbol);
  const quote: Quote = {
    symbol,
    price: mock.price,
    previousClose: mock.previousClose,
    currency: "USD",
    isMock: true,
    asOf: new Date().toISOString(),
  };
  return NextResponse.json(quote);
}
