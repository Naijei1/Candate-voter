import Link from "next/link";
import { brand } from "@/content/brand";
import { isAdminEmail } from "@/lib/auth/admin";
import { signOutAction } from "@/lib/auth/actions";
import { currentUser } from "@/lib/auth/session";

const PRIMARY = [
  { href: "/#find", label: "Find My Races" },
  { href: "/candidates", label: "Candidates" },
  { href: "/news", label: "News and Updates" },
] as const;

const MORE = [
  { href: "/polls", label: "Polls and Analysis" },
  { href: "/finance", label: "Campaign Finance" },
  { href: "/about", label: "About Us" },
] as const;

export async function SiteHeader() {
  const user = await currentUser();
  return (
    <header className="site-header">
      <div className="nav-bar">
        <Link href="/" className="brand">
          {brand.name}
        </Link>
        <nav className="nav-desktop" aria-label="Primary">
          {PRIMARY.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <details>
            <summary>More</summary>
            <div>
              {MORE.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </div>
          </details>
        </nav>
        {user ? (
          <details className="account-menu">
            <summary>{user.email}</summary>
            <div>
              <Link href="/account">Saved races and alerts</Link>
              {isAdminEmail(user.email) ? <Link href="/admin/corrections">Review queue</Link> : null}
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
            {MORE.map((item) => (
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
