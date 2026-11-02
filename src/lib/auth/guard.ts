import { isAdminEmail } from "./admin";
import { currentUser } from "./session";

export async function adminActor(): Promise<{ email: string; sub: string } | null> {
  const user = await currentUser();
  if (!user || !isAdminEmail(user.email)) return null;
  return user;
}
