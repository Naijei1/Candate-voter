"use client";

import Link from "next/link";
import { signOutAction } from "@/lib/auth/actions";
import { useSession } from "@/components/site/SessionProvider";

export function AccountMenu() {
  const { signedIn, email, admin } = useSession();
  if (!signedIn || !email) {
    return (
      <Link href="/sign-in" className="nav-signin">
        Sign in
      </Link>
    );
  }
  return (
    <details className="account-menu">
      <summary>{email}</summary>
      <div>
        <Link href="/account">My watchlist</Link>
        {admin ? <Link href="/admin">Admin</Link> : null}
        <form action={signOutAction}>
          <button type="submit">Sign out</button>
        </form>
      </div>
    </details>
  );
}
