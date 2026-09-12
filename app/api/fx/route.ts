import { NextResponse } from "next/server";
import { fetchYahooChart } from "@/lib/yahoo";
import { FALLBACK_FX_TO_KRW, FX_CURRENCIES } from "@/lib/fx";

export const dynamic = "force-dynamic";

export async function GET() {
  const ratesToKRW: Record<string, number> = { KRW: 1 };
  let isMock = false;

  await Promise.all(
    FX_CURRENCIES.map(async (currency) => {
      const live = await fetchYahooChart(`${currency}KRW=X`, "5d", "1d");
      if (live && live.regularMarketPrice > 0) {
        ratesToKRW[currency] = live.regularMarketPrice;
      } else {
        ratesToKRW[currency] = FALLBACK_FX_TO_KRW[currency];
        isMock = true;
      }
    })
  );

  return NextResponse.json({ ratesToKRW, isMock });
}
