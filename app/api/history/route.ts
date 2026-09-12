import { NextRequest, NextResponse } from "next/server";
import { fetchYahooChart } from "@/lib/yahoo";
import { generateMockHistory } from "@/lib/mockData";
import { HistoryResult } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  const years = Number(req.nextUrl.searchParams.get("years") ?? "5");
  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  const live = await fetchYahooChart(symbol, `${years}y`, "1d");
  if (live) {
    const result: HistoryResult = {
      symbol,
      points: live.points,
      isMock: false,
    };
    return NextResponse.json(result);
  }

  const result: HistoryResult = {
    symbol,
    points: generateMockHistory(symbol, Math.round(years * 252)),
    isMock: true,
  };
  return NextResponse.json(result);
}
