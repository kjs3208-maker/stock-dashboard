import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchDartDisclosures } from "@/lib/dart";
import { searchNaverNews } from "@/lib/naverNews";
import { fetchYahooNews } from "@/lib/yahoo";
import { generateMockNews } from "@/lib/mockData";

export const dynamic = "force-dynamic";

interface NewsLike {
  title: string;
  description?: string;
  url: string;
  source: string;
  publishedAt: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const symbol: string | undefined = body?.symbol;
  const name: string | undefined = body?.name;
  const stockCode: string | undefined = body?.stockCode; // 6-digit KRX code, for DART lookup
  if (!symbol || !name) {
    return NextResponse.json({ error: "symbol과 name이 필요합니다." }, { status: 400 });
  }

  const dartConfigured = Boolean(process.env.DART_API_KEY);
  const naverConfigured = Boolean(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);

  const [disclosures, naverNews, yahooNews] = await Promise.all([
    stockCode ? fetchDartDisclosures(stockCode).catch(() => null) : Promise.resolve(null),
    searchNaverNews(name).catch(() => null),
    fetchYahooNews(symbol).catch(() => null),
  ]);

  let news: NewsLike[];
  let newsSource: "naver" | "yahoo" | "mock";
  if (naverNews && naverNews.length > 0) {
    news = naverNews;
    newsSource = "naver";
  } else if (yahooNews && yahooNews.length > 0) {
    news = yahooNews.map((n) => ({ ...n, description: undefined }));
    newsSource = "yahoo";
  } else {
    news = generateMockNews(symbol, name).map((n) => ({
      title: n.title,
      url: n.url,
      source: n.source,
      publishedAt: n.publishedAt,
    }));
    newsSource = "mock";
  }
  news = news.slice(0, 8);

  const disclosureList = disclosures ?? [];

  const disclosureSummary =
    disclosureList.length > 0
      ? disclosureList
          .slice(0, 10)
          .map((d) => `- [${d.reportedAt}] ${d.title} (${d.submitter})`)
          .join("\n")
      : "- 조회된 공시 없음";

  const newsSummary = news.map((n) => `- ${n.title}${n.description ? ` - ${n.description}` : ""}`).join("\n");

  const userPrompt = `다음 종목/키워드에 대해 한국어로 핵심 인사이트를 마크다운 형식으로 정리해 주세요.

종목명: ${name} (${symbol})

최근 공시 (DART):
${disclosureSummary}

최근 뉴스:
${newsSummary || "- 관련 뉴스 없음"}

다음 형식으로 작성해 주세요 (마크다운 제목 ### 사용):
### 요약
### 공시 시사점
### 뉴스 시사점
### 체크포인트 (확인이 필요한 항목을 목록으로)

마지막에 반드시 "본 내용은 투자 조언이 아니며 참고용입니다."라는 문구를 포함해 주세요.`;

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 2048,
      output_config: { effort: "medium" },
      messages: [{ role: "user", content: userPrompt }],
    });

    let insight = "";
    for (const block of response.content) {
      if (block.type === "text") insight += block.text;
    }

    return NextResponse.json({
      symbol,
      name,
      disclosures: disclosureList,
      dartConfigured,
      naverConfigured,
      news,
      newsSource,
      insight,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: `인사이트 수집 실패: ${message}` }, { status: 502 });
  }
}
