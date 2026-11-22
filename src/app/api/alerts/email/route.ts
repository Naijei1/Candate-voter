import { setEmailAlerts } from "@/lib/alerts/subscriptions";
import { alertsTopic } from "@/lib/alerts/sns";
import { json, unauthorized } from "@/lib/api/http";
import { readObject } from "@/lib/api/input";
import { originFromRequest } from "@/lib/api/public-origin";
import { currentUser } from "@/lib/auth/session";

export async function PUT(request: Request): Promise<Response> {
  if (request.headers.get("origin") !== originFromRequest(request)) return unauthorized();
  const user = await currentUser();
  if (!user) return unauthorized();
  const body = await readObject(request);
  if (typeof body?.enabled !== "boolean") return json({ error: "bad_request" }, 400);
  if (body.enabled && !user.emailVerified) return json({ error: "verify_email" }, 403);
  const topic = alertsTopic();
  if (!topic) return json({ error: "unavailable" }, 503);
  try {
    await setEmailAlerts(user, body.enabled, topic);
    return json({ enabled: body.enabled });
  } catch (error) {
    console.error("email alert update failed", error instanceof Error ? error.name : "Error");
    return json({ error: "unavailable" }, 503);
  }
}
