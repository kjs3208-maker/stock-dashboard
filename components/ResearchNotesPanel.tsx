"use client";

import { useMemo, useState } from "react";
import { ResearchNote, ResearchNoteCategory } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";

interface ResearchNotesPanelProps {
  notes: ResearchNote[];
  onAdd: (note: { title: string; content: string; category: ResearchNoteCategory; symbol?: string }) => void;
  onUpdate: (
    id: string,
    patch: { title: string; content: string; category: ResearchNoteCategory; symbol?: string }
  ) => void;
  onDelete: (id: string) => void;
}

const CATEGORIES: ResearchNoteCategory[] = ["종목분석", "인사이트", "일반"];

const CATEGORY_COLOR: Record<ResearchNoteCategory, string> = {
  종목분석: "bg-series-1/10 text-series-1",
  인사이트: "bg-status-warning/10 text-status-warning",
  일반: "bg-ink-muted/15 text-ink-secondary dark:text-ink-secondary-dark",
};

function emptyDraft() {
  return { title: "", content: "", category: "일반" as ResearchNoteCategory, symbol: "" };
}

export function ResearchNotesPanel({ notes, onAdd, onUpdate, onDelete }: ResearchNotesPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [filterSymbol, setFilterSymbol] = useState<string | null>(null);

  const symbols = useMemo(() => {
    const set = new Set<string>();
    for (const n of notes) if (n.symbol) set.add(n.symbol);
    return Array.from(set).sort();
  }, [notes]);

  const sorted = useMemo(
    () =>
      [...notes]
        .filter((n) => !filterSymbol || n.symbol === filterSymbol)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [notes, filterSymbol]
  );

  function startAdd() {
    setEditingId(null);
    setDraft(emptyDraft());
    setFormOpen(true);
  }

  function startEdit(note: ResearchNote) {
    setEditingId(note.id);
    setDraft({
      title: note.title,
      content: note.content,
      category: note.category,
      symbol: note.symbol ?? "",
    });
    setFormOpen(true);
    setExpandedId(null);
  }

  function cancelForm() {
    setFormOpen(false);
    setEditingId(null);
    setDraft(emptyDraft());
  }

  function submit() {
    const title = draft.title.trim();
    const content = draft.content.trim();
    if (!title || !content) return;
    const payload = {
      title,
      content,
      category: draft.category,
      symbol: draft.symbol.trim() || undefined,
    };
    if (editingId) {
      onUpdate(editingId, payload);
    } else {
      onAdd(payload);
    }
    cancelForm();
  }

  return (
    <div>
      {symbols.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setFilterSymbol(null)}
            className={`rounded-full px-2.5 py-1 ${
              filterSymbol == null
                ? "bg-series-1 text-white"
                : "bg-plane text-ink-secondary dark:bg-plane-dark dark:text-ink-secondary-dark"
            }`}
          >
            전체
          </button>
          {symbols.map((s) => (
            <button
              key={s}
              onClick={() => setFilterSymbol(s)}
              className={`rounded-full px-2.5 py-1 ${
                filterSymbol === s
                  ? "bg-series-1 text-white"
                  : "bg-plane text-ink-secondary dark:bg-plane-dark dark:text-ink-secondary-dark"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="mb-3 text-sm text-ink-muted">등록된 리서치 노트가 없습니다.</div>
      ) : (
        <ul className="mb-3 flex flex-col gap-2 text-sm">
          {sorted.map((note) => {
            const expanded = expandedId === note.id;
            return (
              <li
                key={note.id}
                className="rounded border border-line-hairline dark:border-line-hairline-dark"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <button
                    onClick={() => setExpandedId(expanded ? null : note.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${CATEGORY_COLOR[note.category]}`}
                    >
                      {note.category}
                    </span>
                    {note.symbol && (
                      <span className="shrink-0 rounded bg-plane px-1.5 py-0.5 text-xs text-ink-muted dark:bg-plane-dark">
                        {note.symbol}
                      </span>
                    )}
                    <span className="truncate font-medium text-ink-primary dark:text-ink-primary-dark">
                      {note.title}
                    </span>
                    <span className="shrink-0 text-xs text-ink-muted">
                      {formatDate(note.updatedAt)}
                    </span>
                  </button>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => startEdit(note)}
                      className="rounded px-1.5 py-0.5 text-xs text-series-1 hover:bg-series-1/10"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => onDelete(note.id)}
                      className="rounded px-1.5 py-0.5 text-xs text-status-critical hover:bg-status-critical/10"
                    >
                      삭제
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div
                    className="md-note border-t border-line-hairline px-4 py-3 text-sm dark:border-line-hairline-dark"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(note.content) }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!formOpen && (
        <button
          onClick={startAdd}
          className="rounded border border-line-hairline px-3 py-1.5 text-sm text-series-1 hover:bg-series-1/10 dark:border-line-hairline-dark"
        >
          + 리서치 노트 추가
        </button>
      )}

      {formOpen && (
        <div className="flex flex-col gap-2 rounded border border-line-hairline p-3 dark:border-line-hairline-dark">
          <div className="flex flex-wrap gap-2">
            <input
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="제목 (예: 오이솔루션 종목 분석)"
              className="min-w-0 flex-1 rounded border border-line-hairline bg-transparent px-2 py-1.5 text-sm dark:border-line-hairline-dark"
            />
            <select
              value={draft.category}
              onChange={(e) =>
                setDraft((d) => ({ ...d, category: e.target.value as ResearchNoteCategory }))
              }
              className="rounded border border-line-hairline bg-transparent px-2 py-1.5 text-sm dark:border-line-hairline-dark"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              value={draft.symbol}
              onChange={(e) => setDraft((d) => ({ ...d, symbol: e.target.value }))}
              placeholder="종목코드 (선택)"
              className="w-32 rounded border border-line-hairline bg-transparent px-2 py-1.5 text-sm dark:border-line-hairline-dark"
            />
          </div>
          <textarea
            value={draft.content}
            onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
            placeholder="마크다운 형식으로 내용을 붙여넣으세요 (제목 #, 표, 목록 등 지원)"
            rows={10}
            className="w-full rounded border border-line-hairline bg-transparent px-2 py-1.5 text-sm dark:border-line-hairline-dark"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={cancelForm}
              className="rounded border border-line-hairline px-3 py-1.5 text-sm dark:border-line-hairline-dark"
            >
              취소
            </button>
            <button
              onClick={submit}
              className="rounded bg-series-1 px-3 py-1.5 text-sm text-white hover:opacity-90"
            >
              {editingId ? "저장" : "추가"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
