import OpenAI from "openai";
import { readProviderApiKey } from "@/lib/chat/providers";

// Match the pgvector column dimension so the no-OpenAI fallback can be
// persisted and queried in Supabase without a dimension mismatch.
const LOCAL_DIM = 1536;
const EMBEDDING_BATCH_SIZE = 64;
const EMBEDDING_TIMEOUT_MS = 20_000;

export function embeddingModel(): string {
  return process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-large";
}

export function embeddingDimensions(): number {
  return Number(process.env.OPENAI_EMBEDDING_DIMENSIONS ?? 1536);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/** Deterministic fallback so hybrid search works without an API key. */
export function localEmbedding(text: string): number[] {
  const vec = new Array<number>(LOCAL_DIM).fill(0);
  for (const token of tokenize(text)) {
    let h = 2166136261;
    for (let i = 0; i < token.length; i++) {
      h ^= token.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    vec[(h >>> 0) % LOCAL_DIM] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  const apiKey = await readProviderApiKey("openai");
  if (!apiKey) {
    return texts.map(localEmbedding);
  }

  const client = new OpenAI({
    apiKey,
    maxRetries: 0,
    timeout: EMBEDDING_TIMEOUT_MS,
  });
  const embeddings: number[][] = [];

  for (
    let offset = 0;
    offset < texts.length;
    offset += EMBEDDING_BATCH_SIZE
  ) {
    const batch = texts.slice(offset, offset + EMBEDDING_BATCH_SIZE);
    try {
      const response = await client.embeddings.create({
        model: embeddingModel(),
        input: batch,
        dimensions: embeddingDimensions(),
      });
      embeddings.push(
        ...response.data
          .slice()
          .sort((a, b) => a.index - b.index)
          .map((row) => row.embedding),
      );
    } catch {
      // Keep retrieval available if this bounded provider request fails.
      embeddings.push(...batch.map(localEmbedding));
    }
  }

  return embeddings;
}

export function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (!n) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
}
