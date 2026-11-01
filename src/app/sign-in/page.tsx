import type { Metadata } from "next";
import Link from "next/link";
import { SignInPreview } from "@/components/site/SignInPreview";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <article className="wrap">
      <h1>Sign in</h1>
      <SignInPreview />
      <p>
        <Link href="/account">Look at alert preferences without an account</Link>
      </p>
    </article>
  );
}
