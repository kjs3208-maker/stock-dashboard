"use client";

import { useRef, useState } from "react";
import { fetchReportAnalysis, ReportAnalysisResult } from "@/lib/marketData";
import { formatDate } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";

interface ReportUploadPanelProps {
  onSaveAsNote: (note: { title: string; content: string; symbol?: string }) => void;
}

export function ReportUploadPanel({ onSaveAsNote }: ReportUploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReportAnalysisResult | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setSaved(false);
    setLoading(true);
    const res = await fetchReportAnalysis(file, symbol.trim() || undefined);
    setLoading(false);
    setResult(res);
  }

  function handleSave() {
    if (!result?.insight) return;
    onSaveAsNote({
      title: `${result.fileName ?? fileName ?? "리포트"} 분석 (${formatDate(new Date().toISOString())})`,
      content: result.insight,
      symbol: symbol.trim() || undefined,
    });
    setSaved(true);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-ink-secondary dark:text-ink-secondary-dark">
            연결할 종목코드 (선택)
          </span>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="예: 138080.KQ"
            className="w-32 rounded border border-line-hairline bg-transparent px-2 py-1.5 text-sm dark:border-line-hairline-dark"
          />
        </label>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="rounded bg-series-1 px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "분석 중..." : "PDF 업로드 및 분석"}
        </button>
        {fileName && !loading && (
          <span className="text-xs text-ink-muted">{fileName}</span>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {result?.error && (
        <div className="mt-3 rounded border border-status-critical/40 bg-status-critical/10 p-3 text-sm text-status-critical">
          {result.error}
        </div>
      )}

      {result?.insight && (
        <div className="mt-4 flex flex-col gap-3">
          <div
            className="md-note rounded border border-line-hairline p-4 dark:border-line-hairline-dark"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(result.insight) }}
          />
          <div>
            <button
              onClick={handleSave}
              disabled={saved}
              className="rounded border border-line-hairline px-3 py-1.5 text-sm text-series-1 hover:bg-series-1/10 disabled:opacity-50 dark:border-line-hairline-dark"
            >
              {saved ? "저장됨" : "리서치 노트로 저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
