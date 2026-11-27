import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import type { PartyInfo } from "@/lib/tv/party";
import { initials } from "@/lib/tv/party";
import type { PersonView } from "@/lib/tv/people";
import { Icon } from "./Icon";

/** Party tag: short text for sight, full name for screen readers. Never color alone. */
export function PartyTag({ party, size, corner }: { party: PartyInfo; size?: "sm"; corner?: boolean }) {
  const classes = ["ptag", party.key, size, corner ? "corner" : null].filter(Boolean).join(" ");
  return (
    <span className={classes}>
      <span aria-hidden="true">{party.tag}</span>
      <span className="sr">{party.name}</span>
    </span>
  );
}

/** Round portrait with initials underneath; initials show when there is no photo. */
export function Face({ person, size, eager }: { person: Pick<PersonView, "name" | "photo">; size?: "lg" | "sm"; eager?: boolean }) {
  const src = person.photo?.small ?? person.photo?.src ?? null;
  return (
    <span className={["face", size, src ? null : "noimg"].filter(Boolean).join(" ")}>
      <span className="ini">{initials(person.name)}</span>
      {src ? <img src={src} alt="" loading={eager ? "eager" : "lazy"} width={48} height={48} /> : null}
    </span>
  );
}

export type Crumb = { href?: string; label: string };

/** Breadcrumb with a phone "up" link to the parent. */
export function Crumbs({ items }: { items: Crumb[] }) {
  const parent = [...items].reverse().find((item, index) => index > 0 && item.href);
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      {parent?.href ? (
        <Link className="crumb-up" href={parent.href}>
          ← {parent.label}
        </Link>
      ) : null}
      {items.map((item, index) => (
        <Fragment key={`${item.label}-${index}`}>
          {index > 0 ? (
            <span className="sep" aria-hidden="true">
              <Icon name="right" size="xs" />
            </span>
          ) : null}
          {item.href && index < items.length - 1 ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
        </Fragment>
      ))}
    </nav>
  );
}

export function SectionHead({ id, title, more }: { id: string; title: string; more?: { href: string; label: string } }) {
  return (
    <div className="sec-head">
      <div>
        <h2 id={id} className="sec-t">
          {title}
        </h2>
      </div>
      {more ? (
        <Link className="viewall" href={more.href}>
          {more.label}
          <Icon name="right" size="sm" />
        </Link>
      ) : null}
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <p className="empty-t">{title}</p>
      {children}
      {action}
    </div>
  );
}
