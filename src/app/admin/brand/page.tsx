import type { Metadata } from "next";
import Link from "next/link";
import { AdminDenied } from "@/components/admin/AdminDenied";
import { BrandTools } from "@/components/admin/BrandTools";
import { adminActor } from "@/lib/auth/guard";
import { loadSiteCopy } from "@/lib/content/store";
import { currentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Branding" };
export const dynamic = "force-dynamic";

export default async function BrandAdminPage() {
  const user = await currentUser();
  const admin = await adminActor();
  if (!admin) return <AdminDenied title="Branding" signedIn={!!user} />;
  const copy = await loadSiteCopy();
  return (
    <article className="wrap">
      <p>
        <Link href="/admin">Admin</Link>
      </p>
      <h1>Branding and copy</h1>
      <p>Empty fields stay “Awaiting content” on the public site. Do not invent a biography.</p>
      <BrandTools initial={copy} />
    </article>
  );
}
