import { liveChatDeps, postChat } from "@/lib/chat/handler";
import { warmTableReads } from "@/lib/data/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

warmTableReads();

export function POST(request: Request): Promise<Response> {
  warmTableReads();
  return postChat(request, liveChatDeps());
}
