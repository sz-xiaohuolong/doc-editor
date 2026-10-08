import React, { useEffect, useState, useMemo } from "react";
import { Editor } from "@tiptap/react";
import {
  Type,
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Lightbulb,
  Quote,
  Code,
  Minus,
  Image,
} from "lucide-react";

export interface SlashMenuItem {
  id: string;
  title: string;
  hint: string;
  shortcut: string;
  icon: React.ReactNode;
  action: (editor: Editor) => void;
}

interface SlashMenuProps {
  editor: Editor;
  isOpen: boolean;
  onClose: () => void;
  query: string;
  position: { top: number; left: number };
}

export const SlashMenu: React.FC<SlashMenuProps> = ({
  editor,
  isOpen,
  onClose,
  query,
  position,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const items: SlashMenuItem[] = useMemo(
    () => [
      {
        id: "text",
        title: "文本",
        hint: "普通正文段落",
        shortcut: "/wb",
        icon: <Type className="w-4 h-4 text-slate-600" />,
        action: (ed) => ed.chain().focus().setParagraph().run(),
      },
      {
        id: "todo",
        title: "待办列表",
        hint: "带复选框的任务清单",
        shortcut: "/dblb",
        icon: <CheckSquare className="w-4 h-4 text-blue-600" />,
        action: (ed) => ed.chain().focus().toggleTaskList().run(),
      },
      {
        id: "h1",
        title: "主标题",
        hint: "超大标题 H1",
        shortcut: "/h1",
        icon: <Heading1 className="w-4 h-4 text-slate-800" />,
        action: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run(),
      },
      {
        id: "h2",
        title: "大标题",
        hint: "大标题 H2",
        shortcut: "/h2",
        icon: <Heading2 className="w-4 h-4 text-slate-800" />,
        action: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        id: "h3",
        title: "中标题",
        hint: "中标题 H3",
        shortcut: "/h3",
        icon: <Heading3 className="w-4 h-4 text-slate-700" />,
        action: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run(),
      },
      {
        id: "h4",
        title: "小标题",
        hint: "小标题 H4",
        shortcut: "/h4",
        icon: <Heading4 className="w-4 h-4 text-slate-700" />,
        action: (ed) => ed.chain().focus().toggleHeading({ level: 4 }).run(),
      },
      {
        id: "callout",
        title: "提示框",
        hint: "醒目的高亮提示卡片",
        shortcut: "/callout",
        icon: <Lightbulb className="w-4 h-4 text-amber-500" />,
        action: (ed) => (ed.commands as unknown as { toggleCallout?: () => void }).toggleCallout?.(),
      },
      {
        id: "quote",
        title: "引用",
        hint: "引用文本段落",
        shortcut: "/quote",
        icon: <Quote className="w-4 h-4 text-slate-600" />,
        action: (ed) => ed.chain().focus().toggleBlockquote().run(),
      },
      {
        id: "code",
        title: "代码块",
        hint: "代码片段与语法高亮",
        shortcut: "/code",
        icon: <Code className="w-4 h-4 text-slate-600" />,
        action: (ed) => ed.chain().focus().toggleCodeBlock().run(),
      },
      {
        id: "divider",
        title: "分割线",
        hint: "水平视觉分隔线",
        shortcut: "/divider",
        icon: <Minus className="w-4 h-4 text-slate-500" />,
        action: (ed) => ed.chain().focus().setHorizontalRule().run(),
      },
      {
        id: "image",
        title: "本地图片",
        hint: "插入或粘贴本地图片",
        shortcut: "/img",
        icon: <Image className="w-4 h-4 text-emerald-600" />,
        action: (ed) => {
          const url = prompt("输入图片相对路径或链接:", "assets/image.png");
          if (url) {
            ed.chain().focus().setImage({ src: url }).run();
          }
        },
      },
    ],
    []
  );

  const filteredItems = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.shortcut.toLowerCase().includes(q) ||
        item.id.includes(q)
    );
  }, [items, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          // Delete the slash trigger from editor before executing action
          editor.commands.deleteRange({
            from: editor.state.selection.from - query.length - 1,
            to: editor.state.selection.from,
          });
          filteredItems[selectedIndex].action(editor);
          onClose();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, filteredItems, editor, query, onClose]);

  if (!isOpen || filteredItems.length === 0) return null;

  return (
    <div
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      className="fixed z-50 w-72 max-h-80 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200/80 py-1.5 px-1 animate-in fade-in duration-100"
    >
      <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 tracking-wider flex justify-between items-center">
        <span>基础块列表</span>
        <span className="text-slate-300">/jichukuai</span>
      </div>

      <div className="mt-1 space-y-0.5">
        {filteredItems.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <button
              key={item.id}
              onClick={() => {
                editor.commands.deleteRange({
                  from: editor.state.selection.from - query.length - 1,
                  to: editor.state.selection.from,
                });
                item.action(editor);
                onClose();
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm text-left transition-colors ${
                isSelected ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1 rounded bg-slate-100/70">{item.icon}</div>
                <div className="truncate">
                  <div className="font-medium leading-none text-[13px]">{item.title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{item.hint}</div>
                </div>
              </div>
              <span className="text-[11px] font-mono text-slate-400 ml-2 flex-shrink-0">
                {item.shortcut}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
