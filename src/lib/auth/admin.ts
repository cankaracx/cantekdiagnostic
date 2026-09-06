export const SUPER_ADMIN_USERNAME = "admin";

export function isSuperAdminUsername(value: unknown): boolean {
  return (
    typeof value === "string" &&
    value.trim().toLowerCase() === SUPER_ADMIN_USERNAME
  );
}
