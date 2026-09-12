import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchYahooChart, fetchYahooNews } from "@/lib/yahoo";
import { generateMockHistory, generateMockNews, generateMockQuote, inferCurrencyFromSymbol } from "@/lib/mockData";

export const dynamic = "force-dynamic";

function summarizeTrend(points: { date: string; close: number }[]): string {
  if (points.length === 0) return "가격 히스토리 없음";
  const recent = points.slice(-60); // ~last 3 months of trading days
  const first = recent[0].close;
  const last = recent[recent.length - 1].close;
  const high = Math.max(...recent.map((p) => p.close));
  const low = Math.min(...recent.map((p) => p.close));
  const changePercent = first > 0 ? ((last - first) / first) * 100 : 0;
  return `최근 약 3개월간 ${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}% (최고 ${high.toFixed(2)}, 최저 ${low.toFixed(2)}, 현재 ${last.toFixed(2)})`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다. Vercel 프로젝트 설정에서 추가해 주세요." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const symbol: string | undefined = body?.symbol;
  const name: string | undefined = body?.name;
  if (!symbol || !name) {
    return NextResponse.json({ error: "symbol과 name이 필요합니다." }, { status: 400 });
  }

  const [chart, newsItems] = await Promise.all([
    fetchYahooChart(symbol, "1y", "1d"),
    fetchYahooNews(symbol),
  ]);

  const points = chart?.points ?? generateMockHistory(symbol, 252);
  const currency = chart?.currency ?? inferCurrencyFromSymbol(symbol);
  const currentPrice = chart?.regularMarketPrice ?? generateMockQuote(symbol).price;

  const news = (newsItems ?? generateMockNews(symbol, name).map((n) => ({
    title: n.title,
    url: n.url,
    source: n.source,
    publishedAt: n.publishedAt,
  }))).slice(0, 6);

  const newsSummary = news.map((n) => `- ${n.title}`).join("\n");

  const userPrompt = `다음 종목에 대해 한국어로 간단한 투자 참고 분석을 작성해 주세요.

종목명: ${name} (${symbol})
현재가: ${currentPrice.toFixed(2)} ${currency}
가격 추세: ${summarizeTrend(points)}

최근 뉴스 헤드라인:
${newsSummary || "- 관련 뉴스 없음"}

다음 형식으로 작성해 주세요 (각 섹션 소제목 포함):
1. 가격 동향 요약
2. 최근 뉴스 요약 및 시사점
3. 강점 / 리스크 요인
4. 종합 의견

마지막에 반드시 "본 분석은 투자 조언이 아니며 참고용입니다."라는 문구를 포함해 주세요.`;

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 2048,
      output_config: { effort: "medium" },
      messages: [{ role: "user", content: userPrompt }],
    });

    let analysis = "";
    for (const block of response.content) {
      if (block.type === "text") analysis += block.text;
    }

    return NextResponse.json({ analysis, symbol, name });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: `분석 요청 실패: ${message}` }, { status: 502 });
  }
}
