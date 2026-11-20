import { isAdmin } from "./admin";
import { currentUser } from "./session";

export async function adminActor(): Promise<{ email: string; sub: string } | null> {
  const user = await currentUser();
  if (!user || !isAdmin(user)) return null;
  return user;
}
