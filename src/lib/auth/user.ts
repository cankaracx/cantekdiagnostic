export type AccessChoice = "account" | "guest" | null;

export function shouldShowFirstVisitGate(
  authenticated: boolean,
  choice: AccessChoice,
): boolean {
  if (authenticated) return false;
  return choice !== "guest";
}

export function isVerifiedEmailUser(
  user: { email_confirmed_at?: string | null } | null | undefined,
): boolean {
  return Boolean(user?.email_confirmed_at);
}
