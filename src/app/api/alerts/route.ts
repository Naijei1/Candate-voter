import { currentUser } from "@/lib/auth/session";
import {
  ALERT_CATEGORIES,
  ALERT_DELIVERY_STATUS,
  type AlertCategory,
  type AlertDelivery,
  parseQuietHours,
} from "@/lib/users/alerts";
import { defaultPreferences, getProfile, saveProfile } from "@/lib/users/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CATEGORY = new Set<string>(ALERT_CATEGORIES);

export async function GET(): Promise<Response> {
  const user = await currentUser();
  if (!user) return Response.json({ reason: "sign_in" }, { status: 401 });
  try {
    const profile = await getProfile(user.sub);
    return Response.json({
      email: user.email,
      preferences: profile ?? { ...defaultPreferences(), userId: user.sub, email: user.email },
      deliveryStatus: ALERT_DELIVERY_STATUS,
    });
  } catch (error) {
    console.error("load alerts failed:", error instanceof Error ? error.name : "Error");
    return Response.json({ reason: "unavailable" }, { status: 503 });
  }
}

export async function PUT(request: Request): Promise<Response> {
  const user = await currentUser();
  if (!user) return Response.json({ reason: "sign_in" }, { status: 401 });
  const body = await readBody(request);
  if (!body) return Response.json({ reason: "bad_request" }, { status: 400 });
  const categories = Array.isArray(body.categories)
    ? body.categories.filter((value): value is AlertCategory => typeof value === "string" && CATEGORY.has(value))
    : [];
  if (categories.length === 0) {
    return Response.json({ reason: "bad_request", message: "Choose at least one type." }, { status: 400 });
  }
  const delivery = readDelivery(body.delivery);
  if (!delivery) return Response.json({ reason: "bad_request", message: "Choose a digest." }, { status: 400 });
  const quiet = parseQuietHours(body.quietStart, body.quietEnd);
  if (!quiet.ok) {
    return Response.json({ reason: "bad_request", message: "Quiet hours use 24-hour times, or leave both empty." }, { status: 400 });
  }
  try {
    await saveProfile({
      userId: user.sub,
      email: user.email,
      categories,
      delivery,
      quietStart: quiet.value?.start ?? null,
      quietEnd: quiet.value?.end ?? null,
      deliveryStatus: ALERT_DELIVERY_STATUS,
    });
  } catch (error) {
    console.error("save alerts failed:", error instanceof Error ? error.name : "Error");
    return Response.json(
      { reason: "unavailable", message: "Not saved. This server cannot write alert preferences yet." },
      { status: 503 },
    );
  }
  return Response.json({ ok: true, deliveryStatus: ALERT_DELIVERY_STATUS });
}

function readDelivery(value: unknown): AlertDelivery | null {
  if (value === "immediate" || value === "daily" || value === "weekly") return value;
  return null;
}

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}
