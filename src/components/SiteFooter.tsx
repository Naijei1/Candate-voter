import Link from "next/link";

const LINKS = [
  { href: "/sources", label: "About this data" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
  { href: "/accessibility", label: "Accessibility" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <nav className="footer-links" aria-label="About this site">
          {LINKS.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <p>This site does not endorse candidates.</p>
      </div>
    </footer>
  );
}
