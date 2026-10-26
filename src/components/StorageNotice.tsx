import type { ReactNode } from "react";

type StorageNoticeProps = {
  tone?: "empty" | "error";
  children: ReactNode;
};

export function StorageNotice({ tone = "empty", children }: StorageNoticeProps) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className="rounded-md border border-line bg-card px-3 py-2 text-sm leading-6 text-muted"
    >
      {children}
    </p>
  );
}
