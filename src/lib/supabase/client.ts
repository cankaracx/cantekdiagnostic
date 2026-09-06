import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfigured } from "@/lib/supabase/env";

export function createBrowserSupabase() {
  if (!supabaseConfigured()) return null;
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
