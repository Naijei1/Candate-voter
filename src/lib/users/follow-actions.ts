import { changeAlertFollows } from "../alerts/subscriptions";
import { FOLLOW_LIMIT, isAlertFollow, parseFollowId, parseFollowType } from "./follows";
import { deleteFollow, listFollows, saveFollow, withFollowLock } from "./store";

export async function changeFollow(userId: string, body: Record<string, unknown> | null, remove: boolean): Promise<"ok" | "bad_request" | "follow_limit"> {
  const targetType = parseFollowType(body?.targetType);
  const targetId = parseFollowId(body?.targetId);
  if (!targetType || !targetId) return "bad_request";

  return withFollowLock(userId, async () => {
    if (!remove && isAlertFollow(targetType)) {
      const follows = (await listFollows(userId)).filter((follow) => isAlertFollow(follow.targetType));
      const alreadyFollows = follows.some((follow) => follow.targetType === targetType && follow.targetId === targetId);
      if (!alreadyFollows && follows.length >= FOLLOW_LIMIT) return "follow_limit";
    }
    await changeAlertFollows(userId, async () => {
      if (remove) await deleteFollow(userId, targetType, targetId);
      else await saveFollow({ userId, targetType, targetId, createdAt: new Date().toISOString() });
    });
    return "ok";
  });
}
