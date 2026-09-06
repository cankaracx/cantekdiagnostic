import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { chunkPages, chunkText } from "@/lib/rag/chunk";
import { embedTexts } from "@/lib/rag/embed";
import { parseUpload } from "@/lib/rag/parse";
import { addChunks, loadLocalIndex, saveLocalIndex, upsertDocument } from "@/lib/rag/store-local";
import { createServiceSupabase } from "@/lib/supabase/env";
import type { ChunkRecord, DocumentRecord, Visibility } from "@/lib/rag/types";

export type IngestMeta = {
  title: string;
  language: string;
  equipment?: string;
  refrigerant?: string;
  visibility: Visibility;
  version?: string;
  filePath?: string;
};

export async function ingestParsedPages(
  pages: { page: number; text: string }[],
  meta: IngestMeta,
  database?: SupabaseClient | null,
): Promise<DocumentRecord> {
  const pieces = pages.length ? chunkPages(pages) : chunkText("");
  const embeddings = await embedTexts(pieces.map((p) => p.content));
  const index = loadLocalIndex();
  const doc = upsertDocument(index, meta);

  const chunks: ChunkRecord[] = pieces.map((piece, i) => ({
    id: randomUUID(),
    documentId: doc.id,
    content: piece.content,
    page: piece.page,
    heading: piece.heading,
    tokenCount: piece.tokenCount,
    embedding: embeddings[i] ?? null,
    visibility: meta.visibility,
    documentTitle: doc.title,
    equipment: meta.equipment,
    refrigerant: meta.refrigerant,
    language: meta.language,
  }));

  addChunks(index, chunks);
  saveLocalIndex(index);

  const supabase = database ?? createServiceSupabase();
  if (supabase) {
    const { error: documentError } = await supabase.from("documents").upsert({
      id: doc.id,
      title: doc.title,
      file_path: doc.filePath ?? null,
      language: doc.language,
      equipment: doc.equipment ?? null,
      refrigerant: doc.refrigerant ?? null,
      visibility: doc.visibility,
      version: doc.version ?? null,
    });
    if (documentError) throw documentError;

    const { error: deleteError } = await supabase
      .from("chunks")
      .delete()
      .eq("document_id", doc.id);
    if (deleteError) throw deleteError;

    if (chunks.length) {
      const { error: chunkError } = await supabase.from("chunks").insert(
        chunks.map((c) => ({
          id: c.id,
          document_id: c.documentId,
          content: c.content,
          page: c.page,
          heading: c.heading,
          token_count: c.tokenCount,
          embedding: c.embedding,
        })),
      );
      if (chunkError) throw chunkError;
    }
  }

  return doc;
}

export async function ingestFile(
  filename: string,
  buffer: Buffer,
  meta: IngestMeta,
  database?: SupabaseClient | null,
) {
  const pages = await parseUpload(filename, buffer);
  return ingestParsedPages(
    pages,
    { ...meta, filePath: meta.filePath ?? filename },
    database,
  );
}
