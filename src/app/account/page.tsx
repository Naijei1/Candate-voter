import type { Metadata } from "next";
import Link from "next/link";
import { AccountPanel } from "@/components/site/AccountPanel";
import { currentUser } from "@/lib/auth/session";
import { listFollows } from "@/lib/users/store";

export const metadata: Metadata = { alternates: { canonical: "/account" }, title: "Saved races" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) {
    return (
      <article className="wrap">
        <h1>Saved races</h1>
        <p>
          <Link className="btn btn-navy" href="/sign-in">
            Sign in
          </Link>
        </p>
      </article>
    );
  }

  let follows: Awaited<ReturnType<typeof listFollows>> = [];
  let loadError = false;
  try {
    follows = await listFollows(user.sub);
  } catch (error) {
    console.error("account load failed:", error instanceof Error ? error.name : "Error");
    loadError = true;
  }

  return (
    <article className="wrap">
      <h1>Saved races</h1>
      <AccountPanel email={user.email} follows={follows} loadError={loadError} />
    </article>
  );
}
