import { enabledStates, statePath } from "../states";

const STATE_PATHS = new Set(enabledStates().map(statePath));

export function followReturnPath(value: unknown): string | null {
  return typeof value === "string" && (STATE_PATHS.has(value) || /^\/(?:races|candidates)\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value))
    ? value
    : null;
}
