import React, { useEffect, useState, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import { NodeSelection } from "@tiptap/pm/state";
import { CalloutNode } from "./extensions/CalloutNode";
import { SlashMenu } from "./SlashMenu";
import { saveImageAsset } from "../../services/tauriApi";

interface EditorProps {
  initialContent: string;
  workspaceRoot: string;
  onChange: (content: string) => void;
  onSaveShortcut?: () => void;
}

export const Editor: React.FC<EditorProps> = ({
  initialContent,
  workspaceRoot,
  onChange,
  onSaveShortcut,
}) => {
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashPosition, setSlashPosition] = useState({ top: 0, left: 0 });
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder: "输入 '/' 唤起命令，或直接输入文字...",
      }),
      CalloutNode,
      Markdown.configure({
        html: false,
        tightLists: true,
        bulletListMarker: "-",
        linkify: true,
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "prose max-w-none focus:outline-none min-h-[500px] text-[15px] leading-relaxed text-slate-800",
      },
      handleKeyDown: (view, event) => {
        // Cmd+S save shortcut
        if ((event.metaKey || event.ctrlKey) && event.key === "s") {
          event.preventDefault();
          onSaveShortcut?.();
          return true;
        }

        // Esc key toggles block selection mode
        if (event.key === "Escape") {
          const { state, dispatch } = view;
          const { selection } = state;
          if (!selection.empty && selection instanceof NodeSelection) {
            return false;
          }
          const $pos = selection.$from;
          const depth = $pos.depth;
          if (depth > 0) {
            const blockPos = $pos.before(1);
            const nodeSel = NodeSelection.create(state.doc, blockPos);
            dispatch(state.tr.setSelection(nodeSel));
            return true;
          }
        }

        // In NodeSelection mode, navigate with ArrowUp/ArrowDown
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          const { state, dispatch } = view;
          if (state.selection instanceof NodeSelection) {
            const $pos = state.selection.$from;
            const targetPos = event.key === "ArrowDown" ? $pos.after() : $pos.before() - 1;
            if (targetPos >= 0 && targetPos < state.doc.content.size) {
              try {
                const nextNodeSel = NodeSelection.create(state.doc, targetPos);
                dispatch(state.tr.setSelection(nextNodeSel));
                return true;
              } catch {
                // fall through to normal cursor
              }
            }
          }
        }

        return false;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of items) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              file.arrayBuffer().then(async (buffer) => {
                const bytes = Array.from(new Uint8Array(buffer));
                try {
                  const relativePath = await saveImageAsset(workspaceRoot, bytes);
                  view.dispatch(
                    view.state.tr.replaceSelectionWith(
                      view.state.schema.nodes.image.create({ src: relativePath })
                    )
                  );
                } catch (e) {
                  console.error("Failed to save clipboard image:", e);
                }
              });
              return true;
            }
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      // Check for Slash command trigger
      const { state } = ed;
      const { selection } = state;
      const { from } = selection;
      const textBefore = state.doc.textBetween(Math.max(0, from - 20), from, "\n", "\0");
      const slashIndex = textBefore.lastIndexOf("/");

      if (slashIndex !== -1) {
        const query = textBefore.slice(slashIndex + 1);
        if (!query.includes(" ")) {
          const coords = ed.view.coordsAtPos(from);
          setSlashPosition({
            top: coords.bottom + 8,
            left: Math.min(coords.left, window.innerWidth - 300),
          });
          setSlashQuery(query);
          setSlashMenuOpen(true);
        } else {
          setSlashMenuOpen(false);
        }
      } else {
        setSlashMenuOpen(false);
      }

      // Export clean markdown
      const md = (ed.storage as unknown as { markdown?: { getMarkdown: () => string } }).markdown?.getMarkdown();
      if (md !== undefined) {
        onChange(md);
      }
    },
  });

  // Sync content if initialContent changes externally
  useEffect(() => {
    if (editor && initialContent !== undefined) {
      const currentMd = (editor.storage as unknown as { markdown?: { getMarkdown: () => string } }).markdown?.getMarkdown();
      if (currentMd !== initialContent) {
        editor.commands.setContent(initialContent, false);
      }
    }
  }, [initialContent, editor]);

  return (
    <div ref={editorContainerRef} className="relative w-full max-w-3xl mx-auto px-6 py-4">
      <EditorContent editor={editor} />
      {editor && (
        <SlashMenu
          editor={editor}
          isOpen={slashMenuOpen}
          onClose={() => setSlashMenuOpen(false)}
          query={slashQuery}
          position={slashPosition}
        />
      )}
    </div>
  );
};
