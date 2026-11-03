import Link from "next/link";
import { loadSiteCopy } from "@/lib/content/store";

const LINKS = [
  { href: "/sources", label: "About this data" },
  { href: "/measures", label: "Ballot measures" },
  { href: "/contact#corrections", label: "Feedback and corrections" },
  { href: "/contact", label: "Contact" },
  { href: "/accessibility", label: "Accessibility" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export async function SiteFooter() {
  const copy = await loadSiteCopy();
  const detail = [copy.ownership, copy.funding, copy.affiliations].filter(Boolean).join(" ");
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
        {detail ? <p>{detail}</p> : null}
      </div>
    </footer>
  );
}
