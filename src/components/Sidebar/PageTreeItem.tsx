import React, { useState } from "react";
import { FileTreeNode } from "../../types/tree";
import { ChevronRight, ChevronDown, Plus, Trash2 } from "lucide-react";

interface PageTreeItemProps {
  node: FileTreeNode;
  activeFilePath: string | null;
  onSelect: (node: FileTreeNode) => void;
  onCreateSubpage: (parentNode: FileTreeNode) => void;
  onDelete: (node: FileTreeNode) => void;
  level?: number;
}

export const PageTreeItem: React.FC<PageTreeItemProps> = ({
  node,
  activeFilePath,
  onSelect,
  onCreateSubpage,
  onDelete,
  level = 0,
}) => {
  const [expanded, setExpanded] = useState(true);
  const isActive = activeFilePath === node.file_path;

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const handleCreateSub = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCreateSubpage(node);
    setExpanded(true);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(node);
  };

  return (
    <div className="select-none">
      <div
        onClick={() => onSelect(node)}
        style={{ paddingLeft: `${Math.max(8, level * 16 + 8)}px` }}
        className={`group relative flex items-center justify-between py-1.5 pr-2 rounded-lg cursor-pointer transition-colors text-[13px] ${
          isActive
            ? "bg-rose-100 text-rose-800 font-medium"
            : "text-slate-700 hover:bg-slate-200/50"
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* Expand/Collapse arrow */}
          <button
            onClick={handleToggleExpand}
            className={`w-4 h-4 flex items-center justify-center rounded hover:bg-slate-300/40 text-slate-400 ${
              node.has_subpages ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Page Icon */}
          <span className="text-sm flex-shrink-0">
            {isActive ? "📕" : "📄"}
          </span>

          {/* Page Name */}
          <span className="truncate flex-1 tracking-tight">{node.name}</span>
        </div>

        {/* Hover action buttons */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 flex-shrink-0 transition-opacity">
          <button
            title="添加子页面"
            onClick={handleCreateSub}
            className="p-1 rounded hover:bg-slate-300/60 text-slate-500 hover:text-slate-800"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            title="删除页面"
            onClick={handleDelete}
            className="p-1 rounded hover:bg-rose-200 text-slate-400 hover:text-rose-700"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Children list */}
      {expanded && node.children && node.children.length > 0 && (
        <div className="mt-0.5">
          {node.children.map((child) => (
            <PageTreeItem
              key={child.id}
              node={child}
              activeFilePath={activeFilePath}
              onSelect={onSelect}
              onCreateSubpage={onCreateSubpage}
              onDelete={onDelete}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
