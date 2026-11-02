import type { Metadata } from "next";
import Link from "next/link";
import { AdminDenied } from "@/components/admin/AdminDenied";
import { adminActor } from "@/lib/auth/guard";
import { FEATURES } from "@/lib/content/features";
import { currentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Feature status" };
export const dynamic = "force-dynamic";

export default async function FeaturesAdminPage() {
  const user = await currentUser();
  const admin = await adminActor();
  if (!admin) return <AdminDenied title="Feature status" signedIn={!!user} />;
  return (
    <article className="wrap">
      <p>
        <Link href="/admin">Admin</Link>
      </p>
      <h1>Feature status</h1>
      <p>working, demo, awaiting content, or planned. This list is not edited here.</p>
      <table>
        <thead>
          <tr>
            <th>Feature</th>
            <th>Status</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {FEATURES.map((feature) => (
            <tr key={feature.id}>
              <td>{feature.name}</td>
              <td>{feature.status}</td>
              <td>{feature.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
