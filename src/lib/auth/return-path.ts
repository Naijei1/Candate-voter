export function followReturnPath(value: unknown): string | null {
  return typeof value === "string" && (value === "/states/ky" || /^\/(?:races|candidates)\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value))
    ? value
    : null;
}
