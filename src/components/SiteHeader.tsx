import Link from "next/link";
import { HeaderFrame } from "@/components/site/HeaderFrame";
import { brand } from "@/content/brand";
import { isAdminEmail } from "@/lib/auth/admin";
import { loadSiteCopy } from "@/lib/content/store";
import { signOutAction } from "@/lib/auth/actions";
import { currentUser } from "@/lib/auth/session";

export async function SiteHeader() {
  const user = await currentUser();
  const copy = await loadSiteCopy();
  return (
    <HeaderFrame
      signedIn={user != null}
      wordmark={
        <Link href="/" className="brand">
          {copy.logoKey ? <img src="/media/logo" alt="" width={28} height={28} /> : null}
          {brand.name}
        </Link>
      }
      account={
        user ? (
          <details className="account-menu">
            <summary>{user.email}</summary>
            <div>
              <Link href="/account">Saved races</Link>
              {isAdminEmail(user.email) ? <Link href="/admin">Admin</Link> : null}
              <form action={signOutAction}>
                <button type="submit">Sign out</button>
              </form>
            </div>
          </details>
        ) : (
          <Link href="/sign-in" className="nav-signin">
            Sign in
          </Link>
        )
      }
    />
  );
}
