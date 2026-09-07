import { createServerSupabase, roleFromJwt, type StaffRole } from "@/lib/supabase/server";

export type StaffAuth = {
  userId: string;
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
    userId: data.user.id,
    role,
    email: data.user.email ?? null,
  };
}

export async function isStaffSession(): Promise<boolean> {
  return Boolean(await getStaffAuth());
}

export async function isAdminSession(): Promise<boolean> {
  const role = (await getStaffAuth())?.role;
  return role === "admin" || role === "super_admin";
}

export async function isSuperAdminSession(): Promise<boolean> {
  return (await getStaffAuth())?.role === "super_admin";
}
