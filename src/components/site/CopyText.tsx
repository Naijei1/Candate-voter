import { publishedCopy } from "@/lib/content/copy";

export function CopyText({ text }: { text: string | null }) {
  const value = publishedCopy(text);
  if (!value) return null;
  return <p>{value}</p>;
}
