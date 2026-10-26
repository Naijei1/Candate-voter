import { Fragment, type ReactNode } from "react";
import { parseSafeMarkdown, type MdInline } from "@/lib/chat/markdown";

const HEADING = {
  1: "mt-3 text-base font-semibold tracking-tight text-ink",
  2: "mt-3 text-sm font-semibold tracking-tight text-ink",
  3: "mt-2 text-sm font-semibold text-ink",
} as const;

export function SafeMarkdown({ source }: { source: string }) {
  const blocks = parseSafeMarkdown(source);
  if (blocks.length === 0) {
    return <p className="text-sm leading-6 text-muted">No answer text was returned.</p>;
  }

  return (
    <div className="space-y-2 text-sm leading-6 text-ink">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const Tag = block.level === 1 ? "h3" : block.level === 2 ? "h4" : "h5";
          return (
            <Tag key={index} className={HEADING[block.level]}>
              <Inlines items={block.inlines} />
            </Tag>
          );
        }
        if (block.type === "ul" || block.type === "ol") {
          const Tag = block.type === "ul" ? "ul" : "ol";
          const listClass =
            block.type === "ul" ? "list-disc space-y-1 pl-5" : "list-decimal space-y-1 pl-5";
          return (
            <Tag key={index} className={listClass}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <Inlines items={item} />
                </li>
              ))}
            </Tag>
          );
        }
        if (block.type === "pre") {
          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-md bg-paper px-3 py-2 text-sm whitespace-pre-wrap text-ink"
            >
              {block.text}
            </pre>
          );
        }
        return (
          <p key={index}>
            <Inlines items={block.inlines} />
          </p>
        );
      })}
    </div>
  );
}

function Inlines({ items }: { items: MdInline[] }) {
  return (
    <>
      {items.map((item, index) => (
        <Fragment key={index}>{renderInline(item, index)}</Fragment>
      ))}
    </>
  );
}

function renderInline(item: MdInline, key: number): ReactNode {
  if (item.type === "text") return item.text;
  if (item.type === "strong") {
    return (
      <strong key={key} className="font-semibold">
        <Inlines items={item.children} />
      </strong>
    );
  }
  if (item.type === "em") {
    return (
      <em key={key}>
        <Inlines items={item.children} />
      </em>
    );
  }
  return (
    <a
      key={key}
      href={item.href}
      className="break-words text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {item.text}
    </a>
  );
}
