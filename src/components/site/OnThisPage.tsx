import styles from "./reading.module.css";

export function OnThisPage({ links }: { links: readonly { href: string; label: string }[] }) {
  if (links.length < 2) return null;
  return (
    <nav className={styles.toc} aria-label="On this page">
      <p>On this page</p>
      <ul>
        {links.map((link) => (
          <li key={link.href}><a href={link.href}>{link.label}</a></li>
        ))}
      </ul>
    </nav>
  );
}
