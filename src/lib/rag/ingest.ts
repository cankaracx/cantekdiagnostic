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

export type IngestResult = DocumentRecord & {
  chunkCount: number;
  pageCount: number;
  characterCount: number;
};

export async function ingestParsedPages(
  pages: { page: number; text: string }[],
  meta: IngestMeta,
  database?: SupabaseClient | null,
): Promise<IngestResult> {
  const usablePages = pages
    .map((page) => ({ ...page, text: page.text.trim() }))
    .filter((page) => page.text.length > 0);
  const pieces = usablePages.length ? chunkPages(usablePages) : chunkText("");
  if (!pieces.length) {
    throw new Error("no_extractable_text");
  }

  const embeddings = await embedTexts(pieces.map((p) => p.content));
  const supabase = database ?? createServiceSupabase();
  const index = loadLocalIndex();
  let existingId: string | undefined;

  if (supabase && meta.filePath) {
    const { data: existing, error: lookupError } = await supabase
      .from("documents")
      .select("id")
      .eq("file_path", meta.filePath)
      .eq("title", meta.title)
      .maybeSingle();
    if (lookupError) throw lookupError;
    existingId = existing?.id;
  }

  const doc = upsertDocument(index, { ...meta, id: existingId });

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

    // Supabase is the source of truth in production; a failed local cache
    // write must not make an otherwise successful indexing request fail.
    try {
      saveLocalIndex(index);
    } catch {
      // The cache is optional when the database is available.
    }
  } else {
    saveLocalIndex(index);
  }

  return {
    ...doc,
    chunkCount: chunks.length,
    pageCount: usablePages.length,
    characterCount: usablePages.reduce((sum, page) => sum + page.text.length, 0),
  };
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
