import type { SupabaseClient } from "@supabase/supabase-js";
import { embedTexts } from "@/lib/rag/embed";
import { hybridRank } from "@/lib/rag/retrieve";
import { loadLocalIndex } from "@/lib/rag/store-local";
import type { ChunkRecord, RetrievedChunk } from "@/lib/rag/types";

export async function searchManuals(
  query: string,
  opts: {
    includeInternal: boolean;
    limit?: number;
    database?: SupabaseClient | null;
  },
): Promise<RetrievedChunk[]> {
  const [queryEmbedding] = await embedTexts([query]);
  const supabase = opts.database;

  if (supabase) {
    const { data: matches, error: searchError } = await supabase.rpc(
      "search_manual_chunks",
      {
        query_embedding: queryEmbedding,
        query_text: query.slice(0, 4_000),
        include_internal: opts.includeInternal,
        match_count: opts.limit ?? 8,
      },
    );

    if (!searchError && Array.isArray(matches)) {
      return matches.map((row) => ({
        id: row.id,
        documentId: row.document_id,
        content: row.content,
        page: row.page,
        heading: row.heading,
        tokenCount: row.token_count ?? 0,
        embedding: null,
        visibility: row.visibility,
        documentTitle: row.document_title,
        equipment: row.equipment ?? undefined,
        refrigerant: row.refrigerant ?? undefined,
        language: row.language,
        score: Number(row.score ?? 0),
        keywordHits: [],
      }));
    }

    // Backward-compatible path for deployments where the search RPC has not
    // been applied yet. Production uses the bounded database-side RPC above.
    const [{ data: docs }, { data: rows }] = await Promise.all([
      supabase
        .from("documents")
        .select("id, title, visibility, equipment, refrigerant, language")
        .limit(1_000),
      supabase
        .from("chunks")
        .select("id, document_id, content, page, heading, token_count, embedding")
        .limit(10_000),
    ]);

    if (rows?.length && docs?.length) {
      const docMap = new Map(docs.map((d) => [d.id, d]));
      const chunks: ChunkRecord[] = rows.flatMap((row) => {
        const doc = docMap.get(row.document_id);
        if (!doc) return [];
        return [
          {
            id: row.id,
            documentId: row.document_id,
            content: row.content,
            page: row.page,
            heading: row.heading,
            tokenCount: row.token_count ?? 0,
            embedding: (row.embedding as number[] | null) ?? null,
            visibility: doc.visibility,
            documentTitle: doc.title,
            equipment: doc.equipment ?? undefined,
            refrigerant: doc.refrigerant ?? undefined,
            language: doc.language,
          },
        ];
      });
      return hybridRank(query, queryEmbedding, chunks, opts);
    }
  }

  const index = loadLocalIndex();
  return hybridRank(query, queryEmbedding, index.chunks, opts);
}
