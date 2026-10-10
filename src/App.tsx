import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { FileTreeNode } from "./types/tree";
import {
  getLastWorkspace,
  setLastWorkspace,
  selectWorkspaceDir,
  scanWorkspace,
  readDocument,
  writeDocument,
  createNewPage,
  createNewSubpage,
  renamePage,
  deletePage,
  startWatcher,
  fetchAllDocumentsContent,
} from "./services/tauriApi";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { PageHeader } from "./components/PageHeader";
import { Editor } from "./components/Editor/Editor";
import { StatusBar } from "./components/StatusBar";
import { WorkspaceDialog } from "./components/WorkspaceDialog";
import { ConflictModal } from "./components/ConflictModal";
import { BacklinksPanel } from "./components/Editor/BacklinksPanel";
import { GlobalSearchModal } from "./components/Search/GlobalSearchModal";
import { SearchDocument } from "./services/searchEngine";
import { findBacklinks, flattenTree, BacklinkItem } from "./services/backlinksEngine";
import { convertFileToMarkdown } from "./services/importPipeline";
import { PanelLeftClose, PanelLeft, RefreshCw } from "lucide-react";

export function App() {
  const [workspaceRoot, setWorkspaceRoot] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [activeNode, setActiveNode] = useState<FileTreeNode | null>(null);
  const [documentContent, setDocumentContent] = useState<string>("");
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = useState<boolean>(false);
  const [conflictModalOpen, setConflictModalOpen] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // v0.2.0: Search & Backlinks state
  const [searchModalOpen, setSearchModalOpen] = useState<boolean>(false);
  const [allDocuments, setAllDocuments] = useState<SearchDocument[]>([]);
  const [backlinks, setBacklinks] = useState<BacklinkItem[]>([]);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestContentRef = useRef<string>("");
  latestContentRef.current = documentContent;

  const isDirtyRef = useRef<boolean>(false);
  isDirtyRef.current = isDirty;
  const activeNodeRef = useRef<FileTreeNode | null>(null);
  activeNodeRef.current = activeNode;
  const lastSelfSaveTimeRef = useRef<number>(0);

  const refreshTree = useCallback(async (root: string) => {
    try {
      const nodes = await scanWorkspace(root);
      setFileTree(nodes);
      return nodes;
    } catch (e) {
      console.error("Failed to scan workspace tree:", e);
      return [];
    }
  }, []);

  const openDocument = useCallback(
    async (root: string, node: FileTreeNode) => {
      // If current document has unsaved edits, flush save first
      if (isDirtyRef.current && activeNodeRef.current) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = null;
        }
        try {
          await writeDocument(root, activeNodeRef.current.file_path, latestContentRef.current);
          lastSelfSaveTimeRef.current = Date.now();
        } catch (e) {
          console.warn("Failed to flush pending save before switching:", e);
        }
      }
      try {
        const content = await readDocument(root, node.file_path);
        setActiveNode(node);
        setDocumentContent(content);
        setIsDirty(false);
      } catch (e) {
        console.error("Failed to read document:", e);
      }
    },
    []
  );

  // Refresh index of all documents for Global Search
  const updateSearchIndex = useCallback(
    async (root: string, nodes: FileTreeNode[]) => {
      try {
        const docs = await fetchAllDocumentsContent(root, nodes);
        setAllDocuments(docs);
      } catch (e) {
        console.warn("Failed to update search index:", e);
      }
    },
    []
  );

  // Update Backlinks for currently active document
  const updateBacklinks = useCallback(
    async (root: string, active: FileTreeNode, nodes: FileTreeNode[]) => {
      try {
        const links = await findBacklinks(
          root,
          active.name,
          active.file_path,
          nodes,
          readDocument
        );
        setBacklinks(links);
      } catch (e) {
        console.warn("Failed to update backlinks:", e);
      }
    },
    []
  );

  // Initialize workspace
  useEffect(() => {
    async function init() {
      const saved = await getLastWorkspace();
      if (saved) {
        setWorkspaceRoot(saved);
        const nodes = await refreshTree(saved);
        if (nodes.length > 0) {
          openDocument(saved, nodes[0]);
        }
        updateSearchIndex(saved, nodes);
      } else {
        setWorkspaceDialogOpen(true);
      }
    }
    init();
  }, [refreshTree, openDocument, updateSearchIndex]);

  // Update Backlinks when active node or file tree changes
  useEffect(() => {
    if (workspaceRoot && activeNode) {
      updateBacklinks(workspaceRoot, activeNode, fileTree);
      updateSearchIndex(workspaceRoot, fileTree);
    }
  }, [workspaceRoot, activeNode, fileTree, updateBacklinks, updateSearchIndex]);

  // Global Cmd+P / Ctrl+P shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // File watcher
  useEffect(() => {
    if (!workspaceRoot) return;

    let unlisten: (() => void) | null = null;
    startWatcher(workspaceRoot, async (changedRelativePath) => {
      const nodes = await refreshTree(workspaceRoot);
      updateSearchIndex(workspaceRoot, nodes);

      const currentActive = activeNodeRef.current;
      if (currentActive && changedRelativePath.endsWith(currentActive.name + ".md")) {
        // Ignore changes triggered by our own recent saves
        if (Date.now() - lastSelfSaveTimeRef.current < 1500) {
          return;
        }
        // If current document has unsaved edits in memory, prompt conflict modal
        if (isDirtyRef.current) {
          setConflictModalOpen(true);
          return;
        }
        // If document is clean, reload silently to reflect external change
        openDocument(workspaceRoot, currentActive);
      }
    }).then((fn) => {
      if (fn) unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, [workspaceRoot, refreshTree, openDocument, updateSearchIndex]);

  const handleSelectWorkspace = async () => {
    const selected = await selectWorkspaceDir();
    if (selected) {
      setWorkspaceRoot(selected);
      await setLastWorkspace(selected);
      setWorkspaceDialogOpen(false);
      const nodes = await refreshTree(selected);
      if (nodes.length > 0) {
        openDocument(selected, nodes[0]);
      } else {
        setActiveNode(null);
        setDocumentContent("");
      }
      updateSearchIndex(selected, nodes);
    }
  };

  const handleSaveImmediately = useCallback(async () => {
    if (!workspaceRoot || !activeNode) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    setIsSaving(true);
    try {
      await writeDocument(workspaceRoot, activeNode.file_path, latestContentRef.current);
      lastSelfSaveTimeRef.current = Date.now();
      setIsDirty(false);
      setIsSaving(false);
      setLastSavedAt(new Date());

      // Update in-memory search docs with latest content
      setAllDocuments((prev) =>
        prev.map((d) =>
          d.filePath === activeNode.file_path
            ? { ...d, content: latestContentRef.current }
            : d
        )
      );
      updateBacklinks(workspaceRoot, activeNode, fileTree);
    } catch (e) {
      console.error("Failed to write document:", e);
      setIsSaving(false);
    }
  }, [workspaceRoot, activeNode, fileTree, updateBacklinks]);

  const handleEditorChange = (newContent: string) => {
    setDocumentContent(newContent);
    setIsDirty(true);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // 1000ms debounce auto-save
    saveTimeoutRef.current = setTimeout(async () => {
      if (!workspaceRoot || !activeNode) return;
      setIsSaving(true);
      try {
        await writeDocument(workspaceRoot, activeNode.file_path, newContent);
        lastSelfSaveTimeRef.current = Date.now();
        setIsDirty(false);
        setIsSaving(false);
        setLastSavedAt(new Date());

        setAllDocuments((prev) =>
          prev.map((d) =>
            d.filePath === activeNode.file_path ? { ...d, content: newContent } : d
          )
        );
        updateBacklinks(workspaceRoot, activeNode, fileTree);
      } catch (e) {
        console.error("Auto-save failed:", e);
        setIsSaving(false);
      }
    }, 1000);
  };

  const handleRenamePage = async (newTitle: string) => {
    if (!workspaceRoot || !activeNode) return;
    try {
      const newPath = await renamePage(workspaceRoot, activeNode.file_path, newTitle);
      lastSelfSaveTimeRef.current = Date.now();
      const updatedNode = { ...activeNode, name: newTitle, file_path: newPath };
      setActiveNode(updatedNode);
      const nodes = await refreshTree(workspaceRoot);
      updateSearchIndex(workspaceRoot, nodes);
    } catch (e) {
      alert(`重命名失败: ${e}`);
    }
  };

  const handleCreateRootPage = async () => {
    if (!workspaceRoot) return;
    try {
      const newNode = await createNewPage(workspaceRoot, workspaceRoot, "新页面");
      const nodes = await refreshTree(workspaceRoot);
      updateSearchIndex(workspaceRoot, nodes);
      await openDocument(workspaceRoot, newNode);
    } catch (e) {
      alert(`新建页面失败: ${e}`);
    }
  };

  const handleCreateSubpage = async (parentNode: FileTreeNode) => {
    if (!workspaceRoot) return;
    try {
      const newNode = await createNewSubpage(workspaceRoot, parentNode.file_path, "新页面");
      const nodes = await refreshTree(workspaceRoot);
      updateSearchIndex(workspaceRoot, nodes);
      await openDocument(workspaceRoot, newNode);
    } catch (e) {
      alert(`新建子页面失败: ${e}`);
    }
  };

  const handleDeletePage = async (node: FileTreeNode) => {
    if (!workspaceRoot) return;
    if (
      confirm(
        `确定删除页面 "${node.name}" 吗？${
          node.has_subpages ? "其包含的所有子页面也将一并删除！" : ""
        }`
      )
    ) {
      try {
        await deletePage(workspaceRoot, node.file_path);
        const nodes = await refreshTree(workspaceRoot);
        updateSearchIndex(workspaceRoot, nodes);
        if (activeNode?.file_path === node.file_path) {
          if (nodes.length > 0) {
            openDocument(workspaceRoot, nodes[0]);
          } else {
            setActiveNode(null);
            setDocumentContent("");
          }
        }
      } catch (e) {
        alert(`删除失败: ${e}`);
      }
    }
  };

  // List of available pages for WikiLink autocompletion
  const availablePages = useMemo(() => {
    return flattenTree(fileTree).map((n) => ({
      name: n.name,
      filePath: n.file_path,
    }));
  }, [fileTree]);

  // Navigate to page by title (WikiLink click)
  const handleNavigateToPage = useCallback(
    (targetTitle: string) => {
      if (!workspaceRoot) return;
      const flat = flattenTree(fileTree);
      const target = flat.find(
        (n) => n.name.trim().toLowerCase() === targetTitle.trim().toLowerCase()
      );
      if (target) {
        openDocument(workspaceRoot, target);
      } else {
        alert(`未找到页面「${targetTitle}」`);
      }
    },
    [workspaceRoot, fileTree, openDocument]
  );

  // Navigate to page by exact file path (Search or Backlinks click)
  const handleNavigateByFilePath = useCallback(
    (filePath: string) => {
      if (!workspaceRoot) return;
      const flat = flattenTree(fileTree);
      const target = flat.find((n) => n.file_path === filePath);
      if (target) {
        openDocument(workspaceRoot, target);
      }
    },
    [workspaceRoot, fileTree, openDocument]
  );

  // Multi-format file import pipeline handler
  const handleImportFiles = async (files: FileList) => {
    if (!workspaceRoot) return;
    const existingTitles = flattenTree(fileTree).map((n) => n.name);
    let lastImportedTitle: string | null = null;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const imported = await convertFileToMarkdown(
          file,
          workspaceRoot,
          existingTitles
        );
        existingTitles.push(imported.title);

        const newNode = await createNewPage(
          workspaceRoot,
          workspaceRoot,
          imported.title
        );
        await writeDocument(workspaceRoot, newNode.file_path, imported.markdown);
        lastImportedTitle = imported.title;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        alert(`导入文件 "${file.name}" 失败: ${msg}`);
      }
    }

    const updatedNodes = await refreshTree(workspaceRoot);
    updateSearchIndex(workspaceRoot, updatedNodes);

    if (lastImportedTitle) {
      const target =
        flattenTree(updatedNodes).find((n) => n.name === lastImportedTitle) ||
        updatedNodes[0];
      if (target) {
        await openDocument(workspaceRoot, target);
      }
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-slate-800 font-sans">
      {/* Sidebar */}
      {sidebarOpen && (
        <Sidebar
          workspaceRoot={workspaceRoot}
          fileTree={fileTree}
          activeFilePath={activeNode?.file_path || null}
          onSelectPage={(node) => workspaceRoot && openDocument(workspaceRoot, node)}
          onCreateRootPage={handleCreateRootPage}
          onCreateSubpage={handleCreateSubpage}
          onDeletePage={handleDeletePage}
          onSwitchWorkspace={() => setWorkspaceDialogOpen(true)}
          onOpenSearch={() => setSearchModalOpen(true)}
          onImportFiles={handleImportFiles}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white">
        {/* Top Navbar */}
        <header className="h-9 px-4 flex items-center justify-between border-b border-slate-100/80 bg-white/60 backdrop-blur select-none flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title={sidebarOpen ? "折叠侧边栏" : "展开侧边栏"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeft className="w-4 h-4" />
              )}
            </button>
            <span className="text-xs text-slate-400 font-medium truncate max-w-xs">
              {activeNode ? activeNode.name : "未打开文档"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <button
              onClick={() => setSearchModalOpen(true)}
              title="全局搜索 (Cmd+P)"
              className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <span>搜索</span>
              <kbd className="font-mono text-[10px] bg-slate-100 px-1 rounded">⌘P</kbd>
            </button>
            <button
              onClick={() => workspaceRoot && refreshTree(workspaceRoot)}
              title="刷新侧边栏文件"
              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Scrollable Document Area */}
        <main className="flex-1 overflow-y-auto">
          {activeNode ? (
            <div className="pb-32">
              <PageHeader
                title={activeNode.name}
                onRename={handleRenamePage}
              />
              {workspaceRoot && (
                <Editor
                  key={activeNode.file_path}
                  initialContent={documentContent}
                  workspaceRoot={workspaceRoot}
                  availablePages={availablePages}
                  onNavigateToPage={handleNavigateToPage}
                  onChange={handleEditorChange}
                  onSaveShortcut={handleSaveImmediately}
                />
              )}
              {/* Backlinks panel at document bottom */}
              <BacklinksPanel
                currentTitle={activeNode.name}
                backlinks={backlinks}
                onNavigateToSource={handleNavigateByFilePath}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 select-none space-y-3">
              <span className="text-4xl">📝</span>
              <p className="text-sm">没有打开的文档</p>
              <button
                onClick={handleCreateRootPage}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-rose-500 hover:bg-rose-600 transition-all shadow-sm"
              >
                新建页面
              </button>
            </div>
          )}
        </main>

        {/* Bottom Status Bar */}
        <StatusBar
          isSaving={isSaving}
          isDirty={isDirty}
          lastSavedAt={lastSavedAt}
        />
      </div>

      {/* Onboarding / Workspace Switch Modal */}
      <WorkspaceDialog
        isOpen={workspaceDialogOpen}
        onSelectDir={handleSelectWorkspace}
        onCancel={() => setWorkspaceDialogOpen(false)}
        canCancel={Boolean(workspaceRoot)}
      />

      {/* External File Conflict Modal */}
      <ConflictModal
        isOpen={conflictModalOpen}
        onReload={() => {
          if (workspaceRoot && activeNode) {
            openDocument(workspaceRoot, activeNode);
          }
          setConflictModalOpen(false);
        }}
        onKeepLocal={() => {
          handleSaveImmediately();
          setConflictModalOpen(false);
        }}
      />

      {/* Global Search Modal (Cmd+P) */}
      <GlobalSearchModal
        isOpen={searchModalOpen}
        documents={allDocuments}
        onClose={() => setSearchModalOpen(false)}
        onSelectResult={handleNavigateByFilePath}
      />
    </div>
  );
}

export default App;
