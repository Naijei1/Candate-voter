/** Safe markdown subset for Ask answers. Rendered as React nodes, never HTML. */

export type MdInline =
  | { type: "text"; text: string }
  | { type: "strong"; children: MdInline[] }
  | { type: "em"; children: MdInline[] }
  | { type: "link"; text: string; href: string };

export type MdBlock =
  | { type: "heading"; level: 1 | 2 | 3; inlines: MdInline[] }
  | { type: "paragraph"; inlines: MdInline[] }
  | { type: "ul"; items: MdInline[][] }
  | { type: "ol"; items: MdInline[][] }
  | { type: "pre"; text: string };

const HTTPS_LINK = /^https:\/\/[^\s)]+$/i;

export function parseSafeMarkdown(source: string): MdBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: MdBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (line.trim() === "") {
      index += 1;
      continue;
    }

    if (line.trim().startsWith("```")) {
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? "").trim().startsWith("```")) {
        body.push(lines[index] ?? "");
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: "pre", text: body.join("\n") });
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const marks = heading[1] ?? "#";
      const level = Math.min(marks.length, 3) as 1 | 2 | 3;
      blocks.push({
        type: "heading",
        level,
        inlines: parseInlines(heading[2] ?? ""),
      });
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: MdInline[][] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index] ?? "")) {
        items.push(parseInlines((lines[index] ?? "").replace(/^[-*]\s+/, "")));
        index += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: MdInline[][] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index] ?? "")) {
        items.push(parseInlines((lines[index] ?? "").replace(/^\d+\.\s+/, "")));
        index += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && isParagraphLine(lines[index] ?? "")) {
      paragraph.push((lines[index] ?? "").trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", inlines: parseInlines(paragraph.join(" ")) });
  }

  return blocks;
}

function isParagraphLine(line: string): boolean {
  if (line.trim() === "") return false;
  if (line.trim().startsWith("```")) return false;
  if (/^(#{1,6})\s+/.test(line)) return false;
  if (/^[-*]\s+/.test(line)) return false;
  if (/^\d+\.\s+/.test(line)) return false;
  return true;
}

export function parseInlines(source: string): MdInline[] {
  const inlines: MdInline[] = [];
  let buffer = "";
  let index = 0;

  const flush = () => {
    if (buffer.length === 0) return;
    inlines.push({ type: "text", text: buffer });
    buffer = "";
  };

  while (index < source.length) {
    const rest = source.slice(index);
    if (rest.startsWith("**")) {
      const close = source.indexOf("**", index + 2);
      if (close !== -1) {
        flush();
        inlines.push({
          type: "strong",
          children: parseInlines(source.slice(index + 2, close)),
        });
        index = close + 2;
        continue;
      }
    }

    if (source[index] === "*" && source[index + 1] !== "*") {
      const close = source.indexOf("*", index + 1);
      const inner = close === -1 ? "" : source.slice(index + 1, close);
      if (close !== -1 && inner.length > 0 && !inner.startsWith(" ") && !inner.endsWith(" ") && !inner.includes("*")) {
        flush();
        inlines.push({
          type: "em",
          children: parseInlines(inner),
        });
        index = close + 1;
        continue;
      }
    }

    if (source[index] === "[" && source[index - 1] !== "!") {
      const link = readLink(source, index);
      if (link) {
        flush();
        inlines.push({ type: "link", text: link.text, href: link.href });
        index = link.next;
        continue;
      }
    }

    buffer += source[index];
    index += 1;
  }

  flush();
  return inlines;
}

function readLink(
  source: string,
  start: number,
): { text: string; href: string; next: number } | null {
  const endLabel = source.indexOf("]", start + 1);
  if (endLabel === -1 || source[endLabel + 1] !== "(") return null;
  const endHref = source.indexOf(")", endLabel + 2);
  if (endHref === -1) return null;
  const text = source.slice(start + 1, endLabel);
  const href = source.slice(endLabel + 2, endHref).trim();
  if (!text || !HTTPS_LINK.test(href)) return null;
  return { text, href, next: endHref + 1 };
}
