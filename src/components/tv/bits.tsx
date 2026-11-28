import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import type { PartyInfo } from "@/lib/tv/party";
import { initials } from "@/lib/tv/party";
import type { PersonView } from "@/lib/tv/people";
import { YoursLink } from "./client/Yours";
import { Icon } from "./Icon";

/** Party tag: the full party name in words. Never color alone. */
export function PartyTag({ party, size, corner }: { party: PartyInfo; size?: "sm"; corner?: boolean }) {
  const classes = ["ptag", party.key, size, corner ? "corner" : null].filter(Boolean).join(" ");
  return <span className={classes}>{party.tag}</span>;
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

/** `yours` links to My races at the saved county. */
export type Crumb = { href?: string; label: string; yours?: boolean };

/** Breadcrumb with a phone "up" link to the parent. */
export function Crumbs({ items }: { items: Crumb[] }) {
  const parent = [...items].reverse().find((item, index) => index > 0 && item.href);
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      {parent?.yours ? (
        <YoursLink className="crumb-up">← {parent.label}</YoursLink>
      ) : parent?.href ? (
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
          {index === items.length - 1 || !item.href ? (
            <span aria-current="page">{item.label}</span>
          ) : item.yours ? (
            <YoursLink>{item.label}</YoursLink>
          ) : (
            <Link href={item.href}>{item.label}</Link>
          )}
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

