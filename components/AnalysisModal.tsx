"use client";

import { useEffect, useState } from "react";
import { fetchAnalysis } from "@/lib/marketData";

interface AnalysisModalProps {
  target: { symbol: string; name: string } | null;
  onClose: () => void;
}

export function AnalysisModal({ target, onClose }: AnalysisModalProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    // Fetching an analysis is triggered by `target` changing - the loading/
    // reset state below can't be derived at render time, so this effect is
    // the one legitimate place to set it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setAnalysis(null);
    setError(null);
    fetchAnalysis(target.symbol, target.name).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.error) setError(result.error);
      else setAnalysis(result.analysis ?? "");
    });
    return () => {
      cancelled = true;
    };
  }, [target]);

  if (!target) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg border border-line-hairline bg-surface p-5 shadow-lg dark:border-line-hairline-dark dark:bg-surface-dark">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-primary dark:text-ink-primary-dark">
            {target.name} ({target.symbol}) AI 분석
          </h2>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-ink-muted hover:bg-plane dark:hover:bg-plane-dark"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {loading && (
          <div className="py-8 text-center text-sm text-ink-muted">분석 중입니다...</div>
        )}

        {error && (
          <div className="rounded border border-status-critical/40 bg-status-critical/10 p-3 text-sm text-status-critical">
            {error}
          </div>
        )}

        {analysis && (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink-primary dark:text-ink-primary-dark">
            {analysis}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded border border-line-hairline px-4 py-2 text-sm dark:border-line-hairline-dark"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
