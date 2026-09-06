const TARGET_TOKENS = 550;
const OVERLAP_TOKENS = 80;

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.trim().split(/\s+/).length * 1.3));
}

export type TextChunk = {
  content: string;
  page: number | null;
  heading: string | null;
  tokenCount: number;
};

function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function headingFrom(block: string): string | null {
  const first = block.split("\n")[0]?.trim() ?? "";
  if (first.length > 0 && first.length < 120 && /^(#+ |\d+\.|[A-ZÁÉİÜÇÖŞ])/u.test(first)) {
    return first.replace(/^#+\s*/, "");
  }
  return null;
}

export function chunkText(text: string, page: number | null = null): TextChunk[] {
  const paragraphs = splitParagraphs(text);
  const chunks: TextChunk[] = [];
  let buffer: string[] = [];
  let tokens = 0;
  let heading: string | null = null;

  const flush = () => {
    const content = buffer.join("\n\n").trim();
    if (!content) return;
    chunks.push({
      content,
      page,
      heading,
      tokenCount: estimateTokens(content),
    });
  };

  for (const para of paragraphs) {
    const h = headingFrom(para);
    if (h) heading = h;
    const t = estimateTokens(para);
    if (tokens + t > TARGET_TOKENS && buffer.length) {
      flush();
      const overlap = buffer.join("\n\n").split(/\s+/).slice(-OVERLAP_TOKENS).join(" ");
      buffer = overlap ? [overlap] : [];
      tokens = estimateTokens(buffer.join(" "));
    }
    buffer.push(para);
    tokens += t;
  }
  flush();
  return chunks;
}

export function chunkPages(pages: { page: number; text: string }[]): TextChunk[] {
  return pages.flatMap((p) => chunkText(p.text, p.page));
}
