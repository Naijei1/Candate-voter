import type { Metadata } from "next";
import Link from "next/link";
import { AccountPanel } from "@/components/site/AccountPanel";
import { currentUser } from "@/lib/auth/session";
import { defaultPreferences, getProfile, listFollows } from "@/lib/users/store";

export const metadata: Metadata = { title: "Saved races and alerts" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) {
    return (
      <article className="wrap">
        <h1>Saved races and alerts</h1>
        <p className="lede">Sign in to save follows and alert choices.</p>
        <p>
          <Link className="btn btn-cta" href="/sign-in">
            Sign in
          </Link>
        </p>
        <p>
          <span className="status-mark" title="Nothing is emailed.">
            planned
          </span>{" "}
          Email delivery is planned. Nothing is sent.
        </p>
      </article>
    );
  }

  let preferences = { ...defaultPreferences() };
  let follows: Awaited<ReturnType<typeof listFollows>> = [];
  let loadError = false;
  try {
    const profile = await getProfile(user.sub);
    if (profile) {
      preferences = {
        categories: profile.categories,
        delivery: profile.delivery,
        quietStart: profile.quietStart,
        quietEnd: profile.quietEnd,
        deliveryStatus: profile.deliveryStatus,
      };
    }
    follows = await listFollows(user.sub);
  } catch (error) {
    console.error("account load failed:", error instanceof Error ? error.name : "Error");
    loadError = true;
  }

  return (
    <article className="wrap">
      <h1>Saved races and alerts</h1>
      <AccountPanel email={user.email} preferences={preferences} follows={follows} loadError={loadError} />
    </article>
  );
}
