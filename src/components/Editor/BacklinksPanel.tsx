import React, { useState } from "react";
import { Link2, ChevronRight, ChevronDown, FileText } from "lucide-react";
import { BacklinkItem } from "../../services/backlinksEngine";

interface BacklinksPanelProps {
  currentTitle: string;
  backlinks: BacklinkItem[];
  onNavigateToSource: (filePath: string) => void;
}

export const BacklinksPanel: React.FC<BacklinksPanelProps> = ({
  currentTitle,
  backlinks,
  onNavigateToSource,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div
      data-testid="backlinks-panel"
      className="mt-12 pt-6 border-t border-slate-100 max-w-3xl mx-auto px-4 sm:px-6 select-none"
    >
      {/* Collapsible Header */}
      <button
        type="button"
        data-testid="backlinks-header-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 group text-left w-full focus:outline-none"
      >
        <div className="p-1 rounded text-slate-400 group-hover:text-slate-600 transition-colors">
          {isOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-rose-500" />
          <span className="text-[13px] font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
            反向链接
          </span>
          <span
            data-testid="backlinks-count"
            className="px-1.5 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 text-slate-500 group-hover:bg-rose-50 group-hover:text-rose-600 transition-colors"
          >
            {backlinks.length}
          </span>
        </div>
      </button>

      {/* Content list */}
      {isOpen && (
        <div className="mt-3 pl-6 space-y-2">
          {backlinks.length === 0 ? (
            <div className="text-xs text-slate-400 py-2">
              暂无其他文档引用页面「{currentTitle}」
            </div>
          ) : (
            <div className="grid gap-2">
              {backlinks.map((item) => (
                <div
                  key={item.sourceFilePath}
                  data-testid="backlink-card"
                  onClick={() => onNavigateToSource(item.sourceFilePath)}
                  className="p-3 rounded-xl border border-slate-100 bg-[#fafafa]/80 hover:bg-rose-50/40 hover:border-rose-200/60 cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-500 transition-colors" />
                    <span className="text-xs font-semibold text-slate-800 group-hover:text-rose-600 transition-colors">
                      {item.sourceTitle}
                    </span>
                  </div>
                  <div className="text-[12px] text-slate-500 leading-relaxed font-sans pl-5 border-l-2 border-slate-200 group-hover:border-rose-300 transition-colors">
                    {item.snippet}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
