import type { Metadata } from "next";

export const metadata: Metadata = { title: "Polls" };

export default function Page() {
  return (
    <article className="wrap">
      <h1>Polls</h1>
      <p>No polls yet.</p>
    </article>
  );
}
