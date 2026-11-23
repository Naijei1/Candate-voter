import { isAdmin } from "@/lib/auth/admin";
import { currentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Private session probe. Public pages stay cacheable because they do not read cookies. */
export async function GET(): Promise<Response> {
  const user = await currentUser();
  const body = user
    ? { signedIn: true, email: user.email, admin: isAdmin(user) }
    : { signedIn: false, email: null, admin: false };
  return Response.json(body, {
    headers: { "cache-control": "private, no-store" },
  });
}
