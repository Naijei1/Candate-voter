import type { Metadata } from "next";
import Link from "next/link";
import { AdminDenied } from "@/components/admin/AdminDenied";
import { CheckForm } from "@/components/admin/CheckForm";
import { adminActor } from "@/lib/auth/guard";
import { currentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Last checked" };
export const dynamic = "force-dynamic";

export default async function ChecksAdminPage() {
  const user = await currentUser();
  const admin = await adminActor();
  if (!admin) return <AdminDenied title="Last checked" signedIn={!!user} />;
  return (
    <article className="wrap">
      <p>
        <Link href="/admin">Admin</Link>
      </p>
      <h1>Last checked</h1>
      <p>The time and note show on the race or candidate page. The admin email does not.</p>
      <CheckForm />
    </article>
  );
}
