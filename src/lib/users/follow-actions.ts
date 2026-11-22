import { changeAlertFollows } from "../alerts/subscriptions";
import { parseFollowId, parseFollowType } from "./follows";
import { deleteFollow, saveFollow } from "./store";

export async function changeFollow(userId: string, body: Record<string, unknown> | null, remove: boolean): Promise<boolean> {
  const targetType = parseFollowType(body?.targetType);
  const targetId = parseFollowId(body?.targetId);
  if (!targetType || !targetId) return false;
  await changeAlertFollows(userId, async () => {
    if (remove) await deleteFollow(userId, targetType, targetId);
    else await saveFollow({ userId, targetType, targetId, createdAt: new Date().toISOString() });
  });
  return true;
}
