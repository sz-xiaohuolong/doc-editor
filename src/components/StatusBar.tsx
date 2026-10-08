import React from "react";
import { CheckCircle2, RefreshCw, HardDrive } from "lucide-react";

interface StatusBarProps {
  isSaving: boolean;
  isDirty: boolean;
  lastSavedAt: Date | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({ isSaving, isDirty, lastSavedAt }) => {
  return (
    <footer className="h-7 border-t border-slate-100 bg-white/80 px-4 flex items-center justify-between text-[11px] text-slate-400 select-none">
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1">
          <HardDrive className="w-3 h-3 text-slate-400" />
          <span>本地文件存储</span>
        </span>
        <span>•</span>
        {isSaving ? (
          <span className="flex items-center gap-1 text-blue-500 animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>正在自动保存...</span>
          </span>
        ) : isDirty ? (
          <span className="text-amber-500">有未保存改动</span>
        ) : (
          <span className="flex items-center gap-1 text-emerald-600">
            <CheckCircle2 className="w-3 h-3" />
            <span>
              已保存 {lastSavedAt ? `(${lastSavedAt.toLocaleTimeString()})` : ""}
            </span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span>100% 纯净 Markdown (CommonMark)</span>
      </div>
    </footer>
  );
};
