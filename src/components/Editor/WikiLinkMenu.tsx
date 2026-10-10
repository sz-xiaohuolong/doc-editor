import React, { useEffect, useRef } from "react";
import { FileText, ArrowRight } from "lucide-react";

export interface WikiLinkCandidate {
  name: string;
  filePath: string;
}

interface WikiLinkMenuProps {
  isOpen: boolean;
  query: string;
  position: { top: number; left: number };
  items: WikiLinkCandidate[];
  selectedIndex: number;
  setSelectedIndex: (idx: number) => void;
  onSelect: (item: WikiLinkCandidate) => void;
  onClose: () => void;
}

export const WikiLinkMenu: React.FC<WikiLinkMenuProps> = ({
  isOpen,
  query,
  position,
  items,
  selectedIndex,
  setSelectedIndex,
  onSelect,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Keep selected item in view
  useEffect(() => {
    if (menuRef.current) {
      const selectedEl = menuRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      data-testid="wikilink-menu"
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 9999,
      }}
      className="w-72 max-h-72 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-slate-200/80 overflow-y-auto py-1 text-slate-800 animate-in fade-in zoom-in-95 duration-100 select-none"
    >
      <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
        <span>链接到页面 {query && `("${query}")`}</span>
        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
          [[
        </span>
      </div>

      <div className="p-1 space-y-0.5">
        {items.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-slate-400">
            未找到匹配的页面
          </div>
        ) : (
          items.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={item.filePath}
                data-index={idx}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect(item);
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                  isSelected
                    ? "bg-rose-50 text-rose-600 font-medium"
                    : "text-slate-700 hover:bg-slate-100/70"
                }`}
              >
                <div className="flex items-center gap-2 truncate min-w-0">
                  <FileText
                    className={`w-3.5 h-3.5 flex-shrink-0 ${
                      isSelected ? "text-rose-500" : "text-slate-400"
                    }`}
                  />
                  <span className="truncate">{item.name}</span>
                </div>
                <ArrowRight
                  className={`w-3 h-3 flex-shrink-0 transition-opacity ${
                    isSelected ? "opacity-100 text-rose-400" : "opacity-0"
                  }`}
                />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
