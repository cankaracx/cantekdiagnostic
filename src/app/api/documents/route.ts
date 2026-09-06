import { NextResponse } from "next/server";
import { isStaffSession } from "@/lib/auth/staff";
import { loadLocalIndex } from "@/lib/rag/store-local";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const staff = await isStaffSession();
  const supabase = await createServerSupabase();

  if (supabase) {
    const { data, error } = await supabase
      .from("documents")
      .select("id, title, visibility, language, equipment, version")
      .order("updated_at", { ascending: false });
    if (error) {
      return NextResponse.json({ error: "documents_unavailable" }, { status: 503 });
    }
    return NextResponse.json({ documents: data ?? [] });
  }

  const index = loadLocalIndex();
  const documents = staff
    ? index.documents
    : index.documents.filter((d) => d.visibility === "repair");
  return NextResponse.json({ documents });
}
