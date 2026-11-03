import type { Metadata } from "next";
import { SignInForm } from "@/components/site/SignInForm";
import { cognitoSettings } from "@/lib/auth/cognito";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <article className="wrap">
      <h1>Sign in</h1>
      <p className="lede">Save races you want to come back to. Email alerts are not on yet.</p>
      <SignInForm configured={cognitoSettings() !== null} />
    </article>
  );
}
