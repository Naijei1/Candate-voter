export function isAdmin(user: { groups?: readonly string[] } | null): boolean {
  return user?.groups?.includes("admin") ?? false;
}
