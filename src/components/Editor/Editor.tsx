import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Heading from "@tiptap/extension-heading";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { wrappingInputRule, InputRule } from "@tiptap/core";
import { CalloutNode } from "./extensions/CalloutNode";
import { WikiLinkNode } from "./extensions/WikiLinkNode";
import {
  SlashMenu,
  SLASH_MENU_ITEMS,
  SlashMenuItem,
  filterSlashMenuItems,
} from "./SlashMenu";
import { WikiLinkMenu, WikiLinkCandidate } from "./WikiLinkMenu";
import { BlockHandle } from "./BlockHandle";
import { saveImageAsset } from "../../services/tauriApi";

interface EditorProps {
  initialContent: string;
  workspaceRoot: string;
  availablePages?: WikiLinkCandidate[];
  onNavigateToPage?: (title: string) => void;
  onChange: (content: string) => void;
  onSaveShortcut?: () => void;
}

// Custom Heading that exits to a paragraph on Enter at the end of the heading
const CustomHeading = Heading.extend({
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      Enter: () => {
        const { state, view } = this.editor;
        const { selection } = state;
        const { $from, empty } = selection;
        if (empty && $from.parent.type.name === "heading") {
          // If in an empty heading, turn it into a normal paragraph
          if ($from.parent.content.size === 0) {
            return this.editor.commands.setParagraph();
          }
          // If at the end of the heading, insert a paragraph after it
          if ($from.parentOffset === $from.parent.content.size) {
            const posAfter = $from.after();
            const pNode = state.schema.nodes.paragraph.create();
            const tr = state.tr.insert(posAfter, pNode);
            tr.setSelection(TextSelection.near(tr.doc.resolve(posAfter + 1)));
            view.dispatch(tr);
            return true;
          }
        }
        return false;
      },
    };
  },
});

// Custom TaskItem that supports standard GFM `- [ ] ` and `* [ ] ` as well as `[ ] `
const CustomTaskItem = TaskItem.extend({
  addInputRules() {
    return [
      wrappingInputRule({
        find: /^\s*\[([ |x])?\]\s$/,
        type: this.type,
        getAttributes: (match) => ({
          checked: match[1] === "x",
        }),
      }),
      new InputRule({
        find: /^\s*\[([ |x])?\]\s$/,
        handler: ({ state, range, match }) => {
          const { $from } = state.selection;
          const node = $from.node(-1);
          if (node && node.type.name === "listItem") {
            const checked = match[1] === "x";
            state.tr.delete(range.from, range.to);
            setTimeout(() => {
              this.editor.commands.toggleTaskList();
              if (checked) {
                this.editor.commands.updateAttributes(this.name, {
                  checked: true,
                });
              }
            }, 0);
          }
        },
      }),
    ];
  },
});

