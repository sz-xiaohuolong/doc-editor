export interface SearchDocument {
  filePath: string;
  title: string;
  content: string;
}

export interface SearchResult {
  filePath: string;
  title: string;
  score: number;
  snippet: string;
}

/**
 * Tokenize text into words and CJK unigrams/bigrams
 */
export function tokenizeCJK(text: string): string[] {
  if (!text) return [];
  const normalized = text.toLowerCase();
  const tokens = new Set<string>();

  // Extract English/Latin words & digits
  const words = normalized.match(/[a-z0-9_]+/g);
  if (words) {
    for (const w of words) {
      if (w.length > 0) tokens.add(w);
    }
  }

  // Extract CJK sequences
  const cjkMatches = normalized.match(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g);
  if (cjkMatches) {
    // Unigrams
    for (const char of cjkMatches) {
      tokens.add(char);
    }
  }

  // Bigrams for consecutive CJK characters
  for (let i = 0; i < normalized.length - 1; i++) {
    const c1 = normalized.charCodeAt(i);
    const c2 = normalized.charCodeAt(i + 1);
    const isCJK1 = (c1 >= 0x4e00 && c1 <= 0x9fa5);
    const isCJK2 = (c2 >= 0x4e00 && c2 <= 0x9fa5);
    if (isCJK1 && isCJK2) {
      tokens.add(normalized.slice(i, i + 2));
    }
  }

  return Array.from(tokens);
}

/**
 * Perform local search across documents
 */
export function searchDocuments(
  docs: SearchDocument[],
  query: string
): SearchResult[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const queryTokens = tokenizeCJK(trimmed);
  if (queryTokens.length === 0) return [];

  const results: SearchResult[] = [];

  for (const doc of docs) {
    const titleLower = doc.title.toLowerCase();
    const contentLower = doc.content.toLowerCase();

    // For queries with 2 or more characters:
    // Require either exact substring match OR at least one multi-char token (bigram/word) match
    const hasSubstring = titleLower.includes(trimmed) || contentLower.includes(trimmed);
    const multiCharTokens = queryTokens.filter((t) => t.length >= 2);
    const hasMultiCharMatch = multiCharTokens.some(
      (t) => titleLower.includes(t) || contentLower.includes(t)
    );

    if (trimmed.length >= 2 && !hasSubstring && !hasMultiCharMatch) {
      continue;
    }

    let score = 0;

    // Exact query substring bonus
    if (titleLower.includes(trimmed)) {
      score += 100;
    }
    if (contentLower.includes(trimmed)) {
      score += 30;
    }

    // Token matching
    for (const token of queryTokens) {
      if (titleLower.includes(token)) {
        score += 15;
      }
      if (contentLower.includes(token)) {
        score += 3;
      }
    }

    if (score > 0) {
      // Generate snippet around match
      let matchPos = contentLower.indexOf(trimmed);
      let matchedLen = trimmed.length;

      if (matchPos === -1) {
        // Find position of the first matching token
        for (const token of queryTokens) {
          const idx = contentLower.indexOf(token);
          if (idx !== -1) {
            matchPos = idx;
            matchedLen = token.length;
            break;
          }
        }
      }

      let snippet = "";
      if (matchPos !== -1) {
        const start = Math.max(0, matchPos - 30);
        const end = Math.min(doc.content.length, matchPos + matchedLen + 40);
        let raw = doc.content.substring(start, end).replace(/\n+/g, " ").trim();
        if (start > 0) raw = "..." + raw;
        if (end < doc.content.length) raw = raw + "...";
        snippet = raw;
      } else {
        snippet = doc.content.slice(0, 70).replace(/\n+/g, " ").trim() + "...";
      }

      results.push({
        filePath: doc.filePath,
        title: doc.title,
        score,
        snippet,
      });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  return results;
}
