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
        <li>The landing film plays with no sound. It stays on the poster when the browser asks for less motion, or on a slow or data-saver connection. It pauses off screen and when the tab is hidden. There is no pause button on that film. That is a known gap against WCAG 2.2.2, recorded in the sources note.</li>
        <li>Keyboard focus uses a visible outline. Compare topics are buttons.</li>
        <li>Text is set in rem and pixels that grow when the browser zoom changes. Photos are capped so they do not stretch the page.</li>
        <li>Form fields for ZIP, finance filters, and news follow a state have visible labels.</li>
      </ul>
      <p>A public contact method will be listed once it is approved.</p>
    </article>
  );
}
