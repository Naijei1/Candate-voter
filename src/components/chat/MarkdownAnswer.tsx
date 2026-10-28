"use client";

// Classic JSX runtime for `node --import tsx --test`. Next compiles this with the automatic runtime.
import React, { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { basePathFromEnv } from "@/lib/base-path";
import { presentAskMarkdown } from "@/lib/chat/polish";
import { parseMarkdown, type InlineNode } from "@/lib/chat/ui";

export function MarkdownAnswer({ markdown }: { markdown: string }) {
  const origin = useClientOrigin();
  const blocks = parseMarkdown(presentAskMarkdown(markdown), { origin, basePath: basePathFromEnv() });
  if (blocks.length === 0) return null;

  return (
    <div className="space-y-2">
      {blocks.map((block, index) => {
        if (block.type === "h") {
          const Tag = block.level === 1 ? "h2" : block.level === 2 ? "h3" : "h4";
          return (
            <Tag key={index} className="font-semibold tracking-tight">
              <Inlines nodes={block.inlines} />
            </Tag>
          );
        }
        if (block.type === "ul" || block.type === "ol") {
          return <AnswerList key={index} type={block.type} items={block.items} />;
        }
        return (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                <Inlines nodes={line} />
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

/** Long count dumps stay a short list until the visitor asks for the rest. */
export const ASK_LIST_PREVIEW = 6;

function AnswerList({ type, items }: { type: "ul" | "ol"; items: InlineNode[][] }) {
  const [open, setOpen] = useState(false);
  const total = items.length;
  const shown = open || total <= ASK_LIST_PREVIEW ? items : items.slice(0, ASK_LIST_PREVIEW);
  const Tag = type;
  return (
    <div>
      <Tag className={`${type === "ol" ? "list-decimal" : "list-disc"} space-y-1 pl-5`}>
        {shown.map((item, itemIndex) => (
          <li key={itemIndex}>
            <Inlines nodes={item} />
          </li>
        ))}
      </Tag>
      {total > ASK_LIST_PREVIEW ? (
        <button
          type="button"
          className="mt-2 text-sm font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Show less" : `Show all ${total}`}
        </button>
      ) : null}
    </div>
  );
}

function Inlines({ nodes }: { nodes: InlineNode[] }) {
  return (
    <>
      {nodes.map((node, index) => (
        <Inline key={index} node={node} />
      ))}
    </>
  );
}

function Inline({ node }: { node: InlineNode }): ReactNode {
  if (node.type === "text") return node.text;
  if (node.type === "bold") {
    return (
      <strong className="font-semibold">
        <Inlines nodes={node.children} />
      </strong>
    );
  }
  const className =
    "underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
  if (node.external) {
    return (
      <a href={node.href} className={className} target="_blank" rel="noopener noreferrer">
        <Inlines nodes={node.children} />
      </a>
    );
  }
  return (
    <Link href={node.href} className={className}>
      <Inlines nodes={node.children} />
    </Link>
  );
}

function useClientOrigin(): string | undefined {
  const [origin, setOrigin] = useState<string | undefined>(undefined);
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  return origin;
}
