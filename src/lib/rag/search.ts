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
    const { data: docs } = await supabase
      .from("documents")
      .select("id, title, visibility, equipment, refrigerant, language");
    const { data: rows } = await supabase
      .from("chunks")
      .select("id, document_id, content, page, heading, token_count, embedding");

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
