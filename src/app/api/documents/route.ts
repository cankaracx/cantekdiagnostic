import { NextResponse } from "next/server";
import { isStaffSession } from "@/lib/auth/staff";
import { loadLocalIndex } from "@/lib/rag/store-local";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const staff = await isStaffSession();
  const supabase = await createServerSupabase();

  if (supabase) {
    const [{ data, error }, { data: chunkRows }] = await Promise.all([
      supabase
        .from("documents")
        .select("id, title, visibility, language, equipment, version")
        .order("updated_at", { ascending: false }),
      supabase.from("chunks").select("document_id"),
    ]);
    if (error) {
      return NextResponse.json({ error: "documents_unavailable" }, { status: 503 });
    }
    const counts = new Map<string, number>();
    for (const row of chunkRows ?? []) {
      counts.set(row.document_id, (counts.get(row.document_id) ?? 0) + 1);
    }
    return NextResponse.json({
      documents: (data ?? []).map((document) => ({
        ...document,
        chunkCount: counts.get(document.id) ?? 0,
      })),
    });
  }

  const index = loadLocalIndex();
  const documents = staff
    ? index.documents
    : index.documents.filter((d) => d.visibility === "repair");
  return NextResponse.json({
    documents: documents.map((document) => ({
      ...document,
      chunkCount: index.chunks.filter(
        (chunk) => chunk.documentId === document.id,
      ).length,
    })),
  });
}
