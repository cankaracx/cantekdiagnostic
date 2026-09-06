import { createServerSupabase, roleFromJwt, type StaffRole } from "@/lib/supabase/server";

export type StaffAuth = {
  role: StaffRole;
  email: string | null;
};

export async function getStaffAuth(): Promise<StaffAuth | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const role = roleFromJwt(data.user.app_metadata);
  if (!role) return null;

  return {
    role,
    email: data.user.email ?? null,
  };
}

export async function isStaffSession(): Promise<boolean> {
  return Boolean(await getStaffAuth());
}

export async function isAdminSession(): Promise<boolean> {
  return (await getStaffAuth())?.role === "admin";
}
