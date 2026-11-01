import type { Metadata } from "next";
import { StatusMark } from "@/components/site/StatusMark";

export const metadata: Metadata = { title: "Accessibility" };

export default function AccessibilityPage() {
  return (
    <article className="wrap">
      <h1>Accessibility</h1>
      <p>
        Pages use a light background, dark text, and a sans-serif font at about 18 pixels. Buttons
        and navigation items are at least 44 pixels tall. The map is not the only way to choose a
        state. Video does not play automatically.
      </p>
      <p>
        <StatusMark kind="awaiting" />
        A formal accessibility statement and conformance claim are awaiting approved copy. If a
        page blocks you, the contact method will be listed once it is approved.
      </p>
    </article>
  );
}
