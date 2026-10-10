import React, { useRef } from "react";
import { FileTreeNode } from "../../types/tree";
import { PageTreeItem } from "./PageTreeItem";
import {
  Folder,
  Search,
  Star,
  Plus,
  Trash2,
  ChevronDown,
  Sparkles,
  UploadCloud,
} from "lucide-react";

interface SidebarProps {
  workspaceRoot: string | null;
  fileTree: FileTreeNode[];
  activeFilePath: string | null;
  onSelectPage: (node: FileTreeNode) => void;
  onCreateRootPage: () => void;
  onCreateSubpage: (parentNode: FileTreeNode) => void;
  onDeletePage: (node: FileTreeNode) => void;
  onSwitchWorkspace: () => void;
  onOpenSearch: () => void;
  onImportFiles: (files: FileList) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  workspaceRoot,
  fileTree,
  activeFilePath,
  onSelectPage,
  onCreateRootPage,
  onCreateSubpage,
  onDeletePage,
  onSwitchWorkspace,
  onOpenSearch,
  onImportFiles,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const workspaceName = workspaceRoot
    ? workspaceRoot.split("/").pop() || "知识库"
    : "未选择工作区";

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportFiles(e.target.files);
      // reset input value so re-importing same file triggers change
      e.target.value = "";
    }
  };

  return (
    <aside className="w-64 h-full bg-[#fbfbfa] border-r border-[#ececeb] flex flex-col justify-between select-none">
      {/* Top Header */}
      <div className="pt-8 px-3">
        {/* Workspace Switcher */}
        <div
          onClick={onSwitchWorkspace}
          className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-200/50 cursor-pointer transition-colors group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl flex-shrink-0">🐲</span>
            <div className="truncate">
              <div className="text-[13px] font-semibold text-slate-800 truncate">
                {workspaceName}
              </div>
              <div className="text-[11px] text-slate-400 truncate">本地笔记库</div>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors flex-shrink-0" />
        </div>

        {/* Quick Actions */}
        <div className="mt-3 space-y-0.5">
          <button
            data-testid="sidebar-search-button"
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-slate-600 hover:bg-slate-200/50 text-[13px] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <span>搜索</span>
            </div>
            <span className="text-[10px] text-slate-400 bg-slate-200/50 px-1.5 py-0.5 rounded font-mono">
              ⌘P
            </span>
          </button>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-slate-400 text-[13px]">
            <Star className="w-4 h-4 text-amber-400" />
            <span className="text-slate-500">星标置顶</span>
          </div>
        </div>
      </div>

      {/* Pages Section */}
      <div className="flex-1 overflow-y-auto px-2 mt-4 space-y-1">
        <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider group">
          <span>我的页面</span>
          <button
            title="新建页面"
            onClick={onCreateRootPage}
            className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Page Tree Items */}
        <div className="space-y-0.5">
          {fileTree.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-slate-400">
              暂无页面，点击上方 "+" 新建
            </div>
          ) : (
            fileTree.map((node) => (
              <PageTreeItem
                key={node.id}
                node={node}
                activeFilePath={activeFilePath}
                onSelect={onSelectPage}
                onCreateSubpage={onCreateSubpage}
                onDelete={onDeletePage}
              />
            ))
          )}
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div className="p-3 border-t border-[#ececeb] space-y-0.5 text-[12px] text-slate-600">
        {/* Hidden File Input for Import */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".md,.markdown,.txt,.html,.htm,.docx"
          onChange={handleFileInputChange}
          className="hidden"
          data-testid="file-import-input"
        />

        <button
          data-testid="sidebar-import-button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-200/50 text-slate-700 transition-colors"
        >
          <UploadCloud className="w-4 h-4 text-rose-500" />
          <span>导入文件 (MD/TXT/Word/HTML)</span>
        </button>

        <button
          onClick={onSwitchWorkspace}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-200/50 transition-colors"
        >
          <Folder className="w-4 h-4 text-slate-400" />
          <span>切换工作区目录</span>
        </button>

        <div className="flex items-center justify-between px-2 py-1 text-slate-400 text-[11px]">
          <div className="flex items-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5" />
            <span>废纸篓</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            <span>v0.2.0</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
