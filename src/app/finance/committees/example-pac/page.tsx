import type { Metadata } from "next";
import Link from "next/link";
import { SAMPLE_PAC } from "@/content/pilot";
import { StatusMark } from "@/components/site/StatusMark";

export const metadata: Metadata = { title: SAMPLE_PAC.name };

export default function ExamplePacPage() {
  return (
    <article className="wrap">
      <p>
        <Link href="/finance">Campaign finance</Link>
      </p>
      <h1>
        <StatusMark kind="sample" /> {SAMPLE_PAC.name}
      </h1>
      <p className="lede">{SAMPLE_PAC.type}</p>
      <ul className="plain-list">
        <li>Direct: {SAMPLE_PAC.direct}</li>
        <li>Outside: {SAMPLE_PAC.outside}</li>
      </ul>
    </article>
  );
}
