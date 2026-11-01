import Link from "next/link";

const LINKS = [
  { href: "/contact", label: "Contact" },
  { href: "/contact#corrections", label: "Feedback and corrections" },
  { href: "/sources", label: "Sources and methodology" },
  { href: "/accessibility", label: "Accessibility" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/about", label: "About Us" },
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
        <p>
          This site does not endorse candidates or tell you how to vote. Ownership, funding,
          and affiliations: awaiting approved copy.
        </p>
      </div>
    </footer>
  );
}
