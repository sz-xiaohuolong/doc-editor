import { describe, it, expect } from "vitest";
import {
  generateUniqueTitle,
  convertFileToMarkdown,
} from "../src/services/importPipeline";

describe("Import Pipeline", () => {
  it("generates unique title when name already exists", () => {
    const existing = ["笔记", "笔记 (1)", "产品规划"];
    expect(generateUniqueTitle("新笔记", existing)).toBe("新笔记");
    expect(generateUniqueTitle("笔记", existing)).toBe("笔记 (2)");
    expect(generateUniqueTitle("产品规划", existing)).toBe("产品规划 (1)");
  });

  it("converts plain text file to markdown paragraphs", async () => {
    const text = "第一段普通文本\n第二段文本内容";
    const file = {
      name: "随手记.txt",
      arrayBuffer: async () => new TextEncoder().encode(text).buffer,
    };

    const imported = await convertFileToMarkdown(file, "/mock/root", []);
    expect(imported.title).toBe("随手记");
    expect(imported.markdown).toContain("第一段普通文本\n\n第二段文本内容");
  });

  it("converts HTML file to standard clean Markdown", async () => {
    const html = "<h1>网页标题</h1><p>这是一个<strong>加粗段落</strong>。</p>";
    const file = {
      name: "网页备份.html",
      arrayBuffer: async () => new TextEncoder().encode(html).buffer,
    };

    const imported = await convertFileToMarkdown(file, "/mock/root", []);
    expect(imported.title).toBe("网页备份");
    expect(imported.markdown).toContain("# 网页标题");
    expect(imported.markdown).toContain("**加粗段落**");
  });
});
