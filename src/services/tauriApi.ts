import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { FileTreeNode } from "../types/tree";

// Check if running inside actual Tauri desktop runtime
export const isTauri = (): boolean => {
  return typeof window !== "undefined" && Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
};

// In-memory fallback for web/testing mode
let mockWorkspace: string | null = "/Mock/Documents/DocEditorWorkspace";
let mockFiles: Map<string, string> = new Map([
  [
    "/Mock/Documents/DocEditorWorkspace/👋 欢迎与快速上手.md",
    `# 👋 欢迎使用 DocEditor\n\n这是一款专为你打造的**类 wolai 本地块级（Block-based）文档编辑器**。\n\n> [!NOTE]\n> 这是一个 **Callout 提示框**。在空行输入 \`/callout\` 即可快速插入提示卡片！\n\n## 🚀 核心块级积木排版\n\n### 待办任务清单\n- [x] 打开本地工作区文件夹\n- [ ] 尝试拖拽六点手柄 ⠿ 调换段落顺序\n- [ ] 按下键盘 Esc 键体验块选中模式\n\n#### 小标题与代码\n\`\`\`typescript\nconsole.log("Hello, 小火龙!");\n\`\`\`\n\n> 知识不仅是记录，更是连接思考的积木。\n`
  ]
]);

export async function selectWorkspaceDir(): Promise<string | null> {
  if (isTauri()) {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "选择或创建本地笔记工作区文件夹",
      });
      return selected as string | null;
    } catch (e) {
      console.error("Failed to open directory dialog:", e);
      return null;
    }
  }
  return mockWorkspace;
}

export async function getLastWorkspace(): Promise<string | null> {
  if (isTauri()) {
    try {
      return await invoke<string | null>("get_last_workspace");
    } catch {
      return null;
    }
  }
  return mockWorkspace;
}

export async function setLastWorkspace(path: string): Promise<void> {
  if (isTauri()) {
    await invoke("set_last_workspace", { path });
  } else {
    mockWorkspace = path;
  }
}

export async function scanWorkspace(path: string): Promise<FileTreeNode[]> {
  if (isTauri()) {
    return await invoke<FileTreeNode[]>("scan_workspace", { path });
  }
  // Mock tree generator
  const nodes: FileTreeNode[] = [];
  mockFiles.forEach((_, filePath) => {
    const fileName = filePath.split("/").pop() || "Untitled";
    const name = fileName.replace(/\.md$/, "");
    nodes.push({
      id: filePath,
      name,
      file_path: filePath,
      has_subpages: false,
      children: [],
    });
  });
  return nodes;
}

export async function readDocument(workspaceRoot: string, filePath: string): Promise<string> {
  if (isTauri()) {
    return await invoke<string>("read_document", { workspaceRoot, filePath });
  }
  return mockFiles.get(filePath) || `# Untitled\n\n`;
}

export async function writeDocument(workspaceRoot: string, filePath: string, content: string): Promise<void> {
  if (isTauri()) {
    await invoke("write_document", { workspaceRoot, filePath, content });
  } else {
    mockFiles.set(filePath, content);
  }
}

export async function createNewPage(workspaceRoot: string, parentDir: string, title: string): Promise<FileTreeNode> {
  if (isTauri()) {
    return await invoke<FileTreeNode>("create_new_page", { workspaceRoot, parentDir, title });
  }
  const filePath = `${parentDir}/${title}.md`;
  mockFiles.set(filePath, `# ${title}\n\n`);
  return {
    id: filePath,
    name: title,
    file_path: filePath,
    has_subpages: false,
    children: [],
  };
}

export async function createNewSubpage(workspaceRoot: string, parentMdPath: string, title: string): Promise<FileTreeNode> {
  if (isTauri()) {
    return await invoke<FileTreeNode>("create_new_subpage", { workspaceRoot, parentMdPath, title });
  }
  const stem = parentMdPath.replace(/\.md$/, "");
  const filePath = `${stem}/${title}.md`;
  mockFiles.set(filePath, `# ${title}\n\n`);
  return {
    id: filePath,
    name: title,
    file_path: filePath,
    has_subpages: false,
    children: [],
  };
}

export async function renamePage(workspaceRoot: string, oldMdPath: string, newTitle: string): Promise<string> {
  if (isTauri()) {
    return await invoke<string>("rename_page", { workspaceRoot, oldMdPath, newTitle });
  }
  const content = mockFiles.get(oldMdPath) || "";
  mockFiles.delete(oldMdPath);
  const parts = oldMdPath.split("/");
  parts.pop();
  const newPath = `${parts.join("/")}/${newTitle}.md`;
  mockFiles.set(newPath, content);
  return newPath;
}

export async function deletePage(workspaceRoot: string, mdPath: string): Promise<void> {
  if (isTauri()) {
    await invoke("delete_page", { workspaceRoot, mdPath });
  } else {
    mockFiles.delete(mdPath);
  }
}

export async function saveImageAsset(workspaceRoot: string, bytes: number[]): Promise<string> {
  if (isTauri()) {
    return await invoke<string>("save_image", { workspaceRoot, imageBytes: bytes });
  }
  return "assets/mock_image.png";
}

export async function startWatcher(workspacePath: string, onFileChange: (path: string) => void): Promise<UnlistenFn | null> {
  if (isTauri()) {
    try {
      await invoke("start_watch", { workspacePath });
      return await listen<string>("workspace-file-changed", (event) => {
        onFileChange(event.payload);
      });
    } catch (e) {
      console.warn("Watcher not available or failed:", e);
      return null;
    }
  }
  return null;
}

export async function fetchAllDocumentsContent(
  workspaceRoot: string,
  nodes: FileTreeNode[]
): Promise<{ filePath: string; title: string; content: string }[]> {
  const result: { filePath: string; title: string; content: string }[] = [];
  function traverse(list: FileTreeNode[]) {
    for (const node of list) {
      result.push({ filePath: node.file_path, title: node.name, content: "" });
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  }
  traverse(nodes);

  for (const item of result) {
    try {
      item.content = await readDocument(workspaceRoot, item.filePath);
    } catch {
      item.content = "";
    }
  }
  return result;
}

