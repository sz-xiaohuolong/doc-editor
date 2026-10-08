import React from "react";
import { FolderOpen, Sparkles } from "lucide-react";

interface WorkspaceDialogProps {
  isOpen: boolean;
  onSelectDir: () => void;
  onCancel?: () => void;
  canCancel?: boolean;
}

export const WorkspaceDialog: React.FC<WorkspaceDialogProps> = ({
  isOpen,
  onSelectDir,
  onCancel,
  canCancel = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="w-[460px] bg-white rounded-2xl shadow-2xl p-7 border border-slate-100 text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 flex items-center justify-center text-2xl shadow-inner">
          🐲
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-slate-800">
            欢迎使用 DocEditor
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
            类 wolai 块级本地文档编辑器。请选择或创建一个本地文件夹作为你的笔记知识库。
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 text-left text-xs text-slate-600 space-y-1">
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            <span>纯本地与标准 Markdown 保证</span>
          </div>
          <p className="text-slate-500">
            所有文档以标准 CommonMark 存储，随时可用 VS Code、Obsidian 打开，100% 掌握数据主权。
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-3">
          {canCancel && onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              取消
            </button>
          )}
          <button
            onClick={onSelectDir}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 shadow-md shadow-rose-200 transition-all hover:scale-[1.02]"
          >
            <FolderOpen className="w-4 h-4" />
            <span>选择本地工作区文件夹</span>
          </button>
        </div>
      </div>
    </div>
  );
};
