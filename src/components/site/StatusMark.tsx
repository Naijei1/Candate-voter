export function StatusMark({
  kind,
}: {
  kind: "sample" | "preview" | "awaiting" | "working";
}) {
  if (kind === "working") return null;
  const label =
    kind === "sample" ? "Sample" : kind === "preview" ? "Preview" : "Awaiting content";
  return <span className="status-mark">{label}</span>;
}
