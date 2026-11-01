import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap">
      <h1>Page not found</h1>
      <p>That page, race, or candidate is not available.</p>
      <p>
        <Link href="/">Back to the homepage</Link>
        {" · "}
        <Link href="/states/ky">Kentucky contests</Link>
      </p>
    </div>
  );
}
