"use client";

import { NewsItem, Sentiment } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

interface NewsPanelProps {
  items: NewsItem[];
  isLoading: boolean;
  isMock: boolean;
}

const SENTIMENT_LABEL: Record<Sentiment, string> = {
  positive: "호재",
  neutral: "중립",
  negative: "악재",
};

const SENTIMENT_COLOR: Record<Sentiment, string> = {
  positive: "text-status-good bg-status-good/10",
  neutral: "text-ink-muted bg-ink-muted/10",
  negative: "text-status-critical bg-status-critical/10",
};

export function NewsPanel({ items, isLoading, isMock }: NewsPanelProps) {
  if (isLoading) {
    return <div className="text-sm text-ink-muted">뉴스를 불러오는 중...</div>;
  }

  if (items.length === 0) {
    return <div className="text-sm text-ink-muted">표시할 뉴스가 없습니다.</div>;
  }

  const positive = items.filter((i) => i.sentiment === "positive").length;
  const negative = items.filter((i) => i.sentiment === "negative").length;

  return (
    <div>
      <div className="mb-3 flex items-center gap-3 text-xs text-ink-secondary dark:text-ink-secondary-dark">
        <span>
          최근 {items.length}건 중 호재 {positive}건 · 악재 {negative}건
        </span>
        {isMock && (
          <span className="rounded bg-status-warning/20 px-1.5 py-0.5 text-status-warning">
            뉴스 API 연동 실패 - 예시 데이터
          </span>
        )}
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded border border-line-hairline p-3 text-sm dark:border-line-hairline-dark"
          >
            <div className="flex items-start justify-between gap-2">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-ink-primary hover:underline dark:text-ink-primary-dark"
              >
                {item.title}
              </a>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${SENTIMENT_COLOR[item.sentiment]}`}
              >
                {SENTIMENT_LABEL[item.sentiment]}
              </span>
            </div>
            <div className="mt-1 text-xs text-ink-muted">
              {item.source} · {formatDateTime(item.publishedAt)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
