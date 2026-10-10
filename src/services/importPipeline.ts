import TurndownService from "turndown";
import mammoth from "mammoth";
import { saveImageAsset } from "./tauriApi";

const turndownService = new TurndownService({
  headingStyle: "atx",
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});

export interface ImportedDocument {
  title: string;
  markdown: string;
}

/**
 * Generate unique title if already exists
 */
export function generateUniqueTitle(
  desiredTitle: string,
  existingTitles: string[]
): string {
  let title = desiredTitle.trim() || "未命名导入文档";
  if (!existingTitles.includes(title)) {
    return title;
  }

  let counter = 1;
  while (existingTitles.includes(`${title} (${counter})`)) {
    counter++;
  }
  return `${title} (${counter})`;
}

/**
 * Extract embedded base64 images from HTML/Markdown and persist to local .assets/
 */
async function processEmbeddedImages(
  content: string,
  workspaceRoot: string
): Promise<string> {
  const base64Regex = /data:image\/([a-zA-Z0-9+]+);base64,([a-zA-Z0-9+/=]+)/g;
  let updatedContent = content;
  const matches = Array.from(content.matchAll(base64Regex));

  for (const match of matches) {
    const fullMatch = match[0];
    const base64Data = match[2];

    try {
      // Decode base64 to byte array
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Save to local workspace assets
      const localRelPath = await saveImageAsset(
        workspaceRoot,
        Array.from(bytes)
      );

      // Replace in content
      updatedContent = updatedContent.replace(fullMatch, localRelPath);
    } catch (err) {
      console.warn("Failed to save embedded image from imported document:", err);
    }
  }

  return updatedContent;
}

/**
 * Parse a single file buffer into a clean Markdown document
 */
export async function convertFileToMarkdown(
  file: { name: string; arrayBuffer: () => Promise<ArrayBuffer> },
  workspaceRoot: string,
  existingTitles: string[]
): Promise<ImportedDocument> {
  const fileName = file.name;
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const rawTitle = fileName.replace(/\.[^/.]+$/, "");
  const uniqueTitle = generateUniqueTitle(rawTitle, existingTitles);

  const buffer = await file.arrayBuffer();
  let markdown = "";

  if (ext === "md" || ext === "markdown") {
    const textDecoder = new TextDecoder("utf-8");
    markdown = textDecoder.decode(buffer);
  } else if (ext === "txt") {
    const textDecoder = new TextDecoder("utf-8");
    const text = textDecoder.decode(buffer);
    markdown = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n\n");
  } else if (ext === "html" || ext === "htm") {
    const textDecoder = new TextDecoder("utf-8");
    const html = textDecoder.decode(buffer);
    markdown = turndownService.turndown(html);
  } else if (ext === "docx") {
    try {
      const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
      const html = result.value;
      markdown = turndownService.turndown(html);
    } catch (docxErr) {
      console.error("Failed to parse docx via mammoth:", docxErr);
      throw new Error(`无法解析 Word (.docx) 文件: ${fileName}`);
    }
  } else {
    throw new Error(`不支持的文件格式: .${ext}`);
  }

  // Extract and save embedded base64 images locally
  markdown = await processEmbeddedImages(markdown, workspaceRoot);

  return {
    title: uniqueTitle,
    markdown: markdown.trim(),
  };
}
