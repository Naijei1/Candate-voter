import type { Metadata } from "next";

export const metadata: Metadata = { title: "Accessibility" };

export default function AccessibilityPage() {
  return (
    <article className="wrap">
      <h1>Accessibility</h1>
      <p className="lede">A formal accessibility statement is still being written. The site is built this way today.</p>
      <ul className="plain-list">
        <li>Light background, dark text, and a sans-serif font at about 18 pixels.</li>
        <li>Buttons and navigation items are at least 44 pixels tall.</li>
        <li>You can pick a state without using the map.</li>
        <li>Nothing plays automatically.</li>
      </ul>
      <p>A public contact method will be listed once it is approved.</p>
    </article>
  );
}
