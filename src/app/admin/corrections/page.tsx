import type { Metadata } from "next";
import Link from "next/link";
import { AdminDenied } from "@/components/admin/AdminDenied";
import { ReviewList } from "@/components/admin/ReviewList";
import { adminActor } from "@/lib/auth/guard";
import { createDynamoRepository } from "@/lib/data/repository";
import { currentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Review queue" };
export const dynamic = "force-dynamic";

export default async function CorrectionsQueuePage() {
  const user = await currentUser();
  const admin = await adminActor();
  if (!admin) return <AdminDenied title="Review queue" signedIn={!!user} />;
  try {
    const items = await createDynamoRepository().listCorrections(50);
    return (
      <article className="wrap">
        <p>
          <Link href="/admin">Admin</Link>
        </p>
        <h1>Review queue</h1>
        <p>new, reviewing, fixed, or rejected. Reports are not published on the race page.</p>
        <ReviewList items={items} />
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
