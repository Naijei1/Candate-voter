import { createDynamoRepository } from "@/lib/data/repository";
import { postCorrection } from "@/lib/corrections";
import { createCorrectionLimits } from "@/lib/limits/dynamo-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const limits = createCorrectionLimits();

export function POST(request: Request): Promise<Response> {
  return postCorrection(request, {
    ...limits,
    save: (correction) => createDynamoRepository().saveCorrection(correction),
  });
}
