import type { Metadata } from "next";
import { StatusMark } from "@/components/site/StatusMark";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <article className="wrap">
      <h1>Privacy</h1>
      <p>
        <StatusMark kind="awaiting" />
        A privacy policy is awaiting approved copy.
      </p>
      <p>
        What this version does: ZIP lookups are sent to resolve a congressional district and are
        not stored as an address. Follow buttons and news checkboxes stay in the browser tab.
        Sign-in is a preview and does not create an account. The filings table does not store
        street addresses from FEC filings.
      </p>
    </article>
  );
}
