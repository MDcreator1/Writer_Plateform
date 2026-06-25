export type StudioReviewBlock = {
  text: string;
  extraGap: number;
};

const BLOCK_TAGS = [
  "address", "article", "aside", "blockquote", "div", "figcaption", "figure", "footer", "h1", "h2", "h3", "h4", "h5", "h6", "header", "li", "main", "nav", "ol", "p", "pre", "section", "table", "tbody", "td", "th", "thead", "tr", "ul"
];

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”"
};

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z][a-z0-9]+);/gi, (entity, token: string) => {
    if (token.startsWith("#x") || token.startsWith("#X")) {
      const codePoint = Number.parseInt(token.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }
    if (token.startsWith("#")) {
      const codePoint = Number.parseInt(token.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }
    return NAMED_ENTITIES[token.toLowerCase()] ?? entity;
  });
}

/** Mirrors Writing Studio review mode: markup becomes readable text while paragraph boundaries remain intact. */
export function studioContentToReviewText(value: string) {
  let content = String(value || "").replace(/\r\n?/g, "\n");
  if (!content.trim()) return "";

  content = content
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<[^>]*class=(?:"[^"]*(?:editor-file-gap-br|editor-paragraph-gap-br)[^"]*"|'[^']*(?:editor-file-gap-br|editor-paragraph-gap-br)[^']*')[^>]*>[\s\S]*?<\/[^>]+>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(new RegExp(`</(?:${BLOCK_TAGS.join("|")})\\s*>`, "gi"), "\n")
    .replace(/<[^>]+>/g, "");

  return decodeHtmlEntities(content)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{5,}/g, "\n\n\n\n")
    .trim();
}

export function studioContentToReviewBlocks(value: string): StudioReviewBlock[] {
  const text = studioContentToReviewText(value);
  if (!text) return [];

  const blocks: StudioReviewBlock[] = [];
  let pendingNewlines = 0;
  for (const chunk of text.split(/(\n+)/)) {
    if (!chunk) continue;
    if (/^\n+$/.test(chunk)) {
      pendingNewlines += chunk.length;
      continue;
    }
    const normalized = chunk.trim();
    if (!normalized) continue;
    blocks.push({
      text: normalized,
      extraGap: blocks.length ? Math.max(0, pendingNewlines - 1) : 0
    });
    pendingNewlines = 0;
  }
  return blocks;
}