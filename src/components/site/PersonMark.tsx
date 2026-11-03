export function PersonMark({ name, photo }: { name: string; photo: string | null }) {
  if (photo) {
    return <img className="person-photo" src={photo} alt="" width={64} height={64} />;
  }
  return (
    <span className="person-initials" aria-hidden>
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
