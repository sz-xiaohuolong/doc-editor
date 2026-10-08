import React, { useState, useEffect, useRef, useCallback } from "react";
import { Editor } from "@tiptap/react";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import {
  Plus,
  GripVertical,
  Trash2,
  Copy,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  CheckSquare,
  Quote,
  Code,
  Lightbulb,
} from "lucide-react";

interface BlockHandleProps {
  editor: Editor | null;
  containerRef: React.RefObject<HTMLDivElement>;
}

interface BlockMenuAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: (editor: Editor, blockPos: number) => void;
}

export const BlockHandle: React.FC<BlockHandleProps> = ({
  editor,
  containerRef,
}) => {
  const [visible, setVisible] = useState(false);
  const [handlePosition, setHandlePosition] = useState({ top: 0, left: 0 });
  const [activeBlockPos, setActiveBlockPos] = useState<number | null>(null);
  const [activeBlockEl, setActiveBlockEl] = useState<HTMLElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [dropIndicator, setDropIndicator] = useState<{
    visible: boolean;
    top: number;
    left: number;
    width: number;
  }>({ visible: false, top: 0, left: 0, width: 0 });

  const handleRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const draggedPosRef = useRef<number | null>(null);

  // Clear hide timeout
  const cancelHide = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  // Schedule hide
  const scheduleHide = useCallback(() => {
    if (menuOpen || isDragging) return;
    cancelHide();
    hideTimeoutRef.current = setTimeout(() => {
      setVisible(false);
      setActiveBlockPos(null);
      setActiveBlockEl(null);
    }, 350);
  }, [menuOpen, isDragging, cancelHide]);

  // Handle mouse move across editor to track the current block
  useEffect(() => {
    if (!editor || !containerRef.current) return;

    const container = containerRef.current;
    const editorDom = editor.view.dom;

    const handleMouseMove = (e: MouseEvent) => {
      if (menuOpen || isDragging) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      // If hovering over handle or menu, keep visible
      if (
        handleRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        cancelHide();
        return;
      }

      // Find top-level block inside .ProseMirror
      const block = target.closest(".ProseMirror > *") as HTMLElement | null;
      if (!block || !editorDom.contains(block)) {
        scheduleHide();
        return;
      }

      cancelHide();

      try {
        const pos = editor.view.posAtDOM(block, 0);
        const resolved = editor.state.doc.resolve(pos);
        // Get the top-level block pos (depth 1)
        const blockPos = resolved.depth > 0 ? resolved.before(1) : pos;

        const blockRect = block.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // Calculate handle position: 48px to the left of the block, aligned with the first line
        const top = blockRect.top - containerRect.top + 3;
        const left = blockRect.left - containerRect.left - 52;

        setHandlePosition({ top, left });
        setActiveBlockPos(blockPos);
        setActiveBlockEl(block);
        setVisible(true);
      } catch {
        // Ignore posAtDOM edge errors
      }
    };

    const handleMouseLeave = () => {
      scheduleHide();
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      cancelHide();
    };
  }, [editor, containerRef, menuOpen, isDragging, cancelHide, scheduleHide]);

  // Click outside to close menu
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !menuRef.current?.contains(target) &&
        !handleRef.current?.contains(target)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  // Handle "+" button click: insert paragraph after current block
  const handleAddBlock = useCallback(() => {
    if (!editor || activeBlockPos === null) return;

    try {
      const { state, view } = editor;
      const $pos = state.doc.resolve(activeBlockPos);
      const afterPos = $pos.after(1);

      const pNode = state.schema.nodes.paragraph.create();
      const tr = state.tr.insert(afterPos, pNode);
      tr.setSelection(TextSelection.near(tr.doc.resolve(afterPos + 1)));
      view.dispatch(tr);
      editor.commands.focus();

      setVisible(false);
      setMenuOpen(false);
    } catch (err) {
      console.error("Failed to add block:", err);
    }
  }, [editor, activeBlockPos]);

  // Handle "⠿" button click: select node and open menu
  const handleGripClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!editor || activeBlockPos === null) return;

      try {
        // Select node in ProseMirror
        const nodeSel = NodeSelection.create(editor.state.doc, activeBlockPos);
        editor.view.dispatch(editor.state.tr.setSelection(nodeSel));

        // Open block menu
        if (handleRef.current && containerRef.current) {
          const handleRect = handleRef.current.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();
          setMenuPosition({
            top: handleRect.bottom - containerRect.top + 4,
            left: handleRect.left - containerRect.left,
          });
        }
        setMenuOpen(true);
      } catch (err) {
        console.error("Failed to select block node:", err);
      }
    },
    [editor, activeBlockPos, containerRef]
  );

  // Drag and drop handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (activeBlockPos === null) return;
      setIsDragging(true);
      setMenuOpen(false);
      draggedPosRef.current = activeBlockPos;

      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", ""); // required for Firefox/Safari
    },
    [activeBlockPos]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    draggedPosRef.current = null;
    setDropIndicator({ visible: false, top: 0, left: 0, width: 0 });
  }, []);

  // Global dragover on container for reordering
  useEffect(() => {
    if (!editor || !containerRef.current) return;
    const container = containerRef.current;

    const handleDragOver = (e: DragEvent) => {
      if (draggedPosRef.current === null) return;
      e.preventDefault();
      e.dataTransfer!.dropEffect = "move";

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const block = target.closest(".ProseMirror > *") as HTMLElement | null;
      if (!block) return;

      const blockRect = block.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const midY = blockRect.top + blockRect.height / 2;
      const isAfter = e.clientY >= midY;

      const indicatorTop = isAfter
        ? blockRect.bottom - containerRect.top
        : blockRect.top - containerRect.top;

      setDropIndicator({
        visible: true,
        top: indicatorTop,
        left: blockRect.left - containerRect.left,
        width: blockRect.width,
      });
    };

    const handleDrop = (e: DragEvent) => {
      if (draggedPosRef.current === null) return;
      e.preventDefault();

      const sourcePos = draggedPosRef.current;
      draggedPosRef.current = null;
      setIsDragging(false);
      setDropIndicator({ visible: false, top: 0, left: 0, width: 0 });

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const block = target.closest(".ProseMirror > *") as HTMLElement | null;
      if (!block) return;

      try {
        const targetPos = editor.view.posAtDOM(block, 0);
        const resolvedTarget = editor.state.doc.resolve(targetPos);
        const targetBlockPos =
          resolvedTarget.depth > 0 ? resolvedTarget.before(1) : targetPos;

        const blockRect = block.getBoundingClientRect();
        const midY = blockRect.top + blockRect.height / 2;
        const isAfter = e.clientY >= midY;

        const sourceNode = editor.state.doc.nodeAt(sourcePos);
        if (!sourceNode) return;

        const targetNode = editor.state.doc.nodeAt(targetBlockPos);
        if (!targetNode || sourcePos === targetBlockPos) return;

        const sourceSize = sourceNode.nodeSize;
        const $targetPos = editor.state.doc.resolve(targetBlockPos);
        let insertPos = isAfter ? $targetPos.after(1) : targetBlockPos;

        // Execute move in transaction
        const tr = editor.state.tr;
        tr.delete(sourcePos, sourcePos + sourceSize);

        // Adjust insert position if deleting occurred before target
        if (sourcePos < insertPos) {
          insertPos -= sourceSize;
        }

        tr.insert(insertPos, sourceNode);
        editor.view.dispatch(tr);
        editor.commands.focus();
      } catch (err) {
        console.error("Drop failed:", err);
      }
    };

    container.addEventListener("dragover", handleDragOver);
    container.addEventListener("drop", handleDrop);

    return () => {
      container.removeEventListener("dragover", handleDragOver);
      container.removeEventListener("drop", handleDrop);
    };
  }, [editor, containerRef]);

  // Actions for the Block Menu
  const MENU_ACTIONS: BlockMenuAction[] = [
    {
      id: "delete",
      label: "删除块",
      icon: <Trash2 className="w-4 h-4 text-red-500" />,
      action: (ed, blockPos) => {
        const node = ed.state.doc.nodeAt(blockPos);
        if (node) {
          ed.view.dispatch(
            ed.state.tr.delete(blockPos, blockPos + node.nodeSize)
          );
        }
      },
    },
    {
      id: "duplicate",
      label: "复制副本",
      icon: <Copy className="w-4 h-4 text-slate-500" />,
      action: (ed, blockPos) => {
        const node = ed.state.doc.nodeAt(blockPos);
        if (node) {
          const insertPos = blockPos + node.nodeSize;
          ed.view.dispatch(ed.state.tr.insert(insertPos, node));
        }
      },
    },
    {
      id: "turn-p",
      label: "普通文本",
      icon: <Type className="w-4 h-4 text-slate-500" />,
      action: (ed, blockPos) => {
        ed.commands.setNodeSelection(blockPos);
        ed.commands.setParagraph();
      },
    },
    {
      id: "turn-h1",
      label: "一级标题",
      icon: <Heading1 className="w-4 h-4 text-slate-700" />,
      action: (ed, blockPos) => {
        ed.commands.setNodeSelection(blockPos);
        ed.commands.toggleHeading({ level: 1 });
      },
    },
    {
      id: "turn-h2",
      label: "二级标题",
      icon: <Heading2 className="w-4 h-4 text-slate-700" />,
      action: (ed, blockPos) => {
        ed.commands.setNodeSelection(blockPos);
        ed.commands.toggleHeading({ level: 2 });
      },
    },
    {
      id: "turn-h3",
      label: "三级标题",
      icon: <Heading3 className="w-4 h-4 text-slate-700" />,
      action: (ed, blockPos) => {
        ed.commands.setNodeSelection(blockPos);
        ed.commands.toggleHeading({ level: 3 });
      },
    },
    {
      id: "turn-h4",
      label: "四级标题",
      icon: <Heading4 className="w-4 h-4 text-slate-700" />,
      action: (ed, blockPos) => {
        ed.commands.setNodeSelection(blockPos);
        ed.commands.toggleHeading({ level: 4 });
      },
    },
    {
      id: "turn-task",
      label: "待办清单",
      icon: <CheckSquare className="w-4 h-4 text-rose-500" />,
      action: (ed, blockPos) => {
        ed.commands.setNodeSelection(blockPos);
        ed.commands.toggleTaskList();
      },
    },
    {
      id: "turn-quote",
      label: "引用框",
      icon: <Quote className="w-4 h-4 text-slate-500" />,
      action: (ed, blockPos) => {
        ed.commands.setNodeSelection(blockPos);
        ed.commands.toggleBlockquote();
      },
    },
    {
      id: "turn-code",
      label: "代码块",
      icon: <Code className="w-4 h-4 text-slate-500" />,
      action: (ed, blockPos) => {
        ed.commands.setNodeSelection(blockPos);
        ed.commands.toggleCodeBlock();
      },
    },
    {
      id: "turn-callout",
      label: "提示框",
      icon: <Lightbulb className="w-4 h-4 text-amber-500" />,
      action: (ed, blockPos) => {
        ed.commands.setNodeSelection(blockPos);
        ed.commands.setCallout();
      },
    },
  ];

  return (
    <>
      {/* Drop indicator horizontal line */}
      {dropIndicator.visible && (
        <div
          className="block-drop-indicator"
          style={{
            top: `${dropIndicator.top}px`,
            left: `${dropIndicator.left}px`,
            width: `${dropIndicator.width}px`,
          }}
        />
      )}

      {/* Floating Block Handle (+ and ⠿) */}
      <div
        ref={handleRef}
        data-testid="block-handle"
        className={`absolute z-30 flex items-center gap-0.5 px-1 py-0.5 rounded-md transition-opacity duration-150 select-none ${
          visible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{
          top: `${handlePosition.top}px`,
          left: `${handlePosition.left}px`,
        }}
        onMouseEnter={cancelHide}
        onMouseLeave={scheduleHide}
      >
        {/* "+" Quick Add Button */}
        <button
          type="button"
          data-testid="block-handle-add"
          title="在下方插入新块"
          onClick={handleAddBlock}
          className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 active:bg-slate-300/80 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        {/* "⠿" Six-dot Drag & Menu Handle */}
        <div
          data-testid="block-handle-grip"
          title="拖拽移动或点击打开菜单"
          draggable={true}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onClick={handleGripClick}
          className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 active:bg-slate-300/80 transition-colors cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      </div>

      {/* Block Menu Dropdown */}
      {menuOpen && activeBlockPos !== null && (
        <div
          ref={menuRef}
          data-testid="block-menu"
          className="absolute z-50 w-48 bg-white border border-slate-200 rounded-lg shadow-xl py-1.5 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100"
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
          }}
        >
          <div className="px-3 py-1 font-semibold text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
            块级操作
          </div>
          {MENU_ACTIONS.map((action, idx) => (
            <React.Fragment key={action.id}>
              {idx === 2 && (
                <div className="my-1 border-t border-slate-100 px-3 py-1 font-semibold text-[11px] text-slate-400 uppercase tracking-wider">
                  转换为
                </div>
              )}
              <button
                type="button"
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                onClick={() => {
                  if (editor && activeBlockPos !== null) {
                    action.action(editor, activeBlockPos);
                  }
                  setMenuOpen(false);
                }}
              >
                {action.icon}
                <span className="flex-1">{action.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </>
  );
};
