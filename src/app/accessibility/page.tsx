import type { Metadata } from "next";

export const metadata: Metadata = { alternates: { canonical: "/accessibility" }, title: "Accessibility" };

export default function AccessibilityPage() {
  return (
    <article className="wrap">
      <h1>Accessibility</h1>
      <ul className="plain-list">
        <li>Enter a ZIP code to find a race without the map.</li>
        <li>The home video respects reduced-motion and data-saver settings. It pauses offscreen and when the tab is hidden.</li>
        <li>Keyboard focus has a visible outline.</li>
      </ul>
    </article>
  );
}
