import { cosine } from "@/lib/rag/embed";
import type { ChunkRecord, RetrievedChunk, Visibility } from "@/lib/rag/types";

const ALARM_CODE = /\b(?:E\d{1,3}|HP|LP|HPS|LPS|HT|LT|NH3)\b/gi;
const DOCUMENT_REQUEST =
  /(manual|documentation|document|procedure|repair guide|service guide|kılavuz|doküman|belge|prosedür|manuel|procédure|documentación|procedimiento|руководство|документ|процедур|دليل|وثائق|إجراء|handbuch|dokumentation|verfahren|manuale|documentazione|procedura|documentação|procedimento|instrukcja|dokumentacja)/i;

export function isDocumentationRequest(query: string): boolean {
  return DOCUMENT_REQUEST.test(query);
}

export function extractAlarmTokens(query: string): string[] {
  return [...new Set((query.match(ALARM_CODE) ?? []).map((t) => t.toUpperCase()))];
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function keywordScore(query: string, content: string): { score: number; hits: string[] } {
  const qTokens = tokenize(query);
  const c = content.toLowerCase();
  const hits: string[] = [];
  let score = 0;
  for (const t of qTokens) {
    if (c.includes(t)) {
      hits.push(t);
      score += t.length > 4 ? 1.4 : 1;
    }
  }
  for (const code of extractAlarmTokens(query)) {
    const re = new RegExp(`\\b${code}\\b`, "i");
    if (re.test(content)) {
      hits.push(code);
      score += 4;
    }
  }
  return { score, hits };
}

export function hybridRank(
  query: string,
  queryEmbedding: number[] | null,
  chunks: ChunkRecord[],
  opts: { includeInternal: boolean; limit?: number },
): RetrievedChunk[] {
  const allowed: Visibility[] = opts.includeInternal ? ["repair", "internal"] : ["repair"];
  const scored: RetrievedChunk[] = [];

  for (const chunk of chunks) {
    if (!allowed.includes(chunk.visibility)) continue;
    const searchable = [
      chunk.documentTitle,
      chunk.equipment,
      chunk.refrigerant,
      chunk.heading,
      chunk.content,
    ]
      .filter(Boolean)
      .join("\n");
    const kw = keywordScore(query, searchable);
    const vector =
      queryEmbedding && chunk.embedding ? cosine(queryEmbedding, chunk.embedding) : 0;
    const titleHits = keywordScore(query, chunk.documentTitle).hits.length;
    const documentationBoost = isDocumentationRequest(query) ? 0.3 : 0;
    const score =
      vector * 2.2 +
      kw.score * 0.35 +
      titleHits * 0.45 +
      documentationBoost;
    if (score <= 0) continue;
    scored.push({ ...chunk, score, keywordHits: kw.hits });
  }

  scored.sort((a, b) => b.score - a.score);
  const limit = opts.limit ?? 8;
  return scored.slice(0, limit).filter((c, _, arr) => c.score >= arr[0].score * 0.12 || c.keywordHits.length > 0);
}
