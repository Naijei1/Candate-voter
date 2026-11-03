import Link from "next/link";
import { brand } from "@/content/brand";
import { isAdminEmail } from "@/lib/auth/admin";
import { loadSiteCopy } from "@/lib/content/store";
import { signOutAction } from "@/lib/auth/actions";
import { currentUser } from "@/lib/auth/session";

const PRIMARY = [
  { href: "/", label: "Ballot" },
  { href: "/map", label: "Map" },
  { href: "/ask", label: "Ask" },
] as const;

export async function SiteHeader() {
  const user = await currentUser();
  const copy = await loadSiteCopy();
  return (
    <header className="site-header">
      <div className="nav-bar">
        <Link href="/" className="brand">
          {copy.logoKey ? <img src="/media/logo" alt="" width={28} height={28} /> : null}
          {brand.name}
        </Link>
        <nav className="nav-desktop" aria-label="Primary">
          {PRIMARY.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        {user ? (
          <details className="account-menu">
            <summary>{user.email}</summary>
            <div>
              <Link href="/account">Saved races and alerts</Link>
              {isAdminEmail(user.email) ? <Link href="/admin">Admin</Link> : null}
              <form action={signOutAction}>
                <button type="submit">Sign out</button>
              </form>
            </div>
          </details>
        ) : (
          <Link href="/sign-in" className="btn btn-cta">
            Sign in
          </Link>
        )}
        <details className="nav-mobile">
          <summary>Menu</summary>
          <div>
            {PRIMARY.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
            {user ? <Link href="/account">Saved races and alerts</Link> : null}
          </div>
        </details>
      </div>
    </header>
  );
}
