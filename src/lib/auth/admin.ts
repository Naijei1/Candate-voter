export function adminEmails(env: Record<string, string | undefined> = process.env): Set<string> {
  const raw = env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.includes("@")),
  );
}

export function isAdminEmail(
  email: string | null | undefined,
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (!email) return false;
  return adminEmails(env).has(email.trim().toLowerCase());
}
