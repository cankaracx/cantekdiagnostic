import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth/staff";
import { loadLocalIndex } from "@/lib/rag/store-local";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "admin_only" }, { status: 403 });
  }
  const supabase = await createServerSupabase();

  if (supabase) {
    const { data, error } = await supabase
      .from("documents")
      .select(
        "id, title, visibility, language, equipment, version, created_at, updated_at, chunks(count)",
      )
      .order("updated_at", { ascending: false });
    if (error) {
      return NextResponse.json({ error: "documents_unavailable" }, { status: 503 });
    }
    return NextResponse.json({
      documents: (data ?? []).map((document) => ({
        id: document.id,
        title: document.title,
        visibility: document.visibility,
        language: document.language,
        equipment: document.equipment,
        version: document.version,
        createdAt: document.created_at,
        updatedAt: document.updated_at,
        chunkCount: document.chunks?.[0]?.count ?? 0,
      })),
    });
  }

  const index = loadLocalIndex();
  return NextResponse.json({
    documents: index.documents.map((document) => ({
      ...document,
      chunkCount: index.chunks.filter(
        (chunk) => chunk.documentId === document.id,
      ).length,
    })),
  });
}
