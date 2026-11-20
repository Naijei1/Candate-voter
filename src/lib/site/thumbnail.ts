export function thumbnail(src: string): string {
  return src.replace(/(\/photos\/ky\/)([^/]+)\.jpg$/, "$1sm/$2.webp");
}
