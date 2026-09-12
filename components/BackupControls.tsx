"use client";

import { useRef } from "react";
import { BackupData, exportBackup } from "@/lib/storage";

interface BackupControlsProps {
  onImported: (data: BackupData) => void;
}

export function BackupControls({ onImported }: BackupControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const data = exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-dashboard-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (
      !window.confirm(
        "백업 파일을 불러오면 현재 저장된 모든 데이터(종목, 계좌, 관심종목 등)가 덮어씌워집니다. 계속할까요?"
      )
    ) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as BackupData;
        onImported(data);
      } catch {
        window.alert("백업 파일을 읽을 수 없습니다. 올바른 JSON 파일인지 확인해 주세요.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleExport}
        className="rounded border border-line-hairline px-3 py-2 text-sm dark:border-line-hairline-dark"
      >
        내보내기
      </button>
      <button
        onClick={handleImportClick}
        className="rounded border border-line-hairline px-3 py-2 text-sm dark:border-line-hairline-dark"
      >
        가져오기
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
