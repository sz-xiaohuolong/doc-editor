import { describe, it, expect } from "vitest";
import { findBacklinks, flattenTree } from "../src/services/backlinksEngine";
import { FileTreeNode } from "../src/types/tree";

describe("WikiLink & Backlinks Engine", () => {
  it("flattens recursive tree nodes cleanly", () => {
    const tree: FileTreeNode[] = [
      {
        id: "1",
        name: "Page 1",
        file_path: "/workspace/Page 1.md",
        has_subpages: true,
        children: [
          {
            id: "1-1",
            name: "Subpage 1-1",
            file_path: "/workspace/Page 1/Subpage 1-1.md",
            has_subpages: false,
            children: [],
          },
        ],
      },
      {
        id: "2",
        name: "Page 2",
        file_path: "/workspace/Page 2.md",
        has_subpages: false,
        children: [],
      },
    ];

    const flat = flattenTree(tree);
    expect(flat.length).toBe(3);
    expect(flat.map((n) => n.name)).toEqual(["Page 1", "Subpage 1-1", "Page 2"]);
  });

  it("finds backlinks referencing targetTitle across workspace files", async () => {
    const tree: FileTreeNode[] = [
      {
        id: "1",
        name: "目标页面",
        file_path: "/workspace/目标页面.md",
        has_subpages: false,
        children: [],
      },
      {
        id: "2",
        name: "关联笔记 A",
        file_path: "/workspace/关联笔记 A.md",
        has_subpages: false,
        children: [],
      },
      {
        id: "3",
        name: "无关笔记 B",
        file_path: "/workspace/无关笔记 B.md",
        has_subpages: false,
        children: [],
      },
    ];

    const mockContentMap: Record<string, string> = {
      "/workspace/目标页面.md": "# 目标页面\n\n正文内容",
      "/workspace/关联笔记 A.md":
        "# 关联笔记 A\n\n在日常记录中，我们常引用 [[目标页面]] 进行溯源。",
      "/workspace/无关笔记 B.md": "# 无关笔记 B\n\n完全不包含引用的独立笔记。",
    };

    const mockReader = async (_root: string, path: string) => {
      return mockContentMap[path] || "";
    };

    const backlinks = await findBacklinks(
      "/workspace",
      "目标页面",
      "/workspace/目标页面.md",
      tree,
      mockReader
    );

    expect(backlinks.length).toBe(1);
    expect(backlinks[0].sourceTitle).toBe("关联笔记 A");
    expect(backlinks[0].snippet).toContain("[[目标页面]]");
  });
});
