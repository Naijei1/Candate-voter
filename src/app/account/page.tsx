import type { Metadata } from "next";
import Link from "next/link";
import { AlertDemo } from "@/components/site/AlertDemo";
import { StatusMark } from "@/components/site/StatusMark";

export const metadata: Metadata = { title: "Alerts" };

export default function AccountPage() {
  return (
    <article className="wrap">
      <h1>Alerts</h1>
      <p className="lede">
        <StatusMark kind="preview" /> Nothing is emailed. <Link href="/sign-in">Sign in</Link>
      </p>
      <AlertDemo />
    </article>
  );
}
