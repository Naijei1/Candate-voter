import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ballot questions" };

export default function Page() {
  return (
    <article className="wrap">
      <h1>Ballot questions</h1>
      <p>No ballot questions listed.</p>
    </article>
  );
}
