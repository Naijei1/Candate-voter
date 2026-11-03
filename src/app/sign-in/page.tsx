import type { Metadata } from "next";
import { headers } from "next/headers";
import { SignInForm } from "@/components/site/SignInForm";
import { cognitoSettings, googleAuthorizeUrl } from "@/lib/auth/cognito";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const incoming = await headers();
  const proto = incoming.get("x-forwarded-proto") ?? "http";
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "localhost:3000";
  return (
    <article className="wrap">
      <h1>Sign in</h1>
      <p className="lede">Save races you want to come back to. Email alerts are not on yet.</p>
      <SignInForm configured={cognitoSettings() !== null} googleUrl={googleAuthorizeUrl(`${proto}://${host}`)} />
    </article>
  );
}
