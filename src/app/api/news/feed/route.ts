import { currentUser } from "@/lib/auth/session";
import { NEWS_CATEGORIES } from "@/content/pilot";
import { getNewsFeed, saveNewsFeed, type NewsFeed } from "@/lib/users/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED = new Set<string>(NEWS_CATEGORIES);

export async function GET(): Promise<Response> {
  const user = await currentUser();
  if (!user) return Response.json({ reason: "sign_in" }, { status: 401 });
  try {
    const feed = await getNewsFeed(user.sub);
    return Response.json({ feed });
  } catch (error) {
    console.error("news feed read failed:", error instanceof Error ? error.name : "Error");
    return Response.json({ reason: "unavailable" }, { status: 503 });
  }
}

export async function PUT(request: Request): Promise<Response> {
  const user = await currentUser();
  if (!user) return Response.json({ reason: "sign_in" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ reason: "bad_request" }, { status: 400 });
  }
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const feed = parseFeed(record);
  if (!feed) return Response.json({ reason: "bad_request" }, { status: 400 });
  try {
    await saveNewsFeed(user.sub, feed);
  } catch (error) {
    console.error("news feed write failed:", error instanceof Error ? error.name : "Error");
    return Response.json({ message: "Feed choices were not saved." }, { status: 503 });
  }
  return Response.json({ ok: true });
}

function parseFeed(record: Record<string, unknown> | null): NewsFeed | null {
  if (!record) return null;
  const states = Array.isArray(record.states)
    ? record.states.filter((value): value is string => typeof value === "string" && /^[A-Za-z]{2}$/.test(value)).map((value) => value.toUpperCase())
    : [];
  const categories = Array.isArray(record.categories)
    ? record.categories.filter((value): value is string => typeof value === "string" && ALLOWED.has(value))
    : [];
  return { states: [...new Set(states)].slice(0, 56), categories };
}
