import React from "react";
import { AlertTriangle } from "lucide-react";

interface ConflictModalProps {
  isOpen: boolean;
  onReload: () => void;
  onKeepLocal: () => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  isOpen,
  onReload,
  onKeepLocal,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-in fade-in">
      <div className="w-[420px] bg-white rounded-2xl shadow-2xl p-6 border border-slate-100 space-y-4">
        <div className="flex items-center gap-3 text-amber-600">
          <div className="p-2 rounded-xl bg-amber-50">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">
            检测到外部文件已变更
          </h3>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          外部程序（如 VS Code 或访达）修改了此文件，同时你在编辑器内也有尚未落盘的内容。请选择处理策略：
        </p>

        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            onClick={onKeepLocal}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            保留当前版本
          </button>
          <button
            onClick={onReload}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
          >
            重新载入磁盘内容
          </button>
        </div>
      </div>
    </div>
  );
};
