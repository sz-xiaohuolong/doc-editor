import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, FileText, ArrowRight, X, Command } from "lucide-react";
import { searchDocuments, SearchDocument, SearchResult } from "../../services/searchEngine";

interface GlobalSearchModalProps {
  isOpen: boolean;
  documents: SearchDocument[];
  onClose: () => void;
  onSelectResult: (filePath: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  documents,
  onClose,
  onSelectResult,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) {
      // If query is empty, show all recent documents (up to 8)
      return documents.slice(0, 8).map((doc) => ({
        filePath: doc.filePath,
        title: doc.title,
        score: 1,
        snippet: doc.content.slice(0, 60).replace(/\n+/g, " ") + "...",
      }));
    }
    return searchDocuments(documents, query);
  }, [documents, query]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (results.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % results.length);
      }
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
      }
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        onSelectResult(results[selectedIndex].filePath);
        onClose();
      }
      return;
    }
  };

  if (!isOpen) return null;

  // Helper to highlight matching words/characters in text
  const renderHighlighted = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === highlight.toLowerCase() ? (
        <mark
          key={i}
          className="bg-rose-100 text-rose-600 font-semibold px-0.5 rounded"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div
      data-testid="global-search-modal"
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[70vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 gap-3">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            data-testid="global-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索文档标题或正文内容... (输入关键词)"
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
            <Command className="w-3 h-3" />
            <span>P</span>
          </div>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          data-testid="search-results-list"
          className="flex-1 overflow-y-auto p-2 space-y-1"
        >
          {results.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              未找到与关键词相关的页面
            </div>
          ) : (
            results.map((res, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={res.filePath}
                  data-testid="search-result-item"
                  data-index={idx}
                  onClick={() => {
                    onSelectResult(res.filePath);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3 py-2.5 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-3 ${
                    isSelected
                      ? "bg-rose-50/80 border border-rose-200/60 shadow-sm"
                      : "hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText
                        className={`w-4 h-4 flex-shrink-0 ${
                          isSelected ? "text-rose-500" : "text-slate-400"
                        }`}
                      />
                      <span
                        className={`text-xs font-semibold truncate ${
                          isSelected ? "text-rose-700" : "text-slate-800"
                        }`}
                      >
                        {renderHighlighted(res.title, query)}
                      </span>
                    </div>
                    <div className="text-[12px] text-slate-500 leading-snug line-clamp-2 pl-6">
                      {renderHighlighted(res.snippet, query)}
                    </div>
                  </div>

                  <ArrowRight
                    className={`w-4 h-4 flex-shrink-0 self-center transition-opacity ${
                      isSelected ? "text-rose-500 opacity-100" : "opacity-0"
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer hints */}
        <div className="px-4 py-2 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">
                ↑
              </kbd>{" "}
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">
                ↓
              </kbd>{" "}
              选择
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">
                Enter
              </kbd>{" "}
              打开
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">
                Esc
              </kbd>{" "}
              关闭
            </span>
          </div>
          <span>共 {results.length} 条相关结果</span>
        </div>
      </div>
    </div>
  );
};
