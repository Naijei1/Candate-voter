import type { Metadata } from "next";
import { Crumbs } from "@/components/tv/bits";

export const metadata: Metadata = { alternates: { canonical: "/accessibility" }, title: "Accessibility" };

export default function AccessibilityPage() {
  return (
    <div className="wrap prose">
      <Crumbs items={[{ href: "/", label: "Home" }, { label: "Accessibility" }]} />
      <h1 className="t-h1 pt">Accessibility</h1>
      <ul className="checks">
        <li>Pick your county from a list to find your races without the map.</li>
        <li>The home film respects reduced-motion and data-saver settings. It pauses offscreen and when the tab is hidden.</li>
        <li>Keyboard focus has a visible outline. Every control is at least 44 pixels.</li>
        <li>Party is shown in words as well as color. Money bars carry labels and patterns.</li>
        <li>Light and dark themes both meet WCAG AA contrast.</li>
      </ul>
    </div>
  );
}
