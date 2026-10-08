import React, { useState, useEffect, useRef, useCallback } from "react";
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
} from "./services/tauriApi";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { PageHeader } from "./components/PageHeader";
import { Editor } from "./components/Editor/Editor";
import { StatusBar } from "./components/StatusBar";
import { WorkspaceDialog } from "./components/WorkspaceDialog";
import { ConflictModal } from "./components/ConflictModal";
import { Menu, PanelLeftClose, PanelLeft, RefreshCw } from "lucide-react";

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
      } else {
        setWorkspaceDialogOpen(true);
      }
    }
    init();
  }, [refreshTree, openDocument]);

  // File watcher
  useEffect(() => {
    if (!workspaceRoot) return;

    let unlisten: (() => void) | null = null;
    startWatcher(workspaceRoot, async (changedRelativePath) => {
      await refreshTree(workspaceRoot);
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
  }, [workspaceRoot, refreshTree, openDocument]);

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
    } catch (e) {
      console.error("Failed to write document:", e);
      setIsSaving(false);
    }
  }, [workspaceRoot, activeNode]);

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
      await refreshTree(workspaceRoot);
    } catch (e) {
      alert(`重命名失败: ${e}`);
    }
  };

  const handleCreateRootPage = async () => {
    if (!workspaceRoot) return;
    try {
      const newNode = await createNewPage(workspaceRoot, workspaceRoot, "新页面");
      await refreshTree(workspaceRoot);
      await openDocument(workspaceRoot, newNode);
    } catch (e) {
      alert(`新建页面失败: ${e}`);
    }
  };

  const handleCreateSubpage = async (parentNode: FileTreeNode) => {
    if (!workspaceRoot) return;
    try {
      const newNode = await createNewSubpage(workspaceRoot, parentNode.file_path, "新页面");
      await refreshTree(workspaceRoot);
      await openDocument(workspaceRoot, newNode);
    } catch (e) {
      alert(`新建子页面失败: ${e}`);
    }
  };

  const handleDeletePage = async (node: FileTreeNode) => {
    if (!workspaceRoot) return;
    if (confirm(`确定删除页面 "${node.name}" 吗？${node.has_subpages ? "其包含的所有子页面也将一并删除！" : ""}`)) {
      try {
        await deletePage(workspaceRoot, node.file_path);
        const nodes = await refreshTree(workspaceRoot);
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
                  onChange={handleEditorChange}
                  onSaveShortcut={handleSaveImmediately}
                />
              )}
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
    </div>
  );
}

export default App;
