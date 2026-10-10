import { FileTreeNode } from "../types/tree";

export interface BacklinkItem {
  sourceFilePath: string;
  sourceTitle: string;
  snippet: string;
}

/**
 * Flattens the recursive FileTreeNode tree into a flat array of nodes.
 */
export function flattenTree(nodes: FileTreeNode[]): FileTreeNode[] {
  const result: FileTreeNode[] = [];
  function traverse(list: FileTreeNode[]) {
    for (const node of list) {
      result.push(node);
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  }
  traverse(nodes);
  return result;
}

/**
 * Scans other documents in the workspace for references to [[targetTitle]].
 */
export async function findBacklinks(
  workspaceRoot: string,
  targetTitle: string,
  currentFilePath: string,
  allNodes: FileTreeNode[],
  readContentFn: (root: string, path: string) => Promise<string>
): Promise<BacklinkItem[]> {
  if (!targetTitle) return [];

  const flatNodes = flattenTree(allNodes);
  const backlinks: BacklinkItem[] = [];

  // Match [[targetTitle]] exactly (case insensitive, trimmed)
  const escaped = targetTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\[\\[\\s*${escaped}\\s*\\]\\]`, "i");

  for (const node of flatNodes) {
    // Skip current file
    if (node.file_path === currentFilePath) continue;

    try {
      const content = await readContentFn(workspaceRoot, node.file_path);
      if (regex.test(content)) {
        // Extract context snippet
        const lines = content.split("\n");
        let matchedLine = "";
        for (const line of lines) {
          if (regex.test(line)) {
            matchedLine = line.trim();
            break;
          }
        }

        // Clean snippet Markdown and HTML tokens for readability
        let snippet = matchedLine
          .replace(/<[^>]+>/g, "")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&")
          .replace(/^#+\s*/, "")
          .replace(/^>\s*/, "")
          .replace(/^-\s*(\[[ x]\]\s*)?/, "")
          .trim();

        if (snippet.length > 100) {
          snippet = snippet.slice(0, 100) + "...";
        }

        backlinks.push({
          sourceFilePath: node.file_path,
          sourceTitle: node.name,
          snippet: snippet || `引用了 [[${targetTitle}]]`,
        });
      }
    } catch (err) {
      console.warn(`Failed to read document for backlinks: ${node.file_path}`, err);
    }
  }

  return backlinks;
}
