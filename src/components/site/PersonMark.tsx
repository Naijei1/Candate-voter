export function partyMark(party: string): { letter: string; tone: "rep" | "dem" | "lib" | "ind" | "oth" } {
  if (/republican/i.test(party)) return { letter: "R", tone: "rep" };
  if (/democrat/i.test(party)) return { letter: "D", tone: "dem" };
  if (/libertarian/i.test(party)) return { letter: "L", tone: "lib" };
  if (/independent|kentucky/i.test(party)) return { letter: "I", tone: "ind" };
  if (/write-in/i.test(party)) return { letter: "W", tone: "oth" };
  return { letter: "·", tone: "oth" };
}

export function PersonMark({
  name,
  photo,
  party = "",
  size = "md",
}: {
  name: string;
  photo: string | null;
  party?: string;
  size?: "sm" | "md" | "lg";
}) {
  const mark = partyMark(party);
  const px = size === "lg" ? 160 : size === "sm" ? 72 : 96;
  if (photo) {
    return <img className={`person-photo ${size}`} src={photo} alt="" width={px} height={px} />;
  }
  return (
    <span className={`person-initials ${mark.tone} ${size}`} aria-hidden>
      {initials(name)}
    </span>
  );
}

function initials(name: string): string {
  const parts = name.replace(/["“”]/g, "").split(/\s+/).filter((part) => /^[A-Za-z]/.test(part));
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return `${first}${last}`.toUpperCase();
}
