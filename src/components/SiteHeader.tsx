import Link from "next/link";
import { brand } from "@/content/brand";

const PRIMARY = [
  { href: "/#find", label: "Find My Races" },
  { href: "/candidates", label: "Candidates" },
  { href: "/news", label: "News and Updates" },
] as const;

const MORE = [
  { href: "/polls", label: "Polls and Analysis" },
  { href: "/finance", label: "Campaign Finance" },
  { href: "/about", label: "About Us" },
  { href: "/account", label: "Saved races and alerts" },
] as const;

export function SiteHeader() {
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
        <Link href="/sign-in" className="btn btn-cta">
          Sign in
        </Link>
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
          </div>
        </details>
      </div>
    </header>
  );
}
