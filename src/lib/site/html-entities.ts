import named from "../../../data/html-character-references.json";

const entities: Readonly<Record<string, string>> = named.entities;

// HTML's numeric reference replacements for the Windows-1252 control range.
const legacy = Array.from("€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008DŽ\u008F\u0090‘’“”•–—˜™š›œ\u009DžŸ");

/** Decode HTML character references in plain text. The result is text, never HTML. */
export function decodeHtmlEntities(text: string): string {
  return text.replace(/&(?:#(?:[xX][\da-fA-F]+|\d+);?|[A-Za-z][A-Za-z\d]{0,30};?)/g, (match) => {
    if (match.startsWith("&#")) {
      const hex = /^&#x/i.test(match);
      const code = Number.parseInt(match.slice(hex ? 3 : 2), hex ? 16 : 10);
      if (code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return "\uFFFD";
      return legacy[code - 0x80] ?? String.fromCodePoint(code);
    }
    const name = match.slice(1);
    for (let length = name.length; length > 0; length -= 1) {
      const prefix = name.slice(0, length);
      if (Object.hasOwn(entities, prefix)) return entities[prefix] + name.slice(length);
    }
    return match;
  });
}
