import { describe, it, expect } from "vitest";
import { tokenizeCJK, searchDocuments, SearchDocument } from "../src/services/searchEngine";

describe("Search Engine & CJK Tokenizer", () => {
  it("extracts English words, CJK unigrams and bigrams accurately", () => {
    const text = "快速上手 Wolai 笔记";
    const tokens = tokenizeCJK(text);

    // English word
    expect(tokens).toContain("wolai");

    // CJK Unigrams
    expect(tokens).toContain("快");
    expect(tokens).toContain("速");
    expect(tokens).toContain("上");
    expect(tokens).toContain("手");
    expect(tokens).toContain("笔");
    expect(tokens).toContain("记");

    // CJK Bigrams
    expect(tokens).toContain("快速");
    expect(tokens).toContain("速上");
    expect(tokens).toContain("上手");
    expect(tokens).toContain("笔记");
  });

  it("scores title matches higher than content matches", () => {
    const docs: SearchDocument[] = [
      {
        filePath: "/workspace/doc1.md",
        title: "块级排版手册",
        content: "这里介绍普通段落排版",
      },
      {
        filePath: "/workspace/doc2.md",
        title: "普通随笔",
        content: "这里偶然提到了块级排版这个词汇",
      },
    ];

    const results = searchDocuments(docs, "块级排版");
    expect(results.length).toBe(2);
    // Title match has much higher score
    expect(results[0].filePath).toBe("/workspace/doc1.md");
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it("extracts relevant snippet context around matching terms", () => {
    const docs: SearchDocument[] = [
      {
        filePath: "/workspace/welcome.md",
        title: "欢迎与快速上手",
        content:
          "知识不仅是记录，更是连接思考的积木。通过双向链接连接每一个节点，让思维自由流动。",
      },
    ];

    const results = searchDocuments(docs, "双向链接");
    expect(results.length).toBe(1);
    expect(results[0].snippet).toContain("双向链接");
  });

  it("returns empty array when query is empty or no match", () => {
    const docs: SearchDocument[] = [
      {
        filePath: "/workspace/welcome.md",
        title: "欢迎页面",
        content: "内容文本",
      },
    ];

    expect(searchDocuments(docs, "")).toEqual([]);
    expect(searchDocuments(docs, "   ")).toEqual([]);
    expect(searchDocuments(docs, "不存在的火星文关键词123456789")).toEqual([]);
  });
});
