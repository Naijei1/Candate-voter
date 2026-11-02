import type { Metadata } from "next";
import Link from "next/link";
import { AdminDenied } from "@/components/admin/AdminDenied";
import { adminActor } from "@/lib/auth/guard";
import { currentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const user = await currentUser();
  const admin = await adminActor();
  if (!admin) return <AdminDenied title="Admin" signedIn={!!user} />;
  return (
    <article className="wrap">
      <h1>Admin</h1>
      <p>{admin.email}</p>
      <ul className="plain-list">
        <li>
          <Link href="/admin/brand">Branding and copy</Link>
        </li>
        <li>
          <Link href="/admin/corrections">Review queue</Link>
        </li>
        <li>
          <Link href="/admin/checks">Last checked</Link>
        </li>
        <li>
          <Link href="/admin/features">Feature status</Link>
        </li>
      </ul>
    </article>
  );
}
