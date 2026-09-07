const TARGET_TOKENS = 550;
const OVERLAP_TOKENS = 80;
const MAX_CHUNK_CHARACTERS = 6_000;
const TARGET_WORDS = Math.floor(TARGET_TOKENS / 1.3);

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.trim().split(/\s+/).length * 1.3));
}

export type TextChunk = {
  content: string;
  page: number | null;
  heading: string | null;
  tokenCount: number;
};

function splitLongBlock(block: string): string[] {
  if (
    block.length <= MAX_CHUNK_CHARACTERS &&
    estimateTokens(block) <= TARGET_TOKENS
  ) {
    return [block];
  }
  const words = block.split(/\s+/).filter(Boolean);
  const sections: string[] = [];
  let current: string[] = [];
  let currentCharacters = 0;

  const flush = () => {
    if (current.length) sections.push(current.join(" "));
    current = [];
    currentCharacters = 0;
  };

  for (const word of words) {
    if (word.length > MAX_CHUNK_CHARACTERS) {
      flush();
      for (let offset = 0; offset < word.length; offset += MAX_CHUNK_CHARACTERS) {
        sections.push(word.slice(offset, offset + MAX_CHUNK_CHARACTERS));
      }
      continue;
    }
    if (
      current.length >= TARGET_WORDS ||
      currentCharacters + word.length + 1 > MAX_CHUNK_CHARACTERS
    ) {
      flush();
    }
    current.push(word);
    currentCharacters += word.length + 1;
  }
  flush();
  return sections;
}

function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap(splitLongBlock);
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
  let characters = 0;
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
    if (
      (tokens + t > TARGET_TOKENS ||
        characters + para.length + 2 > MAX_CHUNK_CHARACTERS) &&
      buffer.length
    ) {
      flush();
      let overlap = buffer
        .join("\n\n")
        .split(/\s+/)
        .slice(-OVERLAP_TOKENS)
        .join(" ");
      if (overlap.length + para.length + 2 > MAX_CHUNK_CHARACTERS) {
        overlap = "";
      }
      buffer = overlap ? [overlap] : [];
      tokens = estimateTokens(buffer.join(" "));
      characters = overlap.length;
    }
    buffer.push(para);
    tokens += t;
    characters += para.length + (buffer.length > 1 ? 2 : 0);
  }
  flush();
  return chunks;
}

export function chunkPages(pages: { page: number; text: string }[]): TextChunk[] {
  return pages.flatMap((p) => chunkText(p.text, p.page));
}
