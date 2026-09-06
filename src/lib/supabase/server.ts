import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfigured } from "@/lib/supabase/env";

export async function createServerSupabase() {
  if (!supabaseConfigured()) return null;
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* set from a Server Component */
          }
        },
      },
    },
  );
}

export type StaffRole = "technician" | "admin" | "super_admin";

export function roleFromJwt(appMetadata: unknown): StaffRole | null {
  if (!appMetadata || typeof appMetadata !== "object") return null;
  const role = (appMetadata as { role?: string }).role;
  if (role === "technician" || role === "admin" || role === "super_admin") {
    return role;
  }
  return null;
}
