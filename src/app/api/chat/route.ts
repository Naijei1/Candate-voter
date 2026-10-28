import { liveChatDeps, postChat } from "@/lib/chat/handler";
import { createRateLimiter } from "@/lib/chat/rate-limit";
import { rateLimitSettings } from "@/lib/chat/config";
import { warmTableReads } from "@/lib/data/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const limiter = createRateLimiter(rateLimitSettings(process.env));

warmTableReads();

export function POST(request: Request): Promise<Response> {
  warmTableReads();
  return postChat(request, {
    ...liveChatDeps(),
    rateLimiter: limiter,
  });
}
