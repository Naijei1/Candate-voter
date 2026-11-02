import type { Metadata } from "next";
import Link from "next/link";
import { isAdminEmail } from "@/lib/auth/admin";
import { currentUser } from "@/lib/auth/session";
import { createDynamoRepository } from "@/lib/data/repository";

export const metadata: Metadata = { title: "Review queue" };
export const dynamic = "force-dynamic";

export default async function CorrectionsQueuePage() {
  const user = await currentUser();
  if (!user) {
    return (
      <article className="wrap">
        <h1>Review queue</h1>
        <p>Sign in with an admin account to see reports.</p>
        <p>
          <Link className="btn btn-cta" href="/sign-in">
            Sign in
          </Link>
        </p>
      </article>
    );
  }
  if (!isAdminEmail(user.email)) {
    return (
      <article className="wrap">
        <h1>Review queue</h1>
        <p>This list is limited to admin accounts.</p>
      </article>
    );
  }

  try {
    const items = await createDynamoRepository().listCorrections(50);
    return (
      <article className="wrap">
        <h1>Review queue</h1>
        <p>Reports saved from race pages. They are not published.</p>
        {items.length === 0 ? (
          <p>No reports yet.</p>
        ) : (
          <ul className="plain-list">
            {items.map((item) => (
              <li key={item.correctionId}>
                <p>{item.note}</p>
                <p className="hint">
                  {item.createdAt}
                  {item.raceId ? ` · ${item.raceId}` : ""}
                  {item.candidateId ? ` · ${item.candidateId}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </article>
    );
  } catch (error) {
    console.error("corrections list failed:", error instanceof Error ? error.name : "Error");
    return (
      <article className="wrap">
        <h1>Review queue</h1>
        <p className="notice notice-error" role="alert">
          Could not load reports.
        </p>
      </article>
    );
  }
}
