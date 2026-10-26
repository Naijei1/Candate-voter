/** Race ids, FEC candidate ids, and `file-<n>` stand-ins fit this token. */
const RESOURCE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function isResourceId(value: string): boolean {
  return RESOURCE_ID.test(value);
}
