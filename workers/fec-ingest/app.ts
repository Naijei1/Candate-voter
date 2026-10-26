/**
 * SAM esbuild entry. The deployed handler is `workers/fec-ingest/app.handler`.
 * Local and scripted runs use `scripts/ingest.ts` and the same `runIngest`.
 */
export { handler } from "../../src/lib/ingest/handler";
