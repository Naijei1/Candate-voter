import { liveChatDeps, postChat } from "@/lib/chat/handler";
import { createRateLimiter } from "@/lib/chat/rate-limit";
import { rateLimitSettings } from "@/lib/chat/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const limiter = createRateLimiter(rateLimitSettings(process.env));

export function POST(request: Request): Promise<Response> {
  return postChat(request, {
    ...liveChatDeps(),
    rateLimiter: limiter,
  });
}
