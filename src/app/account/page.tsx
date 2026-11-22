import type { Metadata } from "next";
import Link from "next/link";
import { AccountPanel } from "@/components/site/AccountPanel";
import { alertsTopic } from "@/lib/alerts/sns";
import { getEmailSubscription } from "@/lib/alerts/subscriptions";
import { readCandidate, readRace } from "@/lib/data/read";
import { kyPerson } from "@/lib/site/ky-ballot";
import type { Follow } from "@/lib/users/follows";
import { currentUser } from "@/lib/auth/session";
import { listFollows } from "@/lib/users/store";

export const metadata: Metadata = { alternates: { canonical: "/account" }, title: "My watchlist" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) {
    return (
      <article className="wrap">
        <h1>My watchlist</h1>
        <p>{installHint}</p>
        <p>
          <Link className="btn btn-navy" href="/sign-in">
            Sign in
          </Link>
        </p>
      </article>
    );
  }

  const topic = alertsTopic();
  let follows: Array<Follow & { label: string }> = [];
  let emailEnabled: boolean | null = null;
  let loadError = false;
  try {
    const [items, subscription] = await Promise.all([listFollows(user.sub), topic ? getEmailSubscription(user.sub) : null]);
    follows = await Promise.all(items.map(async (item) => ({ ...item, label: await followLabel(item) })));
    if (topic && (user.emailVerified || subscription)) emailEnabled = Boolean(subscription?.startsWith(`${topic}:`));
  } catch (error) {
    console.error("account load failed:", error instanceof Error ? error.name : "Error");
    loadError = true;
  }

  return (
    <article className="wrap">
      <h1>My watchlist</h1>
      <AccountPanel email={user.email} follows={follows} loadError={loadError} emailEnabled={emailEnabled} />
      <p>{installHint}</p>
    </article>
  );
}

const installHint = "Add THE VOTE to your Home Screen from your browser's share or menu.";

async function followLabel(follow: Follow): Promise<string> {
  if (follow.targetType === "race") return (await readRace(follow.targetId).catch(() => null))?.title ?? "Race";
  if (follow.targetType === "candidate") {
    const ballot = kyPerson(follow.targetId);
    if (ballot) return ballot.person.name;
    return (await readCandidate(follow.targetId).catch(() => null))?.displayName ?? "Candidate";
  }
  return follow.targetType === "jurisdiction" && follow.targetId === "KY" ? "Kentucky" : "Follow";
}
