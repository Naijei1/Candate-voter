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
        <p className="lede">Sign in to save follows and notification settings. The news feed is a separate choice.</p>
        <p>
          <Link className="btn btn-navy" href="/sign-in">
            Sign in
          </Link>
        </p>
        <p>Email alerts are not on yet. You can still save a race after you sign in.</p>
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
      <p>These are notification settings. They do not change the news feed.</p>
      <AccountPanel email={user.email} preferences={preferences} follows={follows} loadError={loadError} />
    </article>
  );
}
