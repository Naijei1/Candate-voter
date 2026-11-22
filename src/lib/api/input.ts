export async function readObject(request: Request): Promise<Record<string, unknown> | null> {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return null;
  const data: unknown = await request.json().catch(() => null);
  return data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : null;
}
