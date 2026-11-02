const LABEL = {
  sample: "Sample",
  preview: "Preview",
  awaiting: "Awaiting",
  gap: "Not covered",
  working: "",
} as const;

const HINT = {
  sample: "Demonstration only. Not a live record.",
  preview: "Shown on this page. Not saved or sent.",
  awaiting: "Waiting for approved material.",
  gap: "No source is connected.",
  working: "",
} as const;

export function StatusMark({
  kind,
  hint,
}: {
  kind: keyof typeof LABEL;
  hint?: string;
}) {
  if (kind === "working") return null;
  return (
    <span className="status-mark" title={hint ?? HINT[kind]}>
      {LABEL[kind]}
    </span>
  );
}
