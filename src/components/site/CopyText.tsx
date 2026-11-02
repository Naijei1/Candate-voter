import { StatusMark } from "@/components/site/StatusMark";
import { AWAITING_CONTENT, publishedCopy } from "@/lib/content/copy";

export function CopyText({ text }: { text: string | null }) {
  const value = publishedCopy(text);
  if (!value) {
    return (
      <p>
        <StatusMark kind="awaiting" /> {AWAITING_CONTENT}
      </p>
    );
  }
  return <p>{value}</p>;
}
