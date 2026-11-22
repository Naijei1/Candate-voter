import { canDispatch, dispatchAlerts } from "@/lib/alerts/dispatch";
import { alertsTopic } from "@/lib/alerts/sns";
import { json, unauthorized } from "@/lib/api/http";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  if (!canDispatch(request)) return unauthorized();
  const topic = alertsTopic();
  if (!topic) return json({ error: "unavailable" }, 503);
  try {
    const { published, failed } = await dispatchAlerts(topic);
    return json({ published }, failed ? 503 : 200);
  } catch (error) {
    console.error("alert dispatch failed", error instanceof Error ? error.name : "Error");
    return json({ error: "unavailable" }, 503);
  }
}