export const Editor: React.FC<EditorProps> = ({
  initialContent,
  workspaceRoot,
  availablePages = [],
  onNavigateToPage,
  onChange,
  onSaveShortcut,
}) => {
  // Slash menu state
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashPosition, setSlashPosition] = useState({ top: 0, left: 0 });
  const [slashRange, setSlashRange] = useState<{ from: number; to: number } | null>(null);
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);

  // WikiLink menu state
  const [wikiLinkMenuOpen, setWikiLinkMenuOpen] = useState(false);
  const [wikiLinkQuery, setWikiLinkQuery] = useState("");
  const [wikiLinkPosition, setWikiLinkPosition] = useState({ top: 0, left: 0 });
  const [wikiLinkRange, setWikiLinkRange] = useState<{ from: number; to: number } | null>(null);
  const [wikiLinkSelectedIndex, setWikiLinkSelectedIndex] = useState(0);

  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Filter items based on current slash query
  const filteredSlashItems = useMemo(
    () => filterSlashMenuItems(SLASH_MENU_ITEMS, slashQuery),
    [slashQuery]
  );

  // Filter available pages based on current wikiLink query
  const filteredWikiLinkItems = useMemo(() => {
    const q = wikiLinkQuery.trim().toLowerCase();
    if (!q) return availablePages;
    return availablePages.filter((p) => p.name.toLowerCase().includes(q));
  }, [availablePages, wikiLinkQuery]);

  // Keep refs for keydown handler to prevent stale closures
  const slashMenuOpenRef = useRef(slashMenuOpen);
  slashMenuOpenRef.current = slashMenuOpen;
  const slashRangeRef = useRef(slashRange);
  slashRangeRef.current = slashRange;
  const filteredSlashItemsRef = useRef(filteredSlashItems);
  filteredSlashItemsRef.current = filteredSlashItems;
  const slashSelectedIndexRef = useRef(slashSelectedIndex);
  slashSelectedIndexRef.current = slashSelectedIndex;

  const wikiLinkMenuOpenRef = useRef(wikiLinkMenuOpen);
  wikiLinkMenuOpenRef.current = wikiLinkMenuOpen;
  const wikiLinkRangeRef = useRef(wikiLinkRange);
  wikiLinkRangeRef.current = wikiLinkRange;
  const filteredWikiLinkItemsRef = useRef(filteredWikiLinkItems);
  filteredWikiLinkItemsRef.current = filteredWikiLinkItems;
  const wikiLinkSelectedIndexRef = useRef(wikiLinkSelectedIndex);
  wikiLinkSelectedIndexRef.current = wikiLinkSelectedIndex;

  // Reset selected indices when filtered items change
  useEffect(() => {
    setSlashSelectedIndex(0);
  }, [filteredSlashItems]);

  useEffect(() => {
    setWikiLinkSelectedIndex(0);
  }, [filteredWikiLinkItems]);

  const editorRef = useRef<any>(null);

  const handleSelectSlashItem = useCallback(
    (item: SlashMenuItem) => {
      const ed = editorRef.current;
      if (!ed) return;

      const range = slashRangeRef.current;
      if (range) {
        ed.chain().focus().deleteRange(range).run();
      }
      item.action(ed);
      setSlashMenuOpen(false);
      setSlashRange(null);
    },
    []
  );

  const handleSelectSlashItemRef = useRef(handleSelectSlashItem);
  handleSelectSlashItemRef.current = handleSelectSlashItem;

  const handleSelectWikiLinkItem = useCallback(
    (item: WikiLinkCandidate) => {
      const ed = editorRef.current;
      if (!ed) return;

      const range = wikiLinkRangeRef.current;
      if (range) {
        ed.chain().focus().deleteRange(range).run();
      }
      ed.chain().focus().insertWikiLink(item.name).run();
      setWikiLinkMenuOpen(false);
      setWikiLinkRange(null);
    },
    []
  );

  const handleSelectWikiLinkItemRef = useRef(handleSelectWikiLinkItem);
  handleSelectWikiLinkItemRef.current = handleSelectWikiLinkItem;

  const checkSlashMenu = useCallback((ed: typeof editor) => {
    if (!ed) return;
    const { state } = ed;
    const { selection } = state;
    const { from, empty } = selection;

    if (!empty) {
      setSlashMenuOpen(false);
      return;
    }

    const $from = selection.$from;
    const parent = $from.parent;
    if (!parent.isTextblock) {
      setSlashMenuOpen(false);
      return;
    }

    const startOfBlock = $from.start();
    const textBefore = state.doc.textBetween(startOfBlock, from, "\n", "\0");
    const slashIndex = textBefore.lastIndexOf("/");

    if (slashIndex !== -1) {
      const query = textBefore.slice(slashIndex + 1);
      if (!query.includes(" ")) {
        const slashPos = startOfBlock + slashIndex;
        const coords = ed.view.coordsAtPos(from);
        setSlashPosition({
          top: coords.bottom + 8,
          left: Math.min(coords.left, window.innerWidth - 300),
        });
        setSlashQuery(query);
        setSlashRange({ from: slashPos, to: from });
        setSlashMenuOpen(true);
        return;
      }
    }

    setSlashMenuOpen(false);
    setSlashRange(null);
  }, []);

  const checkWikiLinkMenu = useCallback((ed: typeof editor) => {
    if (!ed) return;
    const { state } = ed;
    const { selection } = state;
    const { from, empty } = selection;

    if (!empty) {
      setWikiLinkMenuOpen(false);
      return;
    }

    const $from = selection.$from;
    const parent = $from.parent;
    if (!parent.isTextblock) {
      setWikiLinkMenuOpen(false);
      return;
    }

    const startOfBlock = $from.start();
    const textBefore = state.doc.textBetween(startOfBlock, from, "\n", "\0");
    const bracketIndex = textBefore.lastIndexOf("[[");

    if (bracketIndex !== -1) {
      const query = textBefore.slice(bracketIndex + 2);
      if (!query.includes("]]") && !query.includes("\n")) {
        const triggerPos = startOfBlock + bracketIndex;
        const coords = ed.view.coordsAtPos(from);
        setWikiLinkPosition({
          top: coords.bottom + 8,
          left: Math.min(coords.left, window.innerWidth - 300),
        });
        setWikiLinkQuery(query);
        setWikiLinkRange({ from: triggerPos, to: from });
        setWikiLinkMenuOpen(true);
        return;
      }
    }

    setWikiLinkMenuOpen(false);
    setWikiLinkRange(null);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // Replaced by CustomHeading with Enter handling
      }),
      CustomHeading.configure({
        levels: [1, 2, 3, 4],
      }),
      TaskList,
      CustomTaskItem.configure({
        nested: true,
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder: "输入 '/' 唤起命令，输入 '[[' 插入双向链接...",
      }),
      CalloutNode,
      WikiLinkNode,
      Markdown.configure({
        html: false,
        tightLists: true,
        bulletListMarker: "-",
        linkify: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "prose max-w-none focus:outline-none min-h-[500px] text-[15px] leading-relaxed text-slate-800",
      },
      handleClick: (view, pos, event) => {
        // Handle click on WikiLink pills
        const target = (event.target as HTMLElement).closest(
          '[data-type="wiki-link"]'
        );
        if (target) {
          const title = target.getAttribute("data-target-title");
          if (title && onNavigateToPage) {
            onNavigateToPage(title);
            return true;
          }
        }
        return false;
      },
      handleKeyDown: (view, event) => {
        // Intercept keyboard controls when WikiLink Menu is open
        if (
          wikiLinkMenuOpenRef.current &&
          filteredWikiLinkItemsRef.current.length > 0
        ) {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            const total = filteredWikiLinkItemsRef.current.length;
            const next = (wikiLinkSelectedIndexRef.current + 1) % total;
            wikiLinkSelectedIndexRef.current = next;
            setWikiLinkSelectedIndex(next);
            return true;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            const total = filteredWikiLinkItemsRef.current.length;
            const next = (wikiLinkSelectedIndexRef.current - 1 + total) % total;
            wikiLinkSelectedIndexRef.current = next;
            setWikiLinkSelectedIndex(next);
            return true;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            const selectedItem =
              filteredWikiLinkItemsRef.current[wikiLinkSelectedIndexRef.current];
            if (selectedItem) {
              handleSelectWikiLinkItemRef.current(selectedItem);
            }
            return true;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setWikiLinkMenuOpen(false);
            setWikiLinkRange(null);
            return true;
          }
        }

        // Intercept keyboard controls when Slash Menu is open
        if (slashMenuOpenRef.current && filteredSlashItemsRef.current.length > 0) {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            const total = filteredSlashItemsRef.current.length;
            const next = (slashSelectedIndexRef.current + 1) % total;
            slashSelectedIndexRef.current = next;
            setSlashSelectedIndex(next);
            return true;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            const total = filteredSlashItemsRef.current.length;
            const next = (slashSelectedIndexRef.current - 1 + total) % total;
            slashSelectedIndexRef.current = next;
            setSlashSelectedIndex(next);
            return true;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            const selectedItem =
              filteredSlashItemsRef.current[slashSelectedIndexRef.current];
            if (selectedItem) {
              handleSelectSlashItemRef.current(selectedItem);
            }
            return true;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setSlashMenuOpen(false);
            setSlashRange(null);
            return true;
          }
        }

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
            const targetPos =
              event.key === "ArrowDown" ? $pos.after() : $pos.before() - 1;
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
                  const relativePath = await saveImageAsset(
                    workspaceRoot,
                    bytes
                  );
                  view.dispatch(
                    view.state.tr.replaceSelectionWith(
                      view.state.schema.nodes.image.create({
                        src: relativePath,
                      })
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
    onCreate: ({ editor: ed }) => {
      editorRef.current = ed;
    },
    onUpdate: ({ editor: ed }) => {
      editorRef.current = ed;
      checkSlashMenu(ed);
      checkWikiLinkMenu(ed);
      const md = (
        ed.storage as unknown as {
          markdown?: { getMarkdown: () => string };
        }
      ).markdown?.getMarkdown();
      if (md !== undefined) {
        onChange(md);
      }
    },
    onSelectionUpdate: ({ editor: ed }) => {
      editorRef.current = ed;
      checkSlashMenu(ed);
      checkWikiLinkMenu(ed);
    },
  });

  editorRef.current = editor;

  // Expose editor on window in development for end-to-end debugging
  useEffect(() => {
    if (editor) {
      (window as unknown as { __editor?: typeof editor }).__editor = editor;
    }
  }, [editor]);

  // Sync content if initialContent changes externally
  useEffect(() => {
    if (editor && initialContent !== undefined) {
      const currentMd = (
        editor.storage as unknown as {
          markdown?: { getMarkdown: () => string };
        }
      ).markdown?.getMarkdown();
      if (currentMd !== initialContent) {
        editor.commands.setContent(initialContent, false);
      }
    }
  }, [initialContent, editor]);

  return (
    <div
      ref={editorContainerRef}
      className="relative w-full max-w-3xl mx-auto pl-14 pr-8 py-6"
    >
      <BlockHandle editor={editor} containerRef={editorContainerRef} />
      <EditorContent editor={editor} />
      {editor && (
        <>
          <SlashMenu
            isOpen={slashMenuOpen}
            query={slashQuery}
            position={slashPosition}
            items={filteredSlashItems}
            selectedIndex={slashSelectedIndex}
            setSelectedIndex={setSlashSelectedIndex}
            onSelect={(item) => handleSelectSlashItem(item)}
          />
          <WikiLinkMenu
            isOpen={wikiLinkMenuOpen}
            query={wikiLinkQuery}
            position={wikiLinkPosition}
            items={filteredWikiLinkItems}
            selectedIndex={wikiLinkSelectedIndex}
            setSelectedIndex={setWikiLinkSelectedIndex}
            onSelect={(item) => handleSelectWikiLinkItem(item)}
            onClose={() => setWikiLinkMenuOpen(false)}
          />
        </>
      )}
    </div>
  );
};
