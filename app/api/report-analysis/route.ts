import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const MAX_PROMPT_CHARS = 20000;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!formData || !file || !(file instanceof File)) {
    return NextResponse.json({ error: "PDF 파일이 필요합니다." }, { status: 400 });
  }
  const symbol = String(formData.get("symbol") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  const buffer = Buffer.from(await file.arrayBuffer());

  let text = "";
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    text = result.text;
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: `PDF 텍스트 추출 실패: ${message}` }, { status: 422 });
  } finally {
    await parser.destroy();
  }

  if (!text.trim()) {
    return NextResponse.json(
      { error: "PDF에서 텍스트를 추출하지 못했습니다 (스캔 이미지 PDF일 수 있습니다)." },
      { status: 422 }
    );
  }

  const truncated = text.slice(0, MAX_PROMPT_CHARS);
  const truncatedNote =
    text.length > MAX_PROMPT_CHARS ? `\n\n(문서가 길어 앞부분 ${MAX_PROMPT_CHARS}자만 사용했습니다.)` : "";

  const userPrompt = `다음은 증권사 리포트 등에서 추출한 PDF 텍스트입니다. 한국어로 핵심 인사이트를 마크다운으로 정리해 주세요.
${symbol || name ? `\n관련 종목: ${name} (${symbol})` : ""}

--- PDF 추출 텍스트 시작 ---
${truncated}${truncatedNote}
--- PDF 추출 텍스트 끝 ---

다음 형식으로 작성해 주세요 (### 제목 사용):
### 요약
### 핵심 수치
### 투자 시사점
### 리스크

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

    return NextResponse.json({ insight, textLength: text.length, fileName: file.name });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: `분석 실패: ${message}` }, { status: 502 });
  }
}
