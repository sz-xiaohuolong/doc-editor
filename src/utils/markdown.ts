/**
 * Pure Markdown utilities
 * Handles CommonMark/GFM conversion without injecting proprietary HTML comments.
 */

export function cleanMarkdown(content: string): string {
  // Normalize Windows CRLF to LF
  let cleaned = content.replace(/\r\n/g, "\n");
  // Trim trailing whitespace while keeping intentional double spaces for line breaks
  cleaned = cleaned.replace(/[ \t]+$/gm, "");
  return cleaned;
}

export function parseCallout(text: string): { type: "note" | "tip" | "warning"; content: string } | null {
  const match = text.match(/^\[!(NOTE|TIP|WARNING)\](?:\s*\n)?([\s\S]*)$/i);
  if (!match) return null;
  const tag = match[1].toLowerCase() as "note" | "tip" | "warning";
  return {
    type: tag,
    content: match[2].trim(),
  };
}

export function formatCalloutMarkdown(type: "note" | "tip" | "warning", content: string): string {
  const tag = type.toUpperCase();
  const lines = content.split("\n");
  const calloutLines = [`> [!${tag}]`, ...lines.map((l) => (l ? `> ${l}` : `>`))];
  return calloutLines.join("\n") + "\n\n";
}
