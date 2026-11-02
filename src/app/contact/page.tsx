import type { Metadata } from "next";
import Link from "next/link";
import { StatusMark } from "@/components/site/StatusMark";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <article className="wrap">
      <h1>Contact</h1>
      <p>
        <StatusMark kind="awaiting" />
        A public email or form has not been approved. Please do not send personal data to this
        site until a contact method is published.
      </p>
      <h2 id="corrections">Feedback and corrections</h2>
      <p>
        Race pages include a report control. A saved note is stored for review and is not
        published on the race page. <Link href="/sources">How records are sourced</Link>
      </p>
    </article>
  );
}
