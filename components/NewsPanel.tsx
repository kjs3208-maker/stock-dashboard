"use client";

import { NewsItem } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

interface NewsPanelProps {
  items: NewsItem[];
  isLoading: boolean;
  isMock: boolean;
}

export function NewsPanel({ items, isLoading, isMock }: NewsPanelProps) {
  if (isLoading) {
    return <div className="text-sm text-ink-muted">뉴스를 불러오는 중...</div>;
  }

  if (items.length === 0) {
    return <div className="text-sm text-ink-muted">표시할 뉴스가 없습니다.</div>;
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-3 text-xs text-ink-secondary dark:text-ink-secondary-dark">
        <span>최근 소식 {items.length}건 (최신순)</span>
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
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-ink-primary hover:underline dark:text-ink-primary-dark"
            >
              {item.title}
            </a>
            <div className="mt-1 text-xs text-ink-muted">
              {item.source} · {formatDateTime(item.publishedAt)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
