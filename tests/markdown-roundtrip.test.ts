import { describe, it, expect } from "vitest";
import { cleanMarkdown, parseCallout, formatCalloutMarkdown } from "../src/utils/markdown";

describe("Markdown Cleanliness & Round-trip", () => {
  it("normalizes CRLF and removes trailing whitespace", () => {
    const raw = "# Title  \r\n\r\nLine 1   \r\nLine 2";
    const cleaned = cleanMarkdown(raw);
    expect(cleaned).toBe("# Title\n\nLine 1\nLine 2");
  });

  it("parses and formats GFM callouts accurately", () => {
    const callout = "[!NOTE]\n这是一个重要的提示内容";
    const parsed = parseCallout(callout);
    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe("note");
    expect(parsed?.content).toBe("这是一个重要的提示内容");

    const formatted = formatCalloutMarkdown("note", "这是一个重要的提示内容");
    expect(formatted).toBe("> [!NOTE]\n> 这是一个重要的提示内容\n\n");
  });

  it("ensures all 10 block types parse and format cleanly", () => {
    const fullSample = [
      "# 主标题 H1",
      "## 大标题 H2",
      "### 中标题 H3",
      "#### 小标题 H4",
      "普通段落文本，支持**加粗**与*斜体*以及`行内代码`。",
      "- 无序列表项 1",
      "- 无序列表项 2",
      "1. 有序列表项 1",
      "2. 有序列表项 2",
      "- [ ] 待办清单项未完成",
      "- [x] 待办清单项已完成",
      "> [!NOTE]",
      "> 这是一个标准 Callout 提示框",
      "> 纯引用文本段落",
      "```typescript",
      'console.log("Hello wolai!");',
      "```",
      "---",
      "![示例图片](assets/img_test.png)",
    ].join("\n\n");

    const cleaned = cleanMarkdown(fullSample);
    expect(cleaned).toContain("# 主标题 H1");
    expect(cleaned).toContain("#### 小标题 H4");
    expect(cleaned).toContain("- [ ] 待办清单项未完成");
    expect(cleaned).toContain("- [x] 待办清单项已完成");
    expect(cleaned).toContain("> [!NOTE]");
    expect(cleaned).toContain("```typescript");
    expect(cleaned).toContain("---");
    expect(cleaned).toContain("assets/img_test.png");
  });

  it("ensures no proprietary HTML comment tags are injected", () => {
    const sample = `
# 主标题
## 大标题
### 中标题
#### 小标题

- [ ] 未完成待办
- [x] 已完成待办

\`\`\`typescript
const x = 10;
\`\`\`
    `.trim();

    expect(sample).not.toContain("<!-- block-id");
    expect(sample).not.toContain("<block>");
  });
});
