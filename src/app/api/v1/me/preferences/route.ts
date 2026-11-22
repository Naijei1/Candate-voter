import { json, unauthorized } from "@/lib/api/http";
import { readObject } from "@/lib/api/input";
import { meUser } from "@/lib/api/me-auth";
import { versioned, type Preferences } from "@/lib/api/v1-types";
import { kyPlace, validIssues } from "@/lib/users/preferences";
import { getPreferences, savePreferences } from "@/lib/users/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const user = await meUser(request);
  if (!user) return unauthorized();
  try {
    return json(versioned({ preferences: await getPreferences(user.sub) }));
  } catch {
    return json({ error: "unavailable" }, 503);
  }
}

export async function PUT(request: Request): Promise<Response> {
  const user = await meUser(request);
  if (!user) return unauthorized();
  const body = await readObject(request);
  if (!body) return json({ error: "bad_request" }, 400);
  const values: Partial<Preferences> = {};
  if ("geography" in body) {
    values.geography = kyPlace(body.geography);
    if (!values.geography && body.geography !== null) return json({ error: "bad_request" }, 400);
  }
  if ("issues" in body) {
    if (!Array.isArray(body.issues) || body.issues.length > 100) return json({ error: "bad_request" }, 400);
    values.issues = validIssues(body.issues);
  }
  if (!Object.keys(values).length) return json({ error: "bad_request" }, 400);
  try {
    return json(versioned({ preferences: await savePreferences(user.sub, values, body.seedIssues === true) }));
  } catch {
    return json({ error: "unavailable" }, 503);
  }
}
