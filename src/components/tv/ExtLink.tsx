import type { ReactNode } from "react";
import { Icon } from "./Icon";

/** Outside link: new tab, rel=noopener, and a spoken "(opens in new tab)". */
export function ExtLink({ href, children, className, icon = false, title, label }: { href: string; children: ReactNode; className?: string; icon?: boolean; title?: string; label?: string }) {
  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer" title={title}>
      {children}
      {label ? <span className="sr">{` (${label})`}</span> : null}
      {icon ? <Icon name="ext" size="xs" /> : null}
      <span className="sr"> (opens in new tab)</span>
    </a>
  );
}
