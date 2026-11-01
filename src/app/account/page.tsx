import type { Metadata } from "next";
import Link from "next/link";
import { AlertDemo } from "@/components/site/AlertDemo";

export const metadata: Metadata = { title: "Your account" };

export default function AccountPage() {
  return (
    <article className="wrap">
      <h1>Saved races and alerts</h1>
      <p>
        You can browse without an account. Saving a follow is a preview.{" "}
        <Link href="/sign-in">Sign-in preview</Link>
      </p>
      <AlertDemo />
    </article>
  );
}
